<script lang="ts">
  import { TABS, type Tab } from '$lib/tabs';
  import IconCheck from './icons/IconCheck.svelte';

  let { activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void } = $props();

  let open = $state(false);
  let current = $derived(TABS.find((t) => t.id === activeTab) ?? TABS[0]);

  function choose(tab: Tab) {
    onTabChange(tab);
    open = false;
  }

  // Close on Escape while the menu is open.
  $effect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        open = false;
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
</script>

<div style="position: relative;">
  <button
    type="button"
    onclick={() => (open = !open)}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={`Section: ${current.label} — tap to switch`}
    style="display: inline-flex; align-items: center; gap: 6px;
           background: var(--surface-2); border: 0; cursor: pointer;
           border-radius: 99px; padding: 10px 14px 10px 18px;
           font-family: var(--font-display); font-size: 14px; font-weight: 600;
           color: var(--ink);"
  >
    {current.label}
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      style="color: var(--ink-muted); transform: rotate({open ? 180 : 0}deg);
             transition: transform var(--t-quick) var(--ease-out);"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  </button>

  {#if open}
    <button
      type="button"
      aria-label="Close menu"
      tabindex="-1"
      onclick={() => (open = false)}
      style="position: fixed; inset: 0; z-index: 40; background: transparent; border: 0; padding: 0; cursor: default;"
    ></button>
    <div
      role="menu"
      style="position: absolute; top: calc(100% + 6px); left: 0; z-index: 50;
             min-width: 172px; background: var(--surface);
             border: 1px solid var(--line); border-radius: var(--r-md);
             box-shadow: var(--shadow-2); padding: 6px;
             display: flex; flex-direction: column; gap: 2px;"
    >
      {#each TABS as t (t.id)}
        {@const active = t.id === activeTab}
        <button
          type="button"
          role="menuitem"
          onclick={() => choose(t.id)}
          aria-current={active ? 'page' : undefined}
          style="display: flex; align-items: center; justify-content: space-between; gap: 12px;
                 width: 100%; padding: 10px 12px; border: 0; border-radius: var(--r-sm);
                 background: {active ? 'var(--accent-fill)' : 'transparent'};
                 color: {active ? 'var(--accent-ink)' : 'var(--ink)'};
                 font-family: var(--font-display); font-size: 15px; font-weight: 600;
                 cursor: pointer; text-align: left;"
        >
          <span>{t.label}</span>
          {#if active}
            <IconCheck class="h-4 w-4" />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
