<script lang="ts">
  import { store } from '$lib/store.svelte';
  import { appearance, type Accent } from '$lib/appearance.svelte';
  import { emptyAppData } from '$lib/types';
  import {
    buildExportPayload,
    downloadJson,
    exportFilename,
    parseImportText,
    readFile
  } from '$lib/importExport';
  import { readBackup, clearBackup } from '$lib/storage';
  import type { AppData } from '$lib/types';
  import Sheet from './Sheet.svelte';
  import SegmentToggle from './SegmentToggle.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let errorMessage = $state('');
  let pendingImport = $state<AppData | null>(null);
  let confirmImportOpen = $state(false);
  let confirmResetOpen = $state(false);
  let confirmBody = $state('');
  let fileInputEl: HTMLInputElement | null = $state(null);
  let browserBackupRaw = $state<string | null>(null);

  $effect(() => {
    if (!open) {
      errorMessage = '';
      pendingImport = null;
      confirmImportOpen = false;
      confirmResetOpen = false;
      if (fileInputEl) fileInputEl.value = '';
      return;
    }
    // Re-check on every open so the button reflects current backup state.
    browserBackupRaw = readBackup();
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

    const pluralize = (n: number, w: string) => (n === 1 ? `${n} ${w}` : `${n} ${w}s`);
    const cur = store.data;
    const nxt = result.data;
    pendingImport = nxt;
    confirmBody =
      `Replace your ${pluralize(cur.habits.length, 'habit')}, ` +
      `${pluralize(cur.completions.length, 'completion')}, ` +
      `${pluralize(cur.sections.length, 'section')} and ` +
      `${pluralize(cur.todos.length, 'task')} with ` +
      `${pluralize(nxt.habits.length, 'habit')}, ` +
      `${pluralize(nxt.completions.length, 'completion')}, ` +
      `${pluralize(nxt.sections.length, 'section')} and ` +
      `${pluralize(nxt.todos.length, 'task')} from the file? This cannot be undone.`;
    confirmImportOpen = true;
  }

  function doReplace() {
    if (!pendingImport) return;
    store.replaceAll(pendingImport);
    pendingImport = null;
    close();
  }

  function restoreFromBrowserBackup() {
    if (!browserBackupRaw) return;
    errorMessage = '';
    const result = parseImportText(browserBackupRaw);
    if (!result.ok) {
      errorMessage = result.error;
      return;
    }
    const pluralize = (n: number, w: string) => (n === 1 ? `${n} ${w}` : `${n} ${w}s`);
    const cur = store.data;
    const nxt = result.data;
    pendingImport = nxt;
    confirmBody =
      `Restore ${pluralize(nxt.habits.length, 'habit')}, ` +
      `${pluralize(nxt.completions.length, 'completion')}, ` +
      `${pluralize(nxt.sections.length, 'section')} and ` +
      `${pluralize(nxt.todos.length, 'task')} from the browser backup? ` +
      `Your current ${pluralize(cur.habits.length, 'habit')} and ` +
      `${pluralize(cur.todos.length, 'task')} will be replaced.`;
    confirmImportOpen = true;
  }

  function doReplace_andClearBackup() {
    doReplace();
    clearBackup();
    browserBackupRaw = null;
  }

  function doReset() {
    store.replaceAll(emptyAppData());
    close();
  }

  const ACCENTS: Array<{ value: Accent; color: string }> = [
    { value: 'violet', color: 'oklch(0.62 0.22 300)' },
    { value: 'tangerine', color: 'oklch(0.72 0.18 50)' },
    { value: 'lime', color: 'oklch(0.72 0.2 135)' },
    { value: 'cobalt', color: 'oklch(0.55 0.22 260)' }
  ];

  function rowStyle(danger = false) {
    return (
      'display: flex; align-items: center; gap: 14px;' +
      ' padding: 14px 8px; background: transparent; border: 0;' +
      ' border-radius: 12px; cursor: pointer; text-align: left; width: 100%;' +
      ' font-family: var(--font-body); font-size: 16px;' +
      ` color: ${danger ? 'var(--danger)' : 'var(--ink)'};`
    );
  }
  function iconStyle(danger = false) {
    return (
      'width: 32px; height: 32px; border-radius: 10px;' +
      ` background: ${danger ? 'var(--danger-soft)' : 'var(--surface-2)'};` +
      ' display: flex; align-items: center; justify-content: center;' +
      ' font-family: var(--font-display); font-weight: 600; flex-shrink: 0;' +
      ` color: ${danger ? 'var(--danger)' : 'var(--ink)'};`
    );
  }
</script>

<Sheet bind:open labelledby="data-modal-title" title="Settings">
  <div style="padding: 8px 24px 4px; display: flex; flex-direction: column; gap: 8px;">
    <button onclick={handleExport} style={rowStyle()}>
      <span aria-hidden="true" style={iconStyle()}>↓</span>
      Export data
    </button>
    <button onclick={chooseFile} style={rowStyle()}>
      <span aria-hidden="true" style={iconStyle()}>↑</span>
      Import from backup
    </button>
    {#if browserBackupRaw}
      <button onclick={restoreFromBrowserBackup} style={rowStyle()}>
        <span aria-hidden="true" style={iconStyle()}>↩</span>
        Restore from browser backup
      </button>
    {/if}
    <button onclick={() => (confirmResetOpen = true)} style={rowStyle(true)}>
      <span aria-hidden="true" style={iconStyle(true)}>⟲</span>
      Reset all data
    </button>

    {#if errorMessage}
      <div
        role="alert"
        style="margin: 4px 8px; padding: 8px 12px; border-radius: 10px;
               background: var(--danger-soft); color: var(--danger);
               font-family: var(--font-body); font-size: 12px;"
      >
        {errorMessage}
      </div>
    {/if}

    <input
      bind:this={fileInputEl}
      type="file"
      accept="application/json,.json"
      onchange={onPick}
      style="display: none;"
    />

    <div style="height: 1px; background: var(--line); margin: 8px 0;"></div>

    <div style="padding: 4px 0 8px;">
      <div
        style="font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
               text-transform: uppercase; color: var(--ink-muted);
               margin-bottom: 12px;"
      >
        Appearance
      </div>
      <SegmentToggle
        value={appearance.theme}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' }
        ]}
        onChange={(v) => appearance.setTheme(v)}
      />
    </div>

    <div style="padding: 4px 0 4px;">
      <div
        style="font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
               text-transform: uppercase; color: var(--ink-muted);
               margin-bottom: 12px;"
      >
        Accent color
      </div>
      <div style="display: flex; gap: 12px;">
        {#each ACCENTS as a (a.value)}
          {@const selected = appearance.accent === a.value}
          <button
            type="button"
            onclick={() => appearance.setAccent(a.value)}
            aria-label={a.value}
            aria-pressed={selected}
            style="width: 48px; height: 48px; border-radius: 14px;
                   background: {a.color}; cursor: pointer; padding: 0;
                   border: 3px solid {selected ? 'var(--ink)' : 'transparent'};
                   box-shadow: 0 4px 12px {a.color}40;
                   transition: transform 140ms;"
          ></button>
        {/each}
      </div>
    </div>
  </div>
</Sheet>

<ConfirmDialog
  bind:open={confirmImportOpen}
  title="Replace all data?"
  body={confirmBody}
  confirmLabel="Replace"
  danger
  onConfirm={doReplace_andClearBackup}
/>

<ConfirmDialog
  bind:open={confirmResetOpen}
  title="Reset all data?"
  body="This permanently deletes all habits, sections, tasks and completion history. Export a backup first if you want to keep anything."
  confirmLabel="Reset everything"
  danger
  onConfirm={doReset}
/>
