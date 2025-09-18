import { apiClient } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage } from '../utils/networkUtils';
import { TokenErrorHandler } from '../utils/tokenErrorHandler';

// Interfaces para las entidades financieras
interface DashboardData {
  saldoTotal: number;
  objetivos: {
    actual: number;
    meta: number;
    nombre: string;
    progreso: number;
  };
  ingresos: {
    total: number;
    porcentajeIncremento: number;
  };
  gastos: {
    total: number;
    porcentajeIncremento: number;
  };
  transaccionesRecientes: Transaction[];
  facturasPendientes: Bill[];
  rachas: {
    registroDiario: number;
    ahorro: number;
    objetivos: number;
    ultimoRegistro: string;
    mejorRacha: number;
    tipoRachaActual: 'registro' | 'ahorro' | 'objetivos';
  };
}

interface Transaction {
  id: number;
  nombre: string;
  categoria: string;
  monto: number;
  fecha: string;
  tipo: 'ingreso' | 'gasto';
}

interface Bill {
  id: number;
  nombre: string;
  monto: number;
  fechaVencimiento: string;
}

interface Income {
  id: number;
  concepto: string;
  fuente: string;
  monto: number;
  fecha: string;
  categoria: string | { id: number; nombre: string; [key: string]: any };
  tipo_ingreso?: string;
  es_recurrente?: boolean;
  frecuencia_recurrencia?: string;
}

