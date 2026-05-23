<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Habit } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { calcStreak } from '$lib/streaks';
  import { effectiveTarget } from '$lib/schedule';
  import { currentDate } from '$lib/currentDate.svelte';
  import StreakCorner from './StreakCorner.svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconGrip from './icons/IconGrip.svelte';
  import IconMinus from './icons/IconMinus.svelte';
  import IconPlus from './icons/IconPlus.svelte';
  import IconChevron from './icons/IconChevron.svelte';

  let { habit, onEdit, date }: { habit: Habit; onEdit: (h: Habit) => void; date: string } =
    $props();

  let expanded = $state(false);
  let pressed = $state(false);

  let isFuture = $derived(date > currentDate.value);
  let done = $derived(store.isDone(habit.id, date));
  let target = $derived(habit.type === 'counter' ? effectiveTarget(habit, date) : 0);
  let count = $derived(habit.type === 'counter' ? store.getCount(habit.id, date) : 0);
  let unitSuffix = $derived(
    habit.type === 'counter' && habit.counter.unit ? ` ${habit.counter.unit}` : ''
  );
  let streakRef = $derived(isFuture ? currentDate.value : date);
  let streak = $derived(
    calcStreak(habit, store.donesByHabit.get(habit.id), streakRef, currentDate.value)
  );
  let fillPct = $derived(
    habit.type === 'counter' && target > 0 ? Math.min(1, count / target) * 100 : 0
  );

  function handleCheck() {
    if (isFuture) return;
    if (habit.type === 'binary') {
      store.toggleCompletion(habit.id, date);
    } else {
      // Counter quick-fill: tap circle to set count = target; tap again clears to 0.
      store.setCount(habit.id, date, count >= target ? 0 : target);
    }
  }

  function inc() {
    if (isFuture || habit.type !== 'counter') return;
    store.setCount(habit.id, date, count + habit.counter.step);
  }

  function dec() {
    if (isFuture || habit.type !== 'counter') return;
    store.setCount(habit.id, date, Math.max(0, count - habit.counter.step));
  }

  $effect(() => {
    if (!habit.notes) expanded = false;
  });
</script>

