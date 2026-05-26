<script lang="ts">
  import type { Todo } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { formatDueDate, formatMonthDay } from '$lib/schedule';
  import IconCheck from './icons/IconCheck.svelte';
  import IconGrip from './icons/IconGrip.svelte';

  let { todo, onEdit }: { todo: Todo; onEdit: (t: Todo) => void } = $props();

  let pressed = $state(false);

  let today = $derived(currentDate.value);
  let isNotYetOpen = $derived(!!todo.openDate && todo.openDate > today && !todo.done);
  let chipLabel = $derived(todo.dueDate && !todo.done ? formatDueDate(todo.dueDate, today) : null);
  let chipColors = $derived.by(() => {
    if (!chipLabel) return null;
    if (chipLabel === 'Overdue') return { color: 'var(--danger)', bg: 'var(--danger-soft)' };
    if (chipLabel === 'Today') return { color: 'var(--warn)', bg: 'var(--warn-soft)' };
    if (chipLabel === 'Tomorrow') return { color: 'var(--caution)', bg: 'var(--caution-soft)' };
    // Short weekday names (Mon–Sun) are within 7 days
    if (chipLabel.length <= 3 && !chipLabel.includes(' '))
      return { color: 'var(--caution)', bg: 'var(--caution-soft)' };
    return { color: 'var(--ink-muted)', bg: 'var(--surface-2)' };
  });

  function toggle() {
    store.toggleTodo(todo.id);
  }
</script>

<div
  class="ht-card"
  style="background: {todo.done
    ? 'var(--accent-fill)'
    : 'var(--surface)'}; border-radius: var(--r-lg);
         border: 1px solid {todo.done ? 'var(--accent-soft)' : 'var(--line)'};
         box-shadow: var(--shadow-1);
         display: flex; align-items: center; gap: var(--card-gap); padding: var(--card-pad);
         transition: background var(--t-normal) var(--ease-out),
                     border-color var(--t-normal) var(--ease-out),
                     box-shadow var(--t-normal) var(--ease-out);"
>
  <button
    type="button"
    onclick={toggle}
    onpointerdown={() => (pressed = true)}
    onpointerup={() => (pressed = false)}
    onpointerleave={() => (pressed = false)}
    aria-pressed={todo.done}
    aria-label={todo.done ? `Mark ${todo.name} not done` : `Mark ${todo.name} done`}
    style="width: var(--card-ctrl); height: var(--card-ctrl); border-radius: var(--r-sm);
           flex-shrink: 0; border: 0; padding: 0;
           background: {todo.done ? 'var(--accent)' : 'var(--surface-2)'};
           color: {todo.done ? 'var(--accent-on)' : 'transparent'};
           display: flex; align-items: center; justify-content: center;
           cursor: pointer; position: relative; overflow: hidden;
           transition: background var(--t-normal) var(--ease-out),
                       transform var(--t-quick) var(--ease-spring),
                       box-shadow var(--t-normal) var(--ease-spring);
           transform: scale({pressed ? 0.86 : 1});
           box-shadow: {todo.done
      ? '0 4px 12px var(--accent-glow)'
      : 'inset 0 0 0 1.5px var(--line-strong)'};"
  >
    <span
      style="transform: scale({todo.done ? 1 : 0});
             transition: transform 280ms cubic-bezier(.2,1.6,.4,1) 60ms;
             display: flex; align-items: center; justify-content: center;"
    >
      <IconCheck class="h-4 w-4" />
    </span>
  </button>

  <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
    <span
      title={todo.name}
      style="font-family: var(--font-body); font-size: var(--fs-input); font-weight: 500;
             color: var(--ink); opacity: {todo.done ? 0.5 : isNotYetOpen ? 0.45 : 1};
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
             {todo.done ? 'text-decoration: line-through;' : ''}
             transition: all 200ms;"
    >
      {todo.name}
    </span>
    {#if isNotYetOpen}
      <span
        style="font-size: var(--fs-overline); color: var(--ink-faint);
               font-family: var(--font-display); font-weight: 600; letter-spacing: 0.1px;"
      >
        Opens {formatMonthDay(todo.openDate!)}
      </span>
    {/if}
  </span>

  {#if chipLabel && chipColors}
    <span
      style="flex-shrink: 0; padding: 3px 8px; border-radius: var(--r-pill);
             font-family: var(--font-display); font-size: var(--fs-overline); font-weight: 700;
             letter-spacing: 0.2px;
             background: {chipColors.bg}; color: {chipColors.color};
             white-space: nowrap;"
      aria-label="Due {chipLabel}"
    >
      {chipLabel}
    </span>
  {/if}

  <button
    type="button"
    class="drag-handle"
    onclick={() => onEdit(todo)}
    aria-label={`Edit ${todo.name}`}
    style="width: var(--card-ctrl); height: var(--card-ctrl); border: 0; background: transparent; padding: 0;
           color: var(--ink-faint); cursor: pointer; flex-shrink: 0;
           display: flex; align-items: center; justify-content: center;
           border-radius: var(--r-pill); touch-action: none;
           transition: background var(--t-quick) var(--ease-out), color var(--t-quick) var(--ease-out);"
    onmouseenter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
      (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-muted)';
    }}
    onmouseleave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)';
    }}
  >
    <IconGrip class="h-5 w-5" />
  </button>
</div>
