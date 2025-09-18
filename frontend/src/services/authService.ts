import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS, apiRequest, authenticatedRequest } from '../config/api';

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
  id_rol?: number; // 2 = empresa, 4 = usuario (default)
}

export interface Role {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
  id_rol: number;
  created_by_empresa_id?: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  role?: Role; // Información completa del rol
  empleado_details?: {
    puesto?: string;
    sueldo?: number;
    fecha_contratacion?: string;
    telefono?: string;
    direccion?: string;
  };
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

export interface GoogleAuthData {
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  first_name?: string;
  last_name?: string;
  firebase_token: string;
  id_rol?: number; // 2 = empresa, 4 = usuario (default)
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private token: string | null = null;

  constructor() {
    this.initializeFromStorage();
  }

  // Helper para limpiar mensajes de error
  private cleanErrorMessage(error: any, fallback: string = 'Error de conexión'): string {
    if (error?.message) {
      return error.message.replace(/^Error:\s*/, '');
    }
    return fallback;
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
      // Solo loggear errores de red/conexión, no errores de autenticación
      const errorMsg = this.cleanErrorMessage(error);
      if (errorMsg.includes('conexión') || errorMsg.includes('servidor') || errorMsg.includes('Network')) {
        console.error('❌ Network error en login:', error);
      } else {
        console.log('⚠️ Login attempt failed:', errorMsg);
      }
      return {
        success: false,
        message: errorMsg
      };
    }
  }

  // Método de registro (solo envía código de verificación)
  async register(userData: RegisterData): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('📝 Enviando código de verificación...');

      const response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (response.success) {
        console.log('✅ Código de verificación enviado');
        return { 
          success: true, 
          message: response.message,
          data: response.data 
        };
      } else {
        return { 
          success: false, 
          message: response.message || 'Error enviando código de verificación' 
        };
      }
    } catch (error: any) {
      console.error('❌ Error enviando código:', error);
      return { 
        success: false, 
        message: this.cleanErrorMessage(error, 'Error enviando código de verificación')
      };
    }
  }

  // Método para verificar email y completar registro
  async verifyEmail(verificationData: {
    email: string;
    code: string;
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      console.log('🔍 Verificando código de email...');

      const response = await apiRequest(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
        method: 'POST',
        body: JSON.stringify(verificationData),
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

        console.log('✅ Registro completado exitosamente:', user.username);
        return { 
          success: true, 
          message: response.message,
          user 
        };
      } else {
        return { 
          success: false, 
          message: response.message || 'Error verificando código' 
        };
      }
    } catch (error: any) {
      console.error('❌ Error verificando email:', error);
      return { 
        success: false, 
        message: this.cleanErrorMessage(error, 'Error verificando código')
      };
    }
  }

  // Método para reenviar código de verificación
  async resendVerificationCode(email: string, username?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Reenviando código de verificación...');

      const response = await apiRequest(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, {
        method: 'POST',
        body: JSON.stringify({ email, username }),
      });

      return {
        success: response.success,
        message: response.message || (response.success ? 'Código reenviado' : 'Error reenviando código')
      };
    } catch (error: any) {
      console.error('❌ Error reenviando código:', error);
      return {
        success: false,
        message: this.cleanErrorMessage(error, 'Error reenviando código')
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
      // Token expirado es un caso normal, no un error
      const errorMsg = this.cleanErrorMessage(error);
      if (errorMsg.includes('Token expirado') || errorMsg.includes('expirado')) {
        console.log('⏰ Token expirado, es necesario cerrar sesión');
      } else {
        console.error('Error validando token:', error);
      }
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
        message: this.cleanErrorMessage(error, 'Error verificando username')
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
        message: this.cleanErrorMessage(error, 'Error verificando email')
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
        message: this.cleanErrorMessage(error, 'Error obteniendo perfil')
      };
    }
  }

  // Método de autenticación con Google
  async authenticateWithGoogle(googleData: GoogleAuthData): Promise<{ success: boolean; message: string; user?: User; token?: string }> {
    try {
      console.log('🔐 Autenticando con Google...');

      const response = await apiRequest(API_ENDPOINTS.AUTH.GOOGLE_AUTH, {
        method: 'POST',
        body: JSON.stringify(googleData),
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
          AsyncStorage.setItem('isAuthenticated', 'true'),
          AsyncStorage.setItem('auth_method', 'google')
        ]);

        console.log('✅ Autenticación con Google exitosa:', user.username);
        return { 
          success: true, 
          message: response.message,
          user,
          token
        };
      } else {
        return { 
          success: false, 
          message: response.message || 'Error en autenticación con Google' 
        };
      }
    } catch (error: any) {
      console.error('❌ Error en autenticación con Google:', error);
      return { 
        success: false, 
        message: this.cleanErrorMessage(error, 'Error en autenticación con Google')
      };
    }
  }

  // Método para actualizar perfil del usuario
  async updateProfile(profileData: {
    first_name?: string;
    last_name?: string;
    username?: string;
  }): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      console.log('📝 Actualizando perfil del usuario...');

      const response = await authenticatedRequest(API_ENDPOINTS.USER.UPDATE_PROFILE, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (response.success && response.data?.user) {
        // Actualizar usuario en memoria y storage
        this.currentUser = response.data.user;
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('✅ Perfil actualizado exitosamente');
        return {
          success: true,
          message: response.message,
          user: response.data.user
        };
      }

      return {
        success: false,
        message: response.message || 'Error actualizando perfil'
      };
    } catch (error: any) {
      console.error('❌ Error actualizando perfil:', error);
      return {
        success: false,
        message: this.cleanErrorMessage(error, 'Error actualizando perfil')
      };
    }
  }

  // Método para subir avatar
  async uploadAvatar(imageUri: string): Promise<{ success: boolean; message: string; imageUrl?: string }> {
    try {
      console.log('📸 Subiendo avatar...');

      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USER.UPLOAD_AVATAR}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Actualizar el usuario actual con la nueva URL de la imagen
        if (this.currentUser && data.data?.imageUrl) {
          this.currentUser.picture = data.data.imageUrl;
          await AsyncStorage.setItem('user', JSON.stringify(this.currentUser));
        }

        console.log('✅ Avatar subido exitosamente');
        return {
          success: true,
          message: data.message,
          imageUrl: data.data?.imageUrl
        };
      }

      return {
        success: false,
        message: data.message || 'Error subiendo avatar'
      };
    } catch (error: any) {
      console.error('❌ Error subiendo avatar:', error);
      return {
        success: false,
        message: this.cleanErrorMessage(error, 'Error subiendo avatar')
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
      AsyncStorage.removeItem('isAuthenticated'),
      AsyncStorage.removeItem('auth_method'),
      AsyncStorage.removeItem('google_token')
    ]);
  }

  // Helper para obtener nombre del rol
  getUserRoleName(user: User): string {
    if (user.role?.nombre) return user.role.nombre;
    
    // Fallback basado en ID
    switch (user.id_rol) {
      case 1: return 'administrador';
      case 2: return 'empresa';
      case 3: return 'empleado';
      case 4: return 'usuario';
      default: return 'usuario';
    }
  }

  // Helper para verificar permisos por rol
  canUserAccess(user: User, requiredRole: string): boolean {
    const userRole = this.getUserRoleName(user);
    return userRole === requiredRole;
  }
}

// Exportar instancia singleton
export const authService = AuthService.getInstance();
export default authService; 