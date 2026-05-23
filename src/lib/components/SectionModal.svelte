<script lang="ts">
  import type { Section } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import Sheet from './Sheet.svelte';
  import Button from './Button.svelte';
  import Field from './Field.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { open = $bindable(false), section }: { open?: boolean; section?: Section } = $props();

  let name = $state('');
  let interacted = $state(false);
  let confirmDeleteOpen = $state(false);

  $effect(() => {
    if (!open) return;
    name = section?.name ?? '';
    interacted = false;
    confirmDeleteOpen = false;
  });

  let canSave = $derived(name.trim().length > 0);
  let errorMessage = $derived(!name.trim() ? 'Add a section name.' : '');

  function close() {
    open = false;
  }

  function save() {
    interacted = true;
    if (!canSave) return;
    if (section) store.renameSection(section.id, name);
    else store.addSection(name);
    close();
  }

  function onInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') save();
  }

  function deleteSection() {
    if (!section) return;
    store.deleteSection(section.id);
    close();
  }

  const inputStyle =
    'width: 100%; box-sizing: border-box; padding: 14px 16px; border-radius: 14px; ' +
    'border: 1.5px solid var(--line); background: var(--surface-2); ' +
    'font-family: var(--font-body); font-size: 16px; color: var(--ink); ' +
    'outline: none; transition: border-color 140ms, background 140ms;';
</script>

<Sheet
  bind:open
  labelledby="section-modal-title"
  title={section ? 'Rename section' : 'New section'}
>
  <div style="padding: 8px 24px 4px; display: flex; flex-direction: column; gap: 14px;">
    <Field label="Section name">
      <input
        data-autofocus
        type="text"
        bind:value={name}
        oninput={() => (interacted = true)}
        onkeydown={onInputKey}
        placeholder="e.g. Morning routine"
        style={inputStyle}
        onfocus={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--accent)';
          (e.currentTarget as HTMLInputElement).style.background = 'var(--surface)';
        }}
        onblur={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--line)';
          (e.currentTarget as HTMLInputElement).style.background = 'var(--surface-2)';
        }}
      />
    </Field>

    <div
      role="alert"
      aria-live="polite"
      style="min-height: 20px; padding: 0 4px;
             font-size: 12px; color: var(--danger); font-family: var(--font-body);
             opacity: {interacted && errorMessage ? 1 : 0};
             transition: opacity 160ms;"
    >
      {errorMessage || ' '}
    </div>

    <Button variant="primary" onclick={save}>{section ? 'Save' : 'Create section'}</Button>

    {#if section}
      <Button
        variant="ghost"
        onclick={() => (confirmDeleteOpen = true)}
        style=" color: var(--danger);">Delete section</Button
      >
    {/if}
  </div>
</Sheet>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete section?"
  body={section
    ? `Habits and tasks in "${section.name}" will move to the top of their lists. No completions are lost.`
    : ''}
  confirmLabel="Delete"
  danger
  onConfirm={deleteSection}
/>
