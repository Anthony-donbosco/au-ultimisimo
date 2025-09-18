import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';
import { getErrorMessage } from '../utils/networkUtils';
import { TokenErrorHandler } from '../utils/tokenErrorHandler';

// Interfaces específicas para empleado
export interface GastoEmpleado {
  id: number;
  concepto: string;
  descripcion?: string;
  monto: number;
  fecha: string;
  proveedor?: string;
  ubicacion?: string;
  adjuntoUrl?: string;
  notas?: string;
  requiereAprobacion: boolean;
  comentarioEmpresa?: string;  
  fechaAprobacion?: string;
  createdAt: string;
  estado: {
    id: number;              // Agregar id
    nombre: string;
    codigo: string;
    color: string;
  };
  categoria: {
    id: number;          // Agregar id
    nombre: string;
    color?: string;
  };
  tipoPago: {
    id: number;          // Agregar id
    nombre: string;
    icono ?: string;
  };
  aprobadoPor?: string;
}

export interface GastoEmpleadoData {
  categoria_id: number;
  tipo_pago_id: number;
  concepto: string;
  descripcion?: string;
  monto: number;
  fecha: string;
  proveedor?: string;
  ubicacion?: string;
  adjunto_url?: string;
}

export interface DashboardEmpleado {
  gastosPendientes: number;
  gastosAprobados: number;
  gastosRechazados: number;
  totalGastado: number;
  totalPendienteAprobacion: number;
  empresa?: {
    id: number;
    nombre: string;
  };
  gastosRecientes: Array<{
    concepto: string;
    monto: number;
    fecha: string;
    estado: {
      nombre: string;
      color: string;
    };
  }>;
}

export interface EmpresaInfo {
  id: number;
  nombre: string;
  email: string;
  username: string;
}

export interface HistorialAprobacion {
  gastoId: number;
  concepto: string;
  monto: number;
  fechaAprobacion: string;
  estado: {
    nombre: string;
    codigo: string;
    color: string;
  };
  aprobadoPor?: string;
  comentarios?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface Categoria {
  id: number;
  nombre: string;
  color?: string;
}

export interface TipoPago {
  id: number;
  nombre: string;
  icono: string;
}

class EmpleadoService {
  private async getAuthHeaders(): Promise<{ headers: any; hasToken: boolean }> {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        return {
          headers: { 'Content-Type': 'application/json' },
          hasToken: false
        };
      }

      return {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        hasToken: true
      };
    } catch (error) {
      console.error('Error obteniendo headers de autenticación:', error);
      return {
        headers: { 'Content-Type': 'application/json' },
        hasToken: false
      };
    }
  }

  async getCategorias(): Promise<Categoria[]> {
    try {
      console.log('📋 Obteniendo categorías de gastos...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.get<ApiResponse<{ categorias: Categoria[] }>>(
        '/empleado/categorias'
      );

      if (response.success && response.data?.categorias) {
        console.log(`✅ ${response.data.categorias.length} categorías obtenidas`);
        return response.data.categorias;
      } else {
        // Fallback a categorías básicas si el endpoint no está disponible
        console.warn('⚠️ Usando categorías fallback');
        return [
          { id: 7, nombre: 'Alimentación', color: '#FF6B6B' },
          { id: 8, nombre: 'Transporte', color: '#4ECDC4' },
          { id: 11, nombre: 'Entretenimiento', color: '#FFEAA7' },
          { id: 12, nombre: 'Compras', color: '#DDA0DD' },
          { id: 15, nombre: 'Otros Gastos', color: '#6C757D' },
        ];
      }
    } catch (error) {
      console.error('❌ Error obteniendo categorías:', error);
      // Fallback con categorías válidas conocidas
      return [
        { id: 7, nombre: 'Alimentación', color: '#FF6B6B' },
        { id: 8, nombre: 'Transporte', color: '#4ECDC4' },
        { id: 11, nombre: 'Entretenimiento', color: '#FFEAA7' },
        { id: 12, nombre: 'Compras', color: '#DDA0DD' },
        { id: 15, nombre: 'Otros Gastos', color: '#6C757D' },
      ];
    }
  }

  async getTiposPago(): Promise<TipoPago[]> {
    try {
      console.log('💳 Obteniendo tipos de pago...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.get<ApiResponse<{ tipos_pago: TipoPago[] }>>(
        '/empleado/tipos-pago'
      );

      if (response.success && response.data?.tipos_pago) {
        console.log(`✅ ${response.data.tipos_pago.length} tipos de pago obtenidos`);
        return response.data.tipos_pago;
      } else {
        // Fallback a tipos de pago básicos si el endpoint no está disponible
        console.warn('⚠️ Usando tipos de pago fallback');
        return [
          { id: 1, nombre: 'Efectivo', icono: 'cash' },
          { id: 2, nombre: 'Tarjeta de Débito', icono: 'card' },
          { id: 3, nombre: 'Tarjeta de Crédito', icono: 'card-outline' },
          { id: 4, nombre: 'Transferencia', icono: 'swap-horizontal' },
        ];
      }
    } catch (error) {
      console.error('❌ Error obteniendo tipos de pago:', error);
      // Fallback con tipos de pago válidos conocidos
      return [
        { id: 1, nombre: 'Efectivo', icono: 'cash' },
        { id: 2, nombre: 'Tarjeta de Débito', icono: 'card' },
        { id: 3, nombre: 'Tarjeta de Crédito', icono: 'card-outline' },
        { id: 4, nombre: 'Transferencia', icono: 'swap-horizontal' },
      ];
    }
  }

