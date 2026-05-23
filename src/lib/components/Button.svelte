<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
  type Size = 'md' | 'sm';

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    autofocus: shouldAutofocus = false,
    onclick,
    'aria-label': ariaLabel,
    style: extraStyle = '',
    children
  }: {
    variant?: Variant;
    size?: Size;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    autofocus?: boolean;
    onclick?: (e: MouseEvent) => void;
    'aria-label'?: string;
    style?: string;
    children: Snippet;
  } = $props();

  let pressed = $state(false);

  const PADDING = { md: '16px 16px', sm: '10px 14px' } as const;
  const FONT_SIZE = { md: 'var(--fs-input)', sm: 'var(--fs-body)' } as const;

  let baseStyle = $derived.by(() => {
    const colors =
      variant === 'primary'
        ? 'background: var(--accent); color: var(--accent-on); box-shadow: var(--shadow-glow);'
        : variant === 'danger'
          ? 'background: var(--danger); color: #fff; box-shadow: 0 8px 22px oklch(0.58 0.20 25 / 0.32);'
          : variant === 'secondary'
            ? 'background: var(--surface-2); color: var(--ink);'
            : 'background: transparent; color: var(--ink-muted);';
    return `
      width: 100%;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: ${PADDING[size]};
      border-radius: var(--r-md); border: 0;
      font-family: var(--font-display); font-weight: 600;
      font-size: ${FONT_SIZE[size]}; letter-spacing: -0.2px; line-height: 1.1;
      cursor: ${disabled ? 'not-allowed' : 'pointer'};
      opacity: ${disabled ? 0.4 : 1};
      transform: scale(${pressed ? 0.97 : 1});
      transition: transform var(--t-quick) var(--ease-out),
                  box-shadow var(--t-quick) var(--ease-out),
                  background var(--t-quick) var(--ease-out),
                  color var(--t-quick) var(--ease-out),
                  opacity var(--t-quick) var(--ease-out);
      ${colors}
    `;
  });
</script>

<button
  {type}
  {disabled}
  {onclick}
  data-autofocus={shouldAutofocus ? '' : undefined}
  aria-label={ariaLabel}
  onpointerdown={() => !disabled && (pressed = true)}
  onpointerup={() => (pressed = false)}
  onpointerleave={() => (pressed = false)}
  style={baseStyle + extraStyle}
>
  {@render children()}
</button>
