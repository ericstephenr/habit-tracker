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
    {@const circumference = 2 * Math.PI * 18}
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
        {cell.letter}
      </span>
      <span
        style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;"
      >
        <svg
          width="42"
          height="42"
          style="position: absolute; inset: 0; transform: rotate(-90deg);"
          aria-hidden="true"
        >
          <circle
            cx="21"
            cy="21"
            r="18"
            fill="none"
            stroke="var(--surface-3)"
            stroke-width="2.25"
          />
          {#if ratio > 0 && !cell.isFuture}
            <circle
              cx="21"
              cy="21"
              r="18"
              fill="none"
              stroke="var(--accent)"
              stroke-width="2.25"
              stroke-dasharray={circumference}
              stroke-dashoffset={circumference * (1 - ratio)}
              stroke-linecap="round"
              style="transition: stroke-dashoffset var(--t-normal) var(--ease-out);"
            />
          {/if}
        </svg>
        <span
          style="width: 28px; height: 28px; border-radius: 9999px;
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
                 font-size: var(--fs-body); font-variant-numeric: tabular-nums;
                 box-shadow: {cell.isSelected ? '0 4px 14px var(--accent-glow)' : 'none'};
                 transition: all var(--t-normal) var(--ease-out);
                 position: relative; z-index: 1;"
        >
          {cell.dayNum}
        </span>
      </span>
    </button>
  {/each}
</div>
