import type { Habit } from './types';

// "none" represents habits with no priority set. Modeled on appearance.svelte.ts:
// a singleton rune store with localStorage persistence + cross-tab sync, so the
// sidebar (control) and the habit list (consumer) can share filter state without
// prop-drilling.
export type PriorityBucket = 'high' | 'med' | 'low' | 'none';

const KEY = 'meridian:priority-filter';

const BUCKETS: PriorityBucket[] = ['high', 'med', 'low', 'none'];

// Map a habit to its priority bucket. Absent priority => 'none'.
export function priorityOf(habit: Habit): PriorityBucket {
  return habit.priority ?? 'none';
}

type Visible = Record<PriorityBucket, boolean>;

// "true = shown". Default: everything visible (filter is a no-op).
function read(): Visible {
  const base: Visible = { high: true, med: true, low: true, none: true };
  if (typeof localStorage === 'undefined') return base;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<PriorityBucket, unknown>>;
    return {
      high: parsed.high !== false,
      med: parsed.med !== false,
      low: parsed.low !== false,
      none: parsed.none !== false
    };
  } catch {
    return base;
  }
}

class PriorityFilter {
  visible: Visible = $state(read());

  // True when every bucket is shown — lets consumers skip filtering entirely.
  allVisible = $derived(
    this.visible.high && this.visible.med && this.visible.low && this.visible.none
  );

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) this.visible = read();
    });
  }

  toggle(bucket: PriorityBucket): void {
    this.visible[bucket] = !this.visible[bucket];
    this.persist();
  }

  // "Solo" a bucket: show only it, hide the rest. Soloing the bucket that is already
  // the only visible one restores all buckets (un-solo), so it never dead-ends.
  solo(bucket: PriorityBucket): void {
    const onlyThis = this.visible[bucket] && BUCKETS.filter((b) => this.visible[b]).length === 1;
    this.visible = onlyThis
      ? { high: true, med: true, low: true, none: true }
      : {
          high: bucket === 'high',
          med: bucket === 'med',
          low: bucket === 'low',
          none: bucket === 'none'
        };
    this.persist();
  }

  isShown(habit: Habit): boolean {
    return this.visible[priorityOf(habit)];
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(this.visible));
  }
}

export const priorityFilter = new PriorityFilter();
