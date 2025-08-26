"""
Módulo de modelos para la aplicación de autenticación.

Este paquete contiene todos los modelos de datos de la aplicación,
incluyendo el modelo User para manejo de usuarios.
"""

# Importar modelos principales para facilitar el acceso
from .user import User

# Definir qué se exporta cuando se hace "from models import *"
__all__ = ['User']

# Información del módulo
__version__ = '1.0.0'
__author__ = 'Tu Nombre'
__description__ = 'Modelos de datos para sistema de autenticación'