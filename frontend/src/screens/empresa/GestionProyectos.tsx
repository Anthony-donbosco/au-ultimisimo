import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';
import { proyectoService, Proyecto, EstadisticasProyectos } from '../../services/proyectoService';

const { width } = Dimensions.get('window');

interface GestionProyectosProps {
  navigation: any;
}

const GestionProyectos: React.FC<GestionProyectosProps> = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasProyectos | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar datos iniciales
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [proyectosData, estadisticasData] = await Promise.all([
        proyectoService.getProyectos(),
        proyectoService.getEstadisticas(),
      ]);

      setProyectos(proyectosData);
      setEstadisticas(estadisticasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los proyectos');
    } finally {
      setLoading(false);
    }
  };

  // Refrescar datos
  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  // Cargar datos al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  // Navegar a crear proyecto
  const navegarACrearProyecto = () => {
    navigation.navigate('CrearProyecto');
  };

  // Navegar a detalle de proyecto
  const navegarADetalleProyecto = (proyectoId: number) => {
    navigation.navigate('DetalleProyecto', { proyectoId });
  };

  // Eliminar proyecto
  const eliminarProyecto = async (proyecto: Proyecto) => {
    Alert.alert(
      'Eliminar Proyecto',
      `¿Estás seguro de que deseas eliminar "${proyecto.titulo}"?\n\nEsta acción no se puede deshacer y se eliminarán todas las metas, gastos y datos asociados a este proyecto.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await proyectoService.eliminarProyecto(proyecto.id);
              Alert.alert('Éxito', 'Proyecto eliminado correctamente');
              await cargarDatos(); // Recargar la lista
            } catch (error) {
              console.error('Error eliminando proyecto:', error);
              Alert.alert('Error', 'No se pudo eliminar el proyecto');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Renderizar tarjeta de estadísticas
  const renderEstadisticas = () => {
    if (!estadisticas) return null;

    return (
      <View style={[styles.estadisticasContainer, isDarkMode && styles.darkCard]}>
        <Text style={[styles.estadisticasTitle, isDarkMode && styles.darkText]}>Resumen de Proyectos</Text>
        <View style={styles.estadisticasGrid}>
          <View style={styles.estadisticaItem}>
            <Text style={[styles.estadisticaNumero, isDarkMode && styles.darkText]}>{estadisticas.totalProyectos}</Text>
            <Text style={[styles.estadisticaLabel, isDarkMode && styles.darkTextSecondary]}>Total</Text>
          </View>
          <View style={styles.estadisticaItem}>
            <Text style={[styles.estadisticaNumero, { color: '#27ae60' }]}>
              {estadisticas.proyectosCompletados}
            </Text>
            <Text style={[styles.estadisticaLabel, isDarkMode && styles.darkTextSecondary]}>Completados</Text>
          </View>
          <View style={styles.estadisticaItem}>
            <Text style={[styles.estadisticaNumero, { color: '#f39c12' }]}>
              {estadisticas.proyectosActivos}
            </Text>
            <Text style={[styles.estadisticaLabel, isDarkMode && styles.darkTextSecondary]}>Activos</Text>
          </View>
          <View style={styles.estadisticaItem}>
            <Text style={[styles.estadisticaNumero, { color: '#3498db' }]}>
              {Math.round(estadisticas.progresoPromedio)}%
            </Text>
            <Text style={[styles.estadisticaLabel, isDarkMode && styles.darkTextSecondary]}>Progreso</Text>
          </View>
        </View>
      </View>
    );
  };

  // Renderizar tarjeta de proyecto (VERSIÓN MEJORADA SIN BARRA)
  const renderProyecto = (proyecto: Proyecto) => {
    const diasRestantes = proyecto.fechaLimite ? proyectoService.diasRestantes(proyecto.fechaLimite) : null;
    const { totalMetas, metasCompletadas } = proyecto.estadisticas;
    const colorPrioridad = proyectoService.getColorPrioridad(proyecto.prioridad);

    return (
      <TouchableOpacity
        key={proyecto.id}
        style={[styles.proyectoCard, isDarkMode && styles.darkCard]}
        onPress={() => navegarADetalleProyecto(proyecto.id)}
      >
        {/* Header con título y badges */}
        <View style={styles.proyectoHeader}>
          <View style={styles.proyectoTitleContainer}>
            <Text style={[styles.proyectoTitle, isDarkMode && styles.darkText]} numberOfLines={2}>
              {proyecto.titulo}
            </Text>
          </View>
          <View style={styles.badgesContainer}>
            <View style={[styles.prioridadBadge, { backgroundColor: colorPrioridad }]}>
              <Text style={styles.prioridadText}>{proyecto.prioridad.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.estadoBadge, { backgroundColor: proyecto.estado.color, alignSelf: 'flex-start' }]}>
          <Text style={styles.estadoText}>{proyecto.estado.nombre}</Text>
        </View>

        {/* Descripción */}
        {proyecto.descripcion && (
          <Text style={[styles.proyectoDescripcion, isDarkMode && styles.darkTextSecondary]}>
            {proyecto.descripcion}
          </Text>
        )}

        {/* Footer con Metas, Días y Botones */}
        <View style={styles.proyectoFooter}>
          <View style={styles.footerStatsContainer}>
            <View style={styles.footerStat}>
              <Ionicons name="checkmark-done-outline" size={16} color={isDarkMode ? '#999' : '#666'} />
              <Text style={[styles.footerStatText, isDarkMode && styles.darkTextSecondary]}>{metasCompletadas}/{totalMetas} Metas</Text>
            </View>
            {diasRestantes !== null && (
              <View style={styles.footerStat}>
                <Ionicons name="time-outline" size={16} color={diasRestantes < 0 ? colors.error : (isDarkMode ? '#999' : '#666')} />
                <Text style={[styles.footerStatText, isDarkMode && styles.darkTextSecondary, diasRestantes < 0 && { color: colors.error }]}>
                  {diasRestantes < 0 ? `${Math.abs(diasRestantes)} días vencido` : `${diasRestantes} días`}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.footerButtonsContainer}>
            <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarProyecto(proyecto)}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.verDetalleButton} onPress={() => navegarADetalleProyecto(proyecto.id)}>
              <Text style={styles.verDetalleText}>Ver detalle</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.loadingText, isDarkMode && styles.darkTextSecondary]}>Cargando proyectos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Gestión de Proyectos</Text>
          <Text style={[styles.headerSubtitle, isDarkMode && styles.darkTextSecondary]}>
            {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={navegarACrearProyecto}>
          <Ionicons name="add" size={24} color="#fff" />
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
          {proyectos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={80} color="#bdc3c7" />
              <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>No hay proyectos</Text>
              <Text style={[styles.emptyMessage, isDarkMode && styles.darkTextSecondary]}>
                Crea tu primer proyecto para comenzar a gestionar tus metas y objetivos.
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={navegarACrearProyecto}>
                <Text style={styles.emptyButtonText}>Crear Proyecto</Text>
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  estadisticasContainer: {
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
  estadisticasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 15,
  },
  estadisticasGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estadisticaItem: {
    alignItems: 'center',
  },
  estadisticaNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  estadisticaLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 4,
  },
  proyectosContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // --- ESTILOS PARA LA TARJETA MEJORADA (SIN BARRA DE PROGRESO) ---
  proyectoCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  proyectoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  proyectoTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  proyectoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  prioridadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  prioridadText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  proyectoDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 20,
    lineHeight: 21,
  },
  proyectoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  footerStatsContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  verDetalleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verDetalleText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 'bold',
    marginRight: 2,
  },
  // --- ESTILOS AÑADIDOS ---
  footerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  // --- ESTILOS DARK MODE ---
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

export default GestionProyectos;