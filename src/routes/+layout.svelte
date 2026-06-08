<script lang="ts">
  import '../app.css';
  import { appearance } from '$lib/appearance.svelte';

  // Touch the singleton so it instantiates on the client and reflects the
  // persisted theme to the <html> element on first paint.
  void appearance;

  let { children } = $props();
</script>

{@render children()}
