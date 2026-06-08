<script lang="ts">
  import type { Section } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import IconChevron from './icons/IconChevron.svelte';
  import IconKebab from './icons/IconKebab.svelte';

  let { section, onRename }: { section: Section; onRename: (s: Section) => void } = $props();
</script>

<div class="section-title">
  <button
    type="button"
    class="section-collapse"
    onclick={() => store.toggleTodoSectionCollapsed(section.id)}
    aria-expanded={!section.collapsed}
    aria-label={section.collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
  >
    <IconChevron dir={section.collapsed ? 'right' : 'down'} class="h-3 w-3" />
    <span>{section.name}</span>
  </button>
  <div style="flex: 1;"></div>
  <button
    type="button"
    class="grip todo-section-drag-handle"
    onclick={() => onRename(section)}
    aria-label={`Edit ${section.name}`}
  >
    <IconKebab />
  </button>
</div>

<style>
  .section-collapse {
    display: flex;
    align-items: center;
    gap: 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    padding: 0;
  }
  .section-collapse :global(svg) {
    color: var(--ink-faint);
  }
</style>
