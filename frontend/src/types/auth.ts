// Tipos de datos para el sistema de autenticación

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

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

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
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

export interface ValidationResponse {
  available: boolean;
  message: string;
}

// Estados de autenticación
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextType {
  // Estado
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authState: AuthState;

  // Métodos de autenticación
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string; user?: User }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => Promise<void>;
  
  // Métodos de validación
  checkUsernameAvailability: (username: string) => Promise<ValidationResponse>;
  checkEmailAvailability: (email: string) => Promise<ValidationResponse>;
  
  // Métodos de gestión de sesión
  refreshToken: () => Promise<boolean>;
  validateCurrentToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<User | null>;
}

// Props para componentes de autenticación
export interface LoginProps {
  onLoginSuccess: (user: User) => void;
  isDarkMode?: boolean;
  onSwitchToRegister?: () => void;
}

export interface RegistroProps {
  onRegisterSuccess: (user: User) => void;
  isDarkMode?: boolean;
  onSwitchToLogin?: () => void;
}

export interface CredencialesLogin {
  email: string;
  contrasena: string;
}

export interface DatosRegistro {
  nombre: string;
  email: string;
  contrasena: string;
  confirmarContrasena: string;
  tipoUsuario: 'usuario' | 'admin';
}

// Errores de validación
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface LoginErrors {
  login?: string;
  password?: string;
}

export interface RegisterErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

// Estados de carga específicos
export interface LoadingStates {
  login: boolean;
  register: boolean;
  logout: boolean;
  checkingUsername: boolean;
  checkingEmail: boolean;
  refreshingToken: boolean;
  validatingToken: boolean;
}

// Configuración de autenticación
export interface AuthConfig {
  tokenKey: string;
  userKey: string;
  isAuthenticatedKey: string;
  tokenValidationInterval?: number;
  autoRefreshToken?: boolean;
}

// Eventos de autenticación
export type AuthEventType = 
  | 'login_success' 
  | 'login_failure' 
  | 'register_success' 
  | 'register_failure'
  | 'logout'
  | 'token_expired'
  | 'token_refresh_success'
  | 'token_refresh_failure';

export interface AuthEvent {
  type: AuthEventType;
  user?: User;
  message?: string;
  timestamp: number;
}

// Hook personalizado para autenticación
export interface UseAuthReturn {
  // Estados
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authState: AuthState;
  errors: FormErrors;

  // Métodos
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string; user?: User }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => Promise<void>;
  clearErrors: () => void;
  
  // Utilidades
  checkUsernameAvailability: (username: string) => Promise<ValidationResponse>;
  checkEmailAvailability: (email: string) => Promise<ValidationResponse>;
  refreshToken: () => Promise<boolean>;
  validateToken: () => Promise<boolean>;
}

// Tipos para navegación
export interface AuthStackParamList {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
}

export interface UserStackParamList {
  Dashboard: undefined;
  Profile: undefined;
  Settings: undefined;
  // Otros screens del usuario autenticado
}

// Tipos para persistencia de datos
export interface StoredUserData {
  user: User;
  token: string;
  tokenExpiry?: number;
  lastActivity?: number;
}

// Tipos para configuración de API
export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Tipos para manejo de errores específicos de autenticación
export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'USERNAME_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface AuthError extends Error {
  code: AuthErrorCode;
  statusCode?: number;
  originalError?: any;
}

// Tipos para validaciones frontend
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean | string;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

// Tipos para diferentes estados del formulario de autenticación
export interface AuthFormState {
  values: { [key: string]: string };
  errors: { [key: string]: string };
  touched: { [key: string]: boolean };
  isValid: boolean;
  isSubmitting: boolean;
}

// Tipos para configuración de tema
export interface AuthTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    error: string;
    success: string;
    warning: string;
  };
  isDarkMode: boolean;
}

// Exports adicionales para casos específicos
export type { AuthState as AuthStateType };
export type { AuthEventType as AuthEventTypeUnion };
export type { AuthErrorCode as AuthErrorCodeType };