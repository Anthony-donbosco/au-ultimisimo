import os
from datetime import timedelta
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

class Config:
    """Configuración base de la aplicación Flask"""
    
    # Configuración de Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'clave-por-defecto-cambiar-en-produccion')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Configuración de la base de datos MySQL
    DB_CONFIG = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 3306)),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': os.getenv('DB_NAME', 'mi_app_db'),
        'charset': 'utf8mb4',
        'collation': 'utf8mb4_unicode_ci',
        'autocommit': True,
        'connection_timeout': 3   # Timeout de conexión: 3 segundos
    }
    
    # Configuración JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 7200))
    )
    JWT_ALGORITHM = 'HS256'
    
    # Configuración CORS segura y flexible
    @classmethod
    def get_cors_origins(cls):
        """Obtener orígenes CORS dinámicamente basado en el entorno"""
        base_origins = [
            os.getenv('FRONTEND_URL', 'http://localhost:3000'),
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000'
        ]
        
        # En desarrollo, agregar puertos comunes de Expo
        if cls.DEBUG:
            dev_origins = [
                'http://localhost:19006',  # Puerto por defecto de Expo
                'http://localhost:8081',   # Puerto alternativo de Metro
                'http://localhost:19000',  # Expo DevTools
                'http://localhost:19002'   # Expo tunnel
            ]
            
            # Agregar rangos de IP local solo si se especifica explícitamente
            if os.getenv('ALLOW_LOCAL_IPS', 'false').lower() == 'true':
                dev_origins.extend([
                    'http://192.168.*:*',    # Red local
                    'http://10.0.*:*',       # Emuladores Android
                    'http://172.16.*:*'      # Docker/contenedores
                ])
            
            base_origins.extend(dev_origins)
        
        return base_origins
    
    CORS_ORIGINS = []  # Se poblará dinámicamente
    
    # Configuración de validación
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_MAX_LENGTH = 128
    USERNAME_MIN_LENGTH = 3
    USERNAME_MAX_LENGTH = 50

class DevelopmentConfig(Config):
    """Configuración para desarrollo"""
    DEBUG = True
    
    # Configuración específica para desarrollo con Expo
    CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL', 'false').lower() == 'true'
    
    # Headers de seguridad relajados para desarrollo
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }

class ProductionConfig(Config):
    """Configuración para producción"""
    DEBUG = False
    
    # Headers de seguridad estrictos para producción
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Validar que las variables críticas estén definidas
        required_vars = ['SECRET_KEY', 'JWT_SECRET_KEY', 'DB_PASSWORD']
        missing_vars = []
        
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Variables de entorno faltantes: {', '.join(missing_vars)}")

# Diccionario de configuraciones
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}