import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState, AppStateStatus } from 'react-native';
import authService from '../services/authService';
import {
  User,
  AuthContextType,
  AuthState,
  LoginCredentials,
  RegisterData,
  ValidationResponse
} from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Estados principales
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [appStateVisible, setAppStateVisible] = useState<AppStateStatus>(AppState.currentState);

  // Inicializar el contexto al montar
  useEffect(() => {
    initializeAuth();
  }, []);

  // Manejar cambios de estado de la aplicación (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appStateVisible.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 App volvió a primer plano, validando sesión...');

        // Solo validar si el usuario está autenticado
        if (isAuthenticated && user) {
          const isTokenValid = await authService.validateToken();

          if (!isTokenValid) {
            console.log('❌ Token expirado por inactividad, cerrando sesión...');
            Alert.alert(
              'Sesión expirada',
              'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.',
              [{ text: 'OK', onPress: () => logout() }]
            );
          }
        }
      }
      setAppStateVisible(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription?.remove();
  }, [appStateVisible, isAuthenticated, user]);

  // Función para inicializar el estado de autenticación
  const initializeAuth = async () => {
    try {
      console.log('🔄 Inicializando contexto de autenticación...');
      
      setIsLoading(true);
      setAuthState('loading');

      // Verificar si el usuario está autenticado
      const isAuth = await authService.isAuthenticated();
      
      if (isAuth) {
        // Obtener datos del usuario desde storage
        const userData = await authService.getCurrentUserFromStorage();
        
        if (userData) {
          // Validar el token actual
          const isTokenValid = await authService.validateToken();
          
          if (isTokenValid) {
            setUser(userData);
            setIsAuthenticated(true);
            setAuthState('authenticated');
            console.log('✅ Usuario autenticado:', userData.username);
          } else {
            console.log('❌ Token inválido, limpiando sesión...');
            await clearAuthState();
          }
        } else {
          console.log('❌ No se encontraron datos de usuario, limpiando sesión...');
          await clearAuthState();
        }
      } else {
        console.log('ℹ️ Usuario no autenticado');
        await clearAuthState();
      }
    } catch (error) {
      console.error('💥 Error inicializando autenticación:', error);
      await clearAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  // Función para limpiar el estado de autenticación
  const clearAuthState = async () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthState('unauthenticated');
    await authService.clearSession();
  };

  // Función de login
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
      console.log('🔐 Iniciando login desde contexto...');
      
      const result = await authService.login(credentials);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        setAuthState('authenticated');
        console.log('✅ Login exitoso en contexto:', result.user.username);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Error en login (contexto):', error);
      return {
        success: false,
        message: error.message || 'Error de conexión'
      };
    }
  };

  // Función de registro
  const register = async (userData: RegisterData): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
      console.log('📝 Iniciando registro desde contexto...');
      
      const result = await authService.register(userData);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        setAuthState('authenticated');
        console.log('✅ Registro exitoso en contexto:', result.user.username);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Error en registro (contexto):', error);
      return {
        success: false,
        message: error.message || 'Error de conexión'
      };
    }
  };

  // Función de logout
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Cerrando sesión desde contexto...');
      
      await authService.logout();
      await clearAuthState();
      
      console.log('✅ Logout completado en contexto');
    } catch (error) {
      console.error('❌ Error en logout (contexto):', error);
      // Limpiar estado local aunque falle el logout en el servidor
      await clearAuthState();
    }
  };

  // Función para verificar disponibilidad de username
  const checkUsernameAvailability = async (username: string): Promise<ValidationResponse> => {
    try {
      return await authService.checkUsernameAvailability(username);
    } catch (error: any) {
      return {
        available: false,
        message: error.message || 'Error verificando username'
      };
    }
  };

  // Función para verificar disponibilidad de email
  const checkEmailAvailability = async (email: string): Promise<ValidationResponse> => {
    try {
      return await authService.checkEmailAvailability(email);
    } catch (error: any) {
      return {
        available: false,
        message: error.message || 'Error verificando email'
      };
    }
  };

  // Función para renovar token
  const refreshToken = async (): Promise<boolean> => {
    try {
      console.log('🔄 Renovando token...');
      const success = await authService.refreshToken();
      
      if (success) {
        console.log('✅ Token renovado exitosamente');
        return true;
      } else {
        console.log('❌ No se pudo renovar el token, cerrando sesión...');
        await logout();
        return false;
      }
    } catch (error) {
      console.error('❌ Error renovando token:', error);
      await logout();
      return false;
    }
  };

  // Función para validar token actual
  const validateCurrentToken = async (): Promise<boolean> => {
    try {
      const isValid = await authService.validateToken();
      
      if (!isValid) {
        console.log('❌ Token inválido, cerrando sesión...');
        await logout();
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ Error validando token:', error);
      await logout();
      return false;
    }
  };

  // Función para obtener el usuario actual actualizado
  const getCurrentUser = async (): Promise<User | null> => {
    try {
      const result = await authService.getUserProfile();
      
      if (result.success && result.user) {
        setUser(result.user);
        return result.user;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo usuario actual:', error);
      return null;
    }
  };

  // Manejar cambios en el estado de autenticación
  useEffect(() => {
    if (authState === 'unauthenticated' && !isLoading) {
      // Silent cleanup - no need to log this common state
    } else if (authState === 'authenticated' && user) {
      // Only log in development mode
      if (__DEV__) {
        console.log('ℹ️ Usuario autenticado:', user.username);
      }
    }
  }, [authState, user, isLoading]);

  // Auto-renovación de token (opcional)
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(async () => {
        console.log('🔄 Verificación automática de token...');
        await validateCurrentToken();
      }, 15 * 60 * 1000); // Cada 15 minutos

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Valor del contexto
  const contextValue: AuthContextType = {
    // Estado
    user,
    isAuthenticated,
    isLoading,
    authState,

    // Métodos de autenticación
    login,
    register,
    logout,

    // Métodos de validación
    checkUsernameAvailability,
    checkEmailAvailability,

    // Métodos de gestión de sesión
    refreshToken,
    validateCurrentToken,
    getCurrentUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
};

// Hook para verificar si el usuario está autenticado
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

// Hook para obtener el usuario actual
export const useCurrentUser = (): User | null => {
  const { user } = useAuth();
  return user;
};

// Hook con acciones de autenticación
export const useAuthActions = () => {
  const { login, register, logout } = useAuth();
  
  return {
    login,
    register,
    logout,
  };
};

// Hook para validaciones
export const useAuthValidation = () => {
  const { checkUsernameAvailability, checkEmailAvailability } = useAuth();
  
  return {
    checkUsernameAvailability,
    checkEmailAvailability,
  };
};

// Hook para gestión de sesión
export const useSessionManagement = () => {
  const { refreshToken, validateCurrentToken, getCurrentUser } = useAuth();
  
  return {
    refreshToken,
    validateCurrentToken,
    getCurrentUser,
  };
};

// Componente de orden superior para proteger rutas
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      // Mostrar loading mientras se verifica la autenticación
      return null; // O tu componente de loading
    }
    
    if (!isAuthenticated) {
      // Redireccionar al login o mostrar mensaje
      return null; // O tu componente de no autenticado
    }
    
    return <Component {...props} />;
  };
};

// Exportar contexto para casos avanzados
export { AuthContext };

export default AuthProvider;