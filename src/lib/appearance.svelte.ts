export type Theme = 'light' | 'dark';
export type Accent = 'violet' | 'tangerine' | 'lime' | 'cobalt';

const THEME_KEY = 'meridian:theme';
const ACCENT_KEY = 'meridian:accent';

function readTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light';
  const v = localStorage.getItem(THEME_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

function readAccent(): Accent {
  if (typeof localStorage === 'undefined') return 'violet';
  const v = localStorage.getItem(ACCENT_KEY);
  if (v === 'tangerine' || v === 'lime' || v === 'cobalt' || v === 'violet') return v;
  return 'violet';
}

class Appearance {
  theme: Theme = $state(readTheme());
  accent: Accent = $state(readAccent());

  constructor() {
    if (typeof window === 'undefined') return;
    // Reflect persisted values to the <html> element on hydration. The static
    // attributes in app.html cover SSR/initial paint; this overwrites with the
    // user's saved preference once JS runs.
    this.reflect();

    window.addEventListener('storage', (e) => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        this.theme = e.newValue;
        this.reflect();
      } else if (
        e.key === ACCENT_KEY &&
        (e.newValue === 'violet' ||
          e.newValue === 'tangerine' ||
          e.newValue === 'lime' ||
          e.newValue === 'cobalt')
      ) {
        this.accent = e.newValue;
        this.reflect();
      }
    });
  }

  setTheme(next: Theme): void {
    this.theme = next;
    localStorage.setItem(THEME_KEY, next);
    this.reflect();
  }

  setAccent(next: Accent): void {
    this.accent = next;
    localStorage.setItem(ACCENT_KEY, next);
    this.reflect();
  }

  private reflect(): void {
    const html = document.documentElement;
    html.setAttribute('data-theme', this.theme);
    html.setAttribute('data-accent', this.accent);
  }
}

export const appearance = new Appearance();
