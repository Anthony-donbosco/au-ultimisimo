import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './authService';

// Complete the auth session setup for Expo
WebBrowser.maybeCompleteAuthSession();

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
  private clientId: string;
  private discovery: AuthSession.DiscoveryDocument;

  constructor() {
    // Get Google Client ID from environment or use placeholder
    this.clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id';
    
    // Google OAuth2 endpoints
    this.discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };
  }

  /**
   * Initialize Google Sign-In with proper configuration
   */
  async initializeGoogleSignIn(): Promise<boolean> {
    try {
      // Check if client ID is configured
      if (!this.clientId || this.clientId === 'your-google-client-id') {
        console.warn('Google Client ID not configured');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing Google Sign-In:', error);
      return false;
    }
  }

  /**
   * Sign in with Google using Expo AuthSession
   */
  async signInWithGoogle(): Promise<GoogleAuthResponse> {
    try {
      // Check if Google Sign-In is properly configured
      const isConfigured = await this.initializeGoogleSignIn();
      if (!isConfigured) {
        return {
          success: false,
          message: 'Google Sign-In no está configurado. Contacta al administrador.',
        };
      }

      // Generate code verifier for PKCE without expo-crypto
      const codeVerifier = this.generateCodeVerifier();
      
      // Create code challenge using native crypto
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      // Back to working redirect URI
      const finalRedirectUri = 'https://auth.expo.io/@thealexos/aureum-mobile';

      console.log('Using redirect URI:', finalRedirectUri); // For debugging

      // Create the request
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri: finalRedirectUri,
        codeChallenge: codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
        additionalParameters: {
          access_type: 'offline',
          prompt: 'select_account', // Force account selection
        },
      });

      // Prompt for authentication with explicit URL
      console.log('🚀 Prompting for Google auth...');
      const result = await request.promptAsync(this.discovery, {
        useProxy: true,
        showInRecents: false,
      });
      
      console.log('📱 Auth result type:', result.type);
      console.log('📱 Auth result:', JSON.stringify(result, null, 2));

      if (result.type === 'success') {
        console.log('✅ Got auth code, exchanging for tokens...');
        
        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync({
          clientId: this.clientId,
          code: result.params.code,
          redirectUri: finalRedirectUri,
          codeVerifier: codeVerifier,
        }, this.discovery);
        
        console.log('🔐 Token exchange result:', tokenResult);

        if (tokenResult.accessToken) {
          console.log('✅ Got access token from Google');
          
          // Store Google token for later use
          await AsyncStorage.setItem('google_token', tokenResult.accessToken);
          
          // Get user info from Google
          console.log('🔍 Getting user info from Google...');
          const userInfo = await this.getGoogleUserInfo(tokenResult.accessToken);
          
          if (userInfo) {
            console.log('✅ Got user info:', userInfo);
            
            // Try to authenticate with backend using Google data
            console.log('🔐 Authenticating with backend...');
            const backendResponse = await this.authenticateWithBackend(userInfo, tokenResult.accessToken);
            
            if (backendResponse.success) {
              // Store tokens
              await this.storeTokens(backendResponse.token!);
              
              return {
                success: true,
                user: userInfo,
                token: backendResponse.token,
              };
            } else {
              // Backend authentication failed
              return {
                success: false,
                message: backendResponse.message || 'Error autenticando con el servidor',
              };
            }
          }
        }
      } else if (result.type === 'cancel') {
        return {
          success: false,
          message: 'Inicio de sesión cancelado',
        };
      } else if (result.type === 'dismiss') {
        console.log('⚠️ Auth was dismissed - this might be normal flow');
        // Check if we have the code in params despite dismiss
        if (result.params && result.params.code) {
          console.log('✅ Found auth code in dismissed result, continuing...');
          // Treat as success and continue with token exchange
          const tokenResult = await AuthSession.exchangeCodeAsync({
            clientId: this.clientId,
            code: result.params.code,
            redirectUri: finalRedirectUri,
            codeVerifier: codeVerifier,
          }, this.discovery);
          
          console.log('🔐 Token exchange result from dismiss:', tokenResult);
          
          if (tokenResult.accessToken) {
            console.log('✅ Got access token from dismissed auth');
            
            // Store Google token for later use
            await AsyncStorage.setItem('google_token', tokenResult.accessToken);
            
            // Get user info from Google
            console.log('🔍 Getting user info from Google...');
            const userInfo = await this.getGoogleUserInfo(tokenResult.accessToken);
            
            if (userInfo) {
              console.log('✅ Got user info:', userInfo);
              
              // Try to authenticate with backend using Google data
              console.log('🔐 Authenticating with backend...');
              const backendResponse = await this.authenticateWithBackend(userInfo, tokenResult.accessToken);
              
              if (backendResponse.success) {
                // Store tokens
                await this.storeTokens(backendResponse.token!);
                
                return {
                  success: true,
                  user: userInfo,
                  token: backendResponse.token,
                };
              } else {
                return {
                  success: false,
                  message: backendResponse.message || 'Error autenticando con el servidor',
                };
              }
            }
          }
        }
        
        return {
          success: false,
          message: 'La autenticación fue cerrada sin completarse',
        };
      } else if (result.type === 'error') {
        console.error('OAuth error:', result.error);
        return {
          success: false,
          message: `Error de OAuth: ${result.error?.message || 'Error desconocido'}`,
        };
      }

      return {
        success: false,
        message: 'Error en el proceso de autenticación con Google',
      };
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      // More specific error handling
      if (error.message?.includes('redirect_uri_mismatch')) {
        return {
          success: false,
          message: 'Error de configuración: URI de redirección no válido. Contacta al administrador.',
        };
      }
      
      return {
        success: false,
        message: error.message || 'Error interno durante el inicio de sesión con Google',
      };
    }
  }

  /**
   * Get user information from Google API
   */
  private async getGoogleUserInfo(accessToken: string): Promise<GoogleUser | null> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userInfo: GoogleUser = await response.json();
        return userInfo;
      } else {
        console.error('Failed to fetch user info from Google:', await response.text());
        return null;
      }
    } catch (error) {
      console.error('Error fetching Google user info:', error);
      return null;
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
        picture: googleUser.picture,
        first_name: googleUser.given_name,
        last_name: googleUser.family_name,
        firebase_token: googleToken,
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
      // Get Google token before clearing storage
      const googleToken = await AsyncStorage.getItem('google_token');
      
      // Clear stored tokens
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('isAuthenticated');
      await AsyncStorage.removeItem('auth_method');
      await AsyncStorage.removeItem('google_token');
      
      // Revoke Google token if available
      if (googleToken) {
        try {
          const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${googleToken}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
          
          if (!response.ok) {
            console.warn('Failed to revoke Google token:', await response.text());
          }
        } catch (error) {
          console.warn('Error revoking Google token:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error during Google sign out:', error);
      return false;
    }
  }

  /**
   * Check if Google Sign-In is available
   */
  isAvailable(): boolean {
    return this.clientId !== 'your-google-client-id' && this.clientId.length > 0;
  }

  /**
   * Get the current redirect URI (useful for debugging)
   */
  getRedirectUri(): string {
    return AuthSession.makeRedirectUri({
      scheme: 'com.aureum.mobile',
      path: 'oauth'
    });
  }

  /**
   * Generate code verifier for PKCE without expo-crypto
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    // Use crypto.getRandomValues if available, otherwise fallback
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto.getRandomValues
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    
    // Convert to base64url
    return this.base64URLEscape(this.arrayBufferToBase64(array));
  }

  /**
   * Generate code challenge from verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Use Web Crypto API if available
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return this.base64URLEscape(this.arrayBufferToBase64(new Uint8Array(digest)));
    } else {
      // Fallback: use the verifier as is (less secure but works)
      return this.base64URLEscape(btoa(verifier));
    }
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = buffer;
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to base64url
   */
  private base64URLEscape(str: string): string {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;