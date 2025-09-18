// Reemplazar el contenido de: src/screens/admin/CompanyManagementScreen.tsx

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';
import { useHideAdminTabBarOnScroll } from '../../hooks/useHideAdminTabBarOnScroll';

const CompanyListItem = ({ item, onPress, isDarkMode }) => (
  <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={onPress}>
    <View style={[styles.cardIcon, isDarkMode && styles.cardIconDark]}>
      <Ionicons name="business-outline" size={24} color={colors.primary} />
    </View>
    <View style={styles.cardDetails}>
      <Text style={[styles.companyName, isDarkMode && styles.companyNameDark]}>{item.name}</Text>
      <Text style={[styles.companyIndustry, isDarkMode && styles.companyIndustryDark]}>{item.industry}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" size={22} color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary} />
  </TouchableOpacity>
);

export const CompanyManagementScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const { onScroll, scrollEventThrottle, bottomPadding } = useHideAdminTabBarOnScroll();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminCompanies'],
    queryFn: () => adminService.getCompanies({ page: 1, limit: 20 }),
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const handleCompanyPress = (company) => {
    navigation.navigate('CompanyDetail', { 
      companyId: company.id, 
      companyName: company.name 
    });
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Empresas</Text>
      </View>
      <FlatList
        data={data?.companies || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <CompanyListItem item={item} onPress={() => handleCompanyPress(item)} isDarkMode={isDarkMode} />}
        contentContainerStyle={[styles.listContainer, { paddingBottom: bottomPadding }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        ListEmptyComponent={<Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>No se encontraron empresas.</Text>}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  containerDark: { backgroundColor: colors.dark.background },
  header: { paddingVertical: 15, paddingHorizontal: 20, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  headerDark: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.light.text },
  headerTitleDark: { color: colors.dark.text },
  listContainer: { padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: colors.light.textSecondary },
  emptyTextDark: { color: colors.dark.textSecondary },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.surface, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, },
  cardDark: { backgroundColor: colors.dark.surface },
  cardIcon: { marginRight: 16, backgroundColor: colors.light.border, padding: 12, borderRadius: 25 },
  cardIconDark: { backgroundColor: colors.dark.border },
  cardDetails: { flex: 1 },
  companyName: { fontSize: 16, fontWeight: 'bold', color: colors.light.text },
  companyNameDark: { color: colors.dark.text },
  companyIndustry: { color: colors.light.textSecondary, marginTop: 2 },
  companyIndustryDark: { color: colors.dark.textSecondary },
});