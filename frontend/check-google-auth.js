#!/usr/bin/env node

/**
 * Script para verificar la configuración de Google Authentication
 * Uso: node check-google-auth.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de Google Authentication...\n');

// Verificar archivo .env
const envPath = path.join(__dirname, '.env');
console.log('📁 Verificando archivo .env...');
if (!fs.existsSync(envPath)) {
  console.log('❌ Archivo .env no encontrado');
  console.log('   Crea un archivo .env en la carpeta frontend/');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {
  'EXPO_PUBLIC_FIREBASE_API_KEY': envContent.includes('EXPO_PUBLIC_FIREBASE_API_KEY='),
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID': envContent.includes('EXPO_PUBLIC_FIREBASE_PROJECT_ID='),
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID': envContent.includes('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID='),
  'API_URL': envContent.includes('API_URL=')
};

for (const [varName, exists] of Object.entries(envVars)) {
  if (exists) {
    console.log(`✅ ${varName} configurada`);
  } else {
    console.log(`❌ ${varName} faltante`);
  }
}

// Verificar google-services.json
const googleServicesPath = path.join(__dirname, 'android', 'app', 'google-services.json');
console.log('\n📁 Verificando google-services.json...');
if (!fs.existsSync(googleServicesPath)) {
  console.log('❌ google-services.json no encontrado en android/app/');
  console.log('   Descarga este archivo desde Firebase Console');
} else {
  console.log('✅ google-services.json encontrado');

  try {
    const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
    console.log(`   Project ID: ${googleServices.project_info?.project_id || 'No encontrado'}`);
    console.log(`   Package name: ${googleServices.client?.[0]?.client_info?.android_client_info?.package_name || 'No encontrado'}`);
  } catch (error) {
    console.log('⚠️  Error leyendo google-services.json:', error.message);
  }
}

// Verificar package.json dependencies
const packagePath = path.join(__dirname, 'package.json');
console.log('\n📦 Verificando dependencias...');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const requiredDeps = [
    '@react-native-google-signin/google-signin',
    'firebase',
    '@react-native-async-storage/async-storage'
  ];

  for (const dep of requiredDeps) {
    if (deps[dep]) {
      console.log(`✅ ${dep}: ${deps[dep]}`);
    } else {
      console.log(`❌ ${dep} no instalado`);
    }
  }
}

// Verificar archivos de configuración
const configFiles = [
  'src/config/firebase.ts',
  'src/services/googleAuthService.ts',
  'src/services/authService.ts'
];

console.log('\n📄 Verificando archivos de configuración...');
for (const file of configFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} existe`);
  } else {
    console.log(`❌ ${file} no encontrado`);
  }
}

console.log('\n🔧 Comandos útiles:');
console.log('   Ver SHA-1: cd android && ./gradlew signingReport');
console.log('   Limpiar: cd android && ./gradlew clean');
console.log('   Instalar: npm install');
console.log('   Ejecutar: npm run android');

console.log('\n📋 Pasos siguientes:');
console.log('1. Configura tu proyecto en Firebase Console');
console.log('2. Descarga google-services.json a android/app/');
console.log('3. Agrega SHA-1 fingerprint en Firebase');
console.log('4. Actualiza variables en .env con TUS valores');
console.log('5. Ejecuta: npm install && npm run android');

console.log('\n✅ Verificación completa');