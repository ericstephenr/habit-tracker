<script lang="ts">
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { store } from '$lib/store.svelte';
  import { parseISO, buildDateWindow, DAY_LETTERS } from '$lib/schedule';

  let cells = $derived.by(() =>
    buildDateWindow(selectedDate.value, 3).map((iso) => {
      const d = parseISO(iso);
      const { done, total } = store.progressForDate(iso);
      return {
        iso,
        dayNum: d.getDate(),
        letter: DAY_LETTERS[d.getDay()],
        isSelected: iso === selectedDate.value,
        isToday: iso === currentDate.value,
        pct: total > 0 ? Math.round((done / total) * 100) : 0
      };
    })
  );
</script>

<div class="weekstrip">
  {#each cells as cell (cell.iso)}
    <button
      type="button"
      class="day"
      aria-current={cell.isSelected}
      data-today={cell.isToday}
      aria-label={`Go to ${cell.iso}`}
      onclick={() => (selectedDate.value = cell.iso)}
    >
      <span class="day-dow">{cell.letter}</span>
      <span class="day-num">{cell.dayNum}</span>
      <span class="day-bar"><span style="width: {cell.pct}%;"></span></span>
    </button>
  {/each}
</div>
