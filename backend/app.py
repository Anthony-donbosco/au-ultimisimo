from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import os
from datetime import datetime

# Importar configuraciones
from config import config

# Importar utilidades
from utils.database import init_db, test_db_connection
from utils.auth import create_response

# Importar blueprints
from routes.auth import auth_bp

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_name=None):
    """Factory function para crear la aplicación Flask"""
    
    # Crear instancia de Flask
    app = Flask(__name__)
    
    # Determinar configuración
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'default')
    
    # Cargar configuración
    app.config.from_object(config[config_name])
    logger.info(f"Aplicación iniciada con configuración: {config_name}")
    
    # Configurar CORS
    CORS(app, 
         origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         supports_credentials=True)
    
    # Inicializar base de datos
    with app.app_context():
        if not init_db():
            logger.error("Error inicializando base de datos")
        else:
            logger.info("Base de datos inicializada correctamente")
    
    # Registrar blueprints
    app.register_blueprint(auth_bp)
    logger.info("Blueprints registrados correctamente")
    
    # Ruta de prueba y salud
    @app.route('/')
    def index():
        """Endpoint raíz de la API"""
        return create_response(
            True,
            "API de Autenticación funcionando correctamente",
            {
                'version': '1.0.0',
                'timestamp': datetime.utcnow().isoformat(),
                'endpoints': {
                    'auth': {
                        'register': '/api/auth/register',
                        'login': '/api/auth/login',
                        'me': '/api/auth/me',
                        'refresh': '/api/auth/refresh',
                        'logout': '/api/auth/logout',
                        'validate-token': '/api/auth/validate-token',
                        'check-username': '/api/auth/check-username',
                        'check-email': '/api/auth/check-email'
                    }
                }
            }
        )
    
    @app.route('/health')
    def health_check():
        """Endpoint para verificar salud de la aplicación"""
        try:
            # Probar conexión a base de datos
            db_status = test_db_connection()
            
            health_data = {
                'status': 'healthy' if db_status else 'unhealthy',
                'timestamp': datetime.utcnow().isoformat(),
                'database': 'connected' if db_status else 'disconnected',
                'version': '1.0.0'
            }
            
            status_code = 200 if db_status else 503
            
            return create_response(
                db_status,
                "Servicio saludable" if db_status else "Problemas de conectividad",
                health_data,
                status_code
            )
        
        except Exception as e:
            logger.error(f"Error en health check: {e}")
            return create_response(
                False,
                "Error verificando salud del servicio",
                {'error': str(e)},
                500
            )
    
    @app.route('/api')
    def api_info():
        """Información de la API"""
        return create_response(
            True,
            "API de Autenticación v1.0.0",
            {
                'version': '1.0.0',
                'description': 'API para registro y autenticación de usuarios',
                'endpoints': [
                    'POST /api/auth/register - Registrar usuario',
                    'POST /api/auth/login - Iniciar sesión',
                    'GET /api/auth/me - Perfil del usuario (requiere token)',
                    'POST /api/auth/refresh - Renovar token (requiere token)',
                    'POST /api/auth/logout - Cerrar sesión (requiere token)',
                    'POST /api/auth/validate-token - Validar token',
                    'POST /api/auth/check-username - Verificar username',
                    'POST /api/auth/check-email - Verificar email'
                ],
                'authentication': 'JWT Bearer Token',
                'content_type': 'application/json'
            }
        )
    
    # Manejadores de errores globales
    @app.errorhandler(400)
    def bad_request(error):
        logger.warning(f"Bad request: {error}")
        return create_response(
            False,
            "Solicitud incorrecta",
            status_code=400
        )
    
    @app.errorhandler(401)
    def unauthorized(error):
        logger.warning(f"Unauthorized access: {error}")
        return create_response(
            False,
            "Acceso no autorizado",
            status_code=401
        )
    
    @app.errorhandler(403)
    def forbidden(error):
        logger.warning(f"Forbidden access: {error}")
        return create_response(
            False,
            "Acceso prohibido",
            status_code=403
        )
    
    @app.errorhandler(404)
    def not_found(error):
        logger.info(f"Endpoint not found: {request.url}")
        return create_response(
            False,
            "Endpoint no encontrado",
            status_code=404
        )
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        logger.warning(f"Method not allowed: {request.method} {request.url}")
        return create_response(
            False,
            "Método HTTP no permitido",
            status_code=405
        )
    
    @app.errorhandler(500)
    def internal_server_error(error):
        logger.error(f"Internal server error: {error}")
        return create_response(
            False,
            "Error interno del servidor",
            status_code=500
        )
    
    # Middleware para logging de requests
    @app.before_request
    def log_request_info():
        """Log información de cada request"""
        if not request.path.startswith('/static'):
            logger.info(f"{request.method} {request.path} - {request.remote_addr}")
    
    @app.after_request
    def log_response_info(response):
        """Log información de cada response"""
        if not request.path.startswith('/static'):
            logger.info(f"{request.method} {request.path} - {response.status_code}")
        return response
    
    # Middleware para CORS preflight
    @app.before_request
    def handle_preflight():
        """Manejar requests preflight de CORS"""
        if request.method == "OPTIONS":
            response = jsonify({})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
            return response
    
    # Configuración adicional en modo desarrollo
    if app.config.get('DEBUG'):
        logger.info("Modo desarrollo activado")
        
        @app.route('/debug/config')
        def debug_config():
            """Endpoint para ver configuración (solo en desarrollo)"""
            if not app.config.get('DEBUG'):
                return create_response(False, "No disponible", status_code=404)
            
            safe_config = {
                'DEBUG': app.config.get('DEBUG'),
                'CORS_ORIGINS': app.config.get('CORS_ORIGINS'),
                'DB_HOST': app.config.get('DB_CONFIG', {}).get('host', 'No configurado'),
                'DB_NAME': app.config.get('DB_CONFIG', {}).get('database', 'No configurado'),
                'JWT_ALGORITHM': app.config.get('JWT_ALGORITHM', 'No configurado')
            }
            
            return create_response(
                True,
                "Configuración de desarrollo",
                safe_config
            )
    
    return app

