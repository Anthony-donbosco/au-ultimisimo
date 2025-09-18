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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { proyectoService, Proyecto, EstadisticasProyectos } from '../../services/proyectoService';

const { width } = Dimensions.get('window');

interface CompanyProjectStatsProps {
  route: {
    params: {
      companyId: number;
      companyName: string;
    };
  };
  navigation: any;
}

const CompanyProjectStats: React.FC<CompanyProjectStatsProps> = ({ route, navigation }) => {
  const { companyId, companyName } = route.params;
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasProyectos | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar datos
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const data = await proyectoService.getProyectosEmpresaAdmin(companyId);
      setProyectos(data.proyectos);
      setEstadisticas(data.estadisticas);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [companyId])
  );

  // Calcular estadísticas adicionales
  const calcularEstadisticasDetalladas = () => {
    if (!proyectos.length) return null;

    const hoy = new Date();
    const proyectosVencidos = proyectos.filter(p => {
      if (!p.fechaLimite) return false;
      const fechaLimite = new Date(p.fechaLimite);
      return fechaLimite < hoy && p.estado.codigo !== 'completado';
    }).length;

    const proyectosPorPrioridad = {
      critica: proyectos.filter(p => p.prioridad === 'critica').length,
      alta: proyectos.filter(p => p.prioridad === 'alta').length,
      media: proyectos.filter(p => p.prioridad === 'media').length,
      baja: proyectos.filter(p => p.prioridad === 'baja').length,
    };

    const presupuestoPorEstado = {
      planificado: proyectos.filter(p => p.estado.codigo === 'planificado').reduce((sum, p) => sum + p.presupuesto, 0),
      enProgreso: proyectos.filter(p => p.estado.codigo === 'en_progreso').reduce((sum, p) => sum + p.presupuesto, 0),
      completado: proyectos.filter(p => p.estado.codigo === 'completado').reduce((sum, p) => sum + p.presupuesto, 0),
      pausado: proyectos.filter(p => p.estado.codigo === 'pausado').reduce((sum, p) => sum + p.presupuesto, 0),
    };

    const totalMetas = proyectos.reduce((sum, p) => sum + p.estadisticas.totalMetas, 0);
    const metasCompletadas = proyectos.reduce((sum, p) => sum + p.estadisticas.metasCompletadas, 0);

    return {
      proyectosVencidos,
      proyectosPorPrioridad,
      presupuestoPorEstado,
      totalMetas,
      metasCompletadas,
      porcentajeMetas: totalMetas > 0 ? (metasCompletadas / totalMetas) * 100 : 0,
    };
  };

  const statsDetalladas = calcularEstadisticasDetalladas();

  // Renderizar card de estadística principal
  const renderEstadisticaPrincipal = (
    titulo: string,
    valor: string | number,
    subtitulo: string,
    icon: string,
    color: string,
    backgroundColor: string
  ) => (
    <View style={[styles.statCard, { backgroundColor }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValor, { color }]}>{valor}</Text>
        <Text style={styles.statTitulo}>{titulo}</Text>
        <Text style={styles.statSubtitulo}>{subtitulo}</Text>
      </View>
    </View>
  );

  // Renderizar gráfico de barras simple
  const renderGraficoPrioridades = () => {
    if (!statsDetalladas) return null;

    const maxValor = Math.max(...Object.values(statsDetalladas.proyectosPorPrioridad));
    const colores = {
      critica: '#e74c3c',
      alta: '#f39c12',
      media: '#3498db',
      baja: '#95a5a6',
    };

    return (
      <View style={styles.graficoContainer}>
        <Text style={styles.graficoTitulo}>Proyectos por Prioridad</Text>
        <View style={styles.barrasContainer}>
          {Object.entries(statsDetalladas.proyectosPorPrioridad).map(([prioridad, cantidad]) => (
            <View key={prioridad} style={styles.barraItem}>
              <View style={styles.barraWrapper}>
                <View
                  style={[
                    styles.barra,
                    {
                      height: maxValor > 0 ? (cantidad / maxValor) * 80 : 0,
                      backgroundColor: colores[prioridad as keyof typeof colores],
                    },
                  ]}
                />
              </View>
              <Text style={styles.barraLabel}>{prioridad.charAt(0).toUpperCase() + prioridad.slice(1)}</Text>
              <Text style={styles.barraValor}>{cantidad}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar resumen presupuestario
  const renderResumenPresupuestario = () => {
    if (!statsDetalladas || !estadisticas) return null;

    const items = [
      { label: 'Planificado', valor: statsDetalladas.presupuestoPorEstado.planificado, color: '#3498db' },
      { label: 'En Progreso', valor: statsDetalladas.presupuestoPorEstado.enProgreso, color: '#f39c12' },
      { label: 'Completado', valor: statsDetalladas.presupuestoPorEstado.completado, color: '#27ae60' },
      { label: 'Pausado', valor: statsDetalladas.presupuestoPorEstado.pausado, color: '#95a5a6' },
    ];

    return (
      <View style={styles.presupuestoContainer}>
        <Text style={styles.presupuestoTitulo}>Distribución de Presupuesto</Text>
        <View style={styles.presupuestoTotal}>
          <Text style={styles.presupuestoTotalLabel}>Total Asignado</Text>
          <Text style={styles.presupuestoTotalValor}>
            ${estadisticas.presupuestoTotal.toLocaleString()}
          </Text>
        </View>
        {items.map((item) => (
          <View key={item.label} style={styles.presupuestoItem}>
            <View style={styles.presupuestoInfo}>
              <View style={[styles.presupuestoIndicador, { backgroundColor: item.color }]} />
              <Text style={styles.presupuestoLabel}>{item.label}</Text>
            </View>
            <Text style={styles.presupuestoValor}>${item.valor.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Renderizar proyectos críticos
  const renderProyectosCriticos = () => {
    const proyectosCriticos = proyectos.filter(p =>
      p.prioridad === 'critica' ||
      (p.fechaLimite && proyectoService.diasRestantes(p.fechaLimite) !== null && proyectoService.diasRestantes(p.fechaLimite)! <= 7)
    );

    if (!proyectosCriticos.length) return null;

    return (
      <View style={styles.criticosContainer}>
        <View style={styles.criticosHeader}>
          <Ionicons name="warning-outline" size={20} color="#e74c3c" />
          <Text style={styles.criticosTitle}>Proyectos que Requieren Atención</Text>
        </View>
        {proyectosCriticos.slice(0, 3).map((proyecto) => {
          const diasRestantes = proyectoService.diasRestantes(proyecto.fechaLimite);
          return (
            <TouchableOpacity
              key={proyecto.id}
              style={styles.criticoItem}
              onPress={() => navigation.navigate('CompanyProjects', { companyId, companyName })}
            >
              <View style={styles.criticoInfo}>
                <Text style={styles.criticoTitulo} numberOfLines={1}>
                  {proyecto.titulo}
                </Text>
                <View style={styles.criticoDetalles}>
                  <View style={[styles.criticoPrioridad, {
                    backgroundColor: proyectoService.getColorPrioridad(proyecto.prioridad)
                  }]} />
                  <Text style={styles.criticoTexto}>
                    {proyecto.prioridad.toUpperCase()}
                  </Text>
                  {diasRestantes !== null && (
                    <>
                      <Text style={styles.criticoSeparador}>•</Text>
                      <Text style={[
                        styles.criticoTexto,
                        { color: diasRestantes <= 0 ? '#e74c3c' : '#f39c12' }
                      ]}>
                        {diasRestantes <= 0 ? 'Vencido' : `${diasRestantes}d restantes`}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#bdc3c7" />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cargando...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Estadísticas</Text>
          <Text style={styles.headerSubtitle}>{companyName}</Text>
        </View>
        <TouchableOpacity
          style={styles.projectsButton}
          onPress={() => navigation.navigate('CompanyProjects', { companyId, companyName })}
        >
          <Ionicons name="folder-outline" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Estadísticas principales */}
        {estadisticas && (
          <View style={styles.statsGrid}>
            {renderEstadisticaPrincipal(
              'Proyectos Totales',
              estadisticas.totalProyectos,
              'En gestión',
              'folder-outline',
              '#3498db',
              '#fff'
            )}

            {renderEstadisticaPrincipal(
              'Completados',
              estadisticas.proyectosCompletados,
              `${estadisticas.totalProyectos > 0 ? Math.round((estadisticas.proyectosCompletados / estadisticas.totalProyectos) * 100) : 0}% del total`,
              'checkmark-circle-outline',
              '#27ae60',
              '#fff'
            )}

            {renderEstadisticaPrincipal(
              'En Progreso',
              estadisticas.proyectosActivos,
              'Activos ahora',
              'play-circle-outline',
              '#f39c12',
              '#fff'
            )}

            {statsDetalladas && renderEstadisticaPrincipal(
              'Vencidos',
              statsDetalladas.proyectosVencidos,
              'Requieren atención',
              'time-outline',
              '#e74c3c',
              '#fff'
            )}
          </View>
        )}

        {/* Progreso de metas */}
        {statsDetalladas && (
          <View style={styles.metasContainer}>
            <Text style={styles.metasTitulo}>Progreso de Metas</Text>
            <View style={styles.metasStats}>
              <View style={styles.metasStat}>
                <Text style={styles.metasNumero}>{statsDetalladas.totalMetas}</Text>
                <Text style={styles.metasLabel}>Total Metas</Text>
              </View>
              <View style={styles.metasStat}>
                <Text style={[styles.metasNumero, { color: '#27ae60' }]}>
                  {statsDetalladas.metasCompletadas}
                </Text>
                <Text style={styles.metasLabel}>Completadas</Text>
              </View>
              <View style={styles.metasStat}>
                <Text style={[styles.metasNumero, { color: '#3498db' }]}>
                  {Math.round(statsDetalladas.porcentajeMetas)}%
                </Text>
                <Text style={styles.metasLabel}>Progreso</Text>
              </View>
            </View>
            <View style={styles.metasProgressContainer}>
              <View style={styles.metasProgressBar}>
                <View
                  style={[
                    styles.metasProgress,
                    { width: `${statsDetalladas.porcentajeMetas}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Gráfico de prioridades */}
        {renderGraficoPrioridades()}

        {/* Resumen presupuestario */}
        {renderResumenPresupuestario()}

        {/* Proyectos críticos */}
        {renderProyectosCriticos()}

        {/* Estado sin datos */}
        {proyectos.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={80} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>Sin datos para mostrar</Text>
            <Text style={styles.emptyMessage}>
              Esta empresa aún no ha creado proyectos para generar estadísticas.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  projectsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    padding: 20,
    paddingBottom: 0,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statContent: {
    flex: 1,
  },
  statValor: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 2,
  },
  statSubtitulo: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  metasContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  metasTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  metasStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metasStat: {
    alignItems: 'center',
  },
  metasNumero: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  metasLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  metasProgressContainer: {
    marginTop: 10,
  },
  metasProgressBar: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metasProgress: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  graficoContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  graficoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  barrasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  barraItem: {
    alignItems: 'center',
    flex: 1,
  },
  barraWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  barra: {
    width: 20,
    borderRadius: 10,
    minHeight: 4,
  },
  barraLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 4,
  },
  barraValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  presupuestoContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  presupuestoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  presupuestoTotal: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  presupuestoTotalLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  presupuestoTotalValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 4,
  },
  presupuestoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  presupuestoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presupuestoIndicador: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  presupuestoLabel: {
    fontSize: 14,
    color: '#2c3e50',
  },
  presupuestoValor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  criticosContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  criticosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  criticosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  criticoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  criticoInfo: {
    flex: 1,
  },
  criticoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  criticoDetalles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criticoPrioridad: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  criticoTexto: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  criticoSeparador: {
    fontSize: 12,
    color: '#bdc3c7',
    marginHorizontal: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});

export default CompanyProjectStats;