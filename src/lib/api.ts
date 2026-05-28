import type { AppData, CompletionState, Habit, Section, Todo, CounterConfig } from './types';

async function call(url: string, method: string, body?: unknown): Promise<Response> {
  const res = await fetch(url, {
    method,
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text);
  }
  return res;
}

export async function fetchAllData(): Promise<AppData> {
  const res = await call('/api/data', 'GET');
  return res.json();
}

export async function apiResetAll(): Promise<void> {
  await call('/api/data', 'DELETE');
}

export async function apiImportData(data: AppData): Promise<void> {
  await call('/api/data/import', 'POST', data);
}

export async function apiClearHistoryBefore(dateCutoff: string): Promise<void> {
  await call('/api/data/history', 'DELETE', { dateCutoff });
}

// Habits

export async function apiCreateHabit(habit: Habit): Promise<void> {
  await call('/api/habits', 'POST', habit);
}

export async function apiUpdateHabit(
  id: string,
  patch: {
    name?: string;
    schedule?: Habit['schedule'];
    startDate?: string;
    notes?: string;
    counter?: CounterConfig;
  }
): Promise<void> {
  await call(`/api/habits/${id}`, 'PATCH', patch);
}

export async function apiDeleteHabit(id: string): Promise<void> {
  await call(`/api/habits/${id}`, 'DELETE');
}

export async function apiCommitHabitLayout(
  groups: Array<{ sectionId: string; habitIds: string[] }>
): Promise<void> {
  await call('/api/habits/layout', 'PUT', { groups });
}

// Completions

export async function apiToggleCompletion(habitId: string, date: string): Promise<void> {
  await call('/api/completions', 'POST', { habitId, date });
}

export async function apiSetCount(habitId: string, date: string, count: number): Promise<void> {
  await call('/api/completions', 'POST', { habitId, date, count });
}

export async function apiSetState(
  habitId: string,
  date: string,
  state: CompletionState | null
): Promise<void> {
  await call('/api/completions', 'POST', { habitId, date, state });
}

export async function apiDeleteCompletion(habitId: string, date: string): Promise<void> {
  await call('/api/completions', 'POST', { habitId, date, delete: true });
}

// Sections

export async function apiCreateSection(section: Section): Promise<void> {
  await call('/api/sections', 'POST', section);
}

export async function apiUpdateSection(
  id: string,
  patch: { name?: string; collapsed?: boolean }
): Promise<void> {
  await call(`/api/sections/${id}`, 'PATCH', patch);
}

export async function apiDeleteSection(id: string): Promise<void> {
  await call(`/api/sections/${id}`, 'DELETE');
}

export async function apiReorderSections(ids: string[]): Promise<void> {
  await call('/api/sections/order', 'PUT', { ids });
}

// Todos

export async function apiCreateTodo(todo: Todo): Promise<void> {
  await call('/api/todos', 'POST', todo);
}

export async function apiUpdateTodo(
  id: string,
  patch: {
    name?: string;
    sectionId?: string;
    openDate?: string | null;
    dueDate?: string | null;
    done?: boolean;
  }
): Promise<void> {
  await call(`/api/todos/${id}`, 'PATCH', patch);
}

export async function apiDeleteTodo(id: string): Promise<void> {
  await call(`/api/todos/${id}`, 'DELETE');
}

export async function apiCommitTodoLayout(
  groups: Array<{ sectionId: string; todoIds: string[] }>,
  todoSectionIds: string[]
): Promise<void> {
  await call('/api/todos/layout', 'PUT', { groups, todoSectionIds });
}

// Todo Sections

export async function apiCreateTodoSection(section: Section): Promise<void> {
  await call('/api/todo-sections', 'POST', section);
}

export async function apiUpdateTodoSection(
  id: string,
  patch: { name?: string; collapsed?: boolean }
): Promise<void> {
  await call(`/api/todo-sections/${id}`, 'PATCH', patch);
}

export async function apiDeleteTodoSection(id: string): Promise<void> {
  await call(`/api/todo-sections/${id}`, 'DELETE');
}
