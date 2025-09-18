"""
Módulo de rutas para la aplicación de autenticación.

Este paquete contiene todos los blueprints y rutas de la API,
organizados por funcionalidad.
"""

# Importar blueprints principales para facilitar el registro
from .auth import auth_bp

# Definir qué se exporta cuando se hace "from routes import *"
__all__ = ['auth_bp']

# Lista de todos los blueprints disponibles
BLUEPRINTS = [
    auth_bp,
    # Aquí puedes agregar más blueprints en el futuro
    # ejemplo: user_bp, admin_bp, etc.
]

def register_blueprints(app):
    """
    Función de conveniencia para registrar todos los blueprints en una app Flask.
    
    Args:
        app: Instancia de Flask donde registrar los blueprints
    """
    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)
        print(f"Blueprint registrado: {blueprint.name}")

# Información del módulo
__version__ = '1.0.0'
__author__ = 'Tu Nombre'
__description__ = 'Rutas y blueprints para API de autenticación'