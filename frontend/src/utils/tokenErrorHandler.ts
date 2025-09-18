import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

export interface TokenError {
  type: 'expired' | 'invalid' | 'missing';
  message: string;
  redirectToLogin?: boolean;
}

export class TokenErrorHandler {
  private static authContext: any = null;

  static setAuthContext(context: any) {
    this.authContext = context;
  }

  static isTokenError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString();
    return (
      errorMessage.includes('Token no disponible') ||
      errorMessage.includes('Token expirado') ||
      errorMessage.includes('Token inválido') ||
      errorMessage.includes('Sesión expirada') ||
      errorMessage.includes('expirado')
    );
  }

  static categorizeTokenError(error: any): TokenError {
    const errorMessage = error.message || error.toString();

    if (errorMessage.includes('Token no disponible')) {
      return {
        type: 'missing',
        message: 'Sesión no disponible',
        redirectToLogin: true
      };
    }

    if (errorMessage.includes('Token expirado') || errorMessage.includes('expirado')) {
      return {
        type: 'expired',
        message: 'Tu sesión ha expirado',
        redirectToLogin: true
      };
    }

    if (errorMessage.includes('Token inválido')) {
      return {
        type: 'invalid',
        message: 'Sesión inválida',
        redirectToLogin: true
      };
    }

    return {
      type: 'invalid',
      message: 'Error de autenticación',
      redirectToLogin: true
    };
  }

  static async handleTokenError(error: any, context?: { showError?: (message: string) => void; handleLogout?: () => void }): Promise<void> {
    if (!this.isTokenError(error)) {
      return;
    }

    const tokenError = this.categorizeTokenError(error);

    console.log(`🔐 Error de token detectado: ${tokenError.type} - ${tokenError.message}`);

    // Mostrar mensaje al usuario si se proporciona contexto
    if (context?.showError) {
      context.showError(`${tokenError.message}. Redirigiendo al login...`);
    }

    // Redirigir al login si es necesario
    if (tokenError.redirectToLogin) {
      setTimeout(async () => {
        console.log('🚪 Redirigiendo al login por error de token...');
        if (context?.handleLogout) {
          await context.handleLogout();
        } else if (this.authContext?.logout) {
          await this.authContext.logout();
        }
      }, 2000);
    }
  }

  static getTokenErrorMessage(error: any): string {
    if (!this.isTokenError(error)) {
      return error.message || 'Error desconocido';
    }

    const tokenError = this.categorizeTokenError(error);
    return tokenError.message;
  }
}

// Hook para usar el TokenErrorHandler en componentes
export const useTokenErrorHandler = () => {
  const authContext = useContext(AuthContext);

  // Configurar el contexto de auth en el handler
  if (authContext && !TokenErrorHandler['authContext']) {
    TokenErrorHandler.setAuthContext(authContext);
  }

  return {
    handleTokenError: (error: any, showError?: (message: string) => void, handleLogout?: () => void) =>
      TokenErrorHandler.handleTokenError(error, { showError, handleLogout }),
    isTokenError: TokenErrorHandler.isTokenError,
    getTokenErrorMessage: TokenErrorHandler.getTokenErrorMessage
  };
};