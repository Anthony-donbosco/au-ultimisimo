// src/i18n/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';

const LANGUAGE_STORAGE_KEY = '@aureum_language_preference';
const SUPPORTED_LANGUAGES = ['en', 'es'];

type LanguageMode = 'en' | 'es' | 'auto';

const getDeviceLanguage = (): string => {
  try {
    // expo-localization provides getLocales() similar to react-native-localize
    const locales = Localization.getLocales();
    if (locales.length > 0) {
      const deviceLanguage = locales[0].languageCode;
      if (deviceLanguage && SUPPORTED_LANGUAGES.includes(deviceLanguage)) {
        return deviceLanguage;
      }
    }
  } catch (error) {
    console.warn('Error detecting device language:', error);
  }
  return 'en';
};

const initializeI18n = async (): Promise<void> => {
  try {
    const savedLanguageMode = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    let initialLanguage: string;
    
    if (savedLanguageMode && (SUPPORTED_LANGUAGES.includes(savedLanguageMode) || savedLanguageMode === 'auto')) {
      if (savedLanguageMode === 'auto') {
        initialLanguage = getDeviceLanguage();
      } else {
        initialLanguage = savedLanguageMode;
      }
    } else {
      // Default to auto mode
      initialLanguage = getDeviceLanguage();
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, 'auto');
    }
    
    await i18n
      .use(initReactI18next)
      .init({
        compatibilityJSON: 'v4',
        lng: initialLanguage,
        fallbackLng: 'en',
        debug: __DEV__,
        resources: {
          en: { translation: en },
          es: { translation: es },
        },
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
    
    console.log('🌐 i18n initialized with language:', initialLanguage);
  } catch (error) {
    console.error('Error initializing i18n:', error);
    // Fallback initialization
    await i18n
      .use(initReactI18next)
      .init({
        compatibilityJSON: 'v4',
        lng: 'en',
        fallbackLng: 'en',
        debug: __DEV__,
        resources: {
          en: { translation: en },
          es: { translation: es },
        },
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
  }
};

export const changeLanguage = async (languageMode: LanguageMode): Promise<void> => {
  try {
    let targetLanguage: string;
    
    if (languageMode === 'auto') {
      targetLanguage = getDeviceLanguage();
    } else if (SUPPORTED_LANGUAGES.includes(languageMode)) {
      targetLanguage = languageMode;
    } else {
      throw new Error(`Unsupported language mode: ${languageMode}`);
    }
    
    await i18n.changeLanguage(targetLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageMode);
    console.log('🌐 Language mode changed to:', languageMode, 'using language:', targetLanguage);
  } catch (error) {
    console.error('Error changing language:', error);
    throw error;
  }
};

export const getCurrentLanguage = (): string => i18n.language || 'en';

export const getCurrentLanguageMode = async (): Promise<LanguageMode> => {
  try {
    const savedMode = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedMode && (SUPPORTED_LANGUAGES.includes(savedMode) || savedMode === 'auto')) {
      return savedMode as LanguageMode;
    }
    return 'auto';
  } catch (error) {
    console.error('Error getting language mode:', error);
    return 'auto';
  }
};

export const getSupportedLanguages = () => {
  return [
    { code: 'auto', name: 'Automatic (System)', nativeName: 'Automático (Sistema)' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
  ];
};

// Note: expo-localization doesn't provide real-time language change events
// This is a simplified version that checks periodically when in auto mode
let systemLanguageCheckInterval: NodeJS.Timeout | null = null;
let lastKnownSystemLanguage: string | null = null;

export const setupSystemLanguageListener = async () => {
  const currentMode = await getCurrentLanguageMode();
  
  if (currentMode === 'auto') {
    // Initialize last known language
    lastKnownSystemLanguage = getDeviceLanguage();
    
    // Check for system language changes every 5 seconds
    systemLanguageCheckInterval = setInterval(async () => {
      const currentMode = await getCurrentLanguageMode();
      if (currentMode === 'auto') {
        const currentSystemLanguage = getDeviceLanguage();
        if (lastKnownSystemLanguage && currentSystemLanguage !== lastKnownSystemLanguage) {
          lastKnownSystemLanguage = currentSystemLanguage;
          if (currentSystemLanguage !== getCurrentLanguage()) {
            await i18n.changeLanguage(currentSystemLanguage);
            console.log('🌐 System language changed, updating to:', currentSystemLanguage);
          }
        }
      }
    }, 5000); // Check every 5 seconds
  }
};

export const removeSystemLanguageListener = () => {
  if (systemLanguageCheckInterval) {
    clearInterval(systemLanguageCheckInterval);
    systemLanguageCheckInterval = null;
    lastKnownSystemLanguage = null;
  }
};

// Initialize i18n
initializeI18n();

export default i18n;