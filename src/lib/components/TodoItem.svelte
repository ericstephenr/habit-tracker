<script lang="ts">
  import type { Todo } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { menuState } from '$lib/menuState.svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconGrip from './icons/IconGrip.svelte';

  let { todo, onEdit }: { todo: Todo; onEdit: (t: Todo) => void } = $props();

  let menuOpen = $derived(menuState.isOpen(todo.id));
  let menuRef: HTMLDivElement | null = $state(null);
  let kebabRef: HTMLButtonElement | null = $state(null);

  function toggle() {
    store.toggleTodo(todo.id);
  }

  function toggleMenu() {
    if (menuOpen) menuState.close();
    else menuState.open(todo.id);
  }

  function handleEdit() {
    kebabRef?.focus();
    menuState.close();
    onEdit(todo);
  }

  function handleDelete() {
    menuState.close();
    store.deleteTodo(todo.id);
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
    aria-pressed={todo.done}
    aria-label={todo.done ? `Mark ${todo.name} not done` : `Mark ${todo.name} done`}
    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition {todo.done
      ? 'border-teal-500 bg-teal-500 text-white'
      : 'border-slate-300 bg-white text-transparent hover:border-slate-400'}"
  >
    <IconCheck class="h-4 w-4" />
  </button>

  <span
    class="min-w-0 flex-1 truncate {todo.done ? 'text-slate-400 line-through' : 'text-slate-900'}"
    >{todo.name}</span
  >

  <div class="relative" bind:this={menuRef}>
    <button
      bind:this={kebabRef}
      type="button"
      onclick={toggleMenu}
      aria-label="To-do options, drag to reorder"
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
