<script lang="ts">
  import { tick } from 'svelte';
  import Modal from './Modal.svelte';

  let {
    open = $bindable(false),
    title,
    body,
    confirmLabel = 'Confirm',
    danger = false,
    onConfirm
  }: {
    open?: boolean;
    title: string;
    body: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } = $props();

  let cancelEl: HTMLButtonElement | null = $state(null);

  $effect(() => {
    if (!open) return;
    tick().then(() => cancelEl?.focus());
  });

  function close() {
    open = false;
  }

  function confirm() {
    onConfirm();
    close();
  }
</script>

<Modal bind:open labelledby="confirm-dialog-title" describedby="confirm-dialog-body">
  <h2 id="confirm-dialog-title" class="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
  <p id="confirm-dialog-body" class="mb-5 text-sm text-slate-600">{body}</p>

  <div class="flex justify-end gap-2">
    <button
      bind:this={cancelEl}
      type="button"
      onclick={close}
      class="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >Cancel</button
    >
    <button
      type="button"
      onclick={confirm}
      class="rounded-lg px-3 py-2 text-sm font-medium text-white {danger
        ? 'bg-rose-600 hover:bg-rose-700'
        : 'bg-teal-600 hover:bg-teal-700'}">{confirmLabel}</button
    >
  </div>
</Modal>
