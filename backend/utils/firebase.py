import firebase_admin
from firebase_admin import credentials, auth
import os
import logging

logger = logging.getLogger(__name__)

# Variable global para controlar la inicialización
_firebase_initialized = False

def initialize_firebase():
    """Inicializa Firebase Admin SDK"""
    global _firebase_initialized
    
    if _firebase_initialized:
        return True
        
    try:
        # Ruta al archivo de credenciales
        service_account_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'firebase-service-account.json')
        
        if not os.path.exists(service_account_path):
            logger.error(f"Archivo de credenciales no encontrado: {service_account_path}")
            return False
        
        # Inicializar Firebase Admin SDK
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        
        _firebase_initialized = True
        logger.info("✅ Firebase Admin SDK inicializado correctamente")
        return True
        
    except ValueError as e:
        if "already exists" in str(e):
            _firebase_initialized = True
            logger.info("✅ Firebase Admin SDK ya estaba inicializado")
            return True
        logger.error(f"❌ Error inicializando Firebase: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Error inicializando Firebase: {e}")
        return False

def verify_firebase_token(firebase_token):
    """
    Verifica un token de Firebase y extrae la información del usuario
    
    Args:
        firebase_token (str): Token ID de Firebase
    
    Returns:
        dict: Información del usuario si el token es válido, None si no
    """
    try:
        # Asegurar que Firebase esté inicializado
        if not initialize_firebase():
            logger.error("Firebase no inicializado")
            return None
            
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
        
        logger.info(f"✅ Token Firebase verificado para: {user_info['email']}")
        return user_info
        
    except auth.InvalidIdTokenError:
        logger.warning("❌ Token Firebase inválido")
        return None
    except auth.ExpiredIdTokenError:
        logger.warning("❌ Token Firebase expirado")
        return None
    except Exception as e:
        logger.error(f"❌ Error verificando token Firebase: {e}")
        return None

def get_firebase_user(uid):
    """
    Obtiene información de un usuario de Firebase por su UID
    
    Args:
        uid (str): UID del usuario en Firebase
    
    Returns:
        dict: Información del usuario si existe, None si no
    """
    try:
        if not initialize_firebase():
            return None
            
        user_record = auth.get_user(uid)
        
        user_info = {
            'uid': user_record.uid,
            'email': user_record.email,
            'email_verified': user_record.email_verified,
            'display_name': user_record.display_name,
            'photo_url': user_record.photo_url,
            'disabled': user_record.disabled,
            'creation_timestamp': user_record.user_metadata.creation_timestamp,
            'last_sign_in_timestamp': user_record.user_metadata.last_sign_in_timestamp
        }
        
        return user_info
        
    except auth.UserNotFoundError:
        logger.warning(f"Usuario no encontrado en Firebase: {uid}")
        return None
    except Exception as e:
        logger.error(f"Error obteniendo usuario de Firebase: {e}")
        return None