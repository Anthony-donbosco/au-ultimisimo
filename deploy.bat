@echo off
echo 🚀 Iniciando deployment de AU Mobile App...

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker no está instalado. Instálalo desde https://docker.com
    pause
    exit /b 1
)

echo ✅ Docker encontrado

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado. Instálalo desde https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js encontrado

REM Construir y levantar servicios
echo 📦 Construyendo servicios Docker...
docker-compose up -d --build

if %errorlevel% neq 0 (
    echo ❌ Error al construir servicios Docker
    pause
    exit /b 1
)

echo ✅ Servicios Docker levantados

REM Esperar a que los servicios estén listos
echo ⏳ Esperando servicios (30 segundos)...
timeout /t 30 /nobreak >nul

REM Instalar dependencias del frontend
echo 📱 Configurando frontend...
cd frontend
call npm install

REM Instalar EAS CLI globalmente
echo 🔧 Instalando herramientas de build...
call npm install -g @expo/eas-cli

echo 🎉 Deployment inicial completado!
echo.
echo 📋 Siguientes pasos:
echo 1. Ejecuta: eas login
echo 2. Ejecuta: eas build --platform android --profile preview
echo 3. Escanea el QR que aparecerá para descargar el APK
echo.
echo 🐳 Servicios corriendo:
echo    Backend: http://localhost:5000
echo    Frontend Dev: http://localhost:19000
echo.
pause