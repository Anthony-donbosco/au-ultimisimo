import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';
import { proyectoService, Proyecto } from '../../services/proyectoService';

interface AdminProjectDetailProps {
  navigation: any;
  route: {
    params: {
      proyectoId: number;
      companyName: string;
    };
  };
}

const AdminProjectDetail: React.FC<AdminProjectDetailProps> = ({ navigation, route }) => {
  const { isDarkMode } = useTheme();
  const { proyectoId, companyName } = route.params;

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarProyecto = async () => {
    try {
      setLoading(true);
      const data = await proyectoService.getProyectoDetalle(proyectoId);
      setProyecto(data);
    } catch (error) {
      console.error('Error cargando proyecto:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarProyecto();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarProyecto();
    }, [proyectoId])
  );

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Cargando...</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      </View>
    );
  }

  if (!proyecto) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Error</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>Proyecto no encontrado</Text>
        </View>
      </View>
    );
  }

  const colorPrioridad = proyectoService.getColorPrioridad(proyecto.prioridad);
  const colorProgreso = proyectoService.getColorProgreso(proyecto.progresoporcentaje);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Detalle Proyecto</Text>
          <Text style={[styles.headerSubtitle, isDarkMode && styles.headerSubtitleDark]}>{companyName}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Información básica */}
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.proyectoTitle, isDarkMode && styles.textDark]}>{proyecto.titulo}</Text>

          <View style={styles.badgesContainer}>
            <View style={[styles.prioridadBadge, { backgroundColor: colorPrioridad }]}>
              <Text style={styles.badgeText}>{proyecto.prioridad.toUpperCase()}</Text>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: proyecto.estado.color }]}>
              <Text style={styles.badgeText}>{proyecto.estado.nombre}</Text>
            </View>
          </View>

          {proyecto.descripcion && (
            <Text style={[styles.descripcion, isDarkMode && styles.textSecondaryDark]}>
              {proyecto.descripcion}
            </Text>
          )}
        </View>

        {/* Progreso */}
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Progreso del Proyecto</Text>

          <View style={styles.progresoContainer}>
            <View style={styles.progresoHeader}>
              <Text style={[styles.progresoLabel, isDarkMode && styles.textSecondaryDark]}>
                {Math.round(proyecto.progresoporcentaje)}% Completado
              </Text>
              <Text style={[styles.progresoValor, { color: colorProgreso }]}>
                {proyecto.estadisticas?.metasCompletadas || 0}/{proyecto.estadisticas?.totalMetas || 0} Metas
              </Text>
            </View>
            <View style={[styles.progresoBar, isDarkMode && styles.progresoBarDark]}>
              <View
                style={[
                  styles.progresoFill,
                  {
                    width: `${proyecto.progresoporcentaje}%`,
                    backgroundColor: colorProgreso,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Información económica */}
        {proyecto.presupuesto > 0 && (
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Información Económica</Text>

            <View style={styles.economicoContainer}>
              <View style={styles.economicoItem}>
                <Text style={[styles.economicoLabel, isDarkMode && styles.textSecondaryDark]}>Presupuesto</Text>
                <Text style={[styles.economicoValor, isDarkMode && styles.textDark]}>
                  ${proyecto.presupuesto.toLocaleString()}
                </Text>
              </View>

              {proyecto.montoGastado !== undefined && (
                <View style={styles.economicoItem}>
                  <Text style={[styles.economicoLabel, isDarkMode && styles.textSecondaryDark]}>Gastado</Text>
                  <Text style={[styles.economicoValor, { color: '#e74c3c' }]}>
                    ${proyecto.montoGastado.toLocaleString()}
                  </Text>
                </View>
              )}

              {proyecto.montoRestante !== undefined && (
                <View style={styles.economicoItem}>
                  <Text style={[styles.economicoLabel, isDarkMode && styles.textSecondaryDark]}>Restante</Text>
                  <Text style={[styles.economicoValor, { color: '#27ae60' }]}>
                    ${proyecto.montoRestante.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Fechas */}
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Fechas</Text>

          <View style={styles.fechasContainer}>
            <View style={styles.fechaItem}>
              <Ionicons name="calendar-outline" size={16} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.fechaLabel, isDarkMode && styles.textSecondaryDark]}>Creado:</Text>
              <Text style={[styles.fechaValor, isDarkMode && styles.textDark]}>
                {proyectoService.formatearFecha(proyecto.creadoEn)}
              </Text>
            </View>

            {proyecto.fechaInicio && (
              <View style={styles.fechaItem}>
                <Ionicons name="play-outline" size={16} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                <Text style={[styles.fechaLabel, isDarkMode && styles.textSecondaryDark]}>Inicio:</Text>
                <Text style={[styles.fechaValor, isDarkMode && styles.textDark]}>
                  {proyectoService.formatearFecha(proyecto.fechaInicio)}
                </Text>
              </View>
            )}

            {proyecto.fechaLimite && (
              <View style={styles.fechaItem}>
                <Ionicons name="time-outline" size={16} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                <Text style={[styles.fechaLabel, isDarkMode && styles.textSecondaryDark]}>Límite:</Text>
                <Text style={[styles.fechaValor, isDarkMode && styles.textDark]}>
                  {proyectoService.formatearFecha(proyecto.fechaLimite)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Metas */}
        {proyecto.metas && proyecto.metas.length > 0 && (
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Metas del Proyecto</Text>

            {proyecto.metas.map((meta) => (
              <View key={meta.id} style={[styles.metaItem, isDarkMode && styles.metaItemDark]}>
                <View style={styles.metaHeader}>
                  <Ionicons
                    name={meta.completado ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={meta.completado ? '#27ae60' : (isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary)}
                  />
                  <Text style={[styles.metaTitulo, isDarkMode && styles.textDark, meta.completado && styles.metaCompletada]}>
                    {meta.titulo}
                  </Text>
                </View>
                {meta.descripcion && (
                  <Text style={[styles.metaDescripcion, isDarkMode && styles.textSecondaryDark]}>
                    {meta.descripcion}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notas */}
        {proyecto.notas && (
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Notas</Text>
            <Text style={[styles.notas, isDarkMode && styles.textSecondaryDark]}>{proyecto.notas}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    paddingTop: 50,
  },
  containerDark: {
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerDark: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  headerTitleDark: {
    color: colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  headerSubtitleDark: {
    color: colors.dark.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.light.surface,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardDark: {
    backgroundColor: colors.dark.surface,
  },
  proyectoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  prioridadBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  descripcion: {
    fontSize: 16,
    color: colors.light.textSecondary,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 16,
  },
  progresoContainer: {
    marginBottom: 8,
  },
  progresoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progresoLabel: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  progresoValor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progresoBar: {
    height: 8,
    backgroundColor: colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progresoBarDark: {
    backgroundColor: colors.dark.border,
  },
  progresoFill: {
    height: '100%',
    borderRadius: 4,
  },
  economicoContainer: {
    gap: 12,
  },
  economicoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  economicoLabel: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  economicoValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  fechasContainer: {
    gap: 12,
  },
  fechaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fechaLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  fechaValor: {
    fontSize: 14,
    color: colors.light.text,
    flex: 1,
  },
  metaItem: {
    padding: 12,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  metaItemDark: {
    backgroundColor: colors.dark.background,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  metaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    flex: 1,
  },
  metaCompletada: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  metaDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginLeft: 28,
  },
  notas: {
    fontSize: 14,
    color: colors.light.textSecondary,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  errorTextDark: {
    color: colors.dark.textSecondary,
  },
  textDark: {
    color: colors.dark.text,
  },
  textSecondaryDark: {
    color: colors.dark.textSecondary,
  },
});

export default AdminProjectDetail;