import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import storage from '../utils/storage';
import { createTheme, THEME_MODES, THEME_STORAGE_KEY } from '../theme/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState(THEME_MODES.SYSTEM);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadThemeMode = async () => {
      try {
        const stored = await storage.getItemAsync(THEME_STORAGE_KEY);
        if (!mounted) return;
        if (stored === THEME_MODES.LIGHT || stored === THEME_MODES.DARK || stored === THEME_MODES.SYSTEM) {
          setMode(stored);
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    };

    loadThemeMode();

    return () => {
      mounted = false;
    };
  }, []);

  const theme = useMemo(() => createTheme(mode, systemScheme), [mode, systemScheme]);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.backgroundColor = theme.colors.background;
      document.body.style.color = theme.colors.text;
    }
  }, [theme]);

  const setThemeMode = async (nextMode) => {
    setMode(nextMode);
    try {
      await storage.setItemAsync(THEME_STORAGE_KEY, nextMode);
    } catch (error) {
      // Theme preference should never block app usage.
    }
  };

  const value = useMemo(() => ({
    hydrated,
    mode,
    setThemeMode,
    ...theme,
  }), [hydrated, mode, theme]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { THEME_MODES };
