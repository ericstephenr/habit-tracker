<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Habit, Section, Todo } from '$lib/types';
  import { type Tab } from '$lib/tabs';
  import { store } from '$lib/store.svelte';
  import { selectedDate } from '$lib/selectedDate.svelte';
  import { currentDate } from '$lib/currentDate.svelte';
  import { fireDayCompleteBursts } from '$lib/confetti';
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
  import ProgressHero from '$lib/components/ProgressHero.svelte';
  import IconPlus from '$lib/components/icons/IconPlus.svelte';
  import IconGear from '$lib/components/icons/IconGear.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import MobileTabMenu from '$lib/components/MobileTabMenu.svelte';
  import NoteItem from '$lib/components/NoteItem.svelte';
  import NoteEditor from '$lib/components/NoteEditor.svelte';
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
    // Reorder by calling commitTodoLayout with unchanged todo groups but reordered section ids
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

  function scrollToSection(sectionId: string) {
    const attr = activeTab === 'habits' ? 'data-section-id' : 'data-todo-section-id';
    const section =
      activeTab === 'habits'
        ? store.data.sections.find((s) => s.id === sectionId)
        : store.data.todoSections.find((s) => s.id === sectionId);
    if (section?.collapsed) {
      if (activeTab === 'habits') store.toggleSectionCollapsed(sectionId);
      else store.toggleTodoSectionCollapsed(sectionId);
    }
    requestAnimationFrame(() => {
      const el = document.querySelector(`[${attr}="${sectionId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function openAdd() {
    editingHabit = undefined;
    modalOpen = true;
  }

  function openAddTodo() {
    editingTodo = undefined;
    todoModalOpen = true;
  }

  function openAddNote() {
    const n = store.addNote();
    freshNoteId = n.id;
    editingNoteId = n.id;
  }

  function handleAddClick() {
    if (activeTab === 'habits') openAdd();
    else if (activeTab === 'todos') openAddTodo();
    else openAddNote();
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

  function openAddTodoSection() {
    editingTodoSection = undefined;
    todoSectionModalOpen = true;
  }

  function openRenameTodoSection(s: Section) {
    editingTodoSection = s;
    todoSectionModalOpen = true;
  }

  let hasStructure = $derived(store.hasAnyHabit);
  let activeGroups = $derived(showAll ? store.allStartedGroups : store.dueGroups);

  function isInactive(habit: Habit): boolean {
    return showAll && !store.dueHabitIds.has(habit.id);
  }

  let todosOpen = $derived(store.data.todos.filter((t) => !t.done).length);
  let todosDone = $derived(store.data.todos.filter((t) => t.done).length);
  let allDoneTodos = $derived(store.data.todos.filter((t) => t.done));

  $effect(() => {
    void selectedDate.value;
    showAll = false;
  });

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
  <title>{pageTitle} · Habit Tracker</title>
</svelte:head>

{#if !store.ready}
  <div class="app-shell" style="align-items: center; justify-content: center;">
    {#if store.syncError}
      <div
        style="text-align: center; padding: 24px; font-family: var(--font-body); color: var(--danger);"
      >
        <p style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Failed to connect</p>
        <p style="font-size: 14px; color: var(--ink-muted); margin: 0;">{store.syncError}</p>
      </div>
    {:else}
      <div style="color: var(--ink-muted); font-family: var(--font-body); font-size: 14px;">
        Loading...
      </div>
    {/if}
  </div>
{:else}
  <div class="app-shell">
    {#if isDesktop}
      <Sidebar
        {activeTab}
        onTabChange={(tab) => (activeTab = tab)}
        onScrollToSection={scrollToSection}
      />
    {/if}

    <div class="app-body">
      <!-- Top bar -->
      <header class="top-bar" class:is-desktop={isDesktop}>
        {#if isDesktop}
          <div style="flex: 1;"></div>
          <button
            type="button"
            onclick={handleAddClick}
            aria-label={activeTab === 'habits'
              ? 'Add habit'
              : activeTab === 'todos'
                ? 'Add task'
                : 'New note'}
            style="width: 40px; height: 40px; border: 0; border-radius: var(--r-pill);
                 background: var(--accent); color: var(--accent-on);
                 display: flex; align-items: center; justify-content: center;
                 cursor: pointer; box-shadow: 0 4px 14px var(--accent-glow);"
          >
            <IconPlus class="h-5 w-5" />
          </button>
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
        {:else}
          <MobileTabMenu {activeTab} onTabChange={(t) => (activeTab = t)} />
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
        {#if activeTab === 'habits'}
          <section class="habits-pane">
            <div class={isDesktop ? 'day-strip-static' : 'day-strip-sticky'}>
              <DayStrip />
            </div>

            <ProgressHero />

            {#if hasStructure}
              <div style="padding: 22px 16px 0; display: flex; flex-direction: column; gap: 10px;">
                {#if store.extraHabitCount > 0}
                  <div
                    style="display: flex; align-items: center; justify-content: flex-end;
                          padding: 0 4px 0;"
                  >
                    <button
                      type="button"
                      onclick={() => (showAll = !showAll)}
                      aria-pressed={showAll}
                      aria-label={showAll ? 'Show only scheduled habits' : 'Show all habits'}
                      style="display: inline-flex; align-items: center; gap: 5px;
                         padding: 5px 12px; border-radius: 99px;
                         border: 1.5px solid {showAll ? 'var(--accent-soft)' : 'var(--line)'};
                         background: {showAll ? 'var(--accent-fill)' : 'transparent'};
                         color: {showAll ? 'var(--accent-ink)' : 'var(--ink-faint)'};
                         font-family: var(--font-display); font-size: var(--fs-overline); font-weight: 700;
                         letter-spacing: 0.4px; text-transform: uppercase;
                         cursor: pointer;
                         transition: all var(--t-quick) var(--ease-out);"
                    >
                      {showAll ? 'Scheduled only' : `Show all (${store.extraHabitCount})`}
                    </button>
                  </div>
                {/if}

                <div bind:this={sectionsContainerRef}>
                  {#each activeGroups as group (group.section.id)}
                    {@const counts = store.sectionProgressFor(group.habits)}
                    <section data-section-id={group.section.id} style="margin-top: 14px;">
                      <SectionHeader
                        section={group.section}
                        doneCount={counts.done}
                        totalCount={counts.total}
                        onRename={openRename}
                      />
                      <div
                        style="display: grid;
                           grid-template-rows: {group.section.collapsed ? '0fr' : '1fr'};
                           overflow: {group.section.collapsed ? 'hidden' : 'visible'};
                           transition: grid-template-rows var(--t-normal) var(--ease-out);"
                      >
                        <div
                          style="overflow: hidden; min-height: 0;
                             padding: 10px 16px 0; margin: -10px -16px 0;"
                        >
                          <ul
                            use:registerSectionUl={group.section.id}
                            style="list-style: none; padding: 0; margin: 0;
                               display: flex; flex-direction: column; gap: 10px;
                               min-height: {group.habits.length === 0 ? '8px' : 'auto'};"
                          >
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

                <button
                  type="button"
                  onclick={openAddSection}
                  style="margin-top: 14px; padding: 8px 12px;
                     border: 1.5px dashed var(--line); border-radius: var(--r-md);
                     background: transparent; color: var(--ink-faint);
                     font-family: var(--font-display); font-size: var(--fs-meta); font-weight: 700;
                     letter-spacing: 0.6px; text-transform: uppercase;
                     cursor: pointer; width: 100%;
                     transition: border-color var(--t-quick), color var(--t-quick);"
                  onmouseenter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                  }}
                  onmouseleave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)';
                  }}
                >
                  + New section
                </button>
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
        {#if activeTab === 'todos'}
          <section class="tasks-pane">
            <div style="padding: 14px 16px 0;">
              <div style="padding: 4px 4px 14px;">
                <div
                  style="font-family: var(--font-display); font-weight: 700;
                     font-size: var(--fs-display); line-height: 1.05; letter-spacing: -1.2px;
                     color: var(--ink);"
                >
                  Tasks<span style="color: var(--accent);">.</span>
                </div>
                <div
                  style="margin-top: 6px; font-size: var(--fs-meta); font-weight: 600;
                     letter-spacing: 0.2px; color: var(--ink-faint);
                     font-variant-numeric: tabular-nums; text-transform: uppercase;"
                >
                  {store.data.todos.length === 0
                    ? 'A place for assignments and to-dos.'
                    : `${todosOpen} open${todosDone > 0 ? ` · ${todosDone} done` : ''}`}
                </div>
              </div>

              <!-- Sections container (sortable for reordering sections) -->
              <div bind:this={todoSectionsContainerRef} style="margin-top: 18px;">
                {#each store.todoGroups as group (group.section.id)}
                  <div data-todo-section-id={group.section.id}>
                    <TodoSectionHeader section={group.section} onRename={openRenameTodoSection} />

                    {#if !group.section.collapsed}
                      <ul
                        use:registerTodoSectionUl={group.section.id}
                        style="list-style: none; padding: 0; margin: 0 0 18px;
                           display: flex; flex-direction: column; gap: 8px;
                           min-height: 8px;"
                      >
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

              <!-- + New section button (hidden when empty state is showing) -->
              {#if store.data.todos.length > 0 || store.data.todoSections.length > 1}
                <button
                  type="button"
                  onclick={openAddTodoSection}
                  style="margin-top: 14px; padding: 8px 12px;
                     border: 1.5px dashed var(--line); border-radius: var(--r-md);
                     background: transparent; color: var(--ink-faint);
                     font-family: var(--font-display); font-size: var(--fs-meta); font-weight: 700;
                     letter-spacing: 0.6px; text-transform: uppercase;
                     cursor: pointer; width: 100%;
                     transition: border-color var(--t-quick), color var(--t-quick);"
                  onmouseenter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                  }}
                  onmouseleave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)';
                  }}
                >
                  + New section
                </button>
              {/if}

              <!-- Empty state when no tasks at all -->
              {#if todosOpen === 0 && todosDone === 0}
                <div style="padding: 36px 24px 0; text-align: center;">
                  <div
                    style="font-family: var(--font-display); font-weight: 700;
                       font-size: 30px; line-height: 1.05; letter-spacing: -1.2px;
                       color: var(--ink); margin-bottom: 8px;"
                  >
                    Capture a task.
                  </div>
                  <p
                    style="margin: 0 auto 28px; max-width: 280px;
                       font-family: var(--font-body); font-size: 14px; line-height: 1.45;
                       color: var(--ink-muted);"
                  >
                    One-offs that need doing — assignments, errands, calls. Different from habits,
                    which recur.
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
                      onclick={openAddTodo}
                      style="width: 100%; padding: 14px 16px; border-radius: 14px;
                         background: var(--accent); color: var(--accent-on);
                         border: 0; cursor: pointer;
                         font-family: var(--font-display); font-size: 16px; font-weight: 600;
                         letter-spacing: -0.2px;
                         box-shadow: 0 8px 22px var(--accent-glow);"
                    >
                      + Add your first task
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
                      <div>• Email Sam about Friday</div>
                      <div>• Pay the rent</div>
                      <div>• Pick up dry cleaning</div>
                    </div>
                  </div>
                </div>
              {/if}

              <!-- DONE bucket: all done tasks, flat -->
              {#if todosDone > 0}
                <div style="margin-top: 24px;">
                  <div
                    style="padding: 0 4px 10px;
                       font-family: var(--font-display); font-size: var(--fs-overline); font-weight: 700;
                       letter-spacing: 1.4px; text-transform: uppercase;
                       color: var(--ink-faint);
                       display: flex; align-items: center; gap: 8px;"
                  >
                    <span>Done</span>
                    <span
                      style="padding: 2px 7px; border-radius: 99px;
                         background: var(--surface-2); color: var(--ink-muted);
                         font-size: var(--fs-overline); letter-spacing: 0.4px;
                         font-variant-numeric: tabular-nums;"
                    >
                      {todosDone}
                    </span>
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

        <!-- Notes view -->
        {#if activeTab === 'notes'}
          <section class="notes-pane">
            {#if openNote}
              {#key openNote.id}
                <NoteEditor
                  note={openNote}
                  isNew={openNote.id === freshNoteId}
                  onBack={() => (editingNoteId = null)}
                />
              {/key}
            {:else}
              <div style="padding: 14px 16px 0;">
                <div style="padding: 4px 4px 14px;">
                  <div
                    style="font-family: var(--font-display); font-weight: 700;
                       font-size: var(--fs-display); line-height: 1.05; letter-spacing: -1.2px;
                       color: var(--ink);"
                  >
                    Notes<span style="color: var(--accent);">.</span>
                  </div>
                  <div
                    style="margin-top: 6px; font-size: var(--fs-meta); font-weight: 600;
                       letter-spacing: 0.2px; color: var(--ink-faint);
                       font-variant-numeric: tabular-nums; text-transform: uppercase;"
                  >
                    {store.data.notes.length === 0
                      ? 'A place for quick notes and longer thoughts.'
                      : `${store.data.notes.length} note${store.data.notes.length === 1 ? '' : 's'}`}
                  </div>
                </div>

                {#if store.data.notes.length > 0}
                  <ul
                    style="list-style: none; padding: 0; margin: 18px 0 0;
                       display: flex; flex-direction: column; gap: 10px;"
                  >
                    {#each store.notes as note (note.id)}
                      <li>
                        <NoteItem {note} onOpen={(n) => (editingNoteId = n.id)} />
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <!-- Empty state -->
                  <div style="padding: 36px 24px 0; text-align: center;">
                    <div
                      style="font-family: var(--font-display); font-weight: 700;
                         font-size: 30px; line-height: 1.05; letter-spacing: -1.2px;
                         color: var(--ink); margin-bottom: 8px;"
                    >
                      Start a note.
                    </div>
                    <p
                      style="margin: 0 auto 28px; max-width: 280px;
                         font-family: var(--font-body); font-size: 14px; line-height: 1.45;
                         color: var(--ink-muted);"
                    >
                      Jot down ideas, lists, or longer thoughts. Separate from your habits and
                      tasks.
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
                        onclick={openAddNote}
                        style="width: 100%; padding: 14px 16px; border-radius: 14px;
                           background: var(--accent); color: var(--accent-on);
                           border: 0; cursor: pointer;
                           font-family: var(--font-display); font-size: 16px; font-weight: 600;
                           letter-spacing: -0.2px;
                           box-shadow: 0 8px 22px var(--accent-glow);"
                      >
                        + Add your first note
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
                        <div>• Reading list</div>
                        <div>• Meeting notes</div>
                        <div>• Trip planning</div>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </section>
        {/if}
      </main>

      <!-- FAB (mobile) -->
      {#if !isDesktop}
        <div class="fab-wrap">
          <button
            type="button"
            onclick={handleAddClick}
            aria-label={activeTab === 'habits'
              ? 'Add habit'
              : activeTab === 'todos'
                ? 'Add task'
                : 'New note'}
            class="fab"
          >
            <IconPlus class="h-7 w-7" />
          </button>
        </div>
      {/if}
    </div>
    <!-- .app-body -->
  </div>

  <AddHabitModal bind:open={modalOpen} habit={editingHabit} />
  <SectionModal bind:open={sectionModalOpen} section={editingSection} />
  <TodoModal bind:open={todoModalOpen} todo={editingTodo} />
  <TodoSectionModal bind:open={todoSectionModalOpen} section={editingTodoSection} />
  <DataModal bind:open={dataModalOpen} />
{/if}

<style>
  .app-shell {
    height: 100svh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    overflow: hidden;
    box-sizing: border-box;
  }

  .app-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .top-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: max(58px, calc(env(safe-area-inset-top) + 28px)) 16px 8px;
  }
  .top-bar.is-desktop {
    padding: 20px 32px 8px;
    max-width: 720px;
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
  .tasks-pane,
  .notes-pane {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
  }

  .fab-wrap {
    position: fixed;
    right: calc(20px + env(safe-area-inset-right));
    bottom: calc(20px + env(safe-area-inset-bottom));
    z-index: 20;
  }
  .fab {
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
    .app-shell {
      flex-direction: row;
    }
    .habits-pane,
    .tasks-pane,
    .notes-pane {
      max-width: 640px;
    }
  }
</style>
