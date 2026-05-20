import { currentDate } from './currentDate.svelte';
import { nextDay, previousDay } from './schedule';

class SelectedDate {
  value = $state(currentDate.value);

  isToday = $derived(this.value === currentDate.value);
  isPast = $derived(this.value < currentDate.value);
  isFuture = $derived(this.value > currentDate.value);

  constructor() {
    if (typeof window === 'undefined') return;
    // When real-today rolls over at midnight, advance the view too — but only
    // if the user was looking at the old "today". Past/future views stay put.
    let prev = currentDate.value;
    $effect.root(() => {
      $effect(() => {
        const next = currentDate.value;
        if (this.value === prev) this.value = next;
        prev = next;
      });
    });
  }

  goPrev(): void {
    this.value = previousDay(this.value);
  }

  goNext(): void {
    this.value = nextDay(this.value);
  }

  goToday(): void {
    this.value = currentDate.value;
  }
}

export const selectedDate = new SelectedDate();
