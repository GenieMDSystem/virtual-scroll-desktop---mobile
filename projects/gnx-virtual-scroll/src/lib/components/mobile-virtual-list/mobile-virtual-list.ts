import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  contentChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { VirtualDataSource } from '../../data-source/virtual-data-source';
import { VirtualItemDef } from '../../directives/virtual-item.directive';

@Component({
  selector: 'gnx-mobile-virtual-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollingModule, DecimalPipe, NgTemplateOutlet],
  templateUrl: './mobile-virtual-list.html',
  styleUrl: './mobile-virtual-list.scss',
  host: {
    '[class.mobile-list--fit]': 'fitToContent()',
    '[class.mobile-list--fitted]': 'isFitted()',
    '[style.height]': 'hostHeightStyle()',
    '[style.max-height]': 'fitToContent() ? "100%" : null',
  },
})
export class MobileVirtualListComponent<T> implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  readonly dataSource = input.required<VirtualDataSource<T>>();
  readonly itemSize = input(156);
  readonly title = input('Mobile Virtual List');
  readonly ariaLabel = input('Virtual list');
  /**
   * When true (default), viewport height is min(available, items × itemSize)
   * so short lists do not leave empty space under the last row.
   * Tall lists still fill the parent and scroll.
   */
  readonly fitToContent = input(true);
  /** Hide the built-in title/meta header (for embedding in host cards). */
  readonly showMeta = input(true);

  readonly itemDef = contentChild.required(VirtualItemDef);

  @ViewChild(CdkVirtualScrollViewport)
  private viewport!: CdkVirtualScrollViewport;
  @ViewChild('meta') private metaRef?: ElementRef<HTMLElement>;

  private readonly availablePx = signal(0);
  /** Explicit viewport height when fitting; null = CSS flex fill */
  readonly viewportHeightPx = signal<number | null>(null);
  /** Host CSS height */
  readonly hostHeightStyle = signal('100%');
  /** True when content is shorter than parent (no empty fill) */
  readonly isFitted = signal(false);

  readonly itemCount = computed(() => this.dataSource().items().length);

  readonly contentHeightPx = computed(
    () => this.itemCount() * this.itemSize(),
  );

  private readonly initEffect = effect(() => {
    void this.dataSource().init();
  });

  private readonly fitEffect = effect(() => {
    void this.fitToContent();
    void this.itemSize();
    void this.itemCount();
    void this.availablePx();
    void this.showMeta();
    queueMicrotask(() => this.applyFitHeight());
  });

  private metaBlockPx(): number {
    if (!this.showMeta()) {
      return 0;
    }
    return this.metaRef?.nativeElement.offsetHeight ?? 0;
  }

  private shellGapPx(): number {
    return this.showMeta() ? 12 : 0;
  }

  private applyFitHeight(): void {
    if (!this.fitToContent()) {
      this.viewportHeightPx.set(null);
      this.hostHeightStyle.set('100%');
      this.isFitted.set(false);
      queueMicrotask(() => this.viewport?.checkViewportSize());
      return;
    }

    const content = this.contentHeightPx();
    const available = this.availablePx();
    const meta = this.metaBlockPx();
    const gap = this.shellGapPx();
    const chrome = meta + gap;

    if (available <= 0) {
      // Parent not measured yet — size to content so we don't paint a huge empty viewport
      this.viewportHeightPx.set(content);
      this.hostHeightStyle.set('auto');
      this.isFitted.set(true);
      queueMicrotask(() => this.viewport?.checkViewportSize());
      return;
    }

    const listBudget = Math.max(0, available - chrome);
    const fitted = content <= listBudget;
    const viewportH = fitted ? content : listBudget;

    this.viewportHeightPx.set(viewportH);
    this.isFitted.set(fitted);
    // Shrink host when fitted so outer cards collapse; fill parent when scrolling
    this.hostHeightStyle.set(fitted ? 'auto' : '100%');
    queueMicrotask(() => this.viewport?.checkViewportSize());
  }

  private measureAvailable(): void {
    const host = this.hostEl.nativeElement;
    const parent = host.parentElement;
    const h = parent?.clientHeight || host.clientHeight;
    this.availablePx.set(Math.floor(h));
  }

  private readonly onScroll = (): void => {
    const range = this.viewport.getRenderedRange();
    this.dataSource().onViewportRange(range.start, range.end);
  };

  ngAfterViewInit(): void {
    const el = this.viewport.elementRef.nativeElement;
    el.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();

    this.measureAvailable();
    this.applyFitHeight();

    const ro = new ResizeObserver(() => {
      this.measureAvailable();
      this.applyFitHeight();
    });
    const parent = this.hostEl.nativeElement.parentElement;
    if (parent) {
      ro.observe(parent);
    }
    ro.observe(this.hostEl.nativeElement);
    if (this.metaRef?.nativeElement) {
      ro.observe(this.metaRef.nativeElement);
    }

    this.destroyRef.onDestroy(() => {
      el.removeEventListener('scroll', this.onScroll);
      ro.disconnect();
    });
  }
}
