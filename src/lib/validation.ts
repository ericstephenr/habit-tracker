import type { CounterConfig, DayOfWeek } from './types';
import { DAY_NAMES } from './schedule';

export type CounterInput = {
  step: number | null;
  target: number | null;
  unit: string;
  perDayOn: boolean;
  perDayValues: Record<DayOfWeek, number | null>;
  selectedDays: DayOfWeek[];
};

export function buildCounterConfig(input: CounterInput): CounterConfig | null {
  const { step, target, perDayOn, perDayValues, selectedDays, unit } = input;
  if (step == null || step <= 0) return null;
  if (perDayOn) {
    const perDayTargets: Partial<Record<DayOfWeek, number>> = {};
    for (const d of selectedDays) {
      const v = perDayValues[d];
      if (v == null || v <= 0) return null;
      perDayTargets[d] = v;
    }
    const fallback = target != null && target > 0 ? target : (perDayTargets[selectedDays[0]] ?? 1);
    return { target: fallback, step, unit, perDayTargets };
  }
  if (target == null || target <= 0) return null;
  return { target, step, unit };
}

export type HabitInput = {
  name: string;
  days: DayOfWeek[];
  startDate: string;
  type: 'binary' | 'counter';
  step: number | null;
  target: number | null;
  perDayOn: boolean;
  perDayValues: Record<DayOfWeek, number | null>;
};

export function validateHabitInput(input: HabitInput): { valid: boolean; error: string } {
  if (input.name.trim().length === 0) return { valid: false, error: 'Add a habit name.' };
  if (input.startDate.length === 0) return { valid: false, error: 'Pick a start date.' };
  if (input.days.length === 0) return { valid: false, error: 'Pick at least one day.' };
  if (input.type === 'counter') {
    if (input.step == null || input.step <= 0)
      return { valid: false, error: 'Set a step size greater than 0.' };
    if (input.perDayOn) {
      for (const d of input.days) {
        const v = input.perDayValues[d];
        if (v == null || v <= 0)
          return { valid: false, error: `Set a target for ${DAY_NAMES[d]}.` };
      }
    } else if (input.target == null || input.target <= 0) {
      return { valid: false, error: 'Set a target greater than 0.' };
    }
  }
  return { valid: true, error: '' };
}
