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
  <path d="M4 5 L11 12 L4 19" />
  <path d="M12 5 L19 12 L12 19" />
</svg>
