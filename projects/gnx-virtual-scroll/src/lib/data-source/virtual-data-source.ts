import { computed, signal } from '@angular/core';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { VirtualCacheManager } from '../cache/virtual-cache-manager';
import {
  PageRequest,
  PageResult,
  PaginationStrategy,
  RowId,
  SortState,
  VirtualDataSourceConfig,
  VirtualFetchFn,
  VirtualFilterFn,
} from '../models/virtual-scroll.models';

async function resolvePage<T>(
  result: Promise<PageResult<T>> | Observable<PageResult<T>>,
): Promise<PageResult<T>> {
  return isObservable(result) ? firstValueFrom(result) : result;
}

/**
 * Generic virtual data source shared by desktop table + mobile list.
 *
 * Two modes:
 * - **Remote** (`fetchPage`): lazy page loads — infinite / offset / cursor
 * - **Static** (`data`): all rows already in memory — no fetch; CDK still virtualizes the DOM
 */
export class VirtualDataSource<T> {
  private _strategy: PaginationStrategy;
  readonly pageSize: number;

  private readonly trackBy: (item: T) => RowId;
  private fetchPage: VirtualFetchFn<T> | undefined;
  private readonly prefetchPages: number;
  private readonly loadMoreThreshold: number;
  private readonly estimatedTotal?: number;
  private readonly filterFn?: VirtualFilterFn<T>;
  private readonly cache: VirtualCacheManager<T>;

  /** Full source array when in static mode */
  private rawData: T[] | null = null;

  private readonly inflight = new Map<string, Promise<void>>();
  private nextCursor: string | null = null;
  private appendOffset = 0;
  private initialized = false;

  private readonly _items = signal<(T | null)[]>([]);
  private readonly _totalCount = signal(0);
  private readonly _loadedCount = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _hasMore = signal(true);
  private readonly _cacheTick = signal(0);
  private readonly _sort = signal<SortState | null>(null);
  private readonly _filter = signal('');

  readonly items = this._items.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly loadedCount = this._loadedCount.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly sort = this._sort.asReadonly();
  readonly filter = this._filter.asReadonly();
  readonly cacheStats = computed(() => {
    this._cacheTick();
    return this.cache.stats();
  });

  get strategy(): PaginationStrategy {
    return this._strategy;
  }

  /** True when using in-memory `data` (no fetchPage lazy loading). */
  get isStatic(): boolean {
    return this._strategy === 'static' || this.rawData != null;
  }

  constructor(config: VirtualDataSourceConfig<T>) {
    if (!config.data && !config.fetchPage) {
      throw new Error(
        'VirtualDataSource requires either `data` (all rows in memory) or `fetchPage` (lazy/remote).',
      );
    }

    this.fetchPage = config.fetchPage;
    this.trackBy = config.trackBy;
    this.pageSize = config.pageSize ?? 50;
    this.prefetchPages = config.prefetchPages ?? 1;
    this.loadMoreThreshold = config.loadMoreThreshold ?? 15;
    this.estimatedTotal = config.estimatedTotal;
    this.filterFn = config.filterFn;
    this.cache = new VirtualCacheManager<T>(config.maxCachedPages ?? 24);

    if (config.data) {
      this.rawData = config.data.slice();
      this._strategy = 'static';
      this.applyStaticView();
      this.initialized = true;
    } else {
      this._strategy = config.strategy ?? 'infinite';
      if (this.estimatedTotal && this._strategy === 'offset') {
        this._totalCount.set(this.estimatedTotal);
        this._items.set(new Array<T | null>(this.estimatedTotal).fill(null));
      }
    }
  }

  /**
   * Convenience: create a static (all-data-in-memory) data source.
   * Virtual scroll still only renders visible rows.
   */
  static fromArray<T>(
    data: T[],
    options: Omit<VirtualDataSourceConfig<T>, 'data' | 'fetchPage' | 'strategy'>,
  ): VirtualDataSource<T> {
    return new VirtualDataSource<T>({ ...options, data, strategy: 'static' });
  }

  /** Bootstrap first page(s). No-op when already initialized (incl. static). */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    if (this.isStatic) {
      this.applyStaticView();
      return;
    }

