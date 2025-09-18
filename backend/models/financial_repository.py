"""
Repository Pattern para operaciones de base de datos - Enterprise Level
¡100 años de experiencia condensados en código! 🔥
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date
from decimal import Decimal
import pymysql
from contextlib import contextmanager
import logging
from dataclasses import asdict

from models.financial_base import *
from utils.database import db_manager


logger = logging.getLogger(__name__)


class DatabaseError(Exception):
    """Excepción personalizada para errores de base de datos"""
    pass


class ValidationError(Exception):
    """Excepción para errores de validación"""
    pass


class BaseRepository:
    """Repositorio base con operaciones CRUD genéricas"""
    
    def __init__(self):
        self.table_name = ""
        self.entity_class = None
    
    @contextmanager
    def get_connection(self):
        """Context manager para manejo de conexiones"""
        conn = None
        try:
            conn = db_manager.get_connection()
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error in {self.__class__.__name__}: {e}")
            raise DatabaseError(f"Database operation failed: {str(e)}")
        finally:
            if conn:
                conn.close()
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Ejecuta una consulta SELECT y retorna resultados como diccionarios"""
        with self.get_connection() as conn:
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            cursor.execute(query, params or ())
            results = cursor.fetchall()
            # Ensure we always return dictionaries
            if results and isinstance(results[0], tuple):
                # Convert tuples to dictionaries using column descriptions
                column_names = [desc[0] for desc in cursor.description]
                return [dict(zip(column_names, row)) for row in results]
            return results
    
    def execute_non_query(self, query: str, params: tuple = None) -> int:
        """Ejecuta INSERT/UPDATE/DELETE y retorna filas afectadas"""
        logger.info(f"Executing query: {query}")
        logger.info(f"With parameters: {params}")
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            affected_rows = cursor.rowcount  # Use rowcount to get affected rows
            logger.info(f"Affected rows: {affected_rows}")
            conn.commit()
            return affected_rows
    
    def execute_insert(self, query: str, params: tuple = None) -> int:
        """Ejecuta INSERT y retorna el ID insertado"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            conn.commit()
            return cursor.lastrowid
    
    def find_by_id(self, entity_id: int) -> Optional[Any]:
        """Busca una entidad por ID"""
        query = f"SELECT * FROM {self.table_name} WHERE id = %s"
        results = self.execute_query(query, (entity_id,))
        if results:
            return self.entity_class.from_dict(results[0])
        return None
    
    def find_all(self, limit: int = 100, offset: int = 0) -> List[Any]:
        """Busca todas las entidades activas"""
        query = f"SELECT * FROM {self.table_name} LIMIT %s OFFSET %s"
        results = self.execute_query(query, (limit, offset))
        return [self.entity_class.from_dict(row) for row in results]
    
    def soft_delete(self, entity_id: int, user_id: int) -> bool:
        """Eliminación lógica"""
        query = f"""
            UPDATE {self.table_name}
            SET updated_by = %s, updated_at = %s
            WHERE id = %s
        """
        affected = self.execute_non_query(query, (user_id, datetime.now(), entity_id))
        return affected > 0

    def delete(self, entity_id: int) -> bool:
        """Eliminación física de la entidad"""
        query = f"DELETE FROM {self.table_name} WHERE id = %s"
        affected = self.execute_non_query(query, (entity_id,))
        return affected > 0

    def update(self, entity) -> bool:
        """Actualiza una entidad en la base de datos"""
        # Get entity data as dict, excluding None values and id
        entity_dict = asdict(entity)
        entity_id = entity_dict.pop('id')

        # Get table columns to only update existing fields
        try:
            check_query = f"DESCRIBE {self.table_name}"
            columns_result = self.execute_query(check_query)
            table_columns = {row['Field'] for row in columns_result}
        except:
            # Fallback if DESCRIBE fails
            table_columns = set(entity_dict.keys())

        # Filter out None values, system fields, and non-existent columns
        excluded_fields = ['created_at', 'created_by', 'id']
        update_fields = {k: v for k, v in entity_dict.items()
                        if v is not None
                        and k not in excluded_fields
                        and k in table_columns}

        if not update_fields:
            return True  # Nothing to update

        # Build SET clause
        set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
        query = f"UPDATE {self.table_name} SET {set_clause} WHERE id = %s"

        # Prepare parameters
        params = list(update_fields.values()) + [entity_id]

        affected = self.execute_non_query(query, tuple(params))
        return affected > 0


# ============================================================================
# REPOSITORIOS DE CATÁLOGOS
# ============================================================================

class CatalogRepository(BaseRepository):
    """Repositorio base para catálogos"""
    
    def find_active_ordered(self) -> List[Any]:
        """Busca catálogos activos ordenados"""
        query = f"""
            SELECT * FROM {self.table_name} 
            WHERE es_activo = 1 
            ORDER BY orden_visualizacion, nombre
        """
        results = self.execute_query(query)
        entities = []
        for row in results:
            # Ensure codigo field is not None or empty
            if not row.get('codigo'):
                row['codigo'] = f"default_{row.get('id', 'unknown')}"  # Generate fallback codigo
            entities.append(self.entity_class.from_dict(row))
        return entities
    
    def find_by_codigo(self, codigo: str) -> Optional[Any]:
        """Busca por código"""
        query = f"SELECT * FROM {self.table_name} WHERE codigo = %s AND es_activo = 1"
        results = self.execute_query(query, (codigo,))
        if results:
            row_data = results[0]
            # Ensure codigo field is not None or empty
            if not row_data.get('codigo'):
                row_data['codigo'] = codigo  # Use the search parameter as fallback
            return self.entity_class.from_dict(row_data)
        return None


class TipoFacturaRepository(CatalogRepository):
    def __init__(self):
        self.table_name = "tipos_factura"
        self.entity_class = TipoFactura


class TipoMovimientoRepository(CatalogRepository):
    def __init__(self):
        self.table_name = "tipos_movimiento"
        self.entity_class = TipoMovimiento


class TipoIngresoRepository(CatalogRepository):
    def __init__(self):
        self.table_name = "tipos_ingreso"
        self.entity_class = TipoIngreso


class TipoPagoRepository(CatalogRepository):
    def __init__(self):
        self.table_name = "tipos_pago"
        self.entity_class = TipoPago


class EstadoAprobacionRepository(CatalogRepository):
    def __init__(self):
        self.table_name = "estados_aprobacion"
        self.entity_class = EstadoAprobacion


class EstadoGastoPlanificadoRepository(CatalogRepository):
    def __init__(self):
        self.table_name = "estados_gasto_planificado"
        self.entity_class = EstadoGastoPlanificado


class PrioridadRepository(CatalogRepository):
    def __init__(self):
        self.table_name = "prioridades"
        self.entity_class = Prioridad


# ============================================================================
# REPOSITORIOS PRINCIPALES
# ============================================================================

class CategoriaMovimientoRepository(BaseRepository):
    def __init__(self):
        self.table_name = "categorias_movimientos"
        self.entity_class = CategoriaMovimiento
    
    def find_by_user_and_type(self, user_id: int, tipo_movimiento_id: int) -> List[CategoriaMovimiento]:
        """Busca categorías por usuario y tipo de movimiento"""
        query = """
            SELECT c.*, tm.nombre as tipo_movimiento_nombre, tm.codigo as tipo_movimiento_codigo
            FROM categorias_movimientos c
            JOIN tipos_movimiento tm ON c.tipo_movimiento_id = tm.id
            WHERE (c.user_id = %s OR c.es_predeterminada = 1)
            AND c.tipo_movimiento_id = %s
            AND c.es_activa = 1
            ORDER BY c.orden_visualizacion, c.nombre
        """
        results = self.execute_query(query, (user_id, tipo_movimiento_id))
        categorias = []
        for row in results:
            categoria = self.entity_class.from_dict(row)
            # Agregar tipo de movimiento como relación
            categoria.tipo_movimiento = TipoMovimiento(
                id=row['tipo_movimiento_id'],
                codigo=row['tipo_movimiento_codigo'],
                nombre=row['tipo_movimiento_nombre']
            )
            categorias.append(categoria)
        return categorias
    
    def find_predeterminadas(self, tipo_movimiento_id: Optional[int] = None) -> List[CategoriaMovimiento]:
        """Busca categorías predeterminadas"""
        query = """
            SELECT * FROM categorias_movimientos 
            WHERE es_predeterminada = 1 AND es_activa = 1
        """
        params = ()
        if tipo_movimiento_id:
            query += " AND tipo_movimiento_id = %s"
            params = (tipo_movimiento_id,)
        
        query += " ORDER BY orden_visualizacion, nombre"
        results = self.execute_query(query, params)
        return [self.entity_class.from_dict(row) for row in results]
    
    def create(self, categoria: CategoriaMovimiento) -> int:
        """Crea una nueva categoría"""
        categoria.validate_ownership()
        
        query = """
            INSERT INTO categorias_movimientos 
            (user_id, empresa_id, tipo_movimiento_id, nombre, descripcion, 
             icono, color, orden_visualizacion, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            categoria.user_id, categoria.empresa_id, categoria.tipo_movimiento_id,
            categoria.nombre, categoria.descripcion, categoria.icono,
            categoria.color, categoria.orden_visualizacion, categoria.created_by
        )
        return self.execute_insert(query, params)


