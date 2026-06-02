export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeeklyDaysSchedule = {
  type: 'weekly_days';
  days: DayOfWeek[];
};

export type Schedule = WeeklyDaysSchedule;

export type CounterConfig = {
  target: number;
  step: number;
  unit: string;
  perDayTargets?: Partial<Record<DayOfWeek, number>>;
  // 'up' (default when absent) counts toward `target` as a goal: reaching it succeeds.
  // 'down' treats `target` as a ceiling/limit — logging a count above it fails the day,
  // and a non-breached day stays neutral until explicitly marked done.
  direction?: 'up' | 'down';
};

type BaseHabit = {
  id: string;
  name: string;
  schedule: Schedule;
  // YYYY-MM-DD. User-controlled; defaults to the date the habit was added on.
  // Drives time-machine visibility and streak lookback.
  startDate: string;
  notes?: string;
  sectionId: string;
  // Optional importance. Absent = "None" (no priority); drives the sidebar
  // priority filter and a colored dot on the habit card.
  priority?: Priority;
};

export type Priority = 'high' | 'med' | 'low';

export type BinaryHabit = BaseHabit & { type: 'binary' };
export type CounterHabit = BaseHabit & { type: 'counter'; counter: CounterConfig };
export type Habit = BinaryHabit | CounterHabit;

// 'done' is an explicit manual completion. It exists for Limit habits (direction 'down'),
// whose under-limit days are otherwise neutral and never auto-complete from their count.
export type CompletionState = 'skipped' | 'failed' | 'done';

export type Completion = {
  habitId: string;
  date: string;
  count?: number;
  state?: CompletionState;
  targetOverride?: number;
};

// App-wide settings, persisted server-side and loaded with the rest of AppData.
export type AppSettings = {
  // Rolling window that auto-flips still-Incomplete scheduled days to Failed.
  // graceDays = how many past days stay reviewable; days older than the window
  // are auto-failed at midnight rollover. Default: 1 (yesterday stays editable,
  // the day before yesterday turns Failed).
  autoFail: { enabled: boolean; graceDays: number };
};

export const defaultSettings = (): AppSettings => ({
  autoFail: { enabled: true, graceDays: 1 }
});

export type Section = {
  id: string;
  name: string;
  collapsed: boolean;
};

export type Todo = {
  id: string;
  name: string;
  done: boolean;
  sectionId: string;
  openDate?: string;
  dueDate?: string;
};

// Standalone note-taking, separate from a habit's optional `notes` metadata.
export type Note = {
  id: string;
  title: string; // may be empty → shown as "Untitled"
  body: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp; drives sort order (newest-edited first)
};

export type AppData = {
  version: 9;
  habits: Habit[];
  completions: Completion[];
  sections: Section[];
  todos: Todo[];
  todoSections: Section[];
  notes: Note[];
  settings: AppSettings;
};

export const emptyAppData = (): AppData => ({
  version: 9,
  habits: [],
  completions: [],
  sections: [{ id: crypto.randomUUID(), name: 'Habits', collapsed: false }],
  todos: [],
  todoSections: [{ id: crypto.randomUUID(), name: 'Tasks', collapsed: false }],
  notes: [],
  settings: defaultSettings()
});
