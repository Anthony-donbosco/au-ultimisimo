import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, apiRequest, authenticatedRequest } from '../config/api';

// Interfaces para tipos de datos
export interface LoginCredentials {
  email?: string;
  username?: string;
  login?: string; // Campo genérico que acepta email o username
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    token_type: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private token: string | null = null;

  constructor() {
    this.initializeFromStorage();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Inicializar datos desde AsyncStorage
  private async initializeFromStorage() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user')
      ]);

      if (storedToken) {
        this.token = storedToken;
      }

      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error inicializando desde storage:', error);
    }
  }

  // Método de login
  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      console.log('🔐 Iniciando login...');
      
      // Preparar datos para el backend (el backend espera 'login' y 'password')
      const loginData = {
        login: credentials.login || credentials.email || credentials.username,
        password: credentials.password
      };

      const response = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify(loginData),
      }) as AuthResponse;

      if (response.success && response.data) {
        const { user, token } = response.data;
        
        // Guardar en memoria
        this.currentUser = user;
        this.token = token;

        // Guardar en AsyncStorage
        await Promise.all([
          AsyncStorage.setItem('token', token),
          AsyncStorage.setItem('user', JSON.stringify(user)),
          AsyncStorage.setItem('isAuthenticated', 'true')
        ]);

        console.log('✅ Login exitoso:', user.username);
        return { 
          success: true, 
          message: response.message,
          user 
        };
      } else {
        return { 
          success: false, 
          message: response.message || 'Error en login' 
        };
      }
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      return { 
        success: false, 
        message: error.message || 'Error de conexión' 
      };
    }
  }

  // Método de registro
  async register(userData: RegisterData): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      console.log('📝 Iniciando registro...');

      const response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        body: JSON.stringify(userData),
      }) as AuthResponse;

      if (response.success && response.data) {
        const { user, token } = response.data;
        
        // Guardar en memoria
        this.currentUser = user;
        this.token = token;

        // Guardar en AsyncStorage
        await Promise.all([
          AsyncStorage.setItem('token', token),
          AsyncStorage.setItem('user', JSON.stringify(user)),
          AsyncStorage.setItem('isAuthenticated', 'true')
        ]);

        console.log('✅ Registro exitoso:', user.username);
        return { 
          success: true, 
          message: response.message,
          user 
        };
      } else {
        return { 
          success: false, 
          message: response.message || 'Error en registro' 
        };
      }
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      return { 
        success: false, 
        message: error.message || 'Error de conexión' 
      };
    }
  }

  // Método de logout
  async logout(): Promise<void> {
    try {
      console.log('🚪 Cerrando sesión...');

      // Intentar hacer logout en el backend
      if (this.token) {
        try {
          await authenticatedRequest(API_ENDPOINTS.AUTH.LOGOUT, {
            method: 'POST',
          });
        } catch (error) {
          console.warn('Warning: No se pudo hacer logout en el backend:', error);
        }
      }

      // Limpiar datos locales
      this.currentUser = null;
      this.token = null;

      // Limpiar AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem('token'),
        AsyncStorage.removeItem('user'),
        AsyncStorage.removeItem('isAuthenticated')
      ]);

      console.log('✅ Logout completado');
    } catch (error) {
      console.error('❌ Error en logout:', error);
    }
  }

  // Verificar si el usuario está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      const storedAuth = await AsyncStorage.getItem('isAuthenticated');
      const hasToken = await AsyncStorage.getItem('token');
      
      return storedAuth === 'true' && hasToken !== null;
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      return false;
    }
  }

  // Obtener usuario actual
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Obtener usuario desde storage
  async getCurrentUserFromStorage(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error obteniendo usuario desde storage:', error);
      return null;
    }
  }

  // Validar token actual
  async validateToken(): Promise<boolean> {
    try {
      if (!this.token) {
        const storedToken = await AsyncStorage.getItem('token');
        if (!storedToken) return false;
        this.token = storedToken;
      }

      const response = await authenticatedRequest(API_ENDPOINTS.AUTH.VALIDATE_TOKEN, {
        method: 'POST',
        body: JSON.stringify({ token: this.token }),
      });

      return response.success && response.data?.valid;
    } catch (error) {
      console.error('Error validando token:', error);
      return false;
    }
  }

  // Renovar token
  async refreshToken(): Promise<boolean> {
    try {
      const response = await authenticatedRequest(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
      });

      if (response.success && response.data?.token) {
        this.token = response.data.token;
        await AsyncStorage.setItem('token', response.data.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error renovando token:', error);
      return false;
    }
  }

  // Verificar disponibilidad de username
  async checkUsernameAvailability(username: string): Promise<{ available: boolean; message: string }> {
    try {
      const response = await apiRequest(API_ENDPOINTS.AUTH.CHECK_USERNAME, {
        method: 'POST',
        body: JSON.stringify({ username }),
      });

      return {
        available: response.data?.available || false,
        message: response.message
      };
    } catch (error: any) {
      return {
        available: false,
        message: error.message || 'Error verificando username'
      };
    }
  }

  // Verificar disponibilidad de email
  async checkEmailAvailability(email: string): Promise<{ available: boolean; message: string }> {
    try {
      const response = await apiRequest(API_ENDPOINTS.AUTH.CHECK_EMAIL, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      return {
        available: response.data?.available || false,
        message: response.message
      };
    } catch (error: any) {
      return {
        available: false,
        message: error.message || 'Error verificando email'
      };
    }
  }

  // Obtener información del perfil del usuario
  async getUserProfile(): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      const response = await authenticatedRequest(API_ENDPOINTS.AUTH.ME, {
        method: 'GET',
      });

      if (response.success && response.data?.user) {
        this.currentUser = response.data.user;
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        
        return {
          success: true,
          user: response.data.user,
          message: response.message
        };
      }

      return {
        success: false,
        message: response.message || 'Error obteniendo perfil'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error de conexión'
      };
    }
  }

  // Método para limpiar completamente la sesión
  async clearSession(): Promise<void> {
    this.currentUser = null;
    this.token = null;
    
    await Promise.all([
      AsyncStorage.removeItem('token'),
      AsyncStorage.removeItem('user'),
      AsyncStorage.removeItem('isAuthenticated')
    ]);
  }
}

// Exportar instancia singleton
export const authService = AuthService.getInstance();
export default authService;