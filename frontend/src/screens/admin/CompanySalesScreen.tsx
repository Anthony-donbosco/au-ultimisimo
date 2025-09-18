import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

export const CompanySalesScreen = ({ route, navigation }) => {
  const { companyId, companyName } = route.params;
  const { isDarkMode } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['companySales', companyId],
    queryFn: () => adminService.getCompanySales(companyId),
  });

  const formatCurrency = (num) => `$${Number(num).toFixed(2)}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-ES');

  const renderItem = ({ item }) => (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={styles.cardIcon}>
        <Ionicons name="cart-outline" size={24} color={colors.success} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.productName, isDarkMode && styles.textDark]} numberOfLines={1}>{item.producto_nombre}</Text>
        <Text style={[styles.employeeName, isDarkMode && styles.textSecondaryDark]}>Vendido por: {item.empleado_nombre}</Text>
        <Text style={[styles.date, isDarkMode && styles.textSecondaryDark]}>{formatDate(item.fecha_venta)}</Text>
      </View>
      <Text style={[styles.amount, isDarkMode && styles.textDark]}>{formatCurrency(item.monto_total)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} /></TouchableOpacity>
        <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Ventas</Text>
            <Text style={[styles.headerSubtitle, isDarkMode && styles.headerSubtitleDark]}>{companyName}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      {isLoading ? <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary}/>
      : (
        <FlatList
          data={data?.sales || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}><Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>No hay ventas registradas para esta empresa.</Text></View>
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.surface, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardDark: { backgroundColor: colors.dark.surface },
  cardIcon: { marginRight: 16, backgroundColor: `${colors.success}20`, padding: 12, borderRadius: 25 },
  cardContent: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: colors.light.text },
  employeeName: { fontSize: 13, color: colors.light.textSecondary, marginTop: 4 },
  date: { fontSize: 12, color: colors.light.textTertiary, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: 'bold', color: colors.light.text },
  textDark: { color: colors.dark.text },
  textSecondaryDark: { color: colors.dark.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: colors.light.textSecondary, textAlign: 'center' },
  emptyTextDark: { color: colors.dark.textSecondary },
});