#!/usr/bin/env node

/**
 * Script para corregir imports de useDarkMode a useTheme
 * Ejecutar: node fix-imports.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = (color, message) => console.log(`${color}${message}${colors.reset}`);
const success = (msg) => log(colors.green, `✅ ${msg}`);
const error = (msg) => log(colors.red, `❌ ${msg}`);
const info = (msg) => log(colors.blue, `ℹ️  ${msg}`);

function findFilesWithUseDarkMode(dir, extensions = ['.tsx', '.ts']) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
      files.push(...findFilesWithUseDarkMode(fullPath, extensions));
    } else if (extensions.some(ext => item.endsWith(ext))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('useDarkMode')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // 1. Reemplazar import de useDarkMode
  if (content.includes("import { useDarkMode }")) {
    content = content.replace(
      /import\s*{\s*useDarkMode\s*}\s*from\s*['"][^'"]*useDarkMode['"];?/g,
      "import { useTheme } from '../../contexts/ThemeContext';"
    );
    updated = true;
    info(`Actualizado import en: ${filePath}`);
  }

  // 2. Reemplazar hook useDarkMode()
  if (content.includes('useDarkMode()')) {
    // Patrón más flexible para capturar diferentes formas de destructuring
    content = content.replace(
      /const\s*\[\s*isDarkMode\s*(?:,\s*toggleDarkMode)?\s*\]\s*=\s*useDarkMode\(\);?/g,
      'const { isDarkMode, toggleTheme } = useTheme();'
    );
    
    content = content.replace(
      /const\s*\[\s*isDarkMode\s*\]\s*=\s*useDarkMode\(\);?/g,
      'const { isDarkMode } = useTheme();'
    );
    
    updated = true;
    info(`Actualizado hook en: ${filePath}`);
  }

  // 3. Reemplazar toggleDarkMode por toggleTheme
  if (content.includes('toggleDarkMode')) {
    content = content.replace(/toggleDarkMode/g, 'toggleTheme');
    updated = true;
    info(`Actualizado toggleDarkMode en: ${filePath}`);
  }

  // 4. Corregir shadow props deprecated (específicamente en AuthButton)
  if (filePath.includes('AuthButton.tsx')) {
    // Reemplazar shadowColor, shadowOffset, shadowOpacity, shadowRadius con boxShadow
    const shadowRegex = /shadowColor:\s*'[^']*',\s*shadowOffset:\s*{\s*width:\s*\d+,\s*height:\s*\d+\s*},\s*shadowOpacity:\s*[\d.]+,\s*shadowRadius:\s*\d+,?/g;
    
    if (shadowRegex.test(content)) {
      content = content.replace(shadowRegex, "boxShadow: '0px 2px 4px rgba(245, 158, 11, 0.3)',");
      updated = true;
      info(`Corregido shadow props en: ${filePath}`);
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    success(`Archivo actualizado: ${filePath.replace(process.cwd(), '.')}`);
    return true;
  }

  return false;
}

function main() {
  console.log(`
${colors.blue}
╔═══════════════════════════════════════╗
║        🔧 FIX IMPORTS TOOL           ║
║    useDarkMode → useTheme Migration   ║
╚═══════════════════════════════════════╝
${colors.reset}
`);

  const srcPath = './src';
  
  if (!fs.existsSync(srcPath)) {
    error('No se encontró la carpeta src. Ejecuta desde la raíz del proyecto.');
    process.exit(1);
  }

  info('Buscando archivos con useDarkMode...');
  const filesToFix = findFilesWithUseDarkMode(srcPath);

  if (filesToFix.length === 0) {
    success('No se encontraron archivos que necesiten corrección.');
    return;
  }

  info(`Encontrados ${filesToFix.length} archivos para corregir:`);
  filesToFix.forEach(file => console.log(`  - ${file.replace(process.cwd(), '.')}`));

  console.log('\n' + colors.yellow + '🔄 Aplicando correcciones...' + colors.reset + '\n');

  let fixedCount = 0;
  filesToFix.forEach(file => {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  });

  console.log(`
${colors.green}
🎉 ¡CORRECCIÓN COMPLETADA!

✅ ${fixedCount} archivos corregidos
✅ useDarkMode → useTheme
✅ toggleDarkMode → toggleTheme  
✅ Shadow props actualizados

${colors.yellow}📋 Próximos pasos:
1. Verificar que App.tsx tenga ThemeProvider
2. Ejecutar: npm start
3. Probar el dark mode

${colors.reset}`);
}

main();