import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';
import { getErrorMessage } from '../utils/networkUtils';
import { TokenErrorHandler } from '../utils/tokenErrorHandler';

// Interfaces específicas para empresa
export interface EmpleadoData {
  id?: number;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  puesto?: string;
  sueldo?: number;
  fechaContratacion?: string;
  notas?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface GastoPendiente {
  id: number;
  concepto: string;
  descripcion?: string;
  monto: number;
  fecha: string;
  proveedor?: string;
  ubicacion?: string;
  adjuntoUrl?: string;
  notas?: string;
  createdAt: string;
  empleado: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  categoria: {
    nombre: string;
    color?: string;
  };
  tipoPago: {
    nombre: string;
  };
}

export interface DashboardEmpresa {
  gastosPendientes: number;
  totalEmpleados: number;
  gastosPorEmpleado: Array<{
    empleado: string;
    gastosAprobados: number;
    gastosPendientes: number;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

class EmpresaService {
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

  private async handleApiError(error: any, operation: string) {
    console.error(`❌ Error en ${operation}:`, error);
    const errorMessage = getErrorMessage(error);
    
    if (error.response?.status === 401) {
      console.log('🔒 Token expirado en operación de empresa');
    }
    
    throw new Error(errorMessage);
  }

  // 👥 GESTIÓN DE EMPLEADOS
  async crearEmpleado(empleadoData: EmpleadoData): Promise<EmpleadoData> {
    try {
      console.log('👥 Creando empleado...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.post<ApiResponse<{ empleado: EmpleadoData }>>(
        '/empresa/empleados',
        empleadoData
      );

      if (response.success) {
        console.log('✅ Empleado creado exitosamente');
        return response.data!.empleado;
      } else {
        throw new Error(response.message || 'Error creando empleado');
      }
    } catch (error) {
      await this.handleApiError(error, 'crearEmpleado');
      throw error;
    }
  }

  async getEmpleados(): Promise<EmpleadoData[]> {
    try {
      console.log('👥 Obteniendo lista de empleados...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.get<ApiResponse<{ empleados: EmpleadoData[] }>>(
        '/empresa/empleados'
      );

      if (response.success) {
        console.log(`✅ ${response.data?.empleados?.length || 0} empleados obtenidos`);
        return response.data?.empleados || [];
      } else {
        throw new Error(response.message || 'Error obteniendo empleados');
      }
    } catch (error) {
      await this.handleApiError(error, 'getEmpleados');
      return []; // Fallback
    }
  }

  // 💰 GESTIÓN DE GASTOS Y APROBACIONES
  async getGastosPendientes(): Promise<GastoPendiente[]> {
    try {
      console.log('💰 Obteniendo gastos pendientes...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.get<ApiResponse<{ gastosPendientes: GastoPendiente[] }>>(
        '/empresa/gastos/pendientes'
      );

      if (response.success) {
        console.log(`✅ ${response.data?.gastosPendientes?.length || 0} gastos pendientes obtenidos`);
        return response.data?.gastosPendientes || [];
      } else {
        throw new Error(response.message || 'Error obteniendo gastos pendientes');
      }
    } catch (error) {
      await this.handleApiError(error, 'getGastosPendientes');
      return []; // Fallback
    }
  }

  async aprobarGasto(gastoId: number, comentario?: string): Promise<boolean> {
    try {
      console.log(`💰 Aprobando gasto ${gastoId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.post<ApiResponse>(
        `/empresa/gastos/${gastoId}/aprobar`,
        { comentario: comentario || '' }
      );

      if (response.success) {
        console.log('✅ Gasto aprobado exitosamente');
        return true;
      } else {
        throw new Error(response.message || 'Error aprobando gasto');
      }
    } catch (error) {
      await this.handleApiError(error, 'aprobarGasto');
      return false;
    }
  }

  async rechazarGasto(gastoId: number, motivo: string): Promise<boolean> {
    try {
      console.log(`💰 Rechazando gasto ${gastoId} con motivo: "${motivo}"`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.error('❌ Token no disponible');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      if (!motivo.trim()) {
        console.error('❌ Motivo vacío');
        throw new Error('El motivo del rechazo es requerido');
      }

      console.log(`🌐 Enviando POST a: /empresa/gastos/${gastoId}/rechazar`);
      console.log(`📝 Payload:`, { motivo });

      const response = await apiService.post<ApiResponse>(
        `/empresa/gastos/${gastoId}/rechazar`,
        { motivo }
      );

      console.log(`📨 Respuesta del servidor:`, response);

      if (response.success) {
        console.log('✅ Gasto rechazado exitosamente');
        return true;
      } else {
        console.error('❌ Respuesta no exitosa:', response.message);
        throw new Error(response.message || 'Error rechazando gasto');
      }
    } catch (error) {
      console.error('❌ Error en rechazarGasto:', error);
      await this.handleApiError(error, 'rechazarGasto');
      return false;
    }
  }

  // 📊 DASHBOARD DE EMPRESA
  async getDashboardData(): Promise<DashboardEmpresa> {
    try {
      console.log('📊 Obteniendo dashboard de empresa...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiService.get<ApiResponse<DashboardEmpresa>>(
        '/empresa/dashboard'
      );

      if (response.success) {
        console.log('✅ Dashboard de empresa obtenido exitosamente');
        return response.data!;
      } else {
        throw new Error(response.message || 'Error obteniendo dashboard');
      }
    } catch (error) {
      await this.handleApiError(error, 'getDashboardData');
      // Retornar datos vacíos como fallback
      return {
        gastosPendientes: 0,
        totalEmpleados: 0,
        gastosPorEmpleado: []
      };
    }
  }

  // 🔄 UTILIDADES
  async refreshData(): Promise<void> {
    try {
      console.log('🔄 Refrescando datos de empresa...');
      await Promise.all([
        AsyncStorage.removeItem('empresa_dashboard_cache'),
        AsyncStorage.removeItem('empleados_cache'),
        AsyncStorage.removeItem('gastos_pendientes_cache')
      ]);
      console.log('✅ Cache de empresa limpiado');
    } catch (error) {
      console.error('❌ Error limpiando cache de empresa:', error);
    }
  }

  // 📱 CACHE Y OFFLINE
  async getCachedData(key: string): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(`empresa_${key}`);
      if (cached) {
        const parsedData = JSON.parse(cached);
        const now = Date.now();
        
        // Cache válido por 5 minutos
        if (now - parsedData.timestamp < 300000) {
          console.log(`📱 Usando datos cached de empresa para ${key}`);
          return parsedData.data;
        } else {
          await AsyncStorage.removeItem(`empresa_${key}`);
        }
      }
      return null;
    } catch (error) {
      console.error(`❌ Error leyendo cache de empresa para ${key}:`, error);
      return null;
    }
  }

  async setCachedData(key: string, data: any): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(`empresa_${key}`, JSON.stringify(cacheData));
      console.log(`📱 Datos de empresa cached para ${key}`);
    } catch (error) {
      console.error(`❌ Error cacheando datos de empresa para ${key}:`, error);
    }
  }

  // 🧪 TESTING
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Probando conexión de empresa...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        return false;
      }

      const response = await apiService.get<ApiResponse>('/empresa/test');
      
      if (response.success) {
        console.log('✅ Conexión de empresa OK');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error en test de empresa:', error);
      return false;
    }
  }

  // === FUNCIONES DE ELIMINACIÓN ===

  /**
   * Eliminar un empleado
   */
  async eliminarEmpleado(empleadoId: number): Promise<boolean> {
    try {
      console.log(`🗑️ Eliminando empleado ${empleadoId}`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.error('❌ Token no disponible');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      console.log(`🌐 Enviando DELETE a: /empresa/empleados/${empleadoId}`);

      const response = await apiService.delete<ApiResponse>(
        `/empresa/empleados/${empleadoId}`
      );

      console.log(`📨 Respuesta del servidor:`, response);

      if (response.success) {
        console.log('✅ Empleado eliminado exitosamente');
        return true;
      } else {
        console.error('❌ Respuesta no exitosa:', response.message);
        throw new Error(response.message || 'Error eliminando empleado');
      }
    } catch (error) {
      console.error('❌ Error eliminando empleado:', error);
      await this.handleApiError(error, 'eliminarEmpleado');
      return false;
    }
  }
}

// Exportar instancia singleton
export const empresaService = new EmpresaService();
export default empresaService;