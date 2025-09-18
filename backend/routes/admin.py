# Reemplazar el contenido de: src/routes/admin.py

from flask import Blueprint, request, jsonify
from functools import wraps
import logging

from utils.auth import token_required, create_response
from models.user import User
from utils.database import db_manager
from utils.security import SecurityUtils
from utils.email import send_generic_code


from utils.action_verification import ActionVerificationManager
import json

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')

# --- Decorador de Seguridad: Solo para Admins ---
def log_audit(user_id, action, target_type=None, target_id=None, details=None):
    try:
        query = """
            INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
            VALUES (%s, %s, %s, %s, %s)
        """
        # Convertir details a JSON string si es un dict
        details_json = json.dumps(details) if isinstance(details, dict) else None
        db_manager.execute_query(query, (user_id, action, target_type, target_id, details_json))
    except Exception as e:
        logger.error(f"Error al registrar en auditoría: {e}")


def admin_required(f):
    """
    Verifica que el usuario autenticado tenga el rol de administrador.
    id_rol = 1 para 'administrador'
    """
    @wraps(f)
    def decorated_function(current_user, *args, **kwargs):
        if not current_user or current_user.get('id_rol') != 1:
            logger.warning(f"Acceso denegado: Usuario {current_user.get('user_id')} no es admin.")
            return create_response(False, "Acceso denegado. Se requiere rol de administrador.", status_code=403)
        return f(current_user, *args, **kwargs)
    return decorated_function

# --- Endpoint para Estadísticas del Dashboard ---
@admin_bp.route('/stats', methods=['GET'])
@token_required
@admin_required
def get_dashboard_stats(current_user):
    try:
        # Total de usuarios
        users_count = db_manager.fetch_one("SELECT COUNT(*) as total FROM users")['total']
        
        # Balance total (suma de todos los ingresos menos todos los gastos)
        total_ingresos = db_manager.fetch_one("SELECT SUM(monto) as total FROM ingresos")['total'] or 0
        total_gastos = db_manager.fetch_one("SELECT SUM(monto) as total FROM gastos")['total'] or 0
        total_balance = float(total_ingresos) - float(total_gastos)
        
        stats = {
            'totalUsers': users_count,
            'totalBalance': total_balance,
        }
        return create_response(True, "Estadísticas obtenidas", stats)
    except Exception as e:
        logger.error(f"Error obteniendo stats del dashboard: {e}")
        return create_response(False, "Error interno", status_code=500)

# --- Endpoint para Actividad Reciente ---
@admin_bp.route('/recent-activity', methods=['GET'])
@token_required
@admin_required
def get_recent_activity(current_user):
    try:
        query = """
            SELECT u.email, al.action, al.details, al.created_at
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 5
        """
        activities = db_manager.fetch_all(query)
        # Convertir created_at a string ISO para JSON
        for activity in activities:
            activity['created_at'] = activity['created_at'].isoformat()
            if activity.get('details'):
                activity['details'] = json.loads(activity['details']) # Convertir string JSON a dict

        return create_response(True, "Actividad reciente obtenida", {'activities': activities})
    except Exception as e:
        logger.error(f"Error obteniendo actividad reciente: {e}")
        return create_response(False, "Error interno", status_code=500)


