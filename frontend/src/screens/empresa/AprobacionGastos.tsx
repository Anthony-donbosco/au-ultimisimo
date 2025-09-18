import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { empresaService, type GastoPendiente } from '../../services/empresaService';
import { formatCurrency, getErrorMessage } from '../../utils/networkUtils';
import { CardSkeleton, ListSkeleton } from '../../components/common/SkeletonLoader';
import { FadeInView, SlideInView } from '../../components/common/AnimatedComponents';

const AprobacionGastos: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { isTablet, wp, hp } = useResponsive();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gastosPendientes, setGastosPendientes] = useState<GastoPendiente[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal de detalle
  const [selectedGasto, setSelectedGasto] = useState<GastoPendiente | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Estados de acciones
  const [processing, setProcessing] = useState<{ [key: number]: boolean }>({});
  const [comentario, setComentario] = useState('');
  const [motivo, setMotivo] = useState('');

  // Filtros
  const [filtroEmpleado, setFiltroEmpleado] = useState<string>('all');

  useEffect(() => {
    loadGastosPendientes();
  }, []);

  const loadGastosPendientes = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      console.log('💰 Cargando gastos pendientes...');

      // Intentar datos cached primero
      const cachedData = await empresaService.getCachedData('gastos_pendientes');
      if (cachedData && !showLoader) {
        setGastosPendientes(cachedData);
      }

      // Obtener datos frescos
      const data = await empresaService.getGastosPendientes();
      setGastosPendientes(data);

      // Cachear datos
      await empresaService.setCachedData('gastos_pendientes', data);

      console.log(`✅ ${data.length} gastos pendientes cargados exitosamente`);
    } catch (error: any) {
      console.error('❌ Error cargando gastos pendientes:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);

      // Fallback a datos cached
      const cachedData = await empresaService.getCachedData('gastos_pendientes');
      if (cachedData) {
        console.log('📱 Usando datos cached como fallback');
        setGastosPendientes(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadGastosPendientes(false);
    } catch (error) {
      console.log('Error refreshing gastos pendientes:', error);
    }
    setRefreshing(false);
  };

  const handleAprobarGasto = async (gasto: GastoPendiente) => {
    console.log('🟢 Botón APROBAR presionado para gasto:', gasto.id);
    Alert.alert(
      'Aprobar Gasto',
      `¿Estás seguro de que quieres aprobar el gasto "${gasto.concepto}" por ${formatCurrency(gasto.monto)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            console.log('✅ Confirmado aprobar gasto:', gasto.id);
            setProcessing(prev => ({ ...prev, [gasto.id]: true }));
            try {
              const success = await empresaService.aprobarGasto(gasto.id, '');
              if (success) {
                Alert.alert('Éxito', 'Gasto aprobado exitosamente');
                await loadGastosPendientes(false); // Recargar lista
              }
            } catch (error: any) {
              console.error('❌ Error aprobando gasto:', error);
              Alert.alert('Error', getErrorMessage(error));
            } finally {
              setProcessing(prev => ({ ...prev, [gasto.id]: false }));
            }
          }
        }
      ]
    );
  };

  const handleRechazarGasto = async (gasto: GastoPendiente) => {
    console.log('🔴 Botón RECHAZAR presionado para gasto:', gasto.id);

    // Directamente procesar el rechazo sin Alert de confirmación para probar
    console.log('❌ Procesando rechazar gasto:', gasto.id);
    setProcessing(prev => ({ ...prev, [gasto.id]: true }));

    try {
      const success = await empresaService.rechazarGasto(gasto.id, 'Gasto rechazado por la empresa');
      console.log('🔴 Resultado del rechazo:', success);

      if (success) {
        Alert.alert('Éxito', 'Gasto rechazado exitosamente');
        await loadGastosPendientes(false); // Recargar lista
      } else {
        Alert.alert('Error', 'No se pudo rechazar el gasto');
      }
    } catch (error: any) {
      console.error('❌ Error rechazando gasto:', error);
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setProcessing(prev => ({ ...prev, [gasto.id]: false }));
    }
  };

  const openDetailModal = (gasto: GastoPendiente) => {
    setSelectedGasto(gasto);
    setShowDetailModal(true);
    setComentario('');
    setMotivo('');
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedGasto(null);
    setComentario('');
    setMotivo('');
  };

  const handleAprobarFromModal = async () => {
    if (!selectedGasto) return;

    setProcessing(prev => ({ ...prev, [selectedGasto.id]: true }));
    try {
      const success = await empresaService.aprobarGasto(selectedGasto.id, comentario);
      if (success) {
        Alert.alert('Éxito', 'Gasto aprobado exitosamente');
        closeDetailModal();
        await loadGastosPendientes(false);
      }
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setProcessing(prev => ({ ...prev, [selectedGasto.id]: false }));
    }
  };

  const handleRechazarFromModal = async () => {
    if (!selectedGasto || !motivo.trim()) {
      Alert.alert('Error', 'El motivo del rechazo es requerido');
      return;
    }

    setProcessing(prev => ({ ...prev, [selectedGasto.id]: true }));
    try {
      const success = await empresaService.rechazarGasto(selectedGasto.id, motivo);
      if (success) {
        Alert.alert('Éxito', 'Gasto rechazado exitosamente');
        closeDetailModal();
        await loadGastosPendientes(false);
      }
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setProcessing(prev => ({ ...prev, [selectedGasto.id]: false }));
    }
  };

  // Obtener empleados únicos para filtro
  const empleadosUnicos = Array.from(
    new Set(gastosPendientes.map(g => g.empleado.username))
  );

  // Filtrar gastos
  const gastosFiltrados = filtroEmpleado === 'all' 
    ? gastosPendientes 
    : gastosPendientes.filter(g => g.empleado.username === filtroEmpleado);

  const renderGastoCard = (gasto: GastoPendiente, index: number) => {
    const isProcessing = processing[gasto.id] || false;

    return (
      <SlideInView key={gasto.id} direction="up" delay={index * 50} duration={400}>
        <TouchableOpacity
          style={[styles.gastoCard, isDarkMode && styles.darkCard]}
          onPress={() => openDetailModal(gasto)}
          activeOpacity={0.7}
          disabled={isProcessing}
        >
          {/* Header del gasto */}
          <View style={styles.gastoHeader}>
            <View style={styles.gastoMainInfo}>
              <View style={[styles.gastoIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="receipt" size={24} color={colors.warning} />
              </View>
              
              <View style={styles.gastoContent}>
                <Text style={[styles.gastoConcepto, isDarkMode && styles.darkText]}>
                  {gasto.concepto}
                </Text>
                <Text style={[styles.gastoEmpleado, { color: colors.primary }]}>
                  {gasto.empleado.firstName && gasto.empleado.lastName 
                    ? `${gasto.empleado.firstName} ${gasto.empleado.lastName}`
                    : gasto.empleado.username}
                </Text>
                <View style={styles.gastoMeta}>
                  <Text style={[styles.gastoCategoria, isDarkMode && styles.darkTextSecondary]}>
                    {gasto.categoria.nombre}
                  </Text>
                  <Text style={[styles.gastoDot, isDarkMode && styles.darkTextSecondary]}>•</Text>
                  <Text style={[styles.gastoFecha, isDarkMode && styles.darkTextSecondary]}>
                    {new Date(gasto.fecha).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.gastoMonto, isDarkMode && styles.darkText]}>
              {formatCurrency(gasto.monto)}
            </Text>
          </View>

          {/* Descripción si existe */}
          {gasto.descripcion && (
            <Text style={[styles.gastoDescripcion, isDarkMode && styles.darkTextSecondary]}>
              {gasto.descripcion}
            </Text>
          )}

          {/* Información adicional */}
          <View style={styles.gastoInfo}>
            {gasto.proveedor && (
              <View style={styles.gastoInfoItem}>
                <Ionicons name="business" size={14} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                <Text style={[styles.gastoInfoText, isDarkMode && styles.darkTextSecondary]}>
                  {gasto.proveedor}
                </Text>
              </View>
            )}
            
            {gasto.ubicacion && (
              <View style={styles.gastoInfoItem}>
                <Ionicons name="location" size={14} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                <Text style={[styles.gastoInfoText, isDarkMode && styles.darkTextSecondary]}>
                  {gasto.ubicacion}
                </Text>
              </View>
            )}

            <View style={styles.gastoInfoItem}>
              <Ionicons name="time" size={14} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.gastoInfoText, isDarkMode && styles.darkTextSecondary]}>
                {new Date(gasto.createdAt).toLocaleDateString()} {new Date(gasto.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
          </View>

          {/* Acciones rápidas */}
          <View style={styles.gastoActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.approveButton,
                isProcessing && styles.disabledButton
              ]}
              onPress={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!isProcessing) {
                  handleAprobarGasto(gasto);
                }
              }}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Aprobar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.rejectButton,
                isProcessing && styles.disabledButton
              ]}
              onPress={() => {
                console.log('🔴 TouchableOpacity RECHAZAR presionado para gasto:', gasto.id);
                if (!isProcessing) {
                  console.log('🔴 Llamando handleRechazarGasto...');
                  handleRechazarGasto(gasto);
                } else {
                  console.log('🔴 Botón está en processing, ignorando click');
                }
              }}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Rechazar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </SlideInView>
    );
  };

  const renderDetailModal = () => {
    if (!selectedGasto) return null;

    const isProcessing = processing[selectedGasto.id] || false;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeDetailModal}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          {/* Header */}
          <View style={[styles.modalHeader, isDarkMode && styles.darkModalHeader]}>
            <TouchableOpacity onPress={closeDetailModal}>
              <Ionicons name="close" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              Detalle del Gasto
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Información principal */}
            <View style={[styles.detailSection, isDarkMode && styles.darkDetailSection]}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIcon, { backgroundColor: colors.warning + '20' }]}>
                  <Ionicons name="receipt" size={32} color={colors.warning} />
                </View>
                <View style={styles.detailMainInfo}>
                  <Text style={[styles.detailConcepto, isDarkMode && styles.darkText]}>
                    {selectedGasto.concepto}
                  </Text>
                  <Text style={[styles.detailMonto, { color: colors.primary }]}>
                    {formatCurrency(selectedGasto.monto)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Información del empleado */}
            <View style={[styles.detailSection, isDarkMode && styles.darkDetailSection]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Solicitado por
              </Text>
              <View style={styles.empleadoDetail}>
                <View style={[styles.empleadoAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.empleadoInitials, { color: colors.primary }]}>
                    {((selectedGasto.empleado.firstName?.[0] || '') + (selectedGasto.empleado.lastName?.[0] || '') || selectedGasto.empleado.username[0]).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.empleadoNombre, isDarkMode && styles.darkText]}>
                    {selectedGasto.empleado.firstName && selectedGasto.empleado.lastName 
                      ? `${selectedGasto.empleado.firstName} ${selectedGasto.empleado.lastName}`
                      : selectedGasto.empleado.username}
                  </Text>
                  <Text style={[styles.empleadoUsername, isDarkMode && styles.darkTextSecondary]}>
                    @{selectedGasto.empleado.username}
                  </Text>
                </View>
              </View>
            </View>

            {/* Detalles del gasto */}
            <View style={[styles.detailSection, isDarkMode && styles.darkDetailSection]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Detalles
              </Text>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>Categoría:</Text>
                <View style={[styles.categoryBadge, { backgroundColor: (selectedGasto.categoria.color || colors.primary) + '20' }]}>
                  <Text style={[styles.categoryText, { color: selectedGasto.categoria.color || colors.primary }]}>
                    {selectedGasto.categoria.nombre}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>Fecha:</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                  {new Date(selectedGasto.fecha).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>Método de pago:</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                  {selectedGasto.tipoPago.nombre}
                </Text>
              </View>

              {selectedGasto.proveedor && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>Proveedor:</Text>
                  <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                    {selectedGasto.proveedor}
                  </Text>
                </View>
              )}

              {selectedGasto.ubicacion && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>Ubicación:</Text>
                  <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                    {selectedGasto.ubicacion}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>Solicitado:</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                  {new Date(selectedGasto.createdAt).toLocaleDateString()} a las {new Date(selectedGasto.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
            </View>

            {/* Descripción */}
            {selectedGasto.descripcion && (
              <View style={[styles.detailSection, isDarkMode && styles.darkDetailSection]}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                  Descripción
                </Text>
                <Text style={[styles.descripcionText, isDarkMode && styles.darkText]}>
                  {selectedGasto.descripcion}
                </Text>
              </View>
            )}

            {/* Adjunto */}
            {selectedGasto.adjuntoUrl && (
              <View style={[styles.detailSection, isDarkMode && styles.darkDetailSection]}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                  Comprobante
                </Text>
                <TouchableOpacity style={styles.adjuntoContainer}>
                  <Ionicons name="document-attach" size={24} color={colors.primary} />
                  <Text style={[styles.adjuntoText, { color: colors.primary }]}>
                    Ver comprobante
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notas adicionales */}
            {selectedGasto.notas && (
              <View style={[styles.detailSection, isDarkMode && styles.darkDetailSection]}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                  Notas adicionales
                </Text>
                <Text style={[styles.descripcionText, isDarkMode && styles.darkText]}>
                  {selectedGasto.notas}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Acciones del modal */}
          <View style={[styles.modalActions, isDarkMode && styles.darkModalActions]}>
            <TouchableOpacity
              style={[styles.modalActionButton, styles.rejectModalButton]}
              onPress={handleRechazarFromModal}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close" size={20} color="#fff" />
                  <Text style={styles.modalActionButtonText}>Rechazar</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalActionButton, styles.approveModalButton]}
              onPress={handleAprobarFromModal}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.modalActionButtonText}>Aprobar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // Loading state
  if (loading && gastosPendientes.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
            Aprobación de Gastos
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.statsContainer}>
          <CardSkeleton showHeader={false} lines={1} style={styles.statsSkeleton} />
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <ListSkeleton items={4} itemHeight={160} style={{ marginHorizontal: wp(4) }} />
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
          Aprobación de Gastos
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, isDarkMode && styles.darkStatsContainer]}>
        <SlideInView direction="left" delay={100} duration={400}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {gastosFiltrados.length}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
              Pendientes
            </Text>
          </View>
        </SlideInView>

        <SlideInView direction="right" delay={200} duration={400}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
              {gastosFiltrados.reduce((sum, g) => sum + g.monto, 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
              Total
            </Text>
          </View>
        </SlideInView>
      </View>

      {/* Filtros */}
      {empleadosUnicos.length > 1 && (
        <View style={[styles.filtersContainer, isDarkMode && styles.darkFiltersContainer]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filtroEmpleado === 'all' && styles.filterChipActive,
                isDarkMode && styles.darkFilterChip,
                filtroEmpleado === 'all' && isDarkMode && styles.darkFilterChipActive
              ]}
              onPress={() => setFiltroEmpleado('all')}
            >
              <Text style={[
                styles.filterChipText,
                filtroEmpleado === 'all' && styles.filterChipTextActive,
                isDarkMode && styles.darkText,
                filtroEmpleado === 'all' && { color: '#fff' }
              ]}>
                Todos
              </Text>
            </TouchableOpacity>

            {empleadosUnicos.map((empleado) => (
              <TouchableOpacity
                key={empleado}
                style={[
                  styles.filterChip,
                  filtroEmpleado === empleado && styles.filterChipActive,
                  isDarkMode && styles.darkFilterChip,
                  filtroEmpleado === empleado && isDarkMode && styles.darkFilterChipActive
                ]}
                onPress={() => setFiltroEmpleado(empleado)}
              >
                <Text style={[
                  styles.filterChipText,
                  filtroEmpleado === empleado && styles.filterChipTextActive,
                  isDarkMode && styles.darkText,
                  filtroEmpleado === empleado && { color: '#fff' }
                ]}>
                  {empleado}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Lista de gastos */}
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
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              <Text style={[styles.emptyStateTitle, isDarkMode && styles.darkText]}>
                No hay gastos pendientes
              </Text>
              <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                {filtroEmpleado === 'all' 
                  ? 'No hay gastos pendientes de aprobación'
                  : `No hay gastos pendientes de ${filtroEmpleado}`}
              </Text>
            </View>
          </SlideInView>
        )}

        <View style={{ height: hp(4) }} />
      </ScrollView>

      {/* Modal de detalle */}
      {renderDetailModal()}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingVertical: 12,
  },
  darkFiltersContainer: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  filtersScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: colors.light.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  darkFilterChip: {
    backgroundColor: colors.dark.background,
    borderColor: colors.dark.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  darkFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.light.text,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  gastoEmpleado: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  gastoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gastoCategoria: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoDot: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginHorizontal: 6,
  },
  gastoFecha: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoMonto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  gastoDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  gastoInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  gastoInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gastoInfoText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: 90,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
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

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  darkModalHeader: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...globalStyles.shadow,
  },
  darkDetailSection: {
    backgroundColor: colors.dark.surface,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailMainInfo: {
    flex: 1,
  },
  detailConcepto: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  detailMonto: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 12,
  },
  empleadoDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empleadoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empleadoInitials: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  empleadoNombre: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  empleadoUsername: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.light.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  descripcionText: {
    fontSize: 14,
    color: colors.light.text,
    lineHeight: 20,
  },
  adjuntoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  adjuntoText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    gap: 12,
  },
  darkModalActions: {
    backgroundColor: colors.dark.surface,
    borderTopColor: colors.dark.border,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveModalButton: {
    backgroundColor: colors.success,
  },
  rejectModalButton: {
    backgroundColor: colors.error,
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Skeleton styles
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

export default AprobacionGastos;