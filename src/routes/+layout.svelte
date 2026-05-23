<script lang="ts">
  import '../app.css';
  import { appearance } from '$lib/appearance.svelte';

  // Touch the singleton so it instantiates on the client and reflects persisted
  // theme/accent to the <html> element on first paint.
  void appearance;

  let { children } = $props();
</script>

{@render children()}

<div
  id="confetti-layer"
  aria-hidden="true"
  style="position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 70;"
></div>
