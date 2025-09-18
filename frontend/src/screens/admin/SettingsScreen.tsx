// Reemplazar el contenido de: src/screens/admin/SettingsScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

const SettingRow = ({ title, description, children, isDarkMode }) => (
    <View style={styles.settingRow}>
        <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, isDarkMode && styles.settingTitleDark]}>{title}</Text>
            {description && <Text style={[styles.settingDescription, isDarkMode && styles.settingDescriptionDark]}>{description}</Text>}
        </View>
        {children}
    </View>
);

export const SettingsScreen = ({ navigation }) => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { isDarkMode } = useTheme();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: adminService.getSettings,
  });

  const { control, handleSubmit, setValue } = useForm();

  useEffect(() => {
    if (data) {
      setValue('session_timeout_minutes', data.session_timeout_minutes.toString());
      setValue('enable_email_notifications', data.enable_email_notifications);
    }
  }, [data, setValue]);

  const mutation = useMutation({
    mutationFn: adminService.updateSettings,
    onSuccess: () => {
      Alert.alert('Éxito', 'Ajustes guardados correctamente.');
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', `No se pudieron guardar los ajustes: ${err.message}`);
    },
  });

  const onSubmit = (formData) => {
    // Asegurarse de que el timeout sea un número
    const settingsToSave = {
        ...formData,
        session_timeout_minutes: parseInt(formData.session_timeout_minutes, 10) || 60,
    };
    mutation.mutate(settingsToSave);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar la sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: async () => { await logout(); } },
      ]
    );
  };

  if (isLoading) {
    return <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}><ActivityIndicator size="large" style={styles.centered} color={colors.primary} /></SafeAreaView>;
  }
  if (isError) {
    return <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}><Text style={[styles.centered, isDarkMode && styles.centeredDark]}>Error: {error.message}</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Ajustes del Sistema</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionHeader, isDarkMode && styles.sectionHeaderDark]}>Seguridad</Text>
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <Controller
                control={control}
                name="session_timeout_minutes"
                render={({ field: { onChange, value } }) => (
                    <SettingRow title="Tiempo de Sesión (minutos)" description="Duración de la sesión para usuarios inactivos." isDarkMode={isDarkMode}>
                        <TextInput
                            style={[styles.textInput, isDarkMode && styles.textInputDark]}
                            keyboardType="number-pad"
                            value={value}
                            onChangeText={onChange}
                            placeholder="60"
                        />
                    </SettingRow>
                )}
            />
        </View>

        <Text style={[styles.sectionHeader, isDarkMode && styles.sectionHeaderDark]}>Notificaciones</Text>
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <SettingRow title="Notificaciones por Email" description="Activar o desactivar notificaciones globales." isDarkMode={isDarkMode}>
                <Controller
                    control={control}
                    name="enable_email_notifications"
                    render={({ field: { onChange, value } }) => (
                        <Switch
                            trackColor={{ false: colors.light.textTertiary, true: colors.primaryLight }}
                            thumbColor={value ? colors.primary : colors.light.surface}
                            onValueChange={onChange}
                            value={value}
                        />
                    )}
                />
            </SettingRow>
        </View>
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={mutation.isLoading}>
          {mutation.isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar Cambios</Text>}
        </TouchableOpacity>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={[styles.logoutButton, isDarkMode && styles.logoutButtonDark]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} style={styles.logoutIcon} />
            <Text style={[styles.logoutButtonText, isDarkMode && styles.logoutButtonTextDark]}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  containerDark: { backgroundColor: colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  headerDark: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.light.text },
  headerTitleDark: { color: colors.dark.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', color: colors.light.text },
  centeredDark: { color: colors.dark.text },
  content: { padding: 16 },
  sectionHeader: { fontSize: 18, fontWeight: '600', color: colors.light.textSecondary, marginBottom: 12, marginLeft: 4 },
  sectionHeaderDark: { color: colors.dark.textSecondary },
  card: { backgroundColor: colors.light.surface, borderRadius: 12, paddingHorizontal: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardDark: { backgroundColor: colors.dark.surface },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  settingTextContainer: { flex: 1, marginRight: 16 },
  settingTitle: { fontSize: 16, fontWeight: '600', color: colors.light.text },
  settingTitleDark: { color: colors.dark.text },
  settingDescription: { fontSize: 13, color: colors.light.textSecondary, marginTop: 4 },
  settingDescriptionDark: { color: colors.dark.textSecondary },
  textInput: { borderWidth: 1, borderColor: colors.light.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 80, textAlign: 'center', fontSize: 16, color: colors.light.text },
  textInputDark: { borderColor: colors.dark.border, color: colors.dark.text, backgroundColor: colors.dark.background },
  saveButton: { backgroundColor: colors.success, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutSection: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.light.border },
  logoutButton: { backgroundColor: colors.light.surface, borderWidth: 1, borderColor: colors.error, padding: 15, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  logoutButtonDark: { backgroundColor: colors.dark.surface },
  logoutIcon: { marginRight: 8 },
  logoutButtonText: { color: colors.error, fontSize: 16, fontWeight: 'bold' },
});