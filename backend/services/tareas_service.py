from typing import List, Optional, Dict, Any
from datetime import datetime, date
from models.tareas_repository import TareasRepository
from models.tareas_base import TareaAsignada, EstadoTarea, to_dict
from utils.database import get_db

class TareasService:

    @staticmethod
    def get_tareas_empleado(empleado_id: int, limit: int = 10, estado: Optional[str] = None) -> Dict[str, Any]:
        """Obtiene las tareas asignadas a un empleado"""
        try:
            tareas = TareasRepository.get_tareas_empleado(empleado_id, limit, estado)
            estadisticas = TareasRepository.get_estadisticas_empleado(empleado_id)

            return {
                'success': True,
                'tareas': [to_dict(tarea) for tarea in tareas],
                'estadisticas': estadisticas
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al obtener las tareas: {str(e)}'
            }

    @staticmethod
    def get_tareas_empresa(empresa_id: int, limit: int = 50) -> Dict[str, Any]:
        """Obtiene las tareas asignadas por una empresa"""
        try:
            tareas = TareasRepository.get_tareas_empresa(empresa_id, limit)

            return {
                'success': True,
                'tareas': [to_dict(tarea) for tarea in tareas]
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al obtener las tareas: {str(e)}'
            }

    @staticmethod
    def get_tarea_detalle(tarea_id: int, user_id: int) -> Dict[str, Any]:
        """Obtiene el detalle de una tarea específica"""
        try:
            tarea = TareasRepository.get_tarea_by_id(tarea_id, user_id)

            if not tarea:
                return {
                    'success': False,
                    'message': 'Tarea no encontrada o sin permisos'
                }

            # Obtener comentarios
            comentarios = TareasRepository.get_comentarios_tarea(tarea_id, user_id, False)

            return {
                'success': True,
                'tarea': to_dict(tarea),
                'comentarios': [to_dict(comentario) for comentario in comentarios]
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al obtener la tarea: {str(e)}'
            }

    @staticmethod
    def actualizar_estado_tarea(tarea_id: int, nuevo_estado: str, user_id: int, motivo: Optional[str] = None) -> Dict[str, Any]:
        """Actualiza el estado de una tarea"""
        try:
            # Obtener ID del estado
            estado_id = TareasService._get_estado_id_by_codigo(nuevo_estado)
            if not estado_id:
                return {
                    'success': False,
                    'message': 'Estado no válido'
                }

            # Verificar permisos
            tarea = TareasRepository.get_tarea_by_id(tarea_id, user_id)
            if not tarea:
                return {
                    'success': False,
                    'message': 'Tarea no encontrada o sin permisos'
                }

            success = TareasRepository.actualizar_estado_tarea(tarea_id, estado_id, user_id, motivo)

            if success:
                return {
                    'success': True,
                    'message': 'Estado actualizado exitosamente'
                }
            else:
                return {
                    'success': False,
                    'message': 'Error al actualizar el estado'
                }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al actualizar el estado: {str(e)}'
            }

    @staticmethod
    def agregar_comentario(tarea_id: int, user_id: int, comentario: str, es_interno: bool = False) -> Dict[str, Any]:
        """Agrega un comentario a una tarea"""
        try:
            # Verificar permisos
            tarea = TareasRepository.get_tarea_by_id(tarea_id, user_id)
            if not tarea:
                return {
                    'success': False,
                    'message': 'Tarea no encontrada o sin permisos'
                }

            comentario_id = TareasRepository.agregar_comentario(tarea_id, user_id, comentario, es_interno)

            return {
                'success': True,
                'message': 'Comentario agregado exitosamente',
                'comentario_id': comentario_id
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al agregar el comentario: {str(e)}'
            }

    @staticmethod
    def get_estados_tarea() -> Dict[str, Any]:
        """Obtiene todos los estados de tarea disponibles"""
        try:
            estados = TareasRepository.get_estados_tarea()

            return {
                'success': True,
                'estados': [to_dict(estado) for estado in estados]
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al obtener los estados: {str(e)}'
            }

    @staticmethod
    def get_empleados_empresa(empresa_id: int) -> Dict[str, Any]:
        """Obtiene los empleados de una empresa"""
        try:
            db = get_db()

            query = """
                SELECT u.id, u.username, u.first_name, u.last_name, u.email,
                       ed.puesto, ed.telefono
                FROM users u
                LEFT JOIN empleados_details ed ON u.id = ed.user_id
                WHERE u.id_rol = 3 AND u.created_by_empresa_id = %s
                AND u.is_active = 1
                ORDER BY u.first_name, u.last_name
            """

            empleados = db.fetch_all(query, (empresa_id,))

            return {
                'success': True,
                'empleados': empleados or []
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al obtener los empleados: {str(e)}'
            }

    @staticmethod
    def _validar_empleado_empresa(empleado_id: int, empresa_id: int) -> bool:
        """Valida que un empleado pertenezca a una empresa"""
        try:
            db = get_db()

            result = db.fetch_one("""
                SELECT COUNT(*) as count
                FROM users
                WHERE id = %s AND created_by_empresa_id = %s AND id_rol = 3
            """, (empleado_id, empresa_id))

            return result['count'] > 0 if result else False

        except Exception as e:
            return False

    @staticmethod
    def _get_estado_id_by_codigo(codigo: str) -> Optional[int]:
        """Obtiene el ID de un estado por su código"""
        try:
            db = get_db()

            result = db.fetch_one("SELECT id FROM estados_tarea WHERE codigo = %s", (codigo,))

            return result['id'] if result else None

        except Exception as e:
            return None

    @staticmethod
    def get_tareas_recientes_empleado(empleado_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Obtiene las tareas más recientes del empleado para el dashboard"""
        try:
            tareas = TareasRepository.get_tareas_empleado(empleado_id, limit)
            return [to_dict(tarea) for tarea in tareas]

        except Exception as e:
            return []

    @staticmethod
    def get_categorias_tareas() -> Dict[str, Any]:
        """Obtiene todas las categorías de tareas disponibles"""
        try:
            db = get_db()

            query = """
                SELECT id, codigo, nombre, descripcion, color, icono,
                       es_activa, orden_visualizacion, created_at
                FROM categorias_tareas
                WHERE es_activa = 1
                ORDER BY orden_visualizacion ASC, nombre ASC
            """

            categorias = db.fetch_all(query)

            return {
                'success': True,
                'categorias': categorias or []
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al obtener las categorías: {str(e)}'
            }
    
    @staticmethod
    def crear_tarea(tarea_data: Dict[str, Any], asignada_por_id: int) -> Dict[str, Any]:
        """Crea una nueva tarea asignada y la asocia con sus categorías."""
        try:
            # Validar que el empleado existe y pertenece a la empresa
            if not TareasService._validar_empleado_empresa(tarea_data['empleado_id'], tarea_data['empresa_id']):
                return {
                    'success': False,
                    'message': 'El empleado no pertenece a esta empresa'
                }

            # 1. Separar las categorías del resto de los datos
            categoria_ids = tarea_data.pop('categoria_ids', [])

            # 2. Crear la tarea principal (sin las categorías)
            tarea_data['asignada_por'] = asignada_por_id
            tarea_id = TareasRepository.crear_tarea(tarea_data)

            # 3. Si la tarea se creó, asociar las categorías
            if tarea_id and categoria_ids:
                for categoria_id in categoria_ids:
                    # Esta función debe estar definida en TareasRepository
                    TareasRepository.asociar_categoria_a_tarea(tarea_id, categoria_id)

            return {
                'success': True,
                'message': 'Tarea creada y categorizada exitosamente',
                'tarea_id': tarea_id
            }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error al crear la tarea: {str(e)}'
            }