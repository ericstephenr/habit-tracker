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
  let pct = $derived(store.progressPct);
  let toGo = $derived(store.totalCount - store.doneCount);
  let copy = $derived(
    pct === 0
      ? 'A fresh page'
      : pct < 35
        ? 'Underway'
        : pct < 70
          ? 'Halfway there'
          : pct < 100
            ? 'Almost done'
            : 'Day complete'
  );

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
        <span
          style="font-family: var(--font-display); font-weight: 700;
                 font-size: 44px; line-height: 0.9; letter-spacing: -2px;
                 color: {complete ? 'var(--accent-on)' : 'var(--ink)'};
                 font-variant-numeric: tabular-nums;"
        >
          {pct}<span
            style="font-size: 20px; font-weight: 600; margin-left: 2px;
                   color: {complete ? 'rgba(255,255,255,0.7)' : 'var(--ink-muted)'};">%</span
          >
        </span>
        <div style="text-align: right;">
          <div
            style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
                   text-transform: uppercase;
                   color: {complete ? 'rgba(255,255,255,0.5)' : 'var(--ink-faint)'};"
          >
            Habits
          </div>
          <div
            style="font-family: var(--font-display); font-size: var(--fs-title); font-weight: 700;
                   color: {complete ? 'var(--accent-on)' : 'var(--ink)'};
                   font-variant-numeric: tabular-nums;"
          >
            {store.doneCount}<span
              style="font-weight: 600;
                     color: {complete ? 'rgba(255,255,255,0.7)' : 'var(--ink-faint)'};"
            >
              / {store.totalCount}</span
            >
          </div>
        </div>
      </div>
      <div
        style="margin-top: 8px; font-size: 13px; font-weight: 600;
               color: {complete ? 'rgba(255,255,255,0.9)' : 'var(--ink-muted)'};"
      >
        {complete ? 'Day complete' : isFuture ? 'scheduled' : `${copy} · ${toGo} to go`}
      </div>
      {#if !isFuture}
        <div
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={pct}
          aria-label="{store.doneCount} of {store.totalCount} habits complete"
          style="margin-top: 14px; height: 14px; border-radius: 99px;
                 background: {complete ? 'rgba(255,255,255,0.25)' : 'var(--surface-3)'};
                 overflow: hidden; position: relative;"
        >
          <div
            style="position: absolute; inset: 0;
                   width: {pct}%;
                   background: {complete
              ? 'rgba(255,255,255,0.95)'
              : 'linear-gradient(180deg, color-mix(in oklch, var(--accent) 90%, white) 0%, var(--accent) 60%, var(--accent-deep) 100%)'};
                   border-radius: 99px;
                   transition: width 420ms cubic-bezier(.2,.8,.2,1);
                   box-shadow: {complete
              ? 'none'
              : '0 2px 10px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.35)'};"
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
