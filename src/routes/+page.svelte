<script lang="ts">
  import type { Habit } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { formatDateHeader, formatWeekday, todayISO } from '$lib/schedule';
  import { readBackup } from '$lib/storage';
  import { selectedDate } from '$lib/selectedDate.svelte';
  import HabitItem from '$lib/components/HabitItem.svelte';
  import AddHabitModal from '$lib/components/AddHabitModal.svelte';
  import IconPlus from '$lib/components/icons/IconPlus.svelte';
  import IconGrip from '$lib/components/icons/IconGrip.svelte';
  import IconChevronLeft from '$lib/components/icons/IconChevronLeft.svelte';
  import IconChevronRight from '$lib/components/icons/IconChevronRight.svelte';
  import Sortable from 'sortablejs';

  let modalOpen = $state(false);
  let editingHabit = $state<Habit | undefined>(undefined);
  let ulRef: HTMLUListElement | undefined = $state();

  $effect(() => {
    if (!ulRef) return;
    const s = Sortable.create(ulRef, {
      animation: 150,
      handle: '.drag-handle',
      onEnd(evt) {
        if (evt.oldIndex === evt.newIndex) return;
        const ids = [...ulRef!.querySelectorAll<HTMLElement>('[data-id]')].map(
          (el) => el.dataset.id!
        );
        store.reorderHabits(ids);
      }
    });
    return () => s.destroy();
  });

  let overline = $derived(selectedDate.isToday ? 'Today' : selectedDate.isPast ? 'Past' : 'Future');

  function openAdd() {
    editingHabit = undefined;
    modalOpen = true;
  }

  function openEdit(h: Habit) {
    editingHabit = h;
    modalOpen = true;
  }

  function downloadBackup() {
    const raw = readBackup();
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>{overline} · Habit Tracker</title>
</svelte:head>

<main class="mx-auto min-h-svh max-w-md px-4 pt-8 pb-[calc(8rem+env(safe-area-inset-bottom))]">
  {#if store.recoveryNotice}
    <div
      role="status"
      class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <p class="mb-2">
        Your habit data couldn't be read and was reset. A backup of the raw data is saved locally.
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          onclick={downloadBackup}
          class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >Download backup</button
        >
        <button
          type="button"
          onclick={() => store.dismissRecoveryNotice()}
          class="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >Dismiss</button
        >
      </div>
    </div>
  {/if}

  <header class="mb-6">
    <div class="flex items-end justify-between">
      <p class="text-xs tracking-wide text-slate-500 uppercase">{overline}</p>
      <span
        aria-hidden={store.totalCount === 0}
        class="inline-flex items-baseline gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 {store.totalCount ===
        0
          ? 'invisible'
          : ''}"
      >
        <span class="text-slate-900">{store.doneCount}</span>
        <span class="text-slate-400">/ {store.totalCount}</span>
      </span>
    </div>

    <div class="mt-1 flex items-center justify-between gap-2">
      <button
        type="button"
        onclick={() => selectedDate.goPrev()}
        aria-label="Previous day"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <IconChevronLeft class="h-5 w-5" />
      </button>
      <h1 class="flex-1 text-center text-2xl font-semibold tracking-tight text-slate-900">
        {formatDateHeader(selectedDate.value)}
      </h1>
      <button
        type="button"
        onclick={() => selectedDate.goNext()}
        aria-label="Next day"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <IconChevronRight class="h-5 w-5" />
      </button>
    </div>

    <div class="mt-2 flex justify-center">
      <button
        type="button"
        onclick={() => selectedDate.goToday()}
        aria-hidden={selectedDate.isToday}
        tabindex={selectedDate.isToday ? -1 : 0}
        class="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 {selectedDate.isToday
          ? 'invisible'
          : ''}">Jump to today</button
      >
    </div>

    <div
      class="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 {store.totalCount === 0
        ? 'invisible'
        : ''}"
      role="progressbar"
      aria-hidden={store.totalCount === 0}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={store.progressPct}
      aria-label="{store.doneCount} of {store.totalCount} habits complete"
    >
      <div
        class="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-[width] duration-300"
        style="width: {store.progressPct}%"
      ></div>
    </div>
  </header>

  {#if store.dueHabits.length > 0}
    <ul bind:this={ulRef} class="space-y-2">
      {#each store.dueHabits as habit (habit.id)}
        <li data-id={habit.id} class="flex items-center gap-2">
          <IconGrip class="drag-handle h-5 w-5 shrink-0 cursor-grab touch-none text-slate-300" />
          <div class="min-w-0 flex-1">
            <HabitItem {habit} date={selectedDate.value} onEdit={openEdit} />
          </div>
        </li>
      {/each}
    </ul>
  {:else if store.hasAnyHabit}
    <div
      class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
    >
      No habits scheduled for {formatWeekday(selectedDate.value)}.
      {#if selectedDate.isToday}
        Enjoy a rest day, or
        <button type="button" onclick={openAdd} class="font-medium text-teal-700 hover:underline"
          >add another habit</button
        >.
      {/if}
    </div>
  {:else}
    <div class="rounded-xl border border-dashed border-slate-300 p-8 text-center">
      <p class="mb-1 text-base font-medium text-slate-800">No habits yet</p>
      <p class="mb-4 text-sm text-slate-500">Add your first habit to start tracking.</p>
      <button
        type="button"
        onclick={openAdd}
        class="inline-flex items-center gap-1 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >+ Add habit</button
      >
    </div>
  {/if}
</main>

<button
  type="button"
  onclick={openAdd}
  aria-label="Add habit"
  class="fixed right-[calc(1.5rem+env(safe-area-inset-right))] bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/30 transition hover:bg-teal-700 active:scale-95"
>
  <IconPlus class="h-7 w-7" />
</button>

<AddHabitModal bind:open={modalOpen} habit={editingHabit} />
