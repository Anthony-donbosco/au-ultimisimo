import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './authService';

interface GoogleUser {
  id: string;
  name: string;
  email: string;
  photo: string;
  givenName?: string;
  familyName?: string;
}

interface GoogleAuthResponse {
  success: boolean;
  user?: GoogleUser;
  token?: string;
  message?: string;
}

class NativeGoogleAuthService {
  private isConfigured: boolean = false;

  constructor() {
    this.initializeGoogleSignIn();
  }

  /**
   * Initialize Google Sign-In with native configuration
   */
  async initializeGoogleSignIn(): Promise<boolean> {
    try {
      if (this.isConfigured) {
        return true;
      }

      // Get Client ID from environment
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
      
      if (!clientId || clientId === 'your-google-client-id') {
        console.warn('Google Client ID not configured');
        return false;
      }

      // Configure Google Sign-In
      await GoogleSignin.configure({
        webClientId: clientId, // From Google Cloud Console
        offlineAccess: true,
        hostedDomain: '', // Specify a hosted domain if required
        forceCodeForRefreshToken: true,
      });

      this.isConfigured = true;
      console.log('✅ Native Google Sign-In configured successfully');
      return true;

    } catch (error) {
      console.error('❌ Error configuring Google Sign-In:', error);
      return false;
    }
  }

  /**
   * Sign in with Google using native implementation
   */
  async signInWithGoogle(): Promise<GoogleAuthResponse> {
    try {
      // Ensure Google Sign-In is configured
      const isConfigured = await this.initializeGoogleSignIn();
      if (!isConfigured) {
        return {
          success: false,
          message: 'Google Sign-In no está configurado correctamente',
        };
      }

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Get user info from Google
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.data?.user) {
        const googleUser: GoogleUser = {
          id: userInfo.data.user.id,
          name: userInfo.data.user.name || '',
          email: userInfo.data.user.email,
          photo: userInfo.data.user.photo || '',
          givenName: userInfo.data.user.givenName,
          familyName: userInfo.data.user.familyName,
        };

        // Get access token
        const tokens = await GoogleSignin.getTokens();
        
        // Store Google token
        await AsyncStorage.setItem('google_token', tokens.accessToken);
        
        // Authenticate with backend
        const backendResponse = await this.authenticateWithBackend(googleUser, tokens.accessToken);
        
        if (backendResponse.success) {
          // Store authentication tokens
          await this.storeTokens(backendResponse.token!);
          
          return {
            success: true,
            user: googleUser,
            token: backendResponse.token,
          };
        } else {
          return {
            success: false,
            message: backendResponse.message || 'Error autenticando con el servidor',
          };
        }
      }

      return {
        success: false,
        message: 'No se pudo obtener información del usuario',
      };

    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      // Handle specific error cases
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {
          success: false,
          message: 'Inicio de sesión cancelado',
        };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          message: 'Inicio de sesión en progreso...',
        };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          message: 'Google Play Services no disponible',
        };
      } else {
        return {
          success: false,
          message: error.message || 'Error durante el inicio de sesión con Google',
        };
      }
    }
  }

  /**
   * Authenticate with backend using Google user data
   */
  private async authenticateWithBackend(googleUser: GoogleUser, googleToken: string): Promise<{
    success: boolean;
    token?: string;
    message?: string;
    user?: any;
  }> {
    try {
      // Call backend Google auth endpoint
      const response = await authService.authenticateWithGoogle({
        google_id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.photo,
        first_name: googleUser.givenName,
        last_name: googleUser.familyName,
        google_token: googleToken,
      });

      return response;
    } catch (error: any) {
      console.error('Backend Google auth error:', error);
      return {
        success: false,
        message: error.message || 'Error comunicándose con el servidor',
      };
    }
  }

  /**
   * Store authentication tokens
   */
  private async storeTokens(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('auth_method', 'google');
    } catch (error) {
      console.error('Error storing Google auth tokens:', error);
    }
  }

  /**
   * Sign out from Google
   */
  async signOut(): Promise<boolean> {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      
      // Clear stored tokens
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('auth_method');
      await AsyncStorage.removeItem('google_token');

      console.log('✅ Signed out from Google successfully');
      return true;
    } catch (error) {
      console.error('Error during Google sign out:', error);
      return false;
    }
  }

  /**
   * Check if user is signed in
   */
  async isSignedIn(): Promise<boolean> {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('Error checking sign-in status:', error);
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      const userInfo = await GoogleSignin.signInSilently();
      if (userInfo.data?.user) {
        return {
          id: userInfo.data.user.id,
          name: userInfo.data.user.name || '',
          email: userInfo.data.user.email,
          photo: userInfo.data.user.photo || '',
          givenName: userInfo.data.user.givenName,
          familyName: userInfo.data.user.familyName,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if Google Sign-In is available and configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const googleAuthService = new NativeGoogleAuthService();
export default googleAuthService;