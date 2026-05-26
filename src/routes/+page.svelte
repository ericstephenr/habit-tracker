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
  import TodoSectionHeader from '$lib/components/TodoSectionHeader.svelte';
  import TodoSectionModal from '$lib/components/TodoSectionModal.svelte';
  import AddMenu from '$lib/components/AddMenu.svelte';
  import DayStrip from '$lib/components/DayStrip.svelte';
  import ProgressHero from '$lib/components/ProgressHero.svelte';
  import IconPlus from '$lib/components/icons/IconPlus.svelte';
  import IconGear from '$lib/components/icons/IconGear.svelte';
  import Sortable from 'sortablejs';
  import { SvelteMap } from 'svelte/reactivity';

  let activeTab = $state<'habits' | 'todos'>('habits');
  let showAll = $state(false);

  let modalOpen = $state(false);
  let dataModalOpen = $state(false);
  let editingHabit = $state<Habit | undefined>(undefined);

  let sectionModalOpen = $state(false);
  let editingSection = $state<Section | undefined>(undefined);

  let todoModalOpen = $state(false);
  let editingTodo = $state<Todo | undefined>(undefined);
  let addMenuOpen = $state(false);

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

  let pageTitle = $derived(activeTab === 'habits' ? 'Habits' : 'Tasks');

  function openAdd() {
    editingHabit = undefined;
    modalOpen = true;
  }

  function openAddTodo() {
    editingTodo = undefined;
    todoModalOpen = true;
  }

  function handleAddMenuSelect(choice: 'habit' | 'task') {
    addMenuOpen = false;
    if (choice === 'habit') openAdd();
    else openAddTodo();
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

  function downloadBackup() {
    const raw = readBackup();
    if (!raw) return;
    downloadJson(`habit-tracker-backup-${todayISO()}.json`, raw);
  }

  let hasStructure = $derived(store.hasAnyHabit);
  let activeGroups = $derived(showAll ? store.allStartedGroups : store.dueGroups);

  function isInactive(habit: Habit): boolean {
    return showAll && !store.dueHabitIds.has(habit.id);
  }

  function habitGroupCounts(habits: Habit[]) {
    let done = 0;
    let total = 0;
    for (const h of habits) {
      if (!store.dueHabitIds.has(h.id)) continue;
      total++;
      if (store.isDone(h.id, selectedDate.value)) done++;
    }
    return { done, total };
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
      <div style="display: flex; align-items: center; gap: 10px;">
        <span
          aria-hidden="true"
          style="width: 28px; height: 28px; border-radius: 8px;
                 background: var(--accent); color: var(--accent-on);
                 box-shadow: 0 4px 12px var(--accent-glow);
                 display: flex; align-items: center; justify-content: center;
                 flex-shrink: 0;"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7.5L5.5 10L11 4"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <h1
          style="margin: 0; font-family: var(--font-display); font-weight: 700;
                 font-size: 26px; letter-spacing: -0.8px; color: var(--ink);
                 line-height: 1;"
        >
          Habit Tracker
        </h1>
      </div>
      <div style="flex: 1;"></div>
      <div style="position: relative;">
        <button
          type="button"
          onclick={() => (addMenuOpen = !addMenuOpen)}
          aria-label="Add new"
          aria-expanded={addMenuOpen}
          style="width: 40px; height: 40px; border: 0; border-radius: var(--r-pill);
                 background: var(--accent); color: var(--accent-on);
                 display: flex; align-items: center; justify-content: center;
                 cursor: pointer; box-shadow: 0 4px 14px var(--accent-glow);"
        >
          <IconPlus class="h-5 w-5" />
        </button>
        <AddMenu bind:open={addMenuOpen} anchor="below" onSelect={handleAddMenuSelect} />
      </div>
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
                         font-family: var(--font-display); font-size: 11px; font-weight: 700;
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
                {@const counts = habitGroupCounts(group.habits)}
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
                           transition: grid-template-rows var(--t-normal) var(--ease-out);"
                  >
                    <div
                      style="overflow: hidden; min-height: 0;
                             padding-top: 10px; margin-top: -10px;"
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
                     font-family: var(--font-display); font-size: 12px; font-weight: 700;
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
    {#if isDesktop || activeTab === 'todos'}
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
              style="margin-top: 6px; font-size: 12px; font-weight: 600;
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

          <!-- + New section button -->
          <button
            type="button"
            onclick={openAddTodoSection}
            style="margin-top: 14px; padding: 8px 12px;
                   border: 1.5px dashed var(--line); border-radius: var(--r-md);
                   background: transparent; color: var(--ink-faint);
                   font-family: var(--font-display); font-size: 12px; font-weight: 700;
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

          <!-- Empty state when no undone tasks -->
          {#if todosOpen === 0 && todosDone === 0}
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
                {todosDone > 0 ? 'Nice work — your list is empty.' : 'Tap + to add one.'}
              </div>
            </div>
          {/if}

          <!-- DONE bucket: all done tasks, flat -->
          {#if todosDone > 0}
            <div style="margin-top: 24px;">
              <div
                style="padding: 0 4px 10px;
                       font-family: var(--font-display); font-size: 11px; font-weight: 700;
                       letter-spacing: 1.4px; text-transform: uppercase;
                       color: var(--ink-faint);
                       display: flex; align-items: center; gap: 8px;"
              >
                <span>Done</span>
                <span
                  style="padding: 2px 7px; border-radius: 99px;
                         background: var(--surface-2); color: var(--ink-muted);
                         font-size: 10px; letter-spacing: 0.4px;
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
  </main>

  <!-- FAB (mobile) -->
  {#if !isDesktop}
    <div class="fab-wrap">
      <button
        type="button"
        onclick={() => (addMenuOpen = !addMenuOpen)}
        aria-label="Add new"
        aria-expanded={addMenuOpen}
        class="fab"
      >
        <IconPlus class="h-7 w-7" />
      </button>
      <AddMenu bind:open={addMenuOpen} anchor="above" onSelect={handleAddMenuSelect} />
    </div>
  {/if}
</div>

<AddHabitModal bind:open={modalOpen} habit={editingHabit} />
<SectionModal bind:open={sectionModalOpen} section={editingSection} />
<TodoModal bind:open={todoModalOpen} todo={editingTodo} />
<TodoSectionModal bind:open={todoSectionModalOpen} section={editingTodoSection} />
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
    max-width: 1412px;
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
    .app-main {
      max-width: 1412px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(666px, 1fr) minmax(666px, 1fr);
      gap: 32px;
      padding: 0 24px calc(env(safe-area-inset-bottom) + 120px);
    }
    .habits-pane {
      max-width: none;
      margin: 0;
      padding-right: 24px;
    }
    .tasks-pane {
      max-width: none;
      margin: 0;
      border-left: 1px solid var(--line);
      padding-left: 24px;
    }
  }
</style>
