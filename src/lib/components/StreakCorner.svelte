<script lang="ts">
  let { streak }: { streak: number } = $props();

  type Tier = 0 | 1 | 2 | 3;
  type TierStyle = {
    background: string;
    color: string;
    border: string;
    shadow: string;
    flameOpacity: number;
  };
  const STYLES: Record<Tier, TierStyle> = {
    // 0 — rookie (1-6): outlined, dimmed flame
    0: {
      background: 'var(--surface)',
      color: 'var(--ink-muted)',
      border: '1px solid var(--line)',
      shadow: '0 1px 4px rgba(20,12,40,0.06)',
      flameOpacity: 0.5
    },
    // 1 — week (7-29): soft accent with ink-on-accent text
    1: {
      background: 'var(--accent-soft)',
      color: 'var(--accent-ink)',
      border: '1px solid transparent',
      shadow: '0 2px 8px var(--accent-glow)',
      flameOpacity: 1
    },
    // 2 — month (30-99): filled accent
    2: {
      background: 'var(--accent)',
      color: 'var(--accent-on)',
      border: '1.5px solid var(--bg)',
      shadow: '0 3px 10px var(--accent-glow)',
      flameOpacity: 1
    },
    // 3 — legend (100+): filled accent with accent-glow halo
    3: {
      background: 'var(--accent)',
      color: 'var(--accent-on)',
      border: '1.5px solid var(--bg)',
      shadow: '0 0 0 3px var(--accent-glow), 0 4px 14px var(--accent-glow)',
      flameOpacity: 1
    }
  };

  let tier = $derived<Tier>(streak >= 100 ? 3 : streak >= 30 ? 2 : streak >= 7 ? 1 : 0);
  let justCrossed = $derived(streak === 7 || streak === 30 || streak === 100);
  let s = $derived(STYLES[tier]);
</script>

{#if streak > 0}
  {#key streak}
    <div
      aria-label={`${streak} day streak`}
      style="position: absolute; top: -9px; right: 14px; z-index: 2;
             display: inline-flex; align-items: center; gap: 4px;
             padding: 3px 9px 3px 7px; border-radius: 9999px;
             background: {s.background}; color: {s.color}; border: {s.border};
             box-shadow: {s.shadow};
             font-family: var(--font-display); font-size: 11px; font-weight: 700;
             font-variant-numeric: tabular-nums;
             line-height: 1; letter-spacing: 0.2px;
             animation: {justCrossed
        ? 'streakPulseBig 600ms cubic-bezier(.2,1.6,.4,1)'
        : 'streakPulse 280ms cubic-bezier(.2,1.6,.4,1)'};"
    >
      <span aria-hidden="true" style="display: inline-flex; opacity: {s.flameOpacity};">
        <svg width="13" height="13" viewBox="0 0 12 14" fill="none">
          <path
            d="M6 1.2c.6 1.9.2 2.9-.6 3.7C4.4 6 3 7 3 9c0 2 1.4 3.5 3 3.5S9 11 9 9c0-1.2-.5-2.1-1.2-2.7.2 1-.4 1.6-.9 1.6-.6 0-1-.5-.9-1.4.2-1.5.7-3.6 0-5.3z"
            fill="currentColor"
          />
        </svg>
      </span>
      {streak}
    </div>
  {/key}
{/if}
