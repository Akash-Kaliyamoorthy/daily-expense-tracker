import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { THEME_STORAGE_KEY } from '../utils/constants';

const ThemeContext = createContext(null);

/**
 * Light / dark mode. The first value comes from whatever /theme-init.js already
 * applied to <html> (saved choice, else the OS preference), so React and the
 * page agree from the first paint. Only an explicit toggle is saved.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* storage unavailable (private mode): the choice just lasts for this visit */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
