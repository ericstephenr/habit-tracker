<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Habit } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { calcStreak } from '$lib/streaks';
  import { effectiveTarget } from '$lib/schedule';
  import { currentDate } from '$lib/currentDate.svelte';
  import { menuState } from '$lib/menuState.svelte';
  import StreakBadge from './StreakBadge.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconGrip from './icons/IconGrip.svelte';
  import IconMinus from './icons/IconMinus.svelte';
  import IconPlus from './icons/IconPlus.svelte';

  let { habit, onEdit, date }: { habit: Habit; onEdit: (h: Habit) => void; date: string } =
    $props();

  let expanded = $state(false);

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
  let menuOpen = $derived(menuState.isOpen(habit.id));
  let menuRef: HTMLDivElement | null = $state(null);
  let kebabRef: HTMLButtonElement | null = $state(null);
  let confirmOpen = $state(false);

  function toggle() {
    if (isFuture) return;
    store.toggleCompletion(habit.id, date);
  }

  function inc() {
    if (isFuture || habit.type !== 'counter') return;
    store.setCount(habit.id, date, count + habit.counter.step);
  }

  function dec() {
    if (isFuture || habit.type !== 'counter') return;
    store.setCount(habit.id, date, Math.max(0, count - habit.counter.step));
  }

  function toggleMenu() {
    if (menuOpen) menuState.close();
    else menuState.open(habit.id);
  }

  function handleEdit() {
    // Restore focus to the kebab before unmounting the menu, so the modal's
    // <dialog>.showModal() captures kebab as the trigger and returns focus there on close.
    kebabRef?.focus();
    menuState.close();
    onEdit(habit);
  }

  function handleDelete() {
    kebabRef?.focus();
    menuState.close();
    confirmOpen = true;
  }

  $effect(() => {
    if (!habit.notes) expanded = false;
  });

  $effect(() => {
    if (!menuOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (menuRef && !menuRef.contains(e.target as Node)) menuState.close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') menuState.close();
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
  <div class="flex items-center gap-3 p-3">
    {#if habit.type === 'binary'}
      <button
        type="button"
        onclick={toggle}
        disabled={isFuture}
        aria-pressed={done}
        aria-label={isFuture
          ? `Cannot mark ${habit.name} in the future`
          : done
            ? `Mark ${habit.name} not done`
            : `Mark ${habit.name} done`}
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition {done
          ? 'border-teal-500 bg-teal-500 text-white'
          : 'border-slate-300 bg-white text-transparent'} {isFuture
          ? 'cursor-not-allowed opacity-40'
          : done
            ? ''
            : 'hover:border-slate-400'}"
      >
        <IconCheck class="h-4 w-4" />
      </button>
    {:else}
      <div
        aria-hidden="true"
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition {done
          ? 'border-teal-500 bg-teal-500 text-white'
          : 'border-slate-300 bg-white text-transparent'} {isFuture ? 'opacity-40' : ''}"
      >
        <IconCheck class="h-4 w-4" />
      </div>
    {/if}

    {#if habit.notes}
      <button
        type="button"
        onclick={() => (expanded = !expanded)}
        aria-expanded={expanded}
        aria-controls="habit-notes-{habit.id}"
        class="group flex min-w-0 flex-1 items-center gap-1.5 rounded text-left focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:outline-none"
      >
        <span
          class="min-w-0 truncate group-hover:underline {done
            ? 'text-slate-400 line-through'
            : 'text-slate-900'}">{habit.name}</span
        >
        <span aria-hidden="true" class="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"></span>
      </button>
    {:else}
      <span
        class="min-w-0 flex-1 truncate {done ? 'text-slate-400 line-through' : 'text-slate-900'}"
        >{habit.name}</span
      >
    {/if}

    {#if habit.type === 'counter'}
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onclick={dec}
          disabled={isFuture || count === 0}
          aria-label={`Decrease ${habit.name} by ${habit.counter.step}${unitSuffix}`}
          class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconMinus class="h-3 w-3" />
        </button>
        <span
          aria-live="polite"
          class="min-w-[3.5rem] px-1 text-center text-xs tabular-nums {done
            ? 'font-semibold text-teal-700'
            : 'text-slate-600'}">{count}/{target}{unitSuffix}</span
        >
        <button
          type="button"
          onclick={inc}
          disabled={isFuture}
          aria-label={`Increase ${habit.name} by ${habit.counter.step}${unitSuffix}`}
          class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconPlus class="h-3 w-3" />
        </button>
      </div>
    {/if}

    <StreakBadge {streak} />

    <div class="relative" bind:this={menuRef}>
      <button
        bind:this={kebabRef}
        type="button"
        onclick={toggleMenu}
        aria-label="Habit options, drag to reorder"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        class="drag-handle flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <IconGrip class="h-5 w-5" />
      </button>
      {#if menuOpen}
        <div
          role="menu"
          class="absolute top-9 right-0 z-20 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onclick={handleEdit}
            class="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">Edit</button
          >
          <button
            type="button"
            role="menuitem"
            onclick={handleDelete}
            class="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >Delete</button
          >
        </div>
      {/if}
    </div>
  </div>
  {#if expanded && habit.notes}
    <div
      id="habit-notes-{habit.id}"
      transition:slide={{ duration: 150 }}
      class="px-3 pb-3 pl-12 text-sm whitespace-pre-wrap text-slate-600"
    >
      {habit.notes}
    </div>
  {/if}
</div>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Delete habit?"
  body={`This permanently removes "${habit.name}" and all of its completion history.`}
  confirmLabel="Delete"
  danger
  onConfirm={() => store.deleteHabit(habit.id)}
/>
