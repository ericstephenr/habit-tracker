<script lang="ts">
  import { tick } from 'svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconSkip from './icons/IconSkip.svelte';

  type State = 'incomplete' | 'complete' | 'skipped';

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

  let shown = $state(false);
  let menuEl = $state<HTMLDivElement | null>(null);
  let position = $state<{ left: number; top: number; transformOrigin: string }>({
    left: 0,
    top: 0,
    transformOrigin: 'top left'
  });

  $effect(() => {
    if (open && anchor) {
      tick().then(() => {
        if (!menuEl) return;
        const rect = menuEl.getBoundingClientRect();
        const pad = 8;
        let left = anchor.x;
        let top = anchor.y;
        let origin = 'top left';
        if (left + rect.width + pad > window.innerWidth) {
          left = anchor.x - rect.width;
          origin = origin.replace('left', 'right');
        }
        if (top + rect.height + pad > window.innerHeight) {
          top = anchor.y - rect.height;
          origin = origin.replace('top', 'bottom');
        }
        position = {
          left: Math.max(pad, left),
          top: Math.max(pad, top),
          transformOrigin: origin
        };
        requestAnimationFrame(() => (shown = true));
      });
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

  function select(state: State) {
    open = false;
    onSelect(state);
  }
</script>

{#if open}
  <!-- backdrop -->
  <button
    type="button"
    onclick={() => (open = false)}
    oncontextmenu={(e) => {
      e.preventDefault();
      open = false;
    }}
    aria-label="Close menu"
    style="position: fixed; inset: 0; z-index: 49; background: transparent;
           border: 0; cursor: default;"
  ></button>

  <div
    bind:this={menuEl}
    role="menu"
    style="position: fixed; z-index: 50; min-width: 180px;
           left: {position.left}px; top: {position.top}px;
           background: var(--surface); border: 1px solid var(--line);
           border-radius: 14px; box-shadow: var(--shadow-2, 0 8px 24px rgba(0,0,0,.16));
           padding: 6px; display: flex; flex-direction: column; gap: 2px;
           opacity: {shown ? 1 : 0};
           transform: scale({shown ? 1 : 0.92});
           transform-origin: {position.transformOrigin};
           transition: opacity 140ms, transform 140ms cubic-bezier(.2,1,.4,1);"
  >
    {#each [{ key: 'incomplete' as State, label: 'Incomplete' }, { key: 'complete' as State, label: 'Complete' }, { key: 'skipped' as State, label: 'Skipped' }] as item (item.key)}
      {@const isCurrent = currentState === item.key}
      <button
        type="button"
        role="menuitemradio"
        aria-checked={isCurrent}
        onclick={() => select(item.key)}
        style="display: flex; align-items: center; gap: 10px;
               padding: 10px 12px; border: 0; border-radius: 10px;
               background: {isCurrent ? 'var(--surface-2)' : 'transparent'};
               color: var(--ink);
               font-family: var(--font-display); font-size: 14px; font-weight: 600;
               cursor: pointer; transition: background 120ms; width: 100%;
               text-align: left;"
        onmouseenter={(e) => {
          if (!isCurrent)
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
        }}
        onmouseleave={(e) => {
          if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <span
          aria-hidden="true"
          style="display: inline-flex; align-items: center; justify-content: center;
                 width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
                 background: {item.key === 'complete'
            ? 'var(--accent)'
            : item.key === 'skipped'
              ? 'var(--ink-faint)'
              : 'var(--surface-2)'};
                 color: {item.key === 'incomplete' ? 'transparent' : 'var(--accent-on, white)'};
                 box-shadow: {item.key === 'incomplete'
            ? 'inset 0 0 0 1.5px var(--line-strong)'
            : 'none'};"
        >
          {#if item.key === 'complete'}
            <IconCheck class="h-3.5 w-3.5" />
          {:else if item.key === 'skipped'}
            <IconSkip class="h-3.5 w-3.5" />
          {/if}
        </span>
        <span style="flex: 1;">{item.label}</span>
        {#if isCurrent}
          <span
            aria-hidden="true"
            style="width: 6px; height: 6px; border-radius: 50%;
                   background: var(--ink-muted); flex-shrink: 0;"
          ></span>
        {/if}
      </button>
    {/each}
  </div>
{/if}
