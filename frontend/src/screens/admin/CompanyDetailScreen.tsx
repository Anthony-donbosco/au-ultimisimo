// Reemplazar el contenido de: src/screens/admin/CompanyDetailScreen.tsx

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { adminService } from '../../services/adminService';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

const OptionCard = ({ icon, title, description, onPress, isDarkMode, iconColor = colors.primary }) => (
  <TouchableOpacity style={[styles.optionCard, isDarkMode && styles.optionCardDark]} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
      <Ionicons name={icon} size={32} color={iconColor} />
    </View>
    <View style={styles.optionContent}>
      <Text style={[styles.optionTitle, isDarkMode && styles.optionTitleDark]}>{title}</Text>
      <Text style={[styles.optionDescription, isDarkMode && styles.optionDescriptionDark]}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" size={24} color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary} />
  </TouchableOpacity>
);

const StatCard = ({ icon, title, value, color = colors.primary, isDarkMode }) => (
  <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
    <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={[styles.statValue, isDarkMode && styles.statValueDark]}>{value}</Text>
    <Text style={[styles.statTitle, isDarkMode && styles.statTitleDark]}>{title}</Text>
  </View>
);

export const CompanyDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { companyId, companyName } = route.params as { companyId: number; companyName: string };

  const { data: companyDetails, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['companyDetail', companyId],
    queryFn: () => adminService.getCompanyDetails(companyId),
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const handleNavigation = (screenName: string) => {
    navigation.navigate(screenName, { companyId, companyName });
  };

  if (isLoading) return <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}><ActivityIndicator size="large" style={styles.centered} color={colors.primary} /></SafeAreaView>;
  if (isError) return <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}><Text style={[styles.centered, isDarkMode && styles.centeredDark]}>Error: {error?.message}</Text></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>{companyName}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} />}>
        <View style={styles.statsContainer}>
          <StatCard icon="people" title="Empleados" value={companyDetails?.employeeCount?.toString() || '0'} color={colors.success} isDarkMode={isDarkMode} />
          <StatCard icon="rocket-outline" title="Proyectos" value={companyDetails?.projectCount?.toString() || '0'} color={colors.primary} isDarkMode={isDarkMode} />
          <StatCard icon="checkmark-circle" title="Tareas Comp." value={companyDetails?.completedTasks?.toString() || '0'} color={colors.warning} isDarkMode={isDarkMode} />
        </View>
        <View style={styles.optionsContainer}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>Módulos de Gestión</Text>
          <OptionCard icon="people-outline" title="Empleados" description="Ver y gestionar los empleados" onPress={() => handleNavigation('CompanyEmployees')} isDarkMode={isDarkMode} iconColor={colors.success}/>
          <OptionCard icon="rocket-outline" title="Proyectos" description="Ver los proyectos actuales" onPress={() => handleNavigation('CompanyProjects')} isDarkMode={isDarkMode} iconColor={colors.primary}/>
          <OptionCard icon="trending-up-outline" title="Ventas" description="Consultar historial de ventas" onPress={() => handleNavigation('CompanySales')} isDarkMode={isDarkMode} iconColor={colors.info}/>
          <OptionCard icon="list-outline" title="Tareas" description="Ver tareas asignadas y seguimiento" onPress={() => handleNavigation('CompanyTasks')} isDarkMode={isDarkMode} iconColor={colors.warning}/>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.light.text, marginHorizontal: 10, flex: 1, textAlign: 'center' },
  headerTitleDark: { color: colors.dark.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', color: colors.light.text },
  centeredDark: { color: colors.dark.text },
  content: { padding: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: colors.light.surface, borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statCardDark: { backgroundColor: colors.dark.surface },
  statIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.light.text, marginBottom: 4 },
  statValueDark: { color: colors.dark.text },
  statTitle: { fontSize: 12, color: colors.light.textSecondary, textAlign: 'center' },
  statTitleDark: { color: colors.dark.textSecondary },
  optionsContainer: { marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.light.text, marginBottom: 16 },
  sectionTitleDark: { color: colors.dark.text },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.surface, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  optionCardDark: { backgroundColor: colors.dark.surface },
  iconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 18, fontWeight: '600', color: colors.light.text, marginBottom: 4 },
  optionTitleDark: { color: colors.dark.text },
  optionDescription: { fontSize: 14, color: colors.light.textSecondary },
  optionDescriptionDark: { color: colors.dark.textSecondary },
});