class IngresoRepository(BaseRepository):
    def __init__(self):
        self.table_name = "ingresos"
        self.entity_class = Ingreso
    
    def find_by_user_period(self, user_id: int, fecha_inicio: date, fecha_fin: date) -> List[Ingreso]:
        """Busca ingresos por usuario en un período"""
        query = """
            SELECT i.*, c.nombre as categoria_nombre, ti.nombre as tipo_ingreso_nombre
            FROM ingresos i
            JOIN categorias_movimientos c ON i.categoria_id = c.id
            JOIN tipos_ingreso ti ON i.tipo_ingreso_id = ti.id
            WHERE i.user_id = %s AND i.fecha BETWEEN %s AND %s
            ORDER BY i.fecha DESC, i.id DESC
        """
        results = self.execute_query(query, (user_id, fecha_inicio, fecha_fin))
        return self._build_ingresos_with_relations(results)
    
    def get_total_by_user_period(self, user_id: int, fecha_inicio: date, fecha_fin: date) -> Decimal:
        """Obtiene el total de ingresos en un período"""
        query = """
            SELECT COALESCE(SUM(monto), 0) as total
            FROM ingresos
            WHERE user_id = %s AND fecha BETWEEN %s AND %s
        """
        results = self.execute_query(query, (user_id, fecha_inicio, fecha_fin))
        return Decimal(str(results[0]['total'])) if results else Decimal('0.00')
    
    def find_by_categoria(self, user_id: int, categoria_id: int, limit: int = 50) -> List[Ingreso]:
        """Busca ingresos por categoría"""
        query = """
            SELECT i.*, c.nombre as categoria_nombre, ti.nombre as tipo_ingreso_nombre
            FROM ingresos i
            JOIN categorias_movimientos c ON i.categoria_id = c.id
            JOIN tipos_ingreso ti ON i.tipo_ingreso_id = ti.id
            WHERE i.user_id = %s AND i.categoria_id = %s
            ORDER BY i.fecha DESC
            LIMIT %s
        """
        results = self.execute_query(query, (user_id, categoria_id, limit))
        return self._build_ingresos_with_relations(results)
    
    def create(self, ingreso: Ingreso) -> int:
        """Crea un nuevo ingreso"""
        ingreso.validate_ownership()
        
        query = """
            INSERT INTO ingresos 
            (user_id, empresa_id, categoria_id, tipo_ingreso_id, concepto, descripcion,
             fuente, monto, fecha, es_recurrente, frecuencia_dias, proximo_ingreso,
             numero_referencia, notas, adjunto_url, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            ingreso.user_id, ingreso.empresa_id, ingreso.categoria_id,
            ingreso.tipo_ingreso_id, ingreso.concepto, ingreso.descripcion,
            ingreso.fuente, ingreso.monto, ingreso.fecha,
            ingreso.es_recurrente, ingreso.frecuencia_dias, ingreso.proximo_ingreso,
            ingreso.numero_referencia, ingreso.notas, ingreso.adjunto_url,
            ingreso.created_by
        )
        return self.execute_insert(query, params)
    
    def _build_ingresos_with_relations(self, results: List[Dict]) -> List[Ingreso]:
        """Construye objetos Ingreso con relaciones"""
        ingresos = []
        for row in results:
            ingreso = self.entity_class.from_dict(row)
            # Agregar relaciones
            if 'categoria_nombre' in row:
                ingreso.categoria = CategoriaMovimiento(
                    id=row['categoria_id'],
                    nombre=row['categoria_nombre']
                )
            if 'tipo_ingreso_nombre' in row:
                ingreso.tipo_ingreso = TipoIngreso(
                    id=row['tipo_ingreso_id'],
                    codigo=row.get('tipo_ingreso_codigo', f"ingreso_{row['tipo_ingreso_id']}"),  # Fallback codigo
                    nombre=row['tipo_ingreso_nombre']
                )
            ingresos.append(ingreso)
        return ingresos


class GastoRepository(BaseRepository):
    def __init__(self):
        self.table_name = "gastos"
        self.entity_class = Gasto
    
    def find_by_user_period(self, user_id: int, fecha_inicio: date, fecha_fin: date) -> List[Gasto]:
        """Busca gastos por usuario en un período"""
        query = """
            SELECT g.*, c.nombre as categoria_nombre, tp.nombre as tipo_pago_nombre,
                   ea.nombre as estado_aprobacion_nombre
            FROM gastos g
            JOIN categorias_movimientos c ON g.categoria_id = c.id
            JOIN tipos_pago tp ON g.tipo_pago_id = tp.id
            JOIN estados_aprobacion ea ON g.estado_aprobacion_id = ea.id
            WHERE g.user_id = %s AND g.fecha BETWEEN %s AND %s
            ORDER BY g.fecha DESC, g.id DESC
        """
        results = self.execute_query(query, (user_id, fecha_inicio, fecha_fin))
        return self._build_gastos_with_relations(results)
    
    def get_total_by_user_period(self, user_id: int, fecha_inicio: date, fecha_fin: date) -> Decimal:
        """Obtiene el total de gastos en un período"""
        query = """
            SELECT COALESCE(SUM(monto), 0) as total
            FROM gastos
            WHERE user_id = %s AND fecha BETWEEN %s AND %s 
            AND estado_aprobacion_id = 2
        """
        results = self.execute_query(query, (user_id, fecha_inicio, fecha_fin))
        return Decimal(str(results[0]['total'])) if results else Decimal('0.00')
    
    def find_by_categoria_period(self, user_id: int, categoria_id: int, 
                               fecha_inicio: date, fecha_fin: date) -> List[Gasto]:
        """Busca gastos por categoría en un período"""
        query = """
            SELECT g.*, c.nombre as categoria_nombre, tp.nombre as tipo_pago_nombre,
                   ea.nombre as estado_aprobacion_nombre
            FROM gastos g
            JOIN categorias_movimientos c ON g.categoria_id = c.id
            JOIN tipos_pago tp ON g.tipo_pago_id = tp.id
            JOIN estados_aprobacion ea ON g.estado_aprobacion_id = ea.id
            WHERE g.user_id = %s AND g.categoria_id = %s 
            AND g.fecha BETWEEN %s AND %s
            ORDER BY g.fecha DESC
        """
        results = self.execute_query(query, (user_id, categoria_id, fecha_inicio, fecha_fin))
        return self._build_gastos_with_relations(results)
    
    def get_resumen_por_categoria(self, user_id: int, fecha_inicio: date, fecha_fin: date) -> List[Dict]:
        """Obtiene resumen de gastos agrupados por categoría"""
        query = """
            SELECT 
                c.id as categoria_id,
                c.nombre as categoria_nombre,
                c.color,
                c.icono,
                COUNT(g.id) as cantidad_gastos,
                COALESCE(SUM(g.monto), 0) as total_gastado
            FROM categorias_movimientos c
            LEFT JOIN gastos g ON c.id = g.categoria_id 
                AND g.user_id = %s 
                AND g.fecha BETWEEN %s AND %s 
                AND g.estado_aprobacion_id = 2
            WHERE c.tipo_movimiento_id = 2  -- Solo categorías de gastos
            AND (c.user_id = %s OR c.es_predeterminada = 1)
            AND c.es_activa = 1
            GROUP BY c.id, c.nombre, c.color, c.icono
            HAVING total_gastado > 0
            ORDER BY total_gastado DESC
        """
        return self.execute_query(query, (user_id, fecha_inicio, fecha_fin, user_id))
    
    def create(self, gasto: Gasto) -> int:
        """Crea un nuevo gasto"""
        gasto.validate_ownership()
        
        query = """
            INSERT INTO gastos 
            (user_id, empresa_id, categoria_id, tipo_pago_id, concepto, descripcion,
             monto, fecha, proveedor, ubicacion, numero_referencia, es_deducible,
             es_planificado, gasto_planificado_id, requiere_aprobacion, 
             estado_aprobacion_id, notas, adjunto_url, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            gasto.user_id, gasto.empresa_id, gasto.categoria_id, gasto.tipo_pago_id,
            gasto.concepto, gasto.descripcion, gasto.monto, gasto.fecha,
            gasto.proveedor, gasto.ubicacion, gasto.numero_referencia,
            gasto.es_deducible, gasto.es_planificado, gasto.gasto_planificado_id,
            gasto.requiere_aprobacion, gasto.estado_aprobacion_id,
            gasto.notas, gasto.adjunto_url, gasto.created_by
        )
        return self.execute_insert(query, params)
    
    def _build_gastos_with_relations(self, results: List[Dict]) -> List[Gasto]:
        """Construye objetos Gasto con relaciones"""
        gastos = []
        for row in results:
            gasto = self.entity_class.from_dict(row)
            # Agregar relaciones
            if 'categoria_nombre' in row:
                gasto.categoria = CategoriaMovimiento(
                    id=row['categoria_id'],
                    nombre=row['categoria_nombre']
                )
            if 'tipo_pago_nombre' in row:
                gasto.tipo_pago = TipoPago(
                    id=row['tipo_pago_id'],
                    codigo=row.get('tipo_pago_codigo', f"pago_{row['tipo_pago_id']}"),  # Fallback codigo
                    nombre=row['tipo_pago_nombre']
                )
            if 'estado_aprobacion_nombre' in row:
                gasto.estado_aprobacion = EstadoAprobacion(
                    id=row['estado_aprobacion_id'],
                    codigo=row.get('estado_aprobacion_codigo', f"estado_{row['estado_aprobacion_id']}"),  # Fallback codigo
                    nombre=row['estado_aprobacion_nombre']
                )
            gastos.append(gasto)
        return gastos


