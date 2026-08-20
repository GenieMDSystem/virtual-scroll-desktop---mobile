import { CacheStats } from '../models/virtual-scroll.models';

interface CacheEntry<T> {
  items: T[];
  /** Monotonic access stamp for LRU */
  stamp: number;
}

/**
 * Page-keyed LRU cache for virtualized datasets.
 * Key is strategy-specific (e.g. `offset:0`, `cursor:abc`).
 */
export class VirtualCacheManager<T> {
  private readonly pages = new Map<string, CacheEntry<T>>();
  private stamp = 0;
  private hits = 0;
  private misses = 0;

  constructor(private readonly maxPages: number = 20) {}

  get(key: string): T[] | undefined {
    const entry = this.pages.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    entry.stamp = ++this.stamp;
    this.hits++;
    return entry.items;
  }

  has(key: string): boolean {
    return this.pages.has(key);
  }

  set(key: string, items: T[]): void {
    this.pages.set(key, { items, stamp: ++this.stamp });
    this.evictIfNeeded();
  }

  patchItem(match: (item: T) => boolean, patch: (item: T) => T): boolean {
    let changed = false;
    for (const entry of this.pages.values()) {
      for (let i = 0; i < entry.items.length; i++) {
        if (match(entry.items[i])) {
          entry.items[i] = patch(entry.items[i]);
          changed = true;
        }
      }
    }
    return changed;
  }

  clear(): void {
    this.pages.clear();
    this.stamp = 0;
  }

  stats(): CacheStats {
    return {
      pageCount: this.pages.size,
      maxPages: this.maxPages,
      hits: this.hits,
      misses: this.misses,
    };
  }

  private evictIfNeeded(): void {
    while (this.pages.size > this.maxPages) {
      let oldestKey: string | null = null;
      let oldestStamp = Infinity;
      for (const [key, entry] of this.pages) {
        if (entry.stamp < oldestStamp) {
          oldestStamp = entry.stamp;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.pages.delete(oldestKey);
      } else {
        break;
      }
    }
  }
}
