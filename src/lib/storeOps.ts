import type { Completion, Habit, Section, Todo } from './types';
import { effectiveTarget, isDueOn } from './schedule';

export type TodoGroup = { section: Section; todos: Todo[] };

export function computeDonesByHabit(
  habits: Habit[],
  completions: Completion[]
): Map<string, Set<string>> {
  const byId = new Map<string, Habit>();
  for (const h of habits) byId.set(h.id, h);
  const map = new Map<string, Set<string>>();
  for (const c of completions) {
    if (c.state === 'skipped') continue;
    const habit = byId.get(c.habitId);
    if (!habit) continue;
    if (habit.type === 'counter') {
      const count = c.count ?? 0;
      if (count < effectiveTarget(habit, c.date)) continue;
    }
    let set = map.get(c.habitId);
    if (!set) {
      set = new Set();
      map.set(c.habitId, set);
    }
    set.add(c.date);
  }
  return map;
}

export function computeSkippedByHabit(completions: Completion[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const c of completions) {
    if (c.state !== 'skipped') continue;
    let set = map.get(c.habitId);
    if (!set) {
      set = new Set();
      map.set(c.habitId, set);
    }
    set.add(c.date);
  }
  return map;
}

export function computeDueHabits(habits: Habit[], date: string): Habit[] {
  return habits.filter((h) => isDueOn(h, date) && h.startDate <= date);
}

export function groupHabitsBySection(
  sections: Section[],
  habits: Habit[]
): Array<{ section: Section; habits: Habit[] }> {
  const fallback = sections[0]?.id;
  const validSectionIds = new Set(sections.map((s) => s.id));
  const bySection = new Map<string, Habit[]>();
  for (const s of sections) bySection.set(s.id, []);
  for (const h of habits) {
    const key = validSectionIds.has(h.sectionId) ? h.sectionId : fallback;
    if (key) bySection.get(key)?.push(h);
  }
  return sections.map((s) => ({ section: s, habits: bySection.get(s.id) ?? [] }));
}

export function computeAllStartedHabits(habits: Habit[], date: string): Habit[] {
  return habits.filter((h) => h.startDate <= date);
}

export function computeTodoGroups(todoSections: Section[], todos: Todo[]): TodoGroup[] {
  const fallback = todoSections[0]?.id;
  const validIds = new Set(todoSections.map((s) => s.id));
  const bySection = new Map<string, Todo[]>();
  for (const s of todoSections) bySection.set(s.id, []);
  for (const t of todos) {
    if (t.done) continue;
    const key = validIds.has(t.sectionId) ? t.sectionId : fallback;
    if (key) bySection.get(key)?.push(t);
  }
  return todoSections.map((s) => ({ section: s, todos: bySection.get(s.id) ?? [] }));
}

export function computeDoneCount(
  dueHabits: Habit[],
  donesByHabit: Map<string, Set<string>>,
  date: string
): number {
  return dueHabits.filter((h) => donesByHabit.get(h.id)?.has(date) === true).length;
}

export function computeProgressPct(doneCount: number, totalCount: number): number {
  return totalCount > 0 ? Math.floor((doneCount / totalCount) * 100) : 0;
}

export function sectionProgress(
  sectionHabits: Habit[],
  dueHabitIds: Set<string>,
  donesByHabit: Map<string, Set<string>>,
  skippedByHabit: Map<string, Set<string>>,
  date: string
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const h of sectionHabits) {
    if (!dueHabitIds.has(h.id)) continue;
    if (skippedByHabit.get(h.id)?.has(date)) continue;
    total++;
    if (donesByHabit.get(h.id)?.has(date) === true) done++;
  }
  return { done, total };
}

export function progressForDate(
  habits: Habit[],
  donesByHabit: Map<string, Set<string>>,
  skippedByHabit: Map<string, Set<string>>,
  date: string
): { done: number; total: number } {
  let total = 0;
  let done = 0;
  for (const h of habits) {
    if (!isDueOn(h, date)) continue;
    if (h.startDate > date) continue;
    if (skippedByHabit.get(h.id)?.has(date)) continue;
    total++;
    if (donesByHabit.get(h.id)?.has(date)) done++;
  }
  return { done, total };
}
