"""
Módulo de utilidades para la aplicación de autenticación.

Este paquete contiene funciones y clases de utilidad para:
- Manejo de base de datos
- Autenticación y autorización
- Validaciones
- Funciones auxiliares
"""

# Importar clases y funciones principales para facilitar el acceso
from .database import (
    db_manager,
    get_db,
    test_db_connection,
    find_user_by_email,
    find_user_by_username,
    find_user_by_id,
    create_user,
    update_user_last_login,
    init_db
)

from .auth import (
    AuthUtils,
    ValidationUtils,
    token_required,
    create_response,
    hash_password,
    verify_password,
    generate_jwt_token,
    decode_jwt_token,
    get_token_from_request
)

# Definir qué se exporta cuando se hace "from utils import *"
__all__ = [
    # Database utils
    'db_manager',
    'get_db',
    'test_db_connection',
    'find_user_by_email',
    'find_user_by_username', 
    'find_user_by_id',
    'create_user',
    'update_user_last_login',
    'init_db',
    
    # Auth utils
    'AuthUtils',
    'ValidationUtils',
    'token_required',
    'create_response',
    'hash_password',
    'verify_password',
    'generate_jwt_token',
    'decode_jwt_token',
    'get_token_from_request'
]

# Información del módulo
__version__ = '1.0.0'
__author__ = 'Tu Nombre'
__description__ = 'Utilidades para sistema de autenticación'

# Configuración de logging para el módulo
import logging
logger = logging.getLogger(__name__)
logger.info("Módulo utils inicializado correctamente")