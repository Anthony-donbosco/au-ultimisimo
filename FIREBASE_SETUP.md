# Configuración de Firebase para Autenticación con Google

Este documento te guía paso a paso para configurar Firebase y reemplazar la autenticación OAuth 2 por Firebase Authentication.

## 1. Crear proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear proyecto" o "Add project"
3. Ingresa el nombre de tu proyecto (ej: "aureum-mobile")
4. Acepta los términos y crea el proyecto

## 2. Habilitar Authentication

1. En el dashboard de tu proyecto, ve a "Authentication"
2. Haz clic en "Get started"
3. Ve a la pestaña "Sign-in method"
4. Habilita "Google" como proveedor de autenticación
5. Configura el nombre del proyecto y email de soporte

## 3. Configurar la aplicación

### Para Android:
1. En la configuración del proyecto, haz clic en "Add app" > Android
2. Ingresa el package name: `com.aureum.mobile`
3. Descarga el archivo `google-services.json`
4. Coloca el archivo en `frontend/android/app/google-services.json`

### Para iOS:
1. En la configuración del proyecto, haz clic en "Add app" > iOS
2. Ingresa el bundle ID: `com.aureum.mobile`
3. Descarga el archivo `GoogleService-Info.plist`
4. Coloca el archivo en `frontend/ios/` (si tienes carpeta iOS)

### Para Web:
1. En la configuración del proyecto, haz clic en "Add app" > Web
2. Registra tu app web
3. Copia la configuración de Firebase

## 4. Actualizar variables de entorno

Edita el archivo `frontend/.env` y reemplaza los valores con los de tu proyecto Firebase:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=tu-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=tu-firebase-app-id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=tu-measurement-id

# Google Sign-In Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=tu-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=tu-ios-client-id.apps.googleusercontent.com
```

### Dónde encontrar estos valores:

1. **Firebase Config**: En Firebase Console > Configuración del proyecto > Configuración general > Tus apps > Configuración del SDK
2. **Google Web Client ID**: En Google Cloud Console > Credenciales > Client ID de OAuth 2.0 (tipo Web)
3. **Google iOS Client ID**: En Google Cloud Console > Credenciales > Client ID de OAuth 2.0 (tipo iOS)

## 5. Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto Firebase
3. Ve a "APIs & Services" > "Credentials"
4. Asegúrate de tener:
   - OAuth 2.0 Client ID para Web
   - OAuth 2.0 Client ID para Android (si es necesario)
   - OAuth 2.0 Client ID para iOS (si es necesario)

## 6. Actualizar el backend

Modifica el backend para verificar tokens de Firebase en lugar de tokens de Google directamente:

```python
import firebase_admin
from firebase_admin import credentials, auth

# Inicializar Firebase Admin SDK
cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# En tu endpoint de autenticación Google
@app.route('/auth/google', methods=['POST'])
def google_auth():
    try:
        firebase_token = request.json.get('firebase_token')
        
        # Verificar token de Firebase
        decoded_token = auth.verify_id_token(firebase_token)
        user_email = decoded_token['email']
        
        # Resto de tu lógica de autenticación...
        
    except Exception as e:
        return {"success": False, "message": str(e)}
```

## 7. Instalar dependencias adicionales para el backend

```bash
pip install firebase-admin
```

## 8. Probar la implementación

1. Limpia la caché: `npx expo start -c`
2. Ejecuta la aplicación
3. Prueba el botón "Continuar con Google"
4. Verifica que los logs muestren la autenticación exitosa

## Troubleshooting

### Error: "Google Sign-In no está disponible"
- Verifica que Google Play Services esté instalado en el dispositivo/emulador
- Asegúrate que las configuraciones en `.env` sean correctas

### Error: "Web Client ID not configured"
- Verifica que `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` esté configurado correctamente
- El Web Client ID debe ser diferente del Android/iOS Client ID

### Error en Firebase: "Firebase not configured"
- Verifica que todos los valores de Firebase en `.env` estén configurados
- Revisa que no haya typos en los nombres de las variables de entorno

### Error: "Token verification failed"
- Asegúrate que el backend esté usando Firebase Admin SDK
- Verifica que el Service Account Key esté configurado correctamente en el backend

## Notas importantes

- Los archivos `google-services.json` y `GoogleService-Info.plist` contienen información sensible
- Nunca subas estos archivos a repositorios públicos
- Agrega estos archivos a tu `.gitignore`
- Para producción, usa variables de entorno seguras

## Diferencias con la implementación anterior

- **Antes**: Expo AuthSession con OAuth 2 directo
- **Ahora**: Firebase Authentication con Google Sign-In
- **Ventajas**: Mejor seguridad, más fácil manejo de tokens, integración nativa mejor
- **Backend**: Ahora recibe `firebase_token` en lugar de `google_token`