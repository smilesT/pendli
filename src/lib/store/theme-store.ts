import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

function getInitialTheme(): boolean {
  if (typeof globalThis.document === 'undefined') return false;
  const stored = localStorage.getItem('pendli-theme');
  if (stored) return stored === 'dark';
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(isDark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('pendli-theme', isDark ? 'dark' : 'light');
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitialTheme();
  applyTheme(initial);
  return {
    isDark: initial,
    toggle: () =>
      set((state) => {
        const next = !state.isDark;
        applyTheme(next);
        return { isDark: next };
      }),
  };
});
