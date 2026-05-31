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
  <path d="M6 6 L18 18" />
  <path d="M18 6 L6 18" />
</svg>
