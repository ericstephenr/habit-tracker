<script lang="ts">
  let { class: klass = '' }: { class?: string } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  class={klass}
  fill="none"
  stroke="currentColor"
  stroke-width="2.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="m15 18-6-6 6-6" />
</svg>
