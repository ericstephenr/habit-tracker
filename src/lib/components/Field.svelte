<script lang="ts">
  import type { Snippet } from 'svelte';

  let { label, children }: { label: string; children: Snippet } = $props();
</script>

<label style="display: flex; flex-direction: column; gap: 8px;">
  <span
    style="font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
           text-transform: uppercase; color: var(--ink-muted);"
  >
    {label}
  </span>
  {@render children()}
</label>
