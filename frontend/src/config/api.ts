import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Función para obtener la URL base desde variables de entorno
const getDevApiUrl = () => {
  console.log('🔍 Detectando URL del backend...');
  
  // 1. Priorizar EXPO_PUBLIC_API_URL (más confiable en Expo)
  const expoPublicUrl = process.env.EXPO_PUBLIC_API_URL;
  if (expoPublicUrl) {
    console.log('🔧 Usando EXPO_PUBLIC_API_URL desde .env:', expoPublicUrl);
    return expoPublicUrl;
  }
  
  // 2. Intentar API_URL regular
  const envApiUrl = process.env.API_URL;
  if (envApiUrl) {
    console.log('🔧 Usando API_URL desde .env:', envApiUrl);
    return envApiUrl;
  }
  
  // 3. Intentar desde extra config (app.config.js)
  const extraApiUrl = Constants?.expoConfig?.extra?.apiUrl;
  if (extraApiUrl) {
    console.log('🔧 Usando apiUrl desde app.config extra:', extraApiUrl);
    return extraApiUrl;
  }
  
  // 4. Fallback automático basado en plataforma
  const fallbackUrl = Platform.select({
    ios: 'http://157.230.172.62:5000', // Tu IP actual (SIN /api)
    android: 'http://157.230.172.62:5000', // Misma IP para dispositivo físico (SIN /api)
    default: 'http://157.230.172.62:5000' // Usar IP local en lugar de localhost
  });
  
  console.log('⚠️ Usando URL fallback:', fallbackUrl);
  console.log('💡 Configura EXPO_PUBLIC_API_URL en tu .env para evitar este fallback');
  return fallbackUrl;
};

const DEV_API_URL = getDevApiUrl();
const PROD_API_URL = 'http://157.230.172.62:5000'; // Cambiar por tu IP pública o dominio

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// Debug logging
console.log('🔧 API CONFIG DEBUG:');
console.log('- __DEV__:', __DEV__);
console.log('- DEV_API_URL:', DEV_API_URL);
console.log('- API_BASE_URL Final:', API_BASE_URL);

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register', 
    VERIFY_EMAIL: '/api/auth/verify-email',
    RESEND_VERIFICATION: '/api/auth/resend-verification',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    VALIDATE_TOKEN: '/api/auth/validate-token',
    CHECK_USERNAME: '/api/auth/check-username',
    CHECK_EMAIL: '/api/auth/check-email',
    GOOGLE_AUTH: '/api/auth/google-auth',
  },
  USER: {
    UPDATE_PROFILE: '/api/user/profile',
    UPLOAD_AVATAR: '/api/user/upload-avatar',
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
      const errorMessage = data.message || `HTTP Error: ${response.status}`;

      // Solo loggear errores críticos, no credenciales inválidas
      if (response.status >= 500) {
        console.error(`❌ API Server Error for ${endpoint}:`, errorMessage);
      } else if (errorMessage.includes('Token expirado') || errorMessage.includes('expirado')) {
        console.log(`⏰ Token expirado para ${endpoint}:`, errorMessage);
      } else {
        // Para errores de autenticación solo un log informativo
        console.log(`⚠️ API Request failed for ${endpoint}: ${response.status} - ${errorMessage}`);
      }

      const error = new Error(errorMessage);
      error.name = ''; // Remover el nombre del error para evitar prefijos
      throw error;
    }

    return data;
  } catch (error) {
    // Solo re-loggear si es un error de red, no errores HTTP ya manejados
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`❌ Network Error for ${endpoint}:`, error.message);
    }
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

// Cliente API compatible con axios (para financialService.ts)
export const apiClient = {
  get: async (endpoint: string, options: any = {}) => {
    // Construir query string si hay parámetros
    let url = endpoint;
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.keys(options.params).forEach(key => {
        if (options.params[key] !== undefined && options.params[key] !== null) {
          searchParams.append(key, String(options.params[key]));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    const response = await authenticatedRequest(url, { method: 'GET' });
    // Envolver respuesta en formato axios-like
    return { data: response };
  },
  post: async (endpoint: string, data: any, options: any = {}) => {
    const response = await authenticatedRequest(endpoint, { 
      method: 'POST',
      body: JSON.stringify(data)
    });
    return { data: response };
  },
  put: async (endpoint: string, data: any, options: any = {}) => {
    const response = await authenticatedRequest(endpoint, { 
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return { data: response };
  },
  delete: async (endpoint: string, options: any = {}) => {
    const response = await authenticatedRequest(endpoint, { method: 'DELETE' });
    return { data: response };
  }
};