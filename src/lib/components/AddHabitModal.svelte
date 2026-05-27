<script lang="ts">
  import type { DayOfWeek, Habit } from '$lib/types';
  import { store, type HabitPatch } from '$lib/store.svelte';
  import { DAY_LETTERS, DAY_NAMES, normalizeDays } from '$lib/schedule';
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { buildCounterConfig, validateHabitInput } from '$lib/validation';
  import Sheet from './Sheet.svelte';
  import Button from './Button.svelte';
  import Field from './Field.svelte';
  import SegmentToggle from './SegmentToggle.svelte';
  import DayPicker from './DayPicker.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { open = $bindable(false), habit }: { open?: boolean; habit?: Habit } = $props();

  let name = $state('');
  let selectedDays = $state<DayOfWeek[]>([0, 1, 2, 3, 4, 5, 6]);
  let startDate = $state('');
  let notes = $state('');
  let sectionId = $state<string | ''>('');
  let interacted = $state(false);
  let saveError = $state('');
  let confirmDeletionOpen = $state(false);
  let confirmDeleteHabitOpen = $state(false);
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
      sectionId = habit.sectionId;
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
      sectionId = store.data.sections[0]?.id ?? '';
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
    confirmDeleteHabitOpen = false;
  });

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
      const next: Record<DayOfWeek, number | null> = { ...perDayValues };
      for (const d of selectedDays) {
        if (next[d] == null) next[d] = target;
      }
      perDayValues = next;
    }
  }

  function buildCounter() {
    return buildCounterConfig({ step, target, unit, perDayOn, perDayValues, selectedDays });
  }

  function close() {
    open = false;
  }

  function applySection(h: Habit) {
    if (sectionId) h.sectionId = sectionId;
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
    const live = store.data.habits.find((x) => x.id === habit.id);
    if (live) {
      applySection(live);
      store.replaceAll(store.data);
    }
    close();
  }

  function save() {
    interacted = true;
    if (!canSave) return;
    const trimmed = name.trim();
    if (habit) {
      if (startDate > habit.startDate) {
        const c = store.completionsBefore(habit.id, startDate);
        if (c > 0) {
          pendingDeleteCount = c;
          pendingNewStartDate = startDate;
          confirmDeletionOpen = true;
          return;
        }
      }
      commitEdit(startDate);
    } else if (habitType === 'counter') {
      const counter = buildCounter();
      if (!counter) return;
      const newH = store.addHabit({
        type: 'counter',
        name: trimmed,
        days: selectedDays,
        startDate,
        counter,
        notes
      });
      applySection(newH);
      store.replaceAll(store.data);
      close();
    } else {
      const newH = store.addHabit({
        type: 'binary',
        name: trimmed,
        days: selectedDays,
        startDate,
        notes
      });
      applySection(newH);
      store.replaceAll(store.data);
      close();
    }
  }

  function deleteHabit() {
    if (!habit) return;
    store.deleteHabit(habit.id);
    close();
  }

  let validation = $derived(
    validateHabitInput({
      name,
      days: selectedDays,
      startDate,
      type: habitType,
      step,
      target,
      perDayOn,
      perDayValues
    })
  );
  let canSave = $derived(validation.valid);
  let errorMessage = $derived(!interacted || canSave ? '' : validation.error);

  const inputStyle =
    'width: 100%; box-sizing: border-box; padding: 14px 16px; border-radius: 14px; ' +
    'border: 1.5px solid var(--line); background: var(--surface-2); ' +
    'font-family: var(--font-body); font-size: 16px; color: var(--ink); ' +
    'outline: none; transition: border-color 140ms, background 140ms;';

  function onFieldFocus(e: FocusEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.borderColor = 'var(--accent)';
    el.style.background = 'var(--surface)';
  }
  function onFieldBlur(e: FocusEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.borderColor = 'var(--line)';
    el.style.background = 'var(--surface-2)';
  }
</script>

