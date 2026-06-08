<script lang="ts">
  import { tick } from 'svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconSkip from './icons/IconSkip.svelte';
  import IconCross from './icons/IconCross.svelte';

  type State = 'incomplete' | 'complete' | 'skipped' | 'failed';

  let {
    open = $bindable(false),
    anchor = null,
    currentState,
    onSelect
  }: {
    open?: boolean;
    anchor?: { x: number; y: number } | null;
    currentState: State;
    onSelect: (state: State) => void;
  } = $props();

  let menuEl = $state<HTMLDivElement | null>(null);
  let pos = $state({ left: 0, top: 0 });

  // Clamp the anchored popover inside the viewport once it has a measured size.
  $effect(() => {
    if (!open || !anchor) return;
    tick().then(() => {
      if (!menuEl) return;
      const rect = menuEl.getBoundingClientRect();
      const pad = 8;
      let left = anchor.x;
      let top = anchor.y;
      if (left + rect.width + pad > window.innerWidth) left = anchor.x - rect.width;
      if (top + rect.height + pad > window.innerHeight) top = anchor.y - rect.height;
      pos = { left: Math.max(pad, left), top: Math.max(pad, top) };
    });
  });

  $effect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        open = false;
      }
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  });

  const ITEMS: { key: State; label: string; bg: string }[] = [
    { key: 'incomplete', label: 'Incomplete', bg: 'transparent' },
    { key: 'complete', label: 'Complete', bg: 'var(--accent)' },
    { key: 'skipped', label: 'Skipped', bg: 'var(--ink-faint)' },
    { key: 'failed', label: 'Failed', bg: 'var(--danger)' }
  ];

  function select(state: State) {
    open = false;
    onSelect(state);
  }
</script>

{#if open}
  <button
    type="button"
    class="menu-backdrop"
    onclick={() => (open = false)}
    oncontextmenu={(e) => {
      e.preventDefault();
      open = false;
    }}
    aria-label="Close menu"
  ></button>

  <div
    bind:this={menuEl}
    class="menu"
    role="menu"
    style="position: fixed; left: {pos.left}px; top: {pos.top}px;"
  >
    {#each ITEMS as item (item.key)}
      <button
        type="button"
        class="menu-item"
        role="menuitemradio"
        aria-checked={currentState === item.key}
        onclick={() => select(item.key)}
      >
        <span
          class="menu-swatch"
          style="background: {item.bg}; border-color: {item.key === 'incomplete'
            ? 'var(--line-strong)'
            : item.bg};"
        >
          {#if item.key === 'complete'}<IconCheck />
          {:else if item.key === 'skipped'}<IconSkip />
          {:else if item.key === 'failed'}<IconCross />{/if}
        </span>
        <span style="flex: 1;">{item.label}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 49;
    background: transparent;
    border: none;
    cursor: default;
  }
</style>
