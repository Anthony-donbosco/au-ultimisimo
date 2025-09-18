import { authenticatedRequest } from '../config/api';

export interface EstadoTarea {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  icono?: string;
  es_final: boolean;
  es_activo: boolean;
  orden_visualizacion: number;
}

export interface TareaAsignada {
  id: number;
  titulo: string;
  descripcion?: string;
  empresa_id: number;
  empleado_id: number;
  prioridad_id: number;
  estado_id: number;
  fecha_asignacion: string;
  fecha_limite?: string;
  fecha_inicio?: string;
  fecha_completada?: string;
  tiempo_estimado_horas?: number;
  tiempo_real_horas?: number;
  categoria?: string;
  ubicacion?: string;
  requiere_aprobacion: boolean;
  aprobada_por?: number;
  fecha_aprobacion?: string;
  notas_empresa?: string;
  notas_empleado?: string;
  adjuntos_url?: string;
  es_recurrente: boolean;
  frecuencia_dias?: number;
  proxima_tarea?: string;
  asignada_por: number;
  created_at: string;
  updated_at: string;

  // Campos adicionales
  empresa_nombre?: string;
  empleado_nombre?: string;
  prioridad_nombre?: string;
  prioridad_color?: string;
  estado_nombre?: string;
  estado_color?: string;
  estado_icono?: string;
  asignada_por_nombre?: string;
}

export interface TareaComentario {
  id: number;
  tarea_id: number;
  user_id: number;
  comentario: string;
  es_interno: boolean;
  adjunto_url?: string;
  created_at: string;
  user_nombre?: string;
}

export interface EstadisticasTareas {
  total_tareas: number;
  tareas_vencidas: number;
  tareas_por_estado: Array<{
    codigo: string;
    nombre: string;
    color: string;
    cantidad: number;
  }>;
}

export interface Empleado {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  puesto?: string;
  telefono?: string;
}

export interface CategoriaTarea {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  icono?: string;
  es_activa: boolean;
  orden_visualizacion: number;
  created_at: string;
}

export interface CrearTareaRequest {
  titulo: string;
  descripcion?: string;
  empleado_id: number;
  prioridad_id: number;
  fecha_limite?: string;
  tiempo_estimado_horas?: number;
  categoria_id?: number;
  ubicacion?: string;
  requiere_aprobacion?: boolean;
  notas_empresa?: string;
  es_recurrente?: boolean;
  frecuencia_dias?: number;
}

export interface ActualizarEstadoRequest {
  estado: string;
  motivo?: string;
}

export interface AgregarComentarioRequest {
  comentario: string;
  es_interno?: boolean;
}

class TareasService {
  /**
   * Obtiene todos los estados de tarea disponibles
   */
  async getEstadosTarea(): Promise<EstadoTarea[]> {
    const response = await authenticatedRequest<{ estados: EstadoTarea[] }>('/api/tareas/estados', {
      method: 'GET',
    });

    if (response.success && response.estados) {
      return response.estados;
    }

    throw new Error(response.message || 'Error al obtener estados de tarea');
  }

  /**
   * Crea una nueva tarea asignada
   */
  async crearTarea(tareaData: CrearTareaRequest): Promise<{ tarea_id: number }> {
    const response = await authenticatedRequest<{
      success: boolean;
      tarea_id: number;
      message?: string;
    }>('/api/tareas/crear', {
      method: 'POST',
      body: JSON.stringify(tareaData),
    });

    if (response.success && response.tarea_id) {
      return { tarea_id: response.tarea_id };
    }

    throw new Error(response.message || 'Error al crear la tarea');
  }

  /**
   * Obtiene las tareas del empleado actual (para empleados)
   */
  async getMisTareas(limit: number = 10, estado?: string): Promise<{
    tareas: TareaAsignada[];
    estadisticas: EstadisticasTareas;
  }> {
    let url = `/api/tareas/mis-tareas?limit=${limit}`;
    if (estado) {
      url += `&estado=${estado}`;
    }

    const response = await authenticatedRequest<{
      tareas: TareaAsignada[];
      estadisticas: EstadisticasTareas;
    }>(url, {
      method: 'GET',
    });

    if (response.success && response.tareas) {
      return {
        tareas: response.tareas,
        estadisticas: response.estadisticas
      };
    }

    throw new Error(response.message || 'Error al obtener las tareas');
  }

  /**
   * Obtiene las tareas recientes para el dashboard del empleado
   */
  async getTareasRecientesDashboard(limit: number = 5): Promise<TareaAsignada[]> {
    const response = await authenticatedRequest<{ tareas: TareaAsignada[] }>(`/api/tareas/dashboard/recientes?limit=${limit}`, {
      method: 'GET',
    });

    if (response.success && response.tareas) {
      return response.tareas;
    }

    throw new Error(response.message || 'Error al obtener tareas recientes');
  }

