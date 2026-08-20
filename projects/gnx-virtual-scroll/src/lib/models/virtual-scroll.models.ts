import { TemplateRef } from '@angular/core';

/** Offset | cursor append | infinite append | full in-memory array */
export type PaginationStrategy = 'offset' | 'cursor' | 'infinite' | 'static';

export type RowId = string | number;

export interface PageRequest {
  limit: number;
  /** Used by offset strategy */
  offset?: number;
  /** Used by cursor / infinite-with-cursor */
  cursor?: string | null;
  /** Active sorts (empty / null = unsorted). First entry is primary. */
  sort?: SortPropDir[] | null;
  filter?: string;
}

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export enum SortType {
  single = 'single',
  multi = 'multi',
}

/** ngx-datatable-style row selection mode */
export enum SelectionType {
  single = 'single',
  multi = 'multi',
}

/** ngx-datatable-compatible sort entry */
export interface SortPropDir {
  prop: string;
  dir: SortDirection | 'asc' | 'desc';
}

/**
 * @deprecated Prefer {@link SortPropDir} (`prop` / `dir`).
 * Still accepted by applySort helpers for older hosts.
 */
export interface SortState {
  key: string;
  direction: SortDirection | 'asc' | 'desc';
}

export interface InnerSortEvent<T = unknown> {
  column: ColumnDef<T>;
  prevValue: SortDirection | undefined;
  newValue: SortDirection | undefined;
}

/** Fired whenever the user clicks a sort control (internal or external). */
export interface SortEvent<T = unknown> extends InnerSortEvent<T> {
  sorts: SortPropDir[];
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

export type VirtualFilterFn<T> = (item: T, query: string) => boolean;

export interface VirtualDataSourceConfig<T> {
  /**
   * Lazy / server page loader (remote mode).
   * Called when the viewport needs more rows. Not used when `data` is set.
   */
  fetchPage?: VirtualFetchFn<T>;
  /**
   * Full in-memory dataset (static mode).
   * Virtual scroll still only *renders* visible rows; no network / lazy fetch.
   * Provide this **or** `fetchPage`.
   */
  data?: T[];
  trackBy: (item: T) => RowId;
  strategy?: PaginationStrategy;
  /** Items per remote page (infinite / offset / cursor). Default: 25 */
  pageSize?: number;
  /** Pages ahead/behind to prefetch (offset) */
  prefetchPages?: number;
  /** LRU page budget */
  maxCachedPages?: number;
  /** Rows before end that trigger loadMore (infinite/cursor) */
  loadMoreThreshold?: number;
  /** Simulated / known total before first fetch (optional) */
  estimatedTotal?: number;
  /** Custom filter for static mode (default: JSON stringify includes query) */
  filterFn?: VirtualFilterFn<T>;
}

export type FreezeSide = 'left' | 'right';

/**
 * ngx-datatable-compatible column width distribution.
 * - standard — declared / resized widths only (H-scroll if needed)
 * - flex — leftover space by column `flex` weights
 * - force — fill container when possible; overflow keeps standard widths
 */
export enum ColumnMode {
  standard = 'standard',
  flex = 'flex',
  force = 'force',
}

export interface ColumnDef<T = unknown> {
  key: string;
  header: string;
  /** Preferred / default width in px */
  width: number;
  /** Clamp when resizing or fitting to container */
  minWidth?: number;
  /** Max width while resizing (default 1000px if omitted) */
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
