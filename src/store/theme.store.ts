import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggle: () =>
        set((s) => {
          const next = s.theme === 'light' ? 'dark' : 'light';
          applyTheme(next);
          return { theme: next };
        }),
      setTheme: (t) => {
        applyTheme(t);
        set({ theme: t });
      },
    }),
    { name: 'pipe-theme' }
  )
);

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Aplicar tema al cargar
const stored = localStorage.getItem('pipe-theme');
if (stored) {
  try {
    const { state } = JSON.parse(stored) as { state: { theme: Theme } };
    if (state?.theme === 'dark') applyTheme('dark');
  } catch {/* */}
}
