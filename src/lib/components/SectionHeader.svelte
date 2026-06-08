<script lang="ts">
  import type { Section } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import IconChevron from './icons/IconChevron.svelte';
  import IconKebab from './icons/IconKebab.svelte';

  let {
    section,
    doneCount = 0,
    totalCount = 0,
    onRename
  }: {
    section: Section;
    doneCount?: number;
    totalCount?: number;
    onRename: (s: Section) => void;
  } = $props();

  function toggleCollapsed() {
    store.toggleSectionCollapsed(section.id);
  }
</script>

<div class="section-title">
  <button
    type="button"
    class="section-collapse"
    onclick={toggleCollapsed}
    aria-expanded={!section.collapsed}
    aria-label={section.collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
  >
    <IconChevron dir={section.collapsed ? 'right' : 'down'} class="h-3 w-3" />
    <span>{section.name}</span>
  </button>
  {#if totalCount > 0}
    <span class="section-count">{doneCount}/{totalCount}</span>
  {/if}
  <div style="flex: 1;"></div>
  <button
    type="button"
    class="grip section-drag-handle"
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
