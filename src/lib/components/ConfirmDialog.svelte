<script lang="ts">
  import Sheet from './Sheet.svelte';
  import Button from './Button.svelte';

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

  function close() {
    open = false;
  }

  function confirm() {
    onConfirm();
    close();
  }
</script>

<Sheet bind:open labelledby="confirm-dialog-title" describedby="confirm-dialog-body" {title}>
  <div style="padding: 8px 24px 4px; display: flex; flex-direction: column; gap: 16px;">
    {#if body}
      <p
        id="confirm-dialog-body"
        style="margin: 0; font-family: var(--font-body); font-size: var(--fs-body);
               color: var(--ink-muted); line-height: 1.5;"
      >
        {body}
      </p>
    {/if}

    <div style="display: flex; gap: 10px; padding-top: 4px;">
      <Button variant="secondary" onclick={close} autofocus>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} onclick={confirm}>{confirmLabel}</Button>
    </div>
  </div>
</Sheet>
