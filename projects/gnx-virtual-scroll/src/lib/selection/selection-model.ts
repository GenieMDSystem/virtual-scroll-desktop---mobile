import { computed, signal } from '@angular/core';
import { RowId, SelectionType } from '../models/virtual-scroll.models';

export interface SelectionClickModifiers {
  shiftKey: boolean;
  /** Cmd on macOS, Ctrl on Windows/Linux */
  metaOrCtrl: boolean;
}

/**
 * Desktop-style row selection for virtualized rows (id-based).
 *
 * Multi:
 * - Click → select only that row
 * - Ctrl/Cmd+Click → toggle
 * - Shift+Click → range
 * - With checkbox column, plain click toggles (add/remove)
 *
 * Single:
 * - Click → select that row only; click again → clear
 * - No multi-select via Shift / Ctrl / select-all
 */
export class SelectionModel<T> {
  private readonly trackBy: (item: T) => RowId;
  private readonly _ids = signal<Set<RowId>>(new Set());
  private readonly _anchorId = signal<RowId | null>(null);

  readonly ids = this._ids.asReadonly();
  readonly count = computed(() => this._ids().size);
  readonly isEmpty = computed(() => this._ids().size === 0);
  readonly anchorId = this._anchorId.asReadonly();

  constructor(trackBy: (item: T) => RowId) {
    this.trackBy = trackBy;
  }

  isSelected(item: T): boolean {
    return this._ids().has(this.trackBy(item));
  }

  isSelectedId(id: RowId): boolean {
    return this._ids().has(id);
  }

  /**
   * Pointer selection against the current visible/ordered list.
   * `items` must be the same order the user sees (e.g. displayItems()).
   */
  handleClick(
    item: T,
    items: Array<T | null>,
    index: number,
    mods: SelectionClickModifiers,
    selectionType: SelectionType | `${SelectionType}` = SelectionType.multi,
  ): void {
    const single = selectionType === SelectionType.single;

    if (single) {
      this.handleSingleClick(item);
      return;
    }

    if (mods.shiftKey) {
      this.selectRangeTo(item, items, index);
      return;
    }

    if (mods.metaOrCtrl) {
      this.toggle(item);
      return;
    }

    this.selectOnly(item);
  }

  /** Single mode: select this row, or clear if it was already the only selection. */
  handleSingleClick(item: T): void {
    if (this.isSelected(item)) {
      this.clear();
      return;
    }
    this.selectOnly(item);
  }

  /**
   * Checkbox / checkbox-column row click.
   * Multi → toggle; single → selectOnly or clear if already selected.
   */
  handleCheckboxClick(
    item: T,
    items: Array<T | null>,
    index: number,
    mods: SelectionClickModifiers,
    selectionType: SelectionType | `${SelectionType}` = SelectionType.multi,
  ): void {
    const single = selectionType === SelectionType.single;

    if (single) {
      this.handleSingleClick(item);
      return;
    }

    if (mods.shiftKey) {
      this.selectRangeTo(item, items, index);
      return;
    }

    this.toggle(item);
  }

  /** Clear all, select one row, set anchor. */
  selectOnly(item: T): void {
    const id = this.trackBy(item);
    this._ids.set(new Set([id]));
    this._anchorId.set(id);
  }

  toggle(item: T): void {
    const id = this.trackBy(item);
    this._ids.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    this._anchorId.set(id);
  }

  select(item: T): void {
    const id = this.trackBy(item);
    this._ids.update((set) => new Set(set).add(id));
    this._anchorId.set(id);
  }

  deselect(item: T): void {
    const id = this.trackBy(item);
    this._ids.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }

  clear(): void {
    this._ids.set(new Set());
    this._anchorId.set(null);
  }

  selectMany(items: T[]): void {
    this._ids.update((set) => {
      const next = new Set(set);
      for (const item of items) {
        next.add(this.trackBy(item));
      }
      return next;
    });
  }

  /** Select every non-null row in the current list (e.g. Ctrl/Cmd+A). */
  selectAll(items: Array<T | null>): void {
    const next = new Set<RowId>();
    for (const item of items) {
      if (item) {
        next.add(this.trackBy(item));
      }
    }
    this._ids.set(next);
  }

  /**
   * Header checkbox state against the current list:
   * - none — nothing selected
   * - some — partial (indeterminate)
   * - all — every non-null row selected
   */
  getSelectAllState(items: Array<T | null>): 'none' | 'some' | 'all' {
    const selected = this._ids();
    let total = 0;
    let hit = 0;
    for (const item of items) {
      if (!item) continue;
      total++;
      if (selected.has(this.trackBy(item))) {
        hit++;
      }
    }
    if (total === 0 || hit === 0) return 'none';
    if (hit === total) return 'all';
    return 'some';
  }

  /** Header checkbox: if all selected → clear; otherwise select all. */
  toggleSelectAll(items: Array<T | null>): void {
    if (this.getSelectAllState(items) === 'all') {
      this.clear();
    } else {
      this.selectAll(items);
    }
  }

  /**
   * Shift-click: select contiguous range from anchor → target.
   * If no anchor yet, behaves like selectOnly.
   * Anchor is not moved (same as Explorer / Finder).
   */
  selectRangeTo(item: T, items: Array<T | null>, toIndex: number): void {
    const anchor = this._anchorId();
    if (anchor == null) {
      this.selectOnly(item);
      return;
    }

    let fromIndex = items.findIndex(
      (row) => row != null && this.trackBy(row) === anchor,
    );

    // Anchor scrolled out / not in current list → use clicked row only
    if (fromIndex < 0) {
      this.selectOnly(item);
      return;
    }

    // Prefer the index from the click when it matches the item
    if (toIndex < 0 || toIndex >= items.length || items[toIndex] !== item) {
      toIndex = items.findIndex(
        (row) => row != null && this.trackBy(row) === this.trackBy(item),
      );
    }
    if (toIndex < 0) {
      this.selectOnly(item);
      return;
    }

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const next = new Set<RowId>();
    for (let i = start; i <= end; i++) {
      const row = items[i];
      if (row) {
        next.add(this.trackBy(row));
      }
    }
    this._ids.set(next);
  }
}
