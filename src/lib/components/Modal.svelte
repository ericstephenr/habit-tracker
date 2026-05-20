<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    labelledby,
    describedby,
    children
  }: {
    open?: boolean;
    labelledby: string;
    describedby?: string;
    children: Snippet;
  } = $props();

  let dialogEl: HTMLDialogElement | null = $state(null);

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) dialogEl.showModal();
    else if (!open && dialogEl.open) dialogEl.close();
  });

  function close() {
    open = false;
  }

  function onDialogClick(e: MouseEvent) {
    // Per HTML spec, clicks on the backdrop have target === dialog; inner clicks differ.
    if (e.target === dialogEl) close();
  }
</script>

<dialog
  bind:this={dialogEl}
  onclose={close}
  onclick={onDialogClick}
  aria-labelledby={labelledby}
  aria-describedby={describedby}
  class="m-auto w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl backdrop:bg-slate-900/40"
>
  {@render children()}
</dialog>
