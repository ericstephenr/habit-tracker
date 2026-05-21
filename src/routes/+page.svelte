<script lang="ts">
  import type { Habit, Section } from '$lib/types';
  import { store } from '$lib/store.svelte';
  import { formatDateHeader, formatWeekday, todayISO } from '$lib/schedule';
  import { readBackup } from '$lib/storage';
  import { downloadJson } from '$lib/importExport';
  import { selectedDate } from '$lib/selectedDate.svelte';
  import HabitItem from '$lib/components/HabitItem.svelte';
  import AddHabitModal from '$lib/components/AddHabitModal.svelte';
  import DataModal from '$lib/components/DataModal.svelte';
  import SectionHeader from '$lib/components/SectionHeader.svelte';
  import SectionModal from '$lib/components/SectionModal.svelte';
  import IconPlus from '$lib/components/icons/IconPlus.svelte';
  import IconChevronLeft from '$lib/components/icons/IconChevronLeft.svelte';
  import IconChevronRight from '$lib/components/icons/IconChevronRight.svelte';
  import IconGear from '$lib/components/icons/IconGear.svelte';
  import Sortable from 'sortablejs';
  import { SvelteMap } from 'svelte/reactivity';

  let modalOpen = $state(false);
  let dataModalOpen = $state(false);
  let editingHabit = $state<Habit | undefined>(undefined);

  let sectionModalOpen = $state(false);
  let editingSection = $state<Section | undefined>(undefined);

  let ungroupedUlRef: HTMLUListElement | undefined = $state();
  let sectionsContainerRef: HTMLDivElement | undefined = $state();
  const sectionUlMap = new SvelteMap<string, HTMLUListElement>();

  const HABIT_SORTABLE_OPTS: Sortable.Options = {
    group: 'habits',
    animation: 150,
    handle: '.drag-handle',
    delay: 150,
    delayOnTouchOnly: true,
    onEnd: onHabitDragEnd
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
    // If we leave the node in place, Svelte's source-<ul> keyed-#each can't
    // detach it (the tracked node's parent is now the destination) and the
    // destination-<ul>'s keyed-#each creates a new <li> beside it — duplicating
    // the habit in the DOM. Removing evt.item lets Svelte's destination #each
    // create the canonical <li> cleanly during reactivity.
    if (evt.from !== evt.to) evt.item.remove();
    store.commitLayout(groups);
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

  $effect(() => {
    if (!ungroupedUlRef) return;
    const inst = Sortable.create(ungroupedUlRef, HABIT_SORTABLE_OPTS);
    return () => inst.destroy();
  });

  $effect(() => {
    if (!sectionsContainerRef) return;
    const container = sectionsContainerRef;
    const inst = Sortable.create(container, {
      animation: 150,
      handle: '.section-drag-handle',
      delay: 150,
      delayOnTouchOnly: true,
      draggable: '[data-section-id]',
      onEnd() {
        const ids = [...container.querySelectorAll<HTMLElement>(':scope > [data-section-id]')].map(
          (el) => el.dataset.sectionId!
        );
        store.reorderSections(ids);
      }
    });
    return () => inst.destroy();
  });

  let overline = $derived(selectedDate.isToday ? 'Today' : selectedDate.isPast ? 'Past' : 'Future');

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

  function downloadBackup() {
    const raw = readBackup();
    if (!raw) return;
    downloadJson(`habit-tracker-backup-${todayISO()}.json`, raw);
  }

  let hasStructure = $derived(store.hasAnyHabit || store.data.sections.length > 0);
  let ungroupedGroup = $derived(store.dueGroups[0]);
  let sectionGroups = $derived(store.dueGroups.slice(1));
</script>

<svelte:head>
  <title>{overline} · Habit Tracker</title>
</svelte:head>

<main class="mx-auto min-h-svh max-w-md px-4 pt-8 pb-[calc(8rem+env(safe-area-inset-bottom))]">
  {#if store.recoveryNotice}
    <div
      role="status"
      class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <p class="mb-2">
        Your habit data couldn't be read and was reset. A backup of the raw data is saved locally.
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          onclick={downloadBackup}
          class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >Download backup</button
        >
        <button
          type="button"
          onclick={() => store.dismissRecoveryNotice()}
          class="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >Dismiss</button
        >
      </div>
    </div>
  {/if}

  <header class="mb-6">
    <div class="flex items-end justify-between">
      <p class="text-xs tracking-wide text-slate-500 uppercase">{overline}</p>
      <div class="flex items-center gap-1">
        <span
          aria-hidden={store.totalCount === 0}
          class="inline-flex items-baseline gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 {store.totalCount ===
          0
            ? 'invisible'
            : ''}"
        >
          <span class="text-slate-900">{store.doneCount}</span>
          <span class="text-slate-400">/ {store.totalCount}</span>
        </span>
        <button
          type="button"
          onclick={() => (dataModalOpen = true)}
          aria-label="Open data settings"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <IconGear class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div class="mt-1 flex items-center justify-between gap-2">
      <button
        type="button"
        onclick={() => selectedDate.goPrev()}
        aria-label="Previous day"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <IconChevronLeft class="h-5 w-5" />
      </button>
      <h1 class="flex-1 text-center text-2xl font-semibold tracking-tight text-slate-900">
        {formatDateHeader(selectedDate.value)}
      </h1>
      <button
        type="button"
        onclick={() => selectedDate.goNext()}
        aria-label="Next day"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <IconChevronRight class="h-5 w-5" />
      </button>
    </div>

    <div class="mt-2 flex justify-center">
      <button
        type="button"
        onclick={() => selectedDate.goToday()}
        aria-hidden={selectedDate.isToday}
        tabindex={selectedDate.isToday ? -1 : 0}
        class="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 {selectedDate.isToday
          ? 'invisible'
          : ''}">Jump to today</button
      >
    </div>

    <div
      class="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 {store.totalCount === 0
        ? 'invisible'
        : ''}"
      role="progressbar"
      aria-hidden={store.totalCount === 0}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={store.progressPct}
      aria-label="{store.doneCount} of {store.totalCount} habits complete"
    >
      <div
        class="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-[width] duration-300"
        style="width: {store.progressPct}%"
      ></div>
    </div>
  </header>

  {#if hasStructure}
    <div class="mb-3 flex justify-end">
      <button
        type="button"
        onclick={openAddSection}
        class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >+ Section</button
      >
    </div>

    <ul
      bind:this={ungroupedUlRef}
      class="space-y-2 {ungroupedGroup.habits.length === 0 ? 'min-h-8' : ''}"
    >
      {#each ungroupedGroup.habits as habit (habit.id)}
        <li data-id={habit.id}>
          <HabitItem {habit} date={selectedDate.value} onEdit={openEdit} />
        </li>
      {/each}
    </ul>

    <div bind:this={sectionsContainerRef}>
      {#each sectionGroups as group (group.section!.id)}
        <section data-section-id={group.section!.id} class="mt-4">
          <SectionHeader section={group.section!} onRename={openRename} />
          {#if !group.section!.collapsed}
            <ul
              use:registerSectionUl={group.section!.id}
              class="space-y-2 {group.habits.length === 0 ? 'min-h-8' : ''}"
            >
              {#each group.habits as habit (habit.id)}
                <li data-id={habit.id}>
                  <HabitItem {habit} date={selectedDate.value} onEdit={openEdit} />
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}
    </div>

    {#if store.dueHabits.length === 0 && store.hasAnyHabit}
      <div
        class="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
      >
        No habits scheduled for {formatWeekday(selectedDate.value)}.
        {#if selectedDate.isToday}
          Enjoy a rest day, or
          <button type="button" onclick={openAdd} class="font-medium text-teal-700 hover:underline"
            >add another habit</button
          >.
        {/if}
      </div>
    {/if}
  {:else}
    <div class="rounded-xl border border-dashed border-slate-300 p-8 text-center">
      <p class="mb-1 text-base font-medium text-slate-800">No habits yet</p>
      <p class="mb-4 text-sm text-slate-500">Add your first habit to start tracking.</p>
      <button
        type="button"
        onclick={openAdd}
        class="inline-flex items-center gap-1 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >+ Add habit</button
      >
    </div>
  {/if}
</main>

<button
  type="button"
  onclick={openAdd}
  aria-label="Add habit"
  class="fixed right-[calc(1.5rem+env(safe-area-inset-right))] bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/30 transition hover:bg-teal-700 active:scale-95"
>
  <IconPlus class="h-7 w-7" />
</button>

<AddHabitModal bind:open={modalOpen} habit={editingHabit} />
<SectionModal bind:open={sectionModalOpen} section={editingSection} />
<DataModal bind:open={dataModalOpen} />
