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
 * Resuelve la baseURL en este orden:
 * 1) EXPO_PUBLIC_API_URL (si la defines en tu .env o en app.config)
 * 2) expoConfig.extra.apiUrl (si la pones en app.json/app.config.ts)
 * 3) Fallbacks: 10.0.2.2 (emulador Android) o tu IP LAN (192.168.1.62)
 */
function resolveBaseUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (fromEnv) return normalizeApiUrl(fromEnv);

  const fromExtra = (Constants?.expoConfig as any)?.extra?.apiUrl as string | undefined;
  if (fromExtra && fromExtra.trim()) return normalizeApiUrl(fromExtra);

  // Fallbacks inteligentes
  if (Platform.OS === 'android') {
    // Emulador Android accede al host por 10.0.2.2
    return 'http://10.0.2.2:5000/api';
  }

  // Dispositivo físico en la misma LAN: usa tu IPv4 actual
  return 'http://192.168.244.147:5000';
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
        if (status === 401) {
          // Token inválido/expirado → limpia llaves que usas en tu app
          await AsyncStorage.multiRemove(['token', 'usuario', 'user', 'isAuthenticated']);
          // Si deseas, aquí puedes emitir un evento para redirigir a Login
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
