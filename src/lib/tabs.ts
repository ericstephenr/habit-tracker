// Top-level screens. Shared so the sidebar, mobile dropdown, and page title
// stay in sync rather than maintaining three separate lists.
export type Tab = 'habits' | 'todos' | 'notes';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'habits', label: 'Habits' },
  { id: 'todos', label: 'Tasks' },
  { id: 'notes', label: 'Notes' }
];
