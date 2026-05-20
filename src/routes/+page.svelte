<script lang="ts">
  import type { Habit } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { formatTodayHeader, todayISO } from '$lib/schedule';
  import { readBackup } from '$lib/storage';
  import { currentDate } from '$lib/currentDate.svelte';
  import HabitItem from '$lib/components/HabitItem.svelte';
  import AddHabitModal from '$lib/components/AddHabitModal.svelte';
  import IconPlus from '$lib/components/icons/IconPlus.svelte';

  let modalOpen = $state(false);
  let editingHabit = $state<Habit | undefined>(undefined);

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
  <title>Today · Habit Tracker</title>
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
      <div>
        <p class="text-xs tracking-wide text-slate-500 uppercase">Today</p>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
          {formatTodayHeader(currentDate.value)}
        </h1>
      </div>
      {#if store.totalCount > 0}
        <span
          class="inline-flex items-baseline gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
        >
          <span class="text-slate-900">{store.doneCount}</span>
          <span class="text-slate-400">/ {store.totalCount}</span>
        </span>
      {/if}
    </div>

    {#if store.totalCount > 0}
      <div
        class="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
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
    {/if}
  </header>

  {#if store.dueToday.length > 0}
    <ul class="space-y-2">
      {#each store.dueToday as habit (habit.id)}
        <li>
          <HabitItem {habit} onEdit={openEdit} />
        </li>
      {/each}
    </ul>
  {:else if store.hasAnyHabit}
    <div
      class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
    >
      No habits scheduled for today. Enjoy a rest day, or
      <button type="button" onclick={openAdd} class="font-medium text-teal-700 hover:underline"
        >add another habit</button
      >.
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
