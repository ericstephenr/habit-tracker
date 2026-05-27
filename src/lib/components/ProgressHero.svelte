<script lang="ts">
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { store } from '$lib/store.svelte';
  import { smartDateTitle, formatMonthDay, formatWeekday } from '$lib/schedule';

  let title = $derived(smartDateTitle(selectedDate.value, currentDate.value));
  let isRelative = $derived(['Today', 'Yesterday', 'Tomorrow'].includes(title));
  let isFuture = $derived(selectedDate.value > currentDate.value);
  let subtitle = $derived.by(() => {
    const md = formatMonthDay(selectedDate.value);
    const wd = formatWeekday(selectedDate.value);
    // Relative title ("Today/Yesterday/Tomorrow") hides the date — subtitle shows date + weekday.
    // Absolute title already includes the date — subtitle shows weekday + temporal context.
    const head = isRelative ? `${md} · ${wd}` : wd;
    if (selectedDate.isToday) return head;
    return `${head} · ${isFuture ? 'upcoming' : 'past'}`;
  });
  let complete = $derived(store.totalCount > 0 && store.doneCount === store.totalCount);

  function jumpToday() {
    selectedDate.goToday();
  }
</script>

<div style="padding: 0 20px; margin-top: 14px;">
  <div
    style="display: flex; align-items: baseline; justify-content: space-between;
           margin-bottom: 14px; gap: 12px;"
  >
    <div style="min-width: 0; flex: 1;">
      <div
        style="font-family: var(--font-display); font-weight: 700;
               font-size: var(--fs-display); line-height: 1; letter-spacing: -1.2px;
               color: var(--ink);"
      >
        {title}<span style="color: var(--accent);">.</span>
      </div>
      <div
        style="margin-top: 6px; font-size: var(--fs-meta); font-weight: 600;
               letter-spacing: 0.2px; color: var(--ink-faint);
               font-variant-numeric: tabular-nums; text-transform: uppercase;"
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
             background: var(--accent-soft); color: var(--accent-ink);
             border: 0; padding: 6px 12px; border-radius: 99px;
             font-family: var(--font-body); font-size: var(--fs-meta); font-weight: 600;
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
             background-image: {complete
        ? 'linear-gradient(135deg, var(--accent-deep) 0%, var(--accent) 100%)'
        : 'none'};
             border-radius: var(--r-xl); padding: 16px 18px;
             box-shadow: {complete ? '0 14px 36px var(--accent-glow)' : 'var(--shadow-1)'};
             border: {complete ? 'none' : '1px solid var(--line)'};
             transition: all 360ms cubic-bezier(.2,.8,.2,1);"
    >
      <div
        style="display: flex; align-items: baseline; justify-content: space-between;
               gap: 12px;"
      >
        <div style="display: flex; align-items: baseline; gap: 6px; min-width: 0;">
          <span
            style="font-family: var(--font-display); font-weight: 700;
                   font-size: var(--fs-hero); line-height: 1; letter-spacing: -1.5px;
                   color: {complete ? 'var(--accent-on)' : 'var(--ink)'};
                   font-variant-numeric: tabular-nums;"
          >
            {store.doneCount}
          </span>
          <span
            style="font-family: var(--font-display); font-weight: 600;
                   font-size: var(--fs-title);
                   color: {complete ? 'rgba(255,255,255,0.7)' : 'var(--ink-muted)'};
                   font-variant-numeric: tabular-nums;"
          >
            / {store.totalCount}
          </span>
        </div>
        <span
          style="font-family: var(--font-display); font-weight: 700;
                 font-size: var(--fs-display); line-height: 1; letter-spacing: -1.2px;
                 color: {complete ? 'var(--accent-on)' : 'var(--ink)'};
                 font-variant-numeric: tabular-nums; flex-shrink: 0;"
        >
          {store.progressPct}<span
            style="font-size: var(--fs-title); font-weight: 600; margin-left: 1px;
                   color: {complete ? 'rgba(255,255,255,0.7)' : 'var(--ink-muted)'};">%</span
          >
        </span>
      </div>
      <div
        style="margin-top: 4px; font-size: var(--fs-body); font-weight: 600;
               color: {complete ? 'rgba(255,255,255,0.9)' : 'var(--ink-muted)'};
               letter-spacing: 0.1px;"
      >
        {complete
          ? '✨ Day complete — nice work'
          : isFuture
            ? 'scheduled'
            : `${store.totalCount - store.doneCount} to go`}
      </div>
      {#if !isFuture}
        <div
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={store.progressPct}
          aria-label="{store.doneCount} of {store.totalCount} habits complete"
          style="margin-top: 12px; height: 8px; border-radius: 99px;
                 background: {complete ? 'rgba(255,255,255,0.25)' : 'var(--surface-3)'};
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
      {/if}
    </div>
  {:else if !isFuture && store.hasAnyHabit}
    <div
      style="padding: 20px; background: var(--surface);
             border-radius: var(--r-xl); border: 1px dashed var(--line-strong);
             font-family: var(--font-body); font-size: 14px;
             color: var(--ink-muted); text-align: center;"
    >
      No habits scheduled. Enjoy a rest day.
    </div>
  {/if}
</div>
