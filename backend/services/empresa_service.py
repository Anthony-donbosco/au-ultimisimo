"""
Servicios específicos para el rol EMPRESA
Gestión de empleados y aprobación de gastos
"""

import logging
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, date

from models.user import User
from models.financial_base import Gasto, EstadoAprobacion
from services.financial_service import gasto_service
from utils.database import db_manager
from utils.auth import hash_password

logger = logging.getLogger(__name__)

class EmpresaService:
    """Servicio para operaciones específicas de empresa"""
    
    def __init__(self):
        self.ROL_EMPRESA = 2
        self.ROL_EMPLEADO = 3
    
    def crear_empleado(self, empresa_id: int, datos_empleado: Dict[str, Any]) -> tuple[bool, str, Optional[User]]:
        """
        Crear un empleado asociado a la empresa
        
        Args:
            empresa_id: ID de la empresa que crea el empleado
            datos_empleado: Datos del empleado a crear
            
        Returns:
            tuple: (success, message, user_object)
        """
        try:
            # Validar que el usuario sea empresa
            empresa = User.find_by_id(empresa_id)
            if not empresa or empresa.id_rol != self.ROL_EMPRESA:
                return False, "Solo las empresas pueden crear empleados", None
            
            # Validar datos requeridos
            required_fields = ['username', 'email', 'password']
            for field in required_fields:
                if not datos_empleado.get(field):
                    return False, f"Campo {field} es requerido", None
            
            # Crear empleado con rol específico
            success, message, empleado = User.create_user(
                username=datos_empleado['username'],
                email=datos_empleado['email'],
                password=datos_empleado['password'],
                first_name=datos_empleado.get('first_name'),
                last_name=datos_empleado.get('last_name'),
                phone_number=datos_empleado.get('phone_number'),
                id_rol=self.ROL_EMPLEADO,  # Rol empleado
                created_by_empresa_id=empresa_id,  # Vinculado a la empresa
                is_verified=True  # Los empleados se crean verificados
            )
            
            if not success:
                return False, message, None
            
            # Si hay datos adicionales de empleado, guardarlos
            if any(key in datos_empleado for key in ['puesto', 'sueldo', 'fecha_contratacion']):
                self._crear_detalles_empleado(empleado.id, datos_empleado)
            
            logger.info(f"Empleado {empleado.username} creado por empresa {empresa_id}")
            return True, "Empleado creado exitosamente", empleado
            
        except Exception as e:
            logger.error(f"Error creando empleado: {e}")
            return False, "Error interno creando empleado", None

    def eliminar_empleado(self, empleado_id: int, empresa_id: int) -> tuple[bool, str]:
        """
        Elimina permanentemente un empleado (hard delete) y sus detalles,
        verificando que pertenece a la empresa.
        """
        try:
            # Se utiliza una transacción para asegurar que ambas eliminaciones ocurran o ninguna.
            with db_manager.get_db_cursor(commit=False) as (cursor, connection):
                try:
                    # Primero, verificar que el empleado pertenece a la empresa antes de borrar.
                    check_query = "SELECT id FROM users WHERE id = %s AND created_by_empresa_id = %s AND id_rol = %s"
                    cursor.execute(check_query, (empleado_id, empresa_id, self.ROL_EMPLEADO))
                    if cursor.fetchone() is None:
                        connection.rollback()
                        return False, "Empleado no encontrado o no tienes permiso para eliminarlo."

                    # Borrar de la tabla de detalles (si existe)
                    delete_details_query = "DELETE FROM empleados_details WHERE user_id = %s"
                    cursor.execute(delete_details_query, (empleado_id,))
                    
                    # Borrar de la tabla principal de usuarios
                    delete_user_query = "DELETE FROM users WHERE id = %s"
                    cursor.execute(delete_user_query, (empleado_id,))
                    
                    connection.commit()
                    
                    logger.info(f"Empleado {empleado_id} eliminado permanentemente por empresa {empresa_id}")
                    return True, "Empleado eliminado correctamente."

                except Exception as e:
                    connection.rollback()
                    logger.error(f"Error en transacción al eliminar empleado {empleado_id}: {e}")
                    raise e

        except Exception as e:
            logger.error(f"Error eliminando empleado {empleado_id}: {e}")
            return False, "Error interno al eliminar el empleado."

    def _crear_detalles_empleado(self, empleado_id: int, datos: Dict[str, Any]):
        """Crear detalles adicionales del empleado en la tabla empleados_details"""
        try:
            query = """
                INSERT INTO empleados_details 
                (user_id, puesto, sueldo, fecha_contratacion, telefono, direccion, notas)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                empleado_id,
                datos.get('puesto'),
                datos.get('sueldo'),
                datos.get('fecha_contratacion'),
                datos.get('telefono'),
                datos.get('direccion'),
                datos.get('notas')
            )
            
            db_manager.execute_query(query, params)
            logger.info(f"Detalles de empleado creados para user_id: {empleado_id}")
            
        except Exception as e:
            logger.error(f"Error creando detalles de empleado: {e}")
            # No fallar la creación del empleado por esto
    
    def get_empleados(self, empresa_id: int) -> List[Dict[str, Any]]:
        """
        Obtener todos los empleados de una empresa
        
        Args:
            empresa_id: ID de la empresa
            
        Returns:
            List: Lista de empleados con sus detalles
        """
        try:
            query = """
                SELECT 
                    u.id, u.username, u.email, u.first_name, u.last_name,
                    u.phone_number, u.is_active, u.created_at,
                    ed.puesto, ed.sueldo, ed.fecha_contratacion, ed.notas
                FROM users u
                LEFT JOIN empleados_details ed ON u.id = ed.user_id
                WHERE u.created_by_empresa_id = %s AND u.id_rol = %s
                ORDER BY u.created_at DESC
            """
            
            results = db_manager.fetch_all(query, (empresa_id, self.ROL_EMPLEADO))
            
            empleados = []
            for row in results:
                empleados.append({
                    'id': row['id'],
                    'username': row['username'],
                    'email': row['email'],
                    'firstName': row['first_name'],
                    'lastName': row['last_name'],
                    'phoneNumber': row['phone_number'],
                    'isActive': bool(row['is_active']),
                    'createdAt': row['created_at'].isoformat() if row['created_at'] else None,
                    'puesto': row['puesto'],
                    'sueldo': float(row['sueldo']) if row['sueldo'] else None,
                    'fechaContratacion': row['fecha_contratacion'].isoformat() if row['fecha_contratacion'] else None,
                    'notas': row['notas']
                })
            
            logger.info(f"Obtenidos {len(empleados)} empleados para empresa {empresa_id}")
            return empleados
            
        except Exception as e:
            logger.error(f"Error obteniendo empleados: {e}")
            return []
    
    def get_gastos_pendientes_aprobacion(self, empresa_id: int) -> List[Dict[str, Any]]:
        """
        Obtener gastos pendientes de aprobación de todos los empleados
        
        Args:
            empresa_id: ID de la empresa
            
        Returns:
            List: Gastos pendientes con información del empleado
        """
        try:
            query = """
                SELECT 
                    g.id, g.concepto, g.descripcion, g.monto, g.fecha,
                    g.proveedor, g.ubicacion, g.adjunto_url, g.notas,
                    g.created_at, g.user_id,
                    u.username as empleado_username,
                    u.first_name as empleado_first_name,
                    u.last_name as empleado_last_name,
                    cm.nombre as categoria_nombre,
                    cm.color as categoria_color,
                    tp.nombre as tipo_pago_nombre
                FROM gastos g
                JOIN users u ON g.user_id = u.id
                JOIN categorias_movimientos cm ON g.categoria_id = cm.id
                JOIN tipos_pago tp ON g.tipo_pago_id = tp.id
                WHERE u.created_by_empresa_id = %s 
                  AND g.requiere_aprobacion = 1
                  AND g.estado_aprobacion_id = 1
                ORDER BY g.created_at ASC
            """
            
            results = db_manager.fetch_all(query, (empresa_id,))
            
            gastos_pendientes = []
            for row in results:
                gastos_pendientes.append({
                    'id': row['id'],
                    'concepto': row['concepto'],
                    'descripcion': row['descripcion'],
                    'monto': float(row['monto']),
                    'fecha': row['fecha'].isoformat(),
                    'proveedor': row['proveedor'],
                    'ubicacion': row['ubicacion'],
                    'adjuntoUrl': row['adjunto_url'],
                    'notas': row['notas'],
                    'createdAt': row['created_at'].isoformat(),
                    'empleado': {
                        'id': row['user_id'],
                        'username': row['empleado_username'],
                        'firstName': row['empleado_first_name'],
                        'lastName': row['empleado_last_name']
                    },
                    'categoria': {
                        'nombre': row['categoria_nombre'],
                        'color': row['categoria_color']
                    },
                    'tipoPago': {
                        'nombre': row['tipo_pago_nombre']
                    }
                })
            
            logger.info(f"Obtenidos {len(gastos_pendientes)} gastos pendientes para empresa {empresa_id}")
            return gastos_pendientes
            
        except Exception as e:
            logger.error(f"Error obteniendo gastos pendientes: {e}")
            return []
    
    def aprobar_gasto(self, empresa_id: int, gasto_id: int, comentario: str = "") -> tuple[bool, str]:
        """
        Aprobar un gasto de empleado
        
        Args:
            empresa_id: ID de la empresa que aprueba
            gasto_id: ID del gasto a aprobar
            comentario: Comentario opcional de la aprobación
            
        Returns:
            tuple: (success, message)
        """
        try:
            # Validar que el gasto pertenezca a un empleado de esta empresa
            query_validacion = """
                SELECT g.id, g.user_id, u.created_by_empresa_id 
                FROM gastos g
                JOIN users u ON g.user_id = u.id
                WHERE g.id = %s AND u.created_by_empresa_id = %s
                  AND g.estado_aprobacion_id = 1
            """
            
            gasto_info = db_manager.fetch_one(query_validacion, (gasto_id, empresa_id))
            if not gasto_info:
                return False, "Gasto no encontrado o ya procesado"
            
            # Aprobar el gasto
            query_aprobacion = """
                UPDATE gastos 
                SET estado_aprobacion_id = 2,
                    aprobado_por = %s,
                    fecha_aprobacion = NOW(),
                    notas = CONCAT(IFNULL(notas, ''), %s)
                WHERE id = %s
            """
            
            comentario_completo = f"\n[APROBADO] {comentario}" if comentario else "\n[APROBADO]"
            
            db_manager.execute_query(query_aprobacion, (empresa_id, comentario_completo, gasto_id))
            
            logger.info(f"Gasto {gasto_id} aprobado por empresa {empresa_id}")
            return True, "Gasto aprobado exitosamente"
            
        except Exception as e:
            logger.error(f"Error aprobando gasto: {e}")
            return False, "Error interno aprobando gasto"
    
    def rechazar_gasto(self, empresa_id: int, gasto_id: int, motivo: str = "") -> tuple[bool, str]:
        """
        Rechazar un gasto de empleado
        
        Args:
            empresa_id: ID de la empresa que rechaza
            gasto_id: ID del gasto a rechazar
            motivo: Motivo del rechazo
            
        Returns:
            tuple: (success, message)
        """
        try:
            # Validar que el gasto pertenezca a un empleado de esta empresa
            query_validacion = """
                SELECT g.id, g.user_id, u.created_by_empresa_id 
                FROM gastos g
                JOIN users u ON g.user_id = u.id
                WHERE g.id = %s AND u.created_by_empresa_id = %s
                  AND g.estado_aprobacion_id = 1
            """
            
            gasto_info = db_manager.fetch_one(query_validacion, (gasto_id, empresa_id))
            if not gasto_info:
                return False, "Gasto no encontrado o ya procesado"
            
            # Rechazar el gasto
            query_rechazo = """
                UPDATE gastos 
                SET estado_aprobacion_id = 3,
                    aprobado_por = %s,
                    fecha_aprobacion = NOW(),
                    notas = CONCAT(IFNULL(notas, ''), %s)
                WHERE id = %s
            """
            
            motivo_completo = f"\n[RECHAZADO] {motivo}" if motivo else "\n[RECHAZADO]"
            
            db_manager.execute_query(query_rechazo, (empresa_id, motivo_completo, gasto_id))
            
            logger.info(f"Gasto {gasto_id} rechazado por empresa {empresa_id}")
            return True, "Gasto rechazado exitosamente"
            
        except Exception as e:
            logger.error(f"Error rechazando gasto: {e}")
            return False, "Error interno rechazando gasto"
    
    def get_dashboard_empresa(self, empresa_id: int) -> Dict[str, Any]:
        """
        Obtener datos del dashboard para empresa
        
        Args:
            empresa_id: ID de la empresa
            
        Returns:
            Dict: Datos del dashboard empresarial
        """
        try:
            # Contar gastos pendientes
            query_pendientes = """
                SELECT COUNT(*) as total
                FROM gastos g
                JOIN users u ON g.user_id = u.id
                WHERE u.created_by_empresa_id = %s 
                  AND g.requiere_aprobacion = 1
                  AND g.estado_aprobacion_id = 1
            """
            result_pendientes = db_manager.fetch_one(query_pendientes, (empresa_id,))
            gastos_pendientes = result_pendientes['total'] if result_pendientes else 0
            
            # Total de empleados
            query_empleados = """
                SELECT COUNT(*) as total
                FROM users 
                WHERE created_by_empresa_id = %s AND id_rol = %s AND is_active = 1
            """
            result_empleados = db_manager.fetch_one(query_empleados, (empresa_id, self.ROL_EMPLEADO))
            total_empleados = result_empleados['total'] if result_empleados else 0
            
            # Gastos del mes actual por empleado
            query_gastos_mes = """
                SELECT 
                    u.username,
                    COALESCE(SUM(CASE WHEN g.estado_aprobacion_id = 2 THEN g.monto ELSE 0 END), 0) as gastos_aprobados,
                    COUNT(CASE WHEN g.estado_aprobacion_id = 1 THEN 1 END) as pendientes
                FROM users u
                LEFT JOIN gastos g ON u.id = g.user_id 
                    AND MONTH(g.fecha) = MONTH(CURRENT_DATE())
                    AND YEAR(g.fecha) = YEAR(CURRENT_DATE())
                WHERE u.created_by_empresa_id = %s AND u.id_rol = %s
                GROUP BY u.id, u.username
                ORDER BY gastos_aprobados DESC
            """
            gastos_por_empleado = db_manager.fetch_all(query_gastos_mes, (empresa_id, self.ROL_EMPLEADO))
            
            return {
                'gastosPendientes': gastos_pendientes,
                'totalEmpleados': total_empleados,
                'gastosPorEmpleado': [
                    {
                        'empleado': row['username'],
                        'gastosAprobados': float(row['gastos_aprobados']),
                        'gastosPendientes': row['pendientes']
                    }
                    for row in gastos_por_empleado
                ]
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo dashboard empresa: {e}")
            return {
                'gastosPendientes': 0,
                'totalEmpleados': 0,
                'gastosPorEmpleado': []
            }

# Instancia global del servicio
empresa_service = EmpresaService()