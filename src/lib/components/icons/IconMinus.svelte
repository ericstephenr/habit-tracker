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
  aria-hidden="true"
>
  <path d="M5 12h14" />
</svg>