class ObjetivoRepository(BaseRepository):
    def __init__(self):
        self.table_name = "objetivos"
        self.entity_class = Objetivo
    
    def find_by_user(self, user_id: int, activos_solo: bool = True) -> List[Objetivo]:
        """Busca objetivos por usuario"""
        query = """
            SELECT o.*, p.nombre as prioridad_nombre, p.color as prioridad_color
            FROM objetivos o
            JOIN prioridades p ON o.prioridad_id = p.id
            WHERE o.user_id = %s
        """
        params = [user_id]
        
        if activos_solo:
            query += " AND o.es_activo = 1"
        
        query += " ORDER BY p.nivel_numerico, o.fecha_limite ASC"
        
        results = self.execute_query(query, params)
        return self._build_objetivos_with_relations(results)
    
    def get_resumen_usuario(self, user_id: int) -> Dict[str, Any]:
        """Obtiene resumen de objetivos del usuario"""
        query = """
            SELECT 
                COUNT(*) as total_objetivos,
                COALESCE(SUM(meta_total), 0) as meta_total_general,
                COALESCE(SUM(ahorro_actual), 0) as ahorro_total_actual,
                COUNT(CASE WHEN ahorro_actual >= meta_total THEN 1 END) as objetivos_completados
            FROM objetivos
            WHERE user_id = %s AND es_activo = 1
        """
        results = self.execute_query(query, (user_id,))
        if results:
            resumen = results[0]
            resumen['progreso_general'] = 0.0
            if float(resumen['meta_total_general']) > 0:
                resumen['progreso_general'] = (
                    float(resumen['ahorro_total_actual']) / 
                    float(resumen['meta_total_general'])
                ) * 100
            return resumen
        return {}
    
    def create(self, objetivo: Objetivo) -> int:
        """Crea un nuevo objetivo"""
        objetivo.validate_ownership()

        try:
            # Try the simple query first with only essential fields
            query = """
                INSERT INTO objetivos
                (user_id, nombre, meta_total, prioridad_id, categoria, descripcion, fecha_limite)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                objetivo.user_id, objetivo.nombre, objetivo.meta_total,
                objetivo.prioridad_id, objetivo.categoria, objetivo.descripcion,
                objetivo.fecha_limite
            )

            logger.info(f"Creating objetivo with params: {params}")
            return self.execute_insert(query, params)

        except Exception as e:
            logger.error(f"Database error creating objetivo: {str(e)}")
            logger.error(f"Query: {query}")
            logger.error(f"Params: {params}")
            logger.error(f"Objetivo object: {objetivo}")
            raise
    
    def actualizar_ahorro(self, objetivo_id: int, nuevo_ahorro: Decimal) -> bool:
        """Actualiza el ahorro actual de un objetivo"""
        query = """
            UPDATE objetivos 
            SET ahorro_actual = %s, updated_at = %s
            WHERE id = %s AND es_activo = 1
        """
        affected = self.execute_non_query(query, (nuevo_ahorro, datetime.now(), objetivo_id))
        return affected > 0
    
    def _build_objetivos_with_relations(self, results: List[Dict]) -> List[Objetivo]:
        """Construye objetos Objetivo con relaciones"""
        objetivos = []
        for row in results:
            objetivo = self.entity_class.from_dict(row)
            # Agregar relación de prioridad
            if 'prioridad_nombre' in row:
                objetivo.prioridad = Prioridad(
                    id=row['prioridad_id'],
                    codigo=row.get('prioridad_codigo', f"prior_{row['prioridad_id']}"),  # Fallback codigo
                    nombre=row['prioridad_nombre'],
                    color=row.get('prioridad_color')
                )
            objetivos.append(objetivo)
        return objetivos


class ObjetivoMovimientoRepository(BaseRepository):
    def __init__(self):
        self.table_name = "objetivos_movimientos"
        self.entity_class = ObjetivoMovimiento
    
    def find_by_objetivo(self, objetivo_id: int, limit: int = 50) -> List[ObjetivoMovimiento]:
        """Busca movimientos de un objetivo"""
        query = """
            SELECT * FROM objetivos_movimientos
            WHERE objetivo_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """
        results = self.execute_query(query, (objetivo_id, limit))
        return [self.entity_class.from_dict(row) for row in results]
    
    def create(self, movimiento: ObjetivoMovimiento) -> int:
        """Crea un nuevo movimiento de objetivo"""
        query = """
            INSERT INTO objetivos_movimientos (objetivo_id, monto, es_aporte, descripcion)
            VALUES (%s, %s, %s, %s)
        """
        params = (
            movimiento.objetivo_id, movimiento.monto,
            movimiento.es_aporte, movimiento.descripcion
        )
        return self.execute_insert(query, params)


class EstadoFacturaRepository(CatalogRepository):
    """Repository para gestionar estados de facturas"""

    def __init__(self):
        super().__init__()
        self.entity_class = EstadoFactura
        self.table_name = 'estado_factura'

    def find_active_ordered(self) -> List[EstadoFactura]:
        """Busca estados activos ordenados (override para usar columna 'orden')"""
        query = f"""
            SELECT * FROM {self.table_name}
            WHERE es_activo = 1
            ORDER BY orden, nombre
        """
        results = self.execute_query(query)
        return [self.entity_class.from_dict(row) for row in results]

class FacturaRepository(BaseRepository):
    """Repository para gestionar facturas"""

    def __init__(self):
        super().__init__()
        self.entity_class = Factura
        self.table_name = 'facturas'
    
    # MÉTODO MODIFICADO PARA INCLUIR EL JOIN
    def find_by_user(self, user_id: int) -> List[Factura]:
        """Encuentra todas las facturas de un usuario"""
        query = """
            SELECT f.*,
                   tf.nombre as tipo_factura_nombre, tf.icono as tipo_factura_icono,
                   ef.nombre as estado_factura_nombre, ef.color as estado_factura_color, ef.icono as estado_factura_icono
            FROM facturas f
            JOIN tipos_factura tf ON f.tipo_factura_id = tf.id
            JOIN estado_factura ef ON f.estado_factura_id = ef.id
            WHERE f.user_id = %s
            ORDER BY f.fecha_vencimiento ASC
        """
        results = self.execute_query(query, (user_id,))
        facturas = []
        for row in results:
            factura = self.entity_class.from_dict(row)
            # Agregar relaciones
            factura.tipo_factura = TipoFactura(
                id=row['tipo_factura_id'],
                nombre=row['tipo_factura_nombre'],
                icono=row['tipo_factura_icono']
            )
            factura.estado_factura = EstadoFactura(
                id=row['estado_factura_id'],
                nombre=row['estado_factura_nombre'],
                color=row['estado_factura_color'],
                icono=row['estado_factura_icono']
            )
            facturas.append(factura)
        return facturas
    
    # MÉTODO MODIFICADO PARA USAR EL NUEVO CAMPO
    def create(self, factura: Factura) -> Factura:
        """Crea una nueva factura"""
        query = """
            INSERT INTO facturas (
                user_id, nombre, tipo_factura_id, monto, fecha_vencimiento,
                estado_factura_id, descripcion, logo_url, es_recurrente, frecuencia_dias
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            factura.user_id, factura.nombre, factura.tipo_factura_id, factura.monto,
            factura.fecha_vencimiento, factura.estado_factura_id, factura.descripcion,
            factura.logo_url, factura.es_recurrente, factura.frecuencia_dias
        )

        factura_id = self.execute_insert(query, params)
        factura.id = factura_id
        return factura

