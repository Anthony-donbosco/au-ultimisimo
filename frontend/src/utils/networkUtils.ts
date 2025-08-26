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

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  return dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateLong = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  return dateObj.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};