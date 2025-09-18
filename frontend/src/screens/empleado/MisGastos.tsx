import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { empleadoService, type GastoEmpleado } from '../../services/empleadoService';
import { formatCurrency, formatDateLong, getErrorMessage } from '../../utils/networkUtils';
import { CardSkeleton, ListSkeleton } from '../../components/common/SkeletonLoader';
import { FadeInView, SlideInView } from '../../components/common/AnimatedComponents';

type FiltroEstado = 'todos' | 'pendientes' | 'aprobados' | 'rechazados';
type MisGastosNavigationProp = NativeStackNavigationProp<any>;

const MisGastos: React.FC = () => {
  const navigation = useNavigation<MisGastosNavigationProp>();
  const { isDarkMode } = useTheme();
  const { wp, hp } = useResponsive();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gastos, setGastos] = useState<GastoEmpleado[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtros
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  useEffect(() => {
    loadGastos();
  }, []);

  const loadGastos = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      console.log('📋 Cargando mis gastos...');

      // Intentar datos cached primero
      const cachedData = await empleadoService.getCachedData('mis_gastos');
      if (cachedData && !showLoader) {
        setGastos(cachedData);
      }

      // Obtener datos frescos
      const data = await empleadoService.getGastos();
      setGastos(data);

      // Cachear datos
      if (data.length > 0) {
        await empleadoService.setCachedData('mis_gastos', data);
      }

      console.log(`✅ ${data.length} gastos cargados exitosamente`);
    } catch (error: any) {
      console.error('❌ Error cargando mis gastos:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);

      // Fallback a datos cached
      const cachedData = await empleadoService.getCachedData('mis_gastos');
      if (cachedData) {
        console.log('📱 Usando datos cached como fallback');
        setGastos(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadGastos(false);
    } catch (error) {
      console.log('Error refreshing mis gastos:', error);
    }
    setRefreshing(false);
  };

  const navegarACrearGasto = () => {
    navigation.navigate('CrearGastoEmpleado');  // Este nombre está correcto
  };

  const handleVerDetalle = (gasto: GastoEmpleado) => {
    // Aquí podrías navegar a una pantalla de detalle del gasto
    // navigation.navigate('DetalleGastoEmpleado', { gasto_id: gasto.id });
    
    // Por ahora mostrar información en alert
    Alert.alert(
      gasto.concepto,
      `Monto: ${formatCurrency(gasto.monto)}\n` +
      `Estado: ${gasto.estado.nombre}\n` +
      `Fecha: ${formatDateLong(gasto.fecha)}\n` +
      (gasto.comentarioEmpresa ? `\nComentario empresa: ${gasto.comentarioEmpresa}` : ''),
      [{ text: 'Cerrar' }]
    );
  };

  // Filtrar gastos
  const gastosFiltrados = gastos.filter(gasto => {
    switch (filtroEstado) {
      case 'pendientes':
        return gasto.estado.nombre.toLowerCase() === 'pendiente';
      case 'aprobados':
        return gasto.estado.nombre.toLowerCase() === 'aprobado';
      case 'rechazados':
        return gasto.estado.nombre.toLowerCase() === 'rechazado';
      default:
        return true;
    }
  });

  // Estadísticas
  const estadisticas = {
    total: gastos.length,
    pendientes: gastos.filter(g => g.estado.nombre.toLowerCase() === 'pendiente').length,
    aprobados: gastos.filter(g => g.estado.nombre.toLowerCase() === 'aprobado').length,
    rechazados: gastos.filter(g => g.estado.nombre.toLowerCase() === 'rechazado').length,
    montoTotal: gastos.reduce((sum, g) => g.estado.nombre.toLowerCase() === 'aprobado' ? sum + g.monto : sum, 0),
    montoPendiente: gastos.reduce((sum, g) => g.estado.nombre.toLowerCase() === 'pendiente' ? sum + g.monto : sum, 0),
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'aprobado': return colors.success;
      case 'rechazado': return colors.error;
      default: return colors.warning;
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'aprobado': return 'checkmark-circle';
      case 'rechazado': return 'close-circle';
      default: return 'time';
    }
  };

  const renderGastoCard = (gasto: GastoEmpleado, index: number) => (
    <SlideInView key={gasto.id} direction="up" delay={index * 50} duration={400}>
      <TouchableOpacity
        style={[styles.gastoCard, isDarkMode && styles.darkCard]}
        onPress={() => handleVerDetalle(gasto)}
        activeOpacity={0.7}
      >
        {/* Header del gasto */}
        <View style={styles.gastoHeader}>
          <View style={styles.gastoMainInfo}>
            <View style={[
              styles.gastoIcon, 
              { backgroundColor: getEstadoColor(gasto.estado.nombre) + '20' }
            ]}>
              <Ionicons 
                name={getEstadoIcon(gasto.estado.nombre)} 
                size={24} 
                color={getEstadoColor(gasto.estado.nombre)} 
              />
            </View>
            
            <View style={styles.gastoContent}>
              <Text style={[styles.gastoConcepto, isDarkMode && styles.darkText]}>
                {gasto.concepto}
              </Text>
              <Text style={[styles.gastoCategoria, isDarkMode && styles.darkTextSecondary]}>
                {gasto.categoria.nombre} • {new Date(gasto.fecha).toLocaleDateString()}
              </Text>
              {gasto.proveedor && (
                <Text style={[styles.gastoProveedor, isDarkMode && styles.darkTextSecondary]}>
                  📍 {gasto.proveedor}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.gastoRight}>
            <Text style={[styles.gastoMonto, isDarkMode && styles.darkText]}>
              {formatCurrency(gasto.monto)}
            </Text>
            <View style={[
              styles.estadoBadge,
              { backgroundColor: getEstadoColor(gasto.estado.nombre) + '20' }
            ]}>
              <Text style={[
                styles.estadoText,
                { color: getEstadoColor(gasto.estado.nombre) }
              ]}>
                {gasto.estado.nombre}
              </Text>
            </View>
          </View>
        </View>

        {/* Descripción si existe */}
        {gasto.descripcion && (
          <Text style={[styles.gastoDescripcion, isDarkMode && styles.darkTextSecondary]} numberOfLines={2}>
            {gasto.descripcion}
          </Text>
        )}

        {/* Información adicional */}
        <View style={styles.gastoFooter}>
          <View style={styles.gastoMeta}>
            <View style={styles.gastoMetaItem}>
              <Ionicons name="card" size={14} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.gastoMetaText, isDarkMode && styles.darkTextSecondary]}>
                {gasto.tipoPago.nombre}
              </Text>
            </View>
            
            {gasto.ubicacion && (
              <View style={styles.gastoMetaItem}>
                <Ionicons name="location" size={14} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                <Text style={[styles.gastoMetaText, isDarkMode && styles.darkTextSecondary]}>
                  {gasto.ubicacion}
                </Text>
              </View>
            )}

            {gasto.adjuntoUrl && (
              <View style={styles.gastoMetaItem}>
                <Ionicons name="attach" size={14} color={colors.primary} />
                <Text style={[styles.gastoMetaText, { color: colors.primary }]}>
                  Comprobante
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.gastoFechaCreacion, isDarkMode && styles.darkTextSecondary]}>
            Creado: {new Date(gasto.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Comentarios de empresa si existen */}
        {gasto.comentarioEmpresa && (
          <View style={[styles.comentarioEmpresa, isDarkMode && styles.darkComentarioEmpresa]}>
            <View style={styles.comentarioHeader}>
              <Ionicons name="chatbubble" size={16} color={colors.primary} />
              <Text style={[styles.comentarioLabel, isDarkMode && styles.darkText]}>
                Comentario de la empresa:
              </Text>
            </View>
            <Text style={[styles.comentarioTexto, isDarkMode && styles.darkText]}>
              {gasto.comentarioEmpresa}
            </Text>
            {gasto.fechaAprobacion && (
              <Text style={[styles.comentarioFecha, isDarkMode && styles.darkTextSecondary]}>
                {formatDateLong(gasto.fechaAprobacion)}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </SlideInView>
  );

  const renderFiltros = () => (
    <View style={[styles.filtrosContainer, isDarkMode && styles.darkFiltrosContainer]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}>
        {[
          { key: 'todos', label: 'Todos', count: estadisticas.total },
          { key: 'pendientes', label: 'Pendientes', count: estadisticas.pendientes },
          { key: 'aprobados', label: 'Aprobados', count: estadisticas.aprobados },
          { key: 'rechazados', label: 'Rechazados', count: estadisticas.rechazados },
        ].map((filtro) => (
          <TouchableOpacity
            key={filtro.key}
            style={[
              styles.filtroChip,
              filtroEstado === filtro.key && styles.filtroChipActive,
              isDarkMode && styles.darkFiltroChip,
              filtroEstado === filtro.key && isDarkMode && styles.darkFiltroChipActive,
            ]}
            onPress={() => setFiltroEstado(filtro.key as FiltroEstado)}
          >
            <Text style={[
              styles.filtroChipText,
              filtroEstado === filtro.key && styles.filtroChipTextActive,
              isDarkMode && styles.darkText,
              filtroEstado === filtro.key && { color: '#fff' },
            ]}>
              {filtro.label}
            </Text>
            {filtro.count > 0 && (
              <View style={[
                styles.filtroChipBadge,
                filtroEstado === filtro.key && styles.filtroChipBadgeActive,
              ]}>
                <Text style={[
                  styles.filtroChipBadgeText,
                  filtroEstado === filtro.key && styles.filtroChipBadgeTextActive,
                ]}>
                  {filtro.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Loading state
  if (loading && gastos.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
            Mis Gastos
          </Text>
          <CardSkeleton showHeader={false} lines={1} style={styles.headerButtonSkeleton} />
        </View>

        <View style={styles.statsContainer}>
          <CardSkeleton showHeader={false} lines={2} style={styles.statsSkeleton} />
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <ListSkeleton items={4} itemHeight={150} style={{ marginHorizontal: wp(4) }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Mis Gastos
        </Text>
        <TouchableOpacity 
          onPress={navegarACrearGasto}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Estadísticas */}
      <View style={[styles.statsContainer, isDarkMode && styles.darkStatsContainer]}>
        <SlideInView direction="left" delay={100} duration={400}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {formatCurrency(estadisticas.montoTotal)}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
              Total Aprobado
            </Text>
          </View>
        </SlideInView>

        <SlideInView direction="up" delay={150} duration={400}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {formatCurrency(estadisticas.montoPendiente)}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
              Pendiente
            </Text>
          </View>
        </SlideInView>

        <SlideInView direction="right" delay={200} duration={400}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
              {estadisticas.total}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
              Total Gastos
            </Text>
          </View>
        </SlideInView>
      </View>

      {/* Filtros */}
      {renderFiltros()}

      {/* Lista de Gastos */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {error && (
          <View style={[styles.errorContainer, { marginHorizontal: wp(4), marginBottom: 16 }]}>
            <Text style={[styles.errorText, isDarkMode && styles.darkText]}>
              {error}
            </Text>
          </View>
        )}

        {gastosFiltrados.length > 0 ? (
          <View style={styles.gastosContainer}>
            {gastosFiltrados.map((gasto, index) => renderGastoCard(gasto, index))}
          </View>
        ) : (
          <SlideInView direction="up" delay={100} duration={600}>
            <View style={styles.emptyState}>
              <Ionicons 
                name={filtroEstado === 'todos' ? "receipt-outline" : "funnel-outline"}
                size={64} 
                color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} 
              />
              <Text style={[styles.emptyStateTitle, isDarkMode && styles.darkText]}>
                {filtroEstado === 'todos' ? 'No tienes gastos' : `No hay gastos ${filtroEstado}`}
              </Text>
              <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                {filtroEstado === 'todos' 
                  ? 'Registra tu primer gasto empresarial'
                  : `No tienes gastos en estado ${filtroEstado}`
                }
              </Text>
              {filtroEstado === 'todos' && (
                <TouchableOpacity
                  style={[styles.createFirstButton, { backgroundColor: colors.primary }]}
                  onPress={navegarACrearGasto}
                >
                  <Text style={styles.createFirstButtonText}>Registrar Primer Gasto</Text>
                </TouchableOpacity>
              )}
            </View>
          </SlideInView>
        )}

        {/* Espacio adicional para el scroll */}
        <View style={{ height: hp(4) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  darkContainer: {
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  darkHeader: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  darkStatsContainer: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  filtrosContainer: {
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingVertical: 12,
  },
  darkFiltrosContainer: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  filtrosScroll: {
    paddingHorizontal: 16,
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: colors.light.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 6,
  },
  darkFiltroChip: {
    backgroundColor: colors.dark.background,
    borderColor: colors.dark.border,
  },
  filtroChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  darkFiltroChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtroChipText: {
    fontSize: 14,
    color: colors.light.text,
  },
  filtroChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filtroChipBadge: {
    backgroundColor: colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtroChipBadgeActive: {
    backgroundColor: '#fff',
  },
  filtroChipBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  filtroChipBadgeTextActive: {
    color: colors.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  gastosContainer: {
    padding: 16,
  },
  gastoCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...globalStyles.shadow,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  gastoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gastoMainInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  gastoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gastoContent: {
    flex: 1,
  },
  gastoConcepto: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  gastoCategoria: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  gastoProveedor: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoRight: {
    alignItems: 'flex-end',
  },
  gastoMonto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 6,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gastoDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  gastoFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
    paddingTop: 12,
  },
  gastoMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  gastoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gastoMetaText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoFechaCreacion: {
    fontSize: 11,
    color: colors.light.textSecondary,
    textAlign: 'right',
  },
  comentarioEmpresa: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  darkComentarioEmpresa: {
    backgroundColor: colors.primary + '15',
  },
  comentarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  comentarioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.text,
  },
  comentarioTexto: {
    fontSize: 14,
    color: colors.light.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  comentarioFecha: {
    fontSize: 10,
    color: colors.light.textSecondary,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createFirstButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Skeleton Styles
  headerButtonSkeleton: {
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  statsSkeleton: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default MisGastos;