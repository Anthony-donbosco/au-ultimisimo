import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';
import { proyectoService, Proyecto, Meta, GastoProyecto } from '../../services/proyectoService';

interface DetalleProyectoProps {
  navigation: any;
  route: {
    params: {
      proyectoId: number;
    };
  };
}

const DetalleProyecto: React.FC<DetalleProyectoProps> = ({ navigation, route }) => {
  const { isDarkMode } = useTheme();
  const { proyectoId } = route.params;

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [gastosHistorial, setGastosHistorial] = useState<GastoProyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMetaModal, setShowAddMetaModal] = useState(false);
  const [showAddGastoModal, setShowAddGastoModal] = useState(false);
  const [nuevaMeta, setNuevaMeta] = useState({
    titulo: '',
    descripcion: '',
    fechaLimite: '',
  });
  const [nuevoGasto, setNuevoGasto] = useState({
    concepto: '',
    monto: '',
    fechaGasto: new Date().toISOString().split('T')[0],
    descripcion: '',
  });

  // Cargar datos del proyecto
  const cargarProyecto = async () => {
    try {
      setLoading(true);
      const proyectoData = await proyectoService.getProyectoDetalle(proyectoId);
      setProyecto(proyectoData);

      // Cargar historial de gastos si el proyecto tiene presupuesto
      if (proyectoData.presupuesto > 0) {
        try {
          const gastos = await proyectoService.getGastosProyecto(proyectoId);
          setGastosHistorial(gastos);
        } catch (gastosError) {
          console.error('Error cargando gastos:', gastosError);
          // No mostrar error al usuario, solo logging
        }
      }
    } catch (error) {
      console.error('Error cargando proyecto:', error);
      Alert.alert('Error', 'No se pudo cargar el proyecto');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Refrescar datos
  const onRefresh = async () => {
    setRefreshing(true);
    await cargarProyecto();
    setRefreshing(false);
  };

  // Cargar datos al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarProyecto();
    }, [proyectoId])
  );

  // Completar/descompletar meta
  const toggleMeta = async (metaId: number, completado: boolean) => {
    try {
      if (completado) {
        await proyectoService.completarMeta(metaId);
      } else {
        // Aquí podrías agregar función para descompletar si es necesario
        Alert.alert('Info', 'Funcionalidad para descompletar próximamente');
        return;
      }

      Alert.alert('Éxito', 'Meta actualizada exitosamente');
      await cargarProyecto(); // Recargar datos
    } catch (error) {
      console.error('Error actualizando meta:', error);
      Alert.alert('Error', 'No se pudo actualizar la meta');
    }
  };

  // Agregar nueva meta
  const agregarMeta = async () => {
    if (!nuevaMeta.titulo.trim()) {
      Alert.alert('Error', 'El título de la meta es requerido');
      return;
    }

    try {
      await proyectoService.agregarMeta(proyectoId, {
        titulo: nuevaMeta.titulo,
        descripcion: nuevaMeta.descripcion,
        fechaLimite: nuevaMeta.fechaLimite || undefined,
      });

      Alert.alert('Éxito', 'Meta agregada exitosamente');
      setShowAddMetaModal(false);
      setNuevaMeta({ titulo: '', descripcion: '', fechaLimite: '' });
      await cargarProyecto(); // Recargar datos
    } catch (error) {
      console.error('Error agregando meta:', error);
      Alert.alert('Error', 'No se pudo agregar la meta');
    }
  };

  // Agregar nuevo gasto
  const agregarGasto = async () => {
    if (!nuevoGasto.concepto.trim()) {
      Alert.alert('Error', 'El concepto del gasto es requerido');
      return;
    }

    if (!nuevoGasto.monto || parseFloat(nuevoGasto.monto) <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return;
    }

    try {
      await proyectoService.agregarGasto(proyectoId, {
        concepto: nuevoGasto.concepto,
        monto: parseFloat(nuevoGasto.monto),
        fechaGasto: nuevoGasto.fechaGasto,
        descripcion: nuevoGasto.descripcion || undefined,
      });

      Alert.alert('Éxito', 'Progreso económico registrado exitosamente');
      setShowAddGastoModal(false);
      setNuevoGasto({
        concepto: '',
        monto: '',
        fechaGasto: new Date().toISOString().split('T')[0],
        descripcion: ''
      });
      await cargarProyecto(); // Recargar datos
    } catch (error) {
      console.error('Error agregando gasto:', error);
      Alert.alert('Error', 'No se pudo registrar el progreso económico');
    }
  };

  // Renderizar meta
  const renderMeta = (meta: Meta, index: number) => {
    return (
      <View key={meta.id} style={[styles.metaCard, isDarkMode && styles.darkCard]}>
        <View style={styles.metaHeader}>
          <TouchableOpacity
            style={styles.metaCheckbox}
            onPress={() => toggleMeta(meta.id, !meta.completado)}
          >
            <Ionicons
              name={meta.completado ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={meta.completado ? colors.success : colors.primary}
            />
          </TouchableOpacity>

          <View style={styles.metaContent}>
            <Text style={[
              styles.metaTitulo,
              isDarkMode && styles.darkText,
              meta.completado && styles.metaCompletada
            ]}>
              {meta.titulo}
            </Text>

            {meta.descripcion && (
              <Text style={[
                styles.metaDescripcion,
                isDarkMode && styles.darkTextSecondary,
                meta.completado && styles.metaCompletada
              ]}>
                {meta.descripcion}
              </Text>
            )}

            <View style={styles.metaInfo}>
              {meta.fechaLimite && (
                <Text style={[styles.metaFecha, isDarkMode && styles.darkTextSecondary]}>
                  📅 {proyectoService.formatearFecha(meta.fechaLimite)}
                </Text>
              )}
              {meta.completado && meta.fechaCompletado && (
                <Text style={[styles.metaCompletadoFecha, { color: colors.success }]}>
                  ✅ Completado: {proyectoService.formatearFecha(meta.fechaCompletado)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Renderizar gasto del historial
  const renderGastoHistorial = (gasto: GastoProyecto, index: number) => {
    return (
      <View key={gasto.id} style={[styles.gastoCard, isDarkMode && styles.darkCard]}>
        <View style={styles.gastoHeader}>
          <View style={styles.gastoIconContainer}>
            <Ionicons name="trending-up" size={20} color={colors.success} />
          </View>
          <View style={styles.gastoContent}>
            <View style={styles.gastoTitleRow}>
              <Text style={[styles.gastoTitulo, isDarkMode && styles.darkText]}>
                {gasto.concepto}
              </Text>
              <Text style={[styles.gastoMonto, { color: colors.success }]}>
                +${gasto.monto.toLocaleString()}
              </Text>
            </View>

            {gasto.descripcion && (
              <Text style={[styles.gastoDescripcion, isDarkMode && styles.darkTextSecondary]}>
                {gasto.descripcion}
              </Text>
            )}

            <View style={styles.gastoInfo}>
              <Text style={[styles.gastoFecha, isDarkMode && styles.darkTextSecondary]}>
                📅 {proyectoService.formatearFecha(gasto.fechaGasto || gasto.creadoEn)}
              </Text>
              <Text style={[styles.gastoCreadoPor, isDarkMode && styles.darkTextSecondary]}>
                👤 {gasto.creadoPor}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.loadingText, isDarkMode && styles.darkTextSecondary]}>
          Cargando proyecto...
        </Text>
      </View>
    );
  }

  if (!proyecto) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.loadingText, isDarkMode && styles.darkTextSecondary]}>
          Proyecto no encontrado
        </Text>
      </View>
    );
  }

  // Usar progreso económico en lugar del progreso de metas
  const porcentajeEconomico = proyecto.porcentajeGastado || 0;
  const colorProgreso = colors.primary; // Color dorado fijo
  const colorPrioridad = proyectoService.getColorPrioridad(proyecto.prioridad);
  const diasRestantes = proyecto.fechaLimite ? proyectoService.diasRestantes(proyecto.fechaLimite) : null;

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]} numberOfLines={2}>
            {proyecto.titulo}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          {proyecto.presupuesto > 0 && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.success }]}
              onPress={() => setShowAddGastoModal(true)}
            >
              <Ionicons name="trending-up" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddMetaModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Información del proyecto */}
        <View style={[styles.proyectoInfoCard, isDarkMode && styles.darkCard]}>
          <View style={styles.proyectoInfoHeader}>
            <View style={[styles.estadoBadge, { backgroundColor: proyecto.estado.color }]}>
              <Text style={styles.estadoText}>{proyecto.estado.nombre}</Text>
            </View>
            <View style={[styles.prioridadBadge, { backgroundColor: colorPrioridad }]}>
              <Text style={styles.prioridadText}>{proyecto.prioridad.toUpperCase()}</Text>
            </View>
          </View>

          {proyecto.descripcion && (
            <Text style={[styles.proyectoDescripcion, isDarkMode && styles.darkTextSecondary]}>
              {proyecto.descripcion}
            </Text>
          )}

          {/* Progreso Económico */}
          <View style={styles.progresoContainer}>
            <View style={styles.progresoInfo}>
              <Text style={[styles.progresoLabel, isDarkMode && styles.darkTextSecondary]}>
                Progreso Económico
              </Text>
              <Text style={[styles.progresoTexto, { color: colorProgreso }]}>
                {Math.round(porcentajeEconomico)}%
              </Text>
            </View>
            <View style={styles.progresoBarContainer}>
              <View
                style={[
                  styles.progresoBar,
                  {
                    width: `${porcentajeEconomico}%`,
                    backgroundColor: colorProgreso,
                  },
                ]}
              />
            </View>
            {proyecto.presupuesto > 0 && (
              <View style={styles.presupuestoInfo}>
                <Text style={[styles.presupuestoTexto, isDarkMode && styles.darkTextSecondary]}>
                  ${proyecto.montoGastado?.toLocaleString() || '0'} de ${proyecto.presupuesto.toLocaleString()}
                </Text>
                {proyecto.montoRestante !== undefined && (
                  <Text style={[styles.presupuestoRestante, isDarkMode && styles.darkTextSecondary]}>
                    Restante: ${proyecto.montoRestante.toLocaleString()}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Información adicional */}
          <View style={styles.infoGrid}>
            {proyecto.fechaInicio && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, isDarkMode && styles.darkTextSecondary]}>
                  Inicio
                </Text>
                <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>
                  {proyectoService.formatearFecha(proyecto.fechaInicio)}
                </Text>
              </View>
            )}

            {proyecto.fechaLimite && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, isDarkMode && styles.darkTextSecondary]}>
                  Límite
                </Text>
                <Text style={[
                  styles.infoValue,
                  isDarkMode && styles.darkText,
                  diasRestantes !== null && diasRestantes < 0 && { color: colors.error }
                ]}>
                  {proyectoService.formatearFecha(proyecto.fechaLimite)}
                </Text>
              </View>
            )}

            {proyecto.presupuesto > 0 && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, isDarkMode && styles.darkTextSecondary]}>
                  Presupuesto
                </Text>
                <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>
                  ${proyecto.presupuesto.toLocaleString()}
                </Text>
              </View>
            )}

            {proyecto.montoGastado !== undefined && proyecto.presupuesto > 0 && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, isDarkMode && styles.darkTextSecondary]}>
                  Invertido
                </Text>
                <Text style={[
                  styles.infoValue,
                  isDarkMode && styles.darkText,
                  { color: proyectoService.getColorPorcentajeGastado(proyecto.porcentajeGastado || 0) }
                ]}>
                  ${proyecto.montoGastado.toLocaleString()} ({proyecto.porcentajeGastado?.toFixed(1)}%)
                </Text>
              </View>
            )}
          </View>


          {diasRestantes !== null && (
            <View style={styles.diasRestantesContainer}>
              <Ionicons
                name="time-outline"
                size={16}
                color={diasRestantes < 0 ? colors.error : diasRestantes <= 7 ? colors.warning : colors.primary}
              />
              <Text style={[
                styles.diasRestantesText,
                { color: diasRestantes < 0 ? colors.error : diasRestantes <= 7 ? colors.warning : colors.primary }
              ]}>
                {diasRestantes < 0 ? `${Math.abs(diasRestantes)} días vencido` :
                 diasRestantes === 0 ? 'Vence hoy' :
                 `${diasRestantes} días restantes`}
              </Text>
            </View>
          )}
        </View>

        {/* Metas */}
        <View style={[styles.metasContainer, isDarkMode && styles.darkCard]}>
          <View style={styles.metasHeader}>
            <Text style={[styles.metasTitle, isDarkMode && styles.darkText]}>
              Metas ({proyecto.metas?.filter(m => m.completado).length || 0}/{proyecto.metas?.length || 0})
            </Text>
          </View>

          {(!proyecto.metas || proyecto.metas.length === 0) ? (
            <View style={styles.emptyMetas}>
              <Ionicons name="flag-outline" size={48} color={colors.light.textTertiary} />
              <Text style={[styles.emptyMetasText, isDarkMode && styles.darkTextSecondary]}>
                No hay metas definidas para este proyecto
              </Text>
              <TouchableOpacity
                style={styles.addFirstMetaButton}
                onPress={() => setShowAddMetaModal(true)}
              >
                <Text style={styles.addFirstMetaButtonText}>Agregar Primera Meta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            proyecto.metas?.map(renderMeta)
          )}
        </View>

        {/* Historial Económico */}
        {proyecto.presupuesto > 0 && (
          <View style={[styles.historialContainer, isDarkMode && styles.darkCard]}>
            <View style={styles.historialHeader}>
              <Text style={[styles.historialTitle, isDarkMode && styles.darkText]}>
                📈 Historial de Progreso Económico ({gastosHistorial.length})
              </Text>
            </View>

            {gastosHistorial.length === 0 ? (
              <View style={styles.emptyHistorial}>
                <Ionicons name="bar-chart-outline" size={48} color={colors.light.textTertiary} />
                <Text style={[styles.emptyHistorialText, isDarkMode && styles.darkTextSecondary]}>
                  No hay registros de progreso económico
                </Text>
                <Text style={[styles.emptyHistorialSubtext, isDarkMode && styles.darkTextSecondary]}>
                  Los registros aparecerán aquí cuando agregues avances económicos
                </Text>
              </View>
            ) : (
              <View style={styles.historialList}>
                {gastosHistorial
                  .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
                  .map(renderGastoHistorial)
                }
              </View>
            )}
          </View>
        )}

        {proyecto.notas && (
          <View style={[styles.notasContainer, isDarkMode && styles.darkCard]}>
            <Text style={[styles.notasTitle, isDarkMode && styles.darkText]}>
              📝 Notas
            </Text>
            <Text style={[styles.notasTexto, isDarkMode && styles.darkTextSecondary]}>
              {proyecto.notas}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal para agregar meta */}
      <Modal
        visible={showAddMetaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMetaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isDarkMode && styles.darkCard]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                Nueva Meta
              </Text>
              <TouchableOpacity onPress={() => setShowAddMetaModal(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkText]}>
                  Título *
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkInput]}
                  value={nuevaMeta.titulo}
                  onChangeText={(text) => setNuevaMeta(prev => ({ ...prev, titulo: text }))}
                  placeholder="Título de la meta"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkText]}>
                  Descripción
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, isDarkMode && styles.darkInput]}
                  value={nuevaMeta.descripcion}
                  onChangeText={(text) => setNuevaMeta(prev => ({ ...prev, descripcion: text }))}
                  placeholder="Descripción de la meta"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddMetaModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={agregarMeta}
                >
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para agregar gasto */}
      <Modal
        visible={showAddGastoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddGastoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isDarkMode && styles.darkCard]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                Registrar Progreso Económico
              </Text>
              <TouchableOpacity onPress={() => setShowAddGastoModal(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkText]}>
                  Concepto del Progreso *
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkInput]}
                  value={nuevoGasto.concepto}
                  onChangeText={(text) => setNuevoGasto(prev => ({ ...prev, concepto: text }))}
                  placeholder="Ej: Compra de materiales, pago de servicios"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkText]}>
                  Monto * ($)
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkInput]}
                  value={nuevoGasto.monto}
                  onChangeText={(text) => setNuevoGasto(prev => ({ ...prev, monto: text }))}
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkText]}>
                  Fecha *
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkInput]}
                  value={nuevoGasto.fechaGasto}
                  onChangeText={(text) => setNuevoGasto(prev => ({ ...prev, fechaGasto: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkText]}>
                  Descripción
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, isDarkMode && styles.darkInput]}
                  value={nuevoGasto.descripcion}
                  onChangeText={(text) => setNuevoGasto(prev => ({ ...prev, descripcion: text }))}
                  placeholder="Detalles adicionales del progreso económico"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddGastoModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={agregarGasto}
                >
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  proyectoInfoCard: {
    backgroundColor: colors.light.surface,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  proyectoInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  prioridadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  prioridadText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  proyectoDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  progresoContainer: {
    marginBottom: 16,
  },
  progresoEconomicoContainer: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  progresoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progresoLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  progresoTexto: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progresoBarContainer: {
    height: 8,
    backgroundColor: colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progresoBar: {
    height: '100%',
    borderRadius: 4,
  },
  presupuestoInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  presupuestoTexto: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  presupuestoRestante: {
    fontSize: 11,
    color: colors.light.textTertiary,
    fontStyle: 'italic',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    width: '48%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
  },
  diasRestantesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  diasRestantesText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  montoRestanteText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  metasContainer: {
    backgroundColor: colors.light.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metasHeader: {
    marginBottom: 16,
  },
  metasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  metaCard: {
    backgroundColor: colors.light.surfaceSecondary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaCheckbox: {
    marginRight: 12,
    marginTop: 2,
  },
  metaContent: {
    flex: 1,
  },
  metaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  metaDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  metaInfo: {
    flexDirection: 'column',
    gap: 4,
  },
  metaFecha: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  metaCompletadoFecha: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaCompletada: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  emptyMetas: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMetasText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  addFirstMetaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstMetaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notasContainer: {
    backgroundColor: colors.light.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notasTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 8,
  },
  notasTexto: {
    fontSize: 14,
    color: colors.light.textSecondary,
    lineHeight: 20,
  },
  // Estilos para historial económico
  historialContainer: {
    backgroundColor: colors.light.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historialHeader: {
    marginBottom: 16,
  },
  historialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  historialList: {
    gap: 12,
  },
  emptyHistorial: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistorialText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyHistorialSubtext: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  gastoCard: {
    backgroundColor: colors.light.surfaceSecondary,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  gastoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gastoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gastoContent: {
    flex: 1,
  },
  gastoTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  gastoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  gastoMonto: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gastoDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  gastoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  gastoFecha: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoCreadoPor: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.light.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.light.text,
    backgroundColor: colors.light.background,
  },
  darkInput: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    color: colors.dark.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.light.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    marginLeft: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Dark mode styles
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default DetalleProyecto;