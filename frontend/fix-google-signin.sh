#!/bin/bash

echo "🔧 Solucionando error RNGoogleSignin..."

echo "1. Limpiando node_modules..."
rm -rf node_modules
rm -rf package-lock.json

echo "2. Reinstalando dependencias..."
npm install

echo "3. Limpiando Android..."
cd android
./gradlew clean
cd ..

echo "4. Limpiando cache de React Native..."
npx react-native-clean-project --remove-android-build --remove-android-clean-build --remove-ios-build --remove-ios-pods --remove-react-native-cache --remove-npm-cache --remove-yarn-cache

echo "5. Reinstalando Google Sign-In..."
npm uninstall @react-native-google-signin/google-signin
npm install @react-native-google-signin/google-signin

echo "6. Ejecutando app..."
npx react-native run-android

echo "✅ Proceso completado"