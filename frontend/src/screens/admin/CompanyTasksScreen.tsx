// Crear un nuevo archivo: src/screens/admin/CompanyTasksScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

export const CompanyTasksScreen = ({ route, navigation }) => {
  const { companyId, companyName } = route.params;
  const { isDarkMode } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['companyTasks', companyId],
    queryFn: () => adminService.getCompanyTasks(companyId),
  });

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('es-ES') : 'Sin fecha';

  const renderItem = ({ item }) => (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={{flex: 1}}>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>{item.titulo}</Text>
        <View style={styles.detailsRow}>
          <View style={[styles.badge, {backgroundColor: item.estado_color || colors.light.border}]}>
            <Text style={styles.badgeText}>{item.estado_nombre}</Text>
          </View>
          <Text style={[styles.date, isDarkMode && styles.textSecondaryDark]}>Límite: {formatDate(item.fecha_limite)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} /></TouchableOpacity>
        <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Tareas</Text>
            <Text style={[styles.headerSubtitle, isDarkMode && styles.headerSubtitleDark]}>{companyName}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      {isLoading ? <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary}/>
      : (
        <FlatList
          data={data?.tasks || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}><Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>No hay tareas asignadas para esta empresa.</Text></View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background, paddingTop: 50 },
  containerDark: { backgroundColor: colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  headerDark: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
  headerTextContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.light.text },
  headerTitleDark: { color: colors.dark.text },
  headerSubtitle: { fontSize: 14, color: colors.light.textSecondary },
  headerSubtitleDark: { color: colors.dark.textSecondary },
  card: { backgroundColor: colors.light.surface, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardDark: { backgroundColor: colors.dark.surface },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: colors.light.text },
  detailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  date: { fontSize: 13, color: colors.light.textSecondary },
  textDark: { color: colors.dark.text },
  textSecondaryDark: { color: colors.dark.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: colors.light.textSecondary, textAlign: 'center' },
  emptyTextDark: { color: colors.dark.textSecondary },
});