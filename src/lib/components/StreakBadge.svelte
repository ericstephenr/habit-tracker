<script lang="ts">
  let { streak }: { streak: number } = $props();
</script>

{#if streak > 0}
  <span
    class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
    aria-label="{streak} day streak"
  >
    <span aria-hidden="true">🔥</span>
    <span aria-hidden="true">{streak}</span>
  </span>
{/if}