  /**
   * Obtiene las tareas asignadas por la empresa actual (para empresas)
   */
  async getTareasEmpresa(limit: number = 50): Promise<TareaAsignada[]> {
    const response = await authenticatedRequest<{ tareas: TareaAsignada[] }>(`/api/tareas/mis-tareas?limit=${limit}`, {
      method: 'GET',
    });

    if (response.success && response.tareas) {
      return response.tareas;
    }

    throw new Error(response.message || 'Error al obtener las tareas de la empresa');
  }

  /**
   * Obtiene el detalle de una tarea específica
   */
  async getTareaDetalle(tareaId: number): Promise<{
    tarea: TareaAsignada;
    comentarios: TareaComentario[];
  }> {
    const response = await authenticatedRequest<{
      success: boolean;
      tarea: TareaAsignada;
      comentarios: TareaComentario[];
      message?: string;
    }>(`/api/tareas/${tareaId}`, {
      method: 'GET',
    });

    if (response.success && response.tarea) {
      return {
        tarea: response.tarea,
        comentarios: response.comentarios || []
      };
    }

    throw new Error(response.message || 'Error al obtener el detalle de la tarea');
  }

  /**
   * Actualiza el estado de una tarea
   */
  async actualizarEstadoTarea(tareaId: number, estadoData: ActualizarEstadoRequest): Promise<void> {
    const response = await authenticatedRequest(`/api/tareas/${tareaId}/estado`, {
      method: 'PUT',
      body: JSON.stringify(estadoData),
    });

    if (!response.success) {
      throw new Error(response.message || 'Error al actualizar el estado de la tarea');
    }
  }

  /**
   * Agrega un comentario a una tarea
   */
  async agregarComentario(tareaId: number, comentarioData: AgregarComentarioRequest): Promise<{ comentario_id: number }> {
    const response = await authenticatedRequest<{
      success: boolean;
      comentario_id: number;
      message?: string;
    }>(`/api/tareas/${tareaId}/comentarios`, {
      method: 'POST',
      body: JSON.stringify(comentarioData),
    });

    if (response.success && response.comentario_id) {
      return { comentario_id: response.comentario_id };
    }

    throw new Error(response.message || 'Error al agregar el comentario');
  }

  /**
   * Obtiene los empleados de la empresa actual (para empresas)
   */
  async getEmpleadosEmpresa(): Promise<Empleado[]> {
    const response = await authenticatedRequest<{ empleados: Empleado[] }>('/api/tareas/empleados', {
      method: 'GET',
    });

    if (response.success && response.empleados) {
      return response.empleados;
    }

    throw new Error(response.message || 'Error al obtener los empleados');
  }

  /**
   * Obtiene las categorías de tareas disponibles
   */
  async getCategoriasTareas(): Promise<CategoriaTarea[]> {
    const response = await authenticatedRequest<{ categorias: CategoriaTarea[] }>('/api/tareas/categorias', {
      method: 'GET',
    });

    if (response.success && response.categorias) {
      return response.categorias;
    }

    throw new Error(response.message || 'Error al obtener las categorías');
  }

  /**
   * Marca una tarea como iniciada
   */
  async iniciarTarea(tareaId: number): Promise<void> {
    await this.actualizarEstadoTarea(tareaId, {
      estado: 'en_progreso',
      motivo: 'Tarea iniciada por el empleado'
    });
  }

  /**
   * Marca una tarea como completada
   */
  async completarTarea(tareaId: number, comentario?: string): Promise<void> {
    await this.actualizarEstadoTarea(tareaId, {
      estado: 'completada',
      motivo: comentario || 'Tarea completada por el empleado'
    });
  }

  /**
   * Obtiene estadísticas de tareas para el dashboard
   */
  async getEstadisticasDashboard(): Promise<EstadisticasTareas> {
    const response = await this.getMisTareas(1); // Solo necesitamos las estadísticas
    return response.estadisticas;
  }

  /**
   * Obtiene tareas filtradas por estado
   */
  async getTareasPorEstado(estado: string, limit: number = 10): Promise<TareaAsignada[]> {
    const response = await this.getMisTareas(limit, estado);
    return response.tareas;
  }

  /**
   * Verifica si hay tareas vencidas
   */
  async getTareasVencidas(): Promise<TareaAsignada[]> {
    const response = await this.getMisTareas(50); // Obtener más tareas para filtrar
    const ahora = new Date();

    return response.tareas.filter(tarea => {
      if (!tarea.fecha_limite) return false;

      const fechaLimite = new Date(tarea.fecha_limite);
      const esVencida = fechaLimite < ahora;
      const noFinalizada = !['completada', 'cancelada'].includes(tarea.estado_nombre?.toLowerCase() || '');

      return esVencida && noFinalizada;
    });
  }
}

export const tareasService = new TareasService();