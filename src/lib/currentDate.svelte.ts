import { todayISO } from './schedule';

class CurrentDate {
  value = $state(todayISO());
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    this.scheduleNext();
    document.addEventListener('visibilitychange', this.refresh);
    window.addEventListener('focus', this.refresh);
  }

  private refresh = (): void => {
    if (document.visibilityState === 'hidden') return;
    const today = todayISO();
    if (this.value !== today) this.value = today;
    if (this.timer !== null) clearTimeout(this.timer);
    this.scheduleNext();
  };

  private scheduleNext(): void {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.value = todayISO();
      this.scheduleNext();
    }, nextMidnight.getTime() - now.getTime());
  }
}

export const currentDate = new CurrentDate();
