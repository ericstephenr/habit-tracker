<script lang="ts">
  import { tick, type Snippet } from 'svelte';

  let {
    open = $bindable(false),
    labelledby,
    describedby,
    title,
    children
  }: {
    open?: boolean;
    labelledby: string;
    describedby?: string;
    title?: string;
    children: Snippet;
  } = $props();

  let containerEl: HTMLDivElement | null = $state(null);
  let mounted = $state(false);
  let shown = $state(false);
  let isMobile = $state(false);
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    isMobile = mq.matches;
    const onChange = (e: MediaQueryListEvent) => (isMobile = e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  $effect(() => {
    if (open && !mounted) {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      mounted = true;
      shown = false;
      tick().then(() => {
        // Double rAF to ensure the panel is painted at its initial off-screen
        // state before we toggle `.is-shown` and trigger the CSS transition.
        // On regular divs (not native <dialog>+top-layer), the browser honors
        // this timing reliably across all sheets, including short ones like
        // Settings where the native-dialog approach was discrete-snapping.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            shown = true;
            window.setTimeout(() => {
              if (!containerEl || !shown) return;
              const focusable =
                containerEl.querySelector<HTMLElement>('[data-autofocus]') ??
                containerEl.querySelector<HTMLElement>(
                  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
                );
              focusable?.focus({ preventScroll: true });
            }, 420);
          });
        });
      });
    } else if (!open && mounted) {
      shown = false;
      closeTimer = setTimeout(() => {
        mounted = false;
        closeTimer = null;
      }, 420);
    }
  });

  // Esc closes the topmost sheet (event listener is mounted only while open)
  $effect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        open = false;
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  function close() {
    open = false;
  }
</script>

{#if mounted}
  <div
    bind:this={containerEl}
    role="dialog"
    aria-modal="true"
    aria-labelledby={labelledby}
    aria-describedby={describedby}
    class="sheet-container"
    class:is-mobile={isMobile}
    class:is-shown={shown}
  >
    <button type="button" class="sheet-backdrop" aria-label="Close" tabindex="-1" onclick={close}
    ></button>
    <div class="sheet-panel" class:is-mobile={isMobile} class:is-shown={shown}>
      {#if isMobile}
        <div class="sheet-grabber-row">
          <div class="sheet-grabber"></div>
        </div>
      {/if}
      {#if title}
        <div class="sheet-title-row" class:is-mobile={isMobile}>
          <span id={labelledby} class="sheet-title">{title}</span>
          {#if !isMobile}
            <button type="button" class="sheet-close" onclick={close} aria-label="Close">
              ×
            </button>
          {/if}
        </div>
      {/if}
      <div class="sheet-content">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .sheet-container {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink);
  }
  .sheet-container.is-mobile {
    align-items: flex-end;
  }

  .sheet-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(20, 12, 30, 0.55);
    border: 0;
    padding: 0;
    cursor: pointer;
    opacity: 0;
    transition: opacity 420ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  .sheet-container.is-shown .sheet-backdrop {
    opacity: 1;
  }

  .sheet-panel {
    position: relative;
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-body);
    overflow: hidden;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  /* Desktop default */
  .sheet-panel {
    border-radius: 20px;
    width: min(520px, calc(100vw - 32px));
    max-height: 88vh;
    transform: scale(0.97) translateY(12px);
    opacity: 0;
    transition:
      transform 420ms cubic-bezier(0.32, 0.72, 0, 1),
      opacity 420ms cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow 420ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  .sheet-panel.is-shown {
    transform: scale(1) translateY(0);
    opacity: 1;
    box-shadow:
      var(--shadow-deep),
      0 0 0 1px var(--line);
  }
  /* Mobile bottom sheet */
  .sheet-panel.is-mobile {
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 100%;
    max-height: 92vh;
    padding-bottom: env(safe-area-inset-bottom, 0);
    transform: translateY(120%);
    opacity: 1;
    transition:
      transform 420ms cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow 420ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  .sheet-panel.is-mobile.is-shown {
    transform: translateY(0);
    box-shadow: 0 -20px 50px rgba(20, 12, 40, 0.18);
  }

  .sheet-grabber-row {
    display: flex;
    justify-content: center;
    padding-top: 10px;
  }
  .sheet-grabber {
    width: 40px;
    height: 5px;
    border-radius: 99px;
    background: var(--line-strong);
  }

  .sheet-title-row {
    padding: 20px 24px 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .sheet-title-row.is-mobile {
    padding: 14px 24px 6px;
  }
  .sheet-title {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.5px;
    color: var(--ink);
  }
  .sheet-close {
    width: 32px;
    height: 32px;
    border-radius: var(--r-pill);
    border: 0;
    background: var(--surface-2);
    color: var(--ink-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-body);
    font-size: 18px;
    line-height: 1;
    flex-shrink: 0;
  }
  .sheet-close:hover {
    background: var(--line);
    color: var(--ink);
  }

  .sheet-content {
    overflow: auto;
    padding: 8px 0 24px;
  }
</style>
