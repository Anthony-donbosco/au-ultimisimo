from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import os
from datetime import datetime
import socket

# Importar configuraciones
from config import config

# Importar utilidades
from utils.database import init_db, test_db_connection
from utils.auth import create_response

# Importar blueprints
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.financial import financial_bp
from routes.admin import admin_bp
from routes.empresa_empleado import empresa_bp, empleado_bp
from routes.tareas import tareas_bp
from routes.producto_routes import producto_bp
from routes.proyecto_routes import proyecto_bp

# NUEVAS IMPORTACIONES: Seguridad y middleware
from utils.middleware import security_middleware, cors_handler, SecurityMiddleware
from utils.security import security_event_logger

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_local_ip():
    """Obtener la IP local de la red"""
    try:
        # Crear socket temporal para obtener IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"

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
    
    # NUEVA IMPLEMENTACIÓN: Configurar CORS seguro con middleware
    local_ip = get_local_ip()
    
    # Inicializar middleware de seguridad
    security_middleware.init_app(app)
    logger.info("🛡️ Middleware de seguridad inicializado")
    
    # Configurar CORS dinámico y seguro
    cors_handler(app)
    logger.info("🌐 CORS configurado dinámicamente")
    
    # Inicializar base de datos (no bloqueante en desarrollo)
    with app.app_context():
        try:
            if init_db():
                logger.info("✅ Base de datos inicializada correctamente")
            else:
                logger.warning("⚠️ Base de datos no disponible - La app funcionará sin BD")
        except Exception as e:
            logger.warning(f"⚠️ Error conectando a BD: {e} - La app funcionará sin BD")
    
    # Registrar blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(financial_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(empresa_bp)
    app.register_blueprint(empleado_bp)
    app.register_blueprint(tareas_bp, url_prefix='/api/tareas')
    app.register_blueprint(producto_bp)
    app.register_blueprint(proyecto_bp)
    logger.info("✅ Blueprints registrados correctamente")
    
    # Ruta de prueba y salud
    @app.route('/')
    def index():
        """Endpoint raíz de la API"""
        return create_response(
            True,
            "🚀 API de Aureum funcionando correctamente",
            {
                'version': '1.0.0',
                'timestamp': datetime.utcnow().isoformat(),
                'local_ip': local_ip,
                'expo_ready': True,
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
                    },
                    'profile': {
                        'get_profile': '/api/users/profile',
                        'update_profile': '/api/users/profile',
                        'upload_picture': '/api/users/profile/picture',
                        'delete_picture': '/api/users/profile/picture'
                    }
                }
            }
        )
    
    @app.route('/ping')
    def ping():
        """Endpoint simple para verificar conectividad"""
        return create_response(
            True,
            "pong",
            {
                'timestamp': datetime.utcnow().isoformat(),
                'local_ip': local_ip,
                'status': 'ok'
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
                'version': '1.0.0',
                'local_ip': local_ip,
                'expo_ready': db_status,
                'cors_origins': 'dynamic'
            }
            
            status_code = 200 if db_status else 503
            
            return create_response(
                db_status,
                "✅ Servicio saludable para Expo Go" if db_status else "❌ Problemas de conectividad",
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
            "📱 API de Aureum v1.0.0 - Compatible con Expo Go",
            {
                'version': '1.0.0',
                'description': 'API para registro, autenticación y gestión de perfiles de usuarios',
                'expo_compatible': True,
                'local_ip': local_ip,
                'endpoints': [
                    'POST /api/auth/register - Registrar usuario',
                    'POST /api/auth/login - Iniciar sesión',
                    'GET /api/auth/me - Perfil del usuario (requiere token)',
                    'POST /api/auth/refresh - Renovar token (requiere token)',
                    'POST /api/auth/logout - Cerrar sesión (requiere token)',
                    'POST /api/auth/validate-token - Validar token',
                    'POST /api/auth/check-username - Verificar username',
                    'POST /api/auth/check-email - Verificar email',
                    'GET /api/users/profile - Obtener perfil completo',
                    'PUT /api/users/profile - Actualizar perfil',
                    'POST /api/users/profile/picture - Subir foto de perfil',
                    'DELETE /api/users/profile/picture - Eliminar foto de perfil'
                ],
                'authentication': 'JWT Bearer Token',
                'content_type': 'application/json'
            }
        )
    
    # NUEVO: Endpoint para obtener IP del servidor (útil para Expo Go)
    @app.route('/api/server-info')
    def server_info():
        """Información del servidor para configuración dinámica"""
        return create_response(
            True,
            "Información del servidor",
            {
                'local_ip': local_ip,
                'port': os.getenv('FLASK_PORT', 5000),
                'base_url': f"http://{local_ip}:{os.getenv('FLASK_PORT', 5000)}",
                'timestamp': datetime.utcnow().isoformat(),
                'cors_enabled': True,
                'expo_ready': True
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
            logger.info(f"📥 {request.method} {request.path} - {request.remote_addr}")
    
    @app.after_request
    def log_response_info(response):
        """Log información de cada response"""
        if not request.path.startswith('/static'):
            status_emoji = "✅" if response.status_code < 400 else "❌"
            logger.info(f"📤 {status_emoji} {request.method} {request.path} - {response.status_code}")
        return response
    
    # MEJORADO: Middleware para CORS preflight más robusto
    @app.before_request
    def handle_preflight():
        """Manejar requests preflight de CORS para Expo Go"""
        if request.method == "OPTIONS":
            response = jsonify({
                'message': 'CORS preflight OK',
                'expo_compatible': True
            })
            
            # Headers más completos para Expo Go
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin,X-Requested-With')
            response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Max-Age', '3600')
            
            return response
    

    # Configuración adicional en modo desarrollo
    if app.config.get('DEBUG'):
        logger.info("🔧 Modo desarrollo activado - Funcionalidades extra habilitadas")
        
        @app.route('/debug/config')
        def debug_config():
            """Endpoint para ver configuración (solo en desarrollo)"""
            if not app.config.get('DEBUG'):
                return create_response(False, "No disponible", status_code=404)
            
            safe_config = {
                'DEBUG': app.config.get('DEBUG'),
                'CORS_ORIGINS': 'Configurado dinámicamente',
                'DB_HOST': app.config.get('DB_CONFIG', {}).get('host', 'No configurado'),
                'DB_NAME': app.config.get('DB_CONFIG', {}).get('database', 'No configurado'),
                'JWT_ALGORITHM': app.config.get('JWT_ALGORITHM', 'No configurado'),
                'LOCAL_IP': local_ip,
                'SECURITY_MIDDLEWARE': 'Activo',
                'EXPO_READY': True
            }
            
            return create_response(
                True,
                "Configuración de desarrollo",
                safe_config
            )
        
        @app.route('/debug/expo-test')
        def expo_test():
            """Endpoint de prueba específico para Expo Go"""
            return create_response(
                True,
                "🎯 Conexión exitosa desde Expo Go!",
                {
                    'your_ip': request.remote_addr,
                    'server_ip': local_ip,
                    'user_agent': request.headers.get('User-Agent', 'Unknown'),
                    'timestamp': datetime.utcnow().isoformat(),
                    'cors_working': True
                }
            ) 
    
    return app

# Crear instancia de la aplicación
app = create_app()

if __name__ == '__main__':
    """Ejecutar servidor de desarrollo optimizado para Expo Go"""
    
    # Verificar configuración crítica
    if not os.getenv('SECRET_KEY') or not os.getenv('DB_PASSWORD'):
        logger.warning("⚠️ Variables de entorno críticas no configuradas!")
        logger.warning("Asegúrate de configurar SECRET_KEY y DB_PASSWORD en el archivo .env")
    
    # Obtener configuración del servidor
    host = os.getenv('FLASK_HOST', '0.0.0.0')  # IMPORTANTE: 0.0.0.0 para Expo Go
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    local_ip = get_local_ip()
    
    logger.info("="*60)
    logger.info("🚀 INICIANDO SERVIDOR AUREUM - EXPO GO MODE")
    logger.info("="*60)
    logger.info(f"🏠 Host: {host}:{port}")
    logger.info(f"📱 IP Local: {local_ip}:{port}")
    logger.info(f"🔧 Debug: {debug}")
    logger.info(f"🌐 CORS: Habilitado para Expo Go")
    logger.info(f"🔗 URL para Expo: http://{local_ip}:{port}")
    logger.info(f"🎯 Test URL: http://{local_ip}:{port}/debug/expo-test")
    logger.info("="*60)
    logger.info("\n📋 ENDPOINTS DISPONIBLES:")
    logger.info("   GET  /              - Info general")
    logger.info("   GET  /health        - Estado del servicio")
    logger.info("   GET  /api           - Info de la API")
    logger.info("   GET  /api/server-info - Info del servidor")
    logger.info("   POST /api/auth/register      - Registrar usuario")
    logger.info("   POST /api/auth/login         - Iniciar sesión")
    logger.info("   GET  /api/auth/me            - Perfil usuario (token)")
    logger.info("   POST /api/auth/refresh       - Renovar token (token)")
    logger.info("   POST /api/auth/logout        - Cerrar sesión (token)")
    logger.info("   POST /api/auth/validate-token - Validar token")
    logger.info("   POST /api/auth/check-username - Verificar username")
    logger.info("   POST /api/auth/check-email   - Verificar email")
    logger.info("   GET  /api/users/profile      - Obtener perfil completo")
    logger.info("   PUT  /api/users/profile      - Actualizar perfil")
    logger.info("   POST /api/users/profile/picture - Subir foto de perfil")
    logger.info("   DELETE /api/users/profile/picture - Eliminar foto")
    logger.info("   GET  /api/productos/empresa     - Productos de empresa")
    logger.info("   POST /api/productos/empresa     - Crear producto")
    logger.info("   GET  /api/productos/empleado    - Productos para venta")
    logger.info("   POST /api/productos/ventas      - Registrar venta")
    logger.info("   GET  /api/proyectos             - Proyectos de empresa")
    logger.info("   POST /api/proyectos             - Crear proyecto")
    logger.info("   GET  /api/proyectos/{id}        - Detalle de proyecto")
    logger.info("   PUT  /api/proyectos/{id}        - Actualizar proyecto")
    logger.info("   POST /api/proyectos/{id}/metas  - Agregar meta")
    if debug:
        logger.info("   GET  /debug/config           - Ver configuración")
        logger.info("   GET  /debug/expo-test        - Test de Expo Go")
    logger.info("="*60)
    logger.info("\n💡 INSTRUCCIONES PARA EXPO GO:")
    logger.info(f"1. En tu archivo frontend/src/config/api.ts:")
    logger.info(f"   Cambia la IP por: http://{local_ip}:{port}")
    logger.info(f"2. Tu dispositivo debe estar en la misma red WiFi")
    logger.info(f"3. Prueba la conexión: http://{local_ip}:{port}/debug/expo-test")
    logger.info("="*60)
    
    # Iniciar servidor
    try:
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True,
            use_reloader=debug  # Solo reload en debug
        )
    except KeyboardInterrupt:
        logger.info("\n👋 Servidor detenido por el usuario")
    except Exception as e:
        logger.error(f"❌ Error iniciando servidor: {e}")
        logger.error("💡 Verifica que el puerto no esté en uso y que MySQL esté corriendo")