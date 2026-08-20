import { TemplateRef } from '@angular/core';

/** Offset | cursor append | infinite append */
export type PaginationStrategy = 'offset' | 'cursor' | 'infinite';

export type RowId = string | number;

export interface PageRequest {
  limit: number;
  /** Used by offset strategy */
  offset?: number;
  /** Used by cursor / infinite-with-cursor */
  cursor?: string | null;
  sort?: SortState | null;
  filter?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface PageResult<T> {
  items: T[];
  /** Total records when known (typical for offset) */
  totalCount?: number;
  nextCursor?: string | null;
  hasMore: boolean;
}

export type VirtualFetchFn<T> = (
  request: PageRequest,
) => Promise<PageResult<T>> | import('rxjs').Observable<PageResult<T>>;

export interface VirtualDataSourceConfig<T> {
  fetchPage: VirtualFetchFn<T>;
  trackBy: (item: T) => RowId;
  strategy?: PaginationStrategy;
  pageSize?: number;
  /** Pages ahead/behind to prefetch (offset) */
  prefetchPages?: number;
  /** LRU page budget */
  maxCachedPages?: number;
  /** Rows before end that trigger loadMore (infinite/cursor) */
  loadMoreThreshold?: number;
  /** Simulated / known total before first fetch (optional) */
  estimatedTotal?: number;
}

export type FreezeSide = 'left' | 'right';

export interface ColumnDef<T = unknown> {
  key: string;
  header: string;
  /** Preferred / default width in px */
  width: number;
  /** Clamp when resizing or fitting to container */
  minWidth?: number;
  maxWidth?: number;
  frozen?: FreezeSide;
  /** When false, hide resize handle (default true) */
  resizable?: boolean;
  /** Enable sort icon controls on this column (default false) */
  sortable?: boolean;
  /**
   * Flex weight for leftover container space.
   * 0 = fixed (typical for frozen columns). Default: frozen ? 0 : 1
   */
  flex?: number;
  /** Default text cell value */
  valueAccessor?: (row: T) => unknown;
  /** CSS class on cell */
  cellClass?: string;
}

export interface ColumnView<T = unknown> extends ColumnDef<T> {
  /** Resolved live width after resize + container fit */
  width: number;
  stickyOffset: number;
  isFreezeEdge: boolean;
  zIndex: number;
}

export interface VirtualCellContext<T> {
  $implicit: T;
  row: T;
  column: ColumnView<T>;
  index: number;
}

export interface VirtualItemContext<T> {
  $implicit: T;
  item: T;
  index: number;
}

export type CellTemplateMap<T> = Map<string, TemplateRef<VirtualCellContext<T>>>;

export interface CacheStats {
  pageCount: number;
  maxPages: number;
  hits: number;
  misses: number;
}
