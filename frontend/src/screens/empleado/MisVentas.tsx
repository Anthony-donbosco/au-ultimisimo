import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { ventasService, type Venta, type VentaResumen } from '../../services/ventasService';
import { formatCurrency, getErrorMessage } from '../../utils/networkUtils';
import { colors } from '../../styles/colors';

const MisVentas: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [resumen, setResumen] = useState<VentaResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [ventasData, resumenData] = await Promise.all([
        ventasService.getVentasEmpleado(),
        ventasService.getResumenVentasEmpleado()
      ]);
      setVentas(ventasData);
      setResumen(resumenData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderVenta = ({ item }: { item: Venta }) => (
    <View style={[styles.ventaCard, isDarkMode && styles.darkVentaCard]}>
      <View style={styles.ventaHeader}>
        <Text style={[styles.productoNombre, isDarkMode && styles.darkText]}>
          {item.producto_nombre}
        </Text>
        <Text style={styles.montoTotal}>
          {formatCurrency(item.monto_total)}
        </Text>
      </View>

      <View style={styles.ventaDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
            Cantidad:
          </Text>
          <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
            {item.cantidad} unidades
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
            Precio unitario:
          </Text>
          <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
            {formatCurrency(item.precio_unitario)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
            Fecha:
          </Text>
          <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
            {formatDate(item.fecha_venta)}
          </Text>
        </View>

        {item.notas && (
          <View style={styles.notasContainer}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
              Notas:
            </Text>
            <Text style={[styles.notasText, isDarkMode && styles.darkText]}>
              {item.notas}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const ResumenCard = () => {
    if (!resumen) return null;

    return (
      <View style={[styles.resumenCard, isDarkMode && styles.darkResumenCard]}>
        <Text style={[styles.resumenTitle, isDarkMode && styles.darkText]}>
          📊 Resumen de Ventas
        </Text>

        <View style={styles.resumenGrid}>
          <View style={styles.resumenItem}>
            <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
              Hoy
            </Text>
            <Text style={[styles.resumenValue, isDarkMode && styles.darkText]}>
              {resumen.ventasHoy} ventas
            </Text>
            <Text style={styles.resumenMonto}>
              {formatCurrency(resumen.montoHoy)}
            </Text>
          </View>

          <View style={styles.resumenItem}>
            <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
              Esta semana
            </Text>
            <Text style={[styles.resumenValue, isDarkMode && styles.darkText]}>
              {resumen.ventasSemana} ventas
            </Text>
            <Text style={styles.resumenMonto}>
              {formatCurrency(resumen.montoSemana)}
            </Text>
          </View>

          <View style={styles.resumenItem}>
            <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
              Este mes
            </Text>
            <Text style={[styles.resumenValue, isDarkMode && styles.darkText]}>
              {resumen.ventasMes} ventas
            </Text>
            <Text style={styles.resumenMonto}>
              {formatCurrency(resumen.montoMes)}
            </Text>
          </View>

          <View style={styles.resumenItem}>
            <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
              Total
            </Text>
            <Text style={[styles.resumenValue, isDarkMode && styles.darkText]}>
              {resumen.totalVentas} ventas
            </Text>
            <Text style={styles.resumenMonto}>
              {formatCurrency(resumen.montoTotal)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Mis Ventas</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Cargando ventas...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Mis Ventas</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, isDarkMode && styles.darkText]}>
            {error}
          </Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Mis Ventas</Text>
        <TouchableOpacity onPress={() => navigation.navigate('RegistrarVenta')} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={ventas}
        renderItem={renderVenta}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={<ResumenCard />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
            <Text style={[styles.emptyText, isDarkMode && styles.darkTextSecondary]}>
              No tienes ventas registradas
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('RegistrarVenta')}
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>Registrar Primera Venta</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background
  },
  darkContainer: {
    backgroundColor: colors.dark.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border
  },
  darkHeader: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border
  },
  backButton: {
    padding: 8
  },
  addButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.light.text,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.light.text,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
  },
  resumenCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkResumenCard: {
    backgroundColor: colors.dark.surface,
  },
  resumenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
  },
  resumenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resumenItem: {
    width: '48%',
    marginBottom: 12,
  },
  resumenLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  resumenValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
  },
  resumenMonto: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  ventaCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkVentaCard: {
    backgroundColor: colors.dark.surface,
  },
  ventaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    flex: 1,
  },
  montoTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  ventaDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
  },
  notasContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  notasText: {
    fontSize: 14,
    color: colors.light.text,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  darkText: {
    color: colors.dark.text
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary
  },
});

export default MisVentas;