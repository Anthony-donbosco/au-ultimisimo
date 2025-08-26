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
import { RegistroProps, DatosRegistro } from '../../types';

const Registro: React.FC<RegistroProps> = ({ onSubmit, loading, isDarkMode }) => {
  const { t } = useTranslation();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  const manejarEnvio = () => {
    if (!nombre.trim() || !email.trim() || !contrasena.trim() || !confirmarContrasena.trim()) {
      Alert.alert(t('common.error'), t('auth.validation.fillAllFields'));
      return;
    }

    if (!email.includes('@')) {
      Alert.alert(t('common.error'), t('auth.validation.invalidEmail'));
      return;
    }

    if (contrasena !== confirmarContrasena) {
      Alert.alert(t('common.error'), t('auth.validation.passwordMismatch'));
      return;
    }

    if (contrasena.length < 6) {
      Alert.alert(t('common.error'), t('auth.validation.passwordMinLength'));
      return;
    }

    const datosRegistro: DatosRegistro = {
      nombre: nombre.trim(),
      email: email.trim(),
      contrasena,
      confirmarContrasena,
      tipoUsuario: 'usuario',
    };

    onSubmit(datosRegistro);
  };

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, themeStyles.label]}>{t('auth.register.fullName')}</Text>
        <TextInput
          style={[styles.input, themeStyles.input]}
          placeholder={t('auth.register.fullNamePlaceholder')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#64748b'}
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, themeStyles.label]}>{t('auth.register.email')}</Text>
        <TextInput
          style={[styles.input, themeStyles.input]}
          placeholder={t('auth.register.emailPlaceholder')}
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
        <Text style={[styles.label, themeStyles.label]}>{t('auth.register.password')}</Text>
        <View style={[styles.passwordContainer, themeStyles.input]}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('auth.register.passwordPlaceholder')}
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

      <View style={styles.inputContainer}>
        <Text style={[styles.label, themeStyles.label]}>{t('auth.register.confirmPassword')}</Text>
        <View style={[styles.passwordContainer, themeStyles.input]}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('auth.register.confirmPasswordPlaceholder')}
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#64748b'}
            value={confirmarContrasena}
            onChangeText={setConfirmarContrasena}
            secureTextEntry={!mostrarConfirmarContrasena}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
            disabled={loading}
          >
            <Text style={[styles.toggleText, themeStyles.toggleText]}>
              {mostrarConfirmarContrasena ? t('common.hide', 'Ocultar') : t('common.show', 'Mostrar')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.passwordRequirements}>
        <Text style={[styles.requirementText, themeStyles.secondaryText]}>
          • {t('validation.minLength', { min: 6 })}
        </Text>
        <Text style={[styles.requirementText, themeStyles.secondaryText]}>
          • {t('validation.passwordMismatch')} ({t('common.confirmation', 'confirmación')})
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          loading && styles.submitButtonDisabled,
        ]}
        onPress={manejarEnvio}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? t('auth.register.creatingAccount') : t('auth.register.createAccountButton')}
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
    color: 'inherit',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  passwordRequirements: {
    marginBottom: 24,
  },
  requirementText: {
    fontSize: 12,
    marginBottom: 4,
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
  secondaryText: {
    color: '#64748b',
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
  secondaryText: {
    color: '#94a3b8',
  },
});

export default Registro;