from flask import Blueprint, request, jsonify
from services.tareas_service import TareasService
from utils.auth import token_required
from datetime import datetime, date

tareas_bp = Blueprint('tareas', __name__)

@tareas_bp.route('/estados', methods=['GET'])
@token_required
def get_estados_tarea(current_user):
    """Obtiene todos los estados de tarea disponibles"""
    result = TareasService.get_estados_tarea()
    return jsonify(result)

@tareas_bp.route('/crear', methods=['POST'])
@token_required
def crear_tarea(current_user):
    """Crea una nueva tarea asignada (solo empresas)"""
    # Verificar que el usuario sea una empresa
    if current_user['id_rol'] != 2:  # 2 = empresa
        return jsonify({
            'success': False,
            'message': 'Solo las empresas pueden asignar tareas'
        }), 403

    data = request.get_json()

    # Validaciones básicas
    required_fields = ['titulo', 'empleado_id', 'prioridad_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                'success': False,
                'message': f'El campo {field} es requerido'
            }), 400

    # Agregar empresa_id del usuario actual
    data['empresa_id'] = current_user['user_id']

    # Procesar fecha_limite si está presente
    if data.get('fecha_limite'):
        try:
            if isinstance(data['fecha_limite'], str):
                data['fecha_limite'] = datetime.strptime(data['fecha_limite'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }), 400

    result = TareasService.crear_tarea(data, current_user['user_id'])

    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400

@tareas_bp.route('/empleado/<int:empleado_id>', methods=['GET'])
@token_required
def get_tareas_empleado(current_user, empleado_id):
    """Obtiene las tareas de un empleado"""
    # Verificar permisos: el empleado puede ver sus propias tareas
    # o la empresa puede ver las tareas de sus empleados
    if current_user['user_id'] != empleado_id and current_user['id_rol'] != 2:
        return jsonify({
            'success': False,
            'message': 'Sin permisos para ver estas tareas'
        }), 403

    limit = request.args.get('limit', 10, type=int)
    estado = request.args.get('estado')

    result = TareasService.get_tareas_empleado(empleado_id, limit, estado)
    return jsonify(result)

@tareas_bp.route('/empresa/<int:empresa_id>', methods=['GET'])
@token_required
def get_tareas_empresa(current_user, empresa_id):
    """Obtiene las tareas asignadas por una empresa"""
    # Solo la propia empresa puede ver sus tareas asignadas
    if current_user['user_id'] != empresa_id or current_user['id_rol'] != 2:
        return jsonify({
            'success': False,
            'message': 'Sin permisos para ver estas tareas'
        }), 403

    limit = request.args.get('limit', 50, type=int)

    result = TareasService.get_tareas_empresa(empresa_id, limit)
    return jsonify(result)

@tareas_bp.route('/mis-tareas', methods=['GET'])
@token_required
def get_mis_tareas(current_user):
    """Obtiene las tareas del usuario actual"""
    if current_user['id_rol'] == 3:  # Empleado
        limit = request.args.get('limit', 10, type=int)
        estado = request.args.get('estado')
        result = TareasService.get_tareas_empleado(current_user['user_id'], limit, estado)
    elif current_user['id_rol'] == 2:  # Empresa
        limit = request.args.get('limit', 50, type=int)
        result = TareasService.get_tareas_empresa(current_user['user_id'], limit)
    else:
        return jsonify({
            'success': False,
            'message': 'Tipo de usuario no válido para esta operación'
        }), 400

    return jsonify(result)

@tareas_bp.route('/<int:tarea_id>', methods=['GET'])
@token_required
def get_tarea_detalle(current_user, tarea_id):
    """Obtiene el detalle de una tarea específica"""
    result = TareasService.get_tarea_detalle(tarea_id, current_user['user_id'])

    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 404

@tareas_bp.route('/<int:tarea_id>/estado', methods=['PUT'])
@token_required
def actualizar_estado_tarea(current_user, tarea_id):
    """Actualiza el estado de una tarea"""
    data = request.get_json()

    if not data.get('estado'):
        return jsonify({
            'success': False,
            'message': 'El estado es requerido'
        }), 400

    result = TareasService.actualizar_estado_tarea(
        tarea_id,
        data['estado'],
        current_user['user_id'],
        data.get('motivo')
    )

    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 400

@tareas_bp.route('/<int:tarea_id>/comentarios', methods=['POST'])
@token_required
def agregar_comentario(current_user, tarea_id):
    """Agrega un comentario a una tarea"""
    data = request.get_json()

    if not data.get('comentario'):
        return jsonify({
            'success': False,
            'message': 'El comentario es requerido'
        }), 400

    # Solo las empresas pueden hacer comentarios internos
    es_interno = data.get('es_interno', False) and current_user['id_rol'] == 2

    result = TareasService.agregar_comentario(
        tarea_id,
        current_user['user_id'],
        data['comentario'],
        es_interno
    )

    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400

@tareas_bp.route('/empleados', methods=['GET'])
@token_required
def get_empleados_empresa(current_user):
    """Obtiene los empleados de la empresa actual"""
    if current_user['id_rol'] != 2:  # Solo empresas
        return jsonify({
            'success': False,
            'message': 'Solo las empresas pueden ver la lista de empleados'
        }), 403

    result = TareasService.get_empleados_empresa(current_user['user_id'])
    return jsonify(result)

@tareas_bp.route('/dashboard/recientes', methods=['GET'])
@token_required
def get_tareas_recientes_dashboard(current_user):
    """Obtiene las tareas recientes para el dashboard"""
    if current_user['id_rol'] != 3:  # Solo empleados
        return jsonify({
            'success': False,
            'message': 'Solo los empleados pueden ver sus tareas recientes'
        }), 403

    limit = request.args.get('limit', 5, type=int)
    tareas = TareasService.get_tareas_recientes_empleado(current_user['user_id'], limit)

    return jsonify({
        'success': True,
        'tareas': tareas
    })

@tareas_bp.route('/categorias', methods=['GET'])
@token_required
def get_categorias_tareas(current_user):
    """Obtiene todas las categorías de tareas disponibles"""
    result = TareasService.get_categorias_tareas()
    return jsonify(result)