interface IncomeType {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface Category {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: 'ingreso' | 'gasto' | 'ambos';
  icono?: string;
}

interface Prioridad {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  nivel_numerico: number;
  color?: string;
  icono?: string;
  es_activo: boolean;
}

interface IncomeResumen {
  totalMes: number;
  promedioSemestral: number;
  incrementoMensual: number;
  fuentePrincipal: string;
  porcentajeFuentePrincipal: number;
}

interface Expense {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
  categoria: string | { id: number; nombre: string; [key: string]: any };
  tipo_pago?: string;
  descripcion?: string;
  lugar?: string;
}

interface ExpenseResumen {
  totalMes: number;
  promedioSemestral: number;
  incrementoMensual: number;
  categoriaPrincipal: string;
  porcentajeCategoriaPrincipal: number;
  gastosPorCategoria: Array<{
    categoria: string;
    total: number;
    porcentaje: number;
  }>;
}

interface Goal {
  id: number;
  nombre: string;
  metaTotal: number;
  ahorroActual: number;
  fechaLimite: string;
  descripcion?: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  categoria: string;
  fechaCreacion?: string;
  estado?: 'activo' | 'completado' | 'pausado';
}

interface GoalResumen {
  totalAhorrado: number;
  totalMetas: number;
  progresoGeneral: number;
  objetivosActivos: number;
  objetivosCompletados: number;
  metaMasCercana?: {
    nombre: string;
    diasRestantes: number;
    progreso: number;
  };
}

interface GoalMovement {
  id: number;
  monto: number;
  es_aporte: boolean;
  tipo: 'aporte' | 'retiro';
  descripcion: string;
  fecha: string;
}

interface Bill {
  id: number;
  nombre: string;
  tipo: string;
  monto: number;
  fechaVencimiento: string;
  estado: 'Pendiente' | 'Pagada' | 'Vencida';
  descripcion?: string;
  logoUrl?: string;
  ultimoPago?: string;
  esRecurrente?: boolean;
  frecuenciaDias?: number;
}

interface BillSummary {
  totalPendientes: number;
  cantidadPendientes: number;
  cantidadVencidas: number;
  totalFacturas: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

class FinancialService {
  private async getAuthHeaders(): Promise<{ headers: any; hasToken: boolean }> {
    try {
      let token = await AsyncStorage.getItem('token');

      if (!token) {
        return {
          headers: {
            'Content-Type': 'application/json',
          },
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
        headers: {
          'Content-Type': 'application/json',
        },
        hasToken: false
      };
    }
  }

  private async handleApiError(error: any, operation: string) {
    // Use the centralized error message utility
    const errorMessage = getErrorMessage(error);

    // Solo loggear errores críticos o de servidor, no errores de autenticación comunes
    if (error.response?.status >= 500) {
      console.error(`❌ Server Error en ${operation}:`, error);
    } else if (error.response?.status === 401) {
      console.log('🔒 Token expirado, redirigiendo a login');
    } else if (!error.response && error.message?.includes('Network Error')) {
      console.error(`❌ Network Error en ${operation}:`, error.message);
    }

    throw new Error(errorMessage);
  }

  // 📊 DASHBOARD APIS
  async getDashboardData(period: string = 'current_month'): Promise<DashboardData> {
    try {
      console.log('📊 Obteniendo datos del dashboard...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        // Return empty dashboard data instead of throwing error when no token
        return {
          saldoTotal: 0,
          objetivos: {
            actual: 0,
            meta: 0,
            nombre: 'Sin objetivo activo',
            progreso: 0
          },
          ingresos: {
            total: 0,
            porcentajeIncremento: 0
          },
          gastos: {
            total: 0,
            porcentajeIncremento: 0
          },
          transaccionesRecientes: [],
          facturasPendientes: [],
          rachas: {
            registroDiario: 0,
            ahorro: 0,
            objetivos: 0,
            ultimoRegistro: '',
            mejorRacha: 0,
            tipoRachaActual: 'registro'
          }
        };
      }

      const response = await apiClient.get('/api/v1/financial/dashboard', {
        headers,
        params: { period }
      });

      if (response.data?.success) {
        console.log('✅ Dashboard data obtenida exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error obteniendo dashboard');
      }
    } catch (error) {
      await this.handleApiError(error, 'getDashboardData');
      throw error;
    }
  }

  // 💰 INCOME APIS
  async getIncomes(period: string = 'current_month', page: number = 1, limit: number = 20): Promise<{ items: Income[]; total: number; hasMore: boolean }> {
    try {
      console.log('💰 Obteniendo ingresos...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar ingresos');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.get('/api/v1/financial/income', {
        headers,
        params: { period, page, limit }
      });
      
      if (response.data?.success) {
        console.log('✅ Ingresos obtenidos exitosamente');
        const { items, pagination } = response.data.data;
        return {
          items,
          total: pagination.total,
          hasMore: pagination.has_next
        };
      } else {
        throw new Error(response.data?.message || 'Error obteniendo ingresos');
      }
    } catch (error) {
      await this.handleApiError(error, 'getIncomes');
      throw error;
    }
  }

  async getIncomeSummary(period: string = 'current_month'): Promise<IncomeResumen> {
    try {
      console.log('📈 Obteniendo resumen de ingresos...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar resumen de ingresos');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.get('/api/v1/financial/income/summary', {
        headers,
        params: { period }
      });
      
      if (response.data?.success) {
        console.log('✅ Resumen de ingresos obtenido exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error obteniendo resumen');
      }
    } catch (error) {
      await this.handleApiError(error, 'getIncomeSummary');
      throw error;
    }
  }

  async createIncome(incomeData: Omit<Income, 'id' | 'fecha'>): Promise<Income> {
    try {
      console.log('💰 Creando nuevo ingreso...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para crear ingreso');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post('/api/v1/financial/income', incomeData, {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Ingreso creado exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error creando ingreso');
      }
    } catch (error) {
      await this.handleApiError(error, 'createIncome');
      throw error;
    }
  }

  async getIncomeTypes(): Promise<IncomeType[]> {
    try {
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('⚠️ No hay token para tipos de ingreso, usando valores por defecto');
        return [
          { id: 1, nombre: 'Salario' },
          { id: 2, nombre: 'Freelance' },
          { id: 3, nombre: 'Inversiones' },
          { id: 4, nombre: 'Ventas' },
          { id: 5, nombre: 'Otros' }
        ];
      }

      const response = await apiClient.get('/api/v1/financial/catalogs/income-types', {
        headers
      });
      
      if (response.data?.success) {
        return response.data.data;
      } else {
        return []; // Return empty array as fallback
      }
    } catch (error) {
      console.log('⚠️ Usando tipos de ingreso por defecto');
      return [
        { id: 1, nombre: 'Salario' },
        { id: 2, nombre: 'Freelance' },
        { id: 3, nombre: 'Inversiones' },
        { id: 4, nombre: 'Ventas' },
        { id: 5, nombre: 'Otros' }
      ];
    }
  }

  async getIncomeCategories(): Promise<Category[]> {
    try {
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('⚠️ No hay token para categorías de ingreso, usando valores por defecto');
        return [
          { id: 1, nombre: 'Salario', tipo: 'ingreso' as const },
          { id: 2, nombre: 'Freelance', tipo: 'ingreso' as const },
          { id: 3, nombre: 'Inversiones', tipo: 'ingreso' as const },
          { id: 4, nombre: 'Ventas', tipo: 'ingreso' as const },
          { id: 5, nombre: 'Otros', tipo: 'ingreso' as const }
        ];
      }

      const response = await apiClient.get('/api/v1/financial/categories/ingreso', {
        headers
      });
      
      if (response.data?.success) {
        // Extract categories array from nested response structure
        return response.data.data.categorias || [];
      } else {
        return [];
      }
    } catch (error) {
      console.log('⚠️ Usando categorías de ingreso por defecto');
      return [
        { id: 1, nombre: 'Salario', tipo: 'ingreso' as const },
        { id: 2, nombre: 'Freelance', tipo: 'ingreso' as const },
        { id: 3, nombre: 'Inversiones', tipo: 'ingreso' as const },
        { id: 4, nombre: 'Ventas', tipo: 'ingreso' as const },
        { id: 5, nombre: 'Otros', tipo: 'ingreso' as const }
      ];
    }
  }

