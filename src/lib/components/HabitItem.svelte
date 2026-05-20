<script lang="ts">
  import type { Habit } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { calcStreak } from '$lib/streaks';
  import { currentDate } from '$lib/currentDate.svelte';
  import { menuState } from '$lib/menuState.svelte';
  import StreakBadge from './StreakBadge.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconKebab from './icons/IconKebab.svelte';

  let { habit, onEdit, date }: { habit: Habit; onEdit: (h: Habit) => void; date: string } =
    $props();

  let isFuture = $derived(date > currentDate.value);
  let done = $derived(store.isDone(habit.id, date));
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

<div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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

  <span class="min-w-0 flex-1 truncate {done ? 'text-slate-400 line-through' : 'text-slate-900'}"
    >{habit.name}</span
  >

  <StreakBadge {streak} />

  <div class="relative" bind:this={menuRef}>
    <button
      bind:this={kebabRef}
      type="button"
      onclick={toggleMenu}
      aria-label="Habit options"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
    >
      <IconKebab class="h-5 w-5" />
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

<ConfirmDialog
  bind:open={confirmOpen}
  title="Delete habit?"
  body={`This permanently removes "${habit.name}" and all of its completion history.`}
  confirmLabel="Delete"
  danger
  onConfirm={() => store.deleteHabit(habit.id)}
/>
