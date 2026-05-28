import type { CounterHabit, DayOfWeek, Habit } from './types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(yyyy_mm_dd: string): Date {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return isoDate(new Date());
}

export function weekdayOf(yyyy_mm_dd: string): DayOfWeek {
  return parseISO(yyyy_mm_dd).getDay() as DayOfWeek;
}

export function previousDay(yyyy_mm_dd: string): string {
  const d = parseISO(yyyy_mm_dd);
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}

export function nextDay(yyyy_mm_dd: string): string {
  const d = parseISO(yyyy_mm_dd);
  d.setDate(d.getDate() + 1);
  return isoDate(d);
}

export function isDueOn(habit: Habit, dateISO: string): boolean {
  return habit.schedule.days.includes(weekdayOf(dateISO));
}

export function effectiveTarget(
  habit: CounterHabit,
  dateISO: string,
  override?: number | null
): number {
  if (override != null && override > 0) return override;
  return habit.counter.perDayTargets?.[weekdayOf(dateISO)] ?? habit.counter.target;
}

export function normalizeDays(days: DayOfWeek[]): DayOfWeek[] {
  return [...new Set(days)].sort((a, b) => a - b);
}

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const;
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export function formatDateHeader(dateISO: string): string {
  const d = parseISO(dateISO);
  return `${WEEKDAY_LABELS[d.getDay()]}, ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

export function formatWeekday(dateISO: string): string {
  return WEEKDAY_LABELS[parseISO(dateISO).getDay()];
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const;

export function formatMonthDay(dateISO: string): string {
  const d = parseISO(dateISO);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// Returns "Today" / "Yesterday" / "Tomorrow" / "May 21" given a date and
// real-today reference. The relative label is reserved for the immediate window
// only — anything further out falls back to the month/day form. The weekday
// is intentionally left out of the title to avoid duplicating the uppercase
// weekday that the ProgressHero subtitle already shows.
export function smartDateTitle(dateISO: string, todayISO: string): string {
  if (dateISO === todayISO) return 'Today';
  if (dateISO === previousDay(todayISO)) return 'Yesterday';
  if (dateISO === nextDay(todayISO)) return 'Tomorrow';
  const d = parseISO(dateISO);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function buildDateWindow(center: string, radius: number): string[] {
  const dates: string[] = [];
  let cursor = center;
  for (let i = 0; i < radius; i++) cursor = previousDay(cursor);
  for (let i = -radius; i <= radius; i++) {
    dates.push(cursor);
    if (i < radius) cursor = nextDay(cursor);
  }
  return dates;
}

export const DAY_LETTERS: ReadonlyArray<string> = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES: ReadonlyArray<string> = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDueDate(dueDateISO: string, todayISO_: string): string {
  if (dueDateISO < todayISO_) return 'Overdue';
  if (dueDateISO === todayISO_) return 'Today';
  if (dueDateISO === nextDay(todayISO_)) return 'Tomorrow';
  const due = parseISO(dueDateISO);
  const today = parseISO(todayISO_);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 7) return DAY_NAMES[due.getDay()] as string;
  return formatMonthDay(dueDateISO);
}