  // 💸 EXPENSE APIS
  async getExpenses(period: string = 'current_month', page: number = 1, limit: number = 20): Promise<{ items: Expense[]; total: number; hasMore: boolean }> {
    try {
      console.log('💸 Obteniendo gastos...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar gastos');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.get('/api/v1/financial/expenses', {
        headers,
        params: { period, page, limit }
      });
      
      if (response.data?.success) {
        console.log('✅ Gastos obtenidos exitosamente');
        // Handle the actual API response structure: {"data": {"gastos": [], "total": 0}}
        const data = response.data.data;
        const items = data.gastos || [];
        const total = data.total || 0;
        
        return {
          items,
          total,
          hasMore: items.length >= limit // Simple pagination check
        };
      } else {
        throw new Error(response.data?.message || 'Error obteniendo gastos');
      }
    } catch (error) {
      await this.handleApiError(error, 'getExpenses');
      throw error;
    }
  }

  async getExpenseSummary(period: string = 'current_month'): Promise<ExpenseResumen> {
    try {
      console.log('📊 Obteniendo resumen de gastos desde dashboard...');
      
      // Use dashboard endpoint as fallback since /expenses/summary doesn't exist
      const dashboardData = await this.getDashboardData(period);
      
      // Create expense summary from dashboard data
      const expenseResumen: ExpenseResumen = {
        totalMes: dashboardData.gastos?.total || 0,
        gastosPorCategoria: dashboardData.gastos?.categorias || [],
        porcentajeComparacion: 0, // Could be calculated if needed
        tendencia: 'neutral', // Default value
        promedioDiario: (dashboardData.gastos?.total || 0) / 30, // Simple average
        periodo: period
      };
      
      console.log('✅ Resumen de gastos obtenido desde dashboard');
      return expenseResumen;
    } catch (error) {
      await this.handleApiError(error, 'getExpenseSummary');
      throw error;
    }
  }

