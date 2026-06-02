import { SvelteSet } from 'svelte/reactivity';
import type {
  AppData,
  Completion,
  CompletionState,
  CounterConfig,
  DayOfWeek,
  Habit,
  Section,
  Todo
} from './types';
import { emptyAppData } from './types';
import { newId } from './ids';
import { effectiveTarget, isLimit, normalizeDays } from './schedule';
import { selectedDate } from './selectedDate.svelte';
import { STORAGE_KEY, migrate } from './storage';
import {
  computeDonesByHabit,
  computeSkippedByHabit,
  computeFailedByHabit,
  computeAutoFailable,
  computeDueHabits,
  groupHabitsBySection,
  computeAllStartedHabits,
  computeTodoGroups,
  computeProgressPct,
  sectionProgress,
  progressForDate
} from './storeOps';
import {
  fetchAllData,
  apiCreateHabit,
  apiUpdateHabit,
  apiDeleteHabit,
  apiCommitHabitLayout,
  apiToggleCompletion,
  apiSetCount,
  apiSetState,
  apiBulkSetState,
  apiSetTargetOverride,
  apiUpdateSettings,
  apiDeleteCompletion,
  apiCreateSection,
  apiUpdateSection,
  apiDeleteSection,
  apiReorderSections,
  apiCreateTodo,
  apiUpdateTodo,
  apiDeleteTodo,
  apiCommitTodoLayout,
  apiCreateTodoSection,
  apiUpdateTodoSection,
  apiDeleteTodoSection,
  apiImportData,
  apiResetAll,
  apiClearHistoryBefore
} from './api';
export type { TodoGroup } from './storeOps';

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
  ready = $state(false);
  syncError = $state<string | null>(null);

  donesByHabit = $derived.by(() => computeDonesByHabit(this.data.habits, this.data.completions));

  skippedByHabit = $derived.by(() => computeSkippedByHabit(this.data.completions));

  failedByHabit = $derived.by(() => computeFailedByHabit(this.data.habits, this.data.completions));

  dueHabits = $derived.by(() => computeDueHabits(this.data.habits, selectedDate.value));

  dueGroups = $derived.by(() => groupHabitsBySection(this.data.sections, this.dueHabits));

  allStartedHabits = $derived.by(() =>
    computeAllStartedHabits(this.data.habits, selectedDate.value)
  );

  dueHabitIds = $derived(new Set(this.dueHabits.map((h) => h.id)));

  allStartedGroups = $derived.by(() =>
    groupHabitsBySection(this.data.sections, this.allStartedHabits)
  );

  extraHabitCount = $derived(this.allStartedHabits.length - this.dueHabits.length);

  todoGroups = $derived.by(() => computeTodoGroups(this.data.todoSections, this.data.todos));

  dailyProgress = $derived.by(() =>
    progressForDate(this.data.habits, this.donesByHabit, this.skippedByHabit, selectedDate.value)
  );

  doneCount = $derived(this.dailyProgress.done);

  totalCount = $derived(this.dailyProgress.total);

  progressPct = $derived(computeProgressPct(this.doneCount, this.totalCount));

  hasAnyHabit = $derived(this.data.habits.length > 0);

  private handleError = (e: unknown): void => {
    console.error('Sync error:', e);
    this.syncError = e instanceof Error ? e.message : 'Sync failed';
  };

  dismissSyncError(): void {
    this.syncError = null;
  }

  async init(): Promise<void> {
    try {
      const serverData = await fetchAllData();
      // If server DB is empty, check localStorage for migration
      if (
        serverData.habits.length === 0 &&
        serverData.todos.length === 0 &&
        typeof localStorage !== 'undefined'
      ) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const migrated = migrate(JSON.parse(raw));
            if (migrated) {
              await apiImportData(migrated);
              this.data = migrated;
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem('habit-tracker:backup');
              this.ready = true;
              return;
            }
          } catch {
            // Fall through to use server data
          }
        }
      }
      this.data = serverData;
      this.ready = true;
    } catch (e) {
      console.error('Failed to load from server:', e);
      this.syncError = 'Failed to connect to server';
    }
  }

  replaceAll(next: AppData): void {
    this.data = next;
    apiImportData(next).catch(this.handleError);
  }

  addHabit(input: NewHabitInput & { sectionId?: string }): Habit {
    const trimmedNotes = input.notes?.trim();
    const base = {
      id: newId(),
      name: input.name.trim(),
      schedule: { type: 'weekly_days' as const, days: normalizeDays(input.days) },
      startDate: input.startDate,
      sectionId: input.sectionId || this.data.sections[0].id,
      ...(trimmedNotes ? { notes: trimmedNotes } : {})
    };
    const habit: Habit =
      input.type === 'counter'
        ? { ...base, type: 'counter', counter: input.counter }
        : { ...base, type: 'binary' };
    this.data.habits.push(habit);
    apiCreateHabit(habit).catch(this.handleError);
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
    apiUpdateHabit(id, patch).catch(this.handleError);
    return true;
  }

  completionsBefore(habitId: string, dateExclusive: string): number {
    let count = 0;
    for (const c of this.data.completions) {
      if (c.habitId === habitId && c.date < dateExclusive) count++;
    }
    return count;
  }

  commitLayout(groups: Array<{ sectionId: string; habitIds: string[] }>): void {
    const byId = new Map(this.data.habits.map((h) => [h.id, h]));
    const next: Habit[] = [];
    const seen = new SvelteSet<string>();
    for (const g of groups) {
      for (const id of g.habitIds) {
        const h = byId.get(id);
        if (!h || seen.has(id)) continue;
        seen.add(id);
        h.sectionId = g.sectionId;
        next.push(h);
      }
    }
    for (const h of this.data.habits) if (!seen.has(h.id)) next.push(h);
    this.data.habits = next;
    apiCommitHabitLayout(groups).catch(this.handleError);
  }

  addSection(name: string): Section {
    const section: Section = { id: newId(), name: name.trim(), collapsed: false };
    this.data.sections.push(section);
    apiCreateSection(section).catch(this.handleError);
    return section;
  }

  renameSection(id: string, name: string): boolean {
    const s = this.data.sections.find((x) => x.id === id);
    if (!s) return false;
    s.name = name.trim();
    apiUpdateSection(id, { name: s.name }).catch(this.handleError);
    return true;
  }

  toggleSectionCollapsed(id: string): void {
    const s = this.data.sections.find((x) => x.id === id);
    if (!s) return;
    s.collapsed = !s.collapsed;
    apiUpdateSection(id, { collapsed: s.collapsed }).catch(this.handleError);
  }

  deleteSection(id: string): boolean {
    if (this.data.sections.length <= 1) return false;
    const idx = this.data.sections.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.data.sections.splice(idx, 1);
    const fallback = this.data.sections[0].id;
    for (const h of this.data.habits) {
      if (h.sectionId === id) h.sectionId = fallback;
    }
    apiDeleteSection(id).catch(this.handleError);
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
    apiReorderSections(newIds).catch(this.handleError);
  }

  clearHistoryBefore(dateCutoff: string): void {
    this.data.completions = this.data.completions.filter((c) => c.date >= dateCutoff);
    for (const h of this.data.habits) {
      if (h.startDate < dateCutoff) h.startDate = dateCutoff;
    }
    apiClearHistoryBefore(dateCutoff).catch(this.handleError);
  }

  deleteHabit(id: string): boolean {
    const idx = this.data.habits.findIndex((h) => h.id === id);
    if (idx === -1) return false;
    this.data.habits.splice(idx, 1);
    this.data.completions = this.data.completions.filter((c) => c.habitId !== id);
    apiDeleteHabit(id).catch(this.handleError);
    return true;
  }

  toggleCompletion(habitId: string, date: string): void {
    const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
    if (idx === -1) {
      this.data.completions.push({ habitId, date });
    } else {
      this.data.completions.splice(idx, 1);
    }
    apiToggleCompletion(habitId, date).catch(this.handleError);
  }

  setCount(habitId: string, date: string, count: number): void {
    if (count < 0) count = 0;
    const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
    const existing = idx !== -1 ? this.data.completions[idx] : undefined;
    const priorState = existing?.state;
    const priorOverride = existing?.targetOverride;
    const habit = this.data.habits.find((h) => h.id === habitId);
    const target = habit?.type === 'counter' ? effectiveTarget(habit, date, priorOverride) : 0;
    // Logging up to the target on a skipped/failed day clears that state (it's done now).
    // Not for Limit habits, where reaching/exceeding the target is a breach, not a completion.
    const shouldClearState =
      !(habit && isLimit(habit)) && priorState != null && target > 0 && count >= target;

    if (count === 0) {
      if (existing) {
        const preserved: Completion = { habitId, date };
        if (priorState) preserved.state = priorState;
        if (priorOverride != null) preserved.targetOverride = priorOverride;
        if (preserved.state || preserved.targetOverride != null) {
          this.data.completions[idx] = preserved;
        } else {
          this.data.completions.splice(idx, 1);
        }
      }
    } else {
      const next: Completion = { habitId, date, count };
      if (priorState && !shouldClearState) next.state = priorState;
      if (priorOverride != null) next.targetOverride = priorOverride;
      if (existing) this.data.completions[idx] = next;
      else this.data.completions.push(next);
    }

    apiSetCount(habitId, date, count).catch(this.handleError);
    if (shouldClearState) {
      apiSetState(habitId, date, null).catch(this.handleError);
    }
  }

  getCount(habitId: string, date: string): number {
    const c = this.data.completions.find((x) => x.habitId === habitId && x.date === date);
    return c?.count ?? 0;
  }

  getTargetOverride(habitId: string, date: string): number | undefined {
    const c = this.data.completions.find((x) => x.habitId === habitId && x.date === date);
    return c?.targetOverride;
  }

  setTargetOverride(habitId: string, date: string, override: number | null): void {
    const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
    if (override == null) {
      if (idx === -1) return;
      const existing = this.data.completions[idx];
      if (existing.targetOverride == null) return;
      const next: Completion = { ...existing };
      delete next.targetOverride;
      if (next.count == null && next.state == null) {
        this.data.completions.splice(idx, 1);
      } else {
        this.data.completions[idx] = next;
      }
    } else {
      if (idx === -1) {
        this.data.completions.push({ habitId, date, targetOverride: override });
      } else {
        this.data.completions[idx] = { ...this.data.completions[idx], targetOverride: override };
      }
    }
    apiSetTargetOverride(habitId, date, override).catch(this.handleError);
  }

  isDone(habitId: string, date: string): boolean {
    return this.donesByHabit.get(habitId)?.has(date) === true;
  }

  isSkipped(habitId: string, date: string): boolean {
    return this.skippedByHabit.get(habitId)?.has(date) === true;
  }

  isFailed(habitId: string, date: string): boolean {
    return this.failedByHabit.get(habitId)?.has(date) === true;
  }

  // Stamp a completion row with a state ('skipped' | 'failed'), creating the row
  // if needed and preserving any existing count/targetOverride.
  private writeState(habitId: string, date: string, state: CompletionState): void {
    const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
    if (idx === -1) {
      this.data.completions.push({ habitId, date, state });
    } else {
      this.data.completions[idx] = { ...this.data.completions[idx], state };
    }
    apiSetState(habitId, date, state).catch(this.handleError);
  }

  private clearState(habitId: string, date: string): void {
    const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
    if (idx === -1 || this.data.completions[idx].state == null) return;
    const next: Completion = { ...this.data.completions[idx] };
    delete next.state;
    this.data.completions[idx] = next;
    apiSetState(habitId, date, null).catch(this.handleError);
  }

  setSkipped(habitId: string, date: string): void {
    this.writeState(habitId, date, 'skipped');
  }

  clearSkipped(habitId: string, date: string): void {
    this.clearState(habitId, date);
  }

  deleteCompletion(habitId: string, date: string): void {
    const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
    if (idx !== -1) this.data.completions.splice(idx, 1);
    apiDeleteCompletion(habitId, date).catch(this.handleError);
  }

  setCompletionState(
    habitId: string,
    date: string,
    next: 'incomplete' | 'complete' | 'skipped' | 'failed'
  ): void {
    const habit = this.data.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const limit = isLimit(habit);
    const hadState = this.isSkipped(habitId, date) || this.isFailed(habitId, date);
    const wasDone = this.isDone(habitId, date);

    if (next === 'skipped' || next === 'failed') {
      this.writeState(habitId, date, next);
      return;
    }

    if (next === 'incomplete') {
      // A Limit day keeps its logged count (a breach then recomputes); just drop any state.
      if (limit) {
        this.clearState(habitId, date);
        return;
      }
      const exists = this.data.completions.some((c) => c.habitId === habitId && c.date === date);
      if (exists) this.deleteCompletion(habitId, date);
      return;
    }

    // next === 'complete'
    if (limit) {
      // A Limit day turns green only via an explicit 'done' state; this also overrides a breach.
      this.writeState(habitId, date, 'done');
      return;
    }
    if (habit.type === 'binary') {
      if (hadState) {
        this.clearState(habitId, date);
        // For binary habits, the row remaining after clearing the state already represents "complete".
      } else if (!wasDone) {
        this.toggleCompletion(habitId, date);
      }
    } else {
      const t = effectiveTarget(habit, date, this.getTargetOverride(habitId, date));
      if (hadState) this.clearState(habitId, date);
      if (this.getCount(habitId, date) < t) this.setCount(habitId, date, t);
    }
  }

  setAutoFail(patch: { enabled?: boolean; graceDays?: number }): void {
    const af = this.data.settings.autoFail;
    if (patch.enabled !== undefined) af.enabled = patch.enabled;
    if (patch.graceDays !== undefined) af.graceDays = patch.graceDays;
    apiUpdateSettings(patch).catch(this.handleError);
  }

  // Flip still-Incomplete scheduled days that have fallen past the grace window to
  // Failed. Idempotent — runs on load and on each midnight rollover. Batches the
  // write into a single request rather than one call per day.
  runAutoFailSweep(today: string): void {
    const { enabled, graceDays } = this.data.settings.autoFail;
    if (!enabled) return;
    const targets = computeAutoFailable(
      this.data.habits,
      this.donesByHabit,
      this.skippedByHabit,
      this.failedByHabit,
      today,
      graceDays
    );
    if (targets.length === 0) return;

    for (const { habitId, date } of targets) {
      const idx = this.data.completions.findIndex((c) => c.habitId === habitId && c.date === date);
      if (idx === -1) {
        this.data.completions.push({ habitId, date, state: 'failed' });
      } else {
        this.data.completions[idx] = { ...this.data.completions[idx], state: 'failed' };
      }
    }
    apiBulkSetState(targets.map((t) => ({ ...t, state: 'failed' as const }))).catch(
      this.handleError
    );
  }

  progressForDate(date: string): { done: number; total: number } {
    return progressForDate(this.data.habits, this.donesByHabit, this.skippedByHabit, date);
  }

  sectionProgressFor(habits: Habit[]): { done: number; total: number } {
    return sectionProgress(
      habits,
      this.dueHabitIds,
      this.donesByHabit,
      this.skippedByHabit,
      selectedDate.value
    );
  }

  addTodo(input: { name: string; sectionId?: string; openDate?: string; dueDate?: string }): Todo {
    const todo: Todo = {
      id: newId(),
      name: input.name.trim(),
      done: false,
      sectionId: input.sectionId || this.data.todoSections[0].id,
      ...(input.openDate ? { openDate: input.openDate } : {}),
      ...(input.dueDate ? { dueDate: input.dueDate } : {})
    };
    this.data.todos.push(todo);
    apiCreateTodo(todo).catch(this.handleError);
    return todo;
  }

  updateTodo(
    id: string,
    patch: Partial<Pick<Todo, 'name' | 'sectionId' | 'openDate' | 'dueDate'>>
  ): boolean {
    const t = this.data.todos.find((x) => x.id === id);
    if (!t) return false;
    if (patch.name !== undefined) t.name = patch.name.trim();
    if (patch.sectionId) t.sectionId = patch.sectionId;
    if ('openDate' in patch) {
      if (patch.openDate) t.openDate = patch.openDate;
      else delete t.openDate;
    }
    if ('dueDate' in patch) {
      if (patch.dueDate) t.dueDate = patch.dueDate;
      else delete t.dueDate;
    }
    apiUpdateTodo(id, {
      name: patch.name,
      sectionId: patch.sectionId,
      ...('openDate' in patch ? { openDate: patch.openDate || null } : {}),
      ...('dueDate' in patch ? { dueDate: patch.dueDate || null } : {})
    }).catch(this.handleError);
    return true;
  }

  toggleTodo(id: string): void {
    const t = this.data.todos.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    apiUpdateTodo(id, { done: t.done }).catch(this.handleError);
  }

  deleteTodo(id: string): boolean {
    const idx = this.data.todos.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.data.todos.splice(idx, 1);
    apiDeleteTodo(id).catch(this.handleError);
    return true;
  }

  commitTodoLayout(
    groups: Array<{ sectionId: string; todoIds: string[] }>,
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
        t.sectionId = g.sectionId;
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

    apiCommitTodoLayout(groups, todoSectionIds).catch(this.handleError);
  }

  addTodoSection(name: string): Section {
    const section: Section = { id: newId(), name: name.trim(), collapsed: false };
    this.data.todoSections.push(section);
    apiCreateTodoSection(section).catch(this.handleError);
    return section;
  }

  renameTodoSection(id: string, name: string): boolean {
    const s = this.data.todoSections.find((x) => x.id === id);
    if (!s) return false;
    s.name = name.trim();
    apiUpdateTodoSection(id, { name: s.name }).catch(this.handleError);
    return true;
  }

  toggleTodoSectionCollapsed(id: string): void {
    const s = this.data.todoSections.find((x) => x.id === id);
    if (!s) return;
    s.collapsed = !s.collapsed;
    apiUpdateTodoSection(id, { collapsed: s.collapsed }).catch(this.handleError);
  }

  deleteTodoSection(id: string): boolean {
    if (this.data.todoSections.length <= 1) return false;
    const idx = this.data.todoSections.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.data.todoSections.splice(idx, 1);
    const fallback = this.data.todoSections[0].id;
    for (const t of this.data.todos) {
      if (t.sectionId === id) t.sectionId = fallback;
    }
    apiDeleteTodoSection(id).catch(this.handleError);
    return true;
  }

  async resetAll(): Promise<void> {
    await apiResetAll();
    const fresh = await fetchAllData();
    this.data = fresh;
  }
}

export const store = new HabitStore();
