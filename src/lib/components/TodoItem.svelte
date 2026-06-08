<script lang="ts">
  import type { Todo } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { formatDueDate, formatMonthDay } from '$lib/schedule';
  import IconCheck from './icons/IconCheck.svelte';
  import IconKebab from './icons/IconKebab.svelte';

  let { todo, onEdit }: { todo: Todo; onEdit: (t: Todo) => void } = $props();

  let today = $derived(currentDate.value);
  let isNotYetOpen = $derived(!!todo.openDate && todo.openDate > today && !todo.done);
  let chipLabel = $derived(todo.dueDate && !todo.done ? formatDueDate(todo.dueDate, today) : null);
  let overdue = $derived(chipLabel === 'Overdue');
  // "Soon" (accent) = due today, tomorrow, or within the coming week (short weekday names).
  let soon = $derived(
    chipLabel != null &&
      !overdue &&
      (chipLabel === 'Today' ||
        chipLabel === 'Tomorrow' ||
        (chipLabel.length <= 3 && !chipLabel.includes(' ')))
  );
</script>

<div class="task-row" data-done={todo.done}>
  <button
    type="button"
    class="check"
    data-on={todo.done ? 'done' : undefined}
    onclick={() => store.toggleTodo(todo.id)}
    aria-pressed={todo.done}
    aria-label={todo.done ? `Mark ${todo.name} not done` : `Mark ${todo.name} done`}
  >
    {#if todo.done}<IconCheck />{/if}
  </button>

  <div class="name-wrap" style={isNotYetOpen ? 'opacity: 0.5;' : ''}>
    <span class="task-name" title={todo.name}>{todo.name}</span>
    {#if isNotYetOpen}
      <div class="meta">Opens {formatMonthDay(todo.openDate!)}</div>
    {/if}
  </div>

  {#if chipLabel}
    <span
      class="task-due"
      data-soon={soon}
      style={overdue ? 'color: var(--danger);' : ''}
      aria-label="Due {chipLabel}"
    >
      {chipLabel}
    </span>
  {/if}

  <button
    type="button"
    class="grip drag-handle"
    onclick={() => onEdit(todo)}
    aria-label={`Edit ${todo.name}`}
  >
    <IconKebab />
  </button>
</div>
