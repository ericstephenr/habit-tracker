export type Theme = 'light' | 'dark';

const THEME_KEY = 'meridian:theme';

function readTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light';
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

class Appearance {
  theme: Theme = $state(readTheme());

  constructor() {
    if (typeof window === 'undefined') return;
    // Reflect the persisted value to <html> on hydration. The static attribute in
    // app.html covers SSR/initial paint; this overwrites with the saved preference
    // once JS runs.
    this.reflect();

    window.addEventListener('storage', (e) => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        this.theme = e.newValue;
        this.reflect();
      }
    });
  }

  setTheme(next: Theme): void {
    this.theme = next;
    localStorage.setItem(THEME_KEY, next);
    this.reflect();
  }

  toggle(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  private reflect(): void {
    document.documentElement.setAttribute('data-theme', this.theme);
  }
}

export const appearance = new Appearance();
