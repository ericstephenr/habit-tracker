<script lang="ts">
  import type { Habit, Section, Todo } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { todayISO } from '$lib/schedule';
  import { readBackup } from '$lib/storage';
  import { downloadJson } from '$lib/importExport';
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { fireDayCompleteBursts } from '$lib/confetti';
  import HabitItem from '$lib/components/HabitItem.svelte';
  import TodoItem from '$lib/components/TodoItem.svelte';
  import AddHabitModal from '$lib/components/AddHabitModal.svelte';
  import DataModal from '$lib/components/DataModal.svelte';
  import SectionHeader from '$lib/components/SectionHeader.svelte';
  import SectionModal from '$lib/components/SectionModal.svelte';
  import TodoModal from '$lib/components/TodoModal.svelte';
  import DayStrip from '$lib/components/DayStrip.svelte';
  import ProgressHero from '$lib/components/ProgressHero.svelte';
  import IconPlus from '$lib/components/icons/IconPlus.svelte';
  import IconGear from '$lib/components/icons/IconGear.svelte';
  import Sortable from 'sortablejs';
  import { SvelteMap } from 'svelte/reactivity';

  let activeTab = $state<'habits' | 'todos'>('habits');

  let modalOpen = $state(false);
  let dataModalOpen = $state(false);
  let editingHabit = $state<Habit | undefined>(undefined);

  let sectionModalOpen = $state(false);
  let editingSection = $state<Section | undefined>(undefined);

  let todoModalOpen = $state(false);
  let editingTodo = $state<Todo | undefined>(undefined);
  let newTodoName = $state('');
  let todoInputFocused = $state(false);

  let ungroupedUlRef: HTMLUListElement | undefined = $state();
  let sectionsContainerRef: HTMLDivElement | undefined = $state();
  const sectionUlMap = new SvelteMap<string, HTMLUListElement>();

  let ungroupedTodosUlRef: HTMLUListElement | undefined = $state();
  let todoSectionsContainerRef: HTMLDivElement | undefined = $state();
  const todoSectionUlMap = new SvelteMap<string, HTMLUListElement>();

  let isDesktop = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    isDesktop = mq.matches;
    const onChange = (e: MediaQueryListEvent) => (isDesktop = e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  const HABIT_SORTABLE_OPTS: Sortable.Options = {
    group: 'habits',
    animation: 150,
    handle: '.drag-handle',
    delay: 150,
    delayOnTouchOnly: true,
    forceFallback: true,
    ghostClass: 'drop-indicator',
    onEnd: onHabitDragEnd
  };

  const TODO_SORTABLE_OPTS: Sortable.Options = {
    group: 'todos',
    animation: 150,
    handle: '.drag-handle',
    delay: 150,
    delayOnTouchOnly: true,
    forceFallback: true,
    ghostClass: 'drop-indicator',
    onEnd: onTodoDragEnd
  };

  const SECTION_SORTABLE_OPTS: Sortable.Options = {
    animation: 150,
    handle: '.section-drag-handle',
    delay: 150,
    delayOnTouchOnly: true,
    forceFallback: true,
    draggable: '[data-section-id]',
    onEnd: onSectionDragEnd
  };

  function readIds(ul: HTMLUListElement): string[] {
    return [...ul.querySelectorAll<HTMLElement>(':scope > [data-id]')].map((el) => el.dataset.id!);
  }

  function readGroupsFromDom(): Array<{ sectionId: string | null; habitIds: string[] }> {
    const groups: Array<{ sectionId: string | null; habitIds: string[] }> = [];
    if (ungroupedUlRef) {
      groups.push({ sectionId: null, habitIds: readIds(ungroupedUlRef) });
    }
    for (const section of store.data.sections) {
      const ul = sectionUlMap.get(section.id);
      if (ul) {
        groups.push({ sectionId: section.id, habitIds: readIds(ul) });
      } else {
        groups.push({
          sectionId: section.id,
          habitIds: store.data.habits.filter((h) => h.sectionId === section.id).map((h) => h.id)
        });
      }
    }
    return groups;
  }

  function onHabitDragEnd(evt: Sortable.SortableEvent) {
    const groups = readGroupsFromDom();
    // Cross-list drag: SortableJS has moved evt.item from evt.from into evt.to.
    // Removing the original lets Svelte's destination #each create the canonical <li>
    // cleanly during reactivity, avoiding a duplicated DOM node.
    if (evt.from !== evt.to) evt.item.remove();
    store.commitLayout(groups);
  }

  function readTodoGroupsFromDom(): Array<{ sectionId: string | null; todoIds: string[] }> {
    const groups: Array<{ sectionId: string | null; todoIds: string[] }> = [];
    if (ungroupedTodosUlRef) {
      groups.push({ sectionId: null, todoIds: readIds(ungroupedTodosUlRef) });
    }
    for (const section of store.data.sections) {
      const ul = todoSectionUlMap.get(section.id);
      if (ul) {
        groups.push({ sectionId: section.id, todoIds: readIds(ul) });
      } else {
        groups.push({
          sectionId: section.id,
          todoIds: store.data.todos.filter((t) => t.sectionId === section.id).map((t) => t.id)
        });
      }
    }
    return groups;
  }

  function onTodoDragEnd(evt: Sortable.SortableEvent) {
    const groups = readTodoGroupsFromDom();
    if (evt.from !== evt.to) evt.item.remove();
    store.commitTodoLayout(groups);
  }

  function onSectionDragEnd(evt: Sortable.SortableEvent) {
    const container = evt.from;
    const ids = [...container.querySelectorAll<HTMLElement>(':scope > [data-section-id]')].map(
      (el) => el.dataset.sectionId!
    );
    store.reorderSections(ids);
  }

  function registerSectionUl(node: HTMLUListElement, sectionId: string) {
    sectionUlMap.set(sectionId, node);
    const inst = Sortable.create(node, HABIT_SORTABLE_OPTS);
    return {
      destroy() {
        sectionUlMap.delete(sectionId);
        inst.destroy();
      }
    };
  }

  function registerTodoSectionUl(node: HTMLUListElement, sectionId: string) {
    todoSectionUlMap.set(sectionId, node);
    const inst = Sortable.create(node, TODO_SORTABLE_OPTS);
    return {
      destroy() {
        todoSectionUlMap.delete(sectionId);
        inst.destroy();
      }
    };
  }

  $effect(() => {
    if (!ungroupedUlRef) return;
    const inst = Sortable.create(ungroupedUlRef, HABIT_SORTABLE_OPTS);
    return () => inst.destroy();
  });

  $effect(() => {
    if (!sectionsContainerRef) return;
    const inst = Sortable.create(sectionsContainerRef, SECTION_SORTABLE_OPTS);
    return () => inst.destroy();
  });

  $effect(() => {
    if (!ungroupedTodosUlRef) return;
    const inst = Sortable.create(ungroupedTodosUlRef, TODO_SORTABLE_OPTS);
    return () => inst.destroy();
  });

  $effect(() => {
    if (!todoSectionsContainerRef) return;
    const inst = Sortable.create(todoSectionsContainerRef, SECTION_SORTABLE_OPTS);
    return () => inst.destroy();
  });

  let pageTitle = $derived(activeTab === 'habits' ? 'Habits' : 'Tasks');

  function openAdd() {
    editingHabit = undefined;
    modalOpen = true;
  }

  function openEdit(h: Habit) {
    editingHabit = h;
    modalOpen = true;
  }

  function openAddSection() {
    editingSection = undefined;
    sectionModalOpen = true;
  }

  function openRename(s: Section) {
    editingSection = s;
    sectionModalOpen = true;
  }

  function openEditTodo(t: Todo) {
    editingTodo = t;
    todoModalOpen = true;
  }

  function addTodoFromInput(e: Event) {
    e.preventDefault();
    const trimmed = newTodoName.trim();
    if (!trimmed) return;
    store.addTodo(trimmed);
    newTodoName = '';
  }

  function downloadBackup() {
    const raw = readBackup();
    if (!raw) return;
    downloadJson(`habit-tracker-backup-${todayISO()}.json`, raw);
  }

  let hasStructure = $derived(store.hasAnyHabit || store.data.sections.length > 0);
  let ungroupedGroup = $derived(store.dueGroups[0]);
  let sectionGroups = $derived(store.dueGroups.slice(1));

  let ungroupedTodoGroup = $derived(store.todoGroups[0]);
  let todoSectionGroups = $derived(store.todoGroups.slice(1));

  function habitGroupCounts(habits: Habit[]) {
    let done = 0;
    for (const h of habits) if (store.isDone(h.id, selectedDate.value)) done++;
    return { done, total: habits.length };
  }

  let todosOpen = $derived(store.data.todos.filter((t) => !t.done).length);
  let todosDone = $derived(store.data.todos.filter((t) => t.done).length);
  // Hybrid tasks view: undone tasks live in their (optional) section; done
  // tasks pool into a flat DONE bucket at the bottom regardless of section.
  let ungroupedUndoneTodos = $derived(ungroupedTodoGroup.todos.filter((t) => !t.done));
  let allDoneTodos = $derived(store.data.todos.filter((t) => t.done));

  // ── Confetti on day-complete transition ─────────────────────────
  let lastComplete = { date: '', complete: false };
  $effect(() => {
    const date = selectedDate.value;
    const complete = store.totalCount > 0 && store.doneCount === store.totalCount;
    if (lastComplete.date === date && complete && !lastComplete.complete) {
      fireDayCompleteBursts();
    }
    lastComplete = { date, complete };
  });

  // ── Recovery banner: track dismissal so we don't re-render after close ──
  function dismissRecovery() {
    store.dismissRecoveryNotice();
  }
</script>

<svelte:head>
  <title>{pageTitle} · Habit Tracker</title>
</svelte:head>

<div class="app-shell">
  {#if store.recoveryNotice}
    <div
      role="status"
      style="margin: 12px 16px; padding: 14px 16px;
             border-radius: var(--r-md); border: 1px solid var(--danger);
             background: var(--danger-soft); color: var(--ink);
             font-family: var(--font-body); font-size: var(--fs-body);"
    >
      <p style="margin: 0 0 10px;">
        Your habit data couldn't be read and was reset. A backup of the raw data is saved locally.
      </p>
      <div style="display: flex; gap: 8px;">
        <button
          type="button"
          onclick={downloadBackup}
          style="padding: 7px 14px; border: 0; border-radius: var(--r-md);
                 background: var(--danger); color: #fff;
                 font-family: var(--font-body); font-size: var(--fs-meta); font-weight: 600;
                 cursor: pointer;"
        >
          Download backup
        </button>
        <button
          type="button"
          onclick={dismissRecovery}
          style="padding: 7px 14px; border: 0; border-radius: var(--r-md);
                 background: transparent; color: var(--ink-muted);
                 font-family: var(--font-body); font-size: var(--fs-meta); font-weight: 600;
                 cursor: pointer;"
        >
          Dismiss
        </button>
      </div>
    </div>
  {/if}

  <!-- Top bar -->
  <header class="top-bar" class:is-desktop={isDesktop}>
    {#if isDesktop}
      <h1
        style="margin: 0; font-family: var(--font-display); font-weight: 700;
               font-size: 24px; letter-spacing: -0.8px; color: var(--ink);
               line-height: 1;"
      >
        Habits<span style="color: var(--accent);">.</span>
      </h1>
      <div style="flex: 1;"></div>
      {#if hasStructure}
        <button
          type="button"
          onclick={openAdd}
          aria-label="Add habit"
          style="display: inline-flex; align-items: center; gap: 6px;
                 padding: 8px 14px 8px 12px; border: 0; border-radius: 99px;
                 background: var(--accent); color: var(--accent-on);
                 font-family: var(--font-display); font-size: 12px; font-weight: 600;
                 cursor: pointer; box-shadow: 0 4px 14px var(--accent-glow);"
        >
          <IconPlus class="h-3.5 w-3.5" />
          New habit
        </button>
      {/if}
      <button
        type="button"
        onclick={() => (dataModalOpen = true)}
        aria-label="Open settings"
        style="width: 36px; height: 36px; border: 0; border-radius: var(--r-pill);
               background: var(--surface-2); color: var(--ink-muted);
               display: flex; align-items: center; justify-content: center;
               cursor: pointer; flex-shrink: 0;
               transition: background var(--t-quick) var(--ease-out),
                           color var(--t-quick) var(--ease-out);"
      >
        <IconGear class="h-4 w-4" />
      </button>
    {:else}
      <button
        type="button"
        onclick={() => (activeTab = activeTab === 'habits' ? 'todos' : 'habits')}
        aria-label={`Currently on ${activeTab === 'habits' ? 'Habits' : 'Tasks'} — tap to switch`}
        style="display: flex; background: var(--surface-2);
               border-radius: 99px; padding: 4px; gap: 2px;
               border: 0; cursor: pointer;"
      >
        {#each [{ value: 'habits' as const, label: 'Habits' }, { value: 'todos' as const, label: 'Tasks' }] as opt (opt.value)}
          {@const active = opt.value === activeTab}
          <span
            style="padding: 10px 18px; border-radius: 99px;
                   pointer-events: none;
                   background: {active ? 'var(--surface)' : 'transparent'};
                   color: {active ? 'var(--ink)' : 'var(--ink-muted)'};
                   font-family: var(--font-display); font-size: 14px; font-weight: 600;
                   box-shadow: {active ? '0 2px 8px rgba(20,12,40,0.06)' : 'none'};
                   transition: all 180ms;"
          >
            {opt.label}
          </span>
        {/each}
      </button>
      <div style="flex: 1;"></div>
      <button
        type="button"
        onclick={() => (dataModalOpen = true)}
        aria-label="Open settings"
        style="width: 40px; height: 40px; border: 0; border-radius: var(--r-pill);
               background: var(--surface-2); color: var(--ink-muted);
               display: flex; align-items: center; justify-content: center;
               cursor: pointer; flex-shrink: 0;
               transition: background var(--t-quick) var(--ease-out),
                           color var(--t-quick) var(--ease-out);"
      >
        <IconGear class="h-[18px] w-[18px]" />
      </button>
    {/if}
  </header>

  <main class="app-main">
    <!-- Habits view -->
    {#if isDesktop || activeTab === 'habits'}
      <section class="habits-pane">
        <div class={isDesktop ? 'day-strip-static' : 'day-strip-sticky'}>
          <DayStrip />
        </div>

        <ProgressHero />

        {#if hasStructure}
          <div style="padding: 22px 16px 0; display: flex; flex-direction: column; gap: 10px;">
            <ul
              bind:this={ungroupedUlRef}
              style="list-style: none; padding: 0; margin: 0;
                     display: flex; flex-direction: column; gap: 10px;
                     min-height: {ungroupedGroup.habits.length === 0 ? '8px' : 'auto'};"
            >
              {#each ungroupedGroup.habits as habit (habit.id)}
                <li data-id={habit.id}>
                  <HabitItem {habit} date={selectedDate.value} onEdit={openEdit} />
                </li>
              {/each}
            </ul>

            <div bind:this={sectionsContainerRef}>
              {#each sectionGroups as group (group.section!.id)}
                {@const counts = habitGroupCounts(group.habits)}
                <section data-section-id={group.section!.id} style="margin-top: 14px;">
                  <SectionHeader
                    section={group.section!}
                    doneCount={counts.done}
                    totalCount={counts.total}
                    onRename={openRename}
                  />
                  <div
                    style="display: grid;
                           grid-template-rows: {group.section!.collapsed ? '0fr' : '1fr'};
                           transition: grid-template-rows var(--t-normal) var(--ease-out);"
                  >
                    <div
                      style="overflow: hidden; min-height: 0;
                             padding-top: 10px; margin-top: -10px;"
                    >
                      <ul
                        use:registerSectionUl={group.section!.id}
                        style="list-style: none; padding: 0; margin: 0;
                               display: flex; flex-direction: column; gap: 10px;
                               min-height: {group.habits.length === 0 ? '8px' : 'auto'};"
                      >
                        {#each group.habits as habit (habit.id)}
                          <li data-id={habit.id}>
                            <HabitItem {habit} date={selectedDate.value} onEdit={openEdit} />
                          </li>
                        {/each}
                      </ul>
                      {#if group.habits.length === 0}
                        <p
                          style="text-align: center; color: var(--ink-faint);
                                 font-size: var(--fs-meta); padding: 12px 0;"
                        >
                          · no habits scheduled ·
                        </p>
                      {/if}
                    </div>
                  </div>
                </section>
              {/each}
            </div>

            <div style="display: flex; justify-content: center; padding-top: 8px;">
              <button
                type="button"
                onclick={openAddSection}
                style="display: inline-flex; align-items: center; gap: 5px;
                       padding: 8px 14px 8px 11px; border-radius: 99px;
                       background: var(--surface-2); color: var(--ink-muted);
                       border: 0; cursor: pointer;
                       font-family: var(--font-display); font-size: 12px; font-weight: 600;
                       letter-spacing: 0.1px;
                       transition: background var(--t-quick) var(--ease-out);"
              >
                <IconPlus class="h-[13px] w-[13px]" /> Section
              </button>
            </div>
          </div>
        {:else}
          <!-- Empty state: Let's build a habit -->
          <div style="padding: 36px 24px 0; text-align: center;">
            <div
              style="font-family: var(--font-display); font-weight: 700;
                     font-size: 30px; line-height: 1.05; letter-spacing: -1.2px;
                     color: var(--ink); margin-bottom: 8px;"
            >
              Let's build a habit.
            </div>
            <p
              style="margin: 0 auto 28px; max-width: 280px;
                     font-family: var(--font-body); font-size: 14px; line-height: 1.45;
                     color: var(--ink-muted);"
            >
              Pick something small you'd like to do regularly. You can always tweak the schedule
              later.
            </p>
            <div
              class="ht-card"
              style="margin: 0 auto; max-width: 320px;
                     background: var(--surface); border-radius: 18px;
                     padding: 18px; border: 1px solid var(--line);
                     box-shadow: 0 8px 30px rgba(20, 12, 40, 0.06);
                     display: flex; flex-direction: column; gap: 12px;"
            >
              <button
                type="button"
                onclick={openAdd}
                style="width: 100%; padding: 14px 16px; border-radius: 14px;
                       background: var(--accent); color: var(--accent-on);
                       border: 0; cursor: pointer;
                       font-family: var(--font-display); font-size: 16px; font-weight: 600;
                       letter-spacing: -0.2px;
                       box-shadow: 0 8px 22px var(--accent-glow);"
              >
                + Add your first habit
              </button>
              <div
                style="display: flex; flex-direction: column; gap: 6px;
                       font-family: var(--font-body); font-size: 12px; color: var(--ink-muted);
                       text-align: left;"
              >
                <div
                  style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
                         text-transform: uppercase; color: var(--ink-faint);
                         margin-bottom: 2px; text-align: center;"
                >
                  Examples
                </div>
                <div>• Drink 8 cups of water</div>
                <div>• Meditate 5 minutes</div>
                <div>• Read 20 pages</div>
              </div>
            </div>
          </div>
        {/if}
      </section>
    {/if}

    <!-- Tasks view -->
    {#if isDesktop || activeTab === 'todos'}
      <section class="tasks-pane">
        <div style="padding: 14px 16px 0;">
          <div style="padding: 4px 4px 14px;">
            <div
              style="font-family: var(--font-display); font-weight: 600;
                     font-size: 30px; line-height: 1.05; letter-spacing: -1.2px;
                     color: var(--ink);"
            >
              Tasks
            </div>
            <div
              style="margin-top: 6px; font-size: 12px; font-weight: 500;
                     letter-spacing: 0.2px; color: var(--ink-faint);
                     font-variant-numeric: tabular-nums;"
            >
              {store.data.todos.length === 0
                ? 'A place for one-off to-dos.'
                : `${todosOpen} open${todosDone > 0 ? ` · ${todosDone} done` : ''}`}
            </div>
          </div>

          <form onsubmit={addTodoFromInput}>
            <input
              type="text"
              bind:value={newTodoName}
              onfocus={() => (todoInputFocused = true)}
              onblur={() => (todoInputFocused = false)}
              placeholder="Add a task — press Enter"
              aria-label="Add a task"
              style="width: 100%; box-sizing: border-box;
                     padding: 14px 16px; border-radius: 14px;
                     border: 1.5px solid {todoInputFocused ? 'var(--accent)' : 'var(--line)'};
                     background: {todoInputFocused ? 'var(--surface)' : 'var(--surface-2)'};
                     font-family: var(--font-body); font-size: 16px;
                     color: var(--ink); outline: none;
                     transition: border-color 140ms, background 140ms;"
            />
          </form>

          <!-- Ungrouped undone tasks (no section header) -->
          <ul
            bind:this={ungroupedTodosUlRef}
            style="list-style: none; padding: 0; margin: 18px 0 0;
                   display: flex; flex-direction: column; gap: 8px;
                   min-height: {ungroupedUndoneTodos.length === 0 ? '8px' : 'auto'};"
          >
            {#each ungroupedUndoneTodos as todo (todo.id)}
              <li data-id={todo.id}>
                <TodoItem {todo} onEdit={openEditTodo} />
              </li>
            {/each}
          </ul>

          <!-- Section-grouped undone tasks -->
          <div bind:this={todoSectionsContainerRef}>
            {#each todoSectionGroups as group (group.section!.id)}
              {@const undoneInSection = group.todos.filter((t) => !t.done)}
              {@const counts = {
                done: group.todos.length - undoneInSection.length,
                total: group.todos.length
              }}
              <section data-section-id={group.section!.id} style="margin-top: 14px;">
                <SectionHeader
                  section={group.section!}
                  doneCount={counts.done}
                  totalCount={counts.total}
                  onRename={openRename}
                />
                <div
                  style="display: grid;
                         grid-template-rows: {group.section!.collapsed ? '0fr' : '1fr'};
                         transition: grid-template-rows var(--t-normal) var(--ease-out);"
                >
                  <div
                    style="overflow: hidden; min-height: 0;
                           padding-top: 10px; margin-top: -10px;"
                  >
                    <ul
                      use:registerTodoSectionUl={group.section!.id}
                      style="list-style: none; padding: 0; margin: 0;
                             display: flex; flex-direction: column; gap: 8px;
                             min-height: {undoneInSection.length === 0 ? '8px' : 'auto'};"
                    >
                      {#each undoneInSection as todo (todo.id)}
                        <li data-id={todo.id}>
                          <TodoItem {todo} onEdit={openEditTodo} />
                        </li>
                      {/each}
                    </ul>
                    {#if undoneInSection.length === 0}
                      <p
                        style="text-align: center; color: var(--ink-faint);
                               font-size: 12px; padding: 12px 0;"
                      >
                        · no tasks here ·
                      </p>
                    {/if}
                  </div>
                </div>
              </section>
            {/each}
          </div>

          <!-- Empty state when no undone tasks (spec: "All clear." vs "No tasks yet.") -->
          {#if todosOpen === 0}
            <div
              class="ht-card"
              style="margin-top: 14px; padding: 28px 20px; text-align: center;
                     background: var(--surface); border-radius: 18px;
                     border: 1px solid var(--line); box-shadow: var(--shadow-1);"
            >
              <div
                style="font-family: var(--font-display); font-weight: 600;
                       font-size: 18px; color: var(--ink); margin-bottom: 6px;
                       letter-spacing: -0.3px;"
              >
                {todosDone > 0 ? 'All clear.' : 'No tasks yet.'}
              </div>
              <div
                style="font-family: var(--font-body); font-size: 14px;
                       color: var(--ink-muted); line-height: 1.4;"
              >
                {todosDone > 0
                  ? 'Nice work — your list is empty.'
                  : 'Add one above to get started.'}
              </div>
            </div>
          {/if}

          <!-- DONE (N) bucket: all done tasks, flat -->
          {#if todosDone > 0}
            <div style="margin-top: 24px;">
              <div
                style="padding: 0 4px 8px;
                       font-family: var(--font-display); font-size: 11px; font-weight: 700;
                       letter-spacing: 1.2px; text-transform: uppercase;
                       color: var(--ink-faint);"
              >
                Done ({todosDone})
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                {#each allDoneTodos as todo (todo.id)}
                  <TodoItem {todo} onEdit={openEditTodo} />
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </section>
    {/if}
  </main>

  <!-- FAB (mobile + habits tab + has structure) -->
  {#if !isDesktop && activeTab === 'habits' && hasStructure}
    <button type="button" onclick={openAdd} aria-label="Add habit" class="fab">
      <IconPlus class="h-7 w-7" />
    </button>
  {/if}
</div>

<AddHabitModal bind:open={modalOpen} habit={editingHabit} />
<SectionModal bind:open={sectionModalOpen} section={editingSection} />
<TodoModal bind:open={todoModalOpen} todo={editingTodo} />
<DataModal bind:open={dataModalOpen} />

<style>
  .app-shell {
    height: 100svh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    overflow: hidden;
    box-sizing: border-box;
  }

  .top-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: max(58px, calc(env(safe-area-inset-top) + 28px)) 16px 8px;
  }
  .top-bar.is-desktop {
    padding: 20px 32px 8px;
    max-width: 1180px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .day-strip-sticky {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg);
    padding: 6px 0 8px;
  }
  .day-strip-static {
    padding: 6px 0 8px;
  }

  .app-main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    padding-bottom: calc(env(safe-area-inset-bottom) + 120px);
  }

  .habits-pane,
  .tasks-pane {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
  }

  .fab {
    position: fixed;
    right: calc(20px + env(safe-area-inset-right));
    bottom: calc(20px + env(safe-area-inset-bottom));
    width: 58px;
    height: 58px;
    border: 0;
    border-radius: var(--r-pill);
    background: var(--accent);
    color: var(--accent-on);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-glow);
    transition:
      transform 160ms var(--ease-spring),
      box-shadow var(--t-quick) var(--ease-out);
    z-index: 20;
  }
  .fab:active {
    transform: scale(0.92) rotate(-8deg);
  }

  :global(.drop-indicator) {
    background: var(--surface);
    border-radius: 18px;
    border: 1px dashed var(--line-strong);
  }
  :global(.drop-indicator > *) {
    visibility: hidden;
  }

  @media (min-width: 1024px) {
    .app-main {
      max-width: 1180px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 32px;
      padding: 0 24px calc(env(safe-area-inset-bottom) + 120px);
    }
    .habits-pane {
      max-width: none;
      margin: 0;
    }
    .tasks-pane {
      max-width: none;
      margin: 0;
      border-left: 1px solid var(--line);
      padding-left: 24px;
    }
  }
</style>
