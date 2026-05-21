import type {
  AppData,
  Completion,
  CounterConfig,
  DayOfWeek,
  Habit,
  Schedule,
  Section
} from './types';
import { emptyAppData } from './types';

export const STORAGE_KEY = 'habit-tracker:v1';
export const BACKUP_KEY = 'habit-tracker:backup';
export const CURRENT_VERSION = 3 as const;

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

type VersionedData = { version: number; [k: string]: unknown };

// Forward-migration ladder. Each entry takes a payload of (claimed) version N and
// returns a payload of version N+1.
const migrations: Record<number, (data: VersionedData) => VersionedData> = {
  2: (d) => ({ ...d, version: 3, sections: [] })
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
  const habits = (Array.isArray(data.habits) ? data.habits.filter(isHabit) : []).map((h) => {
    // Drop sectionId references to sections that don't exist — keeps state
    // internally consistent across imports.
    if (h.sectionId !== undefined && !validSectionIds.has(h.sectionId)) {
      const cleaned = { ...h };
      delete cleaned.sectionId;
      return cleaned;
    }
    return h;
  });
  const completions = Array.isArray(data.completions) ? data.completions.filter(isCompletion) : [];
  return { version: CURRENT_VERSION, habits, completions, sections };
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
    const migrated = migrate(JSON.parse(raw));
    if (migrated) return { data: migrated, recoveredFromCorruption: false };
  } catch {
    // fall through to backup
  }
  backupRaw(raw);
  const fresh = emptyAppData();
  // Overwrite the corrupt payload so the recovery banner only fires once.
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