  async createExpense(expenseData: Omit<Expense, 'id'>): Promise<Expense> {
    try {
      console.log('💸 Creando nuevo gasto...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para crear gasto');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post('/api/v1/financial/expenses', expenseData, {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Gasto creado exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error creando gasto');
      }
    } catch (error) {
      await this.handleApiError(error, 'createExpense');
      throw error;
    }
  }

  async getExpenseCategories(): Promise<Category[]> {
    try {
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('⚠️ No hay token para categorías de gasto, usando valores por defecto');
        return [
          { id: 1, nombre: 'Alimentación', tipo: 'gasto' as const },
          { id: 2, nombre: 'Transporte', tipo: 'gasto' as const },
          { id: 3, nombre: 'Entretenimiento', tipo: 'gasto' as const },
          { id: 4, nombre: 'Salud', tipo: 'gasto' as const },
          { id: 5, nombre: 'Educación', tipo: 'gasto' as const },
          { id: 6, nombre: 'Hogar', tipo: 'gasto' as const },
          { id: 7, nombre: 'Ropa', tipo: 'gasto' as const },
          { id: 8, nombre: 'Otros', tipo: 'gasto' as const }
        ];
      }

      const response = await apiClient.get('/api/v1/financial/categories/gasto', {
        headers
      });
      
      if (response.data?.success) {
        // Extract categories array from nested response structure
        return response.data.data.categorias || [];
      } else {
        return [];
      }
    } catch (error) {
      console.log('⚠️ Usando categorías de gasto por defecto');
      return [
        { id: 1, nombre: 'Alimentación', tipo: 'gasto' as const },
        { id: 2, nombre: 'Transporte', tipo: 'gasto' as const },
        { id: 3, nombre: 'Entretenimiento', tipo: 'gasto' as const },
        { id: 4, nombre: 'Salud', tipo: 'gasto' as const },
        { id: 5, nombre: 'Educación', tipo: 'gasto' as const },
        { id: 6, nombre: 'Hogar', tipo: 'gasto' as const },
        { id: 7, nombre: 'Ropa', tipo: 'gasto' as const },
        { id: 8, nombre: 'Otros', tipo: 'gasto' as const }
      ];
    }
  }

