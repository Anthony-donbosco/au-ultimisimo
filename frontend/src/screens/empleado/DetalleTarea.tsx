import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { colors } from '../../styles/colors';
import { globalStyles } from '../../styles/globalStyles';
import { tareasService, type TareaAsignada, type TareaComentario, type EstadoTarea } from '../../services/tareasService';
import { getErrorMessage } from '../../utils/networkUtils';
import { FadeInView, SlideInView } from '../../components/common/AnimatedComponents';

interface DetalleTareaProps {
  route: {
    params: {
      tareaId: number;
    };
  };
}

const DetalleTarea: React.FC<DetalleTareaProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { tareaId } = route.params as { tareaId: number };
  const { isDarkMode } = useTheme();
  const { isTablet, wp, hp } = useResponsive();

  // Estados
  const [loading, setLoading] = useState(true);
  const [tarea, setTarea] = useState<TareaAsignada | null>(null);
  const [comentarios, setComentarios] = useState<TareaComentario[]>([]);
  const [estados, setEstados] = useState<EstadoTarea[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTareaDetalle();
    loadEstados();
  }, [tareaId]);

  const loadTareaDetalle = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await tareasService.getTareaDetalle(tareaId);
      setTarea(response.tarea);
      setComentarios(response.comentarios);
    } catch (error: any) {
      console.error('Error cargando detalle de tarea:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loadEstados = async () => {
    try {
      const estadosData = await tareasService.getEstadosTarea();
      setEstados(estadosData);
    } catch (error) {
      console.warn('Error cargando estados:', error);
    }
  };

  const handleCambiarEstado = (nuevoEstado: string, nombreEstado: string) => {
    Alert.alert(
      'Cambiar Estado',
      `¿Estás seguro de cambiar el estado a "${nombreEstado}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: () => cambiarEstado(nuevoEstado),
        },
      ]
    );
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!tarea) return;

    try {
      setCambiandoEstado(true);

      await tareasService.actualizarEstadoTarea(tarea.id, {
        estado: nuevoEstado,
        motivo: `Estado cambiado por el empleado a: ${nuevoEstado}`,
      });

      // Recargar datos
      await loadTareaDetalle();

      Alert.alert('Éxito', 'Estado actualizado correctamente');
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setCambiandoEstado(false);
    }
  };

  const enviarComentario = async () => {
    if (!nuevoComentario.trim() || !tarea) return;

    try {
      setEnviandoComentario(true);

      await tareasService.agregarComentario(tarea.id, {
        comentario: nuevoComentario.trim(),
        es_interno: false,
      });

      setNuevoComentario('');
      await loadTareaDetalle(); // Recargar para ver el nuevo comentario

      Alert.alert('Éxito', 'Comentario agregado correctamente');
    } catch (error: any) {
      console.error('Error enviando comentario:', error);
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setEnviandoComentario(false);
    }
  };

  const iniciarTarea = () => {
    handleCambiarEstado('en_progreso', 'En Progreso');
  };

  const completarTarea = () => {
    handleCambiarEstado('completada', 'Completada');
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatearFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
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
            Detalle de Tarea
          </Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkTextSecondary]}>
            Cargando detalle de la tarea...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tarea) {
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
            Detalle de Tarea
          </Text>
        </View>

        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
          />
          <Text style={[styles.errorTitle, isDarkMode && styles.darkText]}>
            Error al cargar la tarea
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkTextSecondary]}>
            {error || 'Tarea no encontrada'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadTareaDetalle}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Determinar acciones disponibles según el estado actual
  const puedeIniciar = tarea.estado_nombre === 'Pendiente' || tarea.estado_nombre === 'pendiente';
  const puedeCompletar = tarea.estado_nombre === 'En Progreso' || tarea.estado_nombre === 'en_progreso';
  const estaCompletada = tarea.estado_nombre === 'Completada' || tarea.estado_nombre === 'completada';

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
          Detalle de Tarea
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Información Principal */}
        <SlideInView direction="up" delay={100} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <View style={styles.tareaHeader}>
              <View style={[
                styles.estadoIcon,
                { backgroundColor: tarea.estado_color ? `${tarea.estado_color}20` : `${colors.primary}20` }
              ]}>
                <Ionicons
                  name={tarea.estado_icono as any || 'checkmark-circle'}
                  size={24}
                  color={tarea.estado_color || colors.primary}
                />
              </View>
              <View style={styles.tareaHeaderContent}>
                <Text style={[styles.tareaTitle, isDarkMode && styles.darkText]}>
                  {tarea.titulo}
                </Text>
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

            {tarea.descripcion && (
              <Text style={[styles.tareaDescripcion, isDarkMode && styles.darkTextSecondary]}>
                {tarea.descripcion}
              </Text>
            )}
          </View>
        </SlideInView>

        {/* Detalles de la Tarea */}
        <SlideInView direction="up" delay={200} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              📋 Información de la Tarea
            </Text>

            <View style={styles.detailRow}>
              <Ionicons name="business" size={20} color={colors.primary} />
              <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
                Empresa:
              </Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {tarea.empresa_nombre || 'N/A'}
              </Text>
            </View>

            {tarea.categoria && (
              <View style={styles.detailRow}>
                <Ionicons name="pricetag" size={20} color={colors.info} />
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
                  Categoría:
                </Text>
                <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                  {tarea.categoria}
                </Text>
              </View>
            )}

            {tarea.prioridad_nombre && (
              <View style={styles.detailRow}>
                <Ionicons name="flag" size={20} color={tarea.prioridad_color || colors.warning} />
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
                  Prioridad:
                </Text>
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
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={20} color={colors.success} />
              <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
                Asignada:
              </Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {formatearFechaCorta(tarea.fecha_asignacion)}
              </Text>
            </View>

            {tarea.fecha_limite && (
              <View style={styles.detailRow}>
                <Ionicons name="alarm" size={20} color={colors.error} />
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
                  Fecha límite:
                </Text>
                <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                  {formatearFechaCorta(tarea.fecha_limite)}
                </Text>
              </View>
            )}

            {tarea.tiempo_estimado_horas && (
              <View style={styles.detailRow}>
                <Ionicons name="time" size={20} color={colors.info} />
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
                  Tiempo estimado:
                </Text>
                <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                  {tarea.tiempo_estimado_horas} horas
                </Text>
              </View>
            )}

            {tarea.ubicacion && (
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color={colors.warning} />
                <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
                  Ubicación:
                </Text>
                <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                  {tarea.ubicacion}
                </Text>
              </View>
            )}
          </View>
        </SlideInView>

        {/* Acciones de Estado */}
        {!estaCompletada && (
          <SlideInView direction="up" delay={300} duration={600}>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                ⚡ Acciones
              </Text>

              <View style={styles.actionsContainer}>
                {puedeIniciar && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={iniciarTarea}
                    disabled={cambiandoEstado}
                  >
                    {cambiandoEstado ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="play" size={20} color="white" />
                        <Text style={styles.actionButtonText}>Iniciar Tarea</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {puedeCompletar && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={completarTarea}
                    disabled={cambiandoEstado}
                  >
                    {cambiandoEstado ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="white" />
                        <Text style={styles.actionButtonText}>Completar Tarea</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SlideInView>
        )}

        {/* Notas de la Empresa */}
        {tarea.notas_empresa && (
          <SlideInView direction="up" delay={400} duration={600}>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                💼 Notas de la Empresa
              </Text>
              <Text style={[styles.notasText, isDarkMode && styles.darkText]}>
                {tarea.notas_empresa}
              </Text>
            </View>
          </SlideInView>
        )}

        {/* Comentarios */}
        <SlideInView direction="up" delay={500} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              💬 Comentarios ({comentarios.length})
            </Text>

            {/* Agregar comentario */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={[
                  styles.commentInput,
                  isDarkMode && styles.darkInput,
                  isDarkMode && { color: colors.dark.text }
                ]}
                placeholder="Escribe un comentario..."
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                value={nuevoComentario}
                onChangeText={setNuevoComentario}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendCommentButton,
                  !nuevoComentario.trim() && styles.sendCommentButtonDisabled
                ]}
                onPress={enviarComentario}
                disabled={!nuevoComentario.trim() || enviandoComentario}
              >
                {enviandoComentario ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {/* Lista de comentarios */}
            {comentarios.length > 0 ? (
              comentarios.map((comentario, index) => (
                <View key={comentario.id} style={styles.comentarioItem}>
                  <View style={styles.comentarioHeader}>
                    <Text style={[styles.comentarioAutor, isDarkMode && styles.darkText]}>
                      {comentario.user_nombre || 'Usuario'}
                    </Text>
                    <Text style={[styles.comentarioFecha, isDarkMode && styles.darkTextSecondary]}>
                      {formatearFecha(comentario.created_at)}
                    </Text>
                  </View>
                  <Text style={[styles.comentarioTexto, isDarkMode && styles.darkText]}>
                    {comentario.comentario}
                  </Text>
                  {comentario.es_interno && (
                    <View style={styles.internoLabel}>
                      <Text style={styles.internoText}>Comentario interno</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyComments}>
                <Ionicons
                  name="chatbubble-outline"
                  size={32}
                  color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                />
                <Text style={[styles.emptyCommentsText, isDarkMode && styles.darkTextSecondary]}>
                  No hay comentarios aún
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
    color: colors.light.text,
  },
  errorMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    color: colors.light.textSecondary,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  tareaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  estadoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tareaHeaderContent: {
    flex: 1,
  },
  tareaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 8,
    lineHeight: 26,
  },
  estadoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tareaDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginLeft: 8,
    marginRight: 8,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: colors.light.text,
    fontWeight: '500',
    flex: 1,
  },
  prioridadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  prioridadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  startButton: {
    backgroundColor: colors.success,
  },
  completeButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  notasText: {
    fontSize: 14,
    color: colors.light.text,
    lineHeight: 20,
  },
  addCommentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: colors.light.background,
    maxHeight: 80,
  },
  darkInput: {
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.background,
  },
  sendCommentButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCommentButtonDisabled: {
    backgroundColor: colors.light.textSecondary,
  },
  comentarioItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  comentarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  comentarioAutor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
  },
  comentarioFecha: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  comentarioTexto: {
    fontSize: 14,
    color: colors.light.text,
    lineHeight: 20,
  },
  internoLabel: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  internoText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '600',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 8,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default DetalleTarea;