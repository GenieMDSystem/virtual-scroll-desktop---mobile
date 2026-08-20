import {
  ColumnDef,
  ColumnMode,
  ColumnView,
} from '../models/virtual-scroll.models';

export interface ResolvedColumnWidth {
  key: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  flex: number;
  frozen?: 'left' | 'right';
  resizable: boolean;
}

const DEFAULT_MIN = 64;
/** Default resize/fit ceiling when ColumnDef.maxWidth is omitted */
const DEFAULT_MAX = 1000;

export function resolveColumnMeta<T>(col: ColumnDef<T>): ResolvedColumnWidth {
  const minWidth = col.minWidth ?? Math.min(col.width, DEFAULT_MIN);
  const maxWidth = col.maxWidth ?? DEFAULT_MAX;
  const flex = col.flex ?? (col.frozen ? 0 : 1);
  return {
    key: col.key,
    width: clamp(col.width, minWidth, maxWidth),
    minWidth,
    maxWidth,
    flex,
    frozen: col.frozen,
    resizable: col.resizable !== false,
  };
}

/**
 * Applies base (user/preferred) widths, then optionally grows columns to fill
 * leftover container space based on {@link ColumnMode}.
 *
 * Never shrinks sibling columns when preferred widths exceed the container —
 * overflow is handled by horizontal scroll so drag-resize of one column does
 * not steal width from others.
 */
export function fitColumnsToContainer(
  metas: ResolvedColumnWidth[],
  containerWidth: number,
  baseWidths: Record<string, number>,
  mode: ColumnMode = ColumnMode.force,
): Record<string, number> {
  const widths: Record<string, number> = {};
  for (const meta of metas) {
    const preferred = baseWidths[meta.key] ?? meta.width;
    widths[meta.key] = clamp(preferred, meta.minWidth, meta.maxWidth);
  }

  if (mode === ColumnMode.standard || containerWidth <= 0) {
    return roundWidths(metas, widths);
  }

  const total = metas.reduce((s, m) => s + widths[m.key], 0);

  // Combined widths already fill / exceed the grid → keep preferred (ngx force)
  if (total >= containerWidth) {
    return roundWidths(metas, widths);
  }

  let leftover = containerWidth - total;
  const growers = pickGrowers(metas, widths, mode);
  const weightSum = growers.reduce((s, m) => s + growWeight(m, mode), 0);

  if (weightSum > 0 && leftover > 0) {
    let remainingWeight = weightSum;
    let remainingSpace = leftover;
    for (const m of growers) {
      if (remainingWeight <= 0 || remainingSpace <= 0) break;
      const weight = growWeight(m, mode);
      const share = (remainingSpace * weight) / remainingWeight;
      const next = Math.min(m.maxWidth, widths[m.key] + share);
      const gained = next - widths[m.key];
      widths[m.key] = next;
      remainingSpace -= gained;
      remainingWeight -= weight;
    }
  }

  return roundWidths(metas, widths);
}

function pickGrowers(
  metas: ResolvedColumnWidth[],
  widths: Record<string, number>,
  mode: ColumnMode,
): ResolvedColumnWidth[] {
  if (mode === ColumnMode.flex) {
    return metas.filter((m) => m.flex > 0 && widths[m.key] < m.maxWidth);
  }
  // force: prefer flex>0 columns; if none can grow, spread across any under max
  const flexGrowers = metas.filter(
    (m) => m.flex > 0 && widths[m.key] < m.maxWidth,
  );
  if (flexGrowers.length) {
    return flexGrowers;
  }
  return metas.filter((m) => widths[m.key] < m.maxWidth);
}

function growWeight(meta: ResolvedColumnWidth, mode: ColumnMode): number {
  if (mode === ColumnMode.flex) {
    return meta.flex;
  }
  // force: flex weight when set, otherwise proportional to current width
  return meta.flex > 0 ? meta.flex : Math.max(meta.width, 1);
}

export function buildColumnViewsFromWidths<T>(
  columns: ColumnDef<T>[],
  liveWidths: Record<string, number>,
): ColumnView<T>[] {
  const withWidth = columns.map((col) => ({
    ...col,
    width: liveWidths[col.key] ?? col.width,
  }));
  return buildColumnViews(withWidth);
}

/**
 * Builds sticky left/right offsets for stacked frozen columns.
 * Left frozen columns accumulate from the left; right frozen from the right.
 */
export function buildColumnViews<T>(columns: ColumnDef<T>[]): ColumnView<T>[] {
  const leftOrdered = columns.filter((c) => c.frozen === 'left');
  const rightOrdered = columns.filter((c) => c.frozen === 'right');
  const lastLeftKey = leftOrdered.at(-1)?.key;
  const firstRightKey = rightOrdered[0]?.key;

  const rightOffsets = new Map<string, number>();
  let rightOffset = 0;
  for (let i = rightOrdered.length - 1; i >= 0; i--) {
    const col = rightOrdered[i];
    rightOffsets.set(col.key, rightOffset);
    rightOffset += col.width;
  }

  const leftCount = leftOrdered.length;
  const rightCount = rightOrdered.length;
  let leftOffset = 0;

  return columns.map((col) => {
    if (col.frozen === 'left') {
      const offset = leftOffset;
      leftOffset += col.width;
      const depth = leftOrdered.findIndex((c) => c.key === col.key);
      return {
        ...col,
        stickyOffset: offset,
        isFreezeEdge: col.key === lastLeftKey,
        zIndex: 20 + (leftCount - depth),
      };
    }

    if (col.frozen === 'right') {
      const depth = rightOrdered.findIndex((c) => c.key === col.key);
      return {
        ...col,
        stickyOffset: rightOffsets.get(col.key) ?? 0,
        isFreezeEdge: col.key === firstRightKey,
        zIndex: 20 + (rightCount - depth),
      };
    }

    return {
      ...col,
      stickyOffset: 0,
      isFreezeEdge: false,
      zIndex: 1,
    };
  });
}

export function totalColumnsWidth<T>(
  columns: Array<{ width: number }>,
): number {
  return columns.reduce((sum, c) => sum + c.width, 0);
}

export function frozenWidth<T>(
  columns: Array<{ width: number; frozen?: 'left' | 'right' }>,
  side: 'left' | 'right',
): number {
  return columns
    .filter((c) => c.frozen === side)
    .reduce((sum, c) => sum + c.width, 0);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function roundWidths(
  metas: ResolvedColumnWidth[],
  widths: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of metas) {
    out[m.key] = Math.round(widths[m.key]);
  }
  return out;
}
