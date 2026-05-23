<script lang="ts">
  import type { Section } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconChevron from './icons/IconChevron.svelte';
  import IconGrip from './icons/IconGrip.svelte';

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

  let allDone = $derived(totalCount > 0 && doneCount === totalCount);

  function toggleCollapsed() {
    store.toggleSectionCollapsed(section.id);
  }

  function onRowKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCollapsed();
    }
  }

  function handleGripClick(e: MouseEvent) {
    e.stopPropagation();
    onRename(section);
  }
</script>

<div
  role="button"
  tabindex="0"
  aria-expanded={!section.collapsed}
  aria-label={section.collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
  onclick={toggleCollapsed}
  onkeydown={onRowKey}
  style="display: flex; align-items: center; gap: 8px;
         padding: 8px 4px 10px;
         border-bottom: 1px solid var(--line);
         margin-bottom: 10px;
         cursor: pointer;
         user-select: none;"
>
  <span style="padding: 4px; display: flex; align-items: center; color: var(--ink-muted);">
    <IconChevron dir={section.collapsed ? 'right' : 'down'} class="h-3 w-3" />
  </span>
  <span
    style="font-family: var(--font-display); font-weight: 700;
           font-size: 13px; letter-spacing: 1.4px; text-transform: uppercase;
           color: var(--ink);"
  >
    {section.name}
  </span>
  {#if totalCount > 0}
    <span
      style="display: inline-flex; align-items: center; gap: 4px;
             font-family: var(--font-display); font-size: 11px; font-weight: 700;
             color: {allDone ? 'var(--accent-on)' : 'var(--ink-faint)'};
             background: {allDone ? 'var(--accent)' : 'var(--surface-2)'};
             padding: {allDone ? '2px 7px 2px 5px' : '2px 8px'};
             border-radius: var(--r-pill); font-variant-numeric: tabular-nums;
             letter-spacing: 0.2px; line-height: 1.4;"
    >
      {#if allDone}
        <IconCheck class="h-2.5 w-2.5" />
      {/if}
      {doneCount}/{totalCount}
    </span>
  {/if}
  <div style="flex: 1;"></div>
  <button
    type="button"
    class="section-drag-handle"
    onclick={handleGripClick}
    aria-label={`Edit ${section.name}, drag to reorder`}
    style="width: 28px; height: 28px; border: 0; background: transparent; padding: 0;
           color: var(--ink-faint); cursor: pointer; flex-shrink: 0;
           display: flex; align-items: center; justify-content: center;
           border-radius: var(--r-pill); touch-action: none;
           transition: background var(--t-quick) var(--ease-out), color var(--t-quick) var(--ease-out);"
    onmouseenter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
      (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-muted)';
    }}
    onmouseleave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)';
    }}
  >
    <IconGrip class="h-4 w-4" />
  </button>
</div>