class RachaUsuarioRepository(BaseRepository):
    """Repositorio para manejo de rachas de usuario"""

    def __init__(self):
        super().__init__()
        self.table_name = "rachas_usuario"
        self.entity_class = RachaUsuario

    def find_by_user_and_type(self, user_id: int, tipo_racha: str) -> Optional[RachaUsuario]:
        """Encuentra una racha específica de un usuario"""
        query = """
            SELECT id, user_id, tipo_racha, racha_actual, mejor_racha,
                   ultimo_registro, ultimo_logro, created_at, updated_at
            FROM rachas_usuario
            WHERE user_id = %s AND tipo_racha = %s
        """
        results = self.execute_query(query, (user_id, tipo_racha))
        return self.entity_class.from_dict(results[0]) if results else None

    def find_by_user(self, user_id: int) -> List[RachaUsuario]:
        """Obtiene todas las rachas de un usuario"""
        query = """
            SELECT id, user_id, tipo_racha, racha_actual, mejor_racha,
                   ultimo_registro, ultimo_logro, created_at, updated_at
            FROM rachas_usuario
            WHERE user_id = %s
        """
        results = self.execute_query(query, (user_id,))
        return [self.entity_class.from_dict(row) for row in results]

    def create_or_update(self, racha: RachaUsuario) -> RachaUsuario:
        """Crea o actualiza una racha de usuario"""
        existing = self.find_by_user_and_type(racha.user_id, racha.tipo_racha)

        if existing:
            # Actualizar racha existente
            query = """
                UPDATE rachas_usuario
                SET racha_actual = %s, mejor_racha = %s, ultimo_registro = %s,
                    ultimo_logro = %s, updated_at = NOW()
                WHERE user_id = %s AND tipo_racha = %s
            """
            params = (
                racha.racha_actual, racha.mejor_racha, racha.ultimo_registro,
                racha.ultimo_logro, racha.user_id, racha.tipo_racha
            )
            self.execute_non_query(query, params)
            racha.id = existing.id
        else:
            # Crear nueva racha
            query = """
                INSERT INTO rachas_usuario (
                    user_id, tipo_racha, racha_actual, mejor_racha,
                    ultimo_registro, ultimo_logro
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """
            params = (
                racha.user_id, racha.tipo_racha, racha.racha_actual,
                racha.mejor_racha, racha.ultimo_registro, racha.ultimo_logro
            )
            racha_id = self.execute_insert(query, params)
            racha.id = racha_id

        return racha

    def actualizar_racha_registro(self, user_id: int) -> RachaUsuario:
        """Actualiza la racha de registro diario"""
        from datetime import date, timedelta

        racha = self.find_by_user_and_type(user_id, 'registro') or RachaUsuario(
            user_id=user_id,
            tipo_racha='registro',
            racha_actual=0,
            mejor_racha=0
        )

        hoy = date.today()
        ayer = hoy - timedelta(days=1)

        # Si el último registro fue hoy, no hacer nada
        if racha.ultimo_registro == hoy:
            return racha

        # Si el último registro fue ayer, incrementar racha
        if racha.ultimo_registro == ayer:
            racha.racha_actual += 1
        else:
            # Si fue antes de ayer, reiniciar racha
            racha.racha_actual = 1

        # Actualizar mejor racha si es necesario
        if racha.racha_actual > racha.mejor_racha:
            racha.mejor_racha = racha.racha_actual
            racha.ultimo_logro = hoy

        racha.ultimo_registro = hoy

        return self.create_or_update(racha)

    def actualizar_racha_ahorro(self, user_id: int) -> RachaUsuario:
        """Actualiza la racha de ahorro (objetivos con progreso)"""
        # Verificar si el usuario tiene objetivos activos con progreso
        objetivo_repo = ObjetivoRepository()
        objetivos = objetivo_repo.find_by_user(user_id)

        racha = self.find_by_user_and_type(user_id, 'ahorro') or RachaUsuario(
            user_id=user_id,
            tipo_racha='ahorro',
            racha_actual=0,
            mejor_racha=0
        )

        # Verificar si hay progreso en objetivos activos
        tiene_progreso = any(obj.ahorro_actual > 0 for obj in objetivos if obj.es_activo)

        if tiene_progreso:
            racha.racha_actual = max(1, racha.racha_actual)
        else:
            racha.racha_actual = 0

        if racha.racha_actual > racha.mejor_racha:
            racha.mejor_racha = racha.racha_actual
            racha.ultimo_logro = date.today()

        racha.ultimo_registro = date.today()

        return self.create_or_update(racha)

    def actualizar_racha_objetivos(self, user_id: int) -> RachaUsuario:
        """Actualiza la racha de objetivos (basada en objetivos activos)"""
        objetivo_repo = ObjetivoRepository()
        objetivos_activos = [obj for obj in objetivo_repo.find_by_user(user_id) if obj.es_activo]

        racha = self.find_by_user_and_type(user_id, 'objetivos') or RachaUsuario(
            user_id=user_id,
            tipo_racha='objetivos',
            racha_actual=0,
            mejor_racha=0
        )

        # La racha de objetivos se basa en tener objetivos activos
        if objetivos_activos:
            racha.racha_actual = max(1, racha.racha_actual)
        else:
            racha.racha_actual = 0

        if racha.racha_actual > racha.mejor_racha:
            racha.mejor_racha = racha.racha_actual
            racha.ultimo_logro = date.today()

        racha.ultimo_registro = date.today()

        return self.create_or_update(racha)


