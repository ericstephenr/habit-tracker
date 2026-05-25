<script lang="ts">
  import { tick } from 'svelte';

  let {
    open = $bindable(false),
    anchor = 'below',
    onSelect
  }: {
    open?: boolean;
    anchor?: 'below' | 'above';
    onSelect: (choice: 'habit' | 'task') => void;
  } = $props();

  let shown = $state(false);

  $effect(() => {
    if (open) {
      tick().then(() => requestAnimationFrame(() => (shown = true)));
    } else {
      shown = false;
    }
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

  function select(choice: 'habit' | 'task') {
    open = false;
    onSelect(choice);
  }
</script>

{#if open}
  <!-- backdrop -->
  <button
    type="button"
    onclick={() => (open = false)}
    aria-label="Close menu"
    style="position: fixed; inset: 0; z-index: 29; background: transparent;
           border: 0; cursor: default;"
  ></button>

  <div
    role="menu"
    style="position: absolute; z-index: 30; min-width: 180px;
           {anchor === 'below'
      ? 'top: calc(100% + 6px); right: 0;'
      : 'bottom: calc(100% + 10px); right: 0;'}
           background: var(--surface); border: 1px solid var(--line);
           border-radius: 14px; box-shadow: var(--shadow-2, 0 8px 24px rgba(0,0,0,.12));
           padding: 6px; display: flex; flex-direction: column; gap: 2px;
           opacity: {shown ? 1 : 0};
           transform: scale({shown ? 1 : 0.92}) translateY({shown
      ? '0'
      : anchor === 'below'
        ? '-4px'
        : '4px'});
           transform-origin: {anchor === 'below' ? 'top right' : 'bottom right'};
           transition: opacity 160ms, transform 160ms cubic-bezier(.2,1,.4,1);"
  >
    <button
      type="button"
      role="menuitem"
      onclick={() => select('habit')}
      style="display: flex; align-items: center; gap: 10px;
             padding: 12px 14px; border: 0; border-radius: 10px;
             background: transparent; color: var(--ink);
             font-family: var(--font-display); font-size: 14px; font-weight: 600;
             cursor: pointer; transition: background 140ms; width: 100%;
             text-align: left;"
      onmouseenter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
      onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <!-- circle check icon (habit metaphor) -->
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        style="width: 20px; height: 20px; flex-shrink: 0;"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      New habit
    </button>

    <button
      type="button"
      role="menuitem"
      onclick={() => select('task')}
      style="display: flex; align-items: center; gap: 10px;
             padding: 12px 14px; border: 0; border-radius: 10px;
             background: transparent; color: var(--ink);
             font-family: var(--font-display); font-size: 14px; font-weight: 600;
             cursor: pointer; transition: background 140ms; width: 100%;
             text-align: left;"
      onmouseenter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
      onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <!-- square check icon (task metaphor) -->
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        style="width: 20px; height: 20px; flex-shrink: 0;"
      >
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      New task
    </button>
  </div>
{/if}
