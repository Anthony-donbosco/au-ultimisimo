// src/hooks/useLanguage.ts
import { useState, useEffect } from 'react';
import { 
  changeLanguage, 
  getCurrentLanguage, 
  getCurrentLanguageMode
} from '../i18n/i18n';

type LanguageMode = 'en' | 'es' | 'auto';

interface LanguageOption {
  code: LanguageMode;
  name: string;
  nativeName: string;
  flag: string;
}

interface UseLanguageReturn {
  currentLanguage: string;
  currentLanguageMode: LanguageMode;
  languageOptions: LanguageOption[];
  isLoading: boolean;
  changeLanguageMode: (mode: LanguageMode) => Promise<void>;
  getCurrentLanguageOption: () => LanguageOption;
}

const getLanguageFlag = (code: string): string => {
  const flags: Record<string, string> = {
    en: '🇺🇸',
    es: '🇸🇻',
    auto: '📱',
  };
  return flags[code] || '🌐';
};

export const useLanguage = (): UseLanguageReturn => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [currentLanguageMode, setCurrentLanguageMode] = useState<LanguageMode>('auto');
  const [isLoading, setIsLoading] = useState(true);

  // Language options - static array
  const languageOptions: LanguageOption[] = [
    {
      code: 'auto',
      name: 'Automatic (System)',
      nativeName: 'Automático (Sistema)',
      flag: getLanguageFlag('auto'),
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: getLanguageFlag('en'),
    },
    {
      code: 'es',
      name: 'Español',
      nativeName: 'Español',
      flag: getLanguageFlag('es'),
    },
  ];

  useEffect(() => {
    initializeLanguageState();
  }, []);

  const initializeLanguageState = async () => {
    try {
      setIsLoading(true);
      const [mode, language] = await Promise.all([
        getCurrentLanguageMode(),
        Promise.resolve(getCurrentLanguage()),
      ]);
      
      setCurrentLanguageMode(mode);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Error initializing language state:', error);
      // Set defaults
      setCurrentLanguageMode('auto');
      setCurrentLanguage('en');
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguageMode = async (mode: LanguageMode): Promise<void> => {
    try {
      setIsLoading(true);
      await changeLanguage(mode);
      
      // Update state
      const newLanguage = getCurrentLanguage();
      setCurrentLanguageMode(mode);
      setCurrentLanguage(newLanguage);
    } catch (error) {
      console.error('Error changing language mode:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLanguageOption = (): LanguageOption => {
    return languageOptions.find(option => option.code === currentLanguageMode) || languageOptions[0];
  };

  return {
    currentLanguage,
    currentLanguageMode,
    languageOptions,
    isLoading,
    changeLanguageMode,
    getCurrentLanguageOption,
  };
};