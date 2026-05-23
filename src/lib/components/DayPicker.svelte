<script lang="ts">
  import { DAY_LETTERS, DAY_NAMES, normalizeDays } from '$lib/schedule';
  import type { DayOfWeek } from '$lib/types';

  let {
    days,
    onChange
  }: {
    days: DayOfWeek[];
    onChange: (next: DayOfWeek[]) => void;
  } = $props();

  function toggleDay(d: DayOfWeek) {
    if (days.includes(d)) onChange(days.filter((x) => x !== d));
    else onChange(normalizeDays([...days, d]));
  }
</script>

<div style="display: flex; gap: 8px;">
  {#each DAY_LETTERS as letter, i (i)}
    {@const day = i as DayOfWeek}
    {@const active = days.includes(day)}
    <button
      type="button"
      onclick={() => toggleDay(day)}
      aria-pressed={active}
      aria-label={DAY_NAMES[i]}
      style="flex: 1; height: 44px; border-radius: 12px;
             border: 1.5px solid {active ? 'var(--accent)' : 'var(--line)'};
             background: {active ? 'var(--accent)' : 'var(--surface-2)'};
             color: {active ? 'var(--accent-on)' : 'var(--ink)'};
             font-family: var(--font-display); font-size: 14px; font-weight: 600;
             cursor: pointer; padding: 0;
             transition: all 140ms;"
    >
      {letter}
    </button>
  {/each}
</div>
