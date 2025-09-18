import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { ventasService, type Venta } from '../../services/ventasService';
import { formatCurrency, getErrorMessage } from '../../utils/networkUtils';
import { colors } from '../../styles/colors';

interface ResumenVentasEmpresa {
  totalVentas: number;
  montoTotal: number;
  ventasHoy: number;
  montoHoy: number;
  ventasSemana: number;
  montoSemana: number;
  ventasMes: number;
  montoMes: number;
  ventasPorEmpleado: Array<{
    empleado_id: number;
    empleado_nombre: string;
    total_ventas: number;
    monto_total: number;
  }>;
}

const VentasEmpleados: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [resumen, setResumen] = useState<ResumenVentasEmpresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroEmpleado, setFiltroEmpleado] = useState<number | null>(null);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<{ id: number; nombre: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [ventasData, resumenData] = await Promise.all([
        ventasService.getVentasEmpresa(filtroEmpleado ? { empleado_id: filtroEmpleado } : undefined),
        ventasService.getResumenVentasEmpresa()
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

  const filtrarPorEmpleado = async (empleadoId: number | null, empleadoNombre?: string) => {
    setFiltroEmpleado(empleadoId);
    setEmpleadoSeleccionado(empleadoId ? { id: empleadoId, nombre: empleadoNombre || `Empleado #${empleadoId}` } : null);
    setLoading(true);
    try {
      const ventasData = await ventasService.getVentasEmpresa(
        empleadoId ? { empleado_id: empleadoId } : undefined
      );
      setVentas(ventasData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
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

  const eliminarVenta = async (venta: Venta) => {
    Alert.alert(
      'Eliminar Venta',
      `¿Estás seguro de que deseas eliminar esta venta de ${venta.empleado_nombre || `Empleado #${venta.empleado_id}`}?\n\nProducto: ${venta.producto_nombre}\nMonto: ${formatCurrency(venta.monto_total)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await ventasService.eliminarVentaEmpleado(venta.id);
              // Recargar las ventas
              await loadData();
              Alert.alert('Éxito', 'Venta eliminada correctamente');
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err));
            }
          }
        }
      ]
    );
  };

  const renderVenta = ({ item }: { item: Venta }) => (
    <View style={[styles.ventaCard, isDarkMode && styles.darkVentaCard]}>
      {/* Header con empleado destacado */}
      <View style={styles.empleadoHeader}>
        <View style={styles.empleadoInfo}>
          <Ionicons name="person-circle" size={24} color={colors.primary} />
          <Text style={[styles.empleadoHeaderNombre, isDarkMode && styles.darkText]}>
            {item.empleado_nombre || `Empleado #${item.empleado_id}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => eliminarVenta(item)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Información del producto y venta */}
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
          📊 Resumen General de Ventas
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

        {resumen.ventasPorEmpleado.length > 0 && (
          <>
            <Text style={[styles.empleadosTitle, isDarkMode && styles.darkText]}>
              👥 Ventas por Empleado
            </Text>
            {resumen.ventasPorEmpleado.map((emp) => (
              <TouchableOpacity
                key={emp.empleado_id}
                style={[styles.empleadoCard, isDarkMode && styles.darkEmpleadoCard]}
                onPress={() => filtrarPorEmpleado(
                  filtroEmpleado === emp.empleado_id ? null : emp.empleado_id,
                  emp.empleado_nombre
                )}
              >
                <View style={styles.empleadoInfo}>
                  <Text style={[styles.empleadoNombre, isDarkMode && styles.darkText]}>
                    {emp.empleado_nombre || `Empleado #${emp.empleado_id}`}
                  </Text>
                  <Text style={[styles.empleadoStats, isDarkMode && styles.darkTextSecondary]}>
                    {emp.total_ventas} ventas • {formatCurrency(emp.monto_total)}
                  </Text>
                </View>
                <Ionicons
                  name={filtroEmpleado === emp.empleado_id ? "checkmark-circle" : "chevron-forward"}
                  size={20}
                  color={filtroEmpleado === emp.empleado_id ? colors.primary : (isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary)}
                />
              </TouchableOpacity>
            ))}
            {filtroEmpleado && (
              <TouchableOpacity
                style={[styles.clearFilterButton]}
                onPress={() => filtrarPorEmpleado(null)}
              >
                <Text style={styles.clearFilterText}>Ver Todas las Ventas</Text>
              </TouchableOpacity>
            )}
          </>
        )}
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
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Ventas de Empleados</Text>
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
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Ventas de Empleados</Text>
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
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          {empleadoSeleccionado ? `Ventas de ${empleadoSeleccionado.nombre}` : 'Ventas de Empleados'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Header especial para empleado seleccionado */}
      {empleadoSeleccionado && (
        <View style={[styles.empleadoSelectedHeader, isDarkMode && styles.darkEmpleadoSelectedHeader]}>
          <View style={styles.empleadoSelectedInfo}>
            <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
            <View style={styles.empleadoSelectedText}>
              <Text style={[styles.empleadoSelectedNombre, isDarkMode && styles.darkText]}>
                {empleadoSeleccionado.nombre}
              </Text>
              <Text style={[styles.empleadoSelectedSubtitle, isDarkMode && styles.darkTextSecondary]}>
                Ventas registradas
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.clearFilterIconButton}
            onPress={() => filtrarPorEmpleado(null)}
          >
            <Ionicons name="close-circle" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}

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
              {filtroEmpleado
                ? `No hay ventas registradas para el empleado #${filtroEmpleado}`
                : 'No hay ventas registradas'
              }
            </Text>
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
    marginBottom: 20,
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
  empleadosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 12,
  },
  empleadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  darkEmpleadoCard: {
    backgroundColor: colors.dark.background,
  },
  empleadoInfo: {
    flex: 1,
  },
  empleadoNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
  },
  empleadoStats: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  clearFilterButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginTop: 8,
  },
  clearFilterText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
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
  // Nuevos estilos para empleado header
  empleadoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  empleadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  empleadoHeaderNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.light.background,
  },
  empleadoSelectedHeader: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkEmpleadoSelectedHeader: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  empleadoSelectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  empleadoSelectedText: {
    marginLeft: 12,
  },
  empleadoSelectedNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  empleadoSelectedSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  clearFilterIconButton: {
    padding: 4,
  },
  darkText: {
    color: colors.dark.text
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary
  },
});

export default VentasEmpleados;