# --- Actualizar la función de cambiar estado para que registre la auditoría ---
@admin_bp.route('/users/<int:user_id>/status', methods=['PUT'])
@token_required
@admin_required
def update_user_status(current_user, user_id):
    """
    Actualiza el estado de un usuario. Si la acción es 'banned', requiere código de verificación.
    """
    try:
        data = request.get_json()
        new_status = data.get('status')

        if not new_status or new_status not in ['active', 'suspended', 'banned']:
            return create_response(False, "El estado proporcionado no es válido.", status_code=400)

        if new_status == 'banned':
            verification_code = data.get('verificationCode')
            if not verification_code:
                return create_response(False, "Se requiere un código de verificación para esta acción.", status_code=403)

            is_valid = ActionVerificationManager.verify_code(
                user_id=current_user['user_id'],
                action_type='BAN_USER',
                code=verification_code
            )
            
            if not is_valid:
                return create_response(False, "El código de verificación es inválido o ha expirado.", status_code=403)
        
        query = "UPDATE users SET status = %s, updated_at = NOW() WHERE id = %s"
        affected_rows = db_manager.execute_query(query, (new_status, user_id))

        if affected_rows == 0:
            return create_response(False, "Usuario no encontrado.", status_code=404)

        log_audit(
            current_user['user_id'],
            'USER_STATUS_CHANGED',
            target_type='User',
            target_id=user_id,
            details={'old_status': 'unknown', 'new_status': new_status}
        )

        return create_response(True, "El estado del usuario ha sido actualizado exitosamente.")

    except Exception as e:
        logger.error(f"Error al actualizar estado del usuario {user_id}: {e}")
        return create_response(False, "Ocurrió un error interno en el servidor.", status_code=500)