<Sheet bind:open labelledby="habit-modal-title" title={habit ? 'Edit habit' : 'New habit'}>
  <div style="padding: 8px 24px 4px; display: flex; flex-direction: column; gap: 18px;">
    <Field label="Name">
      <input
        data-autofocus
        type="text"
        bind:value={name}
        oninput={() => (interacted = true)}
        onfocus={onFieldFocus}
        onblur={onFieldBlur}
        placeholder="e.g. Morning walk"
        style={inputStyle}
      />
    </Field>

    <Field label="Type">
      <SegmentToggle
        value={habitType}
        options={[
          { value: 'binary', label: 'Check off' },
          { value: 'counter', label: 'Count up' }
        ]}
        onChange={setType}
        disabled={!!habit}
      />
      {#if habit}
        <p style="margin: 0; font-size: 12px; color: var(--ink-faint);">
          Habit type can't be changed after creation.
        </p>
      {/if}
    </Field>

    {#if habitType === 'counter'}
      <div style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px;">
        <Field label="Step">
          <input
            type="number"
            min="1"
            inputmode="numeric"
            bind:value={step}
            oninput={() => (interacted = true)}
            onfocus={onFieldFocus}
            onblur={onFieldBlur}
            style={inputStyle}
          />
        </Field>
        <Field label="Unit">
          <input
            type="text"
            bind:value={unit}
            oninput={() => (interacted = true)}
            onfocus={onFieldFocus}
            onblur={onFieldBlur}
            placeholder="reps, min, oz…"
            style={inputStyle}
          />
        </Field>
      </div>

      {#if !perDayOn}
        <Field label="Target">
          <input
            type="number"
            min="1"
            inputmode="numeric"
            bind:value={target}
            oninput={() => (interacted = true)}
            onfocus={onFieldFocus}
            onblur={onFieldBlur}
            style={inputStyle}
          />
        </Field>
      {/if}

      <label
        style="display: flex; align-items: center; gap: 10px;
               cursor: pointer; user-select: none; padding: 2px 0;"
      >
        <input
          type="checkbox"
          checked={perDayOn}
          onchange={togglePerDay}
          style="width: 18px; height: 18px; accent-color: var(--accent);
                 cursor: pointer; margin: 0;"
        />
        <span
          style="font-family: var(--font-body); font-size: 14px; font-weight: 500;
                 color: var(--ink);"
        >
          Different target per day
        </span>
      </label>

      {#if perDayOn}
        <Field label="Targets">
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;">
            {#each DAY_LETTERS as letter, i (i)}
              {@const day = i as DayOfWeek}
              {@const scheduled = selectedDays.includes(day)}
              <label style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                <span
                  style="font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
                         color: {scheduled ? 'var(--ink-muted)' : 'var(--ink-faint)'};
                         text-transform: uppercase;"
                >
                  {letter}
                </span>
                <input
                  type="number"
                  min="1"
                  inputmode="numeric"
                  bind:value={perDayValues[day]}
                  oninput={() => (interacted = true)}
                  onfocus={onFieldFocus}
                  onblur={onFieldBlur}
                  disabled={!scheduled}
                  aria-label={scheduled
                    ? `${DAY_NAMES[i]} target`
                    : `${DAY_NAMES[i]} (not scheduled)`}
                  style="width: 100%; box-sizing: border-box;
                         padding: 10px 4px; border-radius: 10px;
                         border: 1.5px solid var(--line);
                         background: {scheduled ? 'var(--surface-2)' : 'var(--surface)'};
                         color: {scheduled ? 'var(--ink)' : 'var(--ink-faint)'};
                         font-family: var(--font-body); font-size: 12px;
                         text-align: center; outline: none;
                         cursor: {scheduled ? 'text' : 'not-allowed'};"
                />
              </label>
            {/each}
          </div>
        </Field>
      {/if}
    {/if}

    <Field label="Schedule">
      <DayPicker
        days={selectedDays}
        onChange={(next) => {
          interacted = true;
          selectedDays = next;
        }}
      />
    </Field>

    <Field label="Start date">
      <input
        type="date"
        bind:value={startDate}
        oninput={() => (interacted = true)}
        onfocus={onFieldFocus}
        onblur={onFieldBlur}
        required
        style={inputStyle}
      />
    </Field>

    <Field label="Section">
      <select
        bind:value={sectionId}
        onfocus={onFieldFocus}
        onblur={onFieldBlur}
        style="{inputStyle} cursor: pointer; appearance: none;"
      >
        {#each store.data.sections as s (s.id)}
          <option value={s.id}>{s.name}</option>
        {/each}
      </select>
    </Field>

    <Field label="Notes">
      <textarea
        bind:value={notes}
        oninput={() => (interacted = true)}
        onfocus={onFieldFocus}
        onblur={onFieldBlur}
        placeholder="Optional notes…"
        rows="2"
        style="{inputStyle} resize: none;"
      ></textarea>
    </Field>

    <div
      role="alert"
      aria-live="polite"
      style="min-height: 20px; padding: 0 4px;
             font-size: 12px; color: var(--danger); font-family: var(--font-body);
             opacity: {interacted && (saveError || errorMessage) ? 1 : 0};
             transition: opacity 160ms;"
    >
      {saveError || errorMessage || ' '}
    </div>

    <Button variant="primary" onclick={save}>{habit ? 'Save changes' : 'Create habit'}</Button>

    {#if habit}
      <Button
        variant="ghost"
        onclick={() => (confirmDeleteHabitOpen = true)}
        style=" color: var(--danger);">Delete habit</Button
      >
    {/if}
  </div>
</Sheet>

<ConfirmDialog
  bind:open={confirmDeletionOpen}
  title="Delete completion history?"
  body={`Moving the start date to ${pendingNewStartDate} will permanently delete ${pendingDeleteCount} completion${pendingDeleteCount === 1 ? '' : 's'} from before that date.`}
  confirmLabel="Delete & save"
  danger
  onConfirm={() => commitEdit(pendingNewStartDate)}
/>

<ConfirmDialog
  bind:open={confirmDeleteHabitOpen}
  title="Delete habit?"
  body={habit ? `This permanently removes "${habit.name}" and all of its completion history.` : ''}
  confirmLabel="Delete"
  danger
  onConfirm={deleteHabit}
/>
