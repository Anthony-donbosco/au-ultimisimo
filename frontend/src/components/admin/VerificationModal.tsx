// Crear nuevo archivo: src/components/admin/VerificationModal.tsx

import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

interface VerificationModalProps {
  isVisible: boolean;
  actionTitle: string;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isVisible, actionTitle, onClose, onVerify }) => {
  const { isDarkMode } = useTheme();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Code must be 6 digits.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onVerify(code);
      setCode(''); // Limpiar para la próxima vez
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>Verify Your Identity</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>To proceed with the action "{actionTitle}", please enter the 6-digit code sent to your email.</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            placeholder="- - - - - -"
            placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {isLoading
            ? <ActivityIndicator style={{marginTop: 20}} color={colors.primary} />
            : <Button title="Verify & Continue" onPress={handleVerify} color={colors.primary} />
          }
          <View style={{marginTop: 10}}>
            <Button title="Cancel" onPress={onClose} color={colors.error} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Estilos para el modal
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        backgroundColor: colors.light.surface,
        padding: 25,
        borderRadius: 15,
        width: '90%',
        alignItems: 'center'
    },
    modalContentDark: {
        backgroundColor: colors.dark.surface
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        color: colors.light.text
    },
    titleDark: {
        color: colors.dark.text
    },
    subtitle: {
        textAlign: 'center',
        color: colors.light.textSecondary,
        marginBottom: 20
    },
    subtitleDark: {
        color: colors.dark.textSecondary
    },
    input: {
        fontSize: 24,
        borderWidth: 1,
        borderColor: colors.light.border,
        borderRadius: 8,
        width: '80%',
        textAlign: 'center',
        padding: 12,
        letterSpacing: 10,
        color: colors.light.text,
        backgroundColor: colors.light.surface
    },
    inputDark: {
        borderColor: colors.dark.border,
        color: colors.dark.text,
        backgroundColor: colors.dark.surface
    },
    errorText: {
        color: colors.error,
        marginTop: 10
    }
});