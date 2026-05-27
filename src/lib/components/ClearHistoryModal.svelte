<script lang="ts">
  import { store } from '$lib/store.svelte';
  import Sheet from './Sheet.svelte';
  import Button from './Button.svelte';
  import Field from './Field.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let cutoffDate = $state('');
  let confirmOpen = $state(false);

  $effect(() => {
    if (!open) {
      cutoffDate = '';
      confirmOpen = false;
    }
  });

  let completionsToRemove = $derived(
    cutoffDate ? store.data.completions.filter((c) => c.date < cutoffDate).length : 0
  );
  let habitsToAdjust = $derived(
    cutoffDate ? store.data.habits.filter((h) => h.startDate < cutoffDate).length : 0
  );
  let hasImpact = $derived(completionsToRemove > 0 || habitsToAdjust > 0);

  function formatDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${+m}/${+day}/${y}`;
  }

  function doConfirm() {
    confirmOpen = true;
  }

  function doClear() {
    store.clearHistoryBefore(cutoffDate);
    open = false;
  }
</script>

<Sheet bind:open labelledby="clear-history-title" title="Clear history before date">
  <div style="padding: 8px 24px 4px; display: flex; flex-direction: column; gap: 16px;">
    <Field label="Delete all data before">
      <input
        type="date"
        bind:value={cutoffDate}
        style="width: 100%; padding: 10px 12px; border-radius: 10px;
               border: 1px solid var(--line); background: var(--surface-2);
               color: var(--ink); font-family: var(--font-body); font-size: 16px;"
      />
    </Field>

    {#if cutoffDate}
      {#if hasImpact}
        <div
          style="padding: 12px 14px; border-radius: 10px;
                 background: var(--danger-soft); color: var(--danger);
                 font-family: var(--font-body); font-size: 14px; line-height: 1.5;"
        >
          This will permanently delete
          <strong>{completionsToRemove}</strong>
          completion {completionsToRemove === 1 ? 'record' : 'records'}{habitsToAdjust > 0
            ? ` and move the start date of ${habitsToAdjust} habit${habitsToAdjust === 1 ? '' : 's'} forward to ${formatDate(cutoffDate)}`
            : ''}. This cannot be undone.
        </div>
      {:else}
        <div
          style="padding: 12px 14px; border-radius: 10px;
                 background: var(--surface-2); color: var(--ink-muted);
                 font-family: var(--font-body); font-size: 14px; line-height: 1.5;"
        >
          No data exists before {formatDate(cutoffDate)}.
        </div>
      {/if}
    {/if}

    <div style="display: flex; gap: 10px; padding-top: 4px;">
      <Button variant="secondary" onclick={() => (open = false)}>Cancel</Button>
      <Button variant="danger" disabled={!cutoffDate || !hasImpact} onclick={doConfirm}>
        Clear history
      </Button>
    </div>
  </div>
</Sheet>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Are you sure?"
  body="This will permanently erase all habit completion history before {cutoffDate
    ? formatDate(cutoffDate)
    : ''} and cannot be undone. Consider exporting a backup first."
  confirmLabel="Delete permanently"
  danger
  onConfirm={doClear}
/>
