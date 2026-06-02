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
    options: Option[];
    onChange: (next: T) => void;
    disabled?: boolean;
    'aria-label'?: string;
  } = $props();

  function select(next: T) {
    if (disabled || next === value) return;
    onChange(next);
  }
</script>

<div
  role="group"
  aria-label={ariaLabel ?? 'Toggle'}
  style="display: flex; background: var(--surface-2);
         border-radius: 14px; padding: 4px; gap: 4px; width: 100%;
         {disabled ? 'opacity: 0.6;' : ''}"
>
  {#each options as opt (opt.value)}
    {@const active = opt.value === value}
    <button
      type="button"
      onclick={() => select(opt.value)}
      {disabled}
      aria-pressed={active}
      style="flex: 1; padding: 10px 12px; border-radius: 10px; border: 0;
             background: {active ? 'var(--surface)' : 'transparent'};
             color: {active ? 'var(--ink)' : 'var(--ink-muted)'};
             font-family: var(--font-display); font-size: 14px; font-weight: 600;
             text-align: center;
             box-shadow: {active ? '0 2px 8px rgba(20,12,40,0.08)' : 'none'};
             cursor: {disabled ? 'not-allowed' : 'pointer'};
             transition: all 160ms;"
    >
      {opt.label}
    </button>
  {/each}
</div>
