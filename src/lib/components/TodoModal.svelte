<script lang="ts">
  import type { Todo } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import Sheet from './Sheet.svelte';
  import Button from './Button.svelte';
  import Field from './Field.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { open = $bindable(false), todo }: { open?: boolean; todo?: Todo } = $props();

  let name = $state('');
  let interacted = $state(false);
  let confirmDeleteOpen = $state(false);

  $effect(() => {
    if (!open) return;
    name = todo?.name ?? '';
    interacted = false;
    confirmDeleteOpen = false;
  });

  let canSave = $derived(name.trim().length > 0);
  let errorMessage = $derived(!name.trim() ? 'Add a task name.' : '');

  function close() {
    open = false;
  }

  function save() {
    interacted = true;
    if (!canSave) return;
    if (todo) {
      store.renameTodo(todo.id, name);
    } else {
      store.addTodo(name);
    }
    close();
  }

  function onInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') save();
  }

  function deleteTodo() {
    if (!todo) return;
    store.deleteTodo(todo.id);
    close();
  }

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

<Sheet bind:open labelledby="todo-modal-title" title={todo ? 'Rename task' : 'New task'}>
  <div style="padding: 8px 24px 4px; display: flex; flex-direction: column; gap: 14px;">
    <Field label="Task">
      <input
        data-autofocus
        type="text"
        bind:value={name}
        oninput={() => (interacted = true)}
        onkeydown={onInputKey}
        placeholder="e.g. Buy groceries"
        style={inputStyle}
        onfocus={onFieldFocus}
        onblur={onFieldBlur}
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

    <Button variant="primary" onclick={save}>{todo ? 'Save' : 'Create task'}</Button>

    {#if todo}
      <Button
        variant="ghost"
        onclick={() => (confirmDeleteOpen = true)}
        style=" color: var(--danger);">Delete task</Button
      >
    {/if}
  </div>
</Sheet>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete task?"
  body={todo ? `This permanently removes "${todo.name}".` : ''}
  confirmLabel="Delete"
  danger
  onConfirm={deleteTodo}
/>
