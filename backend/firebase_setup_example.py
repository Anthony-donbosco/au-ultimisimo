# Ejemplo de configuración Firebase para el backend
# Este archivo muestra cómo configurar Firebase Admin SDK en tu backend

import firebase_admin
from firebase_admin import credentials, auth
from flask import request, jsonify
import os

# Configuración Firebase Admin SDK
def initialize_firebase():
    """
    Inicializa Firebase Admin SDK
    Descarga el Service Account Key desde Firebase Console > Configuración del proyecto > Cuentas de servicio
    """
    try:
        # Opción 1: Usar archivo JSON (recomendado para desarrollo)
        cred = credentials.Certificate("path/to/serviceAccountKey.json")
        
        # Opción 2: Usar variables de entorno (recomendado para producción)
        # cred = credentials.Certificate({
        #     "type": "service_account",
        #     "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        #     "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
        #     "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n'),
        #     "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        #     "client_id": os.getenv("FIREBASE_CLIENT_ID"),
        #     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        #     "token_uri": "https://oauth2.googleapis.com/token",
        #     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        #     "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
        # })
        
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK inicializado correctamente")
        return True
    except Exception as e:
        print(f"❌ Error inicializando Firebase: {e}")
        return False

# Función para verificar token Firebase
def verify_firebase_token(firebase_token):
    """
    Verifica un token de Firebase y extrae la información del usuario
    
    Args:
        firebase_token (str): Token ID de Firebase
    
    Returns:
        dict: Información del usuario si el token es válido, None si no
    """
    try:
        # Verificar el token
        decoded_token = auth.verify_id_token(firebase_token)
        
        # Extraer información del usuario
        user_info = {
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'name': decoded_token.get('name'),
            'picture': decoded_token.get('picture'),
            'email_verified': decoded_token.get('email_verified', False),
            'firebase_uid': decoded_token['uid']
        }
        
        return user_info
    except auth.InvalidIdTokenError:
        print("❌ Token Firebase inválido")
        return None
    except auth.ExpiredIdTokenError:
        print("❌ Token Firebase expirado")
        return None
    except Exception as e:
        print(f"❌ Error verificando token Firebase: {e}")
        return None

# Ejemplo de endpoint actualizado para Google Auth con Firebase
@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    """
    Endpoint para autenticación con Google usando Firebase
    Recibe firebase_token en lugar de google_token
    """
    try:
        data = request.get_json()
        
        # Obtener datos del request
        firebase_token = data.get('firebase_token')
        google_id = data.get('google_id')
        email = data.get('email')
        name = data.get('name')
        picture = data.get('picture')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        
        if not firebase_token:
            return jsonify({
                'success': False,
                'message': 'Token de Firebase requerido'
            }), 400
        
        # Verificar token de Firebase
        firebase_user = verify_firebase_token(firebase_token)
        if not firebase_user:
            return jsonify({
                'success': False,
                'message': 'Token de Firebase inválido'
            }), 401
        
        # Validar que el email coincida
        if firebase_user['email'] != email:
            return jsonify({
                'success': False,
                'message': 'Email no coincide con el token de Firebase'
            }), 400
        
        # Buscar o crear usuario en la base de datos
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Crear nuevo usuario
            user = User(
                email=email,
                username=email.split('@')[0],  # Username basado en email
                first_name=first_name or firebase_user.get('name', '').split(' ')[0],
                last_name=last_name or ' '.join(firebase_user.get('name', '').split(' ')[1:]),
                picture=picture or firebase_user.get('picture'),
                google_id=google_id,
                firebase_uid=firebase_user['uid'],
                is_verified=firebase_user.get('email_verified', False),
                is_active=True,
                registration_method='google'
            )
            
            db.session.add(user)
            db.session.commit()
            
            message = 'Usuario creado exitosamente con Google'
        else:
            # Actualizar información existente
            if not user.google_id:
                user.google_id = google_id
            if not user.firebase_uid:
                user.firebase_uid = firebase_user['uid']
            if picture and not user.picture:
                user.picture = picture
            
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            message = 'Inicio de sesión exitoso con Google'
        
        # Generar JWT token para tu aplicación
        token = generate_jwt_token(user)
        
        return jsonify({
            'success': True,
            'message': message,
            'data': {
                'user': user.to_dict(),
                'token': token,
                'token_type': 'Bearer'
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

# Modelo de usuario actualizado (ejemplo con SQLAlchemy)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    picture = db.Column(db.String(500))
    google_id = db.Column(db.String(255), unique=True)
    firebase_uid = db.Column(db.String(255), unique=True)  # Nuevo campo
    is_verified = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    registration_method = db.Column(db.String(50), default='email')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)

# Instrucciones de instalación:
# pip install firebase-admin

# Configuración de variables de entorno para producción:
# FIREBASE_PROJECT_ID=tu-proyecto-id
# FIREBASE_PRIVATE_KEY_ID=tu-private-key-id
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu-private-key\n-----END PRIVATE KEY-----\n"
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
# FIREBASE_CLIENT_ID=123456789
# FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40tu-proyecto.iam.gserviceaccount.com