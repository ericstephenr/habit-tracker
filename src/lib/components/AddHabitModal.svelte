<script lang="ts">
  import { tick } from 'svelte';
  import type { DayOfWeek, Habit } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { DAY_LETTERS, DAY_NAMES, normalizeDays } from '$lib/schedule';
  import { selectedDate } from '$lib/selectedDate.svelte';
  import Modal from './Modal.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { open = $bindable(false), habit }: { open?: boolean; habit?: Habit } = $props();

  let name = $state('');
  let selectedDays = $state<DayOfWeek[]>([0, 1, 2, 3, 4, 5, 6]);
  let startDate = $state('');
  let inputEl: HTMLInputElement | null = $state(null);
  let interacted = $state(false);
  let saveError = $state('');
  let confirmDeletionOpen = $state(false);
  let pendingDeleteCount = $state(0);
  let pendingNewStartDate = $state('');

  $effect(() => {
    if (!open) return;
    if (habit) {
      name = habit.name;
      selectedDays = [...habit.schedule.days];
      startDate = habit.startDate;
    } else {
      name = '';
      selectedDays = [0, 1, 2, 3, 4, 5, 6];
      startDate = selectedDate.value;
    }
    interacted = false;
    saveError = '';
    confirmDeletionOpen = false;
    tick().then(() => inputEl?.focus());
  });

  function toggleDay(d: DayOfWeek) {
    interacted = true;
    if (selectedDays.includes(d)) {
      selectedDays = selectedDays.filter((x) => x !== d);
    } else {
      selectedDays = normalizeDays([...selectedDays, d]);
    }
  }

  function selectAll() {
    interacted = true;
    selectedDays = [0, 1, 2, 3, 4, 5, 6];
  }

  function close() {
    open = false;
  }

  function commitEdit(newStartDate: string) {
    if (!habit) return;
    const ok = store.updateHabit(habit.id, {
      name: name.trim(),
      schedule: { type: 'weekly_days', days: normalizeDays(selectedDays) },
      startDate: newStartDate
    });
    if (!ok) {
      saveError = 'This habit no longer exists. Close and reopen the app.';
      return;
    }
    close();
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed || selectedDays.length === 0 || !startDate) return;
    if (habit) {
      if (startDate > habit.startDate) {
        const count = store.completionsBefore(habit.id, startDate);
        if (count > 0) {
          pendingDeleteCount = count;
          pendingNewStartDate = startDate;
          confirmDeletionOpen = true;
          return;
        }
      }
      commitEdit(startDate);
    } else {
      store.addHabit(trimmed, selectedDays, startDate);
      close();
    }
  }

  function onInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') save();
  }

  let canSave = $derived(name.trim().length > 0 && selectedDays.length > 0 && startDate.length > 0);
  let title = $derived(habit ? 'Edit habit' : 'New habit');
  let errorMessage = $derived.by(() => {
    if (!interacted || canSave) return '';
    if (name.trim().length === 0) return 'Add a habit name.';
    if (startDate.length === 0) return 'Pick a start date.';
    if (selectedDays.length === 0) return 'Pick at least one day.';
    return '';
  });
</script>

<Modal bind:open labelledby="habit-modal-title">
  <h2 id="habit-modal-title" class="mb-4 text-lg font-semibold text-slate-900">{title}</h2>

  <label class="block">
    <span class="text-sm font-medium text-slate-700">Name</span>
    <input
      bind:this={inputEl}
      type="text"
      bind:value={name}
      oninput={() => (interacted = true)}
      onkeydown={onInputKey}
      placeholder="e.g. Read 20 minutes"
      aria-invalid={interacted && name.trim().length === 0}
      aria-describedby="habit-modal-error"
      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-200"
    />
  </label>

  <label class="mt-4 block">
    <span class="text-sm font-medium text-slate-700">Start date</span>
    <input
      type="date"
      bind:value={startDate}
      oninput={() => (interacted = true)}
      required
      aria-invalid={interacted && startDate.length === 0}
      aria-describedby="habit-modal-error"
      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-200"
    />
  </label>

  <div class="mt-4">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-slate-700">Days</span>
      <button
        type="button"
        onclick={selectAll}
        class="text-xs font-medium text-teal-700 hover:underline">Every day</button
      >
    </div>
    <div class="mt-2 flex gap-1">
      {#each DAY_LETTERS as letter, i (i)}
        {@const day = i as DayOfWeek}
        {@const active = selectedDays.includes(day)}
        <button
          type="button"
          onclick={() => toggleDay(day)}
          aria-pressed={active}
          aria-label={DAY_NAMES[i]}
          class="flex h-9 flex-1 items-center justify-center rounded-lg text-sm font-medium transition {active
            ? 'bg-teal-500 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">{letter}</button
        >
      {/each}
    </div>
  </div>

  <p id="habit-modal-error" class="mt-3 min-h-[1.25rem] text-xs text-rose-600" aria-live="polite">
    {saveError || errorMessage}
  </p>

  <div class="mt-3 flex justify-end gap-2">
    <button
      type="button"
      onclick={close}
      class="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >Cancel</button
    >
    <button
      type="button"
      onclick={save}
      disabled={!canSave}
      class="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >{habit ? 'Save' : 'Add'}</button
    >
  </div>
</Modal>

<ConfirmDialog
  bind:open={confirmDeletionOpen}
  title="Delete completion history?"
  body={`Moving the start date to ${pendingNewStartDate} will permanently delete ${pendingDeleteCount} completion${pendingDeleteCount === 1 ? '' : 's'} from before that date.`}
  confirmLabel="Delete & save"
  danger
  onConfirm={() => commitEdit(pendingNewStartDate)}
/>
