'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface UseDarkModeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLight: () => void;
  setDark: () => void;
  setSystem: () => void;
}

const STORAGE_KEY = 'blog-theme-preference';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Custom hook for managing dark mode with system preference detection,
 * localStorage persistence, and smooth transitions.
 *
 * @returns {UseDarkModeReturn} Theme state and control functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isDark, toggleTheme, setTheme } = useDarkMode();
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       {isDark ? 'Light' : 'Dark'} Mode
 *     </button>
 *   );
 * }
 * ```
 */
export function useDarkMode(): UseDarkModeReturn {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
  };

  // Resolve theme to actual light/dark value
  const resolveTheme = (themeValue: Theme): ResolvedTheme => {
    if (themeValue === 'system') {
      return getSystemTheme();
    }
    return themeValue;
  };

  // Apply theme to document
  const applyTheme = (resolved: ResolvedTheme) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Add transition class for smooth theme changes
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';

    if (resolved === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Remove transition after animation completes
    setTimeout(() => {
      root.style.transition = '';
    }, 300);
  };

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTheme);
    }

    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  };

  // Toggle between light and dark (ignores system)
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Convenience setters
  const setLight = () => setTheme('light');
  const setDark = () => setTheme('dark');
  const setSystem = () => setTheme('system');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true);

    // Get stored preference or default to system
    const storedTheme = (typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null) as Theme | null;

    const initialTheme = storedTheme || 'system';

    setThemeState(initialTheme);
    const resolved = resolveTheme(initialTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(MEDIA_QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolvedTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolvedTheme);
        applyTheme(newResolvedTheme);
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [mounted, theme]);

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme,
    toggleTheme,
    setLight,
    setDark,
    setSystem,
  };
}
