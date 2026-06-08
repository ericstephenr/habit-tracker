<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Habit } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { calcStreak } from '$lib/streaks';
  import { effectiveTarget, isLimit } from '$lib/schedule';
  import { currentDate } from '$lib/currentDate.svelte';
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
  let isCounterGoal = $derived(habit.type === 'counter' && !limit);
  let overrideValue = $derived(
    habit.type === 'counter' ? store.getTargetOverride(habit.id, date) : undefined
  );
  let scheduledTarget = $derived(habit.type === 'counter' ? effectiveTarget(habit, date) : 0);
  let target = $derived(habit.type === 'counter' ? effectiveTarget(habit, date, overrideValue) : 0);
  let count = $derived(habit.type === 'counter' ? store.getCount(habit.id, date) : 0);
  let breach = $derived(limit && count > target && !done);
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
  let currentState = $derived<'incomplete' | 'complete' | 'skipped' | 'failed'>(
    failed ? 'failed' : skipped ? 'skipped' : done ? 'complete' : 'incomplete'
  );
  let rowState = $derived(done ? 'done' : currentState);
  let priColor = $derived(
    habit.priority === 'high'
      ? 'var(--pri-high)'
      : habit.priority === 'med'
        ? 'var(--pri-med)'
        : habit.priority === 'low'
          ? 'var(--pri-low)'
          : null
  );

  function handleCheck() {
    if (isFuture) return;
    if (skipped || failed) {
      store.setCompletionState(habit.id, date, 'complete');
      return;
    }
    if (habit.type === 'binary') {
      store.toggleCompletion(habit.id, date);
    } else if (limit) {
      store.setCompletionState(habit.id, date, done ? 'incomplete' : 'complete');
    } else {
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
    if (isFuture || e.button !== 0) return;
    longPressFired = false;
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      if (menuOpen) return;
      longPressFired = true;
      openMenuBelowCheckbox();
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onCheckboxClick(e: MouseEvent) {
    if (longPressFired) {
      longPressFired = false;
      e.preventDefault();
      return;
    }
    handleCheck();
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

<div class="habit-wrap">
  <div class="row" data-state={rowState} data-breach={breach} data-inactive={inactive}>
    <button
      type="button"
      class="check"
      class:circle={isCounterGoal}
      bind:this={checkboxEl}
      data-on={currentState === 'incomplete' ? undefined : rowState}
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
    >
      {#if failed}
        <IconCross />
      {:else if skipped}
        <IconSkip />
      {:else if done}
        <IconCheck />
      {/if}
    </button>

    <div class="name-wrap">
      {#if habit.notes}
        <button
          type="button"
          class="name-btn"
          onclick={() => (expanded = !expanded)}
          aria-expanded={expanded}
        >
          <span class="name" title={habit.name}>{habit.name}</span>
          <span aria-hidden="true" style="display: inline-flex; color: var(--ink-faint);">
            <IconChevron dir={expanded ? 'up' : 'down'} class="h-3 w-3" />
          </span>
        </button>
      {:else}
        <span class="name" title={habit.name}>{habit.name}</span>
      {/if}
      {#if streak > 0 || limit}
        <div class="meta">
          {#if streak > 0}<span class="streak">{streak}-day streak</span>{/if}
          {#if limit}<span class="limit-tag">{breach ? 'over limit' : 'under limit'}</span>{/if}
        </div>
      {/if}
    </div>

    {#if habit.type === 'counter'}
      <div class="counter">
        <button
          type="button"
          class="step"
          onclick={dec}
          disabled={isFuture || count === 0}
          aria-label={`Decrease ${habit.name}`}><IconMinus /></button
        >
        <span class="counter-val" aria-live="polite">
          {count}<span class="target"
            >/<button
              type="button"
              class="target-btn"
              onclick={onTargetClick}
              disabled={isFuture}
              title={overrideValue != null
                ? `Target overridden for this day (scheduled: ${scheduledTarget})`
                : 'Tap to set a one-day target override'}
              >{target}{#if overrideValue != null}<span
                  class="target-override-dot"
                  aria-hidden="true">·</span
                >{/if}</button
            >{habit.counter.unit ? ` ${habit.counter.unit}` : ''}</span
          >
        </span>
        <button
          type="button"
          class="step"
          onclick={inc}
          disabled={isFuture}
          aria-label={`Increase ${habit.name}`}><IconPlus /></button
        >
      </div>
    {/if}

    {#if priColor}
      <span
        class="pri"
        role="img"
        aria-label={`${habit.priority} priority`}
        title={`${habit.priority} priority`}
        style="background: {priColor};"
      ></span>
    {/if}

    <button
      type="button"
      class="grip drag-handle"
      onclick={() => onEdit(habit)}
      aria-label={`Edit ${habit.name}`}
    >
      <IconKebab />
    </button>
  </div>

  {#if expanded && habit.notes}
    <div class="note-body-inline" transition:slide={{ duration: 180 }}>{habit.notes}</div>
  {/if}
</div>

<HabitStateMenu
  bind:open={menuOpen}
  anchor={menuAnchor}
  {currentState}
  onSelect={(next) => store.setCompletionState(habit.id, date, next)}
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
