import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';

export interface LoginCredentials {
  correo: string;
  contrasena: string;
}

export interface RegisterData {
  nombre: string;
  correo: string;
  contrasena: string;
  tipo_usuario: number;
  telefono?: string;
}

export interface User {
  id: number;
  nombre: string;
  correo: string;
  tipo_usuario: number;
  telefono?: string;
}

export interface AuthResponse {
  token_acceso: string;
  id_usuario: number;
  nombre: string;
  correo: string;
  tipo_usuario: number;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/login', credentials);
      
      // Guardar token y datos del usuario
      await AsyncStorage.setItem('token', response.token_acceso);
      await AsyncStorage.setItem('usuario', JSON.stringify({
        id: response.id_usuario,
        nombre: response.nombre,
        correo: response.correo,
        tipo_usuario: response.tipo_usuario,
      }));

      return response;
    } catch (error) {
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/registro', userData);
      
      // Guardar token y datos del usuario
      await AsyncStorage.setItem('token', response.token_acceso);
      await AsyncStorage.setItem('usuario', JSON.stringify({
        id: response.id_usuario,
        nombre: response.nombre,
        correo: response.correo,
        tipo_usuario: response.tipo_usuario,
      }));

      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['token', 'usuario']);
    } catch (error) {
      console.log('Error during logout:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('usuario');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.log('Error getting current user:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('token');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService();