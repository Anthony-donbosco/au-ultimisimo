from typing import List, Optional, Dict, Any
from datetime import datetime, date
import json
from utils.database import get_db
from models.tareas_base import TareaAsignada, EstadoTarea, TareaComentario, TareaHistorial, to_dict

class TareasRepository:

    @staticmethod
    def get_estados_tarea() -> List[EstadoTarea]:
        """Obtiene todos los estados de tarea activos"""
        db = get_db()

        query = """
            SELECT * FROM estados_tarea
            WHERE es_activo = 1
            ORDER BY orden_visualizacion
        """

        rows = db.fetch_all(query)
        return [EstadoTarea(row) for row in rows] if rows else []

    @staticmethod
    def crear_tarea(tarea_data: Dict[str, Any]) -> int:
        """Crea una nueva tarea asignada (sin categorías)"""
        db = get_db()

        if 'estado_id' not in tarea_data:
            estado_pendiente = db.fetch_one("SELECT id FROM estados_tarea WHERE codigo = 'pendiente'")
            tarea_data['estado_id'] = estado_pendiente['id'] if estado_pendiente else 1

        with db.get_db_cursor() as (cursor, connection):
            # --- CAMBIO AQUÍ: Se ha quitado 'categoria' de la consulta ---
            query = """
                INSERT INTO tareas_asignadas (
                    titulo, descripcion, empresa_id, empleado_id, prioridad_id, estado_id,
                    fecha_limite, tiempo_estimado_horas, ubicacion,
                    requiere_aprobacion, notas_empresa, es_recurrente, frecuencia_dias,
                    asignada_por
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """

            cursor.execute(query, (
                tarea_data['titulo'],
                tarea_data.get('descripcion'),
                tarea_data['empresa_id'],
                tarea_data['empleado_id'],
                tarea_data['prioridad_id'],
                tarea_data['estado_id'],
                tarea_data.get('fecha_limite'),
                tarea_data.get('tiempo_estimado_horas'),
                # Se quita tarea_data.get('categoria'),
                tarea_data.get('ubicacion'),
                tarea_data.get('requiere_aprobacion', False),
                tarea_data.get('notas_empresa'),
                tarea_data.get('es_recurrente', False),
                tarea_data.get('frecuencia_dias'),
                tarea_data['asignada_por']
            ))
            tarea_id = cursor.lastrowid

            # ... (el resto de la función sigue igual) ...
            cursor.execute("""
                INSERT INTO tareas_historial (tarea_id, estado_nuevo_id, changed_by, motivo)
                VALUES (%s, %s, %s, %s)
            """, (tarea_id, tarea_data['estado_id'], tarea_data['asignada_por'], 'Tarea creada'))

            connection.commit()

        return tarea_id

    @staticmethod
    def get_tareas_empleado(empleado_id: int, limit: int = 10, estado: Optional[str] = None) -> List[TareaAsignada]:
        """Obtiene las tareas asignadas a un empleado"""
        db = get_db()

        params = [empleado_id]
        where_clause = "WHERE t.empleado_id = %s"

        if estado:
            where_clause += " AND et.codigo = %s"
            params.append(estado)

        query = f"""
            SELECT t.*,
                   e.first_name as empresa_nombre,
                   p.nombre as prioridad_nombre, p.color as prioridad_color,
                   et.nombre as estado_nombre, et.color as estado_color, et.icono as estado_icono,
                   a.first_name as asignada_por_nombre
            FROM tareas_asignadas t
            JOIN users e ON t.empresa_id = e.id
            JOIN prioridades p ON t.prioridad_id = p.id
            JOIN estados_tarea et ON t.estado_id = et.id
            JOIN users a ON t.asignada_por = a.id
            {where_clause}
            ORDER BY
                CASE
                    WHEN et.codigo = 'pendiente' THEN 1
                    WHEN et.codigo = 'en_progreso' THEN 2
                    ELSE 3
                END,
                t.fecha_limite ASC,
                p.nivel_numerico ASC
            LIMIT %s
        """

        params.append(limit)
        rows = db.fetch_all(query, params)
        return [TareaAsignada(row) for row in rows] if rows else []

    @staticmethod
    def get_tareas_empresa(empresa_id: int, limit: int = 50) -> List[TareaAsignada]:
        """Obtiene las tareas asignadas por una empresa"""
        db = get_db()

        query = """
            SELECT t.*,
                   CONCAT(emp.first_name, ' ', emp.last_name) as empleado_nombre,
                   p.nombre as prioridad_nombre, p.color as prioridad_color,
                   et.nombre as estado_nombre, et.color as estado_color, et.icono as estado_icono,
                   a.first_name as asignada_por_nombre
            FROM tareas_asignadas t
            JOIN users emp ON t.empleado_id = emp.id
            JOIN prioridades p ON t.prioridad_id = p.id
            JOIN estados_tarea et ON t.estado_id = et.id
            JOIN users a ON t.asignada_por = a.id
            WHERE t.empresa_id = %s
            ORDER BY t.created_at DESC
            LIMIT %s
        """

        rows = db.fetch_all(query, (empresa_id, limit))
        return [TareaAsignada(row) for row in rows] if rows else []

    @staticmethod
    def get_tarea_by_id(tarea_id: int, user_id: int) -> Optional[TareaAsignada]:
        """Obtiene una tarea por ID, verificando permisos"""
        db = get_db()

        query = """
            SELECT t.*,
                   e.first_name as empresa_nombre,
                   CONCAT(emp.first_name, ' ', emp.last_name) as empleado_nombre,
                   p.nombre as prioridad_nombre, p.color as prioridad_color,
                   et.nombre as estado_nombre, et.color as estado_color, et.icono as estado_icono,
                   a.first_name as asignada_por_nombre
            FROM tareas_asignadas t
            JOIN users e ON t.empresa_id = e.id
            JOIN users emp ON t.empleado_id = emp.id
            JOIN prioridades p ON t.prioridad_id = p.id
            JOIN estados_tarea et ON t.estado_id = et.id
            JOIN users a ON t.asignada_por = a.id
            WHERE t.id = %s
            AND (t.empleado_id = %s OR t.empresa_id = %s)
        """

        row = db.fetch_one(query, (tarea_id, user_id, user_id))
        return TareaAsignada(row) if row else None

    @staticmethod
    def actualizar_estado_tarea(tarea_id: int, nuevo_estado_id: int, user_id: int, motivo: Optional[str] = None) -> bool:
        """Actualiza el estado de una tarea"""
        db = get_db()

        # Obtener estado actual
        tarea_actual = db.fetch_one("SELECT estado_id FROM tareas_asignadas WHERE id = %s", (tarea_id,))

        if not tarea_actual:
            return False

        estado_anterior = tarea_actual['estado_id']

        with db.get_db_cursor() as (cursor, connection):
            # Obtener información del nuevo estado
            estado_info = db.fetch_one("SELECT codigo FROM estados_tarea WHERE id = %s", (nuevo_estado_id,))

            # Preparar campos adicionales según el estado
            update_fields = "estado_id = %s"
            params = [nuevo_estado_id]

            if estado_info and estado_info['codigo'] == 'en_progreso':
                update_fields += ", fecha_inicio = NOW()"
            elif estado_info and estado_info['codigo'] == 'completada':
                update_fields += ", fecha_completada = NOW()"

            # Actualizar estado
            cursor.execute(f"""
                UPDATE tareas_asignadas
                SET {update_fields}
                WHERE id = %s
            """, params + [tarea_id])

            # Registrar en historial
            cursor.execute("""
                INSERT INTO tareas_historial (tarea_id, estado_anterior_id, estado_nuevo_id, changed_by, motivo)
                VALUES (%s, %s, %s, %s, %s)
            """, (tarea_id, estado_anterior, nuevo_estado_id, user_id, motivo or 'Cambio de estado'))

            connection.commit()

        return True

    @staticmethod
    def agregar_comentario(tarea_id: int, user_id: int, comentario: str, es_interno: bool = False) -> int:
        """Agrega un comentario a una tarea"""
        db = get_db()

        with db.get_db_cursor() as (cursor, connection):
            cursor.execute("""
                INSERT INTO tareas_comentarios (tarea_id, user_id, comentario, es_interno)
                VALUES (%s, %s, %s, %s)
            """, (tarea_id, user_id, comentario, es_interno))

            comentario_id = cursor.lastrowid
            connection.commit()

        return comentario_id

    @staticmethod
    def get_comentarios_tarea(tarea_id: int, user_id: int, incluir_internos: bool = False) -> List[TareaComentario]:
        """Obtiene los comentarios de una tarea"""
        db = get_db()

        params = [tarea_id]
        where_clause = "WHERE tc.tarea_id = %s"

        if not incluir_internos:
            where_clause += " AND tc.es_interno = 0"

        query = f"""
            SELECT tc.*,
                   CONCAT(u.first_name, ' ', u.last_name) as user_nombre
            FROM tareas_comentarios tc
            JOIN users u ON tc.user_id = u.id
            {where_clause}
            ORDER BY tc.created_at ASC
        """

        rows = db.fetch_all(query, params)
        return [TareaComentario(row) for row in rows] if rows else []

    @staticmethod
    def get_estadisticas_empleado(empleado_id: int) -> Dict[str, Any]:
        """Obtiene estadísticas de tareas del empleado"""
        db = get_db()

        # Tareas por estado
        tareas_por_estado = db.fetch_all("""
            SELECT et.codigo, et.nombre, et.color, COUNT(*) as cantidad
            FROM tareas_asignadas t
            JOIN estados_tarea et ON t.estado_id = et.id
            WHERE t.empleado_id = %s
            GROUP BY et.id, et.codigo, et.nombre, et.color
        """, (empleado_id,))

        # Total de tareas
        total_result = db.fetch_one("""
            SELECT COUNT(*) as total
            FROM tareas_asignadas
            WHERE empleado_id = %s
        """, (empleado_id,))

        total_tareas = total_result['total'] if total_result else 0

        # Tareas vencidas
        vencidas_result = db.fetch_one("""
            SELECT COUNT(*) as vencidas
            FROM tareas_asignadas t
            JOIN estados_tarea et ON t.estado_id = et.id
            WHERE t.empleado_id = %s
            AND t.fecha_limite < CURDATE()
            AND et.codigo NOT IN ('completada', 'cancelada')
        """, (empleado_id,))

        tareas_vencidas = vencidas_result['vencidas'] if vencidas_result else 0

        return {
            'total_tareas': total_tareas,
            'tareas_vencidas': tareas_vencidas,
            'tareas_por_estado': tareas_por_estado or []
        }

    @staticmethod
    def asociar_categoria_a_tarea(tarea_id: int, categoria_id: int):
        """
        Crea una asociación entre una tarea y una categoría en la tabla intermedia.
        Asume que tienes una tabla llamada 'tarea_has_categoria' 
        con las columnas 'tarea_id' y 'categoria_id'.
        """
        db = get_db()
        try:
            # Usar context manager para asegurar el commit y el cierre de la conexión
            with db.get_db_cursor() as (cursor, connection):
                query = "INSERT INTO tarea_has_categoria (tarea_id, categoria_id) VALUES (%s, %s)"
                cursor.execute(query, (tarea_id, categoria_id))
                connection.commit()
        except Exception as e:
            print(f"Error al asociar categoría {categoria_id} a tarea {tarea_id}: {e}")
            # Es importante relanzar la excepción para que el servicio pueda
            # manejar un posible rollback de la transacción general.
            raise e