<script lang="ts">
  let { class: klass = '' }: { class?: string } = $props();
</script>

<svg viewBox="0 0 24 24" class={klass} fill="currentColor" aria-hidden="true">
  <circle cx="9" cy="6" r="1.5" />
  <circle cx="15" cy="6" r="1.5" />
  <circle cx="9" cy="12" r="1.5" />
  <circle cx="15" cy="12" r="1.5" />
  <circle cx="9" cy="18" r="1.5" />
  <circle cx="15" cy="18" r="1.5" />
</svg>