    if (this.strategy === 'offset') {
      await this.ensureRange(0, this.pageSize - 1);
    } else {
      await this.loadMore();
    }
  }

  /**
   * Replace / provide the full in-memory dataset (switches to static mode).
   * Use when the API already returned everything and you don't need lazy fetch.
   */
  setData(data: T[]): void {
    this.rawData = data.slice();
    this._strategy = 'static';
    this.cache.clear();
    this.inflight.clear();
    this.nextCursor = null;
    this.appendOffset = 0;
    this._hasMore.set(false);
    this._loading.set(false);
    this._error.set(null);
    this.initialized = true;
    this.applyStaticView();
  }

  /**
   * React to CDK viewport range. Offset strategy window-loads pages;
   * infinite/cursor strategies append near the end. Static mode: no-op.
   */
  onViewportRange(start: number, end: number): void {
    if (this.isStatic) {
      return;
    }
    if (this.strategy === 'offset') {
      void this.ensureRange(start, end);
      return;
    }

    const loaded = this._items().length;
    if (this._hasMore() && end >= loaded - this.loadMoreThreshold) {
      void this.loadMore();
    }
  }

  async loadMore(): Promise<void> {
    if (this.isStatic || this.strategy === 'offset') {
      return;
    }
    if (!this._hasMore() || this._loading()) {
      return;
    }
    if (!this.fetchPage) {
      return;
    }

    const cacheKey =
      this.strategy === 'cursor'
        ? `cursor:${this.queryKey()}:${this.nextCursor ?? 'start'}`
        : `infinite:${this.queryKey()}:${this.appendOffset}`;

    await this.runInflight(cacheKey, async () => {
      this._loading.set(true);
      this._error.set(null);
      try {
        const request: PageRequest =
          this.strategy === 'cursor'
            ? {
                limit: this.pageSize,
                cursor: this.nextCursor,
                ...this.queryParams(),
              }
            : {
                limit: this.pageSize,
                offset: this.appendOffset,
                ...this.queryParams(),
              };

        const cached = this.cache.get(cacheKey);
        const page =
          cached != null
            ? {
                items: cached,
                hasMore: true,
                nextCursor: this.nextCursor,
                totalCount: this._totalCount(),
              }
            : await resolvePage(this.fetchPage!(request));

        if (cached == null) {
          this.cache.set(cacheKey, page.items);
          this.bumpCache();
        }

        this._items.update((list) => [...list, ...page.items]);
        this.appendOffset += page.items.length;
        this._loadedCount.set(this.appendOffset);
        this.nextCursor = page.nextCursor ?? null;
        this._hasMore.set(page.hasMore);
        if (page.totalCount != null) {
          this._totalCount.set(page.totalCount);
        } else if (!page.hasMore) {
          this._totalCount.set(this.appendOffset);
        } else {
          this._totalCount.set(this.appendOffset);
        }
      } catch (err) {
        this._error.set(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        this._loading.set(false);
      }
    });
  }

  async ensureRange(start: number, end: number): Promise<void> {
    if (this.isStatic || this.strategy !== 'offset') {
      return;
    }

    const safeStart = Math.max(0, start);
    const safeEnd = Math.max(safeStart, end);
    const firstPage = Math.floor(safeStart / this.pageSize);
    const lastPage = Math.floor(safeEnd / this.pageSize);
    const from = Math.max(0, firstPage - this.prefetchPages);
    const to = lastPage + this.prefetchPages;

    const tasks: Promise<void>[] = [];
    for (let page = from; page <= to; page++) {
      tasks.push(this.loadOffsetPage(page));
    }
    await Promise.all(tasks);
  }

  reset(strategy?: PaginationStrategy): void {
    if (strategy) {
      this._strategy = strategy;
    }

    if (strategy === 'static' || (this.rawData && this._strategy === 'static')) {
      this.initialized = true;
      this.cache.clear();
      this.inflight.clear();
      this._error.set(null);
      this._loading.set(false);
      this._hasMore.set(false);
      this.applyStaticView();
      return;
    }

    // Leaving static → remote requires fetchPage
    if (!this.fetchPage) {
      this._error.set('Cannot use remote strategy without fetchPage');
      return;
    }

    this.rawData = null;
    this.initialized = false;
    this.cache.clear();
    this.inflight.clear();
    this.nextCursor = null;
    this.appendOffset = 0;
    this._error.set(null);
    this._loading.set(false);
    this._hasMore.set(true);
    this._loadedCount.set(0);

    if (this._strategy === 'offset') {
      const total = this.estimatedTotal ?? this._totalCount() ?? 0;
      this._totalCount.set(total);
      this._items.set(total > 0 ? new Array<T | null>(total).fill(null) : []);
    } else {
      this._totalCount.set(0);
      this._items.set([]);
    }

    this.bumpCache();
    void this.init();
  }

  setFilter(query: string): void {
    const next = query.trim();
    if (next === this._filter()) {
      return;
    }
    this._filter.set(next);
    this.reloadQuery();
  }

  setSort(key: string): void {
    const current = this._sort();
    let next: SortState | null;
    if (!current || current.key !== key) {
      next = { key, direction: 'asc' };
    } else if (current.direction === 'asc') {
      next = { key, direction: 'desc' };
    } else {
      next = null;
    }
    this.applySort(next);
  }

  /** Set an exact sort state (used by externalSorting hosts). */
  applySort(state: SortState | null): void {
    const current = this._sort();
    if (
      current?.key === state?.key &&
      current?.direction === state?.direction
    ) {
      return;
    }
    this._sort.set(state);
    this.reloadQuery();
  }

  clearSort(): void {
    this.applySort(null);
  }

  private reloadQuery(): void {
    if (this.isStatic) {
      this.applyStaticView();
      return;
    }

    this.initialized = false;
    this.cache.clear();
    this.inflight.clear();
    this.nextCursor = null;
    this.appendOffset = 0;
    this._error.set(null);
    this._loading.set(false);
    this._hasMore.set(true);
    this._loadedCount.set(0);
    if (this._strategy === 'offset') {
      const total = this.estimatedTotal ?? 0;
      this._totalCount.set(total);
      this._items.set(total > 0 ? new Array<T | null>(total).fill(null) : []);
    } else {
      this._totalCount.set(0);
      this._items.set([]);
    }
    this.bumpCache();
    void this.init();
  }

  /** Build filtered + sorted view from rawData (static mode). */
  private applyStaticView(): void {
    if (!this.rawData) {
      return;
    }

    const query = this._filter();
    let view = this.rawData;

    if (query) {
      view = view.filter((item) => this.matchesFilter(item, query));
    }

    const sort = this._sort();
    if (sort) {
      view = view.slice().sort((a, b) => this.compareStatic(a, b, sort));
    }

    this._items.set(view);
    this._totalCount.set(view.length);
    this._loadedCount.set(view.length);
    this._hasMore.set(false);
    this.bumpCache();
  }

  private matchesFilter(item: T, query: string): boolean {
    if (this.filterFn) {
      return this.filterFn(item, query);
    }
    return JSON.stringify(item).toLowerCase().includes(query.toLowerCase());
  }

  private compareStatic(a: T, b: T, sort: SortState): number {
    const va = this.staticSortValue(a, sort.key);
    const vb = this.staticSortValue(b, sort.key);
    let cmp = 0;
    if (va < vb) cmp = -1;
    else if (va > vb) cmp = 1;
    return sort.direction === 'asc' ? cmp : -cmp;
  }

  private staticSortValue(item: T, key: string): string | number {
    const raw = (item as unknown as Record<string, unknown>)[key];
    if (raw == null) return '';
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw === 'number') return raw;
    return String(raw).toLowerCase();
  }

  private queryParams(): Pick<PageRequest, 'sort' | 'filter'> {
    return {
      sort: this._sort(),
      filter: this._filter() || undefined,
    };
  }

  private queryKey(): string {
    const sort = this._sort();
    return `${this._filter()}|${sort?.key ?? ''}|${sort?.direction ?? ''}`;
  }

  patchById(id: RowId, updater: (item: T) => T): void {
    const match = (item: T) => this.trackBy(item) === id;

    if (this.rawData) {
      this.rawData = this.rawData.map((item) =>
        match(item) ? updater(item) : item,
      );
      this.applyStaticView();
      return;
    }

    this.cache.patchItem(match, updater);
    this._items.update((list) =>
      list.map((item) => (item && match(item) ? updater(item) : item)),
    );
    this.bumpCache();
  }

  trackByIndex = (index: number, item: T | null): RowId => {
    if (item) {
      return this.trackBy(item);
    }
    return `placeholder-${index}`;
  };

  private async loadOffsetPage(pageIndex: number): Promise<void> {
    if (!this.fetchPage) {
      return;
    }

    const cacheKey = `offset:${this.queryKey()}:${pageIndex}`;
    const existing = this.cache.get(cacheKey);
    if (existing) {
      this.paintOffsetPage(pageIndex, existing);
      return;
    }

    await this.runInflight(cacheKey, async () => {
      const raced = this.cache.get(cacheKey);
      if (raced) {
        this.paintOffsetPage(pageIndex, raced);
        return;
      }

      this._loading.set(true);
      this._error.set(null);
      try {
        const offset = pageIndex * this.pageSize;
        const page = await resolvePage(
          this.fetchPage!({
            limit: this.pageSize,
            offset,
            ...this.queryParams(),
          }),
        );
        this.cache.set(cacheKey, page.items);
        this.bumpCache();

        if (page.totalCount != null && page.totalCount !== this._totalCount()) {
          this._totalCount.set(page.totalCount);
          this._items.set(new Array<T | null>(page.totalCount).fill(null));
          for (let i = 0; i <= pageIndex; i++) {
            const key = `offset:${this.queryKey()}:${i}`;
            const cached = this.cache.get(key);
            if (cached) {
              this.paintOffsetPage(i, cached);
            }
          }
        } else {
          this.paintOffsetPage(pageIndex, page.items);
        }

        this._hasMore.set(page.hasMore);
        this._loadedCount.update((n) => Math.max(n, offset + page.items.length));
      } catch (err) {
        this._error.set(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        this._loading.set(false);
      }
    });
  }

  private paintOffsetPage(pageIndex: number, pageItems: T[]): void {
    const start = pageIndex * this.pageSize;
    this._items.update((list) => {
      const next = list.length ? list.slice() : [];
      const needed = start + pageItems.length;
      if (next.length < needed) {
        next.length = Math.max(needed, this._totalCount());
      }
      for (let i = 0; i < pageItems.length; i++) {
        next[start + i] = pageItems[i];
      }
      return next;
    });
  }

  private async runInflight(key: string, work: () => Promise<void>): Promise<void> {
    const existing = this.inflight.get(key);
    if (existing) {
      return existing;
    }
    const task = work().finally(() => this.inflight.delete(key));
    this.inflight.set(key, task);
    return task;
  }

  private bumpCache(): void {
    this._cacheTick.update((n) => n + 1);
  }
}
