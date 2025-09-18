// Crear un nuevo archivo: src/screens/admin/CompanyEmployeesScreen.tsx
// O reemplazar si ya existe.

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../../services/adminService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { colors } from '../../../styles/colors';

export const CompanyEmployeesScreen = ({ route, navigation }) => {
  const { companyId, companyName } = route.params;
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['companyEmployees', companyId],
    queryFn: () => adminService.getCompanyEmployees(companyId),
  });

  const mutation = useMutation({
    mutationFn: (employeeId: number) => adminService.deleteCompanyEmployee(companyId, employeeId),
    onSuccess: () => {
      Alert.alert('Éxito', 'Empleado desvinculado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['companyEmployees', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companyDetail', companyId] }); // Para refrescar el contador
    },
    onError: (error: any) => {
      Alert.alert('Error', `No se pudo desvincular al empleado: ${error.message || 'Error desconocido'}`);
    }
  });

  const handleDeleteEmployee = (employeeId: number) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas desvincular a este empleado de la empresa? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desvincular', style: 'destructive', onPress: () => mutation.mutate(employeeId) },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={styles.employeeInfo}>
        <Text style={[styles.employeeName, isDarkMode && styles.employeeNameDark]}>
          {item.first_name} {item.last_name}
        </Text>
        <Text style={[styles.employeeEmail, isDarkMode && styles.employeeEmailDark]}>
          {item.email}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteEmployee(item.id)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={22} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]} numberOfLines={1}>{companyName}</Text>
            <Text style={[styles.headerSubtitle, isDarkMode && styles.headerSubtitleDark]}>Empleados</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary}/>
      ) : (
        <FlatList
          data={data?.employees || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                    Esta empresa no tiene empleados registrados.
                </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.light.background },
    containerDark: { backgroundColor: colors.dark.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
    headerDark: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
    headerTextContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.light.text },
    headerTitleDark: { color: colors.dark.text },
    headerSubtitle: { fontSize: 14, color: colors.light.textSecondary },
    headerSubtitleDark: { color: colors.dark.textSecondary },
    card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.light.surface, borderRadius: 8, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, },
    cardDark: { backgroundColor: colors.dark.surface },
    employeeInfo: { flex: 1 },
    employeeName: { fontSize: 16, fontWeight: '600', color: colors.light.text },
    employeeNameDark: { color: colors.dark.text },
    employeeEmail: { color: colors.light.textSecondary, marginTop: 4 },
    employeeEmailDark: { color: colors.dark.textSecondary },
    deleteButton: { padding: 8, marginLeft: 12 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 16, color: colors.light.textSecondary },
    emptyTextDark: { color: colors.dark.textSecondary },
});