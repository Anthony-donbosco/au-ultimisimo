# 🚀 AU Mobile App - Guía de Deployment

## Requisitos Previos

### Instalaciones Necesarias
- **Docker Desktop**: https://www.docker.com/products/docker-desktop
- **Node.js** (v18+): https://nodejs.org/
- **Git**: https://git-scm.com/

### Cuentas Necesarias
- **Cuenta Expo**: https://expo.dev/signup

---

## 🐳 Deployment con Docker

### Paso 1: Clonar y Preparar
```bash
git clone <tu-repositorio>
cd au-mobile-main
```

### Paso 2: Ejecutar Deployment Automático

**En Windows:**
```batch
deploy.bat
```

**En Linux/Mac:**
```bash
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

### Paso 3: Login en Expo
```bash
cd frontend
eas login
```

### Paso 4: Construir APK
```bash
eas build --platform android --profile preview
```

---

## 📱 Distribución del APK

### Método 1: QR Code Automático
El script genera automáticamente un QR code con la URL de descarga del APK.

### Método 2: URL Directa
Obtén la URL del APK con:
```bash
eas build:list --platform=android --status=finished --limit=1
```

### Método 3: Descarga Local
```bash
eas build:download --platform=android --latest
```

---

## 🔧 Configuración de Servicios

### Backend API
- **Puerto**: 5000
- **Health Check**: http://localhost:5000/api/health
- **Base de datos**: MySQL en puerto 3306

### Frontend Development
- **Puerto**: 19000 (Expo DevTools)
- **Metro Bundler**: 19001
- **Tunnel**: 19002

---

## 📋 Comandos Útiles

### Docker
```bash
# Ver logs del backend
docker logs au-mobile-backend

# Ver logs de la base de datos
docker logs au-mobile-mysql

# Parar todos los servicios
docker-compose down

# Reconstruir servicios
docker-compose up -d --build
```

### Expo/EAS
```bash
# Ver builds
eas build:list

# Ver información de la cuenta
eas whoami

# Cancelar build
eas build:cancel

# Ver configuración
eas config
```

---

## 🐛 Troubleshooting

### Error: Docker no encontrado
- Instala Docker Desktop
- Reinicia tu terminal/CMD

### Error: Build de Expo falla
- Verifica que estés logueado: `eas whoami`
- Revisa configuración en `eas.json`
- Intenta con: `eas build --clear-cache`

### Error: Backend no responde
- Verifica que Docker esté corriendo
- Revisa logs: `docker logs au-mobile-backend`
- Verifica variables de entorno en `.env.docker`

### Error: Base de datos no conecta
- Espera más tiempo para que MySQL inicie
- Verifica que el puerto 3306 esté libre
- Revisa logs: `docker logs au-mobile-mysql`

---

## 🔐 Seguridad en Producción

### Variables de Entorno a Cambiar
- `JWT_SECRET_KEY`: Genera una clave secreta fuerte
- `MYSQL_ROOT_PASSWORD`: Cambia la contraseña por defecto
- `DB_PASSWORD`: Usa una contraseña segura

### Configuración de Red
- Cierra puertos innecesarios
- Usa HTTPS en producción
- Configura firewall adecuadamente

---

## 📊 Monitoreo

### Verificar Estado de Servicios
```bash
docker-compose ps
```

### Ver Uso de Recursos
```bash
docker stats
```

### Backup de Base de Datos
```bash
docker exec au-mobile-mysql mysqldump -u root -p mi_app_db > backup.sql
```

---

## 🎯 URLs de Producción

Una vez desplegado, tu aplicación estará disponible en:

- **API Backend**: `http://tu-servidor:5000`
- **APK Download**: Generado automáticamente por Expo
- **Admin Panel**: `http://tu-servidor:5000/admin` (si está implementado)

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de Docker
2. Verifica las variables de entorno
3. Consulta la documentación de Expo: https://docs.expo.dev/
4. Revisa issues en GitHub del proyecto