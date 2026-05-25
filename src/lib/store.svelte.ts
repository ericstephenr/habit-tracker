import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { AppData, CounterConfig, DayOfWeek, Habit, Section, Todo } from './types';
import { emptyAppData } from './types';
import { newId } from './ids';
import { effectiveTarget, isDueOn, normalizeDays } from './schedule';
import { selectedDate } from './selectedDate.svelte';
import { STORAGE_KEY, loadInitial, migrate, save } from './storage';

export type TodoGroup = { section: Section | undefined; todos: Todo[] };

export type NewHabitInput =
  | { type: 'binary'; name: string; days: DayOfWeek[]; startDate: string; notes?: string }
  | {
      type: 'counter';
      name: string;
      days: DayOfWeek[];
      startDate: string;
      counter: CounterConfig;
      notes?: string;
    };

export type HabitPatch = Partial<Pick<Habit, 'name' | 'schedule' | 'startDate' | 'notes'>> & {
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

  // Grouped view of dueHabits: the ungrouped bucket first, then each section in
  // data.sections order. All section buckets render even when empty so headers
  // persist and the UI always has a drop target.
  dueGroups = $derived.by(() => {
    const validSectionIds = new SvelteSet(this.data.sections.map((s) => s.id));
    const bySection = new SvelteMap<string | null, Habit[]>();
    bySection.set(null, []);
    for (const s of this.data.sections) bySection.set(s.id, []);
    for (const h of this.dueHabits) {
      const key = h.sectionId && validSectionIds.has(h.sectionId) ? h.sectionId : null;
      bySection.get(key)!.push(h);
    }
    const groups: Array<{ section: Section | null; habits: Habit[] }> = [
      { section: null, habits: bySection.get(null) ?? [] }
    ];
    for (const s of this.data.sections) {
      groups.push({ section: s, habits: bySection.get(s.id) ?? [] });
    }
    return groups;
  });

  allStartedHabits = $derived.by(() => {
    const date = selectedDate.value;
    return this.data.habits.filter((h) => h.startDate <= date);
  });

  dueHabitIds = $derived(new SvelteSet(this.dueHabits.map((h) => h.id)));

  allStartedGroups = $derived.by(() => {
    const validSectionIds = new SvelteSet(this.data.sections.map((s) => s.id));
    const bySection = new SvelteMap<string | null, Habit[]>();
    bySection.set(null, []);
    for (const s of this.data.sections) bySection.set(s.id, []);
    for (const h of this.allStartedHabits) {
      const key = h.sectionId && validSectionIds.has(h.sectionId) ? h.sectionId : null;
      bySection.get(key)!.push(h);
    }
    const groups: Array<{ section: Section | null; habits: Habit[] }> = [
      { section: null, habits: bySection.get(null) ?? [] }
    ];
    for (const s of this.data.sections) {
      groups.push({ section: s, habits: bySection.get(s.id) ?? [] });
    }
    return groups;
  });

  extraHabitCount = $derived(this.allStartedHabits.length - this.dueHabits.length);

  todoGroups = $derived.by((): TodoGroup[] => {
    const validIds = new SvelteSet(this.data.todoSections.map((s) => s.id));
    const bySection = new SvelteMap<string | null, Todo[]>();
    bySection.set(null, []);
    for (const s of this.data.todoSections) bySection.set(s.id, []);
    for (const t of this.data.todos) {
      if (t.done) continue;
      const key = t.sectionId && validIds.has(t.sectionId) ? t.sectionId : null;
      bySection.get(key)!.push(t);
    }
    const groups: TodoGroup[] = [{ section: undefined, todos: bySection.get(null) ?? [] }];
    for (const s of this.data.todoSections) {
      groups.push({ section: s, todos: bySection.get(s.id) ?? [] });
    }
    return groups;
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

  replaceAll(next: AppData): void {
    this.data = next;
    save(this.data);
  }

  addHabit(input: NewHabitInput): Habit {
    const trimmedNotes = input.notes?.trim();
    const base = {
      id: newId(),
      name: input.name.trim(),
      schedule: { type: 'weekly_days' as const, days: normalizeDays(input.days) },
      startDate: input.startDate,
      ...(trimmedNotes ? { notes: trimmedNotes } : {})
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
    if (patch.notes !== undefined) {
      const trimmed = patch.notes.trim();
      if (trimmed) h.notes = trimmed;
      else delete h.notes;
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

  // One commit per drag end. `groups` is the new layout: each group is the
  // ordered habit IDs for that bucket. `null` is the ungrouped bucket.
  // Habits the UI didn't include (not due today) keep their existing
  // sectionId & relative order and are appended at the end.
  commitLayout(groups: Array<{ sectionId: string | null; habitIds: string[] }>): void {
    const byId = new Map(this.data.habits.map((h) => [h.id, h]));
    const next: Habit[] = [];
    const seen = new SvelteSet<string>();
    for (const g of groups) {
      for (const id of g.habitIds) {
        const h = byId.get(id);
        if (!h || seen.has(id)) continue;
        seen.add(id);
        if (g.sectionId === null) {
          if (h.sectionId !== undefined) delete h.sectionId;
        } else {
          h.sectionId = g.sectionId;
        }
        next.push(h);
      }
    }
    for (const h of this.data.habits) if (!seen.has(h.id)) next.push(h);
    this.data.habits = next;
    save(this.data);
  }

  addSection(name: string): Section {
    const section: Section = { id: newId(), name: name.trim(), collapsed: false };
    this.data.sections.push(section);
    save(this.data);
    return section;
  }

  renameSection(id: string, name: string): boolean {
    const s = this.data.sections.find((x) => x.id === id);
    if (!s) return false;
    s.name = name.trim();
    save(this.data);
    return true;
  }

  toggleSectionCollapsed(id: string): void {
    const s = this.data.sections.find((x) => x.id === id);
    if (!s) return;
    s.collapsed = !s.collapsed;
    save(this.data);
  }

  deleteSection(id: string): boolean {
    const idx = this.data.sections.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.data.sections.splice(idx, 1);
    for (const h of this.data.habits) {
      if (h.sectionId === id) delete h.sectionId;
    }
    save(this.data);
    return true;
  }

  reorderSections(newIds: string[]): void {
    const byId = new Map(this.data.sections.map((s) => [s.id, s]));
    const reordered: Section[] = [];
    const seen = new SvelteSet<string>();
    for (const id of newIds) {
      const s = byId.get(id);
      if (!s || seen.has(id)) continue;
      seen.add(id);
      reordered.push(s);
    }
    for (const s of this.data.sections) if (!seen.has(s.id)) reordered.push(s);
    this.data.sections = reordered;
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

  // Per-date progress for the day strip. Mirrors `dueHabits`/`doneCount` but
  // accepts an arbitrary ISO date instead of reading `selectedDate`.
  progressForDate(date: string): { done: number; total: number } {
    let total = 0;
    let done = 0;
    for (const h of this.data.habits) {
      if (!isDueOn(h, date)) continue;
      if (h.startDate > date) continue;
      total++;
      if (this.donesByHabit.get(h.id)?.has(date)) done++;
    }
    return { done, total };
  }

  addTodo(
    nameOrInput: string | { name: string; sectionId?: string; openDate?: string; dueDate?: string }
  ): Todo {
    const input = typeof nameOrInput === 'string' ? { name: nameOrInput } : nameOrInput;
    const todo: Todo = {
      id: newId(),
      name: input.name.trim(),
      done: false,
      ...(input.sectionId ? { sectionId: input.sectionId } : {}),
      ...(input.openDate ? { openDate: input.openDate } : {}),
      ...(input.dueDate ? { dueDate: input.dueDate } : {})
    };
    this.data.todos.push(todo);
    save(this.data);
    return todo;
  }

  updateTodo(
    id: string,
    patch: Partial<Pick<Todo, 'name' | 'sectionId' | 'openDate' | 'dueDate'>>
  ): boolean {
    const t = this.data.todos.find((x) => x.id === id);
    if (!t) return false;
    if (patch.name !== undefined) t.name = patch.name.trim();
    if ('sectionId' in patch) {
      if (patch.sectionId) t.sectionId = patch.sectionId;
      else delete t.sectionId;
    }
    if ('openDate' in patch) {
      if (patch.openDate) t.openDate = patch.openDate;
      else delete t.openDate;
    }
    if ('dueDate' in patch) {
      if (patch.dueDate) t.dueDate = patch.dueDate;
      else delete t.dueDate;
    }
    save(this.data);
    return true;
  }

  toggleTodo(id: string): void {
    const t = this.data.todos.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save(this.data);
  }

  deleteTodo(id: string): boolean {
    const idx = this.data.todos.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.data.todos.splice(idx, 1);
    save(this.data);
    return true;
  }

  commitTodoLayout(
    groups: Array<{ sectionId: string | undefined; todoIds: string[] }>,
    todoSectionIds: string[]
  ): void {
    const byId = new Map(this.data.todos.map((t) => [t.id, t]));
    const next: Todo[] = [];
    const seen = new SvelteSet<string>();
    for (const g of groups) {
      for (const id of g.todoIds) {
        const t = byId.get(id);
        if (!t || seen.has(id)) continue;
        seen.add(id);
        if (g.sectionId) t.sectionId = g.sectionId;
        else delete t.sectionId;
        next.push(t);
      }
    }
    for (const t of this.data.todos) if (!seen.has(t.id)) next.push(t);
    this.data.todos = next;

    const sectionById = new Map(this.data.todoSections.map((s) => [s.id, s]));
    const nextSections: Section[] = [];
    const seenSections = new SvelteSet<string>();
    for (const id of todoSectionIds) {
      const s = sectionById.get(id);
      if (!s || seenSections.has(id)) continue;
      seenSections.add(id);
      nextSections.push(s);
    }
    for (const s of this.data.todoSections) if (!seenSections.has(s.id)) nextSections.push(s);
    this.data.todoSections = nextSections;

    save(this.data);
  }

  addTodoSection(name: string): Section {
    const section: Section = { id: newId(), name: name.trim(), collapsed: false };
    this.data.todoSections.push(section);
    save(this.data);
    return section;
  }

  renameTodoSection(id: string, name: string): boolean {
    const s = this.data.todoSections.find((x) => x.id === id);
    if (!s) return false;
    s.name = name.trim();
    save(this.data);
    return true;
  }

  toggleTodoSectionCollapsed(id: string): void {
    const s = this.data.todoSections.find((x) => x.id === id);
    if (!s) return;
    s.collapsed = !s.collapsed;
    save(this.data);
  }

  deleteTodoSection(id: string): boolean {
    const idx = this.data.todoSections.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.data.todoSections.splice(idx, 1);
    for (const t of this.data.todos) {
      if (t.sectionId === id) delete t.sectionId;
    }
    save(this.data);
    return true;
  }
}

export const store = new HabitStore();
