# Nuevo archivo: routes/producto_routes.py

from flask import Blueprint, request, jsonify
from utils.auth import token_required
from services.producto_service import producto_service
from models.user import User

# Asignar roles numéricos para el decorador
ROL_EMPRESA = 2
ROL_EMPLEADO = 3

def require_role(role_id):
    def decorator(f):
        @token_required
        def decorated_function(current_user, *args, **kwargs):
            if current_user['id_rol'] != role_id:
                return jsonify({'success': False, 'message': 'No tienes permisos'}), 403
            return f(current_user, *args, **kwargs)
        # Renombrar la función para evitar conflictos en Flask
        decorated_function.__name__ = f.__name__
        return decorated_function
    return decorator

producto_bp = Blueprint('producto_bp', __name__, url_prefix='/api/productos')

# --- Rutas para la Empresa ---

@producto_bp.route('/empresa', methods=['GET'])
@require_role(ROL_EMPRESA)
def get_productos_empresa(current_user):
    empresa_id = current_user['user_id']
    productos = producto_service.get_productos_empresa(empresa_id)
    return jsonify({'success': True, 'productos': productos})

@producto_bp.route('/empresa', methods=['POST'])
@require_role(ROL_EMPRESA)
def crear_producto(current_user):
    data = request.get_json()
    empresa_id = current_user['user_id']
    success, message, producto = producto_service.crear_producto(empresa_id, data)
    if not success:
        return jsonify({'success': False, 'message': message}), 400
    return jsonify({'success': True, 'message': message, 'producto': producto}), 201

@producto_bp.route('/empresa/<int:producto_id>', methods=['DELETE'])
@require_role(ROL_EMPRESA)
def eliminar_producto(current_user, producto_id):
    empresa_id = current_user['user_id']
    success, message = producto_service.eliminar_producto(producto_id, empresa_id)
    if not success:
        return jsonify({'success': False, 'message': message}), 404
    return jsonify({'success': True, 'message': message})

# --- Rutas para el Empleado ---

@producto_bp.route('/empleado', methods=['GET'])
@require_role(ROL_EMPLEADO)
def get_productos_para_venta(current_user):
    empleado = User.find_by_id(current_user['user_id'])
    if not empleado or not empleado.created_by_empresa_id:
        return jsonify({'success': False, 'message': 'Empleado no asociado a empresa'}), 400
    
    productos = producto_service.get_productos_empresa(empleado.created_by_empresa_id)
    return jsonify({'success': True, 'productos': productos})

@producto_bp.route('/ventas', methods=['POST'])
@require_role(ROL_EMPLEADO)
def registrar_venta(current_user):
    data = request.get_json()
    empleado_id = current_user['user_id']
    success, message, _ = producto_service.registrar_venta(empleado_id, data)
    if not success:
        return jsonify({'success': False, 'message': message}), 400
    return jsonify({'success': True, 'message': message}), 201