async getMisGastos(): Promise<GastoEmpleado[]> {
  return this.getGastos('all');
}

async crearGastoConArchivo(gastoData: any): Promise<any> {
  try {
    console.log('💰 Creando gasto...');
    
    // Simular creación exitosa (temporal)
    const nuevoGasto = {
      id: Date.now(),
      concepto: gastoData.concepto,
      monto: gastoData.monto,
      fecha: gastoData.fecha,
      estado: 'pendiente',
      requiereAprobacion: true
    };
    
    return nuevoGasto;
  } catch (error) {
    throw new Error('Error creando gasto');
  }
}

  private async handleApiError(error: any, operation: string) {
    console.error(`❌ Error en ${operation}:`, error);
    const errorMessage = getErrorMessage(error);
    
    if (error.response?.status === 401) {
      console.log('🔒 Token expirado en operación de empleado');
    }
    
    throw new Error(errorMessage);
  }

  // 💰 GESTIÓN DE GASTOS DEL EMPLEADO
  async crearGasto(gastoData: GastoEmpleadoData): Promise<{ 
    id: number;
    concepto: string;
    monto: number;
    fecha: string;
    estado: string;
    requiereAprobacion: boolean;
  }> {
    try {
      console.log('💰 Creando gasto de empleado...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.post<ApiResponse<{
        id: number;
        concepto: string;
        monto: number;
        fecha: string;
        estado: string;
        requiereAprobacion: boolean;
      }>>(
        '/empleado/gastos',
        gastoData
      );

      if (response.success) {
        console.log('✅ Gasto de empleado creado exitosamente');
        return response.data!;
      } else {
        throw new Error(response.message || 'Error creando gasto');
      }
    } catch (error) {
      await this.handleApiError(error, 'crearGasto');
      throw error;
    }
  }

  async getGastos(filtroEstado: 'all' | 'pendiente' | 'aprobado' | 'rechazado' = 'all'): Promise<GastoEmpleado[]> {
    try {
      console.log(`💰 Obteniendo gastos del empleado (${filtroEstado})...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const params = filtroEstado !== 'all' ? `?estado=${filtroEstado}` : '';
      
      const response = await apiService.get<ApiResponse<{ 
        gastos: GastoEmpleado[];
        filtroEstado: string;
      }>>(
        `/empleado/gastos${params}`
      );

      if (response.success) {
        console.log(`✅ ${response.data?.gastos?.length || 0} gastos del empleado obtenidos`);
        return response.data?.gastos || [];
      } else {
        throw new Error(response.message || 'Error obteniendo gastos');
      }
    } catch (error) {
      await this.handleApiError(error, 'getGastos');
      return []; // Fallback
    }
  }

  // 📊 DASHBOARD DEL EMPLEADO
  async getDashboardData(): Promise<DashboardEmpleado> {
    try {
      console.log('📊 Obteniendo dashboard de empleado...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.get<ApiResponse<DashboardEmpleado>>(
        '/empleado/dashboard'
      );

      if (response.success) {
        console.log('✅ Dashboard de empleado obtenido exitosamente');
        return response.data!;
      } else {
        throw new Error(response.message || 'Error obteniendo dashboard');
      }
    } catch (error) {
      await this.handleApiError(error, 'getDashboardData');
      // Retornar datos vacíos como fallback
      return {
        gastosPendientes: 0,
        gastosAprobados: 0,
        gastosRechazados: 0,
        totalGastado: 0,
        totalPendienteAprobacion: 0,
        gastosRecientes: []
      };
    }
  }

  // 🏢 INFORMACIÓN DE LA EMPRESA
  async getEmpresaInfo(): Promise<EmpresaInfo | null> {
    try {
      console.log('🏢 Obteniendo información de la empresa...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.get<ApiResponse<{ empresa: EmpresaInfo }>>(
        '/empleado/empresa'
      );

      if (response.success && response.data?.empresa) {
        console.log('✅ Información de empresa obtenida exitosamente');
        return response.data.empresa;
      } else {
        return null;
      }
    } catch (error) {
      await this.handleApiError(error, 'getEmpresaInfo');
      return null;
    }
  }

  // 📋 HISTORIAL DE APROBACIONES
  async getHistorialAprobaciones(limite: number = 20): Promise<HistorialAprobacion[]> {
    try {
      console.log('📋 Obteniendo historial de aprobaciones...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.get<ApiResponse<{ historial: HistorialAprobacion[] }>>(
        `/empleado/historial-aprobaciones?limite=${limite}`
      );

      if (response.success) {
        console.log(`✅ ${response.data?.historial?.length || 0} registros de historial obtenidos`);
        return response.data?.historial || [];
      } else {
        throw new Error(response.message || 'Error obteniendo historial');
      }
    } catch (error) {
      await this.handleApiError(error, 'getHistorialAprobaciones');
      return []; // Fallback
    }
  }

  // 🔄 UTILIDADES
  async refreshData(): Promise<void> {
    try {
      console.log('🔄 Refrescando datos de empleado...');
      await Promise.all([
        AsyncStorage.removeItem('empleado_dashboard_cache'),
        AsyncStorage.removeItem('empleado_gastos_cache'),
        AsyncStorage.removeItem('empleado_empresa_cache')
      ]);
      console.log('✅ Cache de empleado limpiado');
    } catch (error) {
      console.error('❌ Error limpiando cache de empleado:', error);
    }
  }

  // 📱 CACHE Y OFFLINE
  async getCachedData(key: string): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(`empleado_${key}`);
      if (cached) {
        const parsedData = JSON.parse(cached);
        const now = Date.now();
        
        // Cache válido por 3 minutos para empleados (datos más dinámicos)
        if (now - parsedData.timestamp < 180000) {
          console.log(`📱 Usando datos cached de empleado para ${key}`);
          return parsedData.data;
        } else {
          await AsyncStorage.removeItem(`empleado_${key}`);
        }
      }
      return null;
    } catch (error) {
      console.error(`❌ Error leyendo cache de empleado para ${key}:`, error);
      return null;
    }
  }

  async setCachedData(key: string, data: any): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(`empleado_${key}`, JSON.stringify(cacheData));
      console.log(`📱 Datos de empleado cached para ${key}`);
    } catch (error) {
      console.error(`❌ Error cacheando datos de empleado para ${key}:`, error);
    }
  }

  // 🧪 TESTING
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Probando conexión de empleado...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        return false;
      }

      const response = await apiService.get<ApiResponse>('/empleado/test');
      
      if (response.success) {
        console.log('✅ Conexión de empleado OK');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error en test de empleado:', error);
      return false;
    }
  }

  // 📄 HELPERS PARA ESTADOS
  getEstadoColor(estadoCodigo: string): string {
    switch (estadoCodigo) {
      case 'pendiente':
        return '#FFA500';
      case 'aprobado':
        return '#28A745';
      case 'rechazado':
        return '#DC3545';
      case 'en_revision':
        return '#17A2B8';
      default:
        return '#6C757D';
    }
  }

  getEstadoIcon(estadoCodigo: string): string {
    switch (estadoCodigo) {
      case 'pendiente':
        return 'time-outline';
      case 'aprobado':
        return 'checkmark-circle';
      case 'rechazado':
        return 'close-circle';
      case 'en_revision':
        return 'eye-outline';
      default:
        return 'help-circle-outline';
    }
  }

  // 📊 ESTADÍSTICAS RÁPIDAS
  async getEstadisticasRapidas(): Promise<{
    totalGastos: number;
    totalAprobados: number;
    totalRechazados: number;
    totalPendientes: number;
    porcentajeAprobacion: number;
  }> {
    try {
      const gastos = await this.getGastos('all');
      
      const totalGastos = gastos.length;
      const totalAprobados = gastos.filter(g => g.estado.codigo === 'aprobado').length;
      const totalRechazados = gastos.filter(g => g.estado.codigo === 'rechazado').length;
      const totalPendientes = gastos.filter(g => g.estado.codigo === 'pendiente').length;
      const porcentajeAprobacion = totalGastos > 0 ? (totalAprobados / totalGastos) * 100 : 0;
      
      return {
        totalGastos,
        totalAprobados,
        totalRechazados,
        totalPendientes,
        porcentajeAprobacion
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalGastos: 0,
        totalAprobados: 0,
        totalRechazados: 0,
        totalPendientes: 0,
        porcentajeAprobacion: 0
      };
    }
  }
}

// Exportar instancia singleton
export const empleadoService = new EmpleadoService();
export default empleadoService;