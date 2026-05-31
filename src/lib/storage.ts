import type {
  AppData,
  AppSettings,
  Completion,
  CounterConfig,
  DayOfWeek,
  Habit,
  Schedule,
  Section,
  Todo
} from './types';
import { defaultSettings, emptyAppData } from './types';

export const STORAGE_KEY = 'habit-tracker:v1';
export const BACKUP_KEY = 'habit-tracker:backup';
export const CURRENT_VERSION = 8 as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isDayOfWeek(n: unknown): n is DayOfWeek {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6;
}

function isSchedule(s: unknown): s is Schedule {
  if (!isPlainObject(s)) return false;
  if (s.type !== 'weekly_days') return false;
  if (!Array.isArray(s.days)) return false;
  return s.days.every(isDayOfWeek);
}

function isCounterConfig(c: unknown): c is CounterConfig {
  if (!isPlainObject(c)) return false;
  if (typeof c.target !== 'number' || !Number.isFinite(c.target) || c.target <= 0) return false;
  if (typeof c.step !== 'number' || !Number.isFinite(c.step) || c.step <= 0) return false;
  if (typeof c.unit !== 'string') return false;
  if ('perDayTargets' in c && c.perDayTargets !== undefined) {
    if (!isPlainObject(c.perDayTargets)) return false;
    for (const [k, v] of Object.entries(c.perDayTargets)) {
      const day = Number(k);
      if (!Number.isInteger(day) || day < 0 || day > 6) return false;
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return false;
    }
  }
  return true;
}

function isHabit(h: unknown): h is Habit {
  if (!isPlainObject(h)) return false;
  if (typeof h.id !== 'string' || h.id.length === 0) return false;
  if (typeof h.name !== 'string') return false;
  if (typeof h.startDate !== 'string' || !ISO_DATE_RE.test(h.startDate)) return false;
  if (!isSchedule(h.schedule)) return false;
  if (h.type !== 'binary' && h.type !== 'counter') return false;
  if (h.type === 'counter' && !isCounterConfig(h.counter)) return false;
  if ('notes' in h && h.notes !== undefined && typeof h.notes !== 'string') return false;
  if ('sectionId' in h && h.sectionId !== undefined && typeof h.sectionId !== 'string')
    return false;
  return true;
}

function isSection(s: unknown): s is Section {
  if (!isPlainObject(s)) return false;
  if (typeof s.id !== 'string' || s.id.length === 0) return false;
  if (typeof s.name !== 'string') return false;
  if (typeof s.collapsed !== 'boolean') return false;
  return true;
}

function isCompletion(c: unknown): c is Completion {
  if (!isPlainObject(c)) return false;
  if (typeof c.habitId !== 'string') return false;
  if (typeof c.date !== 'string' || !ISO_DATE_RE.test(c.date)) return false;
  if ('done' in c && c.done === false) return false;
  if ('count' in c && c.count !== undefined) {
    if (typeof c.count !== 'number' || !Number.isFinite(c.count) || c.count <= 0) return false;
  }
  return true;
}

function isTodo(t: unknown): t is Todo {
  if (!isPlainObject(t)) return false;
  if (typeof t.id !== 'string' || t.id.length === 0) return false;
  if (typeof t.name !== 'string') return false;
  if (typeof t.done !== 'boolean') return false;
  if ('sectionId' in t && t.sectionId !== undefined && typeof t.sectionId !== 'string')
    return false;
  if ('openDate' in t && t.openDate !== undefined) {
    if (typeof t.openDate !== 'string' || !ISO_DATE_RE.test(t.openDate)) return false;
  }
  if ('dueDate' in t && t.dueDate !== undefined) {
    if (typeof t.dueDate !== 'string' || !ISO_DATE_RE.test(t.dueDate)) return false;
  }
  return true;
}

function coerceSettings(s: unknown): AppSettings {
  const base = defaultSettings();
  if (!isPlainObject(s)) return base;
  const af = isPlainObject(s.autoFail) ? s.autoFail : {};
  return {
    autoFail: {
      enabled: typeof af.enabled === 'boolean' ? af.enabled : base.autoFail.enabled,
      graceDays:
        typeof af.graceDays === 'number' && Number.isInteger(af.graceDays) && af.graceDays >= 0
          ? af.graceDays
          : base.autoFail.graceDays
    }
  };
}

type VersionedData = { version: number; [k: string]: unknown };

