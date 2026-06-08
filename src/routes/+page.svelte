<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Habit, Section, Todo } from '$lib/types';
  import { type Tab } from '$lib/tabs';
  import { store } from '$lib/store.svelte';
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { priorityFilter } from '$lib/priorityFilter.svelte';
  import { smartDateTitle, formatWeekday, formatMonthDay } from '$lib/schedule';
  import HabitItem from '$lib/components/HabitItem.svelte';
  import TodoItem from '$lib/components/TodoItem.svelte';
  import AddHabitModal from '$lib/components/AddHabitModal.svelte';
  import DataModal from '$lib/components/DataModal.svelte';
  import SectionHeader from '$lib/components/SectionHeader.svelte';
  import SectionModal from '$lib/components/SectionModal.svelte';
  import TodoModal from '$lib/components/TodoModal.svelte';
  import TodoSectionHeader from '$lib/components/TodoSectionHeader.svelte';
  import TodoSectionModal from '$lib/components/TodoSectionModal.svelte';
  import DayStrip from '$lib/components/DayStrip.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import NoteItem from '$lib/components/NoteItem.svelte';
  import NoteEditor from '$lib/components/NoteEditor.svelte';
  import IconPlus from '$lib/components/icons/IconPlus.svelte';
  import Sortable from 'sortablejs';
  import { SvelteMap } from 'svelte/reactivity';

  onMount(() => {
    store.init();
  });

  let activeTab = $state<Tab>('habits');
  let showAll = $state(false);

  // Notes: which note (if any) is open in the full-pane editor.
  let editingNoteId = $state<string | null>(null);
  let freshNoteId = $state<string | null>(null); // tracks a just-created note for empty-discard
  let openNote = $derived(
    editingNoteId ? (store.data.notes.find((n) => n.id === editingNoteId) ?? null) : null
  );
  // Leaving the Notes tab closes the editor (its unmount flushes any pending save).
  $effect(() => {
    if (activeTab !== 'notes') editingNoteId = null;
  });

  let modalOpen = $state(false);
  let dataModalOpen = $state(false);
  let editingHabit = $state<Habit | undefined>(undefined);

  let sectionModalOpen = $state(false);
  let editingSection = $state<Section | undefined>(undefined);

  let todoModalOpen = $state(false);
  let editingTodo = $state<Todo | undefined>(undefined);

  let todoSectionModalOpen = $state(false);
  let editingTodoSection = $state<Section | undefined>(undefined);

  let sectionsContainerRef: HTMLDivElement | undefined = $state();
  const sectionUlMap = new SvelteMap<string, HTMLUListElement>();

  let todoSectionsContainerRef: HTMLDivElement | undefined = $state();
  const todoSectionUlMap = new SvelteMap<string, HTMLUListElement>();

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

  const TODO_SECTION_SORTABLE_OPTS: Sortable.Options = {
    animation: 150,
    handle: '.todo-section-drag-handle',
    delay: 150,
    delayOnTouchOnly: true,
    forceFallback: true,
    draggable: '[data-todo-section-id]',
    onEnd: onTodoSectionDragEnd
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

  function readGroupsFromDom(): Array<{ sectionId: string; habitIds: string[] }> {
    const groups: Array<{ sectionId: string; habitIds: string[] }> = [];
    for (const section of store.data.sections) {
      const ul = sectionUlMap.get(section.id);
      if (ul) {
        // The DOM only holds habits currently passing the priority filter. Append any
        // filtered-out habits for this section (in stored order) so a reorder while a
        // filter is active never drops them from their section.
        const domIds = readIds(ul);
        const domSet = new Set(domIds);
        const hidden = store.data.habits
          .filter((h) => h.sectionId === section.id && !domSet.has(h.id))
          .map((h) => h.id);
        groups.push({ sectionId: section.id, habitIds: [...domIds, ...hidden] });
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

  function readTodoGroupsFromDom(): Array<{ sectionId: string; todoIds: string[] }> {
    const groups: Array<{ sectionId: string; todoIds: string[] }> = [];
    for (const s of store.data.todoSections) {
      const ul = todoSectionUlMap.get(s.id);
      if (ul) {
        groups.push({ sectionId: s.id, todoIds: readIds(ul) });
      } else {
        groups.push({
          sectionId: s.id,
          todoIds: store.data.todos.filter((t) => t.sectionId === s.id && !t.done).map((t) => t.id)
        });
      }
    }
    return groups;
  }

  function onTodoDragEnd(evt: Sortable.SortableEvent) {
    const groups = readTodoGroupsFromDom();
    if (evt.from !== evt.to) evt.item.remove();
    const sectionIds = store.data.todoSections.map((s) => s.id);
    store.commitTodoLayout(groups, sectionIds);
  }

  function onTodoSectionDragEnd(evt: Sortable.SortableEvent) {
    const container = evt.from;
    const ids = [...container.querySelectorAll<HTMLElement>(':scope > [data-todo-section-id]')].map(
      (el) => el.dataset.todoSectionId!
    );
    const groups = readTodoGroupsFromDom();
    store.commitTodoLayout(groups, ids);
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

  function registerTodoSectionUl(node: HTMLUListElement, key: string) {
    todoSectionUlMap.set(key, node);
    const inst = Sortable.create(node, TODO_SORTABLE_OPTS);
    return {
      destroy() {
        todoSectionUlMap.delete(key);
        inst.destroy();
      }
    };
  }

  $effect(() => {
    if (!sectionsContainerRef) return;
    const inst = Sortable.create(sectionsContainerRef, SECTION_SORTABLE_OPTS);
    return () => inst.destroy();
  });

  $effect(() => {
    if (!todoSectionsContainerRef) return;
    const inst = Sortable.create(todoSectionsContainerRef, TODO_SECTION_SORTABLE_OPTS);
    return () => inst.destroy();
  });

  let pageTitle = $derived(
    activeTab === 'habits' ? 'Habits' : activeTab === 'todos' ? 'Tasks' : 'Notes'
  );

  let headTitle = $derived(
    activeTab === 'habits'
      ? smartDateTitle(selectedDate.value, currentDate.value)
      : activeTab === 'todos'
        ? 'Tasks'
        : 'Notes'
  );

  let todosOpen = $derived(store.data.todos.filter((t) => !t.done).length);
  let todosDone = $derived(store.data.todos.filter((t) => t.done).length);
  let allDoneTodos = $derived(store.data.todos.filter((t) => t.done));

  let headSub = $derived.by(() => {
    if (activeTab === 'habits') {
      return `${formatWeekday(selectedDate.value)}, ${formatMonthDay(selectedDate.value)}`;
    }
    if (activeTab === 'todos') {
      if (store.data.todos.length === 0) return 'A place for assignments and to-dos.';
      return `${todosOpen} open${todosDone > 0 ? ` · ${todosDone} done` : ''}`;
    }
    const n = store.data.notes.length;
    return n === 0
      ? 'A place for quick notes and longer thoughts.'
      : `${n} note${n === 1 ? '' : 's'}`;
  });

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
  function openAddTodo() {
    editingTodo = undefined;
    todoModalOpen = true;
  }
  function openEditTodo(t: Todo) {
    editingTodo = t;
    todoModalOpen = true;
  }
  function openAddTodoSection() {
    editingTodoSection = undefined;
    todoSectionModalOpen = true;
  }
  function openRenameTodoSection(s: Section) {
    editingTodoSection = s;
    todoSectionModalOpen = true;
  }
  function openAddNote() {
    const n = store.addNote();
    freshNoteId = n.id;
    editingNoteId = n.id;
  }

  let activeGroups = $derived(showAll ? store.allStartedGroups : store.dueGroups);

  // The sidebar priority filter applied as a render-only pass that keeps the group
  // (section) structure intact. The allVisible fast-path means zero work when nothing
  // is filtered, so `visibleGroups === activeGroups` in the common case.
  let visibleGroups = $derived(
    priorityFilter.allVisible
      ? activeGroups
      : activeGroups.map((g) => ({
          ...g,
          habits: g.habits.filter((h) => priorityFilter.isShown(h))
        }))
  );

  function isInactive(habit: Habit): boolean {
    return showAll && !store.dueHabitIds.has(habit.id);
  }

  $effect(() => {
    void selectedDate.value;
    showAll = false;
  });

  // ── Auto-fail rolling window ─────────────────────────────────────
  // Re-runs on load and whenever currentDate advances (midnight rollover or
  // focus/visibility refresh). The sweep reads & writes completions, so run it
  // untracked to keep this effect's deps limited to today + readiness.
  $effect(() => {
    const today = currentDate.value;
    if (!store.ready) return;
    untrack(() => store.runAutoFailSweep(today));
  });
</script>

<svelte:head>
  <title>{pageTitle} · Meridian</title>
</svelte:head>

{#if !store.ready}
  <div class="boot">
    {#if store.syncError}
      <div style="text-align: center; color: var(--danger);">
        <p style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Failed to connect</p>
        <p style="font-size: 14px; color: var(--ink-muted); margin: 0;">{store.syncError}</p>
      </div>
    {:else}
      <div style="color: var(--ink-muted); font-size: 14px;">Loading…</div>
    {/if}
  </div>
{:else}
  <div class="shell">
    <Sidebar
      {activeTab}
      onTabChange={(tab) => (activeTab = tab)}
      onSettings={() => (dataModalOpen = true)}
    />

    <div class="main">
      {#if activeTab === 'notes' && openNote}
        {#key openNote.id}
          <div class="main-inner">
            <NoteEditor
              note={openNote}
              isNew={openNote.id === freshNoteId}
              onBack={() => (editingNoteId = null)}
            />
          </div>
        {/key}
      {:else}
        <div class="main-inner">
          <header class="head">
            <h1 class="screen-title">{headTitle}</h1>
            <div style="display: flex; align-items: baseline; gap: 10px;">
              <span class="date-sub">{headSub}</span>
              {#if activeTab === 'habits' && !selectedDate.isToday}
                <button type="button" class="today-jump" onclick={() => selectedDate.goToday()}>
                  Today
                </button>
              {/if}
            </div>
          </header>

          <!-- ── Habits ────────────────────────────────────────────── -->
          {#if activeTab === 'habits'}
            {#if store.hasAnyHabit}
              <DayStrip />

              {#if store.totalCount > 0}
                <div class="progress">
                  <div class="progress-top">
                    <span class="progress-frac"><b>{store.doneCount}</b> / {store.totalCount}</span>
                    <span class="progress-label">habits complete · {store.progressPct}%</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill" style="width: {store.progressPct}%;"></div>
                  </div>
                </div>
              {/if}

              {#if store.extraHabitCount > 0}
                <div class="toolbar">
                  <button
                    type="button"
                    class="linkbtn"
                    aria-pressed={showAll}
                    onclick={() => (showAll = !showAll)}
                  >
                    {showAll ? 'Scheduled only' : `Show all (${store.extraHabitCount})`}
                  </button>
                </div>
              {/if}

              <div bind:this={sectionsContainerRef}>
                {#each visibleGroups as group (group.section.id)}
                  {@const fullGroup = activeGroups.find((g) => g.section.id === group.section.id)}
                  {@const counts = store.sectionProgressFor(fullGroup?.habits ?? group.habits)}
                  <section data-section-id={group.section.id} class="section">
                    <SectionHeader
                      section={group.section}
                      doneCount={counts.done}
                      totalCount={counts.total}
                      onRename={openRename}
                    />
                    {#if !group.section.collapsed}
                      <ul use:registerSectionUl={group.section.id} class="rows">
                        {#each group.habits as habit (habit.id)}
                          <li data-id={habit.id}>
                            <HabitItem
                              {habit}
                              date={selectedDate.value}
                              onEdit={openEdit}
                              inactive={isInactive(habit)}
                            />
                          </li>
                        {/each}
                      </ul>
                      {#if group.habits.length === 0 && priorityFilter.allVisible}
                        <p class="empty">No habits scheduled.</p>
                      {/if}
                    {/if}
                  </section>
                {/each}
              </div>

              <button type="button" class="add-row" onclick={openAdd}>
                <IconPlus /> Add habit
              </button>
              <button type="button" class="add-section" onclick={openAddSection}>
                + New section
              </button>
            {:else}
              <p class="empty">No habits yet. Pick something small you'd like to do regularly.</p>
              <button type="button" class="add-row" onclick={openAdd}>
                <IconPlus /> Add your first habit
              </button>
            {/if}
          {/if}

          <!-- ── Tasks ─────────────────────────────────────────────── -->
          {#if activeTab === 'todos'}
            <div bind:this={todoSectionsContainerRef}>
              {#each store.todoGroups as group (group.section.id)}
                <div data-todo-section-id={group.section.id} class="section">
                  <TodoSectionHeader section={group.section} onRename={openRenameTodoSection} />
                  {#if !group.section.collapsed}
                    <ul use:registerTodoSectionUl={group.section.id} class="rows">
                      {#each group.todos as todo (todo.id)}
                        <li data-id={todo.id}>
                          <TodoItem {todo} onEdit={openEditTodo} />
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              {/each}
            </div>

            <button type="button" class="add-row" onclick={openAddTodo}>
              <IconPlus /> Add task
            </button>
            {#if store.data.todos.length > 0 || store.data.todoSections.length > 1}
              <button type="button" class="add-section" onclick={openAddTodoSection}>
                + New section
              </button>
            {/if}

            {#if todosDone > 0}
              <section class="section" style="margin-top: 24px;">
                <div class="section-title">
                  Done <span class="section-count">{todosDone}</span>
                </div>
                {#each allDoneTodos as todo (todo.id)}
                  <TodoItem {todo} onEdit={openEditTodo} />
                {/each}
              </section>
            {/if}
          {/if}

          <!-- ── Notes ─────────────────────────────────────────────── -->
          {#if activeTab === 'notes'}
            {#if store.data.notes.length > 0}
              <ul class="notes-list">
                {#each store.notes as note (note.id)}
                  <li><NoteItem {note} onOpen={(n) => (editingNoteId = n.id)} /></li>
                {/each}
              </ul>
            {/if}
            <button type="button" class="add-row" onclick={openAddNote}>
              <IconPlus /> New note
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <AddHabitModal bind:open={modalOpen} habit={editingHabit} />
  <SectionModal bind:open={sectionModalOpen} section={editingSection} />
  <TodoModal bind:open={todoModalOpen} todo={editingTodo} />
  <TodoSectionModal bind:open={todoSectionModalOpen} section={editingTodoSection} />
  <DataModal bind:open={dataModalOpen} />
{/if}

<style>
  .boot {
    height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .notes-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }
  .linkbtn {
    border: none;
    background: transparent;
    color: var(--ink-faint);
    font: inherit;
    font-size: var(--fs-meta);
    cursor: pointer;
    padding: 2px 4px;
  }
  .linkbtn:hover {
    color: var(--ink-muted);
  }
  .add-section {
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    border: none;
    background: transparent;
    color: var(--ink-faint);
    font: inherit;
    font-size: var(--fs-meta);
    cursor: pointer;
    text-align: center;
  }
  .add-section:hover {
    color: var(--ink-muted);
  }
</style>
