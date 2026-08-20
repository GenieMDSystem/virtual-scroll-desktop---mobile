import { ColumnDef, SortDirection, SortState } from '../models/virtual-scroll.models';

/** Cycle: none → asc → desc → none (ngx-datatable style). */
export function nextSortState(
  current: SortState | null,
  key: string,
): SortState | null {
  if (!current || current.key !== key) {
    return { key, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { key, direction: 'desc' };
  }
  return null;
}

export function sortValue<T>(
  row: T,
  key: string,
  columns: ColumnDef<T>[],
): string | number {
  const col = columns.find((c) => c.key === key);
  const raw = col?.valueAccessor
    ? col.valueAccessor(row)
    : (row as unknown as Record<string, unknown>)[key];

  if (raw == null) {
    return '';
  }
  if (raw instanceof Date) {
    return raw.getTime();
  }
  if (typeof raw === 'number') {
    return raw;
  }
  return String(raw).toLowerCase();
}

/**
 * Client-side (internal) sort of the current row window.
 * Null placeholders sink to the end; original index breaks ties.
 */
export function sortItemsInternal<T>(
  items: (T | null)[],
  sort: SortState,
  columns: ColumnDef<T>[],
): (T | null)[] {
  const decorated = items.map((item, index) => ({ item, index }));
  const dir: SortDirection = sort.direction;

  decorated.sort((a, b) => {
    if (a.item == null && b.item == null) {
      return a.index - b.index;
    }
    if (a.item == null) {
      return 1;
    }
    if (b.item == null) {
      return -1;
    }

    const va = sortValue(a.item, sort.key, columns);
    const vb = sortValue(b.item, sort.key, columns);
    let cmp = 0;
    if (va < vb) cmp = -1;
    else if (va > vb) cmp = 1;
    else cmp = a.index - b.index;

    return dir === 'asc' ? cmp : -cmp;
  });

  return decorated.map((d) => d.item);
}
