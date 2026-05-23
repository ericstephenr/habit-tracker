<script lang="ts">
  let { streak }: { streak: number } = $props();

  type Tier = 0 | 1 | 2 | 3;
  type TierStyle = {
    background: string;
    color: string;
    border: string;
    shadow: string;
    flameFilter: string;
  };
  const STYLES: Record<Tier, TierStyle> = {
    // 0 — rookie (1-6): outlined, greyed flame
    0: {
      background: 'var(--surface)',
      color: 'var(--ink-muted)',
      border: '1px solid var(--line)',
      shadow: '0 2px 6px rgba(20,12,40,0.06)',
      flameFilter: 'grayscale(.7) opacity(.75)'
    },
    // 1 — week (7-29): soft accent
    1: {
      background: 'var(--accent-soft)',
      color: 'var(--accent-deep)',
      border: '1px solid transparent',
      shadow: '0 2px 8px var(--accent-glow)',
      flameFilter: 'none'
    },
    // 2 — month (30-99): filled accent
    2: {
      background: 'var(--accent)',
      color: 'var(--accent-on)',
      border: '1.5px solid var(--bg)',
      shadow: '0 4px 12px var(--accent-glow)',
      flameFilter: 'none'
    },
    // 3 — legend (100+): filled accent with double ring
    3: {
      background: 'var(--accent)',
      color: 'var(--accent-on)',
      border: '1.5px solid var(--bg)',
      shadow: '0 0 0 3px var(--accent-soft), 0 6px 18px var(--accent-glow)',
      flameFilter: 'none'
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
      style="position: absolute; top: -8px; right: 14px; z-index: 2;
             display: inline-flex; align-items: center; gap: 3px;
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
      <span style="font-size: 11px; line-height: 1; filter: {s.flameFilter};">🔥</span>
      {streak}
    </div>
  {/key}
{/if}
