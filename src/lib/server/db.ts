import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type {
  AppData,
  Completion,
  CompletionState,
  CounterConfig,
  Habit,
  Section,
  Todo
} from '../types';
import { emptyAppData } from '../types';

const DB_PATH =
  process.env.DATABASE_PATH ||
  join(
    process.env.XDG_DATA_HOME || join(process.env.HOME || '/tmp', '.local', 'share'),
    'habit-tracker',
    'habits.db'
  );

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(SCHEMA);
  const cols = _db.prepare('PRAGMA table_info(completions)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'state')) {
    _db.exec('ALTER TABLE completions ADD COLUMN state TEXT');
  }
  return _db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sections (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  collapsed INTEGER NOT NULL DEFAULT 0,
  position  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habits (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('binary', 'counter')),
  schedule    TEXT NOT NULL,
  start_date  TEXT NOT NULL,
  notes       TEXT,
  section_id  TEXT NOT NULL REFERENCES sections(id),
  counter     TEXT,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS completions (
  habit_id  TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  count     INTEGER,
  state     TEXT,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE IF NOT EXISTS todo_sections (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  collapsed INTEGER NOT NULL DEFAULT 0,
  position  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS todos (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  section_id  TEXT NOT NULL REFERENCES todo_sections(id),
  open_date   TEXT,
  due_date    TEXT,
  position    INTEGER NOT NULL DEFAULT 0
);
`;

// ---------------------------------------------------------------------------
// Row types (what SQLite returns)
// ---------------------------------------------------------------------------

interface SectionRow {
  id: string;
  name: string;
  collapsed: number;
  position: number;
}

interface HabitRow {
  id: string;
  name: string;
  type: string;
  schedule: string;
  start_date: string;
  notes: string | null;
  section_id: string;
  counter: string | null;
  position: number;
}

interface CompletionRow {
  habit_id: string;
  date: string;
  count: number | null;
  state: string | null;
}

interface TodoRow {
  id: string;
  name: string;
  done: number;
  section_id: string;
  open_date: string | null;
  due_date: string | null;
  position: number;
}

// ---------------------------------------------------------------------------
// Row → domain converters
// ---------------------------------------------------------------------------

function toSection(row: SectionRow): Section {
  return { id: row.id, name: row.name, collapsed: row.collapsed === 1 };
}

function toHabit(row: HabitRow): Habit {
  const base = {
    id: row.id,
    name: row.name,
    schedule: JSON.parse(row.schedule),
    startDate: row.start_date,
    sectionId: row.section_id,
    ...(row.notes ? { notes: row.notes } : {})
  };
  if (row.type === 'counter') {
    return { ...base, type: 'counter', counter: JSON.parse(row.counter!) as CounterConfig };
  }
  return { ...base, type: 'binary' };
}

function toCompletion(row: CompletionRow): Completion {
  const c: Completion = { habitId: row.habit_id, date: row.date };
  if (row.count != null) c.count = row.count;
  if (row.state === 'skipped') c.state = 'skipped';
  return c;
}

function toTodo(row: TodoRow): Todo {
  const t: Todo = {
    id: row.id,
    name: row.name,
    done: row.done === 1,
    sectionId: row.section_id
  };
  if (row.open_date) t.openDate = row.open_date;
  if (row.due_date) t.dueDate = row.due_date;
  return t;
}

// ---------------------------------------------------------------------------
// Full load
// ---------------------------------------------------------------------------

export function loadAllData(): AppData {
  const db = getDb();
  const sections = db.prepare('SELECT * FROM sections ORDER BY position').all() as SectionRow[];
  const habits = db.prepare('SELECT * FROM habits ORDER BY position').all() as HabitRow[];
  const completions = db.prepare('SELECT * FROM completions').all() as CompletionRow[];
  const todoSections = db
    .prepare('SELECT * FROM todo_sections ORDER BY position')
    .all() as SectionRow[];
  const todos = db.prepare('SELECT * FROM todos ORDER BY position').all() as TodoRow[];

  return {
    version: 7,
    sections: sections.map(toSection),
    habits: habits.map(toHabit),
    completions: completions.map(toCompletion),
    todoSections: todoSections.map(toSection),
    todos: todos.map(toTodo)
  };
}

export function isEmpty(): boolean {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as n FROM sections').get() as { n: number };
  return row.n === 0;
}

// ---------------------------------------------------------------------------
// Bulk import (transactional replace)
// ---------------------------------------------------------------------------

export function importData(data: AppData): void {
  const db = getDb();
  db.transaction(() => {
    db.exec('DELETE FROM completions');
    db.exec('DELETE FROM habits');
    db.exec('DELETE FROM sections');
    db.exec('DELETE FROM todos');
    db.exec('DELETE FROM todo_sections');

    const insertSection = db.prepare(
      'INSERT INTO sections (id, name, collapsed, position) VALUES (?, ?, ?, ?)'
    );
    for (let i = 0; i < data.sections.length; i++) {
      const s = data.sections[i];
      insertSection.run(s.id, s.name, s.collapsed ? 1 : 0, i);
    }

    const insertHabit = db.prepare(
      'INSERT INTO habits (id, name, type, schedule, start_date, notes, section_id, counter, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (let i = 0; i < data.habits.length; i++) {
      const h = data.habits[i];
      insertHabit.run(
        h.id,
        h.name,
        h.type,
        JSON.stringify(h.schedule),
        h.startDate,
        h.notes || null,
        h.sectionId,
        h.type === 'counter' ? JSON.stringify(h.counter) : null,
        i
      );
    }

    const insertCompletion = db.prepare(
      'INSERT INTO completions (habit_id, date, count, state) VALUES (?, ?, ?, ?)'
    );
    for (const c of data.completions) {
      insertCompletion.run(c.habitId, c.date, c.count ?? null, c.state ?? null);
    }

    const insertTodoSection = db.prepare(
      'INSERT INTO todo_sections (id, name, collapsed, position) VALUES (?, ?, ?, ?)'
    );
    for (let i = 0; i < data.todoSections.length; i++) {
      const s = data.todoSections[i];
      insertTodoSection.run(s.id, s.name, s.collapsed ? 1 : 0, i);
    }

    const insertTodo = db.prepare(
      'INSERT INTO todos (id, name, done, section_id, open_date, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (let i = 0; i < data.todos.length; i++) {
      const t = data.todos[i];
      insertTodo.run(
        t.id,
        t.name,
        t.done ? 1 : 0,
        t.sectionId,
        t.openDate || null,
        t.dueDate || null,
        i
      );
    }
  })();
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export function insertSection(section: Section): void {
  const db = getDb();
  const maxPos = (
    db.prepare('SELECT COALESCE(MAX(position), -1) as m FROM sections').get() as { m: number }
  ).m;
  db.prepare('INSERT INTO sections (id, name, collapsed, position) VALUES (?, ?, ?, ?)').run(
    section.id,
    section.name,
    section.collapsed ? 1 : 0,
    maxPos + 1
  );
}

export function updateSection(id: string, patch: { name?: string; collapsed?: boolean }): boolean {
  const db = getDb();
  const parts: string[] = [];
  const params: (string | number)[] = [];
  if (patch.name !== undefined) {
    parts.push('name = ?');
    params.push(patch.name);
  }
  if (patch.collapsed !== undefined) {
    parts.push('collapsed = ?');
    params.push(patch.collapsed ? 1 : 0);
  }
  if (parts.length === 0) return false;
  params.push(id);
  const result = db.prepare(`UPDATE sections SET ${parts.join(', ')} WHERE id = ?`).run(...params);
  return result.changes > 0;
}

export function deleteSection(id: string): string | null {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as n FROM sections').get() as { n: number }).n;
  if (count <= 1) return null;
  const fallback = (
    db.prepare('SELECT id FROM sections WHERE id != ? ORDER BY position LIMIT 1').get(id) as {
      id: string;
    }
  ).id;
  db.transaction(() => {
    db.prepare('UPDATE habits SET section_id = ? WHERE section_id = ?').run(fallback, id);
    db.prepare('DELETE FROM sections WHERE id = ?').run(id);
  })();
  return fallback;
}

export function reorderSections(ids: string[]): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE sections SET position = ? WHERE id = ?');
  db.transaction(() => {
    for (let i = 0; i < ids.length; i++) {
      stmt.run(i, ids[i]);
    }
  })();
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export function insertHabit(habit: Habit): void {
  const db = getDb();
  const maxPos = (
    db.prepare('SELECT COALESCE(MAX(position), -1) as m FROM habits').get() as { m: number }
  ).m;
  db.prepare(
    'INSERT INTO habits (id, name, type, schedule, start_date, notes, section_id, counter, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    habit.id,
    habit.name,
    habit.type,
    JSON.stringify(habit.schedule),
    habit.startDate,
    habit.notes || null,
    habit.sectionId,
    habit.type === 'counter' ? JSON.stringify(habit.counter) : null,
    maxPos + 1
  );
}

export function updateHabit(
  id: string,
  patch: {
    name?: string;
    schedule?: Habit['schedule'];
    startDate?: string;
    notes?: string;
    counter?: CounterConfig;
  }
): boolean {
  const db = getDb();
  db.transaction(() => {
    const parts: string[] = [];
    const params: (string | number | null)[] = [];
    if (patch.name !== undefined) {
      parts.push('name = ?');
      params.push(patch.name);
    }
    if (patch.schedule !== undefined) {
      parts.push('schedule = ?');
      params.push(JSON.stringify(patch.schedule));
    }
    if (patch.startDate !== undefined) {
      parts.push('start_date = ?');
      params.push(patch.startDate);
      db.prepare('DELETE FROM completions WHERE habit_id = ? AND date < ?').run(
        id,
        patch.startDate
      );
    }
    if (patch.notes !== undefined) {
      parts.push('notes = ?');
      params.push(patch.notes.trim() || null);
    }
    if (patch.counter !== undefined) {
      parts.push('counter = ?');
      params.push(JSON.stringify(patch.counter));
    }
    if (parts.length > 0) {
      params.push(id);
      db.prepare(`UPDATE habits SET ${parts.join(', ')} WHERE id = ?`).run(...params);
    }
  })();
  return true;
}

export function deleteHabit(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM habits WHERE id = ?').run(id);
  return result.changes > 0;
}

export function commitHabitLayout(groups: Array<{ sectionId: string; habitIds: string[] }>): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE habits SET section_id = ?, position = ? WHERE id = ?');
  let pos = 0;
  db.transaction(() => {
    for (const g of groups) {
      for (const id of g.habitIds) {
        stmt.run(g.sectionId, pos++, id);
      }
    }
  })();
}

// ---------------------------------------------------------------------------
// Completions
// ---------------------------------------------------------------------------

export function toggleCompletion(habitId: string, date: string): boolean {
  const db = getDb();
  const existing = db
    .prepare('SELECT 1 FROM completions WHERE habit_id = ? AND date = ?')
    .get(habitId, date);
  if (existing) {
    db.prepare('DELETE FROM completions WHERE habit_id = ? AND date = ?').run(habitId, date);
    return false;
  } else {
    db.prepare('INSERT INTO completions (habit_id, date) VALUES (?, ?)').run(habitId, date);
    return true;
  }
}

export function setCount(habitId: string, date: string, count: number): void {
  const db = getDb();
  if (count <= 0) {
    // Preserve a 'skipped' row even when count zeroes out.
    db.transaction(() => {
      db.prepare('UPDATE completions SET count = NULL WHERE habit_id = ? AND date = ?').run(
        habitId,
        date
      );
      db.prepare(
        'DELETE FROM completions WHERE habit_id = ? AND date = ? AND count IS NULL AND state IS NULL'
      ).run(habitId, date);
    })();
  } else {
    db.prepare(
      'INSERT INTO completions (habit_id, date, count) VALUES (?, ?, ?) ON CONFLICT(habit_id, date) DO UPDATE SET count = ?'
    ).run(habitId, date, count, count);
  }
}

export function setState(habitId: string, date: string, state: CompletionState | null): void {
  const db = getDb();
  if (state === 'skipped') {
    db.prepare(
      `INSERT INTO completions (habit_id, date, state) VALUES (?, ?, 'skipped')
       ON CONFLICT(habit_id, date) DO UPDATE SET state = 'skipped'`
    ).run(habitId, date);
  } else {
    db.prepare('UPDATE completions SET state = NULL WHERE habit_id = ? AND date = ?').run(
      habitId,
      date
    );
  }
}

export function deleteCompletion(habitId: string, date: string): void {
  const db = getDb();
  db.prepare('DELETE FROM completions WHERE habit_id = ? AND date = ?').run(habitId, date);
}

// ---------------------------------------------------------------------------
// Todo Sections
// ---------------------------------------------------------------------------

export function insertTodoSection(section: Section): void {
  const db = getDb();
  const maxPos = (
    db.prepare('SELECT COALESCE(MAX(position), -1) as m FROM todo_sections').get() as {
      m: number;
    }
  ).m;
  db.prepare('INSERT INTO todo_sections (id, name, collapsed, position) VALUES (?, ?, ?, ?)').run(
    section.id,
    section.name,
    section.collapsed ? 1 : 0,
    maxPos + 1
  );
}

export function updateTodoSection(
  id: string,
  patch: { name?: string; collapsed?: boolean }
): boolean {
  const db = getDb();
  const parts: string[] = [];
  const params: (string | number)[] = [];
  if (patch.name !== undefined) {
    parts.push('name = ?');
    params.push(patch.name);
  }
  if (patch.collapsed !== undefined) {
    parts.push('collapsed = ?');
    params.push(patch.collapsed ? 1 : 0);
  }
  if (parts.length === 0) return false;
  params.push(id);
  const result = db
    .prepare(`UPDATE todo_sections SET ${parts.join(', ')} WHERE id = ?`)
    .run(...params);
  return result.changes > 0;
}

export function deleteTodoSection(id: string): string | null {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as n FROM todo_sections').get() as { n: number }).n;
  if (count <= 1) return null;
  const fallback = (
    db.prepare('SELECT id FROM todo_sections WHERE id != ? ORDER BY position LIMIT 1').get(id) as {
      id: string;
    }
  ).id;
  db.transaction(() => {
    db.prepare('UPDATE todos SET section_id = ? WHERE section_id = ?').run(fallback, id);
    db.prepare('DELETE FROM todo_sections WHERE id = ?').run(id);
  })();
  return fallback;
}

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------

export function insertTodo(todo: Todo): void {
  const db = getDb();
  const maxPos = (
    db.prepare('SELECT COALESCE(MAX(position), -1) as m FROM todos').get() as { m: number }
  ).m;
  db.prepare(
    'INSERT INTO todos (id, name, done, section_id, open_date, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    todo.id,
    todo.name,
    todo.done ? 1 : 0,
    todo.sectionId,
    todo.openDate || null,
    todo.dueDate || null,
    maxPos + 1
  );
}

export function updateTodo(
  id: string,
  patch: {
    name?: string;
    sectionId?: string;
    openDate?: string | null;
    dueDate?: string | null;
    done?: boolean;
  }
): boolean {
  const db = getDb();
  const parts: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    parts.push('name = ?');
    params.push(patch.name);
  }
  if (patch.sectionId !== undefined) {
    parts.push('section_id = ?');
    params.push(patch.sectionId);
  }
  if ('openDate' in patch) {
    parts.push('open_date = ?');
    params.push(patch.openDate || null);
  }
  if ('dueDate' in patch) {
    parts.push('due_date = ?');
    params.push(patch.dueDate || null);
  }
  if (patch.done !== undefined) {
    parts.push('done = ?');
    params.push(patch.done ? 1 : 0);
  }
  if (parts.length === 0) return false;
  params.push(id);
  const result = db.prepare(`UPDATE todos SET ${parts.join(', ')} WHERE id = ?`).run(...params);
  return result.changes > 0;
}

export function deleteTodo(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return result.changes > 0;
}

export function commitTodoLayout(
  groups: Array<{ sectionId: string; todoIds: string[] }>,
  todoSectionIds: string[]
): void {
  const db = getDb();
  db.transaction(() => {
    const todoStmt = db.prepare('UPDATE todos SET section_id = ?, position = ? WHERE id = ?');
    let pos = 0;
    for (const g of groups) {
      for (const id of g.todoIds) {
        todoStmt.run(g.sectionId, pos++, id);
      }
    }
    const sectionStmt = db.prepare('UPDATE todo_sections SET position = ? WHERE id = ?');
    for (let i = 0; i < todoSectionIds.length; i++) {
      sectionStmt.run(i, todoSectionIds[i]);
    }
  })();
}

// ---------------------------------------------------------------------------
// Data management
// ---------------------------------------------------------------------------

export function clearHistoryBefore(dateCutoff: string): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM completions WHERE date < ?').run(dateCutoff);
    db.prepare('UPDATE habits SET start_date = ? WHERE start_date < ?').run(dateCutoff, dateCutoff);
  })();
}

export function resetAll(): void {
  const db = getDb();
  db.transaction(() => {
    db.exec('DELETE FROM completions');
    db.exec('DELETE FROM habits');
    db.exec('DELETE FROM sections');
    db.exec('DELETE FROM todos');
    db.exec('DELETE FROM todo_sections');
    const empty = emptyAppData();
    const insertSection = db.prepare(
      'INSERT INTO sections (id, name, collapsed, position) VALUES (?, ?, ?, ?)'
    );
    for (let i = 0; i < empty.sections.length; i++) {
      const s = empty.sections[i];
      insertSection.run(s.id, s.name, s.collapsed ? 1 : 0, i);
    }
    const insertTodoSection = db.prepare(
      'INSERT INTO todo_sections (id, name, collapsed, position) VALUES (?, ?, ?, ?)'
    );
    for (let i = 0; i < empty.todoSections.length; i++) {
      const s = empty.todoSections[i];
      insertTodoSection.run(s.id, s.name, s.collapsed ? 1 : 0, i);
    }
  })();
}
