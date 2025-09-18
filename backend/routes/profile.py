# routes/profile.py
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import os
import uuid
import logging
from werkzeug.utils import secure_filename
from datetime import datetime

# Importar modelo User y utilidades de auth
from models.user import User
from utils.auth import create_response
import jwt

logger = logging.getLogger(__name__)

# Crear Blueprint
profile_bp = Blueprint('profile', __name__, url_prefix='/api/users')

def token_required(f):
    """Decorador para requerir autenticación JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Obtener token del header Authorization
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # "Bearer TOKEN"
            except IndexError:
                return create_response(
                    False, 
                    "Formato de token inválido", 
                    status_code=401
                )
        
        if not token:
            return create_response(
                False, 
                "Token de acceso requerido", 
                status_code=401
            )
        
        try:
            # Verificar token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.find_by_id(data['user_id'])
            
            if not current_user:
                return create_response(
                    False, 
                    "Usuario no encontrado", 
                    status_code=404
                )
            
            if not current_user.is_active:
                return create_response(
                    False, 
                    "Usuario inactivo", 
                    status_code=403
                )
                
        except jwt.ExpiredSignatureError:
            return create_response(
                False, 
                "Token expirado", 
                status_code=401
            )
        except jwt.InvalidTokenError:
            return create_response(
                False, 
                "Token inválido", 
                status_code=401
            )
        except Exception as e:
            logger.error(f"Error verificando token: {e}")
            return create_response(
                False, 
                "Error de autenticación", 
                status_code=401
            )
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def validate_profile_data(data):
    """Validar datos del perfil"""
    errors = []
    
    if 'username' in data and data['username']:
        username = data['username'].strip()
        if len(username) < 3:
            errors.append("El nombre de usuario debe tener al menos 3 caracteres")
        elif len(username) > 50:
            errors.append("El nombre de usuario no puede tener más de 50 caracteres")
        elif not username.replace('_', '').isalnum():
            errors.append("El nombre de usuario solo puede contener letras, números y guiones bajos")
    
    if 'first_name' in data and data['first_name']:
        if len(data['first_name']) > 50:
            errors.append("El nombre no puede tener más de 50 caracteres")
    
    if 'last_name' in data and data['last_name']:
        if len(data['last_name']) > 50:
            errors.append("El apellido no puede tener más de 50 caracteres")
    
    return errors

@profile_bp.route('/profile', methods=['GET'])
@token_required
def get_user_profile(current_user):
    """Obtener perfil completo del usuario actual"""
    try:
        # Refrescar datos del usuario desde la BD
        user = User.find_by_id(current_user.id)
        
        if not user:
            return create_response(
                False, 
                "Usuario no encontrado", 
                status_code=404
            )
        
        profile_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'updated_at': user.updated_at.isoformat() if user.updated_at else None,
            'is_active': user.is_active
        }
        
        return create_response(
            True,
            "Perfil obtenido exitosamente",
            profile_data
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo perfil: {e}")
        return create_response(
            False, 
            "Error interno del servidor", 
            status_code=500
        )

@profile_bp.route('/profile', methods=['PUT'])
@token_required
def update_user_profile(current_user):
    """Actualizar perfil del usuario"""
    try:
        data = request.get_json()
        
        if not data:
            return create_response(
                False, 
                "No se proporcionaron datos para actualizar", 
                status_code=400
            )
        
        # Validar datos
        validation_errors = validate_profile_data(data)
        if validation_errors:
            return create_response(
                False, 
                "Errores de validación", 
                {'errors': validation_errors}, 
                status_code=400
            )
        
        # Validar username único si se está cambiando
        if 'username' in data and data['username'] != current_user.username:
            if not current_user.check_username_available(data['username']):
                return create_response(
                    False, 
                    "El nombre de usuario ya está en uso", 
                    status_code=400
                )
        
        # Preparar datos para actualizar (solo campos que no son None o vacíos)
        update_data = {}
        
        for field in ['username', 'first_name', 'last_name']:
            if field in data:
                value = data[field]
                if value is not None:
                    # Limpiar strings vacíos
                    if isinstance(value, str):
                        value = value.strip()
                        update_data[field] = value if value else None
                    else:
                        update_data[field] = value
        
        # Actualizar usando el método del modelo
        if update_data:
            success = current_user.update_profile(**update_data)
            if not success:
                return create_response(
                    False, 
                    "Error actualizando perfil", 
                    status_code=500
                )
        
        # Obtener usuario actualizado
        updated_user = User.find_by_id(current_user.id)
        
        logger.info(f"Perfil actualizado para usuario: {updated_user.username}")
        
        profile_data = {
            'id': updated_user.id,
            'username': updated_user.username,
            'email': updated_user.email,
            'first_name': updated_user.first_name,
            'last_name': updated_user.last_name,
            'created_at': updated_user.created_at.isoformat() if updated_user.created_at else None,
            'updated_at': updated_user.updated_at.isoformat() if updated_user.updated_at else None,
            'is_active': updated_user.is_active
        }
        
        return create_response(
            True,
            "Perfil actualizado exitosamente",
            profile_data
        )
        
    except Exception as e:
        logger.error(f"Error actualizando perfil: {e}")
        return create_response(
            False, 
            "Error interno del servidor", 
            status_code=500
        )

@profile_bp.route('/profile/complete', methods=['POST'])
@token_required
def update_complete_profile(current_user):
    """Actualizar perfil completo (datos + foto)"""
    try:
        # Obtener datos del formulario
        data = {
            'first_name': request.form.get('first_name'),
            'last_name': request.form.get('last_name'),
            'username': request.form.get('username')
        }
        
        # Validar que se proporcionaron los campos requeridos
        if not data['first_name'] or not data['last_name'] or not data['username']:
            return create_response(
                False, 
                "Los campos first_name, last_name y username son requeridos", 
                status_code=400
            )
        
        # Validar datos
        validation_errors = validate_profile_data(data)
        if validation_errors:
            return create_response(
                False, 
                "Errores de validación", 
                {'errors': validation_errors}, 
                status_code=400
            )
        
        # Validar username único
        if data['username'] != current_user.username:
            if not current_user.check_username_available(data['username']):
                return create_response(
                    False, 
                    "El nombre de usuario ya está en uso", 
                    status_code=400
                )
        
        # Preparar datos para actualizar
        update_data = {
            'username': data['username'].strip(),
            'first_name': data['first_name'].strip(),
            'last_name': data['last_name'].strip()
        }
        
        # Procesar foto si se proporcionó
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename:
                # Verificar archivo
                if not allowed_file(file.filename):
                    return create_response(
                        False, 
                        "Tipo de archivo no permitido", 
                        status_code=400
                    )
                
                # Verificar tamaño
                file.seek(0, os.SEEK_END)
                file_size = file.tell()
                file.seek(0)
                
                if file_size > MAX_FILE_SIZE:
                    return create_response(
                        False, 
                        "El archivo es demasiado grande (máximo 5MB)", 
                        status_code=400
                    )
                
                # Eliminar foto anterior
                if current_user.profile_picture:
                    old_file_path = f".{current_user.profile_picture}"
                    if os.path.exists(old_file_path):
                        try:
                            os.remove(old_file_path)
                        except Exception as e:
                            logger.warning(f"No se pudo eliminar imagen anterior: {e}")
                
                # Guardar nueva foto
                try:
                    profile_picture_url = save_profile_picture(file)
                    update_data['profile_picture'] = profile_picture_url
                except ValueError as e:
                    return create_response(
                        False, 
                        str(e), 
                        status_code=400
                    )
        
        # Actualizar perfil
        success = current_user.update_profile(**update_data)
        if not success:
            return create_response(
                False, 
                "Error actualizando perfil", 
                status_code=500
            )
        
        # Obtener usuario actualizado
        updated_user = User.find_by_id(current_user.id)
        
        logger.info(f"Perfil completo actualizado para: {updated_user.username}")
        
        profile_data = {
            'id': updated_user.id,
            'username': updated_user.username,
            'email': updated_user.email,
            'first_name': updated_user.first_name,
            'last_name': updated_user.last_name,
            'created_at': updated_user.created_at.isoformat() if updated_user.created_at else None,
            'updated_at': updated_user.updated_at.isoformat() if updated_user.updated_at else None,
            'is_active': updated_user.is_active
        }
        
        return create_response(
            True,
            "Perfil completo actualizado exitosamente",
            profile_data
        )
        
    except Exception as e:
        logger.error(f"Error actualizando perfil completo: {e}")
        return create_response(
            False, 
            "Error interno del servidor", 
            status_code=500
        )

# Endpoint para servir archivos estáticos de perfil (opcional)
@profile_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Servir archivos de perfil subidos"""
    try:
        from flask import send_from_directory
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        logger.error(f"Error sirviendo archivo: {e}")
        return create_response(
            False, 
            "Archivo no encontrado", 
            status_code=404
        )