// Reemplazar el contenido de: src/screens/admin/AdminDashboard.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';
import { useHideAdminTabBarOnScroll } from '../../hooks/useHideAdminTabBarOnScroll';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminTabParamList } from '../../navigation/AdminNavigator';

const StatCard = ({ icon, title, value, isDarkMode }) => (
  <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
    <Ionicons name={icon} size={24} color={colors.primary} />
    <Text style={[styles.statTitle, isDarkMode && styles.statTitleDark]}>{title}</Text>
    <Text style={[styles.statValue, isDarkMode && styles.statValueDark]}>{value}</Text>
  </View>
);
const NavButton = ({ icon, title, onPress, isDarkMode }) => (
  <TouchableOpacity style={[styles.navButton, isDarkMode && styles.navButtonDark]} onPress={onPress}>
    <Ionicons name={icon} size={28} color={isDarkMode ? colors.dark.text : colors.light.text} />
    <Text style={[styles.navButtonText, isDarkMode && styles.navButtonTextDark]}>{title}</Text>
  </TouchableOpacity>
);

export default function AdminDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminTabParamList>>();
  const [isRefetching, setIsRefetching] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { onScroll, scrollEventThrottle, bottomPadding } = useHideAdminTabBarOnScroll();
  const { user } = useAuth();

  const { data: stats, refetch: refetchStats } = useQuery({ queryKey: ['adminStats'], queryFn: adminService.getDashboardStats });
  const { data: activities, refetch: refetchActivities } = useQuery({ queryKey: ['adminActivity'], queryFn: adminService.getRecentActivity });

  const onRefresh = useCallback(async () => {
    setIsRefetching(true);
    await Promise.all([refetchStats(), refetchActivities()]);
    setIsRefetching(false);
  }, [refetchStats, refetchActivities]);


  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
          Hola, {user?.username || 'Admin'}
        </Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
          <Ionicons
            name={isDarkMode ? "sunny" : "moon"}
            size={24}
            color={isDarkMode ? colors.dark.text : colors.light.text}
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <View style={styles.statsContainer}>
          <StatCard icon="people-sharp" title="Usuarios Totales" value={stats?.totalUsers?.toString() || '0'} isDarkMode={isDarkMode}/>
        </View>

        <View style={styles.navGrid}>
          <NavButton icon="people-outline" title="Usuarios" onPress={() => navigation.navigate('UserManagementStack')} isDarkMode={isDarkMode} />
          <NavButton icon="business-outline" title="Empresas" onPress={() => navigation.navigate('CompanyManagementStack')} isDarkMode={isDarkMode} />
          <NavButton icon="bar-chart-outline" title="Reportes" onPress={() => navigation.navigate('Reports')} isDarkMode={isDarkMode} />
          <NavButton icon="settings-outline" title="Ajustes" onPress={() => navigation.navigate('Settings')} isDarkMode={isDarkMode} />
        </View>

        <View style={styles.activitySection}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>Actividad Reciente</Text>
          {activities?.map((activity, index) => (
            <View key={index} style={[styles.activityItem, isDarkMode && styles.activityItemDark]}>
              <Ionicons name="flash-sharp" color={colors.success} size={20} />
              <View style={styles.activityTextContainer}>
                <Text style={[styles.activityText, isDarkMode && styles.activityTextDark]}>
                  <Text style={{fontWeight: 'bold'}}>{activity.details?.new_status?.toUpperCase() || activity.action}</Text> para usuario
                </Text>
                <Text style={[styles.activityTime, isDarkMode && styles.activityTimeDark]}>{new Date(activity.created_at).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  containerDark: { backgroundColor: colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  headerDark: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.light.text },
  headerTitleDark: { color: colors.dark.text },
  statsContainer: { padding: 20 },
  statCard: { backgroundColor: colors.light.surface, borderRadius: 12, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statCardDark: { backgroundColor: colors.dark.surface },
  statTitle: { color: colors.light.textSecondary, marginTop: 8, fontSize: 16 },
  statTitleDark: { color: colors.dark.textSecondary },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4, color: colors.light.text },
  statValueDark: { color: colors.dark.text },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 15, marginBottom: 20 },
  navButton: { width: '30%', backgroundColor: colors.light.surface, borderRadius: 12, padding: 15, alignItems: 'center', margin: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  navButtonDark: { backgroundColor: colors.dark.surface },
  navButtonText: { marginTop: 8, fontWeight: '500', color: colors.light.text, textAlign: 'center' },
  navButtonTextDark: { color: colors.dark.text },
  activitySection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: colors.light.text },
  sectionTitleDark: { color: colors.dark.text },
  activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.surface, borderRadius: 10, padding: 15, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  activityItemDark: { backgroundColor: colors.dark.surface },
  activityTextContainer: { marginLeft: 15, flex: 1 },
  activityText: { fontSize: 14, color: colors.light.text },
  activityTextDark: { color: colors.dark.text },
  activityTime: { fontSize: 12, color: colors.light.textSecondary, marginTop: 4 },
  activityTimeDark: { color: colors.dark.textSecondary },
  themeButton: { padding: 8, borderRadius: 20, backgroundColor: 'transparent' },
});