<script lang="ts">
  import { untrack } from 'svelte';
  import type { Note } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let {
    note,
    isNew = false,
    onBack
  }: { note: Note; isNew?: boolean; onBack: () => void } = $props();

  // Seed editable copies from the note once. The parent wraps this in {#key note.id},
  // so switching notes remounts and re-seeds; autosave mutates the store's note object,
  // not these locals.
  let title = $state(untrack(() => note.title));
  let body = $state(untrack(() => note.body));
  let titleEl: HTMLInputElement | undefined = $state();
  let confirmDeleteOpen = $state(false);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let handled = false; // guards against the unmount effect re-handling after Back/Delete

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (title !== note.title || body !== note.body) {
      store.updateNote(note.id, { title, body });
    }
  }

  function scheduleSave() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 500);
  }

  // Persist on leave; a brand-new note left blank is discarded rather than littering the list.
  function commit() {
    if (handled) return;
    handled = true;
    flush();
    if (isNew && !title.trim() && !body.trim()) store.deleteNote(note.id);
  }

  function back() {
    commit();
    onBack();
  }

  function remove() {
    handled = true;
    if (timer) clearTimeout(timer);
    store.deleteNote(note.id);
    onBack();
  }

  // Runs once; cleanup fires on unmount (e.g. switching tabs) so edits still flush.
  $effect(() => () => commit());

  // Focus the title of a freshly created note.
  $effect(() => {
    if (isNew && titleEl) titleEl.focus();
  });

  function autosize(node: HTMLTextAreaElement) {
    const resize = () => {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    };
    resize();
    node.addEventListener('input', resize);
    return { destroy: () => node.removeEventListener('input', resize) };
  }
</script>

<div class="note-editor">
  <div class="note-editor-bar">
    <button type="button" class="bar-btn" onclick={back} aria-label="Back to notes">
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5l-5 5 5 5" />
      </svg>
      Notes
    </button>
    <button type="button" class="bar-btn danger" onclick={() => (confirmDeleteOpen = true)}>
      Delete
    </button>
  </div>

  <input
    bind:this={titleEl}
    bind:value={title}
    oninput={scheduleSave}
    placeholder="Title"
    class="note-title-input"
  />

  <div class="note-divider"></div>

  <textarea
    bind:value={body}
    oninput={scheduleSave}
    use:autosize
    placeholder="Start writing…"
    class="note-body-input"
  ></textarea>
</div>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete note?"
  body={`This permanently removes "${title.trim() || 'Untitled'}".`}
  confirmLabel="Delete"
  danger
  onConfirm={remove}
/>

<style>
  .note-editor {
    display: flex;
    flex-direction: column;
    padding: 8px 16px 0;
  }

  .note-editor-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .bar-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 0;
    background: transparent;
    color: var(--ink-muted);
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    padding: 8px 10px;
    border-radius: var(--r-sm);
    transition:
      background var(--t-quick) var(--ease-out),
      color var(--t-quick) var(--ease-out);
  }
  .bar-btn:hover {
    background: var(--surface-2);
    color: var(--ink);
  }
  .bar-btn.danger {
    color: var(--danger);
  }
  .bar-btn.danger:hover {
    background: var(--danger-soft);
    color: var(--danger);
  }

  .note-title-input {
    width: 100%;
    box-sizing: border-box;
    border: 0;
    background: transparent;
    outline: none;
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.6px;
    color: var(--ink);
    padding: 6px 2px;
  }
  .note-title-input::placeholder {
    color: var(--ink-faint);
  }

  .note-divider {
    height: 1px;
    background: var(--line);
    margin: 6px 2px 10px;
  }

  .note-body-input {
    width: 100%;
    box-sizing: border-box;
    border: 0;
    background: transparent;
    outline: none;
    resize: none;
    overflow: hidden;
    min-height: 55vh;
    font-family: var(--font-body);
    font-size: var(--fs-input);
    line-height: 1.6;
    color: var(--ink);
    padding: 2px;
  }
  .note-body-input::placeholder {
    color: var(--ink-faint);
  }
</style>
