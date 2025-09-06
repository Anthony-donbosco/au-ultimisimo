import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { AuthButton } from '../../components/auth/AuthButton';
import { colors } from '../../styles/colors';

const { width, height } = Dimensions.get('window');

interface EmailVerificationScreenProps {
  route: {
    params: {
      email: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      password: string;
    };
  };
  navigation: any;
  onVerificationSuccess: (user: any) => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  route,
  navigation,
  onVerificationSuccess,
}) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { email, username, firstName, lastName, password } = route.params;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && !canResend) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, canResend]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Si pegan un código completo
      const pastedCode = value.slice(0, 6).split('');
      const newCode = [...code];
      
      pastedCode.forEach((digit, i) => {
        if (i < 6 && /^\d$/.test(digit)) {
          newCode[i] = digit;
        }
      });
      
      setCode(newCode);
      
      // Enfocar último input completado
      const lastFilledIndex = Math.min(pastedCode.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    // Input normal de un dígito
    if (/^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Auto-focus al siguiente input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Por favor ingresa el código de 6 dígitos completo');
      return;
    }

    setLoading(true);

    try {
      // Importar el servicio de autenticación
      const authService = await import('../../services/authService');
      
      // Llamar al método de verificación
      const result = await authService.default.verifyEmail({
        email,
        code: verificationCode,
        username: username || '',
        password,
        first_name: firstName,
        last_name: lastName,
      });

      if (result.success && result.user) {
        Alert.alert(
          '¡Éxito!',
          'Tu cuenta ha sido verificada exitosamente',
          [
            {
              text: 'Continuar',
              onPress: () => onVerificationSuccess(result.user),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Código de verificación inválido');
        // Limpiar código si es inválido
        if (result.message?.includes('inválido') || result.message?.includes('expirado')) {
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      }
    } catch (error: any) {
      console.error('Error verificando código:', error);
      Alert.alert('Error', error.message || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setResendLoading(true);

    try {
      // Importar el servicio de autenticación
      const authService = await import('../../services/authService');
      
      // Llamar al método de reenvío
      const result = await authService.default.resendVerificationCode(email, username);

      if (result.success) {
        Alert.alert('Código reenviado', 'Se ha enviado un nuevo código a tu email');
        setCountdown(60);
        setCanResend(false);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', result.message || 'Error reenviando código');
      }
    } catch (error: any) {
      console.error('Error reenviando código:', error);
      Alert.alert('Error', error.message || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoBack = () => {
    Alert.alert(
      'Cancelar verificación',
      '¿Estás seguro de que quieres volver? Perderás el progreso del registro.',
      [
        { text: 'Continuar aquí', style: 'cancel' },
        { 
          text: 'Volver', 
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDarkMode ? colors.dark.text : colors.light.text} 
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, themeStyles.iconContainer]}>
            <Ionicons name="mail" size={48} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, themeStyles.text]}>
            Verifica tu email
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, themeStyles.secondaryText]}>
            Hemos enviado un código de 6 dígitos a{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* Code Input */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.codeInput,
                  themeStyles.codeInput,
                  digit ? styles.codeInputFilled : null,
                  digit ? themeStyles.codeInputFilled : null,
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={(event) => handleKeyPress(event, index)}
                keyboardType="number-pad"
                maxLength={6} // Permite pegar códigos completos
                textAlign="center"
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Verify Button */}
          <AuthButton
            title={loading ? "Verificando..." : "Verificar código"}
            onPress={handleVerify}
            variant="primary"
            disabled={loading || code.join('').length !== 6}
            style={styles.verifyButton}
          />

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={[styles.resendText, themeStyles.secondaryText]}>
              ¿No recibiste el código?
            </Text>
            
            {canResend ? (
              <TouchableOpacity 
                onPress={handleResendCode} 
                disabled={resendLoading}
                style={styles.resendButton}
              >
                <Text style={styles.resendButtonText}>
                  {resendLoading ? 'Enviando...' : 'Reenviar código'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.countdownText, themeStyles.secondaryText]}>
                Reenviar en {countdown}s
              </Text>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Text style={[styles.helpText, themeStyles.secondaryText]}>
              💡 Revisa tu bandeja de entrada y carpeta de spam.{'\n'}
              El código expira en 5 minutos.
            </Text>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  emailText: {
    fontWeight: '600',
    color: colors.primary,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  codeInputFilled: {
    borderColor: colors.primary,
  },
  verifyButton: {
    marginBottom: 32,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  countdownText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  helpSection: {
    paddingHorizontal: 20,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.background,
  },
  text: {
    color: colors.light.text,
  },
  secondaryText: {
    color: colors.light.textSecondary,
  },
  iconContainer: {
    backgroundColor: colors.light.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  codeInput: {
    backgroundColor: colors.light.surface,
    borderColor: colors.light.border,
    color: colors.light.text,
  },
  codeInputFilled: {
    backgroundColor: colors.light.background,
    borderColor: colors.primary,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark.background,
  },
  text: {
    color: colors.dark.text,
  },
  secondaryText: {
    color: colors.dark.textSecondary,
  },
  iconContainer: {
    backgroundColor: colors.dark.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  codeInput: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    color: colors.dark.text,
  },
  codeInputFilled: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.primary,
  },
});

export default EmailVerificationScreen;