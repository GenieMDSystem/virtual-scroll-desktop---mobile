import { computed, signal } from '@angular/core';
import { RowId } from '../models/virtual-scroll.models';

/** Lightweight selection model for virtualized rows (id-based). */
export class SelectionModel<T> {
  private readonly trackBy: (item: T) => RowId;
  private readonly _ids = signal<Set<RowId>>(new Set());
  private readonly _anchor = signal<RowId | null>(null);

  readonly ids = this._ids.asReadonly();
  readonly count = computed(() => this._ids().size);
  readonly isEmpty = computed(() => this._ids().size === 0);

  constructor(trackBy: (item: T) => RowId) {
    this.trackBy = trackBy;
  }

  isSelected(item: T): boolean {
    return this._ids().has(this.trackBy(item));
  }

  isSelectedId(id: RowId): boolean {
    return this._ids().has(id);
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
    this._anchor.set(id);
  }

  select(item: T): void {
    const id = this.trackBy(item);
    this._ids.update((set) => new Set(set).add(id));
    this._anchor.set(id);
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
    this._anchor.set(null);
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
}
