<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Habit } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { calcStreak } from '$lib/streaks';
  import { effectiveTarget, isLimit } from '$lib/schedule';
  import { currentDate } from '$lib/currentDate.svelte';
  import StreakCorner from './StreakCorner.svelte';
  import HabitStateMenu from './HabitStateMenu.svelte';
  import TargetOverridePopover from './TargetOverridePopover.svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconKebab from './icons/IconKebab.svelte';
  import IconMinus from './icons/IconMinus.svelte';
  import IconPlus from './icons/IconPlus.svelte';
  import IconChevron from './icons/IconChevron.svelte';
  import IconSkip from './icons/IconSkip.svelte';
  import IconCross from './icons/IconCross.svelte';

  let {
    habit,
    onEdit,
    date,
    inactive = false
  }: { habit: Habit; onEdit: (h: Habit) => void; date: string; inactive?: boolean } = $props();

  let expanded = $state(false);
  let pressed = $state(false);
  let menuOpen = $state(false);
  let menuAnchor = $state<{ x: number; y: number } | null>(null);
  let targetPopoverOpen = $state(false);
  let targetPopoverAnchor = $state<{ x: number; y: number } | null>(null);
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;
  let checkboxEl = $state<HTMLButtonElement | null>(null);

  let isFuture = $derived(date > currentDate.value);
  let done = $derived(store.isDone(habit.id, date));
  let skipped = $derived(store.isSkipped(habit.id, date));
  let failed = $derived(store.isFailed(habit.id, date));
  let limit = $derived(isLimit(habit));
  let overrideValue = $derived(
    habit.type === 'counter' ? store.getTargetOverride(habit.id, date) : undefined
  );
  let scheduledTarget = $derived(habit.type === 'counter' ? effectiveTarget(habit, date) : 0);
  let target = $derived(habit.type === 'counter' ? effectiveTarget(habit, date, overrideValue) : 0);
  let count = $derived(habit.type === 'counter' ? store.getCount(habit.id, date) : 0);
  let unitSuffix = $derived(
    habit.type === 'counter' && habit.counter.unit ? ` ${habit.counter.unit}` : ''
  );
  let streakRef = $derived(isFuture ? currentDate.value : date);
  let streak = $derived(
    calcStreak(
      habit,
      store.donesByHabit.get(habit.id),
      store.skippedByHabit.get(habit.id),
      streakRef,
      currentDate.value
    )
  );
  let fillPct = $derived(
    habit.type === 'counter' && target > 0 ? Math.min(1, count / target) * 100 : 0
  );
  let currentState = $derived<'incomplete' | 'complete' | 'skipped' | 'failed'>(
    failed ? 'failed' : skipped ? 'skipped' : done ? 'complete' : 'incomplete'
  );
  let nameOpacity = $derived(inactive ? 0.5 : skipped || failed || done ? 0.55 : 1);
  let priorityMeta = $derived(
    habit.priority === 'high'
      ? { color: 'var(--danger)', label: 'High' }
      : habit.priority === 'med'
        ? { color: 'var(--warn)', label: 'Med' }
        : habit.priority === 'low'
          ? { color: 'var(--caution)', label: 'Low' }
          : null
  );

  function handleCheck() {
    if (isFuture) return;
    if (skipped || failed) {
      // A click on a skipped/failed checkbox promotes it to complete.
      store.setCompletionState(habit.id, date, 'complete');
      return;
    }
    if (habit.type === 'binary') {
      store.toggleCompletion(habit.id, date);
    } else if (limit) {
      // Limit habits never auto-complete from their count, so a tap toggles the manual
      // "done" mark rather than setting the count to the limit (which would be a breach).
      store.setCompletionState(habit.id, date, done ? 'incomplete' : 'complete');
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

  function openMenuAt(x: number, y: number) {
    if (isFuture) return;
    menuAnchor = { x, y };
    menuOpen = true;
  }

  function openMenuBelowCheckbox() {
    if (!checkboxEl || isFuture) return;
    const rect = checkboxEl.getBoundingClientRect();
    openMenuAt(rect.left + rect.width / 2, rect.bottom + 6);
  }

  function onCheckboxContextMenu(e: MouseEvent) {
    if (isFuture) return;
    e.preventDefault();
    if (menuOpen) return;
    openMenuAt(e.clientX, e.clientY);
  }

  function onCheckboxPointerDown(e: PointerEvent) {
    if (isFuture) return;
    if (e.button !== 0) return;
    pressed = true;
    longPressFired = false;
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      if (menuOpen) return;
      longPressFired = true;
      pressed = false;
      openMenuBelowCheckbox();
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    pressed = false;
  }

  function onCheckboxClick(e: MouseEvent) {
    if (longPressFired) {
      longPressFired = false;
      e.preventDefault();
      return;
    }
    handleCheck();
  }

  function onCaretClick(e: MouseEvent) {
    e.stopPropagation();
    openMenuBelowCheckbox();
  }

  function onStateSelect(next: 'incomplete' | 'complete' | 'skipped' | 'failed') {
    store.setCompletionState(habit.id, date, next);
  }

  function onTargetClick(e: MouseEvent) {
    if (isFuture) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    targetPopoverAnchor = { x: rect.left + rect.width / 2, y: rect.bottom + 6 };
    targetPopoverOpen = true;
  }

  $effect(() => {
    if (!habit.notes) expanded = false;
  });
</script>

<div style="position: relative;">
  <StreakCorner {streak} />

  <div
    class="ht-card"
    style="background: {inactive
      ? 'var(--surface-2)'
      : failed
        ? 'var(--danger-fill)'
        : skipped
          ? 'var(--surface-2)'
          : done
            ? 'var(--accent-fill)'
            : 'var(--surface)'}; border-radius: var(--r-lg);
           border: {inactive
      ? '1.5px dashed var(--line-strong)'
      : failed
        ? '1px solid var(--danger-border)'
        : skipped
          ? '1px solid var(--line-strong)'
          : done
            ? '1px solid var(--accent-soft)'
            : '1px solid var(--line)'};
           box-shadow: var(--shadow-1);
           overflow: hidden; position: relative;
           transition: background var(--t-normal) var(--ease-out),
                       border-color var(--t-normal) var(--ease-out),
                       box-shadow var(--t-normal) var(--ease-out);"
  >
    <div
      style="display: flex; align-items: center; gap: var(--card-gap); padding: var(--card-pad);"
    >
      <!-- Checkbox: binary = rounded square; counter = circle with water-fill -->
      <div class="checkbox-with-caret" style="position: relative; flex-shrink: 0;">
        <button
          type="button"
          bind:this={checkboxEl}
          onclick={onCheckboxClick}
          oncontextmenu={onCheckboxContextMenu}
          onpointerdown={onCheckboxPointerDown}
          onpointerup={cancelLongPress}
          onpointerleave={cancelLongPress}
          onpointercancel={cancelLongPress}
          disabled={isFuture}
          aria-pressed={done}
          aria-label={isFuture
            ? `Cannot mark ${habit.name} in the future`
            : failed
              ? `${habit.name} is failed — click to mark done, right-click for options`
              : skipped
                ? `${habit.name} is skipped — click to mark done, right-click for options`
                : done
                  ? `Mark ${habit.name} not done`
                  : `Mark ${habit.name} done`}
          style="width: var(--card-ctrl); height: var(--card-ctrl);
                 border-radius: {habit.type === 'counter' ? '9999px' : 'var(--r-sm)'};
                 flex-shrink: 0; border: 0; padding: 0;
                 background: {failed
            ? 'var(--danger)'
            : skipped
              ? 'var(--ink-faint)'
              : done
                ? 'var(--accent)'
                : 'var(--surface-2)'};
                 color: {failed || skipped || done ? 'var(--accent-on)' : 'transparent'};
                 display: flex; align-items: center; justify-content: center;
                 cursor: {isFuture ? 'not-allowed' : 'pointer'};
                 opacity: {isFuture ? 0.35 : 1};
                 position: relative; overflow: hidden;
                 touch-action: manipulation;
                 transition: background var(--t-normal) var(--ease-out),
                             transform var(--t-quick) var(--ease-spring),
                             box-shadow var(--t-normal) var(--ease-spring);
                 transform: scale({pressed ? 0.86 : 1});
                 box-shadow: {done
            ? '0 4px 12px var(--accent-glow)'
            : skipped || failed
              ? 'none'
              : 'inset 0 0 0 1.5px var(--line-strong)'};"
        >
          {#if habit.type === 'counter' && !done && count > 0}
            <span
              aria-hidden="true"
              style="position: absolute; left: 0; right: 0; bottom: 0;
                     height: max(6px, {fillPct}%);
                     background: {limit ? 'var(--danger)' : 'var(--accent)'};
                     opacity: {skipped || failed ? 0.35 : 1};
                     transition: height var(--t-emphasized) var(--ease-out),
                                 opacity var(--t-normal) var(--ease-out);
                     pointer-events: none;"
            ></span>
          {/if}
          {#if failed}
            <span
              style="position: relative; display: flex; align-items: center; justify-content: center;
                     transform: scale(1);
                     transition: transform 280ms cubic-bezier(.2,1.6,.4,1) 60ms;"
            >
              <IconCross class="h-4 w-4" />
            </span>
          {:else if skipped}
            <span
              style="position: relative; display: flex; align-items: center; justify-content: center;
                     transform: scale(1);
                     transition: transform 280ms cubic-bezier(.2,1.6,.4,1) 60ms;"
            >
              <IconSkip class="h-4 w-4" />
            </span>
          {:else}
            <span
              style="position: relative; display: flex; align-items: center; justify-content: center;
                     transform: scale({done ? 1 : 0});
                     transition: transform 280ms cubic-bezier(.2,1.6,.4,1) 60ms;"
            >
              <IconCheck class="h-4 w-4" />
            </span>
          {/if}
        </button>
        {#if !isFuture}
          <button
            type="button"
            class="state-caret"
            onclick={onCaretClick}
            aria-label={`Open state menu for ${habit.name}`}
            tabindex="-1"
          >
            <IconChevron dir="down" class="h-2.5 w-2.5" />
          </button>
        {/if}
      </div>

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
                   color: var(--ink); opacity: {nameOpacity};
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
                 color: var(--ink); opacity: {nameOpacity};
                 transition: all 200ms;
                 overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
        >
          {habit.name}
        </span>
      {/if}

      <!-- Counter ± controls — unified pill -->
      {#if habit.type === 'counter'}
        <div
          style="display: flex; align-items: center; flex-shrink: 0;
                 background: var(--surface-2); border-radius: 9999px; padding: 3px;"
        >
          <button
            type="button"
            onclick={dec}
            disabled={isFuture || count === 0}
            aria-label={`Decrease ${habit.name} by ${habit.counter.step}${unitSuffix}`}
            style="width: var(--counter-btn); height: var(--counter-btn); border: 0; padding: 0;
                   background: transparent; border-radius: 9999px;
                   color: var(--ink-muted); cursor: pointer;
                   display: flex; align-items: center; justify-content: center;
                   opacity: {isFuture || count === 0 ? 0.35 : 1};
                   transition: opacity var(--t-quick) var(--ease-out);"
          >
            <IconMinus class="h-3.5 w-3.5" />
          </button>
          <span
            aria-live="polite"
            style="padding: 0 8px; min-width: 56px; text-align: center;
                   display: inline-flex; flex-direction: column; align-items: center; line-height: 1;"
          >
            <span
              style="font-family: var(--font-display); font-size: var(--fs-body); font-weight: 700;
                     color: var(--ink); font-variant-numeric: tabular-nums;"
            >
              {count}<button
                type="button"
                class="target-btn"
                onclick={onTargetClick}
                disabled={isFuture}
                aria-label={overrideValue != null
                  ? `Target overridden to ${target}. Tap to edit.`
                  : `Target ${target}. Tap to set a one-day override.`}
                title={overrideValue != null
                  ? `Target overridden for this day (scheduled: ${scheduledTarget})`
                  : 'Tap to set a one-day target override'}
                >/{target}{#if overrideValue != null}<span
                    aria-hidden="true"
                    class="target-override-dot">·</span
                  >{/if}</button
              >
            </span>
            {#if habit.counter.unit}
              <span
                style="margin-top: 2px; font-size: var(--fs-overline); font-weight: 600; color: var(--ink-faint);
                       text-transform: uppercase; letter-spacing: 0.5px;"
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
            style="width: var(--counter-btn); height: var(--counter-btn); border: 0; padding: 0;
                   background: transparent; border-radius: 9999px;
                   color: var(--ink-muted); cursor: pointer;
                   display: flex; align-items: center; justify-content: center;
                   opacity: {isFuture ? 0.35 : 1};
                   transition: opacity var(--t-quick) var(--ease-out);"
          >
            <IconPlus class="h-3.5 w-3.5" />
          </button>
        </div>
      {/if}

      {#if priorityMeta}
        <span
          role="img"
          aria-label={`${priorityMeta.label} priority`}
          title={`${priorityMeta.label} priority`}
          style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
                 background: {priorityMeta.color}; opacity: {nameOpacity};
                 transition: opacity 200ms;"
        ></span>
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
        <IconKebab class="h-5 w-5" />
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

  <HabitStateMenu
    bind:open={menuOpen}
    anchor={menuAnchor}
    {currentState}
    onSelect={onStateSelect}
  />

  {#if habit.type === 'counter'}
    <TargetOverridePopover
      bind:open={targetPopoverOpen}
      anchor={targetPopoverAnchor}
      {scheduledTarget}
      currentOverride={overrideValue}
      unit={habit.counter.unit}
      onSave={(v) => store.setTargetOverride(habit.id, date, v)}
      onReset={() => store.setTargetOverride(habit.id, date, null)}
    />
  {/if}
</div>

<style>
  .state-caret {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 16px;
    height: 16px;
    border: 0;
    padding: 0;
    background: var(--surface);
    color: var(--ink-muted);
    border-radius: 50%;
    box-shadow: 0 0 0 1.5px var(--line-strong);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.8);
    transition:
      opacity 140ms var(--ease-out),
      transform 140ms var(--ease-out),
      background 140ms var(--ease-out);
    pointer-events: none;
  }
  .checkbox-with-caret:hover .state-caret,
  .state-caret:focus-visible {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
  .state-caret:hover {
    background: var(--surface-2);
    color: var(--ink);
  }
  @media (hover: none) {
    .state-caret {
      display: none;
    }
  }
  .target-btn {
    display: inline;
    background: transparent;
    border: 0;
    padding: 0 2px;
    margin: 0;
    color: var(--ink-faint);
    font: inherit;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    border-radius: 4px;
    transition: background 120ms var(--ease-out);
  }
  .target-btn:hover:not(:disabled) {
    background: var(--surface-2);
  }
  .target-btn:disabled {
    cursor: not-allowed;
  }
  .target-override-dot {
    margin-left: 2px;
    color: var(--accent);
  }
</style>
