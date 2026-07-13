// frontend/src/lib/theme.js
const THEME_STORAGE_KEY = 'theme';

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function applyTheme(mode) {
  const isDark = mode === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'medical');
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
