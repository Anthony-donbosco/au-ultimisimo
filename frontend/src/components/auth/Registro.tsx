import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import authService, { RegisterData } from '../../services/authService';

interface RegistroProps {
  onRegisterSuccess: (user: any) => void;
  isDarkMode?: boolean;
  onSwitchToLogin?: () => void;
  navigation?: any; // Para navegar a verificación de email
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

const Registro: React.FC<RegistroProps> = ({ 
  onRegisterSuccess, 
  isDarkMode = false,
  onSwitchToLogin,
  navigation
}) => {
  const { t } = useTranslation();
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Limpiar errores cuando el usuario empiece a escribir
  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Actualizar campo del formulario
  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError(field as keyof FormErrors);
  };

  // Verificar disponibilidad de username (con debounce)
  useEffect(() => {
    if (formData.username.length >= 3) {
      const timeoutId = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const result = await authService.checkUsernameAvailability(formData.username);
          if (!result.available) {
            setErrors(prev => ({ ...prev, username: 'Este nombre de usuario no está disponible' }));
          }
        } catch (error) {
          console.warn('Error verificando username:', error);
        } finally {
          setCheckingUsername(false);
        }
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [formData.username]);

  // Verificar disponibilidad de email (con debounce)
  useEffect(() => {
    if (formData.email.includes('@') && formData.email.length >= 5) {
      const timeoutId = setTimeout(async () => {
        setCheckingEmail(true);
        try {
          const result = await authService.checkEmailAvailability(formData.email);
          if (!result.available) {
            setErrors(prev => ({ ...prev, email: 'Este email ya está registrado' }));
          }
        } catch (error) {
          console.warn('Error verificando email:', error);
        } finally {
          setCheckingEmail(false);
        }
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [formData.email]);

  // Validaciones del frontend
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validar username
    if (!formData.username.trim()) {
      newErrors.username = 'Nombre de usuario requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Mínimo 3 caracteres';
    } else if (formData.username.length > 50) {
      newErrors.username = 'Máximo 50 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Solo letras, números y guiones bajos';
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'Email requerido';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    } else if (formData.email.length > 100) {
      newErrors.email = 'Email demasiado largo';
    }

    // Validar contraseña
    if (!formData.password) {
      newErrors.password = 'Contraseña requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    } else if (formData.password.length > 128) {
      newErrors.password = 'Máximo 128 caracteres';
    } else if (!/[a-zA-Z]/.test(formData.password)) {
      newErrors.password = 'Debe contener al menos una letra';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Debe contener al menos un número';
    }

    // Validar confirmación de contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    // Validar nombres (opcionales)
    if (formData.firstName && formData.firstName.length > 50) {
      newErrors.firstName = 'Máximo 50 caracteres';
    }
    if (formData.lastName && formData.lastName.length > 50) {
      newErrors.lastName = 'Máximo 50 caracteres';
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

    // Verificar que no haya verificaciones pendientes
    if (checkingUsername || checkingEmail) {
      Alert.alert(
        'Verificando disponibilidad',
        'Por favor espera mientras verificamos la disponibilidad del usuario y email.'
      );
      return;
    }

    setLoading(true);

    try {
      // Preparar datos para el backend
      const registerData: RegisterData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        ...(formData.firstName.trim() && { first_name: formData.firstName.trim() }),
        ...(formData.lastName.trim() && { last_name: formData.lastName.trim() }),
      };

      console.log('📝 Intentando registro con:', { 
        username: registerData.username, 
        email: registerData.email 
      });

      const result = await authService.register(registerData);

      if (result.success) {
        console.log('✅ Código de verificación enviado');
        
        // Navegar a pantalla de verificación con los datos
        if (navigation) {
          navigation.navigate('EmailVerification', {
            email: registerData.email,
            username: registerData.username,
            firstName: registerData.first_name,
            lastName: registerData.last_name,
            password: registerData.password,
          });
        } else {
          // Fallback si no hay navegación
          Alert.alert(
            t('common.success') || 'Éxito',
            result.message || 'Código enviado a tu email. Verifica tu bandeja de entrada.',
          );
        }
      } else {
        console.log('❌ Error enviando código:', result.message);
        Alert.alert(
          t('common.error') || 'Error',
          result.message || 'Error al enviar código de verificación'
        );
      }
    } catch (error: any) {
      console.error('💥 Error en registro:', error);
      Alert.alert(
        t('common.error') || 'Error',
        error.message || 'Error de conexión. Verifica que el servidor esté funcionando.'
      );
    } finally {
      setLoading(false);
    }
  };

  const themeStyles = isDarkMode ? darkStyles : lightStyles;
  const isFormValid = formData.username.length >= 3 && 
                     formData.email.includes('@') && 
                     formData.password.length >= 8 && 
                     formData.password === formData.confirmPassword;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        {/* Campo Username */}
        <View style={styles.inputWrapper}>
          <AuthInput
            label="Nombre de Usuario *"
            value={formData.username}
            onChangeText={(text) => updateField('username', text)}
            placeholder="Ej: juan_perez123"
            icon="person"
            autoCapitalize="none"
            autoCorrect={false}
            isDarkMode={isDarkMode}
            error={errors.username}
            editable={!loading}
          />
          {checkingUsername && (
            <View style={styles.checkingIndicator}>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={[styles.checkingText, themeStyles.secondaryText]}>
                Verificando disponibilidad...
              </Text>
            </View>
          )}
        </View>

        {/* Campo Email */}
        <View style={styles.inputWrapper}>
          <AuthInput
            label="Email *"
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            placeholder="ejemplo@correo.com"
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            isDarkMode={isDarkMode}
            error={errors.email}
            editable={!loading}
          />
          {checkingEmail && (
            <View style={styles.checkingIndicator}>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={[styles.checkingText, themeStyles.secondaryText]}>
                Verificando disponibilidad...
              </Text>
            </View>
          )}
        </View>

        {/* Campo Nombre */}
        <AuthInput
          label="Nombre (Opcional)"
          value={formData.firstName}
          onChangeText={(text) => updateField('firstName', text)}
          placeholder="Tu nombre"
          icon="person-outline"
          autoCapitalize="words"
          isDarkMode={isDarkMode}
          error={errors.firstName}
          editable={!loading}
        />

        {/* Campo Apellido */}
        <AuthInput
          label="Apellido (Opcional)"
          value={formData.lastName}
          onChangeText={(text) => updateField('lastName', text)}
          placeholder="Tu apellido"
          icon="person-outline"
          autoCapitalize="words"
          isDarkMode={isDarkMode}
          error={errors.lastName}
          editable={!loading}
        />

        {/* Campo Contraseña */}
        <AuthInput
          label="Contraseña *"
          value={formData.password}
          onChangeText={(text) => updateField('password', text)}
          placeholder="Mínimo 8 caracteres"
          icon="lock-closed"
          isPassword={true}
          isDarkMode={isDarkMode}
          error={errors.password}
          editable={!loading}
        />

        {/* Campo Confirmar Contraseña */}
        <AuthInput
          label="Confirmar Contraseña *"
          value={formData.confirmPassword}
          onChangeText={(text) => updateField('confirmPassword', text)}
          placeholder="Repite tu contraseña"
          icon="lock-closed"
          isPassword={true}
          isDarkMode={isDarkMode}
          error={errors.confirmPassword}
          editable={!loading}
        />

        {/* Información de requisitos */}
        <View style={styles.requirementsContainer}>
          <Text style={[styles.requirementsTitle, themeStyles.text]}>
            Requisitos de la contraseña:
          </Text>
          <Text style={[styles.requirementText, themeStyles.secondaryText]}>
            • Mínimo 8 caracteres
          </Text>
          <Text style={[styles.requirementText, themeStyles.secondaryText]}>
            • Al menos una letra
          </Text>
          <Text style={[styles.requirementText, themeStyles.secondaryText]}>
            • Al menos un número
          </Text>
        </View>

        {/* Botón de Registro */}
        <AuthButton
          title={loading ? 'Enviando código...' : 'Enviar código de verificación'}
          onPress={handleSubmit}
          loading={loading}
          variant="primary"
          size="large"
          isDarkMode={isDarkMode}
          disabled={loading || !isFormValid || checkingUsername || checkingEmail}
        />

        {/* Enlace para cambiar a login */}
        {onSwitchToLogin && (
          <View style={styles.switchContainer}>
            <Text style={[styles.switchText, themeStyles.text]}>
              ¿Ya tienes cuenta?{' '}
            </Text>
            <TouchableOpacity onPress={onSwitchToLogin} disabled={loading}>
              <Text style={[styles.switchLink, themeStyles.linkText]}>
                Inicia sesión aquí
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Indicador de carga adicional */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={[styles.loadingText, themeStyles.secondaryText]}>
              Enviando código de verificación...
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    gap: 16,
    paddingBottom: 40,
  },
  inputWrapper: {
    gap: 8,
  },
  checkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  requirementsContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 12,
    marginBottom: 4,
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

export default Registro;