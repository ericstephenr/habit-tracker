<script lang="ts">
  import { store } from '$lib/store.svelte';
  import { TABS, type Tab } from '$lib/tabs';
  import IconChevron from './icons/IconChevron.svelte';

  let {
    activeTab,
    onTabChange,
    onScrollToSection
  }: {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    onScrollToSection: (sectionId: string) => void;
  } = $props();

  let collapsed = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) collapsed = saved === 'true';
  });

  function toggle() {
    collapsed = !collapsed;
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }

  function select(tab: Tab) {
    onTabChange(tab);
  }

  const navItems = TABS;

  let sidebarSections = $derived.by(() => {
    if (activeTab === 'habits') {
      const groupMap = new Map(store.dueGroups.map((g) => [g.section.id, g.habits]));
      return store.data.sections.map((s) => {
        const habits = groupMap.get(s.id) ?? [];
        const progress = store.sectionProgressFor(habits);
        return { ...s, done: progress.done, total: progress.total };
      });
    }
    if (activeTab === 'todos') {
      return store.data.todoSections.map((s) => ({ ...s, done: 0, total: 0 }));
    }
    // Notes are a flat list — no section quick-jumps.
    return [];
  });

  function toggleSectionCollapsed(id: string, e: MouseEvent) {
    e.stopPropagation();
    if (activeTab === 'habits') store.toggleSectionCollapsed(id);
    else store.toggleTodoSectionCollapsed(id);
  }
</script>

<nav class="sidebar" class:collapsed aria-label="Main navigation">
  <!-- Logo -->
  <div class="sidebar-logo">
    <span class="logo-icon" aria-hidden="true">
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
    {#if !collapsed}
      <span class="logo-text">Habit Tracker</span>
    {/if}
  </div>

  <!-- Nav items -->
  <div class="sidebar-nav">
    {#each navItems as item (item.id)}
      {@const active = item.id === activeTab}
      <button
        type="button"
        class="nav-item"
        class:active
        onclick={() => select(item.id)}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
      >
        <span class="nav-icon" aria-hidden="true">
          {#if item.id === 'habits'}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="14" height="14" rx="3" />
              <path d="M6.5 10.5L8.5 12.5L13.5 7.5" />
            </svg>
          {:else if item.id === 'todos'}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M7 6h8M7 10h8M7 14h5" />
              <circle cx="4.5" cy="6" r="0.8" fill="currentColor" stroke="none" />
              <circle cx="4.5" cy="10" r="0.8" fill="currentColor" stroke="none" />
              <circle cx="4.5" cy="14" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          {:else}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="4" y="3" width="12" height="14" rx="2.5" />
              <path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" />
            </svg>
          {/if}
        </span>
        {#if !collapsed}
          <span class="nav-label">{item.label}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Section quick-jumps -->
  {#if !collapsed && sidebarSections.length > 0}
    <div class="section-list">
      <div class="section-list-heading">Sections</div>
      {#each sidebarSections as section (section.id)}
        <div class="section-row">
          <button
            type="button"
            class="section-chevron"
            onclick={(e) => toggleSectionCollapsed(section.id, e)}
            aria-label={section.collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
          >
            <IconChevron class="section-chevron-icon" dir={section.collapsed ? 'right' : 'down'} />
          </button>
          <button
            type="button"
            class="section-name"
            onclick={() => onScrollToSection(section.id)}
            title={section.name}
          >
            {section.name}
          </button>
          {#if activeTab === 'habits' && section.total > 0}
            <span class="section-badge" class:all-done={section.done === section.total}>
              {section.done}/{section.total}
            </span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <div style="flex: 1;"></div>

  <!-- Collapse toggle -->
  <button
    type="button"
    class="collapse-btn"
    onclick={toggle}
    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
  >
    <IconChevron class="collapse-icon" dir={collapsed ? 'right' : 'left'} />
  </button>
</nav>

<style>
  .sidebar {
    width: 200px;
    min-width: 200px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--line);
    padding: 16px 10px;
    box-sizing: border-box;
    transition:
      width var(--t-normal) var(--ease-out),
      min-width var(--t-normal) var(--ease-out);
    overflow: hidden;
  }

  .sidebar.collapsed {
    width: 56px;
    min-width: 56px;
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 6px 20px;
    overflow: hidden;
    white-space: nowrap;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    min-width: 28px;
    border-radius: 8px;
    background: var(--accent);
    color: var(--accent-on);
    box-shadow: 0 4px 12px var(--accent-glow);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .logo-text {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.5px;
    color: var(--ink);
    line-height: 1;
    white-space: nowrap;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 8px;
    border: 0;
    border-radius: var(--r-sm);
    background: transparent;
    color: var(--ink-muted);
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.1px;
    white-space: nowrap;
    overflow: hidden;
    transition:
      background var(--t-quick) var(--ease-out),
      color var(--t-quick) var(--ease-out);
  }

  .nav-item:hover {
    background: var(--surface-2);
    color: var(--ink);
  }

  .nav-item.active {
    background: var(--accent-fill);
    color: var(--accent-ink);
  }

  .nav-icon {
    width: 20px;
    height: 20px;
    min-width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-label {
    white-space: nowrap;
  }

  .section-list {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
    min-height: 0;
  }

  .section-list-heading {
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--ink-faint);
    padding: 0 8px 6px;
  }

  .section-row {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 30px;
  }

  .section-chevron {
    width: 24px;
    height: 24px;
    min-width: 24px;
    border: 0;
    border-radius: var(--r-sm);
    background: transparent;
    color: var(--ink-faint);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition:
      background var(--t-quick) var(--ease-out),
      color var(--t-quick) var(--ease-out);
  }

  .section-chevron:hover {
    background: var(--surface-2);
    color: var(--ink-muted);
  }

  :global(.section-chevron-icon) {
    width: 12px;
    height: 12px;
  }

  .section-name {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--ink-muted);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.1px;
    text-align: left;
    padding: 4px 6px;
    border-radius: var(--r-sm);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      background var(--t-quick) var(--ease-out),
      color var(--t-quick) var(--ease-out);
  }

  .section-name:hover {
    background: var(--surface-2);
    color: var(--ink);
  }

  .section-badge {
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--ink-faint);
    background: var(--surface-2);
    padding: 1px 6px;
    border-radius: var(--r-pill);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .section-badge.all-done {
    background: var(--accent);
    color: var(--accent-on);
  }

  .collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: var(--r-sm);
    background: transparent;
    color: var(--ink-faint);
    cursor: pointer;
    transition:
      background var(--t-quick) var(--ease-out),
      color var(--t-quick) var(--ease-out);
    align-self: flex-end;
  }

  .collapse-btn:hover {
    background: var(--surface-2);
    color: var(--ink-muted);
  }

  :global(.collapse-icon) {
    width: 18px;
    height: 18px;
  }
</style>
