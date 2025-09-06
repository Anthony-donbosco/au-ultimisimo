import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithCredential, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { authService } from './authService';

interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
  given_name?: string;
  family_name?: string;
}

interface GoogleAuthResponse {
  success: boolean;
  user?: GoogleUser;
  token?: string;
  message?: string;
}

class GoogleAuthService {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Google Sign-In with Firebase
   */
  private async initialize(): Promise<void> {
    try {
      // Configure Google Sign-In
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '439489101000-pcqeneihre89f12uvrs0dphc4jghjcpu.apps.googleusercontent.com';
      console.log('🔧 Configurando Google Sign-In con Web Client ID:', webClientId);
      
      GoogleSignin.configure({
        webClientId: webClientId,
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
        accountName: '',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        googleServicePlistPath: '',
      });
      
      console.log('✅ Google Sign-In configurado correctamente');

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Google Sign-In:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Initialize Google Sign-In with proper configuration
   */
  async initializeGoogleSignIn(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if Google Play Services are available
      const hasPlayServices = await GoogleSignin.hasPlayServices({ 
        showPlayServicesUpdateDialog: true 
      });
      
      return hasPlayServices && this.isInitialized;
    } catch (error) {
      console.error('Error checking Google Play Services:', error);
      return false;
    }
  }

  /**
   * Sign in with Google using Firebase
   */
  async signInWithGoogle(): Promise<GoogleAuthResponse> {
    try {
      // Check if Google Sign-In is properly configured
      const isConfigured = await this.initializeGoogleSignIn();
      if (!isConfigured) {
        return {
          success: false,
          message: 'Google Sign-In no está disponible. Verifica que Google Play Services esté instalado.',
        };
      }

      console.log('🚀 Starting Google Sign-In...');
      
      // Check if user is already signed in and sign out if needed
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        // Ignore error if user is not signed in
        console.log('No previous Google sign-in to clear');
      }

      // Start sign-in process
      const userInfo = await GoogleSignin.signIn();
      
      console.log('✅ Google Sign-In successful, user info:', userInfo);

      // Handle different response structures
      const userData = userInfo.data?.user || userInfo.user;
      const idToken = userInfo.data?.idToken || userInfo.idToken;
      const serverAuthCode = userInfo.data?.serverAuthCode || userInfo.serverAuthCode;

      if (!userData) {
        console.error('❌ No user data found in response:', userInfo);
        return {
          success: false,
          message: 'No se pudo obtener la información del usuario de Google',
        };
      }

      console.log('✅ User data extracted:', userData);

      // Get Google credential
      const googleCredential = GoogleAuthProvider.credential(
        idToken,
        serverAuthCode
      );

      console.log('🔐 Signing in with Firebase...');

      // Sign in with Firebase
      const firebaseUserCredential = await signInWithCredential(auth, googleCredential);
      const firebaseUser = firebaseUserCredential.user;

      console.log('✅ Firebase sign-in successful');

      // Get Firebase ID token
      const firebaseToken = await firebaseUser.getIdToken();

      // Prepare user data for backend
      const googleUser: GoogleUser = {
        id: userData.id,
        name: userData.name || '',
        email: userData.email,
        picture: userData.photo || '',
        given_name: userData.givenName,
        family_name: userData.familyName,
      };

      console.log('🔐 Authenticating with backend...');
      
      // Authenticate with backend using Firebase token
      const backendResponse = await this.authenticateWithBackend(googleUser, firebaseToken);

      if (backendResponse.success) {
        // Store tokens
        await this.storeTokens(backendResponse.token!, firebaseToken);
        
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
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      // Handle specific Google Sign-In errors
      if (error.code === 'SIGN_IN_CANCELLED') {
        return {
          success: false,
          message: 'Inicio de sesión cancelado',
        };
      } else if (error.code === 'IN_PROGRESS') {
        return {
          success: false,
          message: 'Inicio de sesión en progreso. Espera a que termine.',
        };
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        return {
          success: false,
          message: 'Google Play Services no está disponible en este dispositivo',
        };
      }
      
      return {
        success: false,
        message: error.message || 'Error interno durante el inicio de sesión con Google',
      };
    }
  }

  /**
   * Authenticate with backend using Google user data and Firebase token
   */
  private async authenticateWithBackend(googleUser: GoogleUser, firebaseToken: string): Promise<{
    success: boolean;
    token?: string;
    message?: string;
    user?: any;
  }> {
    try {
      // Call backend Google auth endpoint with Firebase token
      const response = await authService.authenticateWithGoogle({
        google_id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        first_name: googleUser.given_name,
        last_name: googleUser.family_name,
        firebase_token: firebaseToken, // Send Firebase token instead of Google token
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
  private async storeTokens(token: string, firebaseToken: string): Promise<void> {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('firebase_token', firebaseToken);
      await AsyncStorage.setItem('auth_method', 'google');
    } catch (error) {
      console.error('Error storing Google auth tokens:', error);
    }
  }

  /**
   * Sign out from Google and Firebase
   */
  async signOut(): Promise<boolean> {
    try {
      // Sign out from Google
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        console.log('No Google session to sign out from');
      }

      // Sign out from Firebase
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      
      // Clear stored tokens
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('firebase_token');
      await AsyncStorage.removeItem('auth_method');

      return true;
    } catch (error) {
      console.error('Error during Google sign out:', error);
      return false;
    }
  }

  /**
   * Check if Google Sign-In is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      return await GoogleSignin.hasPlayServices();
    } catch (error) {
      console.error('Error checking Google Sign-In availability:', error);
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      if (userInfo?.user) {
        return {
          id: userInfo.user.id,
          name: userInfo.user.name || '',
          email: userInfo.user.email,
          picture: userInfo.user.photo || '',
          given_name: userInfo.user.givenName,
          family_name: userInfo.user.familyName,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;