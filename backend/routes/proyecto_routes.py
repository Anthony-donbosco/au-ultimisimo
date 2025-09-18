"""
Rutas API para gestión de proyectos
Endpoints para empresas y administradores
"""

from flask import Blueprint, request, jsonify
from utils.auth import token_required
from services.proyecto_service import proyecto_service

# Definir roles
ROL_EMPRESA = 2
ROL_ADMIN = 1

def require_role(*allowed_roles):
    """Decorador para verificar roles específicos"""
    def decorator(f):
        @token_required
        def decorated_function(current_user, *args, **kwargs):
            if current_user['id_rol'] not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': 'No tienes permisos para acceder a este recurso'
                }), 403
            return f(current_user, *args, **kwargs)
        decorated_function.__name__ = f.__name__
        return decorated_function
    return decorator

proyecto_bp = Blueprint('proyecto_bp', __name__, url_prefix='/api/proyectos')

# ============================================================================
# ENDPOINTS PARA PROYECTOS
# ============================================================================

@proyecto_bp.route('/', methods=['GET'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def get_proyectos(current_user):
    """Obtener proyectos según el rol del usuario"""
    try:
        proyectos = proyecto_service.get_proyectos_usuario(current_user['user_id'])
        return jsonify({
            'success': True,
            'proyectos': proyectos
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error obteniendo proyectos'
        }), 500

@proyecto_bp.route('/', methods=['POST'])
@require_role(ROL_EMPRESA)
def crear_proyecto(current_user):
    """Crear un nuevo proyecto (solo empresas)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Datos requeridos'
            }), 400

        success, message, proyecto_data = proyecto_service.crear_proyecto(
            current_user['user_id'], data
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message,
            'proyecto': proyecto_data
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno creando proyecto'
        }), 500

@proyecto_bp.route('/<int:proyecto_id>', methods=['GET'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def get_proyecto_detalle(current_user, proyecto_id):
    """Obtener detalles completos de un proyecto"""
    try:
        proyecto = proyecto_service.get_proyecto_detalle(
            proyecto_id, current_user['user_id']
        )

        if not proyecto:
            return jsonify({
                'success': False,
                'message': 'Proyecto no encontrado o sin permisos'
            }), 404

        return jsonify({
            'success': True,
            'proyecto': proyecto
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error obteniendo detalle del proyecto'
        }), 500

@proyecto_bp.route('/<int:proyecto_id>', methods=['PUT'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def actualizar_proyecto(current_user, proyecto_id):
    """Actualizar un proyecto existente"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Datos requeridos'
            }), 400

        success, message = proyecto_service.actualizar_proyecto(
            proyecto_id, current_user['user_id'], data
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno actualizando proyecto'
        }), 500


@proyecto_bp.route('/<int:proyecto_id>', methods=['DELETE'])
@require_role(ROL_EMPRESA)
def eliminar_proyecto(current_user, proyecto_id):
    """Eliminar un proyecto existente (solo empresas)"""
    try:
        success, message = proyecto_service.eliminar_proyecto(
            proyecto_id, current_user['user_id']
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400 # Puede ser 404 si no se encuentra o 403 sin permisos

        return jsonify({
            'success': True,
            'message': message
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno eliminando proyecto'
        }), 500
# ============================================================================
# ENDPOINTS PARA METAS
# ============================================================================

@proyecto_bp.route('/<int:proyecto_id>/metas', methods=['POST'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def agregar_meta(current_user, proyecto_id):
    """Agregar una nueva meta al proyecto"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Datos requeridos'
            }), 400

        success, message, meta_id = proyecto_service.agregar_meta(
            proyecto_id, current_user['user_id'], data
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message,
            'meta_id': meta_id
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno agregando meta'
        }), 500

@proyecto_bp.route('/metas/<int:meta_id>', methods=['PUT'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def actualizar_meta(current_user, meta_id):
    """Actualizar una meta existente"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Datos requeridos'
            }), 400

        success, message = proyecto_service.actualizar_meta(
            meta_id, current_user['user_id'], data
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno actualizando meta'
        }), 500

@proyecto_bp.route('/metas/<int:meta_id>/completar', methods=['POST'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def completar_meta(current_user, meta_id):
    """Marcar una meta como completada"""
    try:
        success, message = proyecto_service.completar_meta(
            meta_id, current_user['user_id']
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno completando meta'
        }), 500

# ============================================================================
# ENDPOINTS PARA GASTOS ECONÓMICOS
# ============================================================================

@proyecto_bp.route('/<int:proyecto_id>/gastos', methods=['POST'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def agregar_gasto(current_user, proyecto_id):
    """Agregar un gasto al proyecto"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Datos requeridos'
            }), 400

        success, message, gasto_id = proyecto_service.agregar_gasto(
            proyecto_id, current_user['user_id'], data
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message,
            'gasto_id': gasto_id
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno agregando gasto'
        }), 500

@proyecto_bp.route('/<int:proyecto_id>/gastos', methods=['GET'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def get_gastos_proyecto(current_user, proyecto_id):
    """Obtener gastos de un proyecto"""
    try:
        gastos = proyecto_service.get_gastos_proyecto(proyecto_id, current_user['user_id'])
        return jsonify({
            'success': True,
            'gastos': gastos
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error obteniendo gastos del proyecto'
        }), 500

@proyecto_bp.route('/<int:proyecto_id>/resumen-economico', methods=['GET'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def get_resumen_economico(current_user, proyecto_id):
    """Obtener resumen económico del proyecto"""
    try:
        resumen = proyecto_service.get_resumen_economico(proyecto_id, current_user['user_id'])
        return jsonify({
            'success': True,
            'resumen': resumen
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error obteniendo resumen económico'
        }), 500

@proyecto_bp.route('/gastos/<int:gasto_id>', methods=['PUT'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def actualizar_gasto(current_user, gasto_id):
    """Actualizar un gasto"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Datos requeridos'
            }), 400

        success, message = proyecto_service.actualizar_gasto(
            gasto_id, current_user['user_id'], data
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno actualizando gasto'
        }), 500

