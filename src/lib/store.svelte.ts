import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { AppData, CounterConfig, DayOfWeek, Habit } from './types';
import { emptyAppData } from './types';
import { newId } from './ids';
import { effectiveTarget, isDueOn, normalizeDays } from './schedule';
import { selectedDate } from './selectedDate.svelte';
import { STORAGE_KEY, loadInitial, migrate, save } from './storage';

export type NewHabitInput =
  | { type: 'binary'; name: string; days: DayOfWeek[]; startDate: string }
  | {
      type: 'counter';
      name: string;
      days: DayOfWeek[];
      startDate: string;
      counter: CounterConfig;
    };

export type HabitPatch = Partial<Pick<Habit, 'name' | 'schedule' | 'startDate'>> & {
  counter?: CounterConfig;
};

class HabitStore {
  data: AppData = $state(emptyAppData());
  recoveryNotice = $state(false);

  donesByHabit = $derived.by(() => {
    const byId = new SvelteMap<string, Habit>();
    for (const h of this.data.habits) byId.set(h.id, h);
    const map = new SvelteMap<string, SvelteSet<string>>();
    for (const c of this.data.completions) {
      const habit = byId.get(c.habitId);
      if (!habit) continue;
      if (habit.type === 'counter') {
        const count = c.count ?? 0;
        if (count < effectiveTarget(habit, c.date)) continue;
      }
      let set = map.get(c.habitId);
      if (!set) {
        set = new SvelteSet();
        map.set(c.habitId, set);
      }
      set.add(c.date);
    }
    return map;
  });

  dueHabits = $derived.by(() => {
    const date = selectedDate.value;
    return this.data.habits.filter((h) => isDueOn(h, date) && h.startDate <= date);
  });

  doneCount = $derived.by(() => {
    const date = selectedDate.value;
    return this.dueHabits.filter((h) => this.isDone(h.id, date)).length;
  });

  totalCount = $derived(this.dueHabits.length);

  progressPct = $derived(
    this.totalCount > 0 ? Math.floor((this.doneCount / this.totalCount) * 100) : 0
  );

  hasAnyHabit = $derived(this.data.habits.length > 0);

  constructor() {
    const initial = loadInitial();
    this.data = initial.data;
    this.recoveryNotice = initial.recoveredFromCorruption;

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorageEvent);
    }
  }

  private onStorageEvent = (e: StorageEvent): void => {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === null) return;
    try {
      const next = migrate(JSON.parse(e.newValue));
      if (next) this.data = next;
    } catch {
      // Ignore: another tab wrote garbage. Our own state is unaffected.
    }
  };

  dismissRecoveryNotice(): void {
    this.recoveryNotice = false;
  }

  addHabit(input: NewHabitInput): Habit {
    const base = {
      id: newId(),
      name: input.name.trim(),
      schedule: { type: 'weekly_days' as const, days: normalizeDays(input.days) },
      startDate: input.startDate
    };
    const habit: Habit =
      input.type === 'counter'
        ? { ...base, type: 'counter', counter: input.counter }
        : { ...base, type: 'binary' };
    this.data.habits.push(habit);
    save(this.data);
    return habit;
  }

  updateHabit(id: string, patch: HabitPatch): boolean {
    const h = this.data.habits.find((x) => x.id === id);
    if (!h) return false;
    if (patch.name !== undefined) h.name = patch.name.trim();
    if (patch.schedule !== undefined) h.schedule = patch.schedule;
    if (patch.startDate !== undefined) {
      const newStart = patch.startDate;
      h.startDate = newStart;
      // Maintain the invariant that completions exist only on/after startDate.
      // Caller is responsible for warning the user first when this would discard data.
      this.data.completions = this.data.completions.filter(
        (c) => c.habitId !== id || c.date >= newStart
      );
    }
    if (patch.counter !== undefined && h.type === 'counter') {
      h.counter = patch.counter;
    }
    save(this.data);
    return true;
  }

  completionsBefore(habitId: string, dateExclusive: string): number {
    let count = 0;
    for (const c of this.data.completions) {
      if (c.habitId === habitId && c.date < dateExclusive) count++;
    }
    return count;
  }

  reorderHabits(newIds: string[]): void {
    const visibleSet = new Set(newIds);
    const byId = new Map(
      this.data.habits.filter((h) => visibleSet.has(h.id)).map((h) => [h.id, h])
    );
    let i = 0;
    this.data.habits = this.data.habits.map((h) =>
      visibleSet.has(h.id) ? byId.get(newIds[i++])! : h
    );
    save(this.data);
  }

  deleteHabit(id: string): boolean {
    const idx = this.data.habits.findIndex((h) => h.id === id);
    if (idx === -1) return false;
    this.data.habits.splice(idx, 1);
    this.data.completions = this.data.completions.filter((c) => c.habitId !== id);
    save(this.data);
    return true;
  }

  toggleCompletion(habitId: string, date: string): void {
    const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
    if (idx === -1) {
      this.data.completions.push({ habitId, date });
    } else {
      this.data.completions.splice(idx, 1);
    }
    save(this.data);
  }

  setCount(habitId: string, date: string, count: number): void {
    if (count < 0) count = 0;
    const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
    if (count === 0) {
      if (idx !== -1) this.data.completions.splice(idx, 1);
    } else if (idx === -1) {
      this.data.completions.push({ habitId, date, count });
    } else {
      this.data.completions[idx] = { habitId, date, count };
    }
    save(this.data);
  }

  getCount(habitId: string, date: string): number {
    const c = this.data.completions.find((x) => x.habitId === habitId && x.date === date);
    return c?.count ?? 0;
  }

  isDone(habitId: string, date: string): boolean {
    return this.donesByHabit.get(habitId)?.has(date) === true;
  }
}

export const store = new HabitStore();
