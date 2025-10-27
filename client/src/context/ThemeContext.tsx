/**
 * ThemeContext - Manages application theme (light/dark/auto)
 * Based on Digi Remote Manager theme system
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'dani-theme';
const DEFAULT_THEME: Theme = 'auto';

/**
 * Get system theme preference
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Load theme from localStorage
 */
const getStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      return stored as Theme;
    }
  } catch (error) {
    console.error('Error loading theme from localStorage:', error);
  }
  return DEFAULT_THEME;
};

/**
 * Save theme to localStorage
 */
const storeTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('Error saving theme to localStorage:', error);
  }
};

/**
 * Resolve theme to actual light/dark value
 */
const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'auto') {
    return getSystemTheme();
  }
  return theme;
};

/**
 * Apply theme to document
 */
const applyTheme = (resolvedTheme: ResolvedTheme): void => {
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  // Also set class for compatibility
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolvedTheme);
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getStoredTheme())
  );

  /**
   * Set theme and persist to localStorage
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    storeTheme(newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  };

  /**
   * Toggle between light and dark (sets to manual, not auto)
   */
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  /**
   * Listen to system theme changes when theme is set to 'auto'
   */
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      applyTheme(newResolvedTheme);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback for older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  /**
   * Apply theme on mount and when it changes
   */
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  /**
   * Apply initial theme before React hydration to prevent flash
   */
  useEffect(() => {
    const initialTheme = getStoredTheme();
    const initialResolved = resolveTheme(initialTheme);
    applyTheme(initialResolved);
  }, []);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to use theme context
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Initialize theme before React mounts (prevents FOUC)
 * Call this at the top level of your app entry point
 */
export const initializeTheme = (): void => {
  const theme = getStoredTheme();
  const resolved = resolveTheme(theme);
  applyTheme(resolved);
};
