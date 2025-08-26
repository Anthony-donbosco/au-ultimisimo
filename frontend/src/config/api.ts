import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// CAMBIAR ESTAS IPs por la IP de tu computadora en la red local
const DEV_API_URL = Platform.select({
  ios: 'http://192.168.1.100:5000', // ← CAMBIAR por tu IP local
  android: 'http://192.168.1.100:5000', // ← CAMBIAR por tu IP local  
  default: 'http://localhost:5000'
});

const PROD_API_URL = 'https://tu-servidor-produccion.com';

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register', 
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    VALIDATE_TOKEN: '/api/auth/validate-token',
    CHECK_USERNAME: '/api/auth/check-username',
    CHECK_EMAIL: '/api/auth/check-email',
  },
  HEALTH: '/health',
  API_INFO: '/api'
};

// Configuración por defecto para fetch
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Función helper para hacer requests autenticados
export const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return {
    ...DEFAULT_HEADERS,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

// Función helper para hacer requests HTTP
export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...options.headers,
    },
  };

  try {
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`📡 API Response [${response.status}]:`, data);
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP Error: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error);
    throw error;
  }
};

// Función para hacer requests autenticados
export const authenticatedRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const headers = await getAuthHeaders();
  
  return apiRequest(endpoint, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
};