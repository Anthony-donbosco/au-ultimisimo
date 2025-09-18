#!/usr/bin/env node

/** version 2 de migrate-aureum.js */

/**
 * Script de Migración Automatizada - Aureum Mobile
 * Ejecutar: node migrate-aureum.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

const log = (color, message) => console.log(`${color}${message}${colors.reset}`);
const success = (msg) => log(colors.green, `✅ ${msg}`);
const error = (msg) => log(colors.red, `❌ ${msg}`);
const warning = (msg) => log(colors.yellow, `⚠️  ${msg}`);
const info = (msg) => log(colors.blue, `ℹ️  ${msg}`);
const step = (msg) => log(colors.cyan + colors.bright, `🔄 ${msg}`);

// Configuración
const CONFIG = {
  srcPath: './src',
  backupPath: './backup-pre-migration',
  dependencies: [
    'i18next',
    'react-i18next',
    'react-native-localize'
  ]
};

// --------- Utilidades cross-platform (copiar/eliminar recursivo) ---------
function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Ruta de origen no existe: ${src}`);
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursiveSync(s, d);
    } else if (entry.isSymbolicLink && entry.isSymbolicLink()) {
      const link = fs.readlinkSync(s);
      fs.symlinkSync(link, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function removeRecursiveSync(target) {
  if (!fs.existsSync(target)) return;
  if (fs.rmSync) {
    // Node 14+: fs.rmSync
    fs.rmSync(target, { recursive: true, force: true });
  } else {
    // Fallback para Node antiguos
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      const p = path.join(target, entry.name);
      if (entry.isDirectory()) {
        removeRecursiveSync(p);
      } else {
        try { fs.unlinkSync(p); } catch {}
      }
    }
    try { fs.rmdirSync(target); } catch {}
  }
}
// ------------------------------------------------------------------------

// Utilidades
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    success(`Directorio creado: ${dirPath}`);
  }
}

function createBackup() {
  step('Creando backup del código actual...');

  if (!fs.existsSync(CONFIG.srcPath)) {
    error(`No se encontró la carpeta ${CONFIG.srcPath}. Asegúrate de ejecutar desde la raíz del proyecto.`);
    process.exit(1);
  }

  if (fs.existsSync(CONFIG.backupPath)) {
    warning('Backup anterior encontrado, eliminando...');
    removeRecursiveSync(CONFIG.backupPath);
  }

  if (fs.cpSync) {
    // Node 16.7+ soporta fs.cpSync
    fs.cpSync(CONFIG.srcPath, CONFIG.backupPath, { recursive: true, force: true });
  } else {
    copyRecursiveSync(CONFIG.srcPath, CONFIG.backupPath);
  }

  success('Backup creado en ./backup-pre-migration');
}

function installDependencies() {
  step('Instalando dependencias necesarias...');

  try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const missingDeps = CONFIG.dependencies.filter(dep =>
      !((packageJson.dependencies && packageJson.dependencies[dep]) ||
        (packageJson.devDependencies && packageJson.devDependencies[dep]))
    );

    if (missingDeps.length > 0) {
      info(`Instalando: ${missingDeps.join(', ')}`);
      execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
      success('Dependencias instaladas');
    } else {
      success('Todas las dependencias ya están instaladas');
    }
  } catch (err) {
    error(`Error instalando dependencias: ${err.message}`);
    process.exit(1);
  }
}

function createDirectoryStructure() {
  step('Creando estructura de directorios...');

  const directories = [
    `${CONFIG.srcPath}/contexts`,
    `${CONFIG.srcPath}/i18n`,
    `${CONFIG.srcPath}/i18n/locales`,
    `${CONFIG.srcPath}/components/common`
  ];

  directories.forEach(ensureDirectoryExists);
}

function createThemeContext() {
  step('Creando ThemeContext...');

  const themeContextPath = `${CONFIG.srcPath}/contexts/ThemeContext.tsx`;

  const themeContextContent = `// Generado automáticamente por script de migración
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
`;

  fs.writeFileSync(themeContextPath, themeContextContent, 'utf8');
  success('ThemeContext creado');
}

function createI18nConfig() {
  step('Creando configuración de i18n...');

  // Crear archivo principal de configuración
  const i18nConfigPath = `${CONFIG.srcPath}/i18n/i18n.ts`;
  const i18nConfigContent = `// Generado automáticamente por script de migración
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';

const LANGUAGE_STORAGE_KEY = '@aureum_language_preference';
const SUPPORTED_LANGUAGES = ['en', 'es'];

const getDeviceLanguage = (): string => {
  try {
    const locales = RNLocalize.getLocales();
    if (locales.length > 0) {
      const deviceLanguage = locales[0].languageCode;
      if (SUPPORTED_LANGUAGES.includes(deviceLanguage)) {
        return deviceLanguage;
      }
    }
  } catch (error) {
    console.warn('Error detecting device language:', error);
  }
  return 'en';
};

const i18nConfig = {
  compatibilityJSON: 'v3',
  lng: undefined,
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
};

const initializeI18n = async (): Promise<void> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    let initialLanguage: string;
    
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      initialLanguage = savedLanguage;
    } else {
      initialLanguage = getDeviceLanguage();
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
    }
    
    i18nConfig.lng = initialLanguage;
    await i18n.use(initReactI18next).init(i18nConfig);
    console.log('🌐 i18n initialized with language:', initialLanguage);
  } catch (error) {
    console.error('Error initializing i18n:', error);
    i18nConfig.lng = 'en';
    await i18n.use(initReactI18next).init(i18nConfig);
  }
};

export const changeLanguage = async (language: string): Promise<void> => {
  try {
    if (SUPPORTED_LANGUAGES.includes(language)) {
      await i18n.changeLanguage(language);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      console.log('🌐 Language changed to:', language);
    }
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

export const getCurrentLanguage = (): string => i18n.language || 'en';

export const getSupportedLanguages = () => {
  return SUPPORTED_LANGUAGES.map(code => ({
    code,
    name: code === 'en' ? 'English' : 'Spanish',
    nativeName: code === 'en' ? 'English' : 'Español',
  }));
};

initializeI18n();
export default i18n;
`;

  fs.writeFileSync(i18nConfigPath, i18nConfigContent, 'utf8');
  success('Configuración i18n creada');
}

function createTranslationFiles() {
  step('Creando archivos de traducción...');

  // Traducciones en inglés (básicas)
  const enTranslations = {
    common: {
      welcome: "Welcome",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      save: "Save",
      edit: "Edit",
      delete: "Delete"
    },
    navigation: {
      dashboard: "Dashboard",
      transactions: "Transactions",
      income: "Income",
      expenses: "Expenses",
      bills: "Bills",
      goals: "Goals",
      settings: "Settings",
      profile: "Profile"
    },
    dashboard: {
      welcomeBack: "Welcome back",
      totalBalance: "Total Balance",
      recentTransactions: "Recent Transactions",
      myGoal: "My Goal",
      completed: "completed"
    },
    settings: {
      title: "Settings",
      general: "General",
      appearance: "Appearance",
      language: "Language",
      security: "Security & Privacy"
    }
  };

  // Traducciones en español
  const esTranslations = {
    common: {
      welcome: "Bienvenido",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      cancel: "Cancelar",
      save: "Guardar",
      edit: "Editar",
      delete: "Eliminar"
    },
    navigation: {
      dashboard: "Inicio",
      transactions: "Transacciones",
      income: "Ingresos",
      expenses: "Gastos",
      bills: "Facturas",
      goals: "Objetivos",
      settings: "Configuración",
      profile: "Perfil"
    },
    dashboard: {
      welcomeBack: "Bienvenido de vuelta",
      totalBalance: "Balance Total",
      recentTransactions: "Transacciones Recientes",
      myGoal: "Mi Objetivo",
      completed: "completado"
    },
    settings: {
      title: "Configuración",
      general: "General",
      appearance: "Apariencia",
      language: "Idioma",
      security: "Seguridad y Privacidad"
    }
  };

  fs.writeFileSync(
    `${CONFIG.srcPath}/i18n/locales/en.json`,
    JSON.stringify(enTranslations, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    `${CONFIG.srcPath}/i18n/locales/es.json`,
    JSON.stringify(esTranslations, null, 2),
    'utf8'
  );

  success('Archivos de traducción creados');
}

function findAndReplaceInFiles() {
  step('Actualizando imports en archivos existentes...');

  const findUseDarkModeFiles = (dir) => {
    const files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
        files.push(...findUseDarkModeFiles(fullPath));
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('useDarkMode')) {
          files.push(fullPath);
        }
      }
    }

    return files;
  };

  const filesToUpdate = findUseDarkModeFiles(CONFIG.srcPath);
  let updatedCount = 0;

  filesToUpdate.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Reemplazar import de useDarkMode
    if (content.includes("import { useDarkMode } from")) {
      content = content.replace(
        /import { useDarkMode } from ['"](.*?)['"];?/g,
        "import { useTheme } from '../../contexts/ThemeContext';"
      );
      updated = true;
    }

    // Reemplazar uso de useDarkMode
    if (content.includes('useDarkMode()')) {
      content = content.replace(
        /const \[isDarkMode,\s*toggleDarkMode\] = useDarkMode\(\);?/g,
        'const { isDarkMode, toggleTheme } = useTheme();'
      );
      updated = true;
    }

    // Reemplazar toggleDarkMode por toggleTheme
    if (content.includes('toggleDarkMode')) {
      content = content.replace(/toggleDarkMode/g, 'toggleTheme');
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
      info(`Actualizado: ${filePath.replace(process.cwd(), '.')}`);
    }
  });

  success(`${updatedCount} archivos actualizados`);
}

function updateAppTsx() {
  step('Actualizando App.tsx...');

  const appPath = './App.tsx';

  if (!fs.existsSync(appPath)) {
    warning('App.tsx no encontrado, saltando...');
    return;
  }

  let content = fs.readFileSync(appPath, 'utf8');

  // Agregar imports necesarios si no existen
  if (!content.includes('ThemeProvider')) {
    content = content.replace(
      /import.*from 'react-native-safe-area-context';/,
      `import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';`
    );
  }

  if (!content.includes('./src/i18n/i18n')) {
    content = content.replace(
      /import.*from.*react.*;/,
      `import React, { useEffect, useState } from 'react';
import './src/i18n/i18n';`
    );
  }

  // Envolver en ThemeProvider si no está ya
  if (!content.includes('<ThemeProvider>')) {
    content = content.replace(
      /<SafeAreaProvider>/,
      `<SafeAreaProvider>
      <ThemeProvider>`
    );

    content = content.replace(
      /<\/SafeAreaProvider>/,
      `      </ThemeProvider>
    </SafeAreaProvider>`
    );
  }

  fs.writeFileSync(appPath, content, 'utf8');
  success('App.tsx actualizado');
}

function generateMigrationReport() {
  step('Generando reporte de migración...');

  const report = `
# 📊 Reporte de Migración - Aureum Mobile

## ✅ Elementos Migrados

### 🌙 Dark Mode
- [x] ThemeContext creado
- [x] Hook useTheme implementado
- [x] Compatibilidad con useDarkMode mantenida
- [x] Persistencia en AsyncStorage configurada
- [x] Detección de tema del sistema

### 🌐 Internacionalización
- [x] Configuración i18next creada
- [x] Archivos de traducción EN/ES básicos
- [x] Detección automática de idioma
- [x] Persistencia de preferencias

### 🔧 Configuración
- [x] Dependencias instaladas
- [x] Estructura de directorios creada
- [x] App.tsx actualizado
- [x] Imports actualizados automáticamente

## 📋 Próximos Pasos Manuales

1. **Crear componentes adicionales:**
   - ThemeSelector.tsx
   - LanguageSwitcher.tsx

2. **Ampliar traducciones:**
   - Agregar más textos a en.json y es.json
   - Implementar pluralización si es necesario

3. **Testing:**
   - Probar cambios de tema
   - Verificar persistencia
   - Validar traducciones

4. **Personalización:**
   - Ajustar colores en colors.ts
   - Añadir más idiomas si es necesario

## 🚨 Verificaciones Recomendadas

\`\`\`bash
# Verificar que la app compile
npm start

# Limpiar caché si hay problemas
npm start -- --clear-cache

# Reinstalar dependencias
# macOS/Linux:
rm -rf node_modules package-lock.json && npm install
# Windows (PowerShell):
rmdir /s /q node_modules; del package-lock.json; npm install
\`\`\`

## 📞 Soporte

Si encuentras problemas:
1. Revisa el backup en ./backup-pre-migration
2. Verifica que todas las dependencias estén instaladas
3. Comprueba los logs de Metro bundler

---
Migración completada: ${new Date().toISOString()}
`;

  fs.writeFileSync('./MIGRATION-REPORT.md', report, 'utf8');
  success('Reporte generado: ./MIGRATION-REPORT.md');
}

// Función principal
async function runMigration() {
  console.log(`
${colors.cyan}${colors.bright}
╔═══════════════════════════════════════╗
║        🚀 AUREUM MIGRATION TOOL       ║
║     Dark Mode + i18n Automation      ║
╚═══════════════════════════════════════╝
${colors.reset}
`);

  try {
    // Verificar que estamos en la raíz del proyecto
    if (!fs.existsSync('./package.json')) {
      error('No se encontró package.json. Ejecuta este script desde la raíz del proyecto.');
      process.exit(1);
    }

    // Crear backup (cross-platform)
    createBackup();

    // Instalar dependencias
    installDependencies();

    // Crear estructura
    createDirectoryStructure();

    // Crear archivos
    createThemeContext();
    createI18nConfig();
    createTranslationFiles();

    // Actualizar código existente
    findAndReplaceInFiles();
    updateAppTsx();

    // Generar reporte
    generateMigrationReport();

    console.log(`
${colors.green}${colors.bright}
🎉 ¡MIGRACIÓN COMPLETADA!

✅ Dark Mode robusto implementado
✅ Sistema i18n configurado  
✅ Código existente actualizado
✅ Backup creado en ./backup-pre-migration

📋 Próximos pasos:
1. Ejecutar: npm start
2. Probar cambios de tema
3. Revisar ./MIGRATION-REPORT.md
4. Crear ThemeSelector y LanguageSwitcher

${colors.reset}`);
  } catch (err) {
    error(`Error durante la migración: ${err.message}`);
    error('Revisa el backup en ./backup-pre-migration');
    process.exit(1);
  }
}

// Ejecutar migración
runMigration();
