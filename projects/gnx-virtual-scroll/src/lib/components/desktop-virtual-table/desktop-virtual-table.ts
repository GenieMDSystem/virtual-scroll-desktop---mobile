import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { VirtualDataSource } from '../../data-source/virtual-data-source';
import { VirtualCellDef } from '../../directives/virtual-cell.directive';
import {
  ColumnDef,
  ColumnMode,
  ColumnView,
  SelectionType,
  SortDirection,
  SortEvent,
  SortPropDir,
  SortType,
} from '../../models/virtual-scroll.models';
import { SelectionModel } from '../../selection/selection-model';
import {
  buildColumnViewsFromWidths,
  fitColumnsToContainer,
  resolveColumnMeta,
  totalColumnsWidth,
} from '../../utils/column-layout';
import {
  buildSortEvent,
  dirForProp,
  nextSorts,
  orderForProp,
  sortItemsInternal,
} from '../../utils/sort';

interface ResizeSession {
  key: string;
  startX: number;
  startWidth: number;
  minWidth: number;
  maxWidth: number;
}

/**
 * Three-pane virtual table: frozen left | scrollable center | frozen right.
 * Sorting mirrors ngx-datatable: internal (client) vs external (server/API).
 * Column widths mirror ngx-datatable {@link ColumnMode}.
 */
