<script lang="ts">
  import { store } from '$lib/store.svelte';
  import {
    buildExportPayload,
    downloadJson,
    exportFilename,
    parseImportText,
    readFile
  } from '$lib/importExport';
  import type { AppData } from '$lib/types';
  import Modal from './Modal.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let errorMessage = $state('');
  let pendingImport = $state<AppData | null>(null);
  let confirmOpen = $state(false);
  let confirmBody = $state('');
  let fileInputEl: HTMLInputElement | null = $state(null);

  $effect(() => {
    if (!open) {
      errorMessage = '';
      pendingImport = null;
      confirmOpen = false;
      if (fileInputEl) fileInputEl.value = '';
    }
  });

  function close() {
    open = false;
  }

  function handleExport() {
    downloadJson(exportFilename(), buildExportPayload(store.data));
  }

  function chooseFile() {
    errorMessage = '';
    fileInputEl?.click();
  }

  async function onPick(e: Event) {
    errorMessage = '';
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    // Reset immediately so re-picking the same file fires `change` again.
    input.value = '';
    if (!file) return;

    let raw: string;
    try {
      raw = await readFile(file);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't read the file. Try again.";
      return;
    }

    const result = parseImportText(raw);
    if (!result.ok) {
      errorMessage = result.error;
      return;
    }

    const s = (n: number) => (n === 1 ? '' : 's');
    const cur = store.data;
    const nxt = result.data;
    pendingImport = nxt;
    confirmBody =
      `Replace your ${cur.habits.length} habit${s(cur.habits.length)} and ` +
      `${cur.completions.length} completion${s(cur.completions.length)} ` +
      `with ${nxt.habits.length} habit${s(nxt.habits.length)} and ` +
      `${nxt.completions.length} completion${s(nxt.completions.length)} from the file? ` +
      `This cannot be undone.`;
    confirmOpen = true;
  }

  function doReplace() {
    if (!pendingImport) return;
    store.replaceAll(pendingImport);
    pendingImport = null;
    close();
  }
</script>

<Modal bind:open labelledby="data-modal-title">
  <h2 id="data-modal-title" class="mb-4 text-lg font-semibold text-slate-900">Data</h2>

  <section class="mb-5">
    <h3 class="text-sm font-medium text-slate-700">Export</h3>
    <p class="mt-1 mb-2 text-xs text-slate-500">
      Download all habits and completions as a JSON file.
    </p>
    <button
      type="button"
      onclick={handleExport}
      class="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >Export to JSON</button
    >
  </section>

  <section>
    <h3 class="text-sm font-medium text-slate-700">Import</h3>
    <p class="mt-1 mb-2 text-xs text-slate-500">
      Replace current habits and completions with the contents of a previously exported JSON file.
    </p>
    <button
      type="button"
      onclick={chooseFile}
      class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
      >Choose file…</button
    >
    <input
      bind:this={fileInputEl}
      type="file"
      accept="application/json,.json"
      hidden
      onchange={onPick}
    />
  </section>

  <p id="data-modal-error" class="mt-3 min-h-[1.25rem] text-xs text-rose-600" aria-live="polite">
    {errorMessage}
  </p>

  <div class="mt-3 flex justify-end">
    <button
      type="button"
      onclick={close}
      class="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >Close</button
    >
  </div>
</Modal>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Replace all data?"
  body={confirmBody}
  confirmLabel="Replace"
  danger
  onConfirm={doReplace}
/>
