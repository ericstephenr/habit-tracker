<script lang="ts">
  import { store } from '$lib/store.svelte';
  import { appearance, type Accent } from '$lib/appearance.svelte';
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
  import ClearHistoryModal from './ClearHistoryModal.svelte';
  import IconMinus from './icons/IconMinus.svelte';
  import IconPlus from './icons/IconPlus.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let clearHistoryOpen = $state(false);

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
      `${pluralize(cur.sections.length, 'section')}, ` +
      `${pluralize(cur.todos.length, 'task')} and ` +
      `${pluralize(cur.notes.length, 'note')} with ` +
      `${pluralize(nxt.habits.length, 'habit')}, ` +
      `${pluralize(nxt.completions.length, 'completion')}, ` +
      `${pluralize(nxt.sections.length, 'section')}, ` +
      `${pluralize(nxt.todos.length, 'task')} and ` +
      `${pluralize(nxt.notes.length, 'note')} from the file? This cannot be undone.`;
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
      `${pluralize(nxt.sections.length, 'section')}, ` +
      `${pluralize(nxt.todos.length, 'task')} and ` +
      `${pluralize(nxt.notes.length, 'note')} from the browser backup? ` +
      `Your current ${pluralize(cur.habits.length, 'habit')} and ` +
      `${pluralize(cur.todos.length, 'task')} will be replaced.`;
    confirmImportOpen = true;
  }

  function doReplace_andClearBackup() {
    doReplace();
    clearBackup();
    browserBackupRaw = null;
  }

  async function doReset() {
    await store.resetAll();
    close();
  }

  const MAX_GRACE_DAYS = 7;

  function nudgeGrace(delta: number) {
    const current = store.data.settings.autoFail.graceDays;
    const next = Math.min(MAX_GRACE_DAYS, Math.max(0, current + delta));
    if (next !== current) store.setAutoFail({ graceDays: next });
  }

  function graceMeta(n: number): string {
    if (n === 0) return 'Today stays editable; yesterday and older misses turn Failed.';
    const days = n === 1 ? 'day' : 'days';
    return `Today and the previous ${n} ${days} stay editable; older misses turn Failed.`;
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
    <button onclick={() => (clearHistoryOpen = true)} style={rowStyle(true)}>
      <span aria-hidden="true" style={iconStyle(true)}>✂</span>
      Clear history before date
    </button>
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

    <div style="height: 1px; background: var(--line); margin: 8px 0;"></div>

    <div style="padding: 4px 0 8px;">
      <div
        style="font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
               text-transform: uppercase; color: var(--ink-muted);
               margin-bottom: 8px;"
      >
        Auto-fail missed habits
      </div>
      <p
        style="margin: 0 0 12px; font-family: var(--font-body); font-size: 12px;
               line-height: 1.45; color: var(--ink-faint);"
      >
        Mark scheduled days you didn't complete as Failed once they fall outside a grace window — so
        old misses show clearly instead of looking unfinished.
      </p>
      <SegmentToggle
        value={store.data.settings.autoFail.enabled ? 'on' : 'off'}
        options={[
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' }
        ]}
        onChange={(v) => store.setAutoFail({ enabled: v === 'on' })}
        aria-label="Auto-fail missed habits"
      />

      {#if store.data.settings.autoFail.enabled}
        {@const grace = store.data.settings.autoFail.graceDays}
        <div
          style="margin-top: 14px; display: flex; align-items: center;
                 justify-content: space-between; gap: 12px;"
        >
          <div style="min-width: 0;">
            <div style="font-family: var(--font-body); font-size: 14px; color: var(--ink);">
              Grace period
            </div>
            <div
              style="margin-top: 2px; font-family: var(--font-body); font-size: 12px;
                     line-height: 1.4; color: var(--ink-faint);"
            >
              {graceMeta(grace)}
            </div>
          </div>
          <div
            style="display: flex; align-items: center; flex-shrink: 0;
                   background: var(--surface-2); border-radius: 9999px; padding: 3px;"
          >
            <button
              type="button"
              onclick={() => nudgeGrace(-1)}
              disabled={grace === 0}
              aria-label="Decrease grace period by one day"
              style="width: 32px; height: 32px; border: 0; padding: 0;
                     background: transparent; border-radius: 9999px;
                     color: var(--ink-muted); cursor: pointer;
                     display: flex; align-items: center; justify-content: center;
                     opacity: {grace === 0 ? 0.35 : 1};"
            >
              <IconMinus class="h-3.5 w-3.5" />
            </button>
            <span
              aria-live="polite"
              style="padding: 0 10px; min-width: 64px; text-align: center;
                     font-family: var(--font-display); font-size: 14px; font-weight: 700;
                     color: var(--ink); font-variant-numeric: tabular-nums;"
            >
              {grace}
              {grace === 1 ? 'day' : 'days'}
            </span>
            <button
              type="button"
              onclick={() => nudgeGrace(1)}
              disabled={grace === MAX_GRACE_DAYS}
              aria-label="Increase grace period by one day"
              style="width: 32px; height: 32px; border: 0; padding: 0;
                     background: transparent; border-radius: 9999px;
                     color: var(--ink-muted); cursor: pointer;
                     display: flex; align-items: center; justify-content: center;
                     opacity: {grace === MAX_GRACE_DAYS ? 0.35 : 1};"
            >
              <IconPlus class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      {/if}
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

<ClearHistoryModal bind:open={clearHistoryOpen} />

<ConfirmDialog
  bind:open={confirmResetOpen}
  title="Reset all data?"
  body="This permanently deletes all habits, sections, tasks, notes and completion history. Export a backup first if you want to keep anything."
  confirmLabel="Reset everything"
  danger
  onConfirm={doReset}
/>
