"""
Servicio para gestión de ventas
Maneja ventas de empleados y reportes para empresas
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from utils.database import db_manager
from models.user import User

logger = logging.getLogger(__name__)

class VentasService:
    """Servicio para operaciones de ventas"""

    def __init__(self):
        self.ROL_EMPLEADO = 3
        self.ROL_EMPRESA = 2

    def get_ventas_empleado(self, empleado_id: int, filtros: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Obtener ventas de un empleado específico

        Args:
            empleado_id: ID del empleado
            filtros: Filtros opcionales (fecha_desde, fecha_hasta, producto_id)

        Returns:
            List: Lista de ventas del empleado
        """
        try:
            # Verificar que el usuario es empleado
            empleado = User.find_by_id(empleado_id)
            if not empleado or empleado.id_rol != self.ROL_EMPLEADO:
                logger.warning(f"Usuario {empleado_id} no es un empleado válido")
                return []

            # Query base
            query = """
                SELECT
                    v.id,
                    v.empleado_id,
                    v.empresa_id,
                    v.producto_id,
                    v.cantidad,
                    v.precio_unitario,
                    v.monto_total,
                    v.fecha_venta,
                    v.notas,
                    p.nombre as producto_nombre,
                    p.sku as producto_sku
                FROM ventas v
                INNER JOIN productos p ON v.producto_id = p.id
                WHERE v.empleado_id = %s
            """

            params = [empleado_id]

            # Aplicar filtros si se proporcionan
            if filtros:
                if filtros.get('fecha_desde'):
                    query += " AND DATE(v.fecha_venta) >= %s"
                    params.append(filtros['fecha_desde'])

                if filtros.get('fecha_hasta'):
                    query += " AND DATE(v.fecha_venta) <= %s"
                    params.append(filtros['fecha_hasta'])

                if filtros.get('producto_id'):
                    query += " AND v.producto_id = %s"
                    params.append(filtros['producto_id'])

            query += " ORDER BY v.fecha_venta DESC"

            results = db_manager.fetch_all(query, params)

            ventas = []
            for row in results:
                ventas.append({
                    'id': row['id'],
                    'empleado_id': row['empleado_id'],
                    'empresa_id': row['empresa_id'],
                    'producto_id': row['producto_id'],
                    'cantidad': row['cantidad'],
                    'precio_unitario': float(row['precio_unitario']),
                    'monto_total': float(row['monto_total']),
                    'fecha_venta': row['fecha_venta'].isoformat(),
                    'notas': row['notas'],
                    'producto_nombre': row['producto_nombre'],
                    'producto_sku': row['producto_sku']
                })

            logger.info(f"Obtenidas {len(ventas)} ventas para empleado {empleado_id}")
            return ventas

        except Exception as e:
            logger.error(f"Error obteniendo ventas del empleado {empleado_id}: {e}")
            return []

    def get_resumen_ventas_empleado(self, empleado_id: int) -> Dict[str, Any]:
        """
        Obtener resumen de ventas de un empleado

        Args:
            empleado_id: ID del empleado

        Returns:
            Dict: Resumen con estadísticas de ventas
        """
        try:
            # Verificar que el usuario es empleado
            empleado = User.find_by_id(empleado_id)
            if not empleado or empleado.id_rol != self.ROL_EMPLEADO:
                return self._get_empty_resumen()

            today = date.today()
            week_start = today - timedelta(days=today.weekday())
            month_start = today.replace(day=1)

            # Query para obtener estadísticas
            query = """
                SELECT
                    COUNT(*) as total_ventas,
                    COALESCE(SUM(monto_total), 0) as monto_total,

                    COUNT(CASE WHEN DATE(fecha_venta) = %s THEN 1 END) as ventas_hoy,
                    COALESCE(SUM(CASE WHEN DATE(fecha_venta) = %s THEN monto_total END), 0) as monto_hoy,

                    COUNT(CASE WHEN DATE(fecha_venta) >= %s THEN 1 END) as ventas_semana,
                    COALESCE(SUM(CASE WHEN DATE(fecha_venta) >= %s THEN monto_total END), 0) as monto_semana,

                    COUNT(CASE WHEN DATE(fecha_venta) >= %s THEN 1 END) as ventas_mes,
                    COALESCE(SUM(CASE WHEN DATE(fecha_venta) >= %s THEN monto_total END), 0) as monto_mes

                FROM ventas
                WHERE empleado_id = %s
            """

            params = [
                today, today,  # hoy
                week_start, week_start,  # semana
                month_start, month_start,  # mes
                empleado_id
            ]

            result = db_manager.fetch_one(query, params)

            if result:
                return {
                    'totalVentas': result['total_ventas'],
                    'montoTotal': float(result['monto_total']),
                    'ventasHoy': result['ventas_hoy'],
                    'montoHoy': float(result['monto_hoy']),
                    'ventasSemana': result['ventas_semana'],
                    'montoSemana': float(result['monto_semana']),
                    'ventasMes': result['ventas_mes'],
                    'montoMes': float(result['monto_mes'])
                }
            else:
                return self._get_empty_resumen()

        except Exception as e:
            logger.error(f"Error obteniendo resumen de ventas del empleado {empleado_id}: {e}")
            return self._get_empty_resumen()

    def get_ventas_empresa(self, empresa_id: int, filtros: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Obtener todas las ventas de los empleados de una empresa

        Args:
            empresa_id: ID de la empresa
            filtros: Filtros opcionales (fecha_desde, fecha_hasta, empleado_id, producto_id)

        Returns:
            List: Lista de ventas de la empresa
        """
        try:
            # Verificar que el usuario es empresa
            empresa = User.find_by_id(empresa_id)
            if not empresa or empresa.id_rol != self.ROL_EMPRESA:
                logger.warning(f"Usuario {empresa_id} no es una empresa válida")
                return []

            # Query base
            query = """
                SELECT
                    v.id,
                    v.empleado_id,
                    v.empresa_id,
                    v.producto_id,
                    v.cantidad,
                    v.precio_unitario,
                    v.monto_total,
                    v.fecha_venta,
                    v.notas,
                    p.nombre as producto_nombre,
                    p.sku as producto_sku,
                    u.username as empleado_nombre
                FROM ventas v
                INNER JOIN productos p ON v.producto_id = p.id
                INNER JOIN users u ON v.empleado_id = u.id
                WHERE v.empresa_id = %s
            """

            params = [empresa_id]

            # Aplicar filtros si se proporcionan
            if filtros:
                if filtros.get('fecha_desde'):
                    query += " AND DATE(v.fecha_venta) >= %s"
                    params.append(filtros['fecha_desde'])

                if filtros.get('fecha_hasta'):
                    query += " AND DATE(v.fecha_venta) <= %s"
                    params.append(filtros['fecha_hasta'])

                if filtros.get('empleado_id'):
                    query += " AND v.empleado_id = %s"
                    params.append(filtros['empleado_id'])

                if filtros.get('producto_id'):
                    query += " AND v.producto_id = %s"
                    params.append(filtros['producto_id'])

            query += " ORDER BY v.fecha_venta DESC"

            results = db_manager.fetch_all(query, params)

            ventas = []
            for row in results:
                ventas.append({
                    'id': row['id'],
                    'empleado_id': row['empleado_id'],
                    'empresa_id': row['empresa_id'],
                    'producto_id': row['producto_id'],
                    'cantidad': row['cantidad'],
                    'precio_unitario': float(row['precio_unitario']),
                    'monto_total': float(row['monto_total']),
                    'fecha_venta': row['fecha_venta'].isoformat(),
                    'notas': row['notas'],
                    'producto_nombre': row['producto_nombre'],
                    'producto_sku': row['producto_sku'],
                    'empleado_nombre': row['empleado_nombre']
                })

            logger.info(f"Obtenidas {len(ventas)} ventas para empresa {empresa_id}")
            return ventas

        except Exception as e:
            logger.error(f"Error obteniendo ventas de la empresa {empresa_id}: {e}")
            return []

    def get_resumen_ventas_empresa(self, empresa_id: int) -> Dict[str, Any]:
        """
        Obtener resumen de ventas de una empresa (todos sus empleados)

        Args:
            empresa_id: ID de la empresa

        Returns:
            Dict: Resumen con estadísticas de ventas y ventas por empleado
        """
        try:
            # Verificar que el usuario es empresa
            empresa = User.find_by_id(empresa_id)
            if not empresa or empresa.id_rol != self.ROL_EMPRESA:
                return self._get_empty_resumen_empresa()

            today = date.today()
            week_start = today - timedelta(days=today.weekday())
            month_start = today.replace(day=1)

            # Query para estadísticas generales
            query_general = """
                SELECT
                    COUNT(*) as total_ventas,
                    COALESCE(SUM(monto_total), 0) as monto_total,

                    COUNT(CASE WHEN DATE(fecha_venta) = %s THEN 1 END) as ventas_hoy,
                    COALESCE(SUM(CASE WHEN DATE(fecha_venta) = %s THEN monto_total END), 0) as monto_hoy,

                    COUNT(CASE WHEN DATE(fecha_venta) >= %s THEN 1 END) as ventas_semana,
                    COALESCE(SUM(CASE WHEN DATE(fecha_venta) >= %s THEN monto_total END), 0) as monto_semana,

                    COUNT(CASE WHEN DATE(fecha_venta) >= %s THEN 1 END) as ventas_mes,
                    COALESCE(SUM(CASE WHEN DATE(fecha_venta) >= %s THEN monto_total END), 0) as monto_mes

                FROM ventas
                WHERE empresa_id = %s
            """

            params_general = [
                today, today,  # hoy
                week_start, week_start,  # semana
                month_start, month_start,  # mes
                empresa_id
            ]

            result_general = db_manager.fetch_one(query_general, params_general)

            # Query para ventas por empleado
            query_empleados = """
                SELECT
                    v.empleado_id,
                    u.username as empleado_nombre,
                    COUNT(*) as total_ventas,
                    COALESCE(SUM(v.monto_total), 0) as monto_total
                FROM ventas v
                INNER JOIN users u ON v.empleado_id = u.id
                WHERE v.empresa_id = %s
                GROUP BY v.empleado_id, u.username
                ORDER BY monto_total DESC
            """

            results_empleados = db_manager.fetch_all(query_empleados, [empresa_id])

            ventas_por_empleado = []
            for row in results_empleados:
                ventas_por_empleado.append({
                    'empleado_id': row['empleado_id'],
                    'empleado_nombre': row['empleado_nombre'],
                    'total_ventas': row['total_ventas'],
                    'monto_total': float(row['monto_total'])
                })

            if result_general:
                return {
                    'totalVentas': result_general['total_ventas'],
                    'montoTotal': float(result_general['monto_total']),
                    'ventasHoy': result_general['ventas_hoy'],
                    'montoHoy': float(result_general['monto_hoy']),
                    'ventasSemana': result_general['ventas_semana'],
                    'montoSemana': float(result_general['monto_semana']),
                    'ventasMes': result_general['ventas_mes'],
                    'montoMes': float(result_general['monto_mes']),
                    'ventasPorEmpleado': ventas_por_empleado
                }
            else:
                return self._get_empty_resumen_empresa()

        except Exception as e:
            logger.error(f"Error obteniendo resumen de ventas de la empresa {empresa_id}: {e}")
            return self._get_empty_resumen_empresa()

    def _get_empty_resumen(self) -> Dict[str, Any]:
        """Retorna un resumen vacío para empleado"""
        return {
            'totalVentas': 0,
            'montoTotal': 0.0,
            'ventasHoy': 0,
            'montoHoy': 0.0,
            'ventasSemana': 0,
            'montoSemana': 0.0,
            'ventasMes': 0,
            'montoMes': 0.0
        }

    def _get_empty_resumen_empresa(self) -> Dict[str, Any]:
        """Retorna un resumen vacío para empresa"""
        return {
            'totalVentas': 0,
            'montoTotal': 0.0,
            'ventasHoy': 0,
            'montoHoy': 0.0,
            'ventasSemana': 0,
            'montoSemana': 0.0,
            'ventasMes': 0,
            'montoMes': 0.0,
            'ventasPorEmpleado': []
        }

# Instancia global del servicio
ventas_service = VentasService()