  // 🎯 GOALS APIS
  async getGoals(): Promise<Goal[]> {
    try {
      console.log('🎯 Obteniendo objetivos...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar objetivos');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.get('/api/v1/financial/goals', {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Objetivos obtenidos exitosamente');
        // Return the actual objetivos array, not the wrapper object
        return response.data.data?.objetivos || [];
      } else {
        throw new Error(response.data?.message || 'Error obteniendo objetivos');
      }
    } catch (error) {
      await this.handleApiError(error, 'getGoals');
      throw error;
    }
  }

  async getGoalsSummary(): Promise<GoalResumen> {
    try {
      console.log('📊 Obteniendo resumen de objetivos...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar resumen de objetivos');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.get('/api/v1/financial/goals/summary', {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Resumen de objetivos obtenido exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error obteniendo resumen');
      }
    } catch (error) {
      await this.handleApiError(error, 'getGoalsSummary');
      throw error;
    }
  }

  async createGoal(goalData: Omit<Goal, 'id' | 'ahorroActual' | 'fechaCreacion'>): Promise<Goal> {
    try {
      console.log('🎯 Creando nuevo objetivo...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para crear objetivo');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post('/api/v1/financial/goals', goalData, {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Objetivo creado exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error creando objetivo');
      }
    } catch (error) {
      await this.handleApiError(error, 'createGoal');
      throw error;
    }
  }

  async addMoneyToGoal(goalId: number, amount: number): Promise<Goal> {
    try {
      console.log(`🎯 Agregando $${amount} al objetivo ${goalId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para agregar dinero al objetivo');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post(`/api/v1/financial/goals/${goalId}/add-money`, {
        monto: amount
      }, {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Dinero agregado al objetivo exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error agregando dinero');
      }
    } catch (error) {
      await this.handleApiError(error, 'addMoneyToGoal');
      throw error;
    }
  }

  async withdrawMoneyFromGoal(goalId: number, amount: number): Promise<Goal> {
    try {
      console.log(`🎯 Retirando $${amount} del objetivo ${goalId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para retirar dinero del objetivo');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post(`/api/v1/financial/goals/${goalId}/withdraw-money`, {
        monto: amount
      }, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Dinero retirado del objetivo exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error retirando dinero');
      }
    } catch (error) {
      await this.handleApiError(error, 'withdrawMoneyFromGoal');
      throw error;
    }
  }

  async getGoalMovements(goalId: number): Promise<GoalMovement[]> {
    try {
      console.log(`🎯 Obteniendo historial de movimientos del objetivo ${goalId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar historial de movimientos');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.get(`/api/v1/financial/goals/${goalId}/movements`, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Historial de movimientos obtenido exitosamente');
        return response.data.data?.movimientos || [];
      } else {
        throw new Error(response.data?.message || 'Error obteniendo historial de movimientos');
      }
    } catch (error) {
      await this.handleApiError(error, 'getGoalMovements');
      throw error;
    }
  }

  // 🔄 UTILITY METHODS
  async refreshData(): Promise<void> {
    try {
      console.log('🔄 Refrescando datos financieros...');
      // This would typically clear any cached data and force refresh
      await AsyncStorage.removeItem('dashboard_cache');
      await AsyncStorage.removeItem('financial_data_cache');
      console.log('✅ Cache limpiado');
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
    }
  }

  // 📱 OFFLINE SUPPORT
  async getCachedData(key: string): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const parsedData = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is less than 5 minutes old
        if (now - parsedData.timestamp < 300000) {
          console.log(`📱 Usando datos cached para ${key}`);
          return parsedData.data;
        } else {
          await AsyncStorage.removeItem(key);
        }
      }
      return null;
    } catch (error) {
      console.error(`❌ Error leyendo cache para ${key}:`, error);
      return null;
    }
  }

  // 📄 BILLS APIs
  async getBills(estado?: 'all' | 'pending' | 'paid' | 'overdue'): Promise<Bill[]> {
    try {
      console.log('📄 Obteniendo facturas...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar facturas');
        return [];
      }

      const params = estado && estado !== 'all' ? { estado } : {};
      const response = await apiClient.get('/api/v1/financial/bills', {
        headers,
        params
      });
      
      if (response.data?.success) {
        console.log('✅ Facturas obtenidas exitosamente');
        return response.data.data?.facturas || [];
      } else {
        throw new Error(response.data?.message || 'Error obteniendo facturas');
      }
    } catch (error) {
      await this.handleApiError(error, 'getBills');
      // Return empty array as fallback
      return [];
    }
  }

  async createBill(billData: Omit<Bill, 'id' | 'ultimoPago'>): Promise<Bill> {
    try {
      console.log('📄 Creando nueva factura...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para crear factura');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post('/api/v1/financial/bills', billData, {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Factura creada exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error creando factura');
      }
    } catch (error) {
      await this.handleApiError(error, 'createBill');
      throw error;
    }
  }

  async markBillAsPaid(billId: number): Promise<boolean> {
    try {
      console.log(`📄 Marcando factura ${billId} como pagada...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para marcar factura como pagada');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post(`/api/v1/financial/bills/${billId}/mark-paid`, {}, {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Factura marcada como pagada');
        return true;
      } else {
        throw new Error(response.data?.message || 'Error marcando factura como pagada');
      }
    } catch (error) {
      await this.handleApiError(error, 'markBillAsPaid');
      throw error;
    }
  }

  async getBillsSummary(): Promise<BillSummary> {
    try {
      console.log('📊 Obteniendo resumen de facturas...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar resumen de facturas');
        return {
          totalPendientes: 0,
          cantidadPendientes: 0,
          cantidadVencidas: 0,
          totalFacturas: 0
        };
      }

      const response = await apiClient.get('/api/v1/financial/bills/summary', {
        headers
      });
      
      if (response.data?.success) {
        console.log('✅ Resumen de facturas obtenido exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error obteniendo resumen');
      }
    } catch (error) {
      await this.handleApiError(error, 'getBillsSummary');
      // Return default summary
      return {
        totalPendientes: 0,
        cantidadPendientes: 0,
        cantidadVencidas: 0,
        totalFacturas: 0
      };
    }
  }

  async setCachedData(key: string, data: any): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`📱 Datos cached para ${key}`);
    } catch (error) {
      console.error(`❌ Error cacheando datos para ${key}:`, error);
    }
  }

