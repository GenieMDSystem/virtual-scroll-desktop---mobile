import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  contentChild,
  effect,
  inject,
  input,
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
})
export class MobileVirtualListComponent<T> implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly dataSource = input.required<VirtualDataSource<T>>();
  readonly itemSize = input(156);
  readonly title = input('Mobile Virtual List');
  readonly ariaLabel = input('Virtual list');

  readonly itemDef = contentChild.required(VirtualItemDef);

  @ViewChild(CdkVirtualScrollViewport) private viewport!: CdkVirtualScrollViewport;

  private readonly initEffect = effect(() => {
    void this.dataSource().init();
  });

  private readonly onScroll = (): void => {
    const range = this.viewport.getRenderedRange();
    this.dataSource().onViewportRange(range.start, range.end);
  };

  ngAfterViewInit(): void {
    const el = this.viewport.elementRef.nativeElement;
    el.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
    this.destroyRef.onDestroy(() => el.removeEventListener('scroll', this.onScroll));
  }
}