<div style="position: relative;">
  <StreakCorner {streak} />

  <div
    class="ht-card"
    style="background: var(--surface); border-radius: var(--r-lg);
           border: 1px solid {done ? 'transparent' : 'var(--line)'};
           box-shadow: var(--shadow-1);
           overflow: hidden; position: relative;
           transition: border-color var(--t-normal) var(--ease-out), box-shadow var(--t-normal) var(--ease-out);"
  >
    <div
      style="display: flex; align-items: center; gap: var(--card-gap); padding: var(--card-pad);"
    >
      <!-- Checkbox: binary = rounded square; counter = circle with water-fill -->
      <button
        type="button"
        onclick={handleCheck}
        onpointerdown={() => !isFuture && (pressed = true)}
        onpointerup={() => (pressed = false)}
        onpointerleave={() => (pressed = false)}
        disabled={isFuture}
        aria-pressed={done}
        aria-label={isFuture
          ? `Cannot mark ${habit.name} in the future`
          : done
            ? `Mark ${habit.name} not done`
            : `Mark ${habit.name} done`}
        style="width: var(--card-ctrl); height: var(--card-ctrl);
               border-radius: {habit.type === 'counter' ? '9999px' : 'var(--r-sm)'};
               flex-shrink: 0; border: 0; padding: 0;
               background: {done ? 'var(--accent)' : 'var(--surface-2)'};
               color: {done ? 'var(--accent-on)' : 'transparent'};
               display: flex; align-items: center; justify-content: center;
               cursor: {isFuture ? 'not-allowed' : 'pointer'};
               opacity: {isFuture ? 0.35 : 1};
               position: relative; overflow: hidden;
               transition: background var(--t-normal) var(--ease-out),
                           transform var(--t-quick) var(--ease-spring),
                           box-shadow var(--t-normal) var(--ease-spring);
               transform: scale({pressed ? 0.86 : 1});
               box-shadow: {done
          ? '0 4px 12px var(--accent-glow)'
          : 'inset 0 0 0 1.5px var(--line-strong)'};"
      >
        {#if habit.type === 'counter' && !done && count > 0}
          <span
            aria-hidden="true"
            style="position: absolute; left: 0; right: 0; bottom: 0;
                   height: max(6px, {fillPct}%);
                   background: var(--accent);
                   transition: height var(--t-emphasized) var(--ease-out);
                   pointer-events: none;"
          ></span>
        {/if}
        <span
          style="position: relative; display: flex; align-items: center; justify-content: center;
                 transform: scale({done ? 1 : 0});
                 transition: transform 280ms cubic-bezier(.2,1.6,.4,1) 60ms;"
        >
          <IconCheck class="h-4 w-4" />
        </span>
      </button>

      <!-- Name (clickable when notes exist) -->
      {#if habit.notes}
        <button
          type="button"
          onclick={() => (expanded = !expanded)}
          aria-expanded={expanded}
          aria-controls="habit-notes-{habit.id}"
          style="flex: 1; min-width: 0; text-align: left;
                 background: transparent; border: 0; padding: 0;
                 cursor: pointer;
                 display: flex; align-items: center; gap: 6px;"
        >
          <span
            title={habit.name}
            style="font-family: var(--font-body); font-size: var(--fs-input); font-weight: 500;
                   color: var(--ink); opacity: {done ? 0.55 : 1};
                   transition: all 200ms;
                   overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
          >
            {habit.name}
          </span>
          <span
            aria-hidden="true"
            style="display: inline-flex; align-items: center; color: var(--ink-faint);
                   flex-shrink: 0; opacity: 0.75;"
          >
            <IconChevron dir={expanded ? 'up' : 'down'} class="h-3 w-3" />
          </span>
        </button>
      {:else}
        <span
          title={habit.name}
          style="flex: 1; min-width: 0;
                 font-family: var(--font-body); font-size: var(--fs-input); font-weight: 500;
                 color: var(--ink); opacity: {done ? 0.55 : 1};
                 transition: all 200ms;
                 overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
        >
          {habit.name}
        </span>
      {/if}

      <!-- Counter ± controls -->
      {#if habit.type === 'counter'}
        <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
          <button
            type="button"
            onclick={dec}
            disabled={isFuture || count === 0}
            aria-label={`Decrease ${habit.name} by ${habit.counter.step}${unitSuffix}`}
            style="width: 38px; height: 28px; border: 0; background: transparent; padding: 0 5px;
                   color: var(--ink-muted); cursor: pointer;
                   display: flex; align-items: center; justify-content: center;
                   opacity: {isFuture || count === 0 ? 0.3 : 1};"
          >
            <span
              style="width: 28px; height: 28px; border-radius: var(--r-sm);
                     background: var(--surface-2);
                     display: flex; align-items: center; justify-content: center;"
            >
              <IconMinus class="h-3.5 w-3.5" />
            </span>
          </button>
          <span
            aria-live="polite"
            style="display: inline-flex; flex-direction: column; align-items: center;
                   padding: 0 6px; text-align: center; min-width: 60px; line-height: 1;"
          >
            <span
              style="font-family: var(--font-display); font-size: 12px; font-weight: 600;
                     color: var(--ink); font-variant-numeric: tabular-nums;"
            >
              {count}<span style="color: var(--ink-faint); font-weight: 500;">/{target}</span>
            </span>
            {#if habit.counter.unit}
              <span
                style="margin-top: 2px; font-size: 10px; font-weight: 500; color: var(--ink-faint);
                       text-transform: lowercase; letter-spacing: 0.3px;"
              >
                {habit.counter.unit}
              </span>
            {/if}
          </span>
          <button
            type="button"
            onclick={inc}
            disabled={isFuture}
            aria-label={`Increase ${habit.name} by ${habit.counter.step}${unitSuffix}`}
            style="width: 38px; height: 28px; border: 0; background: transparent; padding: 0 5px;
                   color: var(--ink-muted); cursor: pointer;
                   display: flex; align-items: center; justify-content: center;
                   opacity: {isFuture ? 0.3 : 1};"
          >
            <span
              style="width: 28px; height: 28px; border-radius: var(--r-sm);
                     background: var(--surface-2);
                     display: flex; align-items: center; justify-content: center;"
            >
              <IconPlus class="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      {/if}

      <!-- Edit grip (also drag handle via SortableJS delay-on-touch) -->
      <button
        type="button"
        class="drag-handle"
        onclick={() => onEdit(habit)}
        aria-label={`Edit ${habit.name}`}
        style="width: var(--card-ctrl); height: var(--card-ctrl); border: 0; background: transparent; padding: 0;
               color: var(--ink-faint); cursor: pointer; flex-shrink: 0;
               display: flex; align-items: center; justify-content: center;
               border-radius: var(--r-pill);
               touch-action: none;
               transition: background var(--t-quick) var(--ease-out),
                           color var(--t-quick) var(--ease-out);"
        onmouseenter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-muted)';
        }}
        onmouseleave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)';
        }}
      >
        <IconGrip class="h-4 w-4" />
      </button>
    </div>

    {#if expanded && habit.notes}
      <div
        id="habit-notes-{habit.id}"
        transition:slide={{ duration: 200 }}
        style="padding: 0 var(--card-pad) var(--card-pad) calc(var(--card-pad) + var(--card-ctrl) + var(--card-gap));
               font-size: var(--fs-body); color: var(--ink-muted);
               white-space: pre-wrap; line-height: 1.5;"
      >
        {habit.notes}
      </div>
    {/if}
  </div>
</div>
