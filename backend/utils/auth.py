import bcrypt
import jwt
import re
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
import secrets
import logging
from config import Config

logger = logging.getLogger(__name__)

class AuthUtils:
    """Utilidades para autenticación y seguridad"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Generar hash de contraseña usando bcrypt"""
        try:
            # Generar salt y hash
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
            return password_hash.decode('utf-8')
        except Exception as e:
            logger.error(f"Error hasheando contraseña: {e}")
            raise
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verificar contraseña contra su hash"""
        try:
            return bcrypt.checkpw(
                password.encode('utf-8'), 
                password_hash.encode('utf-8')
            )
        except Exception as e:
            logger.error(f"Error verificando contraseña: {e}")
            return False
    
    @staticmethod
    def generate_jwt_token(user_data: dict) -> str:
        """Generar token JWT para usuario"""
        try:
            # Determinar tiempo de expiración basado en el rol
            user_role = user_data.get('id_rol', 4)
            if user_role == 1:  # Administrador
                # Mismo tiempo de expiración que usuarios normales
                expiration_time = Config.JWT_ACCESS_TOKEN_EXPIRES
            else:
                # Usuarios normales, empresas, empleados
                expiration_time = Config.JWT_ACCESS_TOKEN_EXPIRES

            payload = {
                'user_id': user_data['id'],
                'username': user_data['username'],
                'email': user_data['email'],
                'id_rol': user_data.get('id_rol', 4),  # Incluir el rol del usuario (default: 4 para usuario normal)
                'exp': datetime.utcnow() + expiration_time,
                'iat': datetime.utcnow(),
                'jti': secrets.token_hex(16)  # JWT ID único
            }
            
            token = jwt.encode(
                payload,
                Config.JWT_SECRET_KEY,
                algorithm=Config.JWT_ALGORITHM
            )
            return token
        except Exception as e:
            logger.error(f"Error generando JWT token: {e}")
            raise
    
    @staticmethod
    def decode_jwt_token(token: str) -> dict:
        """Decodificar y validar token JWT"""
        try:
            payload = jwt.decode(
                token,
                Config.JWT_SECRET_KEY,
                algorithms=[Config.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token expirado")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Token inválido: {str(e)}")
        except Exception as e:
            logger.error(f"Error decodificando JWT: {e}")
            raise ValueError("Error procesando token")
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generar token seguro aleatorio"""
        return secrets.token_urlsafe(length)

class ValidationUtils:
    """Utilidades para validación de datos"""
    
    @staticmethod
    def validate_email(email: str) -> tuple[bool, str]:
        """Validar formato de email"""
        if not email:
            return False, "Email es requerido"
        
        email = email.strip().lower()
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(pattern, email):
            return False, "Formato de email inválido"
        
        if len(email) > 100:
            return False, "Email demasiado largo (máximo 100 caracteres)"
        
        return True, ""
    
    @staticmethod
    def validate_password(password: str) -> tuple[bool, str]:
        """Validar contraseña según criterios de seguridad"""
        if not password:
            return False, "Contraseña es requerida"
        
        if len(password) < Config.PASSWORD_MIN_LENGTH:
            return False, f"Contraseña debe tener al menos {Config.PASSWORD_MIN_LENGTH} caracteres"
        
        if len(password) > Config.PASSWORD_MAX_LENGTH:
            return False, f"Contraseña demasiado larga (máximo {Config.PASSWORD_MAX_LENGTH} caracteres)"
        
        # Verificar que tenga al menos una letra y un número
        if not re.search(r'[a-zA-Z]', password):
            return False, "Contraseña debe contener al menos una letra"
        
        if not re.search(r'[0-9]', password):
            return False, "Contraseña debe contener al menos un número"
        
        return True, ""
    
    @staticmethod
    def validate_username(username: str) -> tuple[bool, str]:
        """Validar nombre de usuario"""
        if not username:
            return False, "Nombre de usuario es requerido"
        
        username = username.strip()
        
        if len(username) < Config.USERNAME_MIN_LENGTH:
            return False, f"Nombre de usuario debe tener al menos {Config.USERNAME_MIN_LENGTH} caracteres"
        
        if len(username) > Config.USERNAME_MAX_LENGTH:
            return False, f"Nombre de usuario demasiado largo (máximo {Config.USERNAME_MAX_LENGTH} caracteres)"
        
        # Solo permitir letras, números y guiones bajos
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return False, "Nombre de usuario solo puede contener letras, números y guiones bajos"
        
        return True, ""
    
    @staticmethod
    def validate_name(name: str, field_name: str = "Nombre") -> tuple[bool, str]:
        """Validar nombres (first_name, last_name)"""
        if not name:
            return True, ""  # Los nombres son opcionales
        
        name = name.strip()
        
        if len(name) > 50:
            return False, f"{field_name} demasiado largo (máximo 50 caracteres)"
        
        # Solo permitir letras y espacios
        if not re.match(r'^[a-zA-ZÀ-ÿ\s]+$', name):
            return False, f"{field_name} solo puede contener letras y espacios"
        
        return True, ""

