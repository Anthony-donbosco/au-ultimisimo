import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import * as SystemUI from 'expo-system-ui';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadDarkModePreference();
  }, []);

  useEffect(() => {
    // Actualizar status bar cuando cambie el modo
    const updateSystemUI = async () => {
      try {
        await SystemUI.setBackgroundColorAsync(isDarkMode ? '#0f172a' : '#ffffff');
      } catch (error) {
        // Silently ignore if activity is not available
        console.log('SystemUI update skipped - activity unavailable');
      }
    };
    updateSystemUI();
  }, [isDarkMode]);

  const loadDarkModePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('darkMode');
      if (savedMode !== null) {
        setIsDarkMode(savedMode === 'true');
      } else {
        // Si no hay preferencia guardada, usar la del sistema
        const systemMode = Appearance.getColorScheme();
        setIsDarkMode(systemMode === 'dark');
      }
    } catch (error) {
      console.log('Error loading dark mode preference:', error);
      setIsDarkMode(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('darkMode', newMode.toString());
    } catch (error) {
      console.log('Error saving dark mode preference:', error);
    }
  };

  return [isDarkMode, toggleTheme] as const;
};
