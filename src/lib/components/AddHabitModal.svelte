<script lang="ts">
  import { tick } from 'svelte';
  import type { CounterConfig, DayOfWeek, Habit } from '$lib/types';
  import { store, type HabitPatch } from '$lib/store.svelte';
  import { DAY_LETTERS, DAY_NAMES, normalizeDays } from '$lib/schedule';
  import { selectedDate } from '$lib/selectedDate.svelte';
  import Modal from './Modal.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { open = $bindable(false), habit }: { open?: boolean; habit?: Habit } = $props();

  let name = $state('');
  let selectedDays = $state<DayOfWeek[]>([0, 1, 2, 3, 4, 5, 6]);
  let startDate = $state('');
  let notes = $state('');
  let inputEl: HTMLInputElement | null = $state(null);
  let interacted = $state(false);
  let saveError = $state('');
  let confirmDeletionOpen = $state(false);
  let pendingDeleteCount = $state(0);
  let pendingNewStartDate = $state('');

  let habitType = $state<'binary' | 'counter'>('binary');
  let target = $state<number | null>(null);
  let step = $state<number | null>(1);
  let unit = $state('');
  let perDayOn = $state(false);
  let perDayValues = $state<Record<DayOfWeek, number | null>>({
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null
  });

  $effect(() => {
    if (!open) return;
    if (habit) {
      name = habit.name;
      selectedDays = [...habit.schedule.days];
      startDate = habit.startDate;
      notes = habit.notes ?? '';
      habitType = habit.type;
      if (habit.type === 'counter') {
        step = habit.counter.step;
        unit = habit.counter.unit;
        target = habit.counter.target;
        if (habit.counter.perDayTargets) {
          perDayOn = true;
          const next: Record<DayOfWeek, number | null> = {
            0: null,
            1: null,
            2: null,
            3: null,
            4: null,
            5: null,
            6: null
          };
          for (const [k, v] of Object.entries(habit.counter.perDayTargets)) {
            next[Number(k) as DayOfWeek] = v as number;
          }
          perDayValues = next;
        } else {
          perDayOn = false;
        }
      } else {
        step = 1;
        unit = '';
        target = null;
        perDayOn = false;
      }
    } else {
      name = '';
      selectedDays = [0, 1, 2, 3, 4, 5, 6];
      startDate = selectedDate.value;
      notes = '';
      habitType = 'binary';
      target = null;
      step = 1;
      unit = '';
      perDayOn = false;
      perDayValues = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
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

  function setType(t: 'binary' | 'counter') {
    if (habit) return;
    habitType = t;
    interacted = false;
    saveError = '';
  }

  function togglePerDay() {
    interacted = true;
    perDayOn = !perDayOn;
    if (perDayOn && target != null && target > 0) {
      // Seed each day with the current single-target value so the user only edits the ones that differ.
      const next: Record<DayOfWeek, number | null> = { ...perDayValues };
      for (const d of selectedDays) {
        if (next[d] == null) next[d] = target;
      }
      perDayValues = next;
    }
  }

  function buildCounter(): CounterConfig | null {
    if (step == null || step <= 0) return null;
    if (perDayOn) {
      const perDayTargets: Partial<Record<DayOfWeek, number>> = {};
      for (const d of selectedDays) {
        const v = perDayValues[d];
        if (v == null || v <= 0) return null;
        perDayTargets[d] = v;
      }
      const fallback =
        target != null && target > 0 ? target : (perDayTargets[selectedDays[0]] ?? 1);
      return { target: fallback, step, unit, perDayTargets };
    }
    if (target == null || target <= 0) return null;
    return { target, step, unit };
  }

  function close() {
    open = false;
  }

  function commitEdit(newStartDate: string) {
    if (!habit) return;
    const patch: HabitPatch = {
      name: name.trim(),
      schedule: { type: 'weekly_days', days: normalizeDays(selectedDays) },
      startDate: newStartDate,
      notes
    };
    if (habit.type === 'counter') {
      const counter = buildCounter();
      if (!counter) return;
      patch.counter = counter;
    }
    const ok = store.updateHabit(habit.id, patch);
    if (!ok) {
      saveError = 'This habit no longer exists. Close and reopen the app.';
      return;
    }
    close();
  }

  function save() {
    interacted = true;
    if (!canSave) return;
    const trimmed = name.trim();
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
    } else if (habitType === 'counter') {
      const counter = buildCounter();
      if (!counter) return;
      store.addHabit({
        type: 'counter',
        name: trimmed,
        days: selectedDays,
        startDate,
        counter,
        notes
      });
      close();
    } else {
      store.addHabit({ type: 'binary', name: trimmed, days: selectedDays, startDate, notes });
      close();
    }
  }

  function onInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') save();
  }

  let canSave = $derived.by(() => {
    if (name.trim().length === 0) return false;
    if (selectedDays.length === 0) return false;
    if (startDate.length === 0) return false;
    if (habitType === 'counter') {
      if (step == null || step <= 0) return false;
      if (perDayOn) {
        for (const d of selectedDays) {
          const v = perDayValues[d];
          if (v == null || v <= 0) return false;
        }
      } else if (target == null || target <= 0) {
        return false;
      }
    }
    return true;
  });

  let title = $derived(habit ? 'Edit habit' : 'New habit');

  let errorMessage = $derived.by(() => {
    if (!interacted || canSave) return '';
    if (name.trim().length === 0) return 'Add a habit name.';
    if (startDate.length === 0) return 'Pick a start date.';
    if (selectedDays.length === 0) return 'Pick at least one day.';
    if (habitType === 'counter') {
      if (step == null || step <= 0) return 'Set a step size greater than 0.';
      if (perDayOn) {
        for (const d of selectedDays) {
          const v = perDayValues[d];
          if (v == null || v <= 0) return `Set a target for ${DAY_NAMES[d]}.`;
        }
      } else if (target == null || target <= 0) {
        return 'Set a target greater than 0.';
      }
    }
    return '';
  });
</script>

<Modal bind:open labelledby="habit-modal-title">
  <h2 id="habit-modal-title" class="mb-4 text-lg font-semibold text-slate-900">{title}</h2>

  <div class="mb-4">
    <span class="text-sm font-medium text-slate-700">Type</span>
    <div class="mt-2 flex gap-1">
      <button
        type="button"
        onclick={() => setType('binary')}
        aria-pressed={habitType === 'binary'}
        disabled={!!habit}
        class="flex h-9 flex-1 items-center justify-center rounded-lg text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 {habitType ===
        'binary'
          ? 'bg-teal-500 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">Binary</button
      >
      <button
        type="button"
        onclick={() => setType('counter')}
        aria-pressed={habitType === 'counter'}
        disabled={!!habit}
        class="flex h-9 flex-1 items-center justify-center rounded-lg text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 {habitType ===
        'counter'
          ? 'bg-teal-500 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">Counter</button
      >
    </div>
    {#if habit}
      <p class="mt-1 text-xs text-slate-500">Habit type can't be changed.</p>
    {/if}
  </div>

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

  {#if habitType === 'counter'}
    <div class="mt-4 grid grid-cols-2 gap-3">
      <label class="block">
        <span class="text-sm font-medium text-slate-700">Step</span>
        <input
          type="number"
          min="1"
          inputmode="numeric"
          bind:value={step}
          oninput={() => (interacted = true)}
          aria-invalid={interacted && (step == null || step <= 0)}
          aria-describedby="habit-modal-error"
          class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-200"
        />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-slate-700">Unit</span>
        <input
          type="text"
          bind:value={unit}
          oninput={() => (interacted = true)}
          placeholder="ml, pages, pomodoros…"
          aria-describedby="habit-modal-error"
          class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none"
        />
      </label>
    </div>

    {#if !perDayOn}
      <label class="mt-4 block">
        <span class="text-sm font-medium text-slate-700">Target</span>
        <input
          type="number"
          min="1"
          inputmode="numeric"
          bind:value={target}
          oninput={() => (interacted = true)}
          aria-invalid={interacted && (target == null || target <= 0)}
          aria-describedby="habit-modal-error"
          class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-200"
        />
      </label>
    {/if}

    <label class="mt-4 flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={perDayOn}
        onchange={togglePerDay}
        class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
      <span class="text-sm font-medium text-slate-700">Different target per day</span>
    </label>

    {#if perDayOn}
      <div class="mt-2 flex gap-1">
        {#each DAY_LETTERS as letter, i (i)}
          {@const day = i as DayOfWeek}
          {@const scheduled = selectedDays.includes(day)}
          {@const invalid =
            interacted && scheduled && (perDayValues[day] == null || perDayValues[day]! <= 0)}
          <label class="flex flex-1 flex-col items-center gap-1">
            <span class="text-xs font-medium text-slate-500">{letter}</span>
            <input
              type="number"
              min="1"
              inputmode="numeric"
              bind:value={perDayValues[day]}
              oninput={() => (interacted = true)}
              disabled={!scheduled}
              aria-label={scheduled ? `${DAY_NAMES[i]} target` : `${DAY_NAMES[i]} (not scheduled)`}
              aria-invalid={invalid}
              aria-describedby="habit-modal-error"
              class="w-full min-w-0 rounded-md border border-slate-300 bg-white px-1 py-1 text-center text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-200"
            />
          </label>
        {/each}
      </div>
    {/if}
  {/if}

  <label class="mt-4 block">
    <span class="text-sm font-medium text-slate-700">Notes</span>
    <textarea
      bind:value={notes}
      oninput={() => (interacted = true)}
      placeholder="Optional"
      rows="3"
      class="mt-1 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none"
    ></textarea>
  </label>

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
