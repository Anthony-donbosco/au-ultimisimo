"""
Rutas específicas para los roles EMPRESA y EMPLEADO
Sistema de aprobación de gastos y gestión empresarial
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import logging

from services.empresa_service import empresa_service
from services.empleado_service import empleado_service
from utils.auth import token_required, create_response
from utils.security import SecurityUtils
from utils.database import db_manager
from models.user import User

logger = logging.getLogger(__name__)

# Crear blueprints separados
empresa_bp = Blueprint('empresa', __name__, url_prefix='/api/empresa')
empleado_bp = Blueprint('empleado', __name__, url_prefix='/api/empleado')


def require_role(required_role_id):
    """Decorator para verificar rol específico"""
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            if current_user.get('id_rol') != required_role_id:
                return create_response(
                    False,
                    "No tienes permisos para acceder a esta funcionalidad",
                    status_code=403
                )
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator


def handle_service_response(success, message, data=None, success_code=200, error_code=400):
    """Maneja respuestas de servicios de forma consistente"""
    if success:
        return create_response(True, message, data, success_code)
    else:
        return create_response(False, message, status_code=error_code)


# ============================================================================
# RUTAS DE EMPRESA (ROL 2)
# ============================================================================

@empresa_bp.route('/empleados', methods=['POST'])
@token_required
@require_role(2)  # Solo empresas
def crear_empleado(current_user):
    """Crear un nuevo empleado"""
    try:
        data = request.get_json()
        
        if not data:
            return create_response(False, "Datos requeridos", status_code=400)
        
        empresa_id = current_user['user_id']
        success, message, empleado = empresa_service.crear_empleado(empresa_id, data)
        
        if success:
            return create_response(
                True, 
                message, 
                {
                    'empleado': {
                        'id': empleado.id,
                        'username': empleado.username,
                        'email': empleado.email,
                        'firstName': empleado.first_name,
                        'lastName': empleado.last_name
                    }
                },
                201
            )
        else:
            return create_response(False, message, status_code=400)
            
    except Exception as e:
        logger.error(f"Error creando empleado: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empresa_bp.route('/empleados', methods=['GET'])
@token_required
@require_role(2)  # Solo empresas
def obtener_empleados(current_user):
    """Obtener lista de empleados de la empresa"""
    try:
        empresa_id = current_user['user_id']
        empleados = empresa_service.get_empleados(empresa_id)
        
        return create_response(
            True, 
            f"Se encontraron {len(empleados)} empleados",
            {'empleados': empleados}
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo empleados: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)

@empresa_bp.route('/empleados/<int:empleado_id>', methods=['DELETE'])
@token_required
@require_role(2) # Solo empresas
def eliminar_empleado(current_user, empleado_id):
    """Eliminar un empleado de la empresa"""
    try:
        empresa_id = current_user['user_id']
        success, message = empresa_service.eliminar_empleado(empleado_id, empresa_id)
        
        return handle_service_response(success, message)

    except Exception as e:
        logger.error(f"Error eliminando empleado: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empresa_bp.route('/gastos/pendientes', methods=['GET'])
@token_required
@require_role(2)  # Solo empresas
def obtener_gastos_pendientes(current_user):
    """Obtener gastos pendientes de aprobación"""
    try:
        empresa_id = current_user['user_id']
        gastos_pendientes = empresa_service.get_gastos_pendientes_aprobacion(empresa_id)
        
        return create_response(
            True,
            f"Se encontraron {len(gastos_pendientes)} gastos pendientes",
            {'gastosPendientes': gastos_pendientes}
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo gastos pendientes: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empresa_bp.route('/gastos/<int:gasto_id>/aprobar', methods=['POST'])
@token_required
@require_role(2)  # Solo empresas
def aprobar_gasto(current_user, gasto_id):
    """Aprobar un gasto de empleado"""
    try:
        data = request.get_json() or {}
        empresa_id = current_user['user_id']
        comentario = SecurityUtils.sanitize_input(data.get('comentario', ''))
        
        success, message = empresa_service.aprobar_gasto(empresa_id, gasto_id, comentario)
        
        return handle_service_response(success, message)
        
    except Exception as e:
        logger.error(f"Error aprobando gasto: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empresa_bp.route('/gastos/<int:gasto_id>/rechazar', methods=['POST'])
@token_required
@require_role(2)  # Solo empresas
def rechazar_gasto(current_user, gasto_id):
    """Rechazar un gasto de empleado"""
    try:
        data = request.get_json() or {}
        empresa_id = current_user['user_id']
        motivo = SecurityUtils.sanitize_input(data.get('motivo', ''))
        
        if not motivo:
            return create_response(False, "El motivo del rechazo es requerido", status_code=400)
        
        success, message = empresa_service.rechazar_gasto(empresa_id, gasto_id, motivo)
        
        return handle_service_response(success, message)
        
    except Exception as e:
        logger.error(f"Error rechazando gasto: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empresa_bp.route('/dashboard', methods=['GET'])
@token_required
@require_role(2)  # Solo empresas
def obtener_dashboard_empresa(current_user):
    """Obtener datos del dashboard empresarial"""
    try:
        empresa_id = current_user['user_id']
        dashboard_data = empresa_service.get_dashboard_empresa(empresa_id)
        
        return create_response(
            True,
            "Dashboard obtenido exitosamente",
            dashboard_data
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo dashboard empresa: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


# ============================================================================
# RUTAS DE EMPLEADO (ROL 3)
# ============================================================================

@empleado_bp.route('/gastos', methods=['POST'])
@token_required
@require_role(3)  # Solo empleados
def crear_gasto_empleado(current_user):
    """Crear gasto que requiere aprobación"""
    try:
        data = request.get_json()
        
        if not data:
            return create_response(False, "Datos requeridos", status_code=400)
        
        empleado_id = current_user['user_id']
        success, message, gasto_data = empleado_service.crear_gasto_con_aprobacion(empleado_id, data)
        
        if success:
            return create_response(True, message, gasto_data, 201)
        else:
            return create_response(False, message, status_code=400)
            
    except Exception as e:
        logger.error(f"Error creando gasto empleado: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empleado_bp.route('/gastos', methods=['GET'])
@token_required
@require_role(3)  # Solo empleados
def obtener_gastos_empleado(current_user):
    """Obtener gastos del empleado con estados de aprobación"""
    try:
        empleado_id = current_user['user_id']
        filtro_estado = request.args.get('estado', 'all')
        
        gastos = empleado_service.get_gastos_empleado(empleado_id, filtro_estado)
        
        return create_response(
            True,
            f"Se encontraron {len(gastos)} gastos",
            {
                'gastos': gastos,
                'filtroEstado': filtro_estado
            }
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo gastos empleado: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empleado_bp.route('/dashboard', methods=['GET'])
@token_required
@require_role(3)  # Solo empleados
def obtener_dashboard_empleado(current_user):
    """Obtener dashboard del empleado"""
    try:
        empleado_id = current_user['user_id']
        dashboard_data = empleado_service.get_dashboard_empleado(empleado_id)
        
        return create_response(
            True,
            "Dashboard obtenido exitosamente",
            dashboard_data
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo dashboard empleado: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empleado_bp.route('/empresa', methods=['GET'])
@token_required
@require_role(3)  # Solo empleados
def obtener_info_empresa(current_user):
    """Obtener información de la empresa del empleado"""
    try:
        empleado_id = current_user['user_id']
        empresa_info = empleado_service.get_empresa_info(empleado_id)
        
        if empresa_info:
            return create_response(
                True,
                "Información de empresa obtenida",
                {'empresa': empresa_info}
            )
        else:
            return create_response(
                False,
                "No se encontró información de la empresa",
                status_code=404
            )
            
    except Exception as e:
        logger.error(f"Error obteniendo info empresa: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empleado_bp.route('/historial-aprobaciones', methods=['GET'])
@token_required
@require_role(3)  # Solo empleados
def obtener_historial_aprobaciones(current_user):
    """Obtener historial de aprobaciones del empleado"""
    try:
        empleado_id = current_user['user_id']
        limite = int(request.args.get('limite', 20))
        
        historial = empleado_service.get_historial_aprobaciones(empleado_id, limite)
        
        return create_response(
            True,
            f"Historial obtenido: {len(historial)} registros",
            {'historial': historial}
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo historial: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empleado_bp.route('/categorias', methods=['GET'])
@token_required
@require_role(3)  # Solo empleados
def obtener_categorias_gastos(current_user):
    """Obtener categorías disponibles para gastos de empleados"""
    try:
        # Obtener categorías válidas para gastos (tipo_movimiento_id = 2 o 3)
        query = """
            SELECT cm.id, cm.nombre, cm.color, cm.tipo_movimiento_id
            FROM categorias_movimientos cm
            WHERE cm.tipo_movimiento_id IN (2, 3)
            ORDER BY cm.nombre
        """

        categorias_raw = db_manager.fetch_all(query)

        categorias = []
        if categorias_raw:
            for cat in categorias_raw:
                categorias.append({
                    'id': cat['id'],
                    'nombre': cat['nombre'],
                    'color': cat['color'] or '#6C757D'
                })

        return create_response(
            True,
            f"{len(categorias)} categorias disponibles",
            {'categorias': categorias}
        )

    except Exception as e:
        return create_response(False, f"Error: {str(e)}", status_code=500)


@empleado_bp.route('/tipos-pago', methods=['GET'])
@token_required
@require_role(3)  # Solo empleados
def obtener_tipos_pago(current_user):
    """Obtener tipos de pago disponibles para empleados"""
    try:
        # Obtener todos los tipos de pago disponibles
        query = """
            SELECT id, nombre, icono
            FROM tipos_pago
            ORDER BY nombre
        """

        tipos_raw = db_manager.fetch_all(query)

        tipos_pago = []
        if tipos_raw:
            for tipo in tipos_raw:
                tipos_pago.append({
                    'id': tipo['id'],
                    'nombre': tipo['nombre'],
                    'icono': tipo['icono'] or 'cash'
                })

        return create_response(
            True,
            f"{len(tipos_pago)} tipos de pago disponibles",
            {'tipos_pago': tipos_pago}
        )

    except Exception as e:
        return create_response(False, f"Error: {str(e)}", status_code=500)


# ============================================================================
# RUTAS DE VENTAS PARA EMPRESA
# ============================================================================

@empresa_bp.route('/ventas', methods=['GET'])
@token_required
@require_role(2)  # Solo empresas
def obtener_ventas_empresa(current_user):
    """Obtener todas las ventas de los empleados de la empresa"""
    try:
        from services.ventas_service import ventas_service

        empresa_id = current_user['user_id']

        # Filtros opcionales
        filtros = {}
        if request.args.get('fecha_desde'):
            filtros['fecha_desde'] = request.args.get('fecha_desde')
        if request.args.get('fecha_hasta'):
            filtros['fecha_hasta'] = request.args.get('fecha_hasta')
        if request.args.get('empleado_id'):
            filtros['empleado_id'] = int(request.args.get('empleado_id'))
        if request.args.get('producto_id'):
            filtros['producto_id'] = int(request.args.get('producto_id'))

        ventas = ventas_service.get_ventas_empresa(empresa_id, filtros)

        return create_response(
            True,
            f"Se encontraron {len(ventas)} ventas",
            {'ventas': ventas}
        )

    except Exception as e:
        logger.error(f"Error obteniendo ventas de empresa: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empresa_bp.route('/ventas/resumen', methods=['GET'])
@token_required
@require_role(2)  # Solo empresas
def obtener_resumen_ventas_empresa(current_user):
    """Obtener resumen de ventas de la empresa"""
    try:
        from services.ventas_service import ventas_service

        empresa_id = current_user['user_id']
        resumen = ventas_service.get_resumen_ventas_empresa(empresa_id)

        return create_response(
            True,
            "Resumen de ventas obtenido exitosamente",
            resumen
        )

    except Exception as e:
        logger.error(f"Error obteniendo resumen de ventas de empresa: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


# ============================================================================
# RUTAS DE VENTAS PARA EMPLEADO
# ============================================================================

@empleado_bp.route('/ventas', methods=['GET'])
@token_required
@require_role(3)  # Solo empleados
def obtener_ventas_empleado(current_user):
    """Obtener ventas del empleado"""
    try:
        from services.ventas_service import ventas_service

        empleado_id = current_user['user_id']

        # Filtros opcionales
        filtros = {}
        if request.args.get('fecha_desde'):
            filtros['fecha_desde'] = request.args.get('fecha_desde')
        if request.args.get('fecha_hasta'):
            filtros['fecha_hasta'] = request.args.get('fecha_hasta')
        if request.args.get('producto_id'):
            filtros['producto_id'] = int(request.args.get('producto_id'))

        ventas = ventas_service.get_ventas_empleado(empleado_id, filtros)

        return create_response(
            True,
            f"Se encontraron {len(ventas)} ventas",
            {'ventas': ventas}
        )

    except Exception as e:
        logger.error(f"Error obteniendo ventas del empleado: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@empleado_bp.route('/ventas/resumen', methods=['GET'])
@token_required
@require_role(3)  # Solo empleados
def obtener_resumen_ventas_empleado(current_user):
    """Obtener resumen de ventas del empleado"""
    try:
        from services.ventas_service import ventas_service

        empleado_id = current_user['user_id']
        resumen = ventas_service.get_resumen_ventas_empleado(empleado_id)

        return create_response(
            True,
            "Resumen de ventas obtenido exitosamente",
            resumen
        )

    except Exception as e:
        logger.error(f"Error obteniendo resumen de ventas del empleado: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


# ============================================================================
# ENDPOINTS COMPARTIDOS / UTILITARIOS
# ============================================================================

@empresa_bp.route('/test', methods=['GET'])
@token_required
@require_role(2)
def test_empresa(current_user):
    """Test endpoint para empresa"""
    return create_response(
        True,
        "API de empresa funcionando correctamente",
        {
            'usuario': current_user['username'],
            'rol': 'empresa',
            'timestamp': str(datetime.now())
        }
    )


@empleado_bp.route('/test', methods=['GET'])
@token_required
@require_role(3)
def test_empleado(current_user):
    """Test endpoint para empleado"""
    return create_response(
        True,
        "API de empleado funcionando correctamente",
        {
            'usuario': current_user['username'],
            'rol': 'empleado',
            'timestamp': str(datetime.now())
        }
    )


# ============================================================================
# ENDPOINTS DE ADMINISTRACIÓN (ROL 1)
# ============================================================================

@empresa_bp.route('/admin/stats', methods=['GET'])
@token_required
@require_role(1)  # Solo administradores
def obtener_estadisticas_admin(current_user):
    """Obtener estadísticas generales del sistema para admin"""
    try:
        from utils.database import db_manager
        
        # Estadísticas generales
        stats = {}
        
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Total de empresas
            cursor.execute("SELECT COUNT(*) FROM users WHERE id_rol = 2")
            stats['totalEmpresas'] = cursor.fetchone()[0]
            
            # Total de empleados
            cursor.execute("SELECT COUNT(*) FROM users WHERE id_rol = 3")
            stats['totalEmpleados'] = cursor.fetchone()[0]
            
            # Gastos pendientes en todo el sistema
            cursor.execute("SELECT COUNT(*) FROM gastos WHERE estado_aprobacion_id = 1")
            stats['gastosPendientesTotal'] = cursor.fetchone()[0]
            
            # Gastos del mes actual
            cursor.execute("""
                SELECT COUNT(*), COALESCE(SUM(monto), 0)
                FROM gastos 
                WHERE MONTH(fecha) = MONTH(CURRENT_DATE())
                  AND YEAR(fecha) = YEAR(CURRENT_DATE())
                  AND estado_aprobacion_id = 2
            """)
            result = cursor.fetchone()
            stats['gastosDelMes'] = {
                'cantidad': result[0],
                'total': float(result[1])
            }
        
        return create_response(
            True,
            "Estadísticas obtenidas exitosamente",
            stats
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas admin: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


# Registrar blueprints - esto se hace en app.py
__all__ = ['empresa_bp', 'empleado_bp']