# Crear instancia de la aplicación
app = create_app()

if __name__ == '__main__':
    """Ejecutar servidor de desarrollo"""
    
    # Verificar configuración crítica
    if not os.getenv('SECRET_KEY') or not os.getenv('DB_PASSWORD'):
        logger.warning("⚠️  Variables de entorno críticas no configuradas!")
        logger.warning("Asegúrate de configurar SECRET_KEY y DB_PASSWORD en el archivo .env")
    
    # Configuración del servidor
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info("="*50)
    logger.info("🚀 INICIANDO SERVIDOR DE DESARROLLO")
    logger.info("="*50)
    logger.info(f"📍 URL: http://{host}:{port}")
    logger.info(f"🔧 Debug: {debug}")
    logger.info(f"📱 Frontend permitido: {os.getenv('FRONTEND_URL', 'http://localhost:3000')}")
    logger.info("="*50)
    logger.info("\n📋 ENDPOINTS DISPONIBLES:")
    logger.info("   GET  /              - Info general")
    logger.info("   GET  /health        - Estado del servicio")
    logger.info("   GET  /api           - Info de la API")
    logger.info("   POST /api/auth/register      - Registrar usuario")
    logger.info("   POST /api/auth/login         - Iniciar sesión")
    logger.info("   GET  /api/auth/me            - Perfil usuario (token)")
    logger.info("   POST /api/auth/refresh       - Renovar token (token)")
    logger.info("   POST /api/auth/logout        - Cerrar sesión (token)")
    logger.info("   POST /api/auth/validate-token - Validar token")
    logger.info("   POST /api/auth/check-username - Verificar username")
    logger.info("   POST /api/auth/check-email   - Verificar email")
    logger.info("="*50)
    
    # Iniciar servidor
    try:
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("\n👋 Servidor detenido por el usuario")
    except Exception as e:
        logger.error(f"❌ Error iniciando servidor: {e}")