def token_required(f):
    """Decorador para rutas que requieren autenticación JWT con logging de seguridad"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import request
        
        token = None
        auth_header = request.headers.get('Authorization')
        client_ip = request.remote_addr or "unknown"
        
        # Buscar token en header Authorization
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # "Bearer TOKEN"
            except IndexError:
                # NUEVO: Log intento de autenticación con formato inválido
                try:
                    from utils.security import security_event_logger
                    security_event_logger.log_invalid_token(client_ip, "invalid_bearer_format")
                except ImportError:
                    pass
                
                return jsonify({
                    'success': False,
                    'message': 'Formato de token inválido. Use: Bearer <token>'
                }), 401
        
        if not token:
            # NUEVO: Log intento de acceso sin token
            try:
                from utils.security import security_event_logger
                security_event_logger.log_invalid_token(client_ip, "missing_token")
            except ImportError:
                pass
            
            return jsonify({
                'success': False,
                'message': 'Token de acceso requerido'
            }), 401
        
        try:
            # Decodificar token
            payload = AuthUtils.decode_jwt_token(token)
            current_user = payload
            
        except ValueError as e:
            # NUEVO: Log token inválido con detalles
            try:
                from utils.security import security_event_logger
                security_event_logger.log_invalid_token(client_ip, str(e))
            except ImportError:
                pass
            
            return jsonify({
                'success': False,
                'message': str(e)
            }), 401
        except Exception as e:
            logger.error(f"Error en token_required: {e}")
            
            # NUEVO: Log error inesperado en token
            try:
                from utils.security import security_event_logger
                security_event_logger.log_invalid_token(client_ip, f"unexpected_error: {str(e)}")
            except ImportError:
                pass
            
            return jsonify({
                'success': False,
                'message': 'Error procesando token'
            }), 401
        
        # Pasar datos del usuario a la función
        return f(current_user, *args, **kwargs)
    
    return decorated_function

def get_token_from_request():
    """Extraer token JWT de la request actual"""
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            return auth_header.split(' ')[1]
        except IndexError:
            return None
    return None

def create_response(success: bool, message: str, data: dict = None, status_code: int = 200):
    """Crear respuesta estandarizada"""
    response = {
        'success': success,
        'message': message
    }
    
    if data:
        response['data'] = data
    
    return jsonify(response), status_code

# Funciones de conveniencia
auth_utils = AuthUtils()
validation_utils = ValidationUtils()

def hash_password(password: str) -> str:
    """Función de conveniencia para hash de contraseña"""
    return auth_utils.hash_password(password)

def verify_password(password: str, password_hash: str) -> bool:
    """Función de conveniencia para verificar contraseña"""
    return auth_utils.verify_password(password, password_hash)

def generate_jwt_token(user_data: dict) -> str:
    """Función de conveniencia para generar JWT"""
    return auth_utils.generate_jwt_token(user_data)

def decode_jwt_token(token: str) -> dict:
    """Función de conveniencia para decodificar JWT"""
    return auth_utils.decode_jwt_token(token)