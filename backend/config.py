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
        'autocommit': True
    }
    
    # Configuración JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    )
    JWT_ALGORITHM = 'HS256'
    
    # CAMBIO: Configuración CORS más permisiva para Expo Go
    CORS_ORIGINS = [
        os.getenv('FRONTEND_URL', 'http://localhost:3000'),
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://192.168.1.*:*',  # ← NUEVO: Permite IPs de red local
        'http://10.0.0.*:*',     # ← NUEVO: Para emuladores Android
        'http://172.16.*:*',     # ← NUEVO: Para Docker/emuladores
        'http://localhost:19006', # ← NUEVO: Puerto por defecto de Expo
        'http://localhost:8081',  # ← NUEVO: Puerto alternativo de Metro
        '*'  # ← NUEVO: Para desarrollo (quitar en producción)
    ]
    
    # Configuración de validación
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_MAX_LENGTH = 128
    USERNAME_MIN_LENGTH = 3
    USERNAME_MAX_LENGTH = 50

class DevelopmentConfig(Config):
    """Configuración para desarrollo"""
    DEBUG = True
    
    # NUEVO: Configuración específica para desarrollo con Expo
    CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL', 'false').lower() == 'true'

class ProductionConfig(Config):
    """Configuración para producción"""
    DEBUG = False
    CORS_ORIGINS = [os.getenv('FRONTEND_URL', 'https://tu-dominio.com')]
    
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