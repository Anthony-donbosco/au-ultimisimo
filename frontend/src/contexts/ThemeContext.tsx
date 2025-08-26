// Generado automáticamente por script de migración
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import * as SystemUI from 'expo-system-ui';

const THEME_STORAGE_KEY = '@aureum_theme_preference';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ColorSchemeName;
  themeMode: ThemeMode;
  isLoading: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isDarkMode: boolean;
  isSystemTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ColorSchemeName>('light');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() || 'light'
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme || 'light');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    let newTheme: ColorSchemeName;
    switch (themeMode) {
      case 'light': newTheme = 'light'; break;
      case 'dark': newTheme = 'dark'; break;
      case 'system':
      default: newTheme = systemTheme; break;
    }
    if (newTheme !== theme) {
      setTheme(newTheme);
      updateSystemUI(newTheme);
    }
  }, [themeMode, systemTheme, isLoading]);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      setIsLoading(true);
      const savedThemeMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedThemeMode && ['light', 'dark', 'system'].includes(savedThemeMode)) {
        setThemeModeState(savedThemeMode as ThemeMode);
      } else {
        setThemeModeState('system');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      setThemeModeState('system');
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const updateSystemUI = async (currentTheme: ColorSchemeName) => {
    try {
      const backgroundColor = currentTheme === 'dark' ? '#0f172a' : '#ffffff';
      await SystemUI.setBackgroundColorAsync(backgroundColor);
    } catch (error) {
      console.error('Error updating system UI:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await saveThemePreference(mode);
  };

  const toggleTheme = async () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    await setThemeMode(nextMode);
  };

  const value: ThemeContextType = {
    theme,
    themeMode,
    isLoading,
    setThemeMode,
    toggleTheme,
    isDarkMode: theme === 'dark',
    isSystemTheme: themeMode === 'system',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook de compatibilidad con código existente
export const useDarkMode = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  return [isDarkMode, toggleTheme] as const;
};
