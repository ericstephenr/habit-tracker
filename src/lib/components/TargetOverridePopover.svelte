<script lang="ts">
  import { tick } from 'svelte';

  let {
    open = $bindable(false),
    anchor = null,
    scheduledTarget,
    currentOverride,
    unit,
    onSave,
    onReset
  }: {
    open?: boolean;
    anchor?: { x: number; y: number } | null;
    scheduledTarget: number;
    currentOverride: number | undefined;
    unit: string;
    onSave: (value: number) => void;
    onReset: () => void;
  } = $props();

  let shown = $state(false);
  let menuEl = $state<HTMLDivElement | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);
  let value = $state('');
  let position = $state<{ left: number; top: number; transformOrigin: string }>({
    left: 0,
    top: 0,
    transformOrigin: 'top left'
  });

  $effect(() => {
    if (open && anchor) {
      value = String(currentOverride ?? scheduledTarget);
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
        requestAnimationFrame(() => {
          shown = true;
          inputEl?.focus();
          inputEl?.select();
        });
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

  let parsed = $derived(parseValue(value));

  function parseValue(s: string): number | null {
    const n = Number(s);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
    return n;
  }

  function save() {
    if (parsed == null) return;
    open = false;
    onSave(parsed);
  }

  function reset() {
    open = false;
    onReset();
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    save();
  }
</script>

{#if open}
  <button
    type="button"
    onclick={() => (open = false)}
    oncontextmenu={(e) => {
      e.preventDefault();
      open = false;
    }}
    aria-label="Close target popover"
    style="position: fixed; inset: 0; z-index: 49; background: transparent;
           border: 0; cursor: default;"
  ></button>

  <div
    bind:this={menuEl}
    role="dialog"
    aria-label="Target for this day"
    style="position: fixed; z-index: 50; min-width: 220px;
           left: {position.left}px; top: {position.top}px;
           background: var(--surface); border: 1px solid var(--line);
           border-radius: 14px; box-shadow: var(--shadow-2, 0 8px 24px rgba(0,0,0,.16));
           padding: 12px; display: flex; flex-direction: column; gap: 10px;
           opacity: {shown ? 1 : 0};
           transform: scale({shown ? 1 : 0.92});
           transform-origin: {position.transformOrigin};
           transition: opacity 140ms, transform 140ms cubic-bezier(.2,1,.4,1);"
  >
    <div
      style="font-family: var(--font-display); font-size: 13px; font-weight: 600;
             color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.5px;"
    >
      Target for this day
    </div>

    <form onsubmit={onSubmit} style="display: flex; align-items: center; gap: 8px;">
      <input
        bind:this={inputEl}
        bind:value
        type="number"
        min="1"
        step="1"
        inputmode="numeric"
        style="flex: 1; min-width: 0; padding: 8px 10px;
               border: 1px solid var(--line-strong); border-radius: 8px;
               background: var(--surface); color: var(--ink);
               font-family: var(--font-display); font-size: 15px; font-weight: 600;
               font-variant-numeric: tabular-nums;"
      />
      {#if unit}
        <span
          style="font-family: var(--font-display); font-size: 13px; font-weight: 600;
                 color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.5px;
                 flex-shrink: 0;"
        >
          {unit}
        </span>
      {/if}
    </form>

    <div style="font-size: 12px; color: var(--ink-faint);">
      Scheduled: {scheduledTarget}{unit ? ` ${unit}` : ''}
    </div>

    <div style="display: flex; gap: 6px; justify-content: flex-end;">
      <button
        type="button"
        onclick={reset}
        disabled={currentOverride == null}
        style="padding: 6px 10px; border: 0; border-radius: 8px;
               background: transparent; color: var(--ink-muted);
               font-family: var(--font-display); font-size: 13px; font-weight: 600;
               cursor: {currentOverride == null ? 'not-allowed' : 'pointer'};
               opacity: {currentOverride == null ? 0.4 : 1};
               transition: background 120ms;"
        onmouseenter={(e) => {
          if (currentOverride != null)
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
        }}
        onmouseleave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        Reset
      </button>
      <button
        type="button"
        onclick={save}
        disabled={parsed == null}
        style="padding: 6px 12px; border: 0; border-radius: 8px;
               background: var(--accent); color: var(--accent-on, white);
               font-family: var(--font-display); font-size: 13px; font-weight: 600;
               cursor: {parsed == null ? 'not-allowed' : 'pointer'};
               opacity: {parsed == null ? 0.5 : 1};"
      >
        Save
      </button>
    </div>
  </div>
{/if}
