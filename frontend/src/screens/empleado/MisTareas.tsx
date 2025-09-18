import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { colors } from '../../styles/colors';
import { globalStyles } from '../../styles/globalStyles';
import { tareasService, type TareaAsignada, type EstadisticasTareas } from '../../services/tareasService';
import { getErrorMessage } from '../../utils/networkUtils';
import { FadeInView, SlideInView } from '../../components/common/AnimatedComponents';

interface FiltroEstado {
  codigo: string;
  nombre: string;
  color: string;
  icono: string;
}

const MisTareas: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useTheme();
  const { isTablet, wp, hp } = useResponsive();

  // Estados
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tareas, setTareas] = useState<TareaAsignada[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasTareas | null>(null);
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [error, setError] = useState<string | null>(null);

  // Filtros disponibles
  const filtros: FiltroEstado[] = [
    { codigo: 'todos', nombre: 'Todas', color: colors.primary, icono: 'list' },
    { codigo: 'pendiente', nombre: 'Pendientes', color: colors.warning, icono: 'time-outline' },
    { codigo: 'en_progreso', nombre: 'En Progreso', color: colors.info, icono: 'play-circle' },
    { codigo: 'completada', nombre: 'Completadas', color: colors.success, icono: 'checkmark-circle' },
  ];

  useEffect(() => {
    loadTareas();
  }, [filtroActivo]);

  const loadTareas = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      const filtro = filtroActivo === 'todos' ? undefined : filtroActivo;
      const response = await tareasService.getMisTareas(50, filtro);

      setTareas(response.tareas);
      setEstadisticas(response.estadisticas);
    } catch (error: any) {
      console.error('Error cargando tareas:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTareas(false);
    setRefreshing(false);
  }, [filtroActivo]);

  const navegarADetalle = (tareaId: number) => {
    navigation.navigate('DetalleTarea', { tareaId });
  };

  const cambiarFiltro = (codigoFiltro: string) => {
    setFiltroActivo(codigoFiltro);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const esVencida = (fechaLimite: string) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    return limite < hoy;
  };

  if (loading && tareas.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkMode ? colors.dark.text : colors.light.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
            Mis Tareas
          </Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkTextSecondary]}>
            Cargando tus tareas...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkMode ? colors.dark.text : colors.light.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Mis Tareas
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
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
        {/* Estadísticas */}
        {estadisticas && (
          <SlideInView direction="up" delay={100} duration={600}>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                📊 Resumen de Tareas
              </Text>

              <View style={styles.statsGrid}>
                <View style={[styles.statItem, { backgroundColor: colors.primary + '10' }]}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {estadisticas.total_tareas}
                  </Text>
                  <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                    Total
                  </Text>
                </View>

                <View style={[styles.statItem, { backgroundColor: colors.error + '10' }]}>
                  <Text style={[styles.statNumber, { color: colors.error }]}>
                    {estadisticas.tareas_vencidas}
                  </Text>
                  <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                    Vencidas
                  </Text>
                </View>

                {estadisticas.tareas_por_estado.map((estado) => (
                  <View
                    key={estado.codigo}
                    style={[styles.statItem, { backgroundColor: estado.color + '10' }]}
                  >
                    <Text style={[styles.statNumber, { color: estado.color }]}>
                      {estado.cantidad}
                    </Text>
                    <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                      {estado.nombre}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </SlideInView>
        )}

        {/* Filtros */}
        <SlideInView direction="up" delay={200} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              🔍 Filtrar por Estado
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filtrosContainer}>
                {filtros.map((filtro) => (
                  <TouchableOpacity
                    key={filtro.codigo}
                    style={[
                      styles.filtroButton,
                      {
                        backgroundColor: filtroActivo === filtro.codigo
                          ? filtro.color
                          : (isDarkMode ? colors.dark.border : colors.light.border) + '40'
                      }
                    ]}
                    onPress={() => cambiarFiltro(filtro.codigo)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={filtro.icono as any}
                      size={18}
                      color={filtroActivo === filtro.codigo ? 'white' : filtro.color}
                    />
                    <Text
                      style={[
                        styles.filtroText,
                        {
                          color: filtroActivo === filtro.codigo
                            ? 'white'
                            : (isDarkMode ? colors.dark.text : colors.light.text)
                        }
                      ]}
                    >
                      {filtro.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </SlideInView>

        {/* Lista de Tareas */}
        <SlideInView direction="up" delay={300} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              📋 Tareas ({tareas.length})
            </Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                />
                <Text style={[styles.errorText, isDarkMode && styles.darkTextSecondary]}>
                  {error}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => loadTareas()}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : tareas.length > 0 ? (
              tareas.map((tarea, index) => (
                <TouchableOpacity
                  key={`tarea-${tarea.id}`}
                  style={[
                    styles.tareaItem,
                    index === tareas.length - 1 && styles.tareaItemLast
                  ]}
                  onPress={() => navegarADetalle(tarea.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tareaContent}>
                    {/* Indicador de estado */}
                    <View style={[
                      styles.estadoIndicator,
                      { backgroundColor: tarea.estado_color || colors.primary }
                    ]} />

                    {/* Icono de estado */}
                    <View style={[
                      styles.tareaIcon,
                      { backgroundColor: tarea.estado_color ? `${tarea.estado_color}20` : `${colors.primary}20` }
                    ]}>
                      <Ionicons
                        name={tarea.estado_icono as any || 'checkmark-circle'}
                        size={20}
                        color={tarea.estado_color || colors.primary}
                      />
                    </View>

                    {/* Contenido principal */}
                    <View style={styles.tareaMain}>
                      <View style={styles.tareaHeader}>
                        <Text style={[styles.tareaTitulo, isDarkMode && styles.darkText]}>
                          {tarea.titulo}
                        </Text>
                        {tarea.fecha_limite && esVencida(tarea.fecha_limite) &&
                         !['completada', 'cancelada'].includes(tarea.estado_nombre?.toLowerCase() || '') && (
                          <View style={styles.vencidaBadge}>
                            <Ionicons name="warning" size={12} color={colors.error} />
                            <Text style={styles.vencidaText}>Vencida</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.tareaInfo}>
                        <Text style={[styles.tareaCategoria, isDarkMode && styles.darkTextSecondary]}>
                          {tarea.categoria || 'Sin categoría'}
                        </Text>
                        {tarea.fecha_limite && (
                          <Text style={[
                            styles.tareaFecha,
                            isDarkMode && styles.darkTextSecondary,
                            tarea.fecha_limite && esVencida(tarea.fecha_limite) &&
                            !['completada', 'cancelada'].includes(tarea.estado_nombre?.toLowerCase() || '') &&
                            { color: colors.error }
                          ]}>
                            📅 {formatearFecha(tarea.fecha_limite)}
                          </Text>
                        )}
                      </View>

                      {/* Badges adicionales */}
                      <View style={styles.badgesContainer}>
                        {tarea.prioridad_nombre && (
                          <View style={[
                            styles.prioridadBadge,
                            { backgroundColor: tarea.prioridad_color ? `${tarea.prioridad_color}20` : `${colors.warning}20` }
                          ]}>
                            <Text style={[
                              styles.prioridadText,
                              { color: tarea.prioridad_color || colors.warning }
                            ]}>
                              {tarea.prioridad_nombre}
                            </Text>
                          </View>
                        )}

                        <View style={[
                          styles.estadoBadge,
                          {
                            backgroundColor: tarea.estado_color ? `${tarea.estado_color}20` : `${colors.primary}20`,
                            borderColor: tarea.estado_color || colors.primary
                          }
                        ]}>
                          <Text style={[
                            styles.estadoText,
                            { color: tarea.estado_color || colors.primary }
                          ]}>
                            {tarea.estado_nombre || 'Pendiente'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Flecha */}
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="clipboard-outline"
                  size={64}
                  color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                />
                <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                  {filtroActivo === 'todos'
                    ? 'No tienes tareas asignadas'
                    : `No hay tareas ${filtros.find(f => f.codigo === filtroActivo)?.nombre?.toLowerCase() || ''}`
                  }
                </Text>
                <Text style={[styles.emptyStateSubtext, isDarkMode && styles.darkTextSecondary]}>
                  Las tareas asignadas por tu empresa aparecerán aquí
                </Text>
              </View>
            )}
          </View>
        </SlideInView>

        {/* Espacio adicional */}
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
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    ...globalStyles.shadow,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  filtrosContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filtroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  filtroText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tareaItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  tareaItemLast: {
    borderBottomWidth: 0,
  },
  tareaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estadoIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  tareaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tareaMain: {
    flex: 1,
  },
  tareaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tareaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  vencidaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  vencidaText: {
    fontSize: 10,
    color: colors.error,
    fontWeight: '600',
  },
  tareaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tareaCategoria: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  tareaFecha: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prioridadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  prioridadText: {
    fontSize: 10,
    fontWeight: '600',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default MisTareas;