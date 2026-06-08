<script lang="ts">
  import type { Note } from '$lib/types';

  let { note, onOpen }: { note: Note; onOpen: (n: Note) => void } = $props();

  let hasTitle = $derived(note.title.trim().length > 0);

  function edited(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = 60000,
      hr = 3600000,
      day = 86400000;
    if (diff < min) return 'just now';
    if (diff < hr) return `${Math.floor(diff / min)}m ago`;
    if (diff < day) return `${Math.floor(diff / hr)}h ago`;
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

<button class="note" onclick={() => onOpen(note)}>
  <h3 class="note-title" data-empty={!hasTitle}>{hasTitle ? note.title.trim() : 'Untitled'}</h3>
  {#if note.body.trim()}
    <p class="note-body">{note.body}</p>
  {/if}
  <div class="note-meta">Edited {edited(note.updatedAt)}</div>
</button>
