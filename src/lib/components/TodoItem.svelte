<script lang="ts">
  import type { Todo } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import IconCheck from './icons/IconCheck.svelte';
  import IconGrip from './icons/IconGrip.svelte';

  let { todo, onEdit }: { todo: Todo; onEdit: (t: Todo) => void } = $props();

  let pressed = $state(false);

  function toggle() {
    store.toggleTodo(todo.id);
  }
</script>

<div
  class="ht-card"
  style="background: var(--surface); border-radius: var(--r-lg);
         border: 1px solid {todo.done ? 'transparent' : 'var(--line)'};
         box-shadow: var(--shadow-1);
         display: flex; align-items: center; gap: var(--card-gap); padding: var(--card-pad);
         transition: border-color var(--t-normal) var(--ease-out), box-shadow var(--t-normal) var(--ease-out);"
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

  <span
    title={todo.name}
    style="flex: 1; min-width: 0;
           font-family: var(--font-body); font-size: var(--fs-input); font-weight: 500;
           color: var(--ink); opacity: {todo.done ? 0.5 : 1};
           overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
           {todo.done ? 'text-decoration: line-through;' : ''}
           transition: all 200ms;"
  >
    {todo.name}
  </span>

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
    <IconGrip class="h-4 w-4" />
  </button>
</div>
