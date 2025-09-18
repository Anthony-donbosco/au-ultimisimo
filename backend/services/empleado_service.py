"""
Servicios específicos para el rol EMPLEADO
Gestión de gastos con aprobación requerida
"""

import logging
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, date

from models.user import User
from models.financial_base import Gasto
from services.financial_service import gasto_service
from utils.database import db_manager
from utils.security import SecurityUtils

logger = logging.getLogger(__name__)

class EmpleadoService:
    """Servicio para operaciones específicas de empleado"""
    
    def __init__(self):
        self.ROL_EMPLEADO = 3
        self.ROL_EMPRESA = 2
    
    def crear_gasto_con_aprobacion(self, empleado_id: int, datos_gasto: Dict[str, Any]) -> tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Crea un gasto y asigna el estado de aprobación según el monto.
        """
        try:
            # 1. Validaciones iniciales
            empleado = User.find_by_id(empleado_id)
            if not empleado or empleado.id_rol != self.ROL_EMPLEADO:
                return False, "Solo los empleados pueden usar esta función", None
            
            if not empleado.created_by_empresa_id:
                return False, "Empleado no está asociado a ninguna empresa", None
            
            required_fields = ['categoria_id', 'tipo_pago_id', 'concepto', 'monto', 'fecha']
            for field in required_fields:
                if field not in datos_gasto or datos_gasto[field] is None:
                    return False, f"Campo '{field}' es requerido", None

            # 2. Lógica de Aprobación
            monto = float(datos_gasto['monto'])
            umbral_aprobacion = 100.00

            if monto < umbral_aprobacion:
                # Aprobación automática
                estado_aprobacion_id = 2  # ID de "Aprobado"
                requiere_aprobacion = False
                aprobado_por = empleado.created_by_empresa_id
                fecha_aprobacion = datetime.now()
                estado_texto = "Aprobado automáticamente"
            else:
                # Requiere aprobación manual
                estado_aprobacion_id = 1  # ID de "Pendiente"
                requiere_aprobacion = True
                aprobado_por = None
                fecha_aprobacion = None
                estado_texto = "Pendiente de aprobación"

            # 3. Preparar y llamar al servicio de creación
            gasto_data = {
                **datos_gasto,
                'requiere_aprobacion': requiere_aprobacion,
                'estado_aprobacion_id': estado_aprobacion_id, # <-- Se pasa el estado correcto
                'aprobado_por': aprobado_por,
                'fecha_aprobacion': fecha_aprobacion,
                'empresa_id': empleado.created_by_empresa_id
            }
            
            # Llamada al servicio genérico, que AHORA SÍ usará el estado correcto
            gasto = gasto_service.crear_gasto(empleado_id, gasto_data)
            
            mensaje = f"Gasto para '{gasto.concepto}' creado. Estado: {estado_texto}."
            
            return True, mensaje, {
                'id': gasto.id,
                'concepto': gasto.concepto,
                'monto': float(gasto.monto),
                'estado': estado_texto,
            }
            
        except (ValueError, TypeError):
            return False, "Datos inválidos. El monto debe ser un número.", None
        except Exception as e:
            logger.error(f"Error en crear_gasto_con_aprobacion: {e}")
            return False, "Error interno al procesar el gasto", None
    
    def get_gastos_empleado(self, empleado_id: int, filtro_estado: str = 'all') -> List[Dict[str, Any]]:
        """
        Obtener gastos del empleado con información de estado de aprobación
        
        Args:
            empleado_id: ID del empleado
            filtro_estado: 'all', 'pendiente', 'aprobado', 'rechazado'
            
        Returns:
            List: Gastos del empleado con estados
        """
        try:
            # Base query
            query = """
                SELECT 
                    g.id, g.concepto, g.descripcion, g.monto, g.fecha,
                    g.proveedor, g.ubicacion, g.adjunto_url, g.notas,
                    g.requiere_aprobacion, g.fecha_aprobacion, g.created_at,
                    ea.nombre as estado_nombre,
                    ea.codigo as estado_codigo,
                    ea.color as estado_color,
                    cm.nombre as categoria_nombre,
                    cm.color as categoria_color,
                    tp.nombre as tipo_pago_nombre,
                    aprovador.username as aprobado_por_username
                FROM gastos g
                JOIN estados_aprobacion ea ON g.estado_aprobacion_id = ea.id
                JOIN categorias_movimientos cm ON g.categoria_id = cm.id
                JOIN tipos_pago tp ON g.tipo_pago_id = tp.id
                LEFT JOIN users aprovador ON g.aprobado_por = aprovador.id
                WHERE g.user_id = %s
            """
            
            params = [empleado_id]
            
            # Filtrar por estado si se especifica
            if filtro_estado != 'all':
                estado_mapping = {
                    'pendiente': 1,
                    'aprobado': 2,
                    'rechazado': 3
                }
                if filtro_estado in estado_mapping:
                    query += " AND g.estado_aprobacion_id = %s"
                    params.append(estado_mapping[filtro_estado])
            
            query += " ORDER BY g.created_at DESC"
            
            results = db_manager.fetch_all(query, params)
            
            gastos = []
            for row in results:
                gastos.append({
                    'id': row['id'],
                    'concepto': row['concepto'],
                    'descripcion': row['descripcion'],
                    'monto': float(row['monto']),
                    'fecha': row['fecha'].isoformat(),
                    'proveedor': row['proveedor'],
                    'ubicacion': row['ubicacion'],
                    'adjuntoUrl': row['adjunto_url'],
                    'notas': row['notas'],
                    'requiereAprobacion': bool(row['requiere_aprobacion']),
                    'fechaAprobacion': row['fecha_aprobacion'].isoformat() if row['fecha_aprobacion'] else None,
                    'createdAt': row['created_at'].isoformat(),
                    'estado': {
                        'nombre': row['estado_nombre'],
                        'codigo': row['estado_codigo'],
                        'color': row['estado_color']
                    },
                    'categoria': {
                        'nombre': row['categoria_nombre'],
                        'color': row['categoria_color']
                    },
                    'tipoPago': {
                        'nombre': row['tipo_pago_nombre']
                    },
                    'aprobadoPor': row['aprobado_por_username']
                })
            
            logger.info(f"Obtenidos {len(gastos)} gastos para empleado {empleado_id}")
            return gastos
            
        except Exception as e:
            logger.error(f"Error obteniendo gastos del empleado: {e}")
            return []
    
    def get_dashboard_empleado(self, empleado_id: int) -> Dict[str, Any]:
        """
        Obtener datos del dashboard para empleado
        
        Args:
            empleado_id: ID del empleado
            
        Returns:
            Dict: Datos del dashboard del empleado
        """
        try:
            # Gastos del mes actual por estado
            query_gastos_mes = """
                SELECT 
                    ea.codigo as estado,
                    COUNT(*) as cantidad,
                    COALESCE(SUM(g.monto), 0) as total_monto
                FROM gastos g
                JOIN estados_aprobacion ea ON g.estado_aprobacion_id = ea.id
                WHERE g.user_id = %s
                  AND MONTH(g.fecha) = MONTH(CURRENT_DATE())
                  AND YEAR(g.fecha) = YEAR(CURRENT_DATE())
                GROUP BY ea.id, ea.codigo
            """
            
            results = db_manager.fetch_all(query_gastos_mes, (empleado_id,))
            
            # Inicializar contadores
            dashboard_data = {
                'gastosPendientes': 0,
                'gastosAprobados': 0,
                'gastosRechazados': 0,
                'totalGastado': 0.0,
                'totalPendienteAprobacion': 0.0
            }
            
            # Procesar resultados
            for row in results:
                estado = row['estado']
                cantidad = row['cantidad']
                monto = float(row['total_monto'])
                
                if estado == 'pendiente':
                    dashboard_data['gastosPendientes'] = cantidad
                    dashboard_data['totalPendienteAprobacion'] = monto
                elif estado == 'aprobado':
                    dashboard_data['gastosAprobados'] = cantidad
                    dashboard_data['totalGastado'] += monto
                elif estado == 'rechazado':
                    dashboard_data['gastosRechazados'] = cantidad
            
            # Obtener información de la empresa
            empleado = User.find_by_id(empleado_id)
            if empleado and empleado.created_by_empresa_id:
                empresa = User.find_by_id(empleado.created_by_empresa_id)
                if empresa:
                    dashboard_data['empresa'] = {
                        'id': empresa.id,
                        'nombre': empresa.get_full_name() or empresa.username
                    }
            
            # Gastos recientes (últimos 5)
            query_recientes = """
                SELECT 
                    g.concepto, g.monto, g.fecha, g.created_at,
                    ea.nombre as estado_nombre,
                    ea.color as estado_color
                FROM gastos g
                JOIN estados_aprobacion ea ON g.estado_aprobacion_id = ea.id
                WHERE g.user_id = %s
                ORDER BY g.created_at DESC
                LIMIT 5
            """
            
            gastos_recientes = db_manager.fetch_all(query_recientes, (empleado_id,))
            
            dashboard_data['gastosRecientes'] = [
                {
                    'concepto': row['concepto'],
                    'monto': float(row['monto']),
                    'fecha': row['fecha'].isoformat(),
                    'estado': {
                        'nombre': row['estado_nombre'],
                        'color': row['estado_color']
                    }
                }
                for row in gastos_recientes
            ]
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error obteniendo dashboard empleado: {e}")
            return {
                'gastosPendientes': 0,
                'gastosAprobados': 0,
                'gastosRechazados': 0,
                'totalGastado': 0.0,
                'totalPendienteAprobacion': 0.0,
                'gastosRecientes': []
            }
    
    def get_empresa_info(self, empleado_id: int) -> Optional[Dict[str, Any]]:
        """
        Obtener información de la empresa a la que pertenece el empleado

        Args:
            empleado_id: ID del empleado

        Returns:
            Dict: Información de la empresa o None
        """
        try:
            logger.info(f"Buscando info de empresa para empleado ID: {empleado_id}")

            empleado = User.find_by_id(empleado_id)
            if not empleado:
                logger.warning(f"Empleado con ID {empleado_id} no encontrado")
                return None

            logger.info(f"Empleado encontrado: {empleado.username}, rol: {empleado.id_rol}, created_by_empresa_id: {empleado.created_by_empresa_id}")

            if not empleado.created_by_empresa_id:
                logger.warning(f"Empleado {empleado.username} no tiene empresa asociada (created_by_empresa_id es None)")
                return None

            empresa = User.find_by_id(empleado.created_by_empresa_id)
            if not empresa:
                logger.warning(f"Empresa con ID {empleado.created_by_empresa_id} no encontrada")
                return None

            logger.info(f"Empresa encontrada: {empresa.username}, rol: {empresa.id_rol}")

            return {
                'id': empresa.id,
                'nombre': empresa.get_full_name() or empresa.username,
                'email': empresa.email,
                'username': empresa.username
            }

        except Exception as e:
            logger.error(f"Error obteniendo info de empresa para empleado {empleado_id}: {e}")
            return None
    
    def get_historial_aprobaciones(self, empleado_id: int, limite: int = 20) -> List[Dict[str, Any]]:
        """
        Obtener historial de aprobaciones/rechazos del empleado
        
        Args:
            empleado_id: ID del empleado
            limite: Número máximo de registros a retornar
            
        Returns:
            List: Historial de aprobaciones
        """
        try:
            query = """
                SELECT 
                    g.id, g.concepto, g.monto, g.fecha_aprobacion,
                    ea.nombre as estado_nombre,
                    ea.codigo as estado_codigo,
                    ea.color as estado_color,
                    aprovador.username as aprobado_por_username,
                    g.notas
                FROM gastos g
                JOIN estados_aprobacion ea ON g.estado_aprobacion_id = ea.id
                LEFT JOIN users aprovador ON g.aprobado_por = aprovador.id
                WHERE g.user_id = %s
                  AND g.estado_aprobacion_id IN (2, 3)
                  AND g.fecha_aprobacion IS NOT NULL
                ORDER BY g.fecha_aprobacion DESC
                LIMIT %s
            """
            
            results = db_manager.fetch_all(query, (empleado_id, limite))
            
            historial = []
            for row in results:
                historial.append({
                    'gastoId': row['id'],
                    'concepto': row['concepto'],
                    'monto': float(row['monto']),
                    'fechaAprobacion': row['fecha_aprobacion'].isoformat(),
                    'estado': {
                        'nombre': row['estado_nombre'],
                        'codigo': row['estado_codigo'],
                        'color': row['estado_color']
                    },
                    'aprobadoPor': row['aprobado_por_username'],
                    'comentarios': row['notas']
                })
            
            return historial
            
        except Exception as e:
            logger.error(f"Error obteniendo historial de aprobaciones: {e}")
            return []

# Instancia global del servicio
empleado_service = EmpleadoService()