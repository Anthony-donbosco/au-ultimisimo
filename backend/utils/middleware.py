"""
Middleware de seguridad para Flask
Aplica headers de seguridad, CORS avanzado, y otras protecciones
"""
import logging
from flask import request, g, current_app
from functools import wraps
import time
import re
from utils.security import security_event_logger

logger = logging.getLogger(__name__)

class SecurityMiddleware:
    """Middleware de seguridad para la aplicación Flask"""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Inicializar middleware con la aplicación Flask"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        
        # Registrar middleware
        logger.info("SecurityMiddleware inicializado correctamente")
    
    def before_request(self):
        """Procesar request antes de llegar al endpoint"""
        # Registrar tiempo de inicio
        g.start_time = time.time()
        
        # Verificar User-Agent sospechoso
        user_agent = request.headers.get('User-Agent', '')
        if self._is_suspicious_user_agent(user_agent):
            client_ip = request.remote_addr or "unknown"
            security_event_logger.log_suspicious_activity(
                client_ip, 
                "suspicious_user_agent", 
                f"User-Agent: {user_agent[:100]}"
            )
        
        # Verificar tamaño del request
        if request.content_length and request.content_length > 10 * 1024 * 1024:  # 10MB
            client_ip = request.remote_addr or "unknown"
            security_event_logger.log_suspicious_activity(
                client_ip,
                "large_request",
                f"Size: {request.content_length} bytes"
            )
        
        # Detectar intentos de path traversal
        if self._detect_path_traversal(request.path):
            client_ip = request.remote_addr or "unknown"
            security_event_logger.log_suspicious_activity(
                client_ip,
                "path_traversal_attempt",
                f"Path: {request.path}"
            )
    
    def after_request(self, response):
        """Procesar response antes de enviarla al cliente"""
        # Aplicar headers de seguridad
        self._apply_security_headers(response)
        
        # Logging de performance si es lento
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            if duration > 5.0:  # Más de 5 segundos
                logger.warning(f"Slow request: {request.method} {request.path} - {duration:.2f}s")
        
        return response
    
    def _apply_security_headers(self, response):
        """Aplicar headers de seguridad basados en la configuración"""
        try:
            config = current_app.config
            security_headers = config.get('SECURITY_HEADERS', {})
            
            for header, value in security_headers.items():
                response.headers[header] = value
            
            # Header adicional para API
            response.headers['X-API-Version'] = '1.0'
            response.headers['X-Powered-By'] = 'Aureum-API'
            
        except Exception as e:
            logger.error(f"Error aplicando headers de seguridad: {e}")
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Detectar User-Agents sospechosos"""
        if not user_agent:
            return True
        
        # Patrones sospechosos comunes
        suspicious_patterns = [
            r'sqlmap',
            r'nikto',
            r'nmap',
            r'burp',
            r'scanner',
            r'bot.*scanner',
            r'hack',
            r'exploit'
        ]
        
        user_agent_lower = user_agent.lower()
        for pattern in suspicious_patterns:
            if re.search(pattern, user_agent_lower, re.IGNORECASE):
                return True
        
        return False
    
    def _detect_path_traversal(self, path: str) -> bool:
        """Detectar intentos de path traversal"""
        suspicious_patterns = [
            r'\.\.',
            r'%2e%2e',
            r'%252e%252e',
            r'\.%2e',
            r'%2e\.',
            r'etc/passwd',
            r'boot\.ini',
            r'windows/system32'
        ]
        
        path_lower = path.lower()
        for pattern in suspicious_patterns:
            if re.search(pattern, path_lower, re.IGNORECASE):
                return True
        
        return False

def require_https(f):
    """Decorador para requerir HTTPS en producción"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_app.config.get('DEBUG', False):
            if not request.is_secure and not request.headers.get('X-Forwarded-Proto') == 'https':
                return {
                    'success': False,
                    'message': 'HTTPS requerido'
                }, 403
        return f(*args, **kwargs)
    return decorated_function

def cors_handler(app):
    """Configurar CORS dinámico y seguro"""
    from flask_cors import CORS
    
    def get_cors_origins():
        """Obtener orígenes CORS válidos"""
        config = app.config
        
        # Usar método dinámico si existe
        if hasattr(config, 'get_cors_origins'):
            return config.get_cors_origins()
        
        # Fallback a configuración estática
        return config.get('CORS_ORIGINS', ['http://localhost:3000'])
    
    # Configurar CORS con validación dinámica
    CORS(app, 
         origins=get_cors_origins(),
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
         supports_credentials=True,
         max_age=3600)  # Cache preflight por 1 hora
    
    logger.info(f"CORS configurado con orígenes: {get_cors_origins()}")

class RequestValidator:
    """Validador de requests avanzado"""
    
    @staticmethod
    def validate_json_request(required_fields: list = None, max_size: int = 1024*1024):
        """Decorador para validar requests JSON"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                # Verificar Content-Type
                if not request.is_json:
                    return {
                        'success': False,
                        'message': 'Content-Type debe ser application/json'
                    }, 400
                
                # Verificar tamaño
                if request.content_length and request.content_length > max_size:
                    return {
                        'success': False,
                        'message': f'Request demasiado grande (máximo {max_size//1024}KB)'
                    }, 413
                
                # Obtener JSON
                try:
                    json_data = request.get_json()
                except Exception as e:
                    return {
                        'success': False,
                        'message': 'JSON inválido'
                    }, 400
                
                if not json_data:
                    return {
                        'success': False,
                        'message': 'Body JSON requerido'
                    }, 400
                
                # Verificar campos requeridos
                if required_fields:
                    missing_fields = [field for field in required_fields if field not in json_data]
                    if missing_fields:
                        return {
                            'success': False,
                            'message': f'Campos faltantes: {", ".join(missing_fields)}'
                        }, 400
                
                return f(*args, **kwargs)
            return decorated_function
        return decorator
    
    @staticmethod
    def validate_api_version(supported_versions: list = ['1.0']):
        """Decorador para validar versión de API"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                api_version = request.headers.get('X-API-Version', '1.0')
                
                if api_version not in supported_versions:
                    return {
                        'success': False,
                        'message': f'Versión de API no soportada: {api_version}'
                    }, 400
                
                return f(*args, **kwargs)
            return decorated_function
        return decorator

# Instancia global
security_middleware = SecurityMiddleware()
request_validator = RequestValidator()