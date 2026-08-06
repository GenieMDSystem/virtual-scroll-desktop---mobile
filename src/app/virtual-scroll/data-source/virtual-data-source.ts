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
} from '../models/virtual-scroll.models';

async function resolvePage<T>(
  result: Promise<PageResult<T>> | Observable<PageResult<T>>,
): Promise<PageResult<T>> {
  return isObservable(result) ? firstValueFrom(result) : result;
}

/**
 * Generic virtual data source shared by desktop table + mobile list.
 * Supports offset windowing, cursor pagination, and infinite append — with LRU page cache.
 */
export class VirtualDataSource<T> {
  private _strategy: PaginationStrategy;
  readonly pageSize: number;

  private readonly trackBy: (item: T) => RowId;
  private readonly fetchPage: VirtualDataSourceConfig<T>['fetchPage'];
  private readonly prefetchPages: number;
  private readonly loadMoreThreshold: number;
  private readonly estimatedTotal?: number;
  private readonly cache: VirtualCacheManager<T>;

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

  constructor(config: VirtualDataSourceConfig<T>) {
    this.fetchPage = config.fetchPage;
    this.trackBy = config.trackBy;
    this._strategy = config.strategy ?? 'infinite';
    this.pageSize = config.pageSize ?? 50;
    this.prefetchPages = config.prefetchPages ?? 1;
    this.loadMoreThreshold = config.loadMoreThreshold ?? 15;
    this.estimatedTotal = config.estimatedTotal;
    this.cache = new VirtualCacheManager<T>(config.maxCachedPages ?? 24);

    if (this.estimatedTotal && this._strategy === 'offset') {
      this._totalCount.set(this.estimatedTotal);
      this._items.set(new Array<T | null>(this.estimatedTotal).fill(null));
    }
  }

  /** Bootstrap first page(s). Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    if (this.strategy === 'offset') {
      await this.ensureRange(0, this.pageSize - 1);
    } else {
      await this.loadMore();
    }
  }

  /**
   * React to CDK viewport range. Offset strategy window-loads pages;
   * infinite/cursor strategies append near the end.
   */
  onViewportRange(start: number, end: number): void {
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
    if (this.strategy === 'offset') {
      return;
    }
    if (!this._hasMore() || this._loading()) {
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
            : await resolvePage(this.fetchPage(request));

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
    if (this.strategy !== 'offset') {
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
          this.fetchPage({
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
          // Re-paint all cached pages after resize
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
