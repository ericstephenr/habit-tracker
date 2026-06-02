<script lang="ts">
  import type { Note } from '$lib/types';

  let { note, onOpen }: { note: Note; onOpen: (n: Note) => void } = $props();

  let hasTitle = $derived(note.title.trim().length > 0);
  let title = $derived(hasTitle ? note.title.trim() : 'Untitled');
  let preview = $derived(note.body.trim().split('\n')[0]);
</script>

<button class="note-card" onclick={() => onOpen(note)}>
  <span class="note-title" class:untitled={!hasTitle}>{title}</span>
  {#if preview}
    <span class="note-preview">{preview}</span>
  {/if}
</button>

<style>
  .note-card {
    width: 100%;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface);
    border-radius: var(--r-lg);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-1);
    padding: var(--card-pad);
    cursor: pointer;
    transition:
      border-color var(--t-quick) var(--ease-out),
      background var(--t-quick) var(--ease-out);
  }
  .note-card:hover {
    border-color: var(--line-strong);
    background: var(--surface-2);
  }
  .note-title {
    font-family: var(--font-body);
    font-size: var(--fs-input);
    font-weight: 600;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .note-title.untitled {
    font-weight: 500;
    color: var(--ink-faint);
  }
  .note-preview {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--ink-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