@Component({
  selector: 'gnx-desktop-virtual-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollingModule, DecimalPipe, NgTemplateOutlet],
  templateUrl: './desktop-virtual-table.html',
  styleUrl: './desktop-virtual-table.scss',
})
export class DesktopVirtualTableComponent<T> implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly dataSource = input.required<VirtualDataSource<T>>();
  readonly columns = input.required<ColumnDef<T>[]>();
  readonly rowHeight = input(44);
  readonly ariaLabel = input('Virtual table');
  readonly title = input('Desktop Virtual Table');
  /**
   * ngx-datatable-compatible width mode.
   * Drag-resize stays available in every mode.
   */
  readonly columnMode = input<ColumnMode | `${ColumnMode}`>(ColumnMode.force);
  /**
   * @deprecated Prefer {@link columnMode}.
   * `false` forces {@link ColumnMode.standard}; `true` defers to columnMode.
   */
  readonly fitToContainer = input(true);
  readonly selection = input<SelectionModel<T> | null>(null);
  /**
   * Show a frozen checkbox column + header select-all (indeterminate when partial).
   * Requires {@link selection}. Default true when selection is provided.
   * Header select-all is only shown for {@link SelectionType.multi}.
   */
  readonly checkboxSelection = input(true);
  readonly checkboxColumnWidth = input(44);
  /**
   * ngx-datatable-style selection:
   * - single — one row; click again to clear
   * - multi — multiple rows (default)
   */
  readonly selectionType = input<SelectionType | `${SelectionType}`>(
    SelectionType.multi,
  );

  /**
   * ngx-datatable-compatible flag.
   * - `false` (internal): sort currently loaded rows in the table
   * - `true` (external): host/API sorts from {@link sort} / {@link sortChange}
   */
  readonly externalSorting = input(true);

  /**
   * ngx-datatable {@link SortType}:
   * - single — one column at a time (default)
   * - multi — stack multiple column sorts
   */
  readonly sortType = input<SortType | `${SortType}`>(SortType.single);

  /** Fired on every sort-icon click (internal and external). */
  readonly sort = output<SortEvent<T>>();

  /** Optional callback (same payload as {@link sort}). */
  readonly sortChange = input<(event: SortEvent<T>) => void>(() => undefined);

  readonly cellDefs = contentChildren(VirtualCellDef);

  @ViewChild('tableFrame') private tableFrame!: ElementRef<HTMLElement>;
  @ViewChild('centerHeader') private centerHeader!: ElementRef<HTMLElement>;
  @ViewChild('centerHeaderInner')
  private centerHeaderInner!: ElementRef<HTMLElement>;
  @ViewChild('centerViewport') private centerVp!: CdkVirtualScrollViewport;
  @ViewChildren(CdkVirtualScrollViewport)
  private viewports!: QueryList<CdkVirtualScrollViewport>;

  private readonly baseWidths = signal<Record<string, number>>({});
  readonly containerWidth = signal(0);
  readonly resizingKey = signal<string | null>(null);
  /** Client-side sorts when externalSorting=false */
  private readonly internalSorts = signal<SortPropDir[]>([]);

  private resizeSession: ResizeSession | null = null;
  private frameObserver: ResizeObserver | null = null;
  private syncingVertical = false;

  /**
   * Exact flex cell size so header (PIN/sort) and body cells share the same
   * width — prevents vertical grid lines drifting while scrolling.
   */
  sizeStyle(width: number): Record<string, string> {
    const px = `${Math.round(width)}px`;
    return {
      flex: `0 0 ${px}`,
      width: px,
      'min-width': px,
      'max-width': px,
    };
  }

  readonly resolvedSortType = computed((): SortType => {
    return this.sortType() === SortType.multi
      ? SortType.multi
      : SortType.single;
  });

  readonly activeSorts = computed(() =>
    this.externalSorting()
      ? this.dataSource().sorts()
      : this.internalSorts(),
  );

  /** Rows bound to CDK — internally sorted when externalSorting=false */
  readonly displayItems = computed(() => {
    const items = this.dataSource().items();
    if (this.externalSorting()) {
      return items;
    }
    const sorts = this.internalSorts();
    if (!sorts.length) {
      return items;
    }
    return sortItemsInternal(items, sorts, this.columns());
  });

  readonly columnMetas = computed(() =>
    this.columns().map((c) => resolveColumnMeta(c)),
  );

  /** Effective mode after applying deprecated fitToContainer override. */
  readonly resolvedColumnMode = computed((): ColumnMode => {
    if (!this.fitToContainer()) {
      return ColumnMode.standard;
    }
    switch (this.columnMode()) {
      case ColumnMode.standard:
      case 'standard':
        return ColumnMode.standard;
      case ColumnMode.flex:
      case 'flex':
        return ColumnMode.flex;
      case ColumnMode.force:
      case 'force':
      default:
        return ColumnMode.force;
    }
  });

  readonly liveWidths = computed(() => {
    const metas = this.columnMetas();
    const base = this.ensureBaseWidths(metas);
    const mode = this.resolvedColumnMode();
    if (mode === ColumnMode.standard) {
      return base;
    }
    const checkboxW = this.showCheckboxColumn()
      ? this.checkboxColumnWidth()
      : 0;
    const frozenSum =
      metas
        .filter((m) => m.frozen)
        .reduce((s, m) => s + (base[m.key] ?? m.width), 0) + checkboxW;
    const centerMetas = metas.filter((m) => !m.frozen);
    const centerBase: Record<string, number> = {};
    for (const m of centerMetas) {
      centerBase[m.key] = base[m.key] ?? m.width;
    }
    const fittedCenter = fitColumnsToContainer(
      centerMetas,
      Math.max(0, this.containerWidth() - frozenSum),
      centerBase,
      mode,
    );
    return { ...base, ...fittedCenter };
  });

  readonly columnViews = computed(() =>
    buildColumnViewsFromWidths(this.columns(), this.liveWidths()),
  );

  readonly leftCols = computed(() =>
    this.columnViews().filter((c) => c.frozen === 'left'),
  );
  readonly centerCols = computed(() =>
    this.columnViews().filter((c) => !c.frozen),
  );
  readonly rightCols = computed(() =>
    this.columnViews().filter((c) => c.frozen === 'right'),
  );

  readonly showCheckboxColumn = computed(
    () => this.checkboxSelection() && this.selection() != null,
  );

  readonly resolvedSelectionType = computed((): SelectionType => {
    return this.selectionType() === SelectionType.single
      ? SelectionType.single
      : SelectionType.multi;
  });

  readonly showHeaderSelectAll = computed(
    () =>
      this.showCheckboxColumn() &&
      this.resolvedSelectionType() === SelectionType.multi,
  );

  readonly leftWidth = computed(
    () =>
      totalColumnsWidth(this.leftCols()) +
      (this.showCheckboxColumn() ? this.checkboxColumnWidth() : 0),
  );
  readonly centerWidth = computed(() => totalColumnsWidth(this.centerCols()));
  readonly rightWidth = computed(() => totalColumnsWidth(this.rightCols()));
  readonly tableWidth = computed(
    () => this.leftWidth() + this.centerWidth() + this.rightWidth(),
  );

  /** none | some (indeterminate) | all — for header checkbox */
  readonly headerSelectState = computed(() => {
    const sel = this.selection();
    if (!sel || !this.showCheckboxColumn()) {
      return 'none' as const;
    }
    // Depend on selection signals for OnPush updates
    sel.ids();
    sel.count();
    return sel.getSelectAllState(this.displayItems());
  });

  readonly headerChecked = computed(() => this.headerSelectState() === 'all');
  readonly headerIndeterminate = computed(
    () => this.headerSelectState() === 'some',
  );

  readonly cellTemplateMap = computed(() => {
    const map = new Map<string, VirtualCellDef<T>['templateRef']>();
    for (const def of this.cellDefs()) {
      map.set(def.column(), def.templateRef);
    }
    return map;
  });

  private readonly initEffect = effect(() => {
    void this.dataSource().init();
  });

  /** Drop client sorts when switching to external mode */
  private readonly sortingModeEffect = effect(() => {
    if (this.externalSorting()) {
      this.internalSorts.set([]);
    }
  });

  private readonly sortTypeEffect = effect(() => {
    // Changing single ↔ multi clears client sorts so order stays coherent
    void this.resolvedSortType();
    this.internalSorts.set([]);
  });

  private readonly columnsEffect = effect(() => {
    const cols = this.columns();
    const next: Record<string, number> = { ...this.baseWidths() };
    let changed = false;
    for (const col of cols) {
      if (next[col.key] == null) {
        next[col.key] = resolveColumnMeta(col).width;
        changed = true;
      }
    }
    for (const key of Object.keys(next)) {
      if (!cols.some((c) => c.key === key)) {
        delete next[key];
        changed = true;
      }
    }
    if (changed) {
      this.baseWidths.set(next);
    }
  });

  private readonly onPointerMove = (event: PointerEvent): void => {
    const session = this.resizeSession;
    if (!session) {
      return;
    }
    const delta = event.clientX - session.startX;
    const next = Math.round(
      Math.max(
        session.minWidth,
        Math.min(session.maxWidth, session.startWidth + delta),
      ),
    );
    this.baseWidths.update((widths) => ({ ...widths, [session.key]: next }));
    queueMicrotask(() => {
      const el = this.centerVp?.elementRef.nativeElement;
      if (el) {
        this.syncCenterHeaderX(el.scrollLeft);
      }
    });
  };

  private readonly onPointerUp = (): void => {
    if (!this.resizeSession) {
      return;
    }
    this.resizeSession = null;
    this.resizingKey.set(null);
    document.body.classList.remove('gnx-col-resizing');
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  };

  ngAfterViewInit(): void {
    const center = this.centerVp;
    const panes = this.viewports.toArray();

    const onCenterScroll = (): void => {
      const top = center.measureScrollOffset('top');
      const left = center.elementRef.nativeElement.scrollLeft;

      this.syncCenterHeaderX(left);

      if (!this.syncingVertical) {
        this.syncingVertical = true;
        for (const pane of panes) {
          if (pane === center) continue;
          if (pane.measureScrollOffset('top') !== top) {
            pane.scrollToOffset(top, 'auto');
          }
        }
        this.syncingVertical = false;
      }

      const range = center.getRenderedRange();
      this.dataSource().onViewportRange(range.start, range.end);
    };

    const centerEl = center.elementRef.nativeElement;
    centerEl.addEventListener('scroll', onCenterScroll, { passive: true });
    onCenterScroll();

    for (const pane of panes) {
      if (pane === center) continue;
      const el = pane.elementRef.nativeElement;
      const onWheel = (e: WheelEvent): void => {
        e.preventDefault();
        center.scrollToOffset(
          center.measureScrollOffset('top') + e.deltaY,
          'auto',
        );
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      this.destroyRef.onDestroy(() => el.removeEventListener('wheel', onWheel));
    }

    const frame = this.tableFrame.nativeElement;
    this.frameObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? frame.clientWidth;
      this.containerWidth.set(Math.floor(width));
      queueMicrotask(() => onCenterScroll());
    });
    this.frameObserver.observe(frame);
    this.containerWidth.set(Math.floor(frame.clientWidth));

    this.destroyRef.onDestroy(() => {
      centerEl.removeEventListener('scroll', onCenterScroll);
      this.frameObserver?.disconnect();
      this.onPointerUp();
    });
  }

  startResize(key: string, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const meta = this.columnMetas().find((m) => m.key === key);
    if (!meta || !meta.resizable) {
      return;
    }
    // Commit on-screen widths so leftover flex is not redistributed away
    // from siblings while this column grows.
    const live = this.liveWidths();
    this.baseWidths.set({ ...live });
    const current = live[key] ?? meta.width;
    this.resizeSession = {
      key,
      startX: event.clientX,
      startWidth: current,
      minWidth: meta.minWidth,
      maxWidth: meta.maxWidth,
    };
    this.resizingKey.set(key);
    document.body.classList.add('gnx-col-resizing');
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  /** Dedicated sort-icon click (not the whole header). */
  onSortIconClick(col: ColumnView<T>, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!col.sortable) {
      return;
    }

    const current = this.activeSorts();
    const { sorts, prevValue, newValue } = nextSorts(
      current,
      col.key,
      this.resolvedSortType(),
    );
    const sortEvent = buildSortEvent(col, prevValue, newValue, sorts);

    if (!this.externalSorting()) {
      this.internalSorts.set(sorts);
    }

    // Always emit (ngx-datatable style) — external hosts apply via applySorts
    this.sort.emit(sortEvent);
    this.sortChange()(sortEvent);
  }

  sortDirection(colKey: string): SortDirection | null {
    return dirForProp(this.activeSorts(), colKey);
  }

  /** 1-based multi-sort priority, or null */
  sortOrder(colKey: string): number | null {
    const sorts = this.activeSorts();
    if (this.resolvedSortType() !== SortType.multi || sorts.length < 2) {
      return null;
    }
    return orderForProp(sorts, colKey);
  }

  isSelected(row: T): boolean {
    return this.selection()?.isSelected(row) ?? false;
  }

  onHeaderCheckboxClick(event: Event): void {
    event.stopPropagation();
    if (!this.showHeaderSelectAll()) {
      return;
    }
    const sel = this.selection();
    if (!sel) {
      return;
    }
    sel.toggleSelectAll(this.displayItems());
  }

  onRowCheckboxClick(row: T, index: number, event: MouseEvent): void {
    event.stopPropagation();
    const sel = this.selection();
    if (!sel) {
      return;
    }
    sel.handleCheckboxClick(row, this.displayItems(), index, {
      shiftKey: event.shiftKey,
      metaOrCtrl: event.metaKey || event.ctrlKey,
    }, this.resolvedSelectionType());
  }

  onRowClick(row: T, index: number, event: MouseEvent): void {
    const sel = this.selection();
    if (!sel) {
      return;
    }
    if (
      (event.target as HTMLElement).closest(
        'button, a, input, .sort-btn, .col-resizer, .row-check',
      )
    ) {
      return;
    }

    if (event.shiftKey) {
      event.preventDefault();
    }

    const mods = {
      shiftKey: event.shiftKey,
      metaOrCtrl: event.metaKey || event.ctrlKey,
    };
    const type = this.resolvedSelectionType();

    // Checkbox column: plain click toggles (add or remove) in multi;
    // single mode selects / clears. Shift / Ctrl|Cmd use handleClick.
    if (this.showCheckboxColumn() && !mods.shiftKey && !mods.metaOrCtrl) {
      sel.handleCheckboxClick(row, this.displayItems(), index, mods, type);
      return;
    }

    sel.handleClick(row, this.displayItems(), index, mods, type);
  }

  onTableKeydown(event: KeyboardEvent): void {
    const sel = this.selection();
    if (!sel) {
      return;
    }
    const metaOrCtrl = event.metaKey || event.ctrlKey;
    if (
      metaOrCtrl &&
      (event.key === 'a' || event.key === 'A') &&
      this.resolvedSelectionType() === SelectionType.multi
    ) {
      event.preventDefault();
      sel.selectAll(this.displayItems());
    }
    if (event.key === 'Escape') {
      sel.clear();
    }
  }

  cellText(row: T, col: ColumnDef<T> | ColumnView<T>): string {
    const value = col.valueAccessor
      ? col.valueAccessor(row)
      : (row as Record<string, unknown>)[col.key];
    if (value == null) {
      return '';
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return String(value);
  }

  /**
   * Drive header X from body scroll via transform (avoids scrollLeft clamping
   * / scrollbar-gutter mismatch between header and viewport).
   */
  private syncCenterHeaderX(scrollLeft: number): void {
    const header = this.centerHeader?.nativeElement;
    const inner = this.centerHeaderInner?.nativeElement;
    const viewport = this.centerVp?.elementRef.nativeElement;
    if (!header || !inner || !viewport) {
      return;
    }
    const scrollbar = Math.max(0, viewport.offsetWidth - viewport.clientWidth);
    header.style.paddingRight = scrollbar ? `${scrollbar}px` : '';
    inner.style.transform =
      scrollLeft === 0 ? '' : `translate3d(${-scrollLeft}px, 0, 0)`;
  }

  private ensureBaseWidths(
    metas: ReturnType<DesktopVirtualTableComponent<T>['columnMetas']>,
  ): Record<string, number> {
    const current = this.baseWidths();
    if (metas.every((m) => current[m.key] != null)) {
      return current;
    }
    const next = { ...current };
    for (const m of metas) {
      if (next[m.key] == null) {
        next[m.key] = m.width;
      }
    }
    return next;
  }
}
