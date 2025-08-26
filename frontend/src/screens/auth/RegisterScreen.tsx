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
import Registro from '../../components/auth/Registro';
import { AuthButton } from '../../components/auth/AuthButton';
import { DatosRegistro, Usuario, RegisterScreenProps } from '@/types';

const { width, height } = Dimensions.get('window');

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, onRegister }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const [cargando, setCargando] = useState(false);

  const manejarRegistro = async (datosRegistro: DatosRegistro) => {
    try {
      setCargando(true);

      // Validaciones básicas
      if (datosRegistro.contrasena !== datosRegistro.confirmarContrasena) {
        Alert.alert(t('common.error'), t('auth.register.passwordsDoNotMatch'));
        return;
      }

      if (datosRegistro.contrasena.length < 6) {
        Alert.alert(t('common.error'), t('auth.register.passwordTooShort'));
        return;
      }

      // Aquí iría la llamada real a la API
      // const respuesta = await servicioAuth.registrar(datosRegistro);
      
      // Simulación de registro
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular respuesta exitosa
      const usuarioRegistrado: Usuario = {
        id: Date.now().toString(),
        nombre: datosRegistro.nombre,
        email: datosRegistro.email,
        tipoUsuario: datosRegistro.tipoUsuario || 'usuario',
        tipo_usuario: 4 // Default usuario normal
      };
      
      // Guardar en AsyncStorage
      await AsyncStorage.setItem('token', 'fake-jwt-token');
      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioRegistrado));
      
      Alert.alert(
        t('auth.register.registrationSuccess'),
        t('auth.register.accountCreated'),
        [
          {
            text: t('common.continue'),
            onPress: () => onRegister(usuarioRegistrado)
          }
        ]
      );
      
    } catch (error) {
      Alert.alert(
        t('auth.register.registrationError'),
        t('auth.register.accountCreationFailed')
      );
    } finally {
      setCargando(false);
    }
  };

  const navegarALogin = () => {
    navigation.navigate('Login');
  };

  const manejarRegistroGoogle = () => {
    Alert.alert('Google Sign-Up', t('common.functionalityInDevelopment', 'Funcionalidad en desarrollo'));
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
          {/* Header más pequeño para registro */}
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
            </View>
          </View>

          {/* Formulario de registro */}
          <View style={[styles.formSection, themeStyles.formSection]}>
            <Text style={[styles.welcomeTitle, themeStyles.text]}>
              {t('auth.register.title')}
            </Text>
            <Text style={[styles.welcomeSubtitle, themeStyles.secondaryText]}>
              {t('auth.register.subtitle')}
            </Text>

            <Registro 
              onSubmit={manejarRegistro}
              loading={cargando}
              isDarkMode={isDarkMode}
            />

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, themeStyles.dividerLine]} />
              <Text style={[styles.dividerText, themeStyles.secondaryText]}>
                {t('auth.register.orRegisterWith')}
              </Text>
              <View style={[styles.dividerLine, themeStyles.dividerLine]} />
            </View>

            {/* Google Sign-Up */}
            <AuthButton
              title={t('auth.login.googleSignIn')}
              onPress={manejarRegistroGoogle}
              variant="google"
              icon="logo-google"
              disabled={cargando}
            />

            {/* Link a login */}
            <View style={styles.loginSection}>
              <Text style={[styles.loginText, themeStyles.secondaryText]}>
                {t('auth.register.haveAccount')}{' '}
              </Text>
              <AuthButton
                title={t('auth.register.signIn')}
                onPress={navegarALogin}
                variant="link"
                disabled={cargando}
              />
            </View>

            {/* Términos y condiciones */}
            <View style={styles.termsSection}>
              <Text style={[styles.termsText, themeStyles.secondaryText]}>
                {t('auth.register.terms')}{' '}
              </Text>
              <AuthButton
                title={t('auth.register.termsAndConditions')}
                onPress={() => Alert.alert(t('auth.register.termsAndConditions'), t('auth.register.termsAndConditions'))}
                variant="link"
                size="small"
              />
              <Text style={[styles.termsText, themeStyles.secondaryText]}>
                {' '}{t('auth.register.and')}{' '}
              </Text>
              <AuthButton
                title={t('auth.register.privacyPolicy')}
                onPress={() => Alert.alert(t('auth.register.privacyPolicy'), t('auth.register.privacyPolicy'))}
                variant="link"
                size="small"
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
    height: height * 0.25, // Más pequeño que en login
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
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
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
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  loginText: {
    fontSize: 14,
  },
  termsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
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

export default RegisterScreen;