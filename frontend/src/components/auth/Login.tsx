import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoginProps, CredencialesLogin } from '../../types';

const Login: React.FC<LoginProps> = ({ onSubmit, loading, isDarkMode }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const manejarEnvio = () => {
    if (!email.trim() || !contrasena.trim()) {
      Alert.alert(t('common.error'), t('auth.validation.fillAllFields'));
      return;
    }

    if (!email.includes('@')) {
      Alert.alert(t('common.error'), t('auth.validation.invalidEmail'));
      return;
    }

    const credenciales: CredencialesLogin = {
      email: email.trim(),
      contrasena,
    };

    onSubmit(credenciales);
  };

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, themeStyles.label]}>{t('auth.login.email')}</Text>
        <TextInput
          style={[styles.input, themeStyles.input]}
          placeholder={t('auth.login.emailPlaceholder')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#64748b'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, themeStyles.label]}>{t('auth.login.password')}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, themeStyles.input]}
            placeholder={t('auth.login.passwordPlaceholder')}
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#64748b'}
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry={!mostrarContrasena}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setMostrarContrasena(!mostrarContrasena)}
            disabled={loading}
          >
            <Text style={[styles.toggleText, themeStyles.toggleText]}>
              {mostrarContrasena ? t('common.hide', 'Ocultar') : t('common.show', 'Mostrar')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={() => Alert.alert(t('auth.login.forgotPassword'), t('common.functionalityInDevelopment', 'Funcionalidad en desarrollo'))}
        disabled={loading}
      >
        <Text style={[styles.forgotPasswordText, themeStyles.linkText]}>
          {t('auth.login.forgotPassword')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.submitButton,
          loading && styles.submitButtonDisabled,
        ]}
        onPress={manejarEnvio}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? t('auth.login.signingIn') : t('auth.login.signInButton')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 0,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const lightStyles = StyleSheet.create({
  label: {
    color: '#1e293b',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    color: '#1e293b',
  },
  toggleText: {
    color: '#f59e0b',
  },
  linkText: {
    color: '#f59e0b',
  },
});

const darkStyles = StyleSheet.create({
  label: {
    color: '#f1f5f9',
  },
  input: {
    backgroundColor: '#334155',
    borderColor: '#475569',
    color: '#f1f5f9',
  },
  toggleText: {
    color: '#f59e0b',
  },
  linkText: {
    color: '#f59e0b',
  },
});

export default Login;