# --- Endpoint para Obtener Usuarios (Gestión de Usuarios) ---
@admin_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def get_users(current_user):
    """
    Obtiene una lista de usuarios con filtros y paginación.
    """
    try:
        search = request.args.get('search', '')
        status = request.args.get('status', 'all')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        offset = (page - 1) * limit

        query = "SELECT id, username, email, first_name, last_name, status, profile_picture FROM users WHERE id_rol = 4"
        params = []

        if search:
            query += " AND (username LIKE %s OR email LIKE %s OR first_name LIKE %s OR last_name LIKE %s)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param, search_param])

        if status != 'all':
            query += " AND status = %s"
            params.append(status)

        total_query = query.replace("SELECT id, username, email, first_name, last_name, status, profile_picture", "SELECT COUNT(*)")
        total_results = db_manager.fetch_one(total_query, tuple(params))
        total_users = total_results['COUNT(*)'] if total_results else 0

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        users = db_manager.fetch_all(query, tuple(params))

        return create_response(True, "Usuarios obtenidos", {
            'users': users,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_users,
                'totalPages': (total_users + limit - 1) // limit
            }
        })

    except Exception as e:
        logger.error(f"Error obteniendo usuarios: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@token_required
@admin_required
def get_user_by_id(current_user, user_id):
    try:
        user = db_manager.fetch_one(
            "SELECT id, username, email, first_name, last_name, status, id_rol FROM users WHERE id = %s",
            (user_id,)
        )
        if not user:
            return create_response(False, "Usuario no encontrado", status_code=404)
        
        return create_response(True, "Usuario obtenido", {'user': user})
    except Exception as e:
        logger.error(f"Error obteniendo usuario {user_id}: {e}")
        return create_response(False, "Error interno", status_code=500)

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
@admin_required
def update_user(current_user, user_id):
    data = request.get_json()
    
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    id_rol = int(data.get('roleId', 4))
    
    query = "UPDATE users SET first_name = %s, last_name = %s, id_rol = %s WHERE id = %s"
    params = (first_name, last_name, id_rol, user_id)
    
    affected_rows = db_manager.execute_query(query, params)

    if affected_rows == 0:
        return create_response(False, "Usuario no encontrado o sin cambios", status_code=404)
        
    return create_response(True, "Usuario actualizado exitosamente")

@admin_bp.route('/actions/initiate-verification', methods=['POST'])
@token_required
@admin_required
def initiate_action_verification(current_user):
    data = request.get_json()
    action_type = data.get('actionType')
    if not action_type:
        return create_response(False, "El tipo de acción (actionType) es requerido.", status_code=400)

    admin_id = current_user['user_id']
    admin_email = current_user['email']

    try:
        code = ActionVerificationManager.create_code(admin_id, action_type)
        send_generic_code(admin_email, code, "Confirma tu Acción")
        return create_response(True, f"Código de verificación enviado a {admin_email}")

    except Exception as e:
        logger.error(f"Error al iniciar verificación para admin {admin_id}: {e}")
        return create_response(False, "No se pudo generar el código de verificación.", status_code=500)

@admin_bp.route('/users/<int:user_id>/balance', methods=['GET'])
@token_required
@admin_required
def get_user_balance(current_user, user_id):
    try:
        ingresos_query = "SELECT SUM(monto) as total FROM ingresos WHERE user_id = %s"
        ingresos_result = db_manager.fetch_one(ingresos_query, (user_id,))
        total_ingresos = float(ingresos_result['total'] or 0)

        gastos_query = "SELECT SUM(monto) as total FROM gastos WHERE user_id = %s"
        gastos_result = db_manager.fetch_one(gastos_query, (user_id,))
        total_gastos = float(gastos_result['total'] or 0)

        balance_neto = total_ingresos - total_gastos

        user_query = "SELECT username, email, first_name, last_name FROM users WHERE id = %s"
        user_info = db_manager.fetch_one(user_query, (user_id,))

        if not user_info:
            return create_response(False, "Usuario no encontrado", status_code=404)

        balance_data = {
            'user_info': user_info,
            'total_ingresos': total_ingresos,
            'total_gastos': total_gastos,
            'balance_neto': balance_neto
        }

        return create_response(True, "Balance obtenido exitosamente", balance_data)

    except Exception as e:
        logger.error(f"Error obteniendo balance del usuario {user_id}: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)

@admin_bp.route('/users', methods=['POST'])
@token_required
@admin_required
def create_user_by_admin(current_user):
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    id_rol = int(data.get('roleId', 4))
    status = data.get('status', 'active')

    if not all([email, password, first_name]):
        return create_response(False, "Campos requeridos faltantes", status_code=400)
    
    if User.find_by_email(email):
        return create_response(False, "El email ya está en uso", status_code=409)

    success, message, user = User.create_user(
        username=email.split('@')[0],
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        id_rol=id_rol,
        is_verified=True,
        status=status
    )

    if not success:
        return create_response(False, message, status_code=500)
    
    return create_response(True, "Usuario creado exitosamente", {'user': user.to_dict()}, status_code=201)

# --- Endpoint para Gestión de Empresas ---
@admin_bp.route('/companies', methods=['GET'])
@token_required
@admin_required
def get_companies(current_user):
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 15))
        offset = (page - 1) * limit

        query = """
            SELECT id, username as name, email, first_name, last_name, created_at, status,
                   'Tecnología' as industry
            FROM users
            WHERE id_rol = 2
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        companies = db_manager.fetch_all(query, (limit, offset))

        formatted_companies = []
        for company in companies:
            formatted_companies.append({
                'id': company['id'],
                'name': company['first_name'] + ' ' + (company['last_name'] or '') if company['first_name'] else company['name'],
                'email': company['email'],
                'industry': company['industry'],
                'created_at': company['created_at'],
                'status': company['status']
            })

        total_query = "SELECT COUNT(*) as total FROM users WHERE id_rol = 2"
        total_results = db_manager.fetch_one(total_query)['total']

        return create_response(True, "Empresas obtenidas", {
            'companies': formatted_companies,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_results,
                'totalPages': (total_results + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Error obteniendo empresas: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)

# --- Endpoint para Reportes ---
@admin_bp.route('/reports/summary', methods=['GET'])
@token_required
@admin_required
def get_reports_summary(current_user):
    try:
        new_users_query = "SELECT COUNT(*) as total FROM users WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())"
        new_users_this_month = db_manager.fetch_one(new_users_query)['total']

        total_income_query = "SELECT SUM(monto) as total FROM ingresos"
        total_income = float(db_manager.fetch_one(total_income_query)['total'] or 0)

        total_expenses_query = "SELECT SUM(monto) as total FROM gastos"
        total_expenses = float(db_manager.fetch_one(total_expenses_query)['total'] or 0)

        summary = {
            'newUsersThisMonth': new_users_this_month,
            'totalIncomeProcessed': total_income,
            'totalExpensesProcessed': total_expenses,
            'bannedUsers': db_manager.fetch_one("SELECT COUNT(*) as total FROM users WHERE status = 'banned'")['total']
        }
        return create_response(True, "Resumen de reporte obtenido", summary)
    except Exception as e:
        logger.error(f"Error generando reporte: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)

# --- Endpoint para Configuraciones ---
@admin_bp.route('/settings', methods=['GET'])
@token_required
@admin_required
def get_settings(current_user):
    # En una app real, esto vendría de una tabla 'settings' en la BD.
    # Por ahora, simulamos la obtención de los valores.
    try:
        query = "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('session_timeout_minutes', 'enable_email_notifications')"
        settings_from_db = db_manager.fetch_all(query)
        
        settings = {
            'session_timeout_minutes': 60, # Default
            'enable_email_notifications': True # Default
        }
        for row in settings_from_db:
            key = row['setting_key']
            value = row['setting_value']
            if key == 'session_timeout_minutes':
                settings[key] = int(value)
            elif key == 'enable_email_notifications':
                settings[key] = value.lower() in ['true', '1']

        return create_response(True, "Configuraciones obtenidas", settings)
    except Exception as e:
        logger.error(f"Error obteniendo configuraciones: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)


@admin_bp.route('/settings', methods=['PUT'])
@token_required
@admin_required
def update_settings(current_user):
    data = request.get_json()
    # Aquí iría la lógica para guardar las configuraciones en la base de datos.
    # Usaremos una tabla 'system_settings' con (setting_key, setting_value)
    try:
        for key, value in data.items():
            # Query para insertar o actualizar la configuración
            query = """
                INSERT INTO system_settings (setting_key, setting_value)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            """
            db_manager.execute_query(query, (key, str(value)))

        log_audit(current_user['user_id'], 'SETTINGS_UPDATED', details=data)
        return create_response(True, "Configuraciones actualizadas exitosamente.")
    except Exception as e:
        logger.error(f"Error actualizando configuraciones: {e}")
        return create_response(False, "Error interno al guardar configuraciones", status_code=500)

# --- Endpoint para el Dashboard de una Empresa Específica ---
@admin_bp.route('/companies/<int:company_id>', methods=['GET'])
@token_required
@admin_required
def get_company_details(current_user, company_id):
    try:
        company_query = "SELECT id, username, email, first_name, last_name, created_at, status FROM users WHERE id = %s AND id_rol = 2"
        company = db_manager.fetch_one(company_query, (company_id,))

        if not company:
            return create_response(False, "Empresa no encontrada", status_code=404)

        company_name = company['first_name'] + ' ' + (company['last_name'] or '') if company['first_name'] else company['username']
        
        # CORRECCIÓN: Usar 'created_by_empresa_id' en lugar de 'company_id'
        employee_count_query = "SELECT COUNT(*) as total FROM users WHERE created_by_empresa_id = %s AND id_rol = 3"
        employee_count = db_manager.fetch_one(employee_count_query, (company_id,))['total']

        # Conteo real de proyectos (asumiendo una tabla `proyectos` con `empresa_id`)
        project_count_query = "SELECT COUNT(*) as total FROM proyectos WHERE empresa_id = %s"
        project_count = db_manager.fetch_one(project_count_query, (company_id,))['total']
        
        # Conteo real de tareas completadas
        completed_tasks_query = "SELECT COUNT(*) as total FROM tareas_asignadas t JOIN users u ON t.empresa_id = u.id WHERE u.id = %s AND t.estado_id = (SELECT id FROM estados_tarea WHERE codigo = 'completada')"
        completed_tasks = db_manager.fetch_one(completed_tasks_query, (company_id,))['total']


        formatted_company = {
            'id': company['id'],
            'name': company_name,
            'email': company['email'],
            'industry': 'Tecnología',
            'created_at': company['created_at'],
            'status': company['status'],
            'employeeCount': employee_count,
            'projectCount': project_count,
            'completedTasks': completed_tasks
        }

        return create_response(True, "Detalles de la empresa obtenidos", formatted_company)
    except Exception as e:
        logger.error(f"Error obteniendo detalles de la empresa {company_id}: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)

# --- Endpoint para los Empleados de una Empresa Específica ---
@admin_bp.route('/companies/<int:company_id>/employees', methods=['GET'])
@token_required
@admin_required
def get_company_employees(current_user, company_id):
    try:
        # CORRECCIÓN: Usar 'created_by_empresa_id' en lugar de 'company_id'
        query = "SELECT id, first_name, last_name, email, status FROM users WHERE id_rol = 3 AND created_by_empresa_id = %s ORDER BY first_name"
        employees = db_manager.fetch_all(query, (company_id,))
        return create_response(True, "Empleados obtenidos", {'employees': employees})
    except Exception as e:
        logger.error(f"Error obteniendo empleados: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)

# --- NUEVO Endpoint para eliminar un empleado de una empresa ---
@admin_bp.route('/companies/<int:company_id>/employees/<int:employee_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_company_employee(current_user, company_id, employee_id):
    """
    Elimina un empleado. En lugar de borrar el registro, lo desvincula
    de la empresa para mantener la integridad de los datos.
    """
    try:
        # CORRECCIÓN: Usar 'created_by_empresa_id' en lugar de 'company_id'
        # Cambiamos created_by_empresa_id a NULL para desvincularlo.
        query = "UPDATE users SET created_by_empresa_id = NULL WHERE id = %s AND created_by_empresa_id = %s AND id_rol = 3"
        affected_rows = db_manager.execute_query(query, (employee_id, company_id))

        if affected_rows == 0:
            return create_response(False, "Empleado no encontrado o no pertenece a esta empresa.", status_code=404)

        log_audit(
            current_user['user_id'],
            'EMPLOYEE_REMOVED',
            target_type='User',
            target_id=employee_id,
            details={'removed_from_company_id': company_id}
        )

        return create_response(True, "Empleado desvinculado de la empresa correctamente.")
    except Exception as e:
        logger.error(f"Error al eliminar empleado {employee_id} de la empresa {company_id}: {e}")
        return create_response(False, "Error interno del servidor.", status_code=500)

@admin_bp.route('/companies/<int:company_id>/sales', methods=['GET'])
@token_required
@admin_required
def get_company_sales(current_user, company_id):
    try:
        query = """
            SELECT v.id, v.fecha_venta, v.monto_total, p.nombre as producto_nombre, 
                   CONCAT(e.first_name, ' ', e.last_name) as empleado_nombre
            FROM ventas v
            JOIN productos p ON v.producto_id = p.id
            JOIN users e ON v.empleado_id = e.id
            WHERE v.empresa_id = %s
            ORDER BY v.fecha_venta DESC
        """
        sales = db_manager.fetch_all(query, (company_id,))
        for sale in sales:
            sale['fecha_venta'] = sale['fecha_venta'].isoformat()
        return create_response(True, "Ventas obtenidas", {'sales': sales})
    except Exception as e:
        logger.error(f"Error obteniendo ventas de la empresa {company_id}: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)

@admin_bp.route('/companies/<int:company_id>/tasks', methods=['GET'])
@token_required
@admin_required
def get_company_tasks(current_user, company_id):
    try:
        query = """
            SELECT t.id, t.titulo, t.fecha_limite, e.nombre as estado_nombre, e.color as estado_color,
                   p.nombre as prioridad_nombre
            FROM tareas_asignadas t
            JOIN estados_tarea e ON t.estado_id = e.id
            JOIN prioridades p ON t.prioridad_id = p.id
            WHERE t.empresa_id = %s
            ORDER BY t.fecha_limite ASC
        """
        tasks = db_manager.fetch_all(query, (company_id,))
        for task in tasks:
            if task['fecha_limite']:
                task['fecha_limite'] = task['fecha_limite'].isoformat()
        return create_response(True, "Tareas obtenidas", {'tasks': tasks})
    except Exception as e:
        logger.error(f"Error obteniendo tareas de la empresa {company_id}: {e}")
        return create_response(False, "Error interno del servidor", status_code=500)