  // 📅 PLANNED EXPENSE APIS
  async getPlannedExpenses(): Promise<any[]> {
    try {
      console.log('📅 Obteniendo gastos planificados...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cargar gastos planificados');
        return [];
      }

      const response = await apiClient.get('/api/v1/financial/expenses/planned', {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Gastos planificados obtenidos exitosamente:', response.data.data.length);
        console.log('📊 Datos de gastos planificados:', response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error obteniendo gastos planificados');
      }
    } catch (error) {
      await this.handleApiError(error, 'getPlannedExpenses');
      return [];
    }
  }

  async createPlannedExpense(expenseData: any): Promise<any> {
    try {
      console.log('📅 Creando gasto planificado...');
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para crear gasto planificado');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post('/api/v1/financial/expenses/planned', expenseData, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Gasto planificado creado exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error creando gasto planificado');
      }
    } catch (error) {
      await this.handleApiError(error, 'createPlannedExpense');
      throw error;
    }
  }

  async executePlannedExpense(expenseId: number): Promise<any> {
    try {
      console.log(`📅 Ejecutando gasto planificado ${expenseId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para ejecutar gasto planificado');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post(`/api/v1/financial/expenses/planned/${expenseId}/execute`, {}, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Gasto planificado ejecutado exitosamente');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error ejecutando gasto planificado');
      }
    } catch (error) {
      await this.handleApiError(error, 'executePlannedExpense');
      throw error;
    }
  }

  async cancelPlannedExpense(expenseId: number): Promise<boolean> {
    try {
      console.log(`📅 Cancelando gasto planificado ${expenseId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para cancelar gasto planificado');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.post(`/api/v1/financial/expenses/planned/${expenseId}/cancel`, {}, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Gasto planificado cancelado exitosamente');
        return true;
      } else {
        throw new Error(response.data?.message || 'Error cancelando gasto planificado');
      }
    } catch (error) {
      await this.handleApiError(error, 'cancelPlannedExpense');
      return false;
    }
  }

  // ============================================================================
  // TRANSACTIONS ENDPOINTS
  // ============================================================================

  async getTransactions(periodo: string = 'mes_actual', tipo: 'all' | 'ingreso' | 'gasto' = 'all'): Promise<{
    transacciones: Transaction[];
    total: number;
    filtros: { periodo: string; tipo: string };
  }> {
    try {
      console.log(`💰 Obteniendo transacciones - Período: ${periodo}, Tipo: ${tipo}...`);

      const params = new URLSearchParams();
      params.append('periodo', periodo);
      if (tipo !== 'all') {
        params.append('tipo', tipo);
      }

      const response = await apiClient.get(`/api/v1/financial/transactions?${params.toString()}`);

      if (response.data?.success) {
        console.log(`✅ ${response.data.data.total} transacciones obtenidas exitosamente`);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error obteniendo transacciones');
      }
    } catch (error) {
      console.error('❌ Error obteniendo transacciones:', error);
      await this.handleApiError(error, 'getTransactions');
      throw error;
    }
  }

  // Obtener prioridades disponibles
  async getPrioridades(): Promise<Prioridad[]> {
    try {
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.get('/api/v1/financial/catalogs/priorities', {
        headers,
      });

      if (response.data?.success) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Error obteniendo prioridades');
      }
    } catch (error) {
      console.error('❌ Error obteniendo prioridades:', error);
      await this.handleApiError(error, 'getPrioridades');
      throw error;
    }
  }

  // ============================================================================
  // MÉTODOS DELETE
  // ============================================================================

  async deleteIncome(incomeId: number): Promise<boolean> {
    try {
      console.log(`💰 Eliminando ingreso ${incomeId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para eliminar ingreso');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.delete(`/api/v1/financial/income/${incomeId}`, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Ingreso eliminado exitosamente');
        return true;
      } else {
        throw new Error(response.data?.message || 'Error eliminando ingreso');
      }
    } catch (error) {
      await this.handleApiError(error, 'deleteIncome');
      throw error;
    }
  }

  async deleteExpense(expenseId: number): Promise<boolean> {
    try {
      console.log(`💸 Eliminando gasto ${expenseId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para eliminar gasto');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.delete(`/api/v1/financial/expenses/${expenseId}`, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Gasto eliminado exitosamente');
        return true;
      } else {
        throw new Error(response.data?.message || 'Error eliminando gasto');
      }
    } catch (error) {
      await this.handleApiError(error, 'deleteExpense');
      throw error;
    }
  }

  async deleteGoal(goalId: number): Promise<boolean> {
    try {
      console.log(`🎯 Eliminando objetivo ${goalId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para eliminar objetivo');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.delete(`/api/v1/financial/goals/${goalId}`, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Objetivo eliminado exitosamente');
        return true;
      } else {
        throw new Error(response.data?.message || 'Error eliminando objetivo');
      }
    } catch (error) {
      await this.handleApiError(error, 'deleteGoal');
      throw error;
    }
  }

  async deleteBill(billId: number): Promise<boolean> {
    try {
      console.log(`📄 Eliminando factura ${billId}...`);
      const { headers, hasToken } = await this.getAuthHeaders();

      if (!hasToken) {
        console.log('🔑 No hay token disponible para eliminar factura');
        const error = new Error('Token no disponible');
        TokenErrorHandler.handleTokenError(error);
        throw error;
      }

      const response = await apiClient.delete(`/api/v1/financial/bills/${billId}`, {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Factura eliminada exitosamente');
        return true;
      } else {
        throw new Error(response.data?.message || 'Error eliminando factura');
      }
    } catch (error) {
      await this.handleApiError(error, 'deleteBill');
      throw error;
    }
  }

  // Método para obtener tipos de factura
  async getBillTypes(): Promise<any[]> {
    try {
      const { headers } = await this.getAuthHeaders();
      const response = await apiClient.get('/api/v1/financial/bills/types', {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Tipos de factura obtenidos exitosamente');
        return response.data.tipos_factura || [];
      } else {
        throw new Error(response.data?.message || 'Error obteniendo tipos de factura');
      }
    } catch (error) {
      await this.handleApiError(error, 'getBillTypes');
      throw error;
    }
  }

  // Método para obtener estados de factura
  async getBillStatuses(): Promise<any[]> {
    try {
      const { headers } = await this.getAuthHeaders();
      const response = await apiClient.get('/api/v1/financial/bills/statuses', {
        headers
      });

      if (response.data?.success) {
        console.log('✅ Estados de factura obtenidos exitosamente');
        return response.data.estados_factura || [];
      } else {
        throw new Error(response.data?.message || 'Error obteniendo estados de factura');
      }
    } catch (error) {
      await this.handleApiError(error, 'getBillStatuses');
      throw error;
    }
  }
}

// Export singleton instance
export const financialService = new FinancialService();
export default financialService;

// Export types for use in components
export type {
  DashboardData,
  Transaction,
  Bill,
  Income,
  IncomeResumen,
  Expense,
  ExpenseResumen,
  Goal,
  GoalResumen,
  GoalMovement,
  Category,
  IncomeType,
  Prioridad,
  ApiResponse
};