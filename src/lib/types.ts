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
};

type BaseHabit = {
  id: string;
  name: string;
  schedule: Schedule;
  // YYYY-MM-DD. User-controlled; defaults to the date the habit was added on.
  // Drives time-machine visibility and streak lookback.
  startDate: string;
};

export type BinaryHabit = BaseHabit & { type: 'binary' };
export type CounterHabit = BaseHabit & { type: 'counter'; counter: CounterConfig };
export type Habit = BinaryHabit | CounterHabit;

export type Completion = {
  habitId: string;
  date: string;
  count?: number;
};

export type AppData = {
  version: 2;
  habits: Habit[];
  completions: Completion[];
};

export const emptyAppData = (): AppData => ({
  version: 2,
  habits: [],
  completions: []
});
