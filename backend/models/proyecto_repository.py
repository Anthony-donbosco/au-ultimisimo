"""
Repositorio para gestión de proyectos de empresa
Maneja la persistencia de proyectos, metas y comentarios
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
from utils.database import db_manager

logger = logging.getLogger(__name__)

class ProyectoRepository:
    """Repositorio para operaciones de proyectos"""

    @staticmethod
    def crear_proyecto(datos_proyecto: Dict[str, Any]) -> Optional[int]:
        """Crear un nuevo proyecto"""
        try:
            query = """
                INSERT INTO proyectos (
                    titulo, descripcion, empresa_id, estado_id,
                    fecha_inicio, fecha_limite, prioridad,
                    presupuesto, notas, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            params = (
                datos_proyecto['titulo'],
                datos_proyecto.get('descripcion'),
                datos_proyecto['empresa_id'],
                datos_proyecto.get('estado_id', 1),
                datos_proyecto.get('fecha_inicio'),
                datos_proyecto.get('fecha_limite'),
                datos_proyecto.get('prioridad', 'media'),
                datos_proyecto.get('presupuesto', 0.00),
                datos_proyecto.get('notas'),
                datos_proyecto['created_by']
            )

            return db_manager.execute_query(query, params)

        except Exception as e:
            logger.error(f"Error creando proyecto: {e}")
            return None

    @staticmethod
    def get_proyectos_empresa(empresa_id: int) -> List[Dict[str, Any]]:
        """Obtener todos los proyectos de una empresa"""
        try:
            query = """
                SELECT
                    p.id, p.titulo, p.descripcion, p.fecha_inicio, p.fecha_limite,
                    p.fecha_completado, p.progreso_porcentaje, p.prioridad,
                    p.presupuesto, p.notas, p.created_at, p.updated_at,
                    ep.nombre as estado_nombre, ep.codigo as estado_codigo,
                    ep.color as estado_color,
                    creator.username as creado_por_username,
                    (SELECT COUNT(*) FROM proyecto_metas WHERE proyecto_id = p.id) as total_metas,
                    (SELECT COUNT(*) FROM proyecto_metas WHERE proyecto_id = p.id AND completado = TRUE) as metas_completadas
                FROM proyectos p
                JOIN estados_proyecto ep ON p.estado_id = ep.id
                JOIN users creator ON p.created_by = creator.id
                WHERE p.empresa_id = %s
                ORDER BY p.updated_at DESC
            """

            results = db_manager.fetch_all(query, (empresa_id,))

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
                    'notas': row['notas'],
                    'creadoEn': row['created_at'].isoformat(),
                    'actualizadoEn': row['updated_at'].isoformat(),
                    'estado': {
                        'nombre': row['estado_nombre'],
                        'codigo': row['estado_codigo'],
                        'color': row['estado_color']
                    },
                    'creadoPor': row['creado_por_username'],
                    'estadisticas': {
                        'totalMetas': row['total_metas'],
                        'metasCompletadas': row['metas_completadas']
                    }
                })

            return proyectos

        except Exception as e:
            logger.error(f"Error obteniendo proyectos de empresa {empresa_id}: {e}")
            return []

    @staticmethod
    def get_proyecto_detalle(proyecto_id: int, empresa_id: int) -> Optional[Dict[str, Any]]:
        """Obtener detalles completos de un proyecto"""
        try:
            # Verificar que el proyecto pertenece a la empresa
            query_proyecto = """
                SELECT
                    p.id, p.titulo, p.descripcion, p.fecha_inicio, p.fecha_limite,
                    p.fecha_completado, p.progreso_porcentaje, p.prioridad,
                    p.presupuesto, p.monto_gastado, p.ultima_actualizacion_economica,
                    p.notas, p.created_at, p.updated_at,
                    ep.nombre as estado_nombre, ep.codigo as estado_codigo,
                    ep.color as estado_color,
                    creator.username as creado_por_username
                FROM proyectos p
                JOIN estados_proyecto ep ON p.estado_id = ep.id
                JOIN users creator ON p.created_by = creator.id
                WHERE p.id = %s AND p.empresa_id = %s
            """

            proyecto = db_manager.fetch_one(query_proyecto, (proyecto_id, empresa_id))
            if not proyecto:
                return None

            # Obtener metas del proyecto
            query_metas = """
                SELECT id, titulo, descripcion, completado, orden,
                       fecha_limite, fecha_completado, created_at
                FROM proyecto_metas
                WHERE proyecto_id = %s
                ORDER BY orden ASC, created_at ASC
            """

            metas = db_manager.fetch_all(query_metas, (proyecto_id,))

            # Calcular información económica
            presupuesto = float(proyecto['presupuesto'] or 0)
            monto_gastado = float(proyecto['monto_gastado'] or 0)
            porcentaje_gastado = (monto_gastado / presupuesto * 100) if presupuesto > 0 else 0

            return {
                'id': proyecto['id'],
                'titulo': proyecto['titulo'],
                'descripcion': proyecto['descripcion'],
                'fechaInicio': proyecto['fecha_inicio'].isoformat() if proyecto['fecha_inicio'] else None,
                'fechaLimite': proyecto['fecha_limite'].isoformat() if proyecto['fecha_limite'] else None,
                'fechaCompletado': proyecto['fecha_completado'].isoformat() if proyecto['fecha_completado'] else None,
                'progresoporcentaje': float(proyecto['progreso_porcentaje']),
                'prioridad': proyecto['prioridad'],
                'presupuesto': presupuesto,
                'montoGastado': monto_gastado,
                'montoRestante': presupuesto - monto_gastado,
                'porcentajeGastado': round(porcentaje_gastado, 2),
                'ultimaActualizacionEconomica': proyecto['ultima_actualizacion_economica'].isoformat() if proyecto['ultima_actualizacion_economica'] else None,
                'notas': proyecto['notas'],
                'creadoEn': proyecto['created_at'].isoformat(),
                'actualizadoEn': proyecto['updated_at'].isoformat(),
                'estado': {
                    'nombre': proyecto['estado_nombre'],
                    'codigo': proyecto['estado_codigo'],
                    'color': proyecto['estado_color']
                },
                'creadoPor': proyecto['creado_por_username'],
                'metas': [
                    {
                        'id': meta['id'],
                        'titulo': meta['titulo'],
                        'descripcion': meta['descripcion'],
                        'completado': bool(meta['completado']),
                        'orden': meta['orden'],
                        'fechaLimite': meta['fecha_limite'].isoformat() if meta['fecha_limite'] else None,
                        'fechaCompletado': meta['fecha_completado'].isoformat() if meta['fecha_completado'] else None,
                        'creadoEn': meta['created_at'].isoformat()
                    }
                    for meta in metas
                ]
            }

        except Exception as e:
            logger.error(f"Error obteniendo detalle del proyecto {proyecto_id}: {e}")
            return None

    @staticmethod
    def agregar_meta(proyecto_id: int, datos_meta: Dict[str, Any]) -> Optional[int]:
        """Agregar una nueva meta al proyecto"""
        try:
            logger.info(f"📝 Repository: Agregando meta a proyecto {proyecto_id}")
            logger.info(f"📝 Repository: Datos de meta: {datos_meta}")

            query = """
                INSERT INTO proyecto_metas (
                    proyecto_id, titulo, descripcion, orden, fecha_limite
                ) VALUES (%s, %s, %s, %s, %s)
            """

            params = (
                proyecto_id,
                datos_meta['titulo'],
                datos_meta.get('descripcion'),
                datos_meta.get('orden', 0),
                datos_meta.get('fecha_limite')
            )

            logger.info(f"📝 Repository: Query: {query}")
            logger.info(f"📝 Repository: Params: {params}")

            meta_id = db_manager.execute_query(query, params)
            logger.info(f"📝 Repository: Meta creada con ID: {meta_id}")

            # Recalcular progreso después de agregar meta
            if meta_id:
                ProyectoRepository._actualizar_progreso_proyecto(proyecto_id)
                logger.info(f"📝 Repository: Progreso actualizado para proyecto {proyecto_id}")

            return meta_id

        except Exception as e:
            logger.error(f"Error agregando meta al proyecto {proyecto_id}: {e}")
            return None

    @staticmethod
    def actualizar_meta(meta_id: int, datos_meta: Dict[str, Any]) -> bool:
        """Actualizar una meta existente"""
        try:
            # Primero obtener el proyecto_id de la meta
            query_proyecto = "SELECT proyecto_id FROM proyecto_metas WHERE id = %s"
            meta_result = db_manager.fetch_one(query_proyecto, (meta_id,))

            if not meta_result:
                logger.error(f"Meta {meta_id} no encontrada")
                return False

            proyecto_id = meta_result['proyecto_id']

            query = """
                UPDATE proyecto_metas
                SET titulo = %s, descripcion = %s, completado = %s,
                    fecha_limite = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """

            params = (
                datos_meta['titulo'],
                datos_meta.get('descripcion'),
                datos_meta.get('completado', False),
                datos_meta.get('fecha_limite'),
                meta_id
            )

            result = db_manager.execute_query(query, params)

            # Actualizar progreso manualmente
            if result is not None:
                ProyectoRepository._actualizar_progreso_proyecto(proyecto_id)

            return result is not None

        except Exception as e:
            logger.error(f"Error actualizando meta {meta_id}: {e}")
            return False

    @staticmethod
    def completar_meta(meta_id: int) -> bool:
        """Marcar una meta como completada"""
        try:
            logger.info(f"Completando meta {meta_id}")

            # Primero obtener el proyecto_id de la meta
            query_proyecto = "SELECT proyecto_id FROM proyecto_metas WHERE id = %s"
            meta_result = db_manager.fetch_one(query_proyecto, (meta_id,))

            if not meta_result:
                logger.error(f"Meta {meta_id} no encontrada")
                return False

            proyecto_id = meta_result['proyecto_id']

            query = """
                UPDATE proyecto_metas
                SET completado = TRUE, fecha_completado = CURRENT_TIMESTAMP
                WHERE id = %s
            """

            result = db_manager.execute_query(query, (meta_id,))
            logger.info(f"Meta {meta_id} completada. Resultado: {result}")

            # Actualizar progreso manualmente
            if result is not None:
                ProyectoRepository._actualizar_progreso_proyecto(proyecto_id)

            return result is not None

        except Exception as e:
            logger.error(f"Error completando meta {meta_id}: {e}")
            return False

    @staticmethod
    def _actualizar_progreso_proyecto(proyecto_id: int) -> None:
        """Actualizar el progreso del proyecto basado en metas completadas"""
        try:
            logger.info(f"Actualizando progreso para proyecto {proyecto_id}")

            # Calcular progreso
            query_progreso = """
                SELECT
                    COUNT(*) as total_metas,
                    SUM(CASE WHEN completado = TRUE THEN 1 ELSE 0 END) as metas_completadas
                FROM proyecto_metas
                WHERE proyecto_id = %s
            """

            progreso_result = db_manager.fetch_one(query_progreso, (proyecto_id,))

            if progreso_result and progreso_result['total_metas'] > 0:
                total_metas = int(progreso_result['total_metas'])
                metas_completadas = int(progreso_result['metas_completadas'] or 0)
                nuevo_progreso = (metas_completadas / total_metas) * 100.0

                logger.info(f"Proyecto {proyecto_id}: {metas_completadas}/{total_metas} metas = {nuevo_progreso}%")

                # Actualizar progreso del proyecto
                update_query = """
                    UPDATE proyectos
                    SET progreso_porcentaje = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """
                result = db_manager.execute_query(update_query, (nuevo_progreso, proyecto_id))
                logger.info(f"Progreso actualizado. Resultado: {result}")

                # Si se completó el 100%, marcar proyecto como completado
                if nuevo_progreso == 100.0:
                    complete_query = """
                        UPDATE proyectos
                        SET estado_id = 4, fecha_completado = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """
                    db_manager.execute_query(complete_query, (proyecto_id,))
            else:
                logger.info(f"Proyecto {proyecto_id} no tiene metas o no se encontraron datos")

        except Exception as e:
            logger.error(f"Error actualizando progreso para proyecto {proyecto_id}: {e}")

    @staticmethod
    def recalcular_progreso_proyecto(proyecto_id: int) -> bool:
        """Método público para recalcular el progreso de un proyecto"""
        try:
            ProyectoRepository._actualizar_progreso_proyecto(proyecto_id)
            return True
        except Exception as e:
            logger.error(f"Error recalculando progreso del proyecto {proyecto_id}: {e}")
            return False

    @staticmethod
    def actualizar_proyecto(proyecto_id: int, empresa_id: int, datos_proyecto: Dict[str, Any]) -> bool:
        """Actualizar un proyecto existente"""
        try:
            query = """
                UPDATE proyectos
                SET titulo = %s, descripcion = %s, estado_id = %s,
                    fecha_inicio = %s, fecha_limite = %s, prioridad = %s,
                    presupuesto = %s, notas = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND empresa_id = %s
            """

            params = (
                datos_proyecto['titulo'],
                datos_proyecto.get('descripcion'),
                datos_proyecto.get('estado_id'),
                datos_proyecto.get('fecha_inicio'),
                datos_proyecto.get('fecha_limite'),
                datos_proyecto.get('prioridad'),
                datos_proyecto.get('presupuesto'),
                datos_proyecto.get('notas'),
                proyecto_id,
                empresa_id
            )

            result = db_manager.execute_query(query, params)
            return result is not None

        except Exception as e:
            logger.error(f"Error actualizando proyecto {proyecto_id}: {e}")
            return False

    @staticmethod
    def eliminar_proyecto(proyecto_id: int, empresa_id: int) -> bool:
        """Eliminar un proyecto (solo si pertenece a la empresa)"""
        try:
            query = "DELETE FROM proyectos WHERE id = %s AND empresa_id = %s"
            result = db_manager.execute_query(query, (proyecto_id, empresa_id))
            return result is not None

        except Exception as e:
            logger.error(f"Error eliminando proyecto {proyecto_id}: {e}")
            return False

    @staticmethod
    def get_estadisticas_empresa(empresa_id: int) -> Dict[str, Any]:
        """Obtener estadísticas de proyectos de la empresa"""
        try:
            query = """
                SELECT
                    COUNT(*) as total_proyectos,
                    COUNT(CASE WHEN ep.codigo = 'completado' THEN 1 END) as proyectos_completados,
                    COUNT(CASE WHEN ep.codigo = 'en_progreso' THEN 1 END) as proyectos_activos,
                    COUNT(CASE WHEN ep.codigo = 'planificado' THEN 1 END) as proyectos_planificados,
                    ROUND(AVG(p.progreso_porcentaje), 2) as progreso_promedio,
                    SUM(p.presupuesto) as presupuesto_total
                FROM proyectos p
                JOIN estados_proyecto ep ON p.estado_id = ep.id
                WHERE p.empresa_id = %s
            """

            result = db_manager.fetch_one(query, (empresa_id,))

            if result:
                return {
                    'totalProyectos': result['total_proyectos'],
                    'proyectosCompletados': result['proyectos_completados'],
                    'proyectosActivos': result['proyectos_activos'],
                    'proyectosPlanificados': result['proyectos_planificados'],
                    'progresoPromedio': float(result['progreso_promedio'] or 0),
                    'presupuestoTotal': float(result['presupuesto_total'] or 0)
                }

            return {
                'totalProyectos': 0,
                'proyectosCompletados': 0,
                'proyectosActivos': 0,
                'proyectosPlanificados': 0,
                'progresoPromedio': 0.0,
                'presupuestoTotal': 0.0
            }

        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de empresa {empresa_id}: {e}")
            return {}

    @staticmethod
    def get_estados_proyecto() -> List[Dict[str, Any]]:
        """Obtener todos los estados de proyecto disponibles"""
        try:
            query = "SELECT id, nombre, codigo, color FROM estados_proyecto ORDER BY id"
            results = db_manager.fetch_all(query)

            return [
                {
                    'id': row['id'],
                    'nombre': row['nombre'],
                    'codigo': row['codigo'],
                    'color': row['color']
                }
                for row in results
            ]

        except Exception as e:
            logger.error(f"Error obteniendo estados de proyecto: {e}")
            return []

    # ============================================================================
    # MÉTODOS PARA AVANCES ECONÓMICOS
    # ============================================================================

    @staticmethod
    def agregar_gasto_proyecto(proyecto_id: int, datos_gasto: Dict[str, Any]) -> Optional[int]:
        """Agregar un gasto al proyecto"""
        try:
            query = """
                INSERT INTO proyecto_gastos (
                    proyecto_id, concepto, monto, fecha_gasto,
                    descripcion, factura_url, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """

            params = (
                proyecto_id,
                datos_gasto['concepto'],
                datos_gasto['monto'],
                datos_gasto.get('fecha_gasto'),
                datos_gasto.get('descripcion'),
                datos_gasto.get('factura_url'),
                datos_gasto['created_by']
            )

            return db_manager.execute_query(query, params)

        except Exception as e:
            logger.error(f"Error agregando gasto al proyecto {proyecto_id}: {e}")
            return None

    @staticmethod
    def get_gastos_proyecto(proyecto_id: int) -> List[Dict[str, Any]]:
        """Obtener todos los gastos de un proyecto"""
        try:
            query = """
                SELECT
                    pg.id, pg.concepto, pg.monto, pg.fecha_gasto,
                    pg.descripcion, pg.factura_url, pg.created_at,
                    creator.username as creado_por_username
                FROM proyecto_gastos pg
                JOIN users creator ON pg.created_by = creator.id
                WHERE pg.proyecto_id = %s
                ORDER BY pg.fecha_gasto DESC, pg.created_at DESC
            """

            results = db_manager.fetch_all(query, (proyecto_id,))

            gastos = []
            for row in results:
                gastos.append({
                    'id': row['id'],
                    'concepto': row['concepto'],
                    'monto': float(row['monto']),
                    'fechaGasto': row['fecha_gasto'].isoformat() if row['fecha_gasto'] else None,
                    'descripcion': row['descripcion'],
                    'facturaUrl': row['factura_url'],
                    'creadoEn': row['created_at'].isoformat(),
                    'creadoPor': row['creado_por_username']
                })

            return gastos

        except Exception as e:
            logger.error(f"Error obteniendo gastos del proyecto {proyecto_id}: {e}")
            return []

    @staticmethod
    def actualizar_gasto_proyecto(gasto_id: int, datos_gasto: Dict[str, Any]) -> bool:
        """Actualizar un gasto del proyecto"""
        try:
            query = """
                UPDATE proyecto_gastos
                SET concepto = %s, monto = %s, fecha_gasto = %s,
                    descripcion = %s, factura_url = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """

            params = (
                datos_gasto['concepto'],
                datos_gasto['monto'],
                datos_gasto.get('fecha_gasto'),
                datos_gasto.get('descripcion'),
                datos_gasto.get('factura_url'),
                gasto_id
            )

            result = db_manager.execute_query(query, params)
            return result is not None

        except Exception as e:
            logger.error(f"Error actualizando gasto {gasto_id}: {e}")
            return False

    @staticmethod
    def eliminar_gasto_proyecto(gasto_id: int) -> bool:
        """Eliminar un gasto del proyecto"""
        try:
            query = "DELETE FROM proyecto_gastos WHERE id = %s"
            result = db_manager.execute_query(query, (gasto_id,))
            return result is not None

        except Exception as e:
            logger.error(f"Error eliminando gasto {gasto_id}: {e}")
            return False

    @staticmethod
    def get_resumen_economico(proyecto_id: int) -> Dict[str, Any]:
        """Obtener resumen económico del proyecto"""
        try:
            query = """
                SELECT
                    p.presupuesto,
                    p.monto_gastado,
                    p.ultima_actualizacion_economica,
                    COUNT(pg.id) as total_gastos
                FROM proyectos p
                LEFT JOIN proyecto_gastos pg ON p.id = pg.proyecto_id
                WHERE p.id = %s
                GROUP BY p.id
            """

            result = db_manager.fetch_one(query, (proyecto_id,))

            if result:
                presupuesto = float(result['presupuesto'] or 0)
                monto_gastado = float(result['monto_gastado'] or 0)
                porcentaje_gastado = (monto_gastado / presupuesto * 100) if presupuesto > 0 else 0

                return {
                    'presupuesto': presupuesto,
                    'montoGastado': monto_gastado,
                    'montoRestante': presupuesto - monto_gastado,
                    'porcentajeGastado': round(porcentaje_gastado, 2),
                    'totalGastos': result['total_gastos'],
                    'ultimaActualizacion': result['ultima_actualizacion_economica'].isoformat() if result['ultima_actualizacion_economica'] else None
                }

            return {
                'presupuesto': 0.0,
                'montoGastado': 0.0,
                'montoRestante': 0.0,
                'porcentajeGastado': 0.0,
                'totalGastos': 0,
                'ultimaActualizacion': None
            }

        except Exception as e:
            logger.error(f"Error obteniendo resumen económico del proyecto {proyecto_id}: {e}")
            return {}