from flask import Blueprint, request, jsonify
import logging
from datetime import datetime
from models.user import User
from utils.auth import token_required, create_response, decode_jwt_token, get_token_from_request
from utils.email import send_verification_code
from utils.verification import VerificationTokenManager

# Configurar logging
logger = logging.getLogger(__name__)

# Crear blueprint para rutas de autenticación
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    """Endpoint para iniciar proceso de registro (envía código por email)"""
    try:
        # Obtener datos del request
        data = request.get_json()
        
        if not data:
            logger.warning("Request sin datos JSON")
            return create_response(
                False, 
                "No se proporcionaron datos", 
                status_code=400
            )
        
        # Extraer campos requeridos
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        first_name = data.get('first_name', '').strip() if data.get('first_name') else None
        last_name = data.get('last_name', '').strip() if data.get('last_name') else None
        
        logger.info(f"📝 Intento de registro - Username: {username}, Email: {email}")
        
        # Validar campos requeridos
        if not username or not email or not password:
            logger.warning(f"Campos faltantes - Username: {bool(username)}, Email: {bool(email)}, Password: {bool(password)}")
            return create_response(
                False,
                "Username, email y password son requeridos",
                status_code=400
            )
        
        # Validar datos usando las validaciones del modelo User
        is_valid, error_msg = User.validate_user_data(
            username, email, password, first_name, last_name
        )
        if not is_valid:
            logger.warning(f"Datos inválidos: {error_msg}")
            return create_response(False, error_msg, status_code=400)
        
        # Verificar que no exista usuario con mismo email o username
        if User.find_by_email(email):
            logger.warning(f"Email ya existe: {email}")
            return create_response(False, "Ya existe un usuario con este email", status_code=400)
        
        if User.find_by_username(username):
            logger.warning(f"Username ya existe: {username}")
            return create_response(False, "Ya existe un usuario con este nombre de usuario", status_code=400)
        
        # RATE LIMITING: Verificar límites de solicitudes
        recent_requests = VerificationTokenManager.get_recent_token_requests(email, minutes=15)
        if recent_requests >= 3:
            logger.warning(f"Rate limit excedido para {email}: {recent_requests} requests en 15 min")
            return create_response(
                False,
                "Demasiadas solicitudes de código. Espera 15 minutos antes de intentar nuevamente.",
                status_code=429
            )
        
        # COOLDOWN: Verificar tiempo entre solicitudes (60 segundos)
        last_token_time = VerificationTokenManager.get_last_token_time(email)
        if last_token_time:
            time_since_last = datetime.now() - last_token_time
            if time_since_last.total_seconds() < 60:
                remaining_seconds = 60 - int(time_since_last.total_seconds())
                logger.info(f"Cooldown activo para {email}: {remaining_seconds}s restantes")
                return create_response(
                    False,
                    f"Debes esperar {remaining_seconds} segundos antes de solicitar otro código.",
                    status_code=429
                )
        
        # Enviar código de verificación por email
        success, message, verification_code = send_verification_code(email, username)
        
        if not success:
            logger.error(f"Error enviando código a {email}: {message}")
            return create_response(
                False,
                "Error enviando código de verificación. Inténtalo más tarde.",
                status_code=500
            )
        
        # Guardar token en base de datos
        token_saved = VerificationTokenManager.create_verification_token(email, verification_code)
        
        if not token_saved:
            logger.error(f"Error guardando token para {email}")
            return create_response(
                False,
                "Error interno procesando verificación",
                status_code=500
            )
        
        logger.info(f"✅ Código de verificación enviado a {email}")
        
        # Respuesta exitosa (sin incluir el código por seguridad)
        response_data = {
            'email': email,
            'message': f"Código de verificación enviado a {email}",
            'next_step': 'verify_email'
        }
        
        return create_response(
            True,
            f"Código de verificación enviado a {email}. Revisa tu bandeja de entrada.",
            response_data,
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error interno en registro: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Endpoint para verificar código y completar registro"""
    try:
        # Obtener datos del request
        data = request.get_json()
        
        if not data:
            logger.warning("Request de verificación sin datos JSON")
            return create_response(
                False,
                "No se proporcionaron datos",
                status_code=400
            )
        
        # Extraer campos requeridos
        email = data.get('email', '').strip().lower()
        verification_code = data.get('code', '').strip()
        
        # También necesitamos los datos del usuario para crear la cuenta
        username = data.get('username', '').strip()
        password = data.get('password', '')
        first_name = data.get('first_name', '').strip() if data.get('first_name') else None
        last_name = data.get('last_name', '').strip() if data.get('last_name') else None
        
        logger.info(f"🔍 Verificando código para email: {email}")
        
        # Validar campos requeridos
        if not email or not verification_code:
            return create_response(
                False,
                "Email y código de verificación son requeridos",
                status_code=400
            )
        
        if not username or not password:
            return create_response(
                False,
                "Datos de usuario incompletos para completar registro",
                status_code=400
            )
        
        # Verificar código
        is_valid, message = VerificationTokenManager.verify_token(email, verification_code)
        
        if not is_valid:
            logger.warning(f"Código inválido para {email}: {message}")
            return create_response(False, message, status_code=400)
        
        # Código válido - crear usuario
        success, create_message, user = User.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        if not success:
            logger.error(f"Error creando usuario después de verificación: {create_message}")
            return create_response(False, create_message, status_code=500)
        
        # Marcar usuario como verificado
        user.verify_email()
        
        # Generar token JWT
        try:
            token = user.generate_auth_token()
            logger.info(f"✅ Usuario verificado y registrado exitosamente: {username}")
        except Exception as e:
            logger.error(f"Error generando token para {username}: {e}")
            return create_response(
                False,
                "Usuario creado pero error generando token de acceso",
                status_code=500
            )
        
        # Respuesta exitosa
        response_data = {
            'user': user.to_dict(),
            'token': token,
            'token_type': 'Bearer'
        }
        
        return create_response(
            True,
            f"¡Bienvenido {user.get_full_name() or user.username}! Tu cuenta ha sido creada exitosamente.",
            response_data,
            status_code=201
        )
    
    except Exception as e:
        logger.error(f"💥 Error interno en verificación: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Endpoint para reenviar código de verificación"""
    try:
        data = request.get_json()
        
        if not data:
            return create_response(
                False,
                "No se proporcionaron datos",
                status_code=400
            )
        
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()  # Opcional para el email
        
        logger.info(f"🔄 Reenvío de código solicitado para: {email}")
        
        if not email:
            return create_response(
                False,
                "Email es requerido",
                status_code=400
            )
        
        # Verificar que no exista usuario con este email
        if User.find_by_email(email):
            return create_response(
                False,
                "Ya existe una cuenta con este email",
                status_code=400
            )
        
        # Limpiar tokens expirados antes de verificar
        VerificationTokenManager.cleanup_expired_tokens_for_email(email)
        
        # Verificar si ya tiene un token válido
        if VerificationTokenManager.has_valid_token(email):
            return create_response(
                False,
                "Ya tienes un código válido. Espera a que expire antes de solicitar uno nuevo.",
                status_code=429
            )
        
        # Enviar nuevo código
        success, message, verification_code = send_verification_code(email, username)
        
        if not success:
            logger.error(f"Error reenviando código a {email}: {message}")
            return create_response(
                False,
                "Error enviando código de verificación",
                status_code=500
            )
        
        # Guardar nuevo token
        token_saved = VerificationTokenManager.create_verification_token(email, verification_code)
        
        if not token_saved:
            logger.error(f"Error guardando token de reenvío para {email}")
            return create_response(
                False,
                "Error interno procesando reenvío",
                status_code=500
            )
        
        logger.info(f"✅ Código reenviado a {email}")
        
        return create_response(
            True,
            f"Código de verificación reenviado a {email}",
            {'email': email},
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error en reenvío: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/login', methods=['POST'])
def login():
    """Endpoint para iniciar sesión"""
    try:
        # Obtener datos del request
        data = request.get_json()
        
        if not data:
            logger.warning("Login request sin datos JSON")
            return create_response(
                False,
                "No se proporcionaron datos",
                status_code=400
            )
        
        # MEJORADO: Extraer credenciales (más flexible para el frontend)
        # El frontend puede enviar 'login', 'email', 'username', o 'password'
        login_field = (
            data.get('login') or 
            data.get('email') or 
            data.get('username') or 
            ''
        ).strip()
        
        password = data.get('password', '')
        
        logger.info(f"🔐 Intento de login - Login field: {login_field}")
        
        # Validar campos requeridos
        if not login_field or not password:
            logger.warning(f"Credenciales incompletas - Login: {bool(login_field)}, Password: {bool(password)}")
            return create_response(
                False,
                "Email/username y password son requeridos",
                status_code=400
            )
        
        # Autenticar usuario
        success, message, user = User.authenticate(login_field, password)
        
        if not success:
            logger.warning(f"❌ Autenticación fallida para {login_field}: {message}")
            return create_response(False, message, status_code=401)
        
        # Generar token JWT
        try:
            token = user.generate_auth_token()
            logger.info(f"✅ Login exitoso: {user.username}")
        except Exception as e:
            logger.error(f"Error generando token para {user.username}: {e}")
            return create_response(
                False,
                "Error generando token de acceso",
                status_code=500
            )
        
        # Respuesta exitosa
        response_data = {
            'user': user.to_dict(),
            'token': token,
            'token_type': 'Bearer'
        }
        
        return create_response(
            True,
            f"Bienvenido, {user.get_full_name() or user.username}!",
            response_data,
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error interno en login: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Endpoint para obtener información del usuario actual"""
    try:
        user_id = current_user.get('user_id')
        logger.info(f"👤 Solicitando perfil del usuario ID: {user_id}")
        
        # Buscar usuario actualizado en la base de datos
        user = User.find_by_id(user_id)
        
        if not user:
            logger.warning(f"Usuario no encontrado: ID {user_id}")
            return create_response(
                False,
                "Usuario no encontrado",
                status_code=404
            )
        
        if not user.is_active:
            logger.warning(f"Cuenta desactivada: {user.username}")
            return create_response(
                False,
                "Cuenta desactivada",
                status_code=403
            )
        
        logger.info(f"✅ Perfil obtenido: {user.username}")
        return create_response(
            True,
            "Información del usuario obtenida exitosamente",
            {'user': user.to_dict()},
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error obteniendo usuario actual: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/refresh', methods=['POST'])
@token_required
def refresh_token(current_user):
    """Endpoint para renovar token JWT"""
    try:
        user_id = current_user.get('user_id')
        logger.info(f"🔄 Renovando token para usuario ID: {user_id}")
        
        # Buscar usuario actualizado
        user = User.find_by_id(user_id)
        
        if not user or not user.is_active:
            logger.warning(f"Usuario no válido para renovar token: {user_id}")
            return create_response(
                False,
                "Usuario no válido para renovar token",
                status_code=401
            )
        
        # Generar nuevo token
        new_token = user.generate_auth_token()
        
        response_data = {
            'token': new_token,
            'token_type': 'Bearer',
            'user': user.to_dict()
        }
        
        logger.info(f"✅ Token renovado: {user.username}")
        return create_response(
            True,
            "Token renovado exitosamente",
            response_data,
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error renovando token: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """Endpoint para cerrar sesión (logout)"""
    try:
        username = current_user.get('username', 'Unknown')
        logger.info(f"🚪 Logout de usuario: {username}")
        
        # En una implementación más avanzada, aquí se podría:
        # 1. Agregar el token a una blacklist
        # 2. Invalidar refresh tokens
        # 3. Limpiar sesiones en caché
        
        logger.info(f"✅ Logout completado: {username}")
        return create_response(
            True,
            "Sesión cerrada exitosamente",
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error en logout: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/validate-token', methods=['POST'])
def validate_token():
    """Endpoint para validar si un token JWT es válido"""
    try:
        # Obtener token del header o body
        token = get_token_from_request()
        
        if not token:
            # Intentar obtener del body
            data = request.get_json()
            token = data.get('token') if data else None
        
        if not token:
            logger.warning("Token no proporcionado para validación")
            return create_response(
                False,
                "Token no proporcionado",
                status_code=400
            )
        
        # Decodificar token
        try:
            payload = decode_jwt_token(token)
            user_id = payload.get('user_id')
            logger.info(f"🔍 Validando token para usuario ID: {user_id}")
        except ValueError as e:
            logger.warning(f"Token inválido: {e}")
            return create_response(
                False,
                str(e),
                status_code=401
            )
        
        # Verificar que el usuario exista y esté activo
        user = User.find_by_id(payload['user_id'])
        if not user or not user.is_active:
            logger.warning(f"Usuario asociado al token no es válido: {payload.get('user_id')}")
            return create_response(
                False,
                "Usuario asociado al token no es válido",
                status_code=401
            )
        
        response_data = {
            'valid': True,
            'payload': {
                'user_id': payload['user_id'],
                'username': payload['username'],
                'email': payload['email'],
                'exp': payload['exp']
            },
            'user': user.to_dict()
        }
        
        logger.info(f"✅ Token válido para: {user.username}")
        return create_response(
            True,
            "Token válido",
            response_data,
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error validando token: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/check-username', methods=['POST'])
def check_username():
    """Endpoint para verificar si un username está disponible"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip() if data else ''
        
        logger.info(f"🔍 Verificando disponibilidad de username: {username}")
        
        if not username:
            return create_response(
                False,
                "Username es requerido",
                status_code=400
            )
        
        # Validar formato del username
        from utils.auth import ValidationUtils
        is_valid, error = ValidationUtils.validate_username(username)
        if not is_valid:
            logger.info(f"Username inválido: {username} - {error}")
            return create_response(
                False,
                error,
                status_code=400
            )
        
        # Verificar disponibilidad
        user = User.find_by_username(username)
        available = user is None
        
        response_data = {
            'username': username,
            'available': available
        }
        
        message = "Username disponible" if available else "Username no disponible"
        logger.info(f"Username {username}: {'disponible' if available else 'no disponible'}")
        
        return create_response(
            True,
            message,
            response_data,
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error verificando username: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/check-email', methods=['POST'])
def check_email():
    """Endpoint para verificar si un email está disponible"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower() if data else ''
        
        logger.info(f"🔍 Verificando disponibilidad de email: {email}")
        
        if not email:
            return create_response(
                False,
                "Email es requerido",
                status_code=400
            )
        
        # Validar formato del email
        from utils.auth import ValidationUtils
        is_valid, error = ValidationUtils.validate_email(email)
        if not is_valid:
            logger.info(f"Email inválido: {email} - {error}")
            return create_response(
                False,
                error,
                status_code=400
            )
        
        # Verificar disponibilidad
        user = User.find_by_email(email)
        available = user is None
        
        response_data = {
            'email': email,
            'available': available
        }
        
        message = "Email disponible" if available else "Email no disponible"
        logger.info(f"Email {email}: {'disponible' if available else 'no disponible'}")
        
        return create_response(
            True,
            message,
            response_data,
            status_code=200
        )
    
    except Exception as e:
        logger.error(f"💥 Error verificando email: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

@auth_bp.route('/google-auth', methods=['POST'])
def google_auth():
    """Endpoint para autenticación con Google usando Firebase"""
    try:
        # Importar verificación de Firebase
        from utils.firebase import verify_firebase_token, initialize_firebase
        
        # Asegurar que Firebase esté inicializado
        if not initialize_firebase():
            logger.error("Error inicializando Firebase")
            return create_response(
                False,
                "Error de configuración del servidor",
                status_code=500
            )
        
        data = request.get_json()
        
        if not data:
            logger.warning("Request de Google auth sin datos JSON")
            return create_response(
                False,
                "No se proporcionaron datos",
                status_code=400
            )
        
        # Extraer datos de Google y Firebase
        google_id = data.get('google_id', '').strip()
        email = data.get('email', '').strip().lower()
        name = data.get('name', '').strip()
        picture = data.get('picture', '')
        first_name = data.get('first_name', '').strip() if data.get('first_name') else None
        last_name = data.get('last_name', '').strip() if data.get('last_name') else None
        firebase_token = data.get('firebase_token', '')  # CAMBIO: firebase_token en lugar de google_token
        
        logger.info(f"🔐 Intento de autenticación con Google/Firebase - Email: {email}, Name: {name}")
        
        # Validar campos requeridos
        if not firebase_token:
            logger.warning("Token de Firebase no proporcionado")
            return create_response(
                False,
                "Token de Firebase es requerido",
                status_code=400
            )
        
        if not google_id or not email or not name:
            logger.warning(f"Campos faltantes - Google ID: {bool(google_id)}, Email: {bool(email)}, Name: {bool(name)}")
            return create_response(
                False,
                "Google ID, email y nombre son requeridos",
                status_code=400
            )
        
        # NUEVO: Verificar token de Firebase
        firebase_user = verify_firebase_token(firebase_token)
        if not firebase_user:
            logger.warning(f"Token Firebase inválido para email: {email}")
            return create_response(
                False,
                "Token de Firebase inválido o expirado",
                status_code=401
            )
        
        # Validar que el email del token coincida con el enviado
        if firebase_user['email'] != email:
            logger.warning(f"Email no coincide - Token: {firebase_user['email']}, Enviado: {email}")
            return create_response(
                False,
                "Email no coincide con el token de Firebase",
                status_code=400
            )
        
        # Buscar usuario existente por email
        existing_user = User.find_by_email(email)
        
        if existing_user:
            # Usuario existe - hacer login
            logger.info(f"👤 Usuario existente encontrado: {existing_user.username}")
            
            # Verificar que la cuenta esté activa
            if not existing_user.is_active:
                logger.warning(f"Cuenta desactivada: {email}")
                return create_response(
                    False,
                    "Tu cuenta está desactivada. Contacta al administrador.",
                    status_code=403
                )
            
            # Actualizar información de Google si es necesario
            if hasattr(existing_user, 'google_id') and existing_user.google_id != google_id:
                existing_user.google_id = google_id
                existing_user.save()
            
            # Actualizar timestamp de último login
            existing_user.update_last_login()
            
            # Generar token JWT
            try:
                token = existing_user.generate_auth_token()
                logger.info(f"✅ Login con Google exitoso: {existing_user.username}")
            except Exception as e:
                logger.error(f"Error generando token para {existing_user.username}: {e}")
                return create_response(
                    False,
                    "Error generando token de acceso",
                    status_code=500
                )
            
            # Respuesta exitosa para login
            response_data = {
                'user': existing_user.to_dict(),
                'token': token,
                'token_type': 'Bearer'
            }
            
            return create_response(
                True,
                f"¡Bienvenido de nuevo, {existing_user.get_full_name() or existing_user.username}!",
                response_data,
                status_code=200
            )
        
        else:
            # Usuario no existe - crear cuenta nueva
            logger.info(f"👤 Creando nueva cuenta con Google para: {email}")
            
            # Generar username único basado en email o nombre
            import re
            base_username = re.sub(r'[^\w]', '_', email.split('@')[0].lower())
            username = base_username
            counter = 1
            
            while User.find_by_username(username):
                username = f"{base_username}_{counter}"
                counter += 1
            
            logger.info(f"📝 Username generado: {username}")
            
            # Crear usuario nuevo
            success, create_message, user = User.create_user(
                username=username,
                email=email,
                password=None,  # No password for Google users
                first_name=first_name or name.split()[0] if name else None,
                last_name=last_name or ' '.join(name.split()[1:]) if name and len(name.split()) > 1 else None,
                is_verified=True,  # Google users are pre-verified
                google_id=google_id,
                firebase_uid=firebase_user['uid']  # Agregar Firebase UID
            )
            
            if not success:
                logger.error(f"Error creando usuario con Google: {create_message}")
                return create_response(False, create_message, status_code=500)
            
            # Generar token JWT
            try:
                token = user.generate_auth_token()
                logger.info(f"✅ Registro con Google exitoso: {username}")
            except Exception as e:
                logger.error(f"Error generando token para {username}: {e}")
                return create_response(
                    False,
                    "Usuario creado pero error generando token de acceso",
                    status_code=500
                )
            
            # Respuesta exitosa para registro
            response_data = {
                'user': user.to_dict(),
                'token': token,
                'token_type': 'Bearer'
            }
            
            return create_response(
                True,
                f"¡Bienvenido a Aureum, {user.get_full_name() or user.username}! Tu cuenta ha sido creada exitosamente.",
                response_data,
                status_code=201
            )
    
    except Exception as e:
        logger.error(f"💥 Error interno en Google auth: {e}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )

# NUEVO: Endpoint de prueba para desarrollo
@auth_bp.route('/test', methods=['GET'])
def test_auth():
    """Endpoint de prueba para verificar que las rutas de auth funcionan"""
    return create_response(
        True,
        "🎯 Rutas de autenticación funcionando correctamente",
        {
            'timestamp': str(__import__('datetime').datetime.utcnow()),
            'available_endpoints': [
                'POST /api/auth/register',
                'POST /api/auth/login', 
                'GET /api/auth/me (requiere token)',
                'POST /api/auth/refresh (requiere token)',
                'POST /api/auth/logout (requiere token)',
                'POST /api/auth/validate-token',
                'POST /api/auth/check-username',
                'POST /api/auth/check-email',
                'GET /api/auth/test'
            ]
        }
    )

# Manejadores de errores para el blueprint
@auth_bp.errorhandler(404)
def not_found(error):
    logger.info(f"Endpoint de auth no encontrado: {request.url}")
    return create_response(
        False,
        "Endpoint de autenticación no encontrado",
        status_code=404
    )

@auth_bp.errorhandler(405)
def method_not_allowed(error):
    logger.warning(f"Método no permitido en auth: {request.method} {request.url}")
    return create_response(
        False,
        "Método HTTP no permitido para este endpoint de autenticación",
        status_code=405
    )

@auth_bp.errorhandler(500)
def internal_error(error):
    logger.error(f"Error interno en rutas de auth: {error}")
    return create_response(
        False,
        "Error interno en el sistema de autenticación",
        status_code=500
    )

# Logging cuando se carga el blueprint
logger.info("✅ Blueprint de autenticación cargado correctamente")