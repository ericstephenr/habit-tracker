<script lang="ts">
  import { store } from '$lib/store.svelte';
  import { TABS, type Tab } from '$lib/tabs';
  import { priorityFilter, type PriorityBucket } from '$lib/priorityFilter.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import IconGear from './icons/IconGear.svelte';

  let {
    activeTab,
    onTabChange,
    onSettings
  }: {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    onSettings: () => void;
  } = $props();

  const PRIORITY_FILTERS: { bucket: PriorityBucket; label: string; color: string }[] = [
    { bucket: 'high', label: 'High', color: 'var(--pri-high)' },
    { bucket: 'med', label: 'Medium', color: 'var(--pri-med)' },
    { bucket: 'low', label: 'Low', color: 'var(--pri-low)' },
    { bucket: 'none', label: 'None', color: 'var(--ink-faint)' }
  ];

  let counts = $derived<Record<Tab, number>>({
    habits: store.dueHabits.length,
    todos: store.data.todos.filter((t) => !t.done).length,
    notes: store.data.notes.length
  });
</script>

<nav class="rail" aria-label="Main navigation">
  <div class="brand"><span class="brand-mark" aria-hidden="true"></span>Meridian</div>

  {#each TABS as item (item.id)}
    <button
      type="button"
      class="nav-item"
      aria-current={item.id === activeTab}
      onclick={() => onTabChange(item.id)}
    >
      <span>{item.label}</span>
      <span class="nav-count">{counts[item.id]}</span>
    </button>
  {/each}

  {#if activeTab === 'habits'}
    <div class="rail-label">Priority</div>
    {#each PRIORITY_FILTERS as p (p.bucket)}
      <button
        type="button"
        class="filter-item"
        aria-pressed={priorityFilter.visible[p.bucket]}
        onclick={() => priorityFilter.toggle(p.bucket)}
        oncontextmenu={(e) => {
          e.preventDefault();
          priorityFilter.solo(p.bucket);
        }}
        title={`${priorityFilter.visible[p.bucket] ? 'Hide' : 'Show'} ${p.label} priority · right-click to solo`}
      >
        <span class="dot" style="background: {p.color};"></span>{p.label}
      </button>
    {/each}
  {/if}

  <div class="rail-spacer"></div>

  <button type="button" class="rail-btn" onclick={onSettings}>
    <IconGear />Settings
  </button>
  <button
    type="button"
    class="rail-btn"
    onclick={() => appearance.toggle()}
    aria-label={appearance.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
    {appearance.theme === 'dark' ? 'Light mode' : 'Dark mode'}
  </button>
</nav>
