import { apiClient } from '../config/api';

// Interfaces para proyectos
export interface Proyecto {
  id: number;
  titulo: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaLimite?: string;
  fechaCompletado?: string;
  progresoporcentaje: number;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  presupuesto: number;
  montoGastado?: number;
  montoRestante?: number;
  porcentajeGastado?: number;
  ultimaActualizacionEconomica?: string;
  notas?: string;
  creadoEn: string;
  actualizadoEn: string;
  estado: {
    nombre: string;
    codigo: string;
    color: string;
  };
  creadoPor: string;
  estadisticas?: {
    totalMetas: number;
    metasCompletadas: number;
  };
  metas?: Meta[];
}

export interface Meta {
  id: number;
  titulo: string;
  descripcion?: string;
  completado: boolean;
  orden: number;
  fechaLimite?: string;
  fechaCompletado?: string;
  creadoEn: string;
}

export interface EstadoProyecto {
  id: number;
  nombre: string;
  codigo: string;
  color: string;
}

export interface EstadisticasProyectos {
  totalProyectos: number;
  proyectosCompletados: number;
  proyectosActivos: number;
  proyectosPlanificados: number;
  progresoPromedio: number;
  presupuestoTotal: number;
}

export type CrearProyectoRequest = {
  titulo: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaLimite?: string;
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  presupuesto?: number;
  notas?: string;
  metas?: {
    titulo: string;
    descripcion?: string;
    fechaLimite?: string;
  }[];
};

export type ActualizarProyectoRequest = Partial<CrearProyectoRequest> & {
  estado_id?: number;
};

export type CrearMetaRequest = {
  titulo: string;
  descripcion?: string;
  orden?: number;
  fechaLimite?: string;
};

export type ActualizarMetaRequest = Partial<CrearMetaRequest> & {
  completado?: boolean;
};

export interface GastoProyecto {
  id: number;
  concepto: string;
  monto: number;
  fechaGasto?: string;
  descripcion?: string;
  facturaUrl?: string;
  creadoEn: string;
  creadoPor: string;
}

export type CrearGastoRequest = {
  concepto: string;
  monto: number;
  fechaGasto: string;
  descripcion?: string;
  facturaUrl?: string;
};

export interface ResumenEconomico {
  presupuesto: number;
  montoGastado: number;
  montoRestante: number;
  porcentajeGastado: number;
  totalGastos: number;
  ultimaActualizacion?: string;
}

