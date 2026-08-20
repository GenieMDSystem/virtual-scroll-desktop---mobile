import {
  ColumnDef,
  SortDirection,
  SortEvent,
  SortPropDir,
  SortState,
  SortType,
} from '../models/virtual-scroll.models';

export function normalizeSortDir(
  dir: SortDirection | 'asc' | 'desc',
): SortDirection {
  return dir === SortDirection.desc
    ? SortDirection.desc
    : SortDirection.asc;
}

/** Accept ngx SortPropDir or legacy SortState. */
export function toSortPropDir(input: SortPropDir | SortState): SortPropDir {
  if ('prop' in input) {
    return { prop: input.prop, dir: normalizeSortDir(input.dir) };
  }
  return { prop: input.key, dir: normalizeSortDir(input.direction) };
}

export function normalizeSorts(
  input: SortPropDir[] | SortPropDir | SortState | null | undefined,
): SortPropDir[] {
  if (input == null) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.map(toSortPropDir);
  }
  return [toSortPropDir(input)];
}

export interface NextSortsResult {
  sorts: SortPropDir[];
  prevValue: SortDirection | undefined;
  newValue: SortDirection | undefined;
}

/**
 * Cycle sort for a column (ngx-datatable style).
 * single: none → asc → desc → none (only one column)
 * multi: add / toggle / remove within the sorts list
 */
export function nextSorts(
  current: SortPropDir[],
  prop: string,
  sortType: SortType | `${SortType}` = SortType.single,
): NextSortsResult {
  const list = current.map(toSortPropDir);
  const idx = list.findIndex((s) => s.prop === prop);
  const prevValue = idx >= 0 ? normalizeSortDir(list[idx].dir) : undefined;
  const multi = sortType === SortType.multi;

  if (!multi) {
    if (idx < 0 || list[0]?.prop !== prop) {
      return {
        sorts: [{ prop, dir: SortDirection.asc }],
        prevValue,
        newValue: SortDirection.asc,
      };
    }
    if (normalizeSortDir(list[0].dir) === SortDirection.asc) {
      return {
        sorts: [{ prop, dir: SortDirection.desc }],
        prevValue: SortDirection.asc,
        newValue: SortDirection.desc,
      };
    }
    return {
      sorts: [],
      prevValue: SortDirection.desc,
      newValue: undefined,
    };
  }

  if (idx < 0) {
    return {
      sorts: [...list, { prop, dir: SortDirection.asc }],
      prevValue: undefined,
      newValue: SortDirection.asc,
    };
  }

  if (normalizeSortDir(list[idx].dir) === SortDirection.asc) {
    const sorts = list.slice();
    sorts[idx] = { prop, dir: SortDirection.desc };
    return {
      sorts,
      prevValue: SortDirection.asc,
      newValue: SortDirection.desc,
    };
  }

  return {
    sorts: list.filter((_, i) => i !== idx),
    prevValue: SortDirection.desc,
    newValue: undefined,
  };
}

/** @deprecated Prefer {@link nextSorts} */
export function nextSortState(
  current: SortState | null,
  key: string,
): SortState | null {
  const sorts = current
    ? [{ prop: current.key, dir: normalizeSortDir(current.direction) }]
    : [];
  const next = nextSorts(sorts, key, SortType.single).sorts;
  if (!next.length) {
    return null;
  }
  return { key: next[0].prop, direction: normalizeSortDir(next[0].dir) };
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

export function compareBySorts<T>(
  a: T,
  b: T,
  sorts: SortPropDir[],
  columns: ColumnDef<T>[],
): number {
  for (const sort of sorts) {
    const va = sortValue(a, sort.prop, columns);
    const vb = sortValue(b, sort.prop, columns);
    let cmp = 0;
    if (va < vb) cmp = -1;
    else if (va > vb) cmp = 1;
    if (cmp !== 0) {
      return normalizeSortDir(sort.dir) === SortDirection.asc ? cmp : -cmp;
    }
  }
  return 0;
}

/**
 * Client-side (internal) sort of the current row window.
 * Null placeholders sink to the end; original index breaks ties.
 */
export function sortItemsInternal<T>(
  items: (T | null)[],
  sorts: SortPropDir[] | SortState,
  columns: ColumnDef<T>[],
): (T | null)[] {
  const list = normalizeSorts(sorts);
  if (!list.length) {
    return items;
  }

  const decorated = items.map((item, index) => ({ item, index }));

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

    const cmp = compareBySorts(a.item, b.item, list, columns);
    return cmp !== 0 ? cmp : a.index - b.index;
  });

  return decorated.map((d) => d.item);
}

export function buildSortEvent<T>(
  column: ColumnDef<T>,
  prevValue: SortDirection | undefined,
  newValue: SortDirection | undefined,
  sorts: SortPropDir[],
): SortEvent<T> {
  return { column, prevValue, newValue, sorts };
}

export function dirForProp(
  sorts: SortPropDir[],
  prop: string,
): SortDirection | null {
  const hit = sorts.find((s) => s.prop === prop);
  return hit ? normalizeSortDir(hit.dir) : null;
}

/** 1-based multi-sort order, or null if not sorted */
export function orderForProp(sorts: SortPropDir[], prop: string): number | null {
  const idx = sorts.findIndex((s) => s.prop === prop);
  return idx >= 0 ? idx + 1 : null;
}
