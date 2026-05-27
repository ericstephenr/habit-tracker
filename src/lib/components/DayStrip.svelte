<script lang="ts">
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { store } from '$lib/store.svelte';
  import { parseISO, buildDateWindow, DAY_LETTERS } from '$lib/schedule';

  let cells = $derived.by(() => {
    return buildDateWindow(selectedDate.value, 3).map((iso) => {
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
      style="display: flex; flex-direction: column; align-items: center; gap: 5px;
             padding: 6px 0 8px; border: 0; background: transparent;
             color: var(--ink); border-radius: 14px; cursor: pointer;
             transition: all 180ms; position: relative;"
    >
      <span
        style="display: inline-flex; align-items: center; gap: 3px; line-height: 1;
               font-size: var(--fs-overline); font-weight: 700; letter-spacing: 0.8px;
               text-transform: uppercase;
               color: {cell.isSelected ? 'var(--accent-ink)' : 'var(--ink-faint)'};"
      >
        {#if cell.isToday && !cell.isSelected}
          <span
            aria-hidden="true"
            style="width: 4px; height: 4px; border-radius: 50%; background: var(--accent);"
          ></span>
        {/if}
        {cell.letter}
      </span>
      <span
        style="width: var(--day-circle); height: var(--day-circle); border-radius: 9999px;
               display: flex; align-items: center; justify-content: center;
               background: {cell.isSelected
          ? 'var(--accent)'
          : cell.isToday
            ? 'var(--accent-soft)'
            : 'transparent'};
               color: {cell.isSelected
          ? 'var(--accent-on)'
          : cell.isToday
            ? 'var(--accent-ink)'
            : 'var(--ink)'};
               font-family: var(--font-display); font-weight: 700;
               font-size: var(--fs-title); font-variant-numeric: tabular-nums;
               box-shadow: {cell.isSelected ? '0 4px 14px var(--accent-glow)' : 'none'};
               transition: all var(--t-normal) var(--ease-out);"
      >
        {cell.dayNum}
      </span>
      <span
        aria-hidden="true"
        style="width: 22px; height: 4px; border-radius: 99px;
               background: {cell.isFuture || total === 0
          ? 'var(--line)'
          : complete
            ? 'var(--accent)'
            : 'var(--surface-3)'};
               overflow: hidden; position: relative;"
      >
        {#if ratio > 0 && ratio < 1 && !cell.isFuture}
          <span
            style="position: absolute; inset: 0;
                   width: {ratio * 100}%;
                   border-radius: 99px;
                   background: var(--accent);"
          ></span>
        {/if}
      </span>
    </button>
  {/each}
</div>
