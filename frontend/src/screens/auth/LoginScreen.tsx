import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import Login from '../../components/auth/Login';
import { AuthButton } from '../../components/auth/AuthButton';
import { CredencialesLogin, Usuario, LoginScreenProps } from '@/types';

const { width, height } = Dimensions.get('window');

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, onLogin }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (credenciales: CredencialesLogin) => {
    try {
      setCargando(true);
      
      // Aquí iría la llamada real a la API
      // const respuesta = await servicioAuth.iniciarSesion(credenciales);
      
      // Simulación de autenticación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular respuesta exitosa
      const usuarioSimulado: Usuario = {
        id: '1',
        nombre: 'Usuario Prueba',
        email: credenciales.email,
        tipoUsuario: 'usuario',
        tipo_usuario: 4 // Default usuario normal
      };
      
      // Guardar en AsyncStorage
      await AsyncStorage.setItem('token', 'fake-jwt-token');
      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioSimulado));
      
      onLogin(usuarioSimulado);
      
    } catch (error) {
      Alert.alert(
        t('auth.login.authError'),
        t('auth.login.invalidCredentials')
      );
    } finally {
      setCargando(false);
    }
  };

  const navegarARegistro = () => {
    navigation.navigate('Register');
  };

  const manejarLoginGoogle = () => {
    Alert.alert('Google Sign-In', t('common.functionalityInDevelopment', 'Funcionalidad en desarrollo'));
  };

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Imagen de fondo/header */}
          <View style={styles.headerSection}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80'
              }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>{t('auth.brand.name')}</Text>
              <Text style={styles.subtitle}>{t('auth.brand.tagline')}</Text>
            </View>
          </View>

          {/* Formulario de login */}
          <View style={[styles.formSection, themeStyles.formSection]}>
            <Text style={[styles.welcomeTitle, themeStyles.text]}>
              {t('auth.login.title')}
            </Text>
            <Text style={[styles.welcomeSubtitle, themeStyles.secondaryText]}>
              {t('auth.login.subtitle')}
            </Text>

            <Login 
              onSubmit={manejarLogin}
              loading={cargando}
              isDarkMode={isDarkMode}
            />

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, themeStyles.dividerLine]} />
              <Text style={[styles.dividerText, themeStyles.secondaryText]}>
                {t('auth.login.orSignInWith')}
              </Text>
              <View style={[styles.dividerLine, themeStyles.dividerLine]} />
            </View>

            {/* Google Sign-In */}
            <AuthButton
              title={t('auth.login.googleSignIn')}
              onPress={manejarLoginGoogle}
              variant="google"
              icon="logo-google"
              disabled={cargando}
            />

            {/* Link a registro */}
            <View style={styles.registerSection}>
              <Text style={[styles.registerText, themeStyles.secondaryText]}>
                {t('auth.login.noAccount')}{' '}
              </Text>
              <AuthButton
                title={t('auth.login.createAccount')}
                onPress={navegarARegistro}
                variant="link"
                disabled={cargando}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerSection: {
    height: height * 0.4,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  logoContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
  },
  registerText: {
    fontSize: 14,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  formSection: {
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  text: {
    color: '#1e293b',
  },
  secondaryText: {
    color: '#64748b',
  },
  dividerLine: {
    backgroundColor: '#e2e8f0',
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
  },
  formSection: {
    backgroundColor: '#1e293b',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  text: {
    color: '#f1f5f9',
  },
  secondaryText: {
    color: '#94a3b8',
  },
  dividerLine: {
    backgroundColor: '#334155',
  },
});

export default LoginScreen;