class GastoPlanificadoRepository(BaseRepository):
    """Repositorio para manejo de gastos planificados"""

    def __init__(self):
        super().__init__()
        self.table_name = "gastos_planificados"
        self.entity_class = GastoPlanificado

    def find_by_user(self, user_id: int) -> List[GastoPlanificado]:
        """Obtiene todos los gastos planificados de un usuario"""
        query = """
            SELECT id, user_id, categoria_id, tipo_pago_id, prioridad_id, estado_id,
                   concepto, descripcion, monto_estimado, fecha_planificada, fecha_limite,
                   es_recurrente, frecuencia_dias, proximo_gasto, fecha_fin_recurrencia,
                   proveedor, notas, notificar_dias_antes, ultima_notificacion,
                   created_by, created_at, updated_at
            FROM gastos_planificados
            WHERE user_id = %s
            ORDER BY fecha_planificada ASC
        """
        results = self.execute_query(query, (user_id,))
        return [self.entity_class.from_dict(row) for row in results]

    def create(self, gasto_planificado: GastoPlanificado) -> GastoPlanificado:
        """Crea un nuevo gasto planificado"""
        query = """
            INSERT INTO gastos_planificados (
                user_id, categoria_id, tipo_pago_id, prioridad_id, estado_id,
                concepto, descripcion, monto_estimado, fecha_planificada, fecha_limite,
                es_recurrente, frecuencia_dias, proximo_gasto, fecha_fin_recurrencia,
                proveedor, notas, notificar_dias_antes, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            gasto_planificado.user_id, gasto_planificado.categoria_id,
            gasto_planificado.tipo_pago_id, gasto_planificado.prioridad_id,
            gasto_planificado.estado_id, gasto_planificado.concepto,
            gasto_planificado.descripcion, gasto_planificado.monto_estimado,
            gasto_planificado.fecha_planificada, gasto_planificado.fecha_limite,
            gasto_planificado.es_recurrente, gasto_planificado.frecuencia_dias,
            gasto_planificado.proximo_gasto, gasto_planificado.fecha_fin_recurrencia,
            gasto_planificado.proveedor, gasto_planificado.notas,
            gasto_planificado.notificar_dias_antes, gasto_planificado.created_by
        )

        gasto_id = self.execute_insert(query, params)
        gasto_planificado.id = gasto_id
        return gasto_planificado

    def update_status(self, gasto_id: int, nuevo_estado_id: int) -> bool:
        """Actualiza el estado de un gasto planificado"""
        logger.info(f"Updating planned expense {gasto_id} to status {nuevo_estado_id}")

        # Verificar que el registro existe antes de actualizar
        check_query = "SELECT id, estado_id FROM gastos_planificados WHERE id = %s"
        existing_records = self.execute_query(check_query, (gasto_id,))
        logger.info(f"Found records for ID {gasto_id}: {existing_records}")

        query = """
            UPDATE gastos_planificados
            SET estado_id = %s, updated_at = NOW()
            WHERE id = %s
        """
        affected_rows = self.execute_non_query(query, (nuevo_estado_id, gasto_id))
        logger.info(f"Update query affected {affected_rows} rows")
        result = affected_rows > 0
        logger.info(f"Update status returning: {result}")
        return result

    def delete(self, gasto_id: int) -> bool:
        """Elimina un gasto planificado"""
        query = "DELETE FROM gastos_planificados WHERE id = %s"
        return self.execute_non_query(query, (gasto_id,)) > 0