@proyecto_bp.route('/gastos/<int:gasto_id>', methods=['DELETE'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def eliminar_gasto(current_user, gasto_id):
    """Eliminar un gasto"""
    try:
        success, message = proyecto_service.eliminar_gasto(
            gasto_id, current_user['user_id']
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno eliminando gasto'
        }), 500

# ============================================================================
# ENDPOINTS AUXILIARES
# ============================================================================

@proyecto_bp.route('/estadisticas', methods=['GET'])
@require_role(ROL_EMPRESA)
def get_estadisticas(current_user):
    """Obtener estadísticas de proyectos de la empresa"""
    try:
        estadisticas = proyecto_service.get_estadisticas_empresa(current_user['user_id'])
        return jsonify({
            'success': True,
            'estadisticas': estadisticas
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error obteniendo estadísticas'
        }), 500

@proyecto_bp.route('/estados', methods=['GET'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def get_estados_proyecto(current_user):
    """Obtener todos los estados de proyecto disponibles"""
    try:
        estados = proyecto_service.get_estados_proyecto()
        return jsonify({
            'success': True,
            'estados': estados
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error obteniendo estados'
        }), 500

@proyecto_bp.route('/<int:proyecto_id>/recalcular-progreso', methods=['POST'])
@require_role(ROL_EMPRESA, ROL_ADMIN)
def recalcular_progreso(current_user, proyecto_id):
    """Forzar recálculo del progreso de un proyecto"""
    try:
        success, message = proyecto_service.recalcular_progreso_proyecto(
            proyecto_id, current_user['user_id']
        )

        if not success:
            return jsonify({
                'success': False,
                'message': message
            }), 400

        return jsonify({
            'success': True,
            'message': message
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error interno recalculando progreso'
        }), 500

# ============================================================================
# ENDPOINTS PARA ADMINISTRADORES
# ============================================================================

@proyecto_bp.route('/admin/todos', methods=['GET'])
@require_role(ROL_ADMIN)
def get_todos_proyectos_admin(current_user):
    """Obtener todos los proyectos (solo administradores)"""
    try:
        from utils.database import db_manager

        query = """
            SELECT
                p.id, p.titulo, p.descripcion, p.fecha_inicio, p.fecha_limite,
                p.fecha_completado, p.progreso_porcentaje, p.prioridad,
                p.presupuesto, p.created_at, p.updated_at,
                ep.nombre as estado_nombre, ep.codigo as estado_codigo,
                ep.color as estado_color,
                empresa.username as empresa_nombre,
                empresa.email as empresa_email,
                creator.username as creado_por_username,
                (SELECT COUNT(*) FROM proyecto_metas WHERE proyecto_id = p.id) as total_metas,
                (SELECT COUNT(*) FROM proyecto_metas WHERE proyecto_id = p.id AND completado = TRUE) as metas_completadas
            FROM proyectos p
            JOIN estados_proyecto ep ON p.estado_id = ep.id
            JOIN users empresa ON p.empresa_id = empresa.id
            JOIN users creator ON p.created_by = creator.id
            WHERE empresa.id_rol = 2
            ORDER BY p.updated_at DESC
        """

        results = db_manager.fetch_all(query)

        proyectos = []
        for row in results:
            proyectos.append({
                'id': row['id'],
                'titulo': row['titulo'],
                'descripcion': row['descripcion'],
                'fechaInicio': row['fecha_inicio'].isoformat() if row['fecha_inicio'] else None,
                'fechaLimite': row['fecha_limite'].isoformat() if row['fecha_limite'] else None,
                'fechaCompletado': row['fecha_completado'].isoformat() if row['fecha_completado'] else None,
                'progresoporcentaje': float(row['progreso_porcentaje']),
                'prioridad': row['prioridad'],
                'presupuesto': float(row['presupuesto']),
                'creadoEn': row['created_at'].isoformat(),
                'actualizadoEn': row['updated_at'].isoformat(),
                'estado': {
                    'nombre': row['estado_nombre'],
                    'codigo': row['estado_codigo'],
                    'color': row['estado_color']
                },
                'empresa': {
                    'nombre': row['empresa_nombre'],
                    'email': row['empresa_email']
                },
                'creadoPor': row['creado_por_username'],
                'estadisticas': {
                    'totalMetas': row['total_metas'],
                    'metasCompletadas': row['metas_completadas']
                }
            })

        return jsonify({
            'success': True,
            'proyectos': proyectos
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error obteniendo proyectos'
        }), 500

@proyecto_bp.route('/admin/empresa/<int:empresa_id>', methods=['GET'])
@require_role(ROL_ADMIN)
def get_proyectos_empresa_admin(current_user, empresa_id):
    """Obtener proyectos de una empresa específica (solo administradores)"""
    try:
        proyectos = proyecto_service.repository.get_proyectos_empresa(empresa_id)
        estadisticas = proyecto_service.repository.get_estadisticas_empresa(empresa_id)

        return jsonify({
            'success': True,
            'proyectos': proyectos,
            'estadisticas': estadisticas
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error obteniendo proyectos de la empresa'
        }), 500

# Error handlers específicos para este blueprint
@proyecto_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Recurso no encontrado'
    }), 404

@proyecto_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Error interno del servidor'
    }), 500