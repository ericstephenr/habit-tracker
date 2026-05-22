<script lang="ts">
  import { tick } from 'svelte';
  import type { Todo } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import Modal from './Modal.svelte';

  let { open = $bindable(false), todo }: { open?: boolean; todo?: Todo } = $props();

  let name = $state('');
  let inputEl: HTMLInputElement | null = $state(null);
  let interacted = $state(false);

  $effect(() => {
    if (!open) return;
    name = todo?.name ?? '';
    interacted = false;
    tick().then(() => inputEl?.focus());
  });

  let canSave = $derived(name.trim().length > 0);
  let title = $derived(todo ? 'Rename to-do' : 'New to-do');
  let confirmLabel = $derived(todo ? 'Save' : 'Add');

  function close() {
    open = false;
  }

  function save() {
    interacted = true;
    if (!canSave) return;
    if (todo) store.renameTodo(todo.id, name);
    else store.addTodo(name);
    close();
  }

  function onInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') save();
  }
</script>

<Modal bind:open labelledby="todo-modal-title">
  <h2 id="todo-modal-title" class="mb-4 text-lg font-semibold text-slate-900">{title}</h2>

  <label class="block">
    <span class="text-sm font-medium text-slate-700">Name</span>
    <input
      bind:this={inputEl}
      type="text"
      bind:value={name}
      oninput={() => (interacted = true)}
      onkeydown={onInputKey}
      placeholder="e.g. Buy groceries"
      aria-invalid={interacted && !canSave}
      aria-describedby="todo-modal-error"
      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-200"
    />
  </label>

  <p id="todo-modal-error" class="mt-3 min-h-[1.25rem] text-xs text-rose-600" aria-live="polite">
    {interacted && !canSave ? 'Add a to-do name.' : ''}
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
      >{confirmLabel}</button
    >
  </div>
</Modal>
