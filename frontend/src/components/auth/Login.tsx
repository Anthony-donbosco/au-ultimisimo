import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import authService, { LoginCredentials } from '../../services/authService';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  isDarkMode?: boolean;
  onSwitchToRegister?: () => void;
}

const Login: React.FC<LoginProps> = ({ 
  onLoginSuccess, 
  isDarkMode = false, 
  onSwitchToRegister 
}) => {
  const { t } = useTranslation();
  const [login, setLogin] = useState(''); // Puede ser email o username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{login?: string; password?: string}>({});

  // Limpiar errores cuando el usuario empiece a escribir
  const clearError = (field: 'login' | 'password') => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validaciones del frontend
  const validateForm = (): boolean => {
    const newErrors: {login?: string; password?: string} = {};

    // Validar campo de login (email o username)
    if (!login.trim()) {
      newErrors.login = t('auth.validation.loginRequired') || 'Email o usuario requerido';
    } else if (login.trim().length < 3) {
      newErrors.login = t('auth.validation.loginTooShort') || 'Mínimo 3 caracteres';
    }

    // Validar contraseña
    if (!password) {
      newErrors.password = t('auth.validation.passwordRequired') || 'Contraseña requerida';
    } else if (password.length < 6) {
      newErrors.password = t('auth.validation.passwordMinLength') || 'Mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    // Validar formulario
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const credentials: LoginCredentials = {
        login: login.trim(),
        password: password,
      };

      console.log('🔐 Intentando login con:', { login: credentials.login });

      const result = await authService.login(credentials);

      if (result.success && result.user) {
        console.log('✅ Login exitoso');
        onLoginSuccess(result.user);
      } else {
        console.log('⚠️ Login fallido:', result.message);
        Alert.alert(
          t('common.error') || 'Error',
          result.message || t('auth.login.error') || 'Credenciales incorrectas'
        );
      }
    } catch (error: any) {
      console.error('💥 Error en login:', error);
      Alert.alert(
        t('common.error') || 'Error',
        error.message || t('common.connectionError') || 'Error de conexión. Verifica que el servidor esté funcionando.'
      );
    } finally {
      setLoading(false);
    }
  };

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        {/* Campo de Login (Email o Username) */}
        <AuthInput
          label={t('auth.login.emailOrUsername') || 'Email o Usuario'}
          value={login}
          onChangeText={(text) => {
            setLogin(text);
            clearError('login');
          }}
          placeholder={t('auth.login.emailOrUsernamePlaceholder') || 'Ingresa tu email o nombre de usuario'}
          icon="person"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          isDarkMode={isDarkMode}
          error={errors.login}
          editable={!loading}
        />

        {/* Campo de Contraseña */}
        <AuthInput
          label={t('auth.login.password') || 'Contraseña'}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            clearError('password');
          }}
          placeholder={t('auth.login.passwordPlaceholder') || 'Ingresa tu contraseña'}
          icon="lock-closed"
          isPassword={true}
          isDarkMode={isDarkMode}
          error={errors.password}
          editable={!loading}
        />

        {/* Botón de Olvidé mi contraseña */}
        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={() => Alert.alert(
            t('auth.login.forgotPassword') || 'Olvidé mi contraseña',
            t('auth.login.forgotPasswordMessage') || 'Esta funcionalidad estará disponible pronto.'
          )}
          disabled={loading}
        >
          <Text style={[styles.forgotPasswordText, themeStyles.linkText]}>
            {t('auth.login.forgotPassword') || '¿Olvidaste tu contraseña?'}
          </Text>
        </TouchableOpacity>

        {/* Botón de Iniciar Sesión */}
        <AuthButton
          title={loading ? 
            t('auth.login.signingIn') || 'Iniciando sesión...' : 
            t('auth.login.signInButton') || 'Iniciar Sesión'
          }
          onPress={handleSubmit}
          loading={loading}
          variant="primary"
          size="large"
          isDarkMode={isDarkMode}
          disabled={loading || !login.trim() || !password}
        />

        {/* Enlace para cambiar a registro */}
        {onSwitchToRegister && (
          <View style={styles.switchContainer}>
            <Text style={[styles.switchText, themeStyles.text]}>
              {t('auth.login.noAccount') || '¿No tienes cuenta?'}{' '}
            </Text>
            <TouchableOpacity onPress={onSwitchToRegister} disabled={loading}>
              <Text style={[styles.switchLink, themeStyles.linkText]}>
                {t('auth.login.signUpLink') || 'Regístrate aquí'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Indicador de carga adicional */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={[styles.loadingText, themeStyles.secondaryText]}>
              {t('auth.login.authenticating') || 'Autenticando...'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    gap: 20,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
});

const lightStyles = StyleSheet.create({
  text: {
    color: '#1e293b',
  },
  secondaryText: {
    color: '#64748b',
  },
  linkText: {
    color: '#f59e0b',
  },
});

const darkStyles = StyleSheet.create({
  text: {
    color: '#f1f5f9',
  },
  secondaryText: {
    color: '#94a3b8',
  },
  linkText: {
    color: '#f59e0b',
  },
});

export default Login;