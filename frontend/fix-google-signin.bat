@echo off
echo 🔧 Solucionando error RNGoogleSignin...

echo 1. Limpiando node_modules...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo 2. Reinstalando dependencias...
npm install

echo 3. Limpiando Android...
cd android
gradlew clean
cd ..

echo 4. Reinstalando Google Sign-In...
npm uninstall @react-native-google-signin/google-signin
npm install @react-native-google-signin/google-signin

echo 5. Ejecutando app...
npm run android

echo ✅ Proceso completado
pause