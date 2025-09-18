import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { proyectoService, Proyecto, EstadisticasProyectos } from '../../services/proyectoService';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

const { width } = Dimensions.get('window');

interface CompanyProjectsProps {
  route: {
    params: {
      companyId: number;
      companyName: string;
    };
  };
  navigation: any;
}

const CompanyProjects: React.FC<CompanyProjectsProps> = ({ route, navigation }) => {
  const { companyId, companyName } = route.params;
  const { isDarkMode } = useTheme();

  const [proyectos, setProyectos] = React.useState<Proyecto[]>([]);
  const [estadisticas, setEstadisticas] = React.useState<EstadisticasProyectos | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await proyectoService.getProyectosEmpresaAdmin(companyId);
      setProyectos(data.proyectos);
      setEstadisticas(data.estadisticas);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los proyectos de la empresa');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const verDetalleProyecto = (proyectoId: number) => {
    navigation.navigate('AdminProjectDetail', { proyectoId, companyName });
  };

  // Renderizar estadísticas
  const renderEstadisticas = () => {
    if (!estadisticas) return null;

    return (
      <View style={[styles.estadisticasContainer, isDarkMode && styles.estadisticasContainerDark]}>
        <View style={styles.estadisticasHeader}>
          <Ionicons name="analytics-outline" size={24} color="#3498db" />
          <Text style={[styles.estadisticasTitle, isDarkMode && styles.estadisticasTitleDark]}>Resumen de Proyectos</Text>
        </View>
        <View style={styles.estadisticasGrid}>
          <View style={styles.estadisticaCard}>
            <View style={[styles.estadisticaIcon, { backgroundColor: '#3498db15' }]}>
              <Ionicons name="folder-outline" size={20} color="#3498db" />
            </View>
            <Text style={[styles.estadisticaNumero, isDarkMode && styles.estadisticaNumeroDark]}>{estadisticas.totalProyectos}</Text>
            <Text style={[styles.estadisticaLabel, isDarkMode && styles.estadisticaLabelDark]}>Total</Text>
          </View>

          <View style={styles.estadisticaCard}>
            <View style={[styles.estadisticaIcon, { backgroundColor: '#27ae6015' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#27ae60" />
            </View>
            <Text style={[styles.estadisticaNumero, { color: '#27ae60' }, isDarkMode && styles.estadisticaNumeroDark]}>
              {estadisticas.proyectosCompletados}
            </Text>
            <Text style={[styles.estadisticaLabel, isDarkMode && styles.estadisticaLabelDark]}>Completados</Text>
          </View>

          <View style={styles.estadisticaCard}>
            <View style={[styles.estadisticaIcon, { backgroundColor: '#f39c1215' }]}>
              <Ionicons name="play-circle-outline" size={20} color="#f39c12" />
            </View>
            <Text style={[styles.estadisticaNumero, { color: '#f39c12' }, isDarkMode && styles.estadisticaNumeroDark]}>
              {estadisticas.proyectosActivos}
            </Text>
            <Text style={[styles.estadisticaLabel, isDarkMode && styles.estadisticaLabelDark]}>Activos</Text>
          </View>

          <View style={styles.estadisticaCard}>
            <View style={[styles.estadisticaIcon, { backgroundColor: '#9b59b615' }]}>
              <Ionicons name="trending-up-outline" size={20} color="#9b59b6" />
            </View>
            <Text style={[styles.estadisticaNumero, { color: '#9b59b6' }, isDarkMode && styles.estadisticaNumeroDark]}>
              {Math.round(estadisticas.progresoPromedio)}%
            </Text>
            <Text style={[styles.estadisticaLabel, isDarkMode && styles.estadisticaLabelDark]}>Progreso</Text>
          </View>
        </View>

        {estadisticas.presupuestoTotal > 0 && (
          <View style={styles.presupuestoTotal}>
            <Ionicons name="cash-outline" size={20} color="#27ae60" />
            <Text style={styles.presupuestoTexto}>
              Presupuesto Total: ${estadisticas.presupuestoTotal.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Renderizar proyecto
  const renderProyecto = (proyecto: Proyecto) => {
    const diasRestantes = proyectoService.diasRestantes(proyecto.fechaLimite);
    const colorProgreso = proyectoService.getColorProgreso(proyecto.progresoporcentaje);
    const colorPrioridad = proyectoService.getColorPrioridad(proyecto.prioridad);

    return (
      <TouchableOpacity
        key={proyecto.id}
        style={[styles.proyectoCard, isDarkMode && styles.proyectoCardDark]}
        onPress={() => verDetalleProyecto(proyecto.id)}
      >
        {/* Header */}
        <View style={styles.proyectoHeader}>
          <View style={styles.proyectoTitleRow}>
            <Text style={[styles.proyectoTitle, isDarkMode && styles.proyectoTitleDark]} numberOfLines={2}>
              {proyecto.titulo}
            </Text>
            <View style={[styles.prioridadBadge, { backgroundColor: colorPrioridad }]}>
              <Text style={styles.prioridadText}>{proyecto.prioridad.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.estadoRow}>
            <View style={[styles.estadoBadge, { backgroundColor: proyecto.estado.color }]}>
              <Text style={styles.estadoText}>{proyecto.estado.nombre}</Text>
            </View>
            {diasRestantes !== null && (
              <View style={styles.fechaInfo}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={diasRestantes < 0 ? '#e74c3c' : diasRestantes <= 7 ? '#f39c12' : (isDarkMode ? colors.dark.textSecondary : '#7f8c8d')}
                />
                <Text style={[
                  styles.fechaTexto,
                  { color: diasRestantes < 0 ? '#e74c3c' : diasRestantes <= 7 ? '#f39c12' : (isDarkMode ? colors.dark.textSecondary : '#7f8c8d') }
                ]}>
                  {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d vencido` :
                   diasRestantes === 0 ? 'Vence hoy' :
                   `${diasRestantes}d restantes`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Descripción */}
        {proyecto.descripcion && (
          <Text style={[styles.proyectoDescripcion, isDarkMode && styles.proyectoDescripcionDark]} numberOfLines={2}>
            {proyecto.descripcion}
          </Text>
        )}

        {/* Progreso */}
        <View style={styles.progresoSection}>
          <View style={styles.progresoHeader}>
            <Text style={[styles.progresoLabel, isDarkMode && styles.progresoLabelDark]}>Progreso</Text>
            <Text style={[styles.progresoTexto, { color: colorProgreso }]}>
              {Math.round(proyecto.progresoporcentaje)}%
            </Text>
          </View>
          <View style={[styles.progresoBarContainer, isDarkMode && styles.progresoBarContainerDark]}>
            <View
              style={[
                styles.progresoBar,
                {
                  width: `${proyecto.progresoporcentaje}%`,
                  backgroundColor: colorProgreso,
                },
              ]}
            />
          </View>
        </View>

        {/* Metas y presupuesto */}
        <View style={styles.proyectoFooter}>
          <View style={styles.metasInfo}>
            <Ionicons name="list-outline" size={16} color={isDarkMode ? colors.dark.textSecondary : "#7f8c8d"} />
            <Text style={[styles.metasTexto, isDarkMode && styles.metasTextoDark]}>
              {proyecto.estadisticas.metasCompletadas}/{proyecto.estadisticas.totalMetas} metas
            </Text>
          </View>
          {proyecto.presupuesto > 0 && (
            <Text style={styles.presupuestoTexto}>
              ${proyecto.presupuesto.toLocaleString()}
            </Text>
          )}
        </View>

        {/* Info de empresa */}
        <View style={[styles.empresaInfo, isDarkMode && styles.empresaInfoDark]}>
          <Ionicons name="business-outline" size={14} color={isDarkMode ? colors.dark.textSecondary : "#95a5a6"} />
          <Text style={[styles.empresaTexto, isDarkMode && styles.empresaTextoDark]}>
            Creado por: {proyecto.creadoPor} • {proyectoService.formatearFecha(proyecto.creadoEn)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
         <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Cargando...</Text>
          <View style={{width: 24}}/>
        </View>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Proyectos</Text>
            <Text style={[styles.headerSubtitle, isDarkMode && styles.headerSubtitleDark]}>{companyName}</Text>
        </View>
        <TouchableOpacity 
            onPress={() => navigation.navigate('CompanyProjectStats', { companyId, companyName })} 
            style={styles.headerButton}
        >
            <Ionicons name="analytics-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Estadísticas */}
        {renderEstadisticas()}

        {/* Lista de proyectos */}
        <View style={styles.proyectosContainer}>
          <View style={styles.proyectosSectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
              Proyectos ({proyectos.length})
            </Text>
            <View style={[styles.ordenarButton, isDarkMode && styles.ordenarButtonDark]}>
              <Ionicons name="filter-outline" size={16} color={isDarkMode ? colors.dark.textSecondary : "#7f8c8d"} />
              <Text style={[styles.ordenarTexto, isDarkMode && styles.ordenarTextoDark]}>Recientes</Text>
            </View>
          </View>

          {proyectos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={80} color="#bdc3c7" />
              <Text style={[styles.emptyTitle, isDarkMode && styles.emptyTitleDark]}>Sin proyectos</Text>
              <Text style={[styles.emptyMessage, isDarkMode && styles.emptyMessageDark]}>
                Esta empresa aún no ha creado ningún proyecto.
              </Text>
            </View>
          ) : (
            proyectos.map(renderProyecto)
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background, paddingTop: 50 },
  containerDark: { backgroundColor: colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  headerDark: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
  headerButton: { padding: 4 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.light.text },
  headerTitleDark: { color: colors.dark.text },
  headerSubtitle: { fontSize: 14, color: colors.light.textSecondary },
  headerSubtitleDark: { color: colors.dark.textSecondary },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  backButton: {
    padding: 8,
  },
  statsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  estadisticasContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  estadisticasContainerDark: {
    backgroundColor: colors.dark.surface,
  },
  estadisticasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  estadisticasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  estadisticasTitleDark: {
    color: colors.dark.text,
  },
  estadisticasGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  estadisticaCard: {
    alignItems: 'center',
    flex: 1,
  },
  estadisticaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  estadisticaNumero: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  estadisticaNumeroDark: {
    color: colors.dark.text,
  },
  estadisticaLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  estadisticaLabelDark: {
    color: colors.dark.textSecondary,
  },
  presupuestoTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  presupuestoTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
    marginLeft: 8,
  },
  proyectosContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  proyectosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sectionTitleDark: {
    color: colors.dark.text,
  },
  ordenarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  ordenarButtonDark: {
    backgroundColor: colors.dark.background,
    borderColor: colors.dark.border,
  },
  ordenarTexto: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  ordenarTextoDark: {
    color: colors.dark.textSecondary,
  },
  proyectoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  proyectoCardDark: {
    backgroundColor: colors.dark.surface,
  },
  proyectoHeader: {
    marginBottom: 12,
  },
  proyectoTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  proyectoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 12,
  },
  proyectoTitleDark: {
    color: colors.dark.text,
  },
  prioridadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prioridadText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  estadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  fechaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fechaTexto: {
    fontSize: 12,
    marginLeft: 4,
  },
  proyectoDescripcion: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    lineHeight: 20,
  },
  proyectoDescripcionDark: {
    color: colors.dark.textSecondary,
  },
  progresoSection: {
    marginBottom: 15,
  },
  progresoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progresoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  progresoLabelDark: {
    color: colors.dark.textSecondary,
  },
  progresoTexto: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progresoBarContainer: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progresoBarContainerDark: {
    backgroundColor: colors.dark.border,
  },
  progresoBar: {
    height: '100%',
    borderRadius: 4,
  },
  proyectoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metasInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metasTexto: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 6,
  },
  metasTextoDark: {
    color: colors.dark.textSecondary,
  },
  empresaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  empresaInfoDark: {
    borderTopColor: colors.dark.border,
  },
  empresaTexto: {
    fontSize: 12,
    color: '#95a5a6',
    marginLeft: 6,
  },
  empresaTextoDark: {
    color: colors.dark.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTitleDark: {
    color: colors.dark.text,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  emptyMessageDark: {
    color: colors.dark.textSecondary,
  },
});

export default CompanyProjects;