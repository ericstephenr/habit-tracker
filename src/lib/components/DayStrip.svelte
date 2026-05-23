<script lang="ts">
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { store } from '$lib/store.svelte';
  import { parseISO, previousDay, nextDay, DAY_LETTERS } from '$lib/schedule';

  let cells = $derived.by(() => {
    // Build 7 ISO date strings centered on the selected date by walking
    // backwards 3 days, then forward through the window. Uses the existing
    // previousDay/nextDay string helpers so we don't mutate Date instances.
    const isoList: string[] = [];
    let cursor = selectedDate.value;
    for (let i = 0; i < 3; i++) cursor = previousDay(cursor);
    for (let i = -3; i <= 3; i++) {
      isoList.push(cursor);
      if (i < 3) cursor = nextDay(cursor);
    }
    return isoList.map((iso) => {
      const d = parseISO(iso);
      return {
        iso,
        dayNum: d.getDate(),
        letter: DAY_LETTERS[d.getDay()],
        isSelected: iso === selectedDate.value,
        isToday: iso === currentDate.value,
        isFuture: iso > currentDate.value,
        progress: store.progressForDate(iso)
      };
    });
  });

  function selectDate(iso: string) {
    selectedDate.value = iso;
  }
</script>

<div
  style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
         padding: 0 16px;"
>
  {#each cells as cell (cell.iso)}
    {@const total = cell.progress.total}
    {@const ratio = total > 0 ? cell.progress.done / total : 0}
    {@const complete = total > 0 && cell.progress.done === total}
    <button
      type="button"
      onclick={() => selectDate(cell.iso)}
      aria-label={`Go to ${cell.iso}`}
      aria-pressed={cell.isSelected}
      style="display: flex; flex-direction: column; align-items: center; gap: 4px;
             padding: 8px 0; border: 0;
             background: {cell.isSelected ? 'var(--accent-soft)' : 'transparent'};
             color: var(--ink);
             border-radius: 14px; cursor: pointer;
             transition: all 180ms; position: relative;"
    >
      <span
        style="font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
               text-transform: uppercase;
               color: {cell.isSelected ? 'var(--accent-deep)' : 'var(--ink-faint)'};"
      >
        {cell.letter}
      </span>
      <span
        style="font-family: var(--font-display); font-weight: 700;
               font-size: 18px; line-height: 1;
               color: {cell.isSelected
          ? 'var(--accent-deep)'
          : cell.isToday
            ? 'var(--accent)'
            : 'var(--ink)'};
               font-variant-numeric: tabular-nums;"
      >
        {cell.dayNum}
      </span>
      <span
        aria-hidden="true"
        style="width: 20px; height: 4px; border-radius: 99px;
               background: {cell.isFuture || total === 0
          ? 'var(--line)'
          : complete
            ? 'var(--accent)'
            : 'var(--surface-2)'};
               overflow: hidden; position: relative;"
      >
        {#if ratio > 0 && ratio < 1 && !cell.isFuture}
          <span
            style="position: absolute; inset: 0;
                   width: {ratio * 100}%;
                   background: var(--accent);"
          ></span>
        {/if}
      </span>
    </button>
  {/each}
</div>
