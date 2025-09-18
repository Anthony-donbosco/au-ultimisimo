"""
Servicio para gestión de proyectos de empresa
Lógica de negocio para proyectos, metas y seguimiento
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
from models.proyecto_repository import ProyectoRepository
from models.user import User
from utils.security import SecurityUtils

logger = logging.getLogger(__name__)

class ProyectoService:
    """Servicio para operaciones de proyectos"""

    def __init__(self):
        self.ROL_EMPRESA = 2
        self.ROL_ADMIN = 1
        self.repository = ProyectoRepository()

    def crear_proyecto(self, user_id: int, datos_proyecto: Dict[str, Any]) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Crear un nuevo proyecto para la empresa

        Args:
            user_id: ID del usuario (debe ser empresa)
            datos_proyecto: Datos del proyecto a crear

        Returns:
            tuple: (success, message, proyecto_data)
        """
        try:
            # Validar que el usuario sea empresa
            user = User.find_by_id(user_id)
            if not user or user.id_rol != self.ROL_EMPRESA:
                return False, "Solo las empresas pueden crear proyectos", None

            # Validar campos requeridos
            required_fields = ['titulo']
            for field in required_fields:
                if field not in datos_proyecto or not datos_proyecto[field]:
                    return False, f"Campo '{field}' es requerido", None

            # Sanitizar datos de entrada
            datos_proyecto['titulo'] = SecurityUtils.sanitize_input(datos_proyecto['titulo'])
            if datos_proyecto.get('descripcion'):
                datos_proyecto['descripcion'] = SecurityUtils.sanitize_input(datos_proyecto['descripcion'])
            if datos_proyecto.get('notas'):
                datos_proyecto['notas'] = SecurityUtils.sanitize_input(datos_proyecto['notas'])

            # Validar fechas
            if datos_proyecto.get('fecha_inicio') and datos_proyecto.get('fecha_limite'):
                fecha_inicio = datetime.strptime(datos_proyecto['fecha_inicio'], '%Y-%m-%d').date()
                fecha_limite = datetime.strptime(datos_proyecto['fecha_limite'], '%Y-%m-%d').date()
                if fecha_limite < fecha_inicio:
                    return False, "La fecha límite no puede ser anterior a la fecha de inicio", None

            # Preparar datos para inserción
            proyecto_data = {
                **datos_proyecto,
                'empresa_id': user_id,
                'created_by': user_id
            }

            # Crear proyecto
            proyecto_id = self.repository.crear_proyecto(proyecto_data)
            logger.info(f"📋 Proyecto creado con ID: {proyecto_id}")
            if not proyecto_id:
                return False, "Error interno creando proyecto", None

            # Si se proporcionaron metas iniciales, agregarlas
            logger.info(f"📋 Datos del proyecto recibidos: {datos_proyecto}")
            logger.info(f"📝 Verificando metas: 'metas' in datos_proyecto = {'metas' in datos_proyecto}")
            if 'metas' in datos_proyecto:
                logger.info(f"📝 Metas encontradas: {datos_proyecto['metas']}")
                logger.info(f"📝 Cantidad de metas: {len(datos_proyecto['metas']) if datos_proyecto['metas'] else 0}")

            if 'metas' in datos_proyecto and datos_proyecto['metas']:
                logger.info(f"📝 Procesando {len(datos_proyecto['metas'])} metas para proyecto {proyecto_id}")
                for i, meta in enumerate(datos_proyecto['metas']):
                    logger.info(f"📝 Procesando meta {i+1}: {meta}")
                    meta_data = {
                        'titulo': SecurityUtils.sanitize_input(meta['titulo']),
                        'descripcion': SecurityUtils.sanitize_input(meta.get('descripcion', '')),
                        'orden': i + 1,
                        'fecha_limite': meta.get('fecha_limite')
                    }
                    logger.info(f"📝 Datos de meta preparados: {meta_data}")
                    result = self.repository.agregar_meta(proyecto_id, meta_data)
                    logger.info(f"📝 Resultado agregar meta: {result}")
            else:
                logger.info("📝 No se encontraron metas para agregar")

            logger.info(f"Proyecto '{datos_proyecto['titulo']}' creado por empresa {user_id}")

            logger.info(f"📋 Retornando proyecto creado con ID: {proyecto_id}")
            return True, "Proyecto creado exitosamente", {
                'id': proyecto_id,
                'titulo': datos_proyecto['titulo'],
                'descripcion': datos_proyecto.get('descripcion', ''),
                'estado': 'planificado'
            }

        except ValueError as e:
            return False, f"Datos inválidos: {str(e)}", None
        except Exception as e:
            logger.error(f"Error creando proyecto: {e}")
            return False, "Error interno creando proyecto", None


    def eliminar_proyecto(self, proyecto_id: int, user_id: int) -> Tuple[bool, str]:
        """
        Elimina un proyecto verificando la propiedad de la empresa.
        """
        try:
            # Validar que el usuario puede modificar este proyecto
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para eliminar este proyecto"
            
            # Obtener el empresa_id correcto
            user = User.find_by_id(user_id)
            empresa_id = user_id if user.id_rol == self.ROL_EMPRESA else None
            
            if not empresa_id:
                 return False, "No se pudo determinar la empresa del proyecto"

            success = self.repository.eliminar_proyecto(proyecto_id, empresa_id)
            if success:
                return True, "Proyecto eliminado correctamente."
            else:
                return False, "Error al eliminar el proyecto. Puede que ya no exista."
        
        except Exception as e:
            logger.error(f"Error en servicio eliminando proyecto {proyecto_id}: {e}")
            return False, "Error interno al eliminar el proyecto."

    def get_proyectos_usuario(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Obtener proyectos según el rol del usuario
        - Empresas: solo sus proyectos
        - Administradores: todos los proyectos
        """
        try:
            user = User.find_by_id(user_id)
            if not user:
                return []

            if user.id_rol == self.ROL_EMPRESA:
                # Empresa: solo sus proyectos
                return self.repository.get_proyectos_empresa(user_id)
            elif user.id_rol == self.ROL_ADMIN:
                # Admin: obtener proyectos de todas las empresas
                # TODO: Implementar vista para administradores
                return []
            else:
                # Otros roles no tienen acceso
                return []

        except Exception as e:
            logger.error(f"Error obteniendo proyectos para usuario {user_id}: {e}")
            return []

    def get_proyecto_detalle(self, proyecto_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Obtener detalles completos de un proyecto
        Solo accesible por la empresa propietaria o administradores
        """
        try:
            user = User.find_by_id(user_id)
            if not user:
                return None

            if user.id_rol == self.ROL_EMPRESA:
                # Empresa: solo puede ver sus propios proyectos
                return self.repository.get_proyecto_detalle(proyecto_id, user_id)
            elif user.id_rol == self.ROL_ADMIN:
                # Admin: puede ver cualquier proyecto
                # Buscar el proyecto sin filtro de empresa
                query_empresa = """
                    SELECT empresa_id FROM proyectos WHERE id = %s
                """
                from utils.database import db_manager
                result = db_manager.fetch_one(query_empresa, (proyecto_id,))
                if result:
                    return self.repository.get_proyecto_detalle(proyecto_id, result['empresa_id'])
                return None
            else:
                return None

        except Exception as e:
            logger.error(f"Error obteniendo detalle del proyecto {proyecto_id}: {e}")
            return None

    def agregar_meta(self, proyecto_id: int, user_id: int, datos_meta: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        """Agregar una nueva meta al proyecto"""
        try:
            # Validar que el usuario puede modificar este proyecto
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para modificar este proyecto", None

            # Validar datos
            if not datos_meta.get('titulo'):
                return False, "El título de la meta es requerido", None

            # Sanitizar datos
            datos_meta['titulo'] = SecurityUtils.sanitize_input(datos_meta['titulo'])
            if datos_meta.get('descripcion'):
                datos_meta['descripcion'] = SecurityUtils.sanitize_input(datos_meta['descripcion'])

            meta_id = self.repository.agregar_meta(proyecto_id, datos_meta)
            if not meta_id:
                return False, "Error interno agregando meta", None

            return True, "Meta agregada exitosamente", meta_id

        except Exception as e:
            logger.error(f"Error agregando meta al proyecto {proyecto_id}: {e}")
            return False, "Error interno agregando meta", None

    def actualizar_meta(self, meta_id: int, user_id: int, datos_meta: Dict[str, Any]) -> Tuple[bool, str]:
        """Actualizar una meta existente"""
        try:
            # Primero obtener el proyecto_id de la meta
            from utils.database import db_manager
            query = "SELECT proyecto_id FROM proyecto_metas WHERE id = %s"
            result = db_manager.fetch_one(query, (meta_id,))
            if not result:
                return False, "Meta no encontrada"

            proyecto_id = result['proyecto_id']

            # Validar permisos
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para modificar esta meta"

            # Sanitizar datos
            if datos_meta.get('titulo'):
                datos_meta['titulo'] = SecurityUtils.sanitize_input(datos_meta['titulo'])
            if datos_meta.get('descripcion'):
                datos_meta['descripcion'] = SecurityUtils.sanitize_input(datos_meta['descripcion'])

            success = self.repository.actualizar_meta(meta_id, datos_meta)
            if not success:
                return False, "Error interno actualizando meta"

            return True, "Meta actualizada exitosamente"

        except Exception as e:
            logger.error(f"Error actualizando meta {meta_id}: {e}")
            return False, "Error interno actualizando meta"

    def completar_meta(self, meta_id: int, user_id: int) -> Tuple[bool, str]:
        """Marcar una meta como completada"""
        try:
            # Obtener proyecto_id de la meta
            from utils.database import db_manager
            query = "SELECT proyecto_id FROM proyecto_metas WHERE id = %s"
            result = db_manager.fetch_one(query, (meta_id,))
            if not result:
                return False, "Meta no encontrada"

            proyecto_id = result['proyecto_id']

            # Validar permisos
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para modificar esta meta"

            success = self.repository.completar_meta(meta_id)
            if not success:
                return False, "Error interno completando meta"

            return True, "Meta completada exitosamente"

        except Exception as e:
            logger.error(f"Error completando meta {meta_id}: {e}")
            return False, "Error interno completando meta"

    def actualizar_proyecto(self, proyecto_id: int, user_id: int, datos_proyecto: Dict[str, Any]) -> Tuple[bool, str]:
        """Actualizar un proyecto existente"""
        try:
            user = User.find_by_id(user_id)
            if not user:
                return False, "Usuario no encontrado"

            # Validar permisos
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para modificar este proyecto"

            # Sanitizar datos
            if datos_proyecto.get('titulo'):
                datos_proyecto['titulo'] = SecurityUtils.sanitize_input(datos_proyecto['titulo'])
            if datos_proyecto.get('descripcion'):
                datos_proyecto['descripcion'] = SecurityUtils.sanitize_input(datos_proyecto['descripcion'])
            if datos_proyecto.get('notas'):
                datos_proyecto['notas'] = SecurityUtils.sanitize_input(datos_proyecto['notas'])

            # Para empresas, usar su propio ID como empresa_id
            empresa_id = user_id if user.id_rol == self.ROL_EMPRESA else None
            if user.id_rol == self.ROL_ADMIN:
                # Admin: obtener empresa_id del proyecto
                from utils.database import db_manager
                query = "SELECT empresa_id FROM proyectos WHERE id = %s"
                result = db_manager.fetch_one(query, (proyecto_id,))
                empresa_id = result['empresa_id'] if result else None

            if not empresa_id:
                return False, "No se pudo determinar la empresa del proyecto"

            success = self.repository.actualizar_proyecto(proyecto_id, empresa_id, datos_proyecto)
            if not success:
                return False, "Error interno actualizando proyecto"

            return True, "Proyecto actualizado exitosamente"

        except Exception as e:
            logger.error(f"Error actualizando proyecto {proyecto_id}: {e}")
            return False, "Error interno actualizando proyecto"

    def get_estadisticas_empresa(self, user_id: int) -> Dict[str, Any]:
        """Obtener estadísticas de proyectos de la empresa"""
        try:
            user = User.find_by_id(user_id)
            if not user or user.id_rol != self.ROL_EMPRESA:
                return {}

            return self.repository.get_estadisticas_empresa(user_id)

        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de empresa {user_id}: {e}")
            return {}

    def get_estados_proyecto(self) -> List[Dict[str, Any]]:
        """Obtener todos los estados de proyecto disponibles"""
        try:
            return self.repository.get_estados_proyecto()
        except Exception as e:
            logger.error(f"Error obteniendo estados de proyecto: {e}")
            return []

    def _puede_modificar_proyecto(self, proyecto_id: int, user_id: int) -> bool:
        """Verificar si un usuario puede modificar un proyecto"""
        try:
            user = User.find_by_id(user_id)
            if not user:
                return False

            if user.id_rol == self.ROL_ADMIN:
                return True  # Admin puede modificar cualquier proyecto

            if user.id_rol == self.ROL_EMPRESA:
                # Verificar que el proyecto pertenece a la empresa
                from utils.database import db_manager
                query = "SELECT empresa_id FROM proyectos WHERE id = %s"
                result = db_manager.fetch_one(query, (proyecto_id,))
                return result and result['empresa_id'] == user_id

            return False

        except Exception as e:
            logger.error(f"Error verificando permisos para proyecto {proyecto_id}: {e}")
            return False

    # ============================================================================
    # MÉTODOS PARA AVANCES ECONÓMICOS
    # ============================================================================

    def agregar_gasto(self, proyecto_id: int, user_id: int, datos_gasto: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        """Agregar un gasto al proyecto"""
        try:
            # Validar permisos
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para agregar gastos a este proyecto", None

            # Validar datos requeridos
            if not datos_gasto.get('concepto'):
                return False, "El concepto del gasto es requerido", None

            if not datos_gasto.get('monto') or datos_gasto['monto'] <= 0:
                return False, "El monto debe ser mayor a 0", None

            # Mapear fechaGasto (frontend) a fecha_gasto (backend)
            if datos_gasto.get('fechaGasto') and not datos_gasto.get('fecha_gasto'):
                datos_gasto['fecha_gasto'] = datos_gasto['fechaGasto']

            if not datos_gasto.get('fecha_gasto'):
                return False, "La fecha del gasto es requerida", None

            # Sanitizar datos
            datos_gasto['concepto'] = SecurityUtils.sanitize_input(datos_gasto['concepto'])
            if datos_gasto.get('descripcion'):
                datos_gasto['descripcion'] = SecurityUtils.sanitize_input(datos_gasto['descripcion'])

            # Agregar el ID del usuario que crea el gasto
            datos_gasto['created_by'] = user_id

            gasto_id = self.repository.agregar_gasto_proyecto(proyecto_id, datos_gasto)
            if not gasto_id:
                return False, "Error interno agregando gasto", None

            # Actualizar monto gastado manualmente (sin triggers)
            self._actualizar_monto_gastado(proyecto_id)

            return True, "Gasto agregado exitosamente", gasto_id

        except Exception as e:
            logger.error(f"Error agregando gasto al proyecto {proyecto_id}: {e}")
            return False, "Error interno agregando gasto", None

    def get_gastos_proyecto(self, proyecto_id: int, user_id: int) -> List[Dict[str, Any]]:
        """Obtener gastos de un proyecto"""
        try:
            # Validar permisos de lectura
            if not self._puede_ver_proyecto(proyecto_id, user_id):
                return []

            return self.repository.get_gastos_proyecto(proyecto_id)

        except Exception as e:
            logger.error(f"Error obteniendo gastos del proyecto {proyecto_id}: {e}")
            return []

    def get_resumen_economico(self, proyecto_id: int, user_id: int) -> Dict[str, Any]:
        """Obtener resumen económico del proyecto"""
        try:
            # Validar permisos de lectura
            if not self._puede_ver_proyecto(proyecto_id, user_id):
                return {}

            return self.repository.get_resumen_economico(proyecto_id)

        except Exception as e:
            logger.error(f"Error obteniendo resumen económico del proyecto {proyecto_id}: {e}")
            return {}

    def actualizar_gasto(self, gasto_id: int, user_id: int, datos_gasto: Dict[str, Any]) -> Tuple[bool, str]:
        """Actualizar un gasto"""
        try:
            # Obtener proyecto_id del gasto
            from utils.database import db_manager
            query = "SELECT proyecto_id FROM proyecto_gastos WHERE id = %s"
            result = db_manager.fetch_one(query, (gasto_id,))
            if not result:
                return False, "Gasto no encontrado"

            proyecto_id = result['proyecto_id']

            # Validar permisos
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para modificar este gasto"

            # Mapear fechaGasto (frontend) a fecha_gasto (backend)
            if datos_gasto.get('fechaGasto') and not datos_gasto.get('fecha_gasto'):
                datos_gasto['fecha_gasto'] = datos_gasto['fechaGasto']

            # Sanitizar datos
            if datos_gasto.get('concepto'):
                datos_gasto['concepto'] = SecurityUtils.sanitize_input(datos_gasto['concepto'])
            if datos_gasto.get('descripcion'):
                datos_gasto['descripcion'] = SecurityUtils.sanitize_input(datos_gasto['descripcion'])

            success = self.repository.actualizar_gasto_proyecto(gasto_id, datos_gasto)
            if not success:
                return False, "Error interno actualizando gasto"

            # Actualizar monto gastado manualmente
            self._actualizar_monto_gastado(proyecto_id)

            return True, "Gasto actualizado exitosamente"

        except Exception as e:
            logger.error(f"Error actualizando gasto {gasto_id}: {e}")
            return False, "Error interno actualizando gasto"

    def eliminar_gasto(self, gasto_id: int, user_id: int) -> Tuple[bool, str]:
        """Eliminar un gasto"""
        try:
            # Obtener proyecto_id del gasto
            from utils.database import db_manager
            query = "SELECT proyecto_id FROM proyecto_gastos WHERE id = %s"
            result = db_manager.fetch_one(query, (gasto_id,))
            if not result:
                return False, "Gasto no encontrado"

            proyecto_id = result['proyecto_id']

            # Validar permisos
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para eliminar este gasto"

            success = self.repository.eliminar_gasto_proyecto(gasto_id)
            if not success:
                return False, "Error interno eliminando gasto"

            # Actualizar monto gastado manualmente
            self._actualizar_monto_gastado(proyecto_id)

            return True, "Gasto eliminado exitosamente"

        except Exception as e:
            logger.error(f"Error eliminando gasto {gasto_id}: {e}")
            return False, "Error interno eliminando gasto"

    def _puede_ver_proyecto(self, proyecto_id: int, user_id: int) -> bool:
        """Verificar si un usuario puede ver un proyecto"""
        try:
            user = User.find_by_id(user_id)
            if not user:
                return False

            if user.id_rol == self.ROL_ADMIN:
                return True  # Admin puede ver cualquier proyecto

            if user.id_rol == self.ROL_EMPRESA:
                # Verificar que el proyecto pertenece a la empresa
                from utils.database import db_manager
                query = "SELECT empresa_id FROM proyectos WHERE id = %s"
                result = db_manager.fetch_one(query, (proyecto_id,))
                return result and result['empresa_id'] == user_id

            return False

        except Exception as e:
            logger.error(f"Error verificando permisos de lectura para proyecto {proyecto_id}: {e}")
            return False

    def _actualizar_monto_gastado(self, proyecto_id: int) -> None:
        """Actualizar el monto gastado del proyecto manualmente (sin triggers)"""
        try:
            from utils.database import db_manager

            # Calcular total gastado
            query_total = """
                SELECT COALESCE(SUM(monto), 0) as total_gastado
                FROM proyecto_gastos
                WHERE proyecto_id = %s
            """
            result = db_manager.fetch_one(query_total, (proyecto_id,))
            total_gastado = float(result['total_gastado']) if result else 0.0

            # Actualizar proyecto
            update_query = """
                UPDATE proyectos
                SET monto_gastado = %s,
                    ultima_actualizacion_economica = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            db_manager.execute_query(update_query, (total_gastado, proyecto_id))

            logger.info(f"Monto gastado actualizado para proyecto {proyecto_id}: ${total_gastado}")

            # También recalcular el progreso del proyecto basado en metas
            self.repository.recalcular_progreso_proyecto(proyecto_id)
            logger.info(f"Progreso del proyecto {proyecto_id} recalculado tras actualizar gasto")

        except Exception as e:
            logger.error(f"Error actualizando monto gastado para proyecto {proyecto_id}: {e}")

    def recalcular_progreso_proyecto(self, proyecto_id: int, user_id: int) -> Tuple[bool, str]:
        """Método público para recalcular progreso de un proyecto"""
        try:
            # Validar permisos
            if not self._puede_modificar_proyecto(proyecto_id, user_id):
                return False, "No tienes permisos para modificar este proyecto"

            success = self.repository.recalcular_progreso_proyecto(proyecto_id)
            if not success:
                return False, "Error interno recalculando progreso"

            return True, "Progreso recalculado exitosamente"

        except Exception as e:
            logger.error(f"Error recalculando progreso del proyecto {proyecto_id}: {e}")
            return False, "Error interno recalculando progreso"

# Instancia global del servicio
proyecto_service = ProyectoService()