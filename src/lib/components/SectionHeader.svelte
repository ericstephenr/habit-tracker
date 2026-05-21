<script lang="ts">
  import type { Section } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { menuState } from '$lib/menuState.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import IconChevronRight from './icons/IconChevronRight.svelte';
  import IconGrip from './icons/IconGrip.svelte';

  let { section, onRename }: { section: Section; onRename: (s: Section) => void } = $props();

  let menuOpen = $derived(menuState.isOpen(section.id));
  let menuRef: HTMLDivElement | null = $state(null);
  let kebabRef: HTMLButtonElement | null = $state(null);
  let confirmOpen = $state(false);

  function toggleCollapsed() {
    store.toggleSectionCollapsed(section.id);
  }

  function toggleMenu() {
    if (menuOpen) menuState.close();
    else menuState.open(section.id);
  }

  function handleRename() {
    kebabRef?.focus();
    menuState.close();
    onRename(section);
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

<div class="flex items-center gap-1 px-1 py-2">
  <button
    type="button"
    onclick={toggleCollapsed}
    aria-expanded={!section.collapsed}
    aria-label={section.collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
    class="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
  >
    <IconChevronRight class="h-4 w-4 transition-transform {section.collapsed ? '' : 'rotate-90'}" />
  </button>
  <h2 class="flex-1 truncate text-xs font-semibold tracking-wide text-slate-600 uppercase">
    {section.name}
  </h2>
  <div class="relative" bind:this={menuRef}>
    <button
      bind:this={kebabRef}
      type="button"
      onclick={toggleMenu}
      aria-label="Section options, drag to reorder"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      class="section-drag-handle flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
          onclick={handleRename}
          class="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">Rename</button
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
  title="Delete section?"
  body={`Habits in "${section.name}" will move to the top of your list. No completions are lost.`}
  confirmLabel="Delete"
  onConfirm={() => store.deleteSection(section.id)}
/>
