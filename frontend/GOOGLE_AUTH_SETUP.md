# Configuración de Google Authentication

## Problema Común
El error con Google Auth ocurre porque cada desarrollador necesita su propia configuración de Firebase y Google Console.

## Pasos para tu compañero:

### 1. Crear proyecto en Firebase Console
1. Ve a https://console.firebase.google.com/
2. Crea un nuevo proyecto o usa uno existente
3. Habilita Authentication > Sign-in method > Google

### 2. Configurar Android en Firebase
1. En la configuración del proyecto, agrega una app Android
2. Package name: `com.aureumlogi.miappfinanciera` (o el que uses)
3. Descargar `google-services.json` y ponerlo en `android/app/`

### 3. Obtener SHA-1 Fingerprint
Ejecuta este comando en la terminal desde la carpeta del proyecto:

```bash
cd android
./gradlew signingReport
```

Busca el SHA1 para `debug` y cópialo. Agrégalo en Firebase Console > Project Settings > Your apps > Android app > SHA certificate fingerprints.

### 4. Configurar variables de entorno
Crear/editar archivo `.env` con tus valores de Firebase:

```env
# Tu configuración de API
API_URL=http://TU_IP:5000
EXPO_PUBLIC_API_URL=http://TU_IP:5000

# Firebase Configuration (reemplazar con los valores de TU proyecto)
EXPO_PUBLIC_FIREBASE_API_KEY=tu-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=tu-app-id

# Google Sign-In (obtener del Firebase Console)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=tu-web-client-id
```

### 5. Instalar dependencias
```bash
npm install
cd android && ./gradlew clean
cd .. && npm run android
```

### 6. Verificar configuración del backend
El backend debe tener configurado Firebase Admin SDK con el mismo proyecto.

## Comandos de ayuda:

### Ver SHA-1 actual:
```bash
cd android && ./gradlew signingReport | grep SHA1
```

### Limpiar y reconstruir:
```bash
cd android && ./gradlew clean && cd .. && npm run android
```

### Ver logs de error:
```bash
npx react-native log-android
```

## Errores comunes:
- `DEVELOPER_ERROR`: SHA-1 no configurado correctamente
- `SIGN_IN_CANCELLED`: Usuario canceló (normal)
- `API not enabled`: Habilitar Google Sign-In API en Google Cloud Console
- `Invalid client`: Web Client ID incorrecto

## Verificación final:
1. Firebase project configurado ✓
2. google-services.json en android/app/ ✓
3. SHA-1 agregado en Firebase ✓
4. Variables .env correctas ✓
5. Google Sign-In habilitado en Firebase Auth ✓