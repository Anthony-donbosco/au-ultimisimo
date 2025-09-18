import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';
import { formatCurrency, formatDateLong } from '../../utils/networkUtils';

interface DetalleGastoRoute {
  gasto_id: number;
}

interface GastoDetalle {
  id: number;
  empleado_nombre: string;
  empleado_email: string;
  descripcion: string;
  monto: number;
  fecha: string;
  categoria: string;
  comprobante_url?: string;
  comentario_empleado?: string;
  estado_aprobacion: 'pendiente' | 'aprobado' | 'rechazado';
  comentario_empresa?: string;
  fecha_aprobacion?: string;
}

const DetalleGastoAprobacion: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gasto_id } = route.params as DetalleGastoRoute;
  const { isDarkMode } = useTheme();
  
  const [gasto, setGasto] = useState<GastoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [accionSeleccionada, setAccionSeleccionada] = useState<'aprobar' | 'rechazar' | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    cargarDetalleGasto();
  }, [gasto_id]);

  const cargarDetalleGasto = async () => {
    try {
      // Aquí iría la llamada al servicio
      // const response = await empresaService.getDetalleGasto(gasto_id);
      
      // Mock data para el ejemplo
      const mockGasto: GastoDetalle = {
        id: gasto_id,
        empleado_nombre: 'Juan Pérez',
        empleado_email: 'juan.perez@empresa.com',
        descripcion: 'Comida de trabajo con cliente',
        monto: 25.50,
        fecha: '2025-09-15T12:00:00Z',
        categoria: 'Alimentación',
        comprobante_url: 'https://example.com/comprobante.jpg',
        comentario_empleado: 'Reunión importante con cliente potencial para cerrar contrato.',
        estado_aprobacion: 'pendiente',
      };
      
      setGasto(mockGasto);
    } catch (error) {
      console.error('Error cargando detalle:', error);
      Alert.alert('Error', 'No se pudo cargar el detalle del gasto');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobarRechazar = (accion: 'aprobar' | 'rechazar') => {
    setAccionSeleccionada(accion);
    setModalVisible(true);
  };

  const confirmarAccion = async () => {
    if (!accionSeleccionada || !gasto) return;

    try {
      // Aquí iría la llamada al servicio
      // await empresaService.aprobarRechazarGasto(gasto.id, accionSeleccionada, comentario);
      
      Alert.alert(
        'Éxito',
        `Gasto ${accionSeleccionada === 'aprobar' ? 'aprobado' : 'rechazado'} correctamente`,
        [{
          text: 'OK',
          onPress: () => {
            setModalVisible(false);
            navigation.goBack();
          }
        }]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo procesar la acción');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'aprobado': return colors.success; // Verde success
      case 'rechazado': return colors.error; // Rojo error
      default: return colors.warning; // Amarillo warning
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'aprobado': return 'checkmark-circle';
      case 'rechazado': return 'close-circle';
      default: return 'time';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Cargando detalle...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!gasto) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, isDarkMode && styles.darkText]}>
            No se pudo cargar el gasto
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
          Detalle de Gasto
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información del Empleado */}
        <View style={[styles.card, isDarkMode && styles.darkCard]}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name="person-circle-outline" 
              size={24} 
              color={colors.primary} 
            />
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              Información del Empleado
            </Text>
          </View>
          <View style={styles.employeeInfo}>
            <Text style={[styles.employeeName, isDarkMode && styles.darkText]}>
              {gasto.empleado_nombre}
            </Text>
            <Text style={[styles.employeeEmail, isDarkMode && styles.darkTextSecondary]}>
              {gasto.empleado_email}
            </Text>
          </View>
        </View>

        {/* Detalles del Gasto */}
        <View style={[styles.card, isDarkMode && styles.darkCard]}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name="receipt-outline" 
              size={24} 
              color={colors.primary} 
            />
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              Detalles del Gasto
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
              Descripción:
            </Text>
            <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
              {gasto.descripcion}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
              Monto:
            </Text>
            <Text style={[styles.detailValue, styles.amountText, isDarkMode && styles.darkText]}>
              {formatCurrency(gasto.monto)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
              Fecha:
            </Text>
            <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
              {formatDateLong(gasto.fecha)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
              Categoría:
            </Text>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{gasto.categoria}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
              Estado:
            </Text>
            <View style={[styles.statusTag, { backgroundColor: getEstadoColor(gasto.estado_aprobacion) + '20' }]}>
              <Ionicons 
                name={getEstadoIcon(gasto.estado_aprobacion)} 
                size={16} 
                color={getEstadoColor(gasto.estado_aprobacion)} 
              />
              <Text style={[styles.statusText, { color: getEstadoColor(gasto.estado_aprobacion) }]}>
                {gasto.estado_aprobacion.charAt(0).toUpperCase() + gasto.estado_aprobacion.slice(1)}
              </Text>
            </View>
          </View>

          {gasto.comentario_empleado && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkTextSecondary]}>
                Comentario del empleado:
              </Text>
              <Text style={[styles.detailValue, styles.commentText, isDarkMode && styles.darkText]}>
                {gasto.comentario_empleado}
              </Text>
            </View>
          )}
        </View>

        {/* Comprobante */}
        {gasto.comprobante_url && (
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <View style={styles.cardHeader}>
              <Ionicons 
                name="image-outline" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                Comprobante
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.imageContainer}
              onPress={() => setImageModalVisible(true)}
            >
              <Image 
                source={{ uri: gasto.comprobante_url }} 
                style={styles.comprobanteImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="expand-outline" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Comentarios de empresa (si ya fue procesado) */}
        {gasto.comentario_empresa && (
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <View style={styles.cardHeader}>
              <Ionicons 
                name="chatbubble-outline" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                Comentario de la Empresa
              </Text>
            </View>
            <Text style={[styles.commentText, isDarkMode && styles.darkText]}>
              {gasto.comentario_empresa}
            </Text>
            {gasto.fecha_aprobacion && (
              <Text style={[styles.approvalDate, isDarkMode && styles.darkTextSecondary]}>
                {formatDateLong(gasto.fecha_aprobacion)}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Botones de Acción (solo si está pendiente) */}
      {gasto.estado_aprobacion === 'pendiente' && (
        <View style={[styles.actionButtons, isDarkMode && styles.darkActionButtons]}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleAprobarRechazar('rechazar')}
          >
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Rechazar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleAprobarRechazar('aprobar')}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Aprobar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Confirmación */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              {accionSeleccionada === 'aprobar' ? 'Aprobar Gasto' : 'Rechazar Gasto'}
            </Text>
            
            <Text style={[styles.modalSubtitle, isDarkMode && styles.darkTextSecondary]}>
              {accionSeleccionada === 'aprobar' 
                ? '¿Estás seguro de que quieres aprobar este gasto?' 
                : '¿Estás seguro de que quieres rechazar este gasto?'
              }
            </Text>

            <TextInput
              style={[styles.commentInput, isDarkMode && styles.darkCommentInput]}
              placeholder={
                accionSeleccionada === 'aprobar' 
                  ? 'Comentario (opcional)' 
                  : 'Motivo del rechazo'
              }
              placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
              value={comentario}
              onChangeText={setComentario}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setComentario('');
                  setAccionSeleccionada(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  accionSeleccionada === 'aprobar' ? styles.confirmApproveButton : styles.confirmRejectButton
                ]}
                onPress={confirmarAccion}
              >
                <Text style={styles.confirmButtonText}>
                  {accionSeleccionada === 'aprobar' ? 'Aprobar' : 'Rechazar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Imagen Ampliada */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity 
            style={styles.imageModalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {gasto.comprobante_url && (
            <Image 
              source={{ uri: gasto.comprobante_url }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  darkHeader: {
    borderBottomColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.light.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.light.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.light.text,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginLeft: 8,
  },
  employeeInfo: {
    paddingLeft: 32,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  detailRow: {
    marginBottom: 12,
    paddingLeft: 32,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: colors.light.text,
    fontWeight: '500',
  },
  amountText: {
    color: colors.primary,
    fontWeight: '700',
  },
  categoryTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  imageContainer: {
    position: 'relative',
    paddingLeft: 32,
  },
  comprobanteImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  approvalDate: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  darkActionButtons: {
    backgroundColor: colors.dark.surface,
    borderTopColor: colors.dark.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  rejectButton: {
    backgroundColor: colors.error, // Consistente con EmpresaDashboard
  },
  approveButton: {
    backgroundColor: colors.success, // Consistente con EmpresaDashboard
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  darkModalContent: {
    backgroundColor: colors.dark.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.light.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.light.text,
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 80,
  },
  darkCommentInput: {
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.background,
    color: colors.dark.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cancelButtonText: {
    color: colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmApproveButton: {
    backgroundColor: colors.success, // Consistente con EmpresaDashboard
  },
  confirmRejectButton: {
    backgroundColor: colors.error, // Consistente con EmpresaDashboard
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 10,
  },
  fullScreenImage: {
    width: '90%',
    height: '80%',
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default DetalleGastoAprobacion;