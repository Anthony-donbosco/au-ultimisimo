#!/bin/bash

echo "🚀 Iniciando proceso de build y deploy..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Verificar dependencias
print_step "Verificando dependencias..."

if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Instálalo desde https://docker.com"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    print_error "Node.js/npm no está instalado. Instálalo desde https://nodejs.org"
    exit 1
fi

print_success "Todas las dependencias están disponibles"

# 2. Construir y levantar servicios con Docker
print_step "Construyendo y levantando servicios con Docker..."
docker-compose up -d --build

if [ $? -eq 0 ]; then
    print_success "Servicios Docker levantados correctamente"
else
    print_error "Error al levantar servicios Docker"
    exit 1
fi

# 3. Esperar a que los servicios estén listos
print_step "Esperando a que los servicios estén listos..."
sleep 30

# 4. Verificar que el backend esté funcionando
print_step "Verificando backend..."
backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")

if [ "$backend_status" = "200" ]; then
    print_success "Backend funcionando correctamente"
else
    print_warning "Backend no responde. Continuando con el build del frontend..."
fi

# 5. Instalar dependencias del frontend si no existen
print_step "Instalando dependencias del frontend..."
cd frontend
npm install

# 6. Configurar Expo para production
print_step "Configurando build para producción..."

# Crear configuración de build si no existe
if [ ! -f "eas.json" ]; then
    cat > eas.json << 'EOF'
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
EOF
    print_success "Archivo eas.json creado"
fi

# 7. Instalar EAS CLI si no está instalado
if ! command -v eas &> /dev/null; then
    print_step "Instalando EAS CLI..."
    npm install -g @expo/eas-cli
fi

# 8. Login a Expo (si no está logueado)
print_step "Verificando login de Expo..."
if ! eas whoami &> /dev/null; then
    print_warning "Necesitas hacer login en Expo. Ejecuta: eas login"
    echo "Después de hacer login, vuelve a ejecutar este script."
    exit 1
fi

# 9. Construir APK
print_step "Construyendo APK para Android..."
eas build --platform android --profile preview --non-interactive

if [ $? -eq 0 ]; then
    print_success "APK construido exitosamente"
else
    print_error "Error al construir APK"
    exit 1
fi

# 10. Obtener URL del APK
print_step "Obteniendo URL del APK..."
APK_URL=$(eas build:list --platform=android --status=finished --limit=1 --json | jq -r '.[0].artifacts.buildUrl')

if [ "$APK_URL" != "null" ] && [ -n "$APK_URL" ]; then
    print_success "APK disponible en: $APK_URL"

    # 11. Generar QR Code
    print_step "Generando código QR..."

    # Instalar qrencode si no está disponible
    if ! command -v qrencode &> /dev/null; then
        print_warning "Instalando qrencode..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install qrencode
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get install qrencode -y
        else
            print_error "No se pudo instalar qrencode automáticamente. Instálalo manualmente."
            echo "URL del APK: $APK_URL"
            exit 1
        fi
    fi

    # Generar QR
    qrencode -t PNG -o ../apk-download-qr.png -s 8 "$APK_URL"

    if [ -f "../apk-download-qr.png" ]; then
        print_success "Código QR generado: apk-download-qr.png"
        echo ""
        echo "🎉 ¡PROCESO COMPLETADO!"
        echo "📱 APK URL: $APK_URL"
        echo "🔗 QR Code: apk-download-qr.png"
        echo ""
        echo "📋 Para usar:"
        echo "1. Comparte el archivo 'apk-download-qr.png'"
        echo "2. Los usuarios escanean el QR con su cámara"
        echo "3. Se descarga automáticamente el APK"
        echo ""
        echo "🐳 Servicios Docker corriendo en:"
        echo "   Backend: http://localhost:5000"
        echo "   Frontend: http://localhost:19000"
    else
        print_error "Error generando código QR"
    fi
else
    print_error "No se pudo obtener la URL del APK"
fi

print_success "¡Deploy completado!"