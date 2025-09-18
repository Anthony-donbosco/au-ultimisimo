// src/services/api.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Normaliza una URL para garantizar que termine con /api
 */
function normalizeApiUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Resuelve la baseURL en este orden de prioridad:
 * 1) API_URL desde .env
 * 2) EXPO_PUBLIC_API_URL desde .env
 * 3) expoConfig.extra.apiUrl desde app.config.js
 * 4) Fallbacks automáticos por plataforma
 */
function resolveBaseUrl(): string {
  console.log('🔍 API Service: Detectando URL del backend...');
  
  // 1. Priorizar EXPO_PUBLIC_API_URL (más confiable en Expo)
  const expoPublicUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (expoPublicUrl) {
    console.log('🔧 API: Usando EXPO_PUBLIC_API_URL desde .env:', expoPublicUrl);
    return normalizeApiUrl(expoPublicUrl);
  }
  
  // 2. API_URL desde .env (fallback)
  const apiUrl = (process.env.API_URL || '').trim();
  if (apiUrl) {
    console.log('🔧 API: Usando API_URL desde .env:', apiUrl);
    return normalizeApiUrl(apiUrl);
  }

  // 3. extra.apiUrl desde app.config.js
  const fromExtra = (Constants?.expoConfig as any)?.extra?.apiUrl as string | undefined;
  if (fromExtra && fromExtra.trim()) {
    console.log('🔧 API: Usando apiUrl desde app.config extra:', fromExtra);
    return normalizeApiUrl(fromExtra);
  }

  // 4. Fallbacks automáticos
  const fallbackUrl = Platform.select({
    android: 'http://192.168.0.4:5000/api', // Tu IP actual (CON /api porque normalizeApiUrl lo manejará)
    ios: 'http://192.168.0.4:5000/api', // Misma IP (CON /api porque normalizeApiUrl lo manejará) 
    default: 'http://192.168.0.4:5000/api' // Usar IP local en lugar de localhost
  });
  
  console.log('⚠️ API: Usando URL fallback:', fallbackUrl);
  console.log('💡 Configura EXPO_PUBLIC_API_URL en tu frontend/.env para evitar este fallback');
  return fallbackUrl;
}

const API_BASE_URL = resolveBaseUrl();

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000, // 10s
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 👉 Request: añade token si existe
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 👉 Response: maneja 401 limpiando la sesión
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<any>) => {
        const status = error.response?.status;
        const errorMessage = error.response?.data?.message || '';

        if (status === 401) {
          console.log('❌ Token inválido, limpiando sesión...');

          // Token inválido/expirado → limpia llaves que usas en tu app
          await AsyncStorage.multiRemove(['token', 'usuario', 'user', 'isAuthenticated']);

          // Importar dinámicamente authService para evitar dependencias circulares
          try {
            const { authService } = await import('./authService');
            await authService.clearSession();
            console.log('✅ Sesión limpiada por interceptor HTTP');
          } catch (importError) {
            console.warn('⚠️ No se pudo importar authService para limpiar sesión:', importError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ===== Métodos genéricos =====
  async get<T>(endpoint: string, params?: any): Promise<T> {
    const res = await this.api.get(endpoint, { params });
    return res.data as T;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const res = await this.api.post(endpoint, data);
    return res.data as T;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const res = await this.api.put(endpoint, data);
    return res.data as T;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const res = await this.api.delete(endpoint);
    return res.data as T;
  }

  /**
   * Ping de salud del backend.
   * Intenta /health y si no existe, cae a /ping.
   */
  async ping(): Promise<boolean> {
    try {
      await this.api.get('/health');
      return true;
    } catch {
      try {
        await this.api.get('/ping');
        return true;
      } catch {
        return false;
      }
    }
  }
}

export const apiService = new ApiService();
export default apiService;
