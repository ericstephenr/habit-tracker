<script lang="ts">
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { store } from '$lib/store.svelte';
  import { smartDateTitle, formatMonthDay } from '$lib/schedule';

  let title = $derived(smartDateTitle(selectedDate.value, currentDate.value));
  let isRelative = $derived(['Today', 'Yesterday', 'Tomorrow'].includes(title));
  let isFuture = $derived(selectedDate.value > currentDate.value);
  let subtitle = $derived.by(() => {
    const md = formatMonthDay(selectedDate.value);
    if (isRelative) return md;
    return isFuture ? `${md} · upcoming` : `${md} · past`;
  });
  let complete = $derived(store.totalCount > 0 && store.doneCount === store.totalCount);
  let statusText = $derived(
    complete ? 'nice work — day complete' : isFuture ? 'scheduled' : 'done so far'
  );

  function jumpToday() {
    selectedDate.goToday();
  }
</script>

<div style="padding: 0 20px; margin-top: 14px;">
  <div
    style="display: flex; align-items: baseline; justify-content: space-between;
           margin-bottom: 12px; gap: 12px;"
  >
    <div style="min-width: 0; flex: 1;">
      <div
        style="font-family: var(--font-display); font-weight: 600;
               font-size: 30px; line-height: 1; letter-spacing: -1.2px;
               color: var(--ink);"
      >
        {title}
      </div>
      <div
        style="margin-top: 6px; font-size: 12px; font-weight: 500;
               letter-spacing: 0.2px; color: var(--ink-faint);
               font-variant-numeric: tabular-nums;"
      >
        {subtitle}
      </div>
    </div>
    <button
      type="button"
      onclick={jumpToday}
      aria-hidden={selectedDate.isToday}
      tabindex={selectedDate.isToday ? -1 : 0}
      style="visibility: {selectedDate.isToday ? 'hidden' : 'visible'};
             background: var(--accent-soft); color: var(--accent-deep);
             border: 0; padding: 6px 12px; border-radius: 99px;
             font-family: var(--font-body); font-size: 12px; font-weight: 600;
             cursor: pointer; white-space: nowrap;
             transition: opacity 200ms;"
    >
      {isFuture ? '← Today' : 'Today →'}
    </button>
  </div>

  {#if store.totalCount > 0}
    <div
      class="ht-card"
      style="background: {complete ? 'var(--accent)' : 'var(--surface)'};
             border-radius: 18px; padding: 16px 18px;
             box-shadow: {complete
        ? '0 12px 32px var(--accent-glow)'
        : '0 4px 14px rgba(20, 12, 40, 0.05)'};
             border: {complete ? 'none' : '1px solid var(--line)'};
             transition: all 360ms cubic-bezier(.2,.8,.2,1);"
    >
      <div
        style="display: flex; align-items: baseline; justify-content: space-between;
               margin-bottom: 10px;"
      >
        <div style="display: flex; align-items: baseline; gap: 6px;">
          <span
            style="font-family: var(--font-display); font-weight: 700;
                   font-size: 36px; line-height: 1; letter-spacing: -1.5px;
                   color: {complete ? 'var(--accent-on)' : 'var(--ink)'};
                   font-variant-numeric: tabular-nums;"
          >
            {store.doneCount}
          </span>
          <span
            style="font-family: var(--font-display); font-weight: 500;
                   font-size: 18px;
                   color: {complete ? 'rgba(255,255,255,0.7)' : 'var(--ink-muted)'};
                   font-variant-numeric: tabular-nums;"
          >
            / {store.totalCount}
          </span>
          <span
            style="margin-left: 6px; font-size: 12px; font-weight: 500;
                   color: {complete ? 'rgba(255,255,255,0.85)' : 'var(--ink-muted)'};"
          >
            {statusText}
          </span>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={store.progressPct}
        aria-label="{store.doneCount} of {store.totalCount} habits complete"
        style="height: 10px; border-radius: 99px;
               background: {complete ? 'rgba(255,255,255,0.25)' : 'var(--surface-2)'};
               overflow: hidden; position: relative;"
      >
        <div
          style="position: absolute; inset: 0;
                 width: {store.progressPct}%;
                 background: {complete ? 'rgba(255,255,255,0.95)' : 'var(--accent)'};
                 border-radius: 99px;
                 transition: width 420ms cubic-bezier(.2,.8,.2,1);
                 box-shadow: {complete ? 'none' : '0 2px 8px var(--accent-glow)'};"
        ></div>
      </div>
    </div>
  {:else if !isFuture}
    <div
      style="padding: 20px; background: var(--surface);
             border-radius: 18px; border: 1px dashed var(--line-strong);
             font-family: var(--font-body); font-size: 14px;
             color: var(--ink-muted); text-align: center;"
    >
      No habits scheduled. Enjoy a rest day.
    </div>
  {/if}
</div>