// Forward-migration ladder. Each entry takes a payload of (claimed) version N and
// returns a payload of version N+1.
const migrations: Record<number, (data: VersionedData) => VersionedData> = {
  2: (d) => ({ ...d, version: 3, sections: [] }),
  3: (d) => ({ ...d, version: 4, todos: [] }),
  4: (d) => ({ ...d, version: 5 }),
  5: (d) => ({ ...d, version: 6, todoSections: [] }),
  6: (d) => {
    const sections = Array.isArray(d.sections) ? d.sections : [];
    const defaultSection = { id: crypto.randomUUID(), name: 'Habits', collapsed: false };
    sections.unshift(defaultSection);
    const habits = Array.isArray(d.habits) ? d.habits : [];
    for (const h of habits) {
      if (!(h as Record<string, unknown>).sectionId) {
        (h as Record<string, unknown>).sectionId = defaultSection.id;
      }
    }

    const todoSections = Array.isArray(d.todoSections) ? d.todoSections : [];
    const defaultTodoSection = { id: crypto.randomUUID(), name: 'Tasks', collapsed: false };
    todoSections.unshift(defaultTodoSection);
    const todos = Array.isArray(d.todos) ? d.todos : [];
    for (const t of todos) {
      if (!(t as Record<string, unknown>).sectionId) {
        (t as Record<string, unknown>).sectionId = defaultTodoSection.id;
      }
    }

    return { ...d, version: 7, sections, habits, todoSections, todos };
  },
  7: (d) => ({ ...d, version: 8, settings: defaultSettings() })
};

export function migrate(parsed: unknown): AppData | null {
  if (!isPlainObject(parsed)) return null;
  if (typeof parsed.version !== 'number') return null;
  let data = parsed as VersionedData;
  while (data.version < CURRENT_VERSION) {
    const step = migrations[data.version];
    if (!step) return null;
    data = step(data);
  }
  if (data.version !== CURRENT_VERSION) return null;
  const sections = Array.isArray(data.sections) ? data.sections.filter(isSection) : [];
  const validSectionIds = new Set(sections.map((s) => s.id));
  const fallbackSectionId = sections[0]?.id;
  const habits = (Array.isArray(data.habits) ? data.habits.filter(isHabit) : []).map((h) => {
    if (!h.sectionId || !validSectionIds.has(h.sectionId)) {
      return { ...h, sectionId: fallbackSectionId };
    }
    return h;
  });
  const completions = Array.isArray(data.completions) ? data.completions.filter(isCompletion) : [];
  const todoSections = Array.isArray(data.todoSections) ? data.todoSections.filter(isSection) : [];
  const validTodoSectionIds = new Set(todoSections.map((s) => s.id));
  const fallbackTodoSectionId = todoSections[0]?.id;
  const todos = (Array.isArray(data.todos) ? data.todos.filter(isTodo) : []).map((t) => {
    if (!t.sectionId || !validTodoSectionIds.has(t.sectionId)) {
      return { ...t, sectionId: fallbackTodoSectionId };
    }
    return t;
  });
  const settings = coerceSettings(data.settings);
  return { version: CURRENT_VERSION, habits, completions, sections, todos, todoSections, settings };
}

function backupRaw(raw: string): void {
  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // Best effort: a corrupt-data backup shouldn't itself crash the app.
  }
}

export type LoadResult = { data: AppData; recoveredFromCorruption: boolean };

export function loadInitial(): LoadResult {
  if (typeof localStorage === 'undefined') {
    return { data: emptyAppData(), recoveredFromCorruption: false };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { data: emptyAppData(), recoveredFromCorruption: false };
  try {
    const parsed = JSON.parse(raw);
    const migrated = migrate(parsed);
    if (migrated) {
      if (parsed.version !== migrated.version) save(migrated);
      return { data: migrated, recoveredFromCorruption: false };
    }
  } catch (e) {
    console.error('Migration failed:', e);
  }
  backupRaw(raw);
  // Try recovering from backup before giving up
  const backupStr = localStorage.getItem(BACKUP_KEY);
  if (backupStr && backupStr !== raw) {
    try {
      const backupMigrated = migrate(JSON.parse(backupStr));
      if (backupMigrated) {
        save(backupMigrated);
        return { data: backupMigrated, recoveredFromCorruption: true };
      }
    } catch {
      // fall through to empty state
    }
  }
  const fresh = emptyAppData();
  save(fresh);
  return { data: fresh, recoveredFromCorruption: true };
}

export function save(data: AppData): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function readBackup(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(BACKUP_KEY);
}

export function clearBackup(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(BACKUP_KEY);
}
