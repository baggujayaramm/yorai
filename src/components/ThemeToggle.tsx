'use client';

import { useEffect, useSyncExternalStore } from 'react';

const THEME_EVENT = 'yorai-theme-change';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(THEME_EVENT, callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem('yorai-theme') === 'dark';
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);

  const toggleTheme = () => {
    const next = !dark;
    window.localStorage.setItem('yorai-theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded border border-white/50 bg-surface/72 px-3 py-2 text-sm font-semibold text-ink shadow-soft backdrop-blur-xl transition hover:border-iris/55 hover:text-iris focus:outline-none focus:ring-4 focus:ring-iris/20 dark:border-white/10"
      onClick={toggleTheme}
      type="button"
    >
      {dark ? 'Light' : 'Dark'}
    </button>
  );
}
