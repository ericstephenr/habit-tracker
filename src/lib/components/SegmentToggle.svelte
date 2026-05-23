<script lang="ts" generics="T extends string">
  type Option = { value: T; label: string };

  let {
    value,
    options,
    onChange,
    disabled = false,
    'aria-label': ariaLabel
  }: {
    value: T;
    options: [Option, Option];
    onChange: (next: T) => void;
    disabled?: boolean;
    'aria-label'?: string;
  } = $props();

  function advance() {
    if (disabled) return;
    const idx = Math.max(
      0,
      options.findIndex((o) => o.value === value)
    );
    const next = options[(idx + 1) % options.length];
    onChange(next.value);
  }
</script>

<button
  type="button"
  onclick={advance}
  {disabled}
  aria-label={ariaLabel ?? 'Toggle'}
  aria-pressed={value === options[1].value}
  style="display: flex; background: var(--surface-2);
         border-radius: 14px; padding: 4px; gap: 4px;
         border: 0; width: 100%;
         cursor: {disabled ? 'not-allowed' : 'pointer'};
         {disabled ? 'opacity: 0.6;' : ''}"
>
  {#each options as opt (opt.value)}
    {@const active = opt.value === value}
    <span
      style="flex: 1; padding: 10px 12px; border-radius: 10px;
             background: {active ? 'var(--surface)' : 'transparent'};
             color: {active ? 'var(--ink)' : 'var(--ink-muted)'};
             font-family: var(--font-display); font-size: 14px; font-weight: 600;
             text-align: center;
             box-shadow: {active ? '0 2px 8px rgba(20,12,40,0.08)' : 'none'};
             transition: all 160ms;
             pointer-events: none;"
    >
      {opt.label}
    </span>
  {/each}
</button>