export const proyectoService = {
  // === GESTIÓN DE PROYECTOS ===

  /**
   * Obtener todos los proyectos de la empresa
   */
  getProyectos: async (): Promise<Proyecto[]> => {
    try {
      const response = await apiClient.get('/api/proyectos');
      return response.data.proyectos || [];
    } catch (error) {
      console.error('Error obteniendo proyectos:', error);
      throw error;
    }
  },

  /**
   * Crear un nuevo proyecto
   */
  crearProyecto: async (datosProyecto: CrearProyectoRequest): Promise<Proyecto> => {
    try {
      const response = await apiClient.post('/api/proyectos', datosProyecto);
      return response.data.proyecto;
    } catch (error) {
      console.error('Error creando proyecto:', error);
      throw error;
    }
  },

  /**
   * Obtener detalles completos de un proyecto
   */
  getProyectoDetalle: async (proyectoId: number): Promise<Proyecto> => {
    try {
      const response = await apiClient.get(`/api/proyectos/${proyectoId}`);
      return response.data.proyecto;
    } catch (error) {
      console.error('Error obteniendo detalle del proyecto:', error);
      throw error;
    }
  },

  /**
   * Actualizar un proyecto existente
   */
  actualizarProyecto: async (proyectoId: number, datos: ActualizarProyectoRequest): Promise<void> => {
    try {
      await apiClient.put(`/api/proyectos/${proyectoId}`, datos);
    } catch (error) {
      console.error('Error actualizando proyecto:', error);
      throw error;
    }
  },

  /**
   * Eliminar un proyecto
   */
  eliminarProyecto: async (proyectoId: number): Promise<void> => {
    try {
      await apiClient.delete(`/api/proyectos/${proyectoId}`);
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      throw error;
    }
  },

  // === GESTIÓN DE METAS ===

  /**
   * Agregar una nueva meta al proyecto
   */
  agregarMeta: async (proyectoId: number, datos: CrearMetaRequest): Promise<{ meta_id: number }> => {
    try {
      const response = await apiClient.post(`/api/proyectos/${proyectoId}/metas`, datos);
      return { meta_id: response.data.meta_id };
    } catch (error) {
      console.error('Error agregando meta:', error);
      throw error;
    }
  },

  /**
   * Actualizar una meta existente
   */
  actualizarMeta: async (metaId: number, datos: ActualizarMetaRequest): Promise<void> => {
    try {
      await apiClient.put(`/api/proyectos/metas/${metaId}`, datos);
    } catch (error) {
      console.error('Error actualizando meta:', error);
      throw error;
    }
  },

  /**
   * Marcar una meta como completada
   */
  completarMeta: async (metaId: number): Promise<void> => {
    try {
      await apiClient.post(`/api/proyectos/metas/${metaId}/completar`);
    } catch (error) {
      console.error('Error completando meta:', error);
      throw error;
    }
  },

  // === DATOS AUXILIARES ===

  /**
   * Obtener estadísticas de proyectos de la empresa
   */
  getEstadisticas: async (): Promise<EstadisticasProyectos> => {
    try {
      const response = await apiClient.get('/api/proyectos/estadisticas');
      return response.data.estadisticas;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  // === FUNCIONES PARA ADMINISTRADORES ===

  /**
   * Obtener todos los proyectos (solo administradores)
   */
  getTodosProyectosAdmin: async (): Promise<Proyecto[]> => {
    try {
      const response = await apiClient.get('/api/proyectos/admin/todos');
      return response.data.proyectos || [];
    } catch (error) {
      console.error('Error obteniendo todos los proyectos:', error);
      throw error;
    }
  },

  /**
   * Obtener proyectos de una empresa específica (solo administradores)
   */
  getProyectosEmpresaAdmin: async (empresaId: number): Promise<{
    proyectos: Proyecto[];
    estadisticas: EstadisticasProyectos;
  }> => {
    try {
      const response = await apiClient.get(`/api/proyectos/admin/empresa/${empresaId}`);
      return {
        proyectos: response.data.proyectos || [],
        estadisticas: response.data.estadisticas || {}
      };
    } catch (error) {
      console.error('Error obteniendo proyectos de empresa:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los estados de proyecto disponibles
   */
  getEstadosProyecto: async (): Promise<EstadoProyecto[]> => {
    try {
      const response = await apiClient.get('/api/proyectos/estados');
      return response.data.estados || [];
    } catch (error) {
      console.error('Error obteniendo estados de proyecto:', error);
      throw error;
    }
  },

  // === UTILIDADES ===

  /**
   * Calcular el color de progreso basado en el porcentaje
   */
  getColorProgreso: (porcentaje: number): string => {
    if (porcentaje >= 100) return '#27ae60'; // Verde - Completado
    if (porcentaje >= 75) return '#2ecc71';  // Verde claro
    if (porcentaje >= 50) return '#f39c12';  // Naranja
    if (porcentaje >= 25) return '#e67e22';  // Naranja oscuro
    return '#e74c3c'; // Rojo - Poco progreso
  },

  /**
   * Obtener el color de prioridad
   */
  getColorPrioridad: (prioridad: string): string => {
    switch (prioridad) {
      case 'critica': return '#e74c3c';
      case 'alta': return '#f39c12';
      case 'media': return '#3498db';
      case 'baja': return '#95a5a6';
      default: return '#95a5a6';
    }
  },

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha: (fecha: string | null | undefined): string => {
    if (!fecha) return 'Sin fecha';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  },

  /**
   * Calcular días restantes hasta una fecha
   */
  diasRestantes: (fechaLimite: string | null | undefined): number | null => {
    if (!fechaLimite) return null;
    try {
      const hoy = new Date();
      const limite = new Date(fechaLimite);
      const diferencia = limite.getTime() - hoy.getTime();
      return Math.ceil(diferencia / (1000 * 3600 * 24));
    } catch {
      return null;
    }
  },

  /**
   * Validar datos de proyecto antes de enviar
   */
  validarProyecto: (datos: CrearProyectoRequest): { valido: boolean; errores: string[] } => {
    const errores: string[] = [];

    if (!datos.titulo || datos.titulo.trim().length === 0) {
      errores.push('El título es requerido');
    }

    if (datos.titulo && datos.titulo.length > 200) {
      errores.push('El título no puede exceder 200 caracteres');
    }

    if (datos.fechaInicio && datos.fechaLimite) {
      const inicio = new Date(datos.fechaInicio);
      const limite = new Date(datos.fechaLimite);
      if (limite < inicio) {
        errores.push('La fecha límite no puede ser anterior a la fecha de inicio');
      }
    }

    if (datos.presupuesto && datos.presupuesto < 0) {
      errores.push('El presupuesto no puede ser negativo');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  },

  // === GESTIÓN DE AVANCES ECONÓMICOS ===

  /**
   * Agregar un gasto al proyecto
   */
  agregarGasto: async (proyectoId: number, datos: CrearGastoRequest): Promise<{ gasto_id: number }> => {
    try {
      const response = await apiClient.post(`/api/proyectos/${proyectoId}/gastos`, datos);
      return response.data;
    } catch (error) {
      console.error('Error agregando gasto:', error);
      throw error;
    }
  },

  /**
   * Obtener gastos de un proyecto
   */
  getGastosProyecto: async (proyectoId: number): Promise<GastoProyecto[]> => {
    try {
      const response = await apiClient.get(`/api/proyectos/${proyectoId}/gastos`);
      return response.data.gastos || [];
    } catch (error) {
      console.error('Error obteniendo gastos:', error);
      throw error;
    }
  },

  /**
   * Obtener resumen económico de un proyecto
   */
  getResumenEconomico: async (proyectoId: number): Promise<ResumenEconomico> => {
    try {
      const response = await apiClient.get(`/api/proyectos/${proyectoId}/resumen-economico`);
      return response.data.resumen;
    } catch (error) {
      console.error('Error obteniendo resumen económico:', error);
      throw error;
    }
  },

  /**
   * Actualizar un gasto
   */
  actualizarGasto: async (gastoId: number, datos: Partial<CrearGastoRequest>): Promise<void> => {
    try {
      await apiClient.put(`/api/proyectos/gastos/${gastoId}`, datos);
    } catch (error) {
      console.error('Error actualizando gasto:', error);
      throw error;
    }
  },

  /**
   * Eliminar un gasto
   */
  eliminarGasto: async (gastoId: number): Promise<void> => {
    try {
      await apiClient.delete(`/api/proyectos/gastos/${gastoId}`);
    } catch (error) {
      console.error('Error eliminando gasto:', error);
      throw error;
    }
  },

  /**
   * Formatear moneda
   */
  formatearMoneda: (monto: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(monto);
  },

  /**
   * Obtener color para porcentaje gastado
   */
  getColorPorcentajeGastado: (porcentaje: number): string => {
    if (porcentaje <= 50) return '#27ae60'; // Verde
    if (porcentaje <= 80) return '#f39c12'; // Naranja
    return '#e74c3c'; // Rojo
  }
};