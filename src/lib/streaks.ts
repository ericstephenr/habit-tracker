import type { Habit } from './types';
import { isDueOn, previousDay } from './schedule';

const MAX_LOOKBACK_DAYS = 365;

export function calcStreak(
  habit: Habit,
  dones: Set<string> | undefined,
  referenceDate: string,
  realToday: string
): number {
  const set = dones ?? new Set<string>();

  let date = referenceDate;
  const inProgress = referenceDate === realToday;
  if (inProgress && isDueOn(habit, date) && !set.has(date)) {
    date = previousDay(date);
  }

  let streak = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    if (date < habit.startDate) break;
    if (isDueOn(habit, date)) {
      if (set.has(date)) {
        streak++;
      } else {
        break;
      }
    }
    date = previousDay(date);
  }
  return streak;
}
