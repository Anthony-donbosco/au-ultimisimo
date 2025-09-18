#!/bin/bash

echo "🚀 Configurando AU Mobile en DigitalOcean..."

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar Git
apt install git -y

# Clonar repositorio (reemplaza con tu repo)
echo "📦 Clonando repositorio..."
git clone https://github.com/TU-USUARIO/au-mobile-main.git
cd au-mobile-main

# Configurar variables de entorno
echo "🔧 Configurando variables..."
export SERVER_IP=$(curl -s http://checkip.amazonaws.com)
echo "Tu IP pública es: $SERVER_IP"

# Actualizar configuración con IP real
sed -i "s/TU-IP-PUBLICA/$SERVER_IP/g" frontend/.env.production
sed -i "s/TU-IP-PUBLICA/$SERVER_IP/g" frontend/src/config/api.ts

# Abrir puertos del firewall
ufw allow 5000
ufw allow 3306
ufw allow 19000
ufw --force enable

# Levantar servicios
echo "🐳 Levantando servicios Docker..."
docker-compose up -d --build

# Verificar estado
echo "✅ Verificando servicios..."
sleep 30
docker-compose ps

echo ""
echo "🎉 ¡Setup completado!"
echo "📱 Tu backend está en: http://$SERVER_IP:5000"
echo "🔗 Para construir el APK usa esta IP: $SERVER_IP"
echo ""
echo "📋 Siguiente paso:"
echo "   1. Ve a tu frontend local"
echo "   2. Actualiza PROD_API_URL a: http://$SERVER_IP:5000"
echo "   3. Ejecuta: eas build --platform android --profile preview"