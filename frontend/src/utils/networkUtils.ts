import Constants from 'expo-constants';
import i18n from '../i18n/i18n';

const API_BASE_URL =
  // Si usas app.json/app.config con extra.apiUrl úsalo; si no, cae a localhost:5000/api
  (Constants.expoConfig?.extra as any)?.apiUrl || 'http://localhost:5000/api';

export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${API_BASE_URL}/ping`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Network check failed:', error);
    return false;
  }
};

export const formatCurrency = (amount: number | string | undefined | null): string => {
  // Handle null, undefined, or invalid values
  if (amount == null || amount === undefined) {
    return '$0.00';
  }

  // Convert to number if it's a string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Check if the result is a valid number
  if (isNaN(numericAmount) || !isFinite(numericAmount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

export const formatDate = (date: string | Date): string => {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Parse manually to avoid timezone issues with YYYY-MM-DD format
    if (date.includes('-') && date.length === 10) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  return dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateLong = (date: string | Date): string => {
  let dateObj: Date;

  if (typeof date === 'string') {
    // Parse manually to avoid timezone issues with YYYY-MM-DD format
    if (date.includes('-') && date.length === 10) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }

  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  return dateObj.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getErrorMessage = (error: any): string => {
  if (!error) return 'Error desconocido';

  // Check if it's an axios error or similar
  if (error.response) {
    const { status } = error.response;
    const serverMessage = error.response.data?.message;

    switch (status) {
      case 400:
        // Para errores de validación, usar el mensaje del servidor si es útil
        if (serverMessage && (
          serverMessage.includes('Credenciales') ||
          serverMessage.includes('inválidas') ||
          serverMessage.includes('incorrect') ||
          serverMessage.includes('Email') ||
          serverMessage.includes('Username')
        )) {
          return serverMessage;
        }
        return 'Datos inválidos. Revisa la información e intenta nuevamente.';
      case 401:
        if (serverMessage && serverMessage.includes('Credenciales')) {
          return 'Email/usuario o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';
        }
        return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El recurso solicitado no fue encontrado.';
      case 422:
        return 'Los datos enviados no son válidos. Revisa la información e intenta nuevamente.';
      case 429:
        return 'Demasiadas solicitudes. Espera un momento e intenta nuevamente.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'El servidor no está disponible. Intenta nuevamente en unos minutos.';
      default:
        return serverMessage || `Error ${status}. Intenta nuevamente.`;
    }
  }

  // Check if it's a network error
  if (error.request) {
    return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
  }

  // Check for specific error messages
  if (error.message) {
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'Error de conexión. Verifica tu red y el estado del servidor.';
    }
    if (error.message.includes('timeout')) {
      return 'La conexión tardó demasiado. Verifica tu conexión e intenta nuevamente.';
    }
    if (error.message.includes('Credenciales inválidas')) {
      return 'Email/usuario o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';
    }
    return error.message;
  }

  return 'Ocurrió un error inesperado. Intenta nuevamente.';
};