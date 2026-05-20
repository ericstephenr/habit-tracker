export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeeklyDaysSchedule = {
  type: 'weekly_days';
  days: DayOfWeek[];
};

export type Schedule = WeeklyDaysSchedule;

export type Habit = {
  id: string;
  name: string;
  schedule: Schedule;
  // YYYY-MM-DD. User-controlled; defaults to the date the habit was added on.
  // Drives time-machine visibility and streak lookback.
  startDate: string;
};

export type Completion = {
  habitId: string;
  date: string;
};

export type AppData = {
  version: 1;
  habits: Habit[];
  completions: Completion[];
};

export const emptyAppData = (): AppData => ({
  version: 1,
  habits: [],
  completions: []
});
