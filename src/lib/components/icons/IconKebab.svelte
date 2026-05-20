<script lang="ts">
  let { class: klass = '' }: { class?: string } = $props();
</script>

<svg viewBox="0 0 24 24" class={klass} fill="currentColor" aria-hidden="true">
  <circle cx="12" cy="5" r="1.6" />
  <circle cx="12" cy="12" r="1.6" />
  <circle cx="12" cy="19" r="1.6" />
</svg>
