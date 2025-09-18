// types.ts
export interface CredencialesLogin {
  email: string;
  contrasena: string;
}

export interface DatosRegistro {
  nombre: string;
  email: string;
  contrasena: string;
  confirmarContrasena: string;
  tipoUsuario?: 'usuario' | 'admin';
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  tipoUsuario: 'usuario' | 'admin';
  tipo_usuario?: number; // Para compatibilidad con backend
}

export interface AuthContextType {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  login: (usuario: Usuario) => void;
  logout: () => void;
}

// Interfaces para componentes de autenticación
export interface LoginProps {
  onSubmit: (credenciales: CredencialesLogin) => Promise<void>;
  loading: boolean;
  isDarkMode: boolean;
  // Props adicionales para navegación
  onAuthChange?: (isAuth: boolean) => void;
  onRoleChange?: (role: number | null) => void;
  navigation?: any;
  route?: any;
}

export interface RegistroProps {
  onSubmit: (datosRegistro: DatosRegistro) => Promise<void>;
  loading: boolean;
  isDarkMode: boolean;
  // Props adicionales para navegación
  onAuthChange?: (isAuth: boolean) => void;
  onRoleChange?: (role: number | null) => void;
  navigation?: any;
  route?: any;
}

// Interfaces para pantallas de autenticación
export interface LoginScreenProps {
  navigation: any;
  onLogin: (usuario: Usuario) => void;
}

export interface RegisterScreenProps {
  navigation: any;
  onRegister: (usuario: Usuario) => void;
}