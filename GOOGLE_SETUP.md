# 🔐 Configuración de Google Sign-In para Aureum

## Resumen
✅ El botón de Google Sign-In ahora es **completamente funcional**. Sigue estos pasos para configurarlo:

## 📋 Pasos para configurar Google OAuth

### 1. Crear proyecto en Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google+ API** y **Google Sign-In API**

### 2. Configurar OAuth 2.0
1. Ve a **Credenciales** > **Crear credenciales** > **ID de cliente OAuth 2.0**
2. Selecciona **Aplicación web** como tipo de aplicación
3. En **URIs de redireccionamiento autorizados**, agrega:
   ```
   https://auth.expo.io/@thealexos/aureum-mobile
   ```
4. Guarda el **Client ID** generado

### 3. Configurar variables de entorno

Edita el archivo `frontend/.env` y agrega:
```env
# Reemplaza con tu Google Client ID real
EXPO_PUBLIC_GOOGLE_CLIENT_ID=tu-google-client-id-aqui.apps.googleusercontent.com
```

### 4. Actualizar base de datos

Ejecuta estos comandos SQL para agregar soporte a Google ID:

```sql
-- Agregar columnas faltantes a la tabla users
ALTER TABLE users 
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN profile_picture VARCHAR(500),
ADD COLUMN google_id VARCHAR(100),
ADD UNIQUE KEY uk_google_id (google_id),
ADD INDEX idx_google_id (google_id);

-- Hacer password_hash opcional (para usuarios de Google)
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255);
```

## 🚀 Funcionalidades implementadas

### Frontend
- ✅ Servicio de Google Auth (`googleAuthService.ts`)
- ✅ Pantallas de login y registro actualizadas
- ✅ Manejo de estados de carga
- ✅ Integración con AuthSession de Expo
- ✅ Validaciones y mensajes de error

### Backend
- ✅ Endpoint `/api/auth/google-auth`
- ✅ Modelo de usuario actualizado con Google ID
- ✅ Base de datos compatible con usuarios de Google
- ✅ Creación automática de cuentas
- ✅ Login automático para usuarios existentes

## 🔧 Características técnicas

### Seguridad
- PKCE (Proof Key for Code Exchange) habilitado
- Tokens JWT estándar
- Verificación de Google tokens
- Usuarios de Google pre-verificados

### Flujo de autenticación
1. Usuario presiona botón "Iniciar sesión con Google"
2. Se abre navegador con pantalla de Google
3. Usuario autoriza la aplicación
4. Google devuelve código de autorización
5. Frontend intercambia código por tokens
6. Frontend obtiene información del usuario de Google
7. Backend crea/autentica usuario con datos de Google
8. Usuario queda logueado en la aplicación

## 📱 Uso

### En Login
- Botón "Iniciar sesión con Google"
- Login automático si ya tienes cuenta
- Creación automática de cuenta si es nuevo usuario

### En Registro
- Botón "Registrarse con Google" 
- Misma funcionalidad que login
- Usuarios de Google omiten verificación de email

## 🎯 Estado actual
- ✅ **Implementación completa**
- ⚠️ **Requiere configuración de Google Client ID**
- ✅ **Compatible con flujo de registro existente**
- ✅ **Interfaz responsive**

## 🛠️ Comandos para probar

1. **Actualizar dependencias:**
   ```bash
   cd frontend && npm install
   ```

2. **Configurar Google Client ID:**
   ```bash
   # Editar frontend/.env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id-real
   ```

3. **Actualizar base de datos:**
   ```bash
   # Ejecutar las queries SQL mencionadas arriba
   ```

4. **Iniciar aplicación:**
   ```bash
   cd frontend && npm run start
   ```

## 📧 Soporte
Si tienes problemas:
1. Verifica que el Google Client ID esté configurado correctamente
2. Asegúrate de que las columnas de la BD estén creadas
3. Revisa los logs de la consola para errores específicos

¡Google Sign-In está listo para usar! 🎉