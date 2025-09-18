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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { empresaService, type EmpleadoData } from '../../services/empresaService';
import { formatCurrency, getErrorMessage } from '../../utils/networkUtils';
import { CardSkeleton, ListSkeleton } from '../../components/common/SkeletonLoader';
import { FadeInView, SlideInView, AnimatedTouchable } from '../../components/common/AnimatedComponents';

const GestionEmpleados: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { isTablet, wp, hp } = useResponsive();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [empleados, setEmpleados] = useState<EmpleadoData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    puesto: '',
    sueldo: '',
    notas: '',
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadEmpleados();
  }, []);

  // Funciones de navegación
  const navegarADetalleEmpleado = (empleado: EmpleadoData) => {
    // TODO: Implementar pantalla de detalle del empleado
    Alert.alert(
      'Detalle del Empleado',
      `Ver detalles completos de ${empleado.firstName} ${empleado.lastName}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Asignar Tarea',
          onPress: () => navegarAAsignarTarea(empleado)
        }
      ]
    );
  };

  const navegarAAsignarTarea = (empleado: EmpleadoData) => {
    const empleadoNombre = empleado.firstName && empleado.lastName
      ? `${empleado.firstName} ${empleado.lastName}`
      : empleado.username;

    navigation.navigate('TareasEmpresaMenu', {
      empleadoId: empleado.id,
      empleadoNombre: empleadoNombre,
    });
  };

  const loadEmpleados = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      console.log('👥 Cargando empleados...');

      // Intentar datos cached primero
      const cachedData = await empresaService.getCachedData('empleados');
      if (cachedData && !showLoader) {
        setEmpleados(cachedData);
      }

      // Obtener datos frescos
      const data = await empresaService.getEmpleados();
      setEmpleados(data);

      // Cachear datos
      if (data.length > 0) {
        await empresaService.setCachedData('empleados', data);
      }

      console.log(`✅ ${data.length} empleados cargados exitosamente`);
    } catch (error: any) {
      console.error('❌ Error cargando empleados:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);

      // Fallback a datos cached
      const cachedData = await empresaService.getCachedData('empleados');
      if (cachedData) {
        console.log('📱 Usando datos cached como fallback');
        setEmpleados(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEmpleados(false);
    } catch (error) {
      console.log('Error refreshing empleados:', error);
    }
    setRefreshing(false);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.username.trim()) {
      errors.username = 'El username es requerido';
    } else if (formData.username.length < 3) {
      errors.username = 'El username debe tener al menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El email no es válido';
    }

    if (!formData.password.trim()) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (formData.sueldo && isNaN(parseFloat(formData.sueldo))) {
      errors.sueldo = 'El sueldo debe ser un número válido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEmpleado = async () => {
    if (!validateForm()) {
      return;
    }

    setCreating(true);
    try {
      const empleadoData: EmpleadoData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        puesto: formData.puesto.trim() || undefined,
        sueldo: formData.sueldo ? parseFloat(formData.sueldo) : undefined,
        notas: formData.notas.trim() || undefined,
      };

      const nuevoEmpleado = await empresaService.crearEmpleado(empleadoData);
      
      Alert.alert('Éxito', 'Empleado creado exitosamente', [
        { 
          text: 'OK', 
          onPress: () => {
            setShowCreateModal(false);
            resetForm();
            loadEmpleados(false); // Recargar lista
          }
        }
      ]);

    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      puesto: '',
      sueldo: '',
      notas: '',
    });
    setFormErrors({});
  };

  const updateFormField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const eliminarEmpleado = async (empleado: EmpleadoData) => {
    const nombreCompleto = empleado.firstName && empleado.lastName
      ? `${empleado.firstName} ${empleado.lastName}`
      : empleado.username;

    Alert.alert(
      'Eliminar Empleado',
      `¿Estás seguro de que deseas eliminar a ${nombreCompleto}?\n\nEsta acción no se puede deshacer y se eliminarán todas las tareas, ventas y gastos asociados a este empleado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await empresaService.eliminarEmpleado(empleado.id!);
              if (success) {
                Alert.alert('Éxito', 'Empleado eliminado correctamente');
                await loadEmpleados(); // Recargar la lista
              } else {
                Alert.alert('Error', 'No se pudo eliminar el empleado');
              }
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderEmpleadoCard = (empleado: EmpleadoData, index: number) => (
    <SlideInView key={empleado.id} direction="up" delay={index * 50} duration={400}>
      <View style={[styles.empleadoCard, isDarkMode && styles.darkCard]}>
        <View style={styles.empleadoHeader}>
          <View style={[styles.empleadoAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.empleadoInitials, { color: colors.primary }]}>
              {((empleado.firstName?.[0] || '') + (empleado.lastName?.[0] || '') || empleado.username[0]).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.empleadoInfo}>
            <Text style={[styles.empleadoNombre, isDarkMode && styles.darkText]}>
              {empleado.firstName && empleado.lastName 
                ? `${empleado.firstName} ${empleado.lastName}`
                : empleado.username}
            </Text>
            <Text style={[styles.empleadoPuesto, isDarkMode && styles.darkTextSecondary]}>
              {empleado.puesto || 'Sin puesto asignado'}
            </Text>
            <Text style={[styles.empleadoEmail, isDarkMode && styles.darkTextSecondary]}>
              {empleado.email}
            </Text>
          </View>

          <View style={styles.empleadoActions}>
            <View style={[
              styles.statusBadge,
              empleado.isActive ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={[
                styles.statusText,
                { color: empleado.isActive ? colors.success : colors.error }
              ]}>
                {empleado.isActive ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
        </View>

        {(empleado.sueldo || empleado.phoneNumber) && (
          <View style={styles.empleadoDetails}>
            {empleado.sueldo && (
              <View style={styles.empleadoDetail}>
                <Ionicons name="cash" size={16} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                <Text style={[styles.empleadoDetailText, isDarkMode && styles.darkTextSecondary]}>
                  {formatCurrency(empleado.sueldo)}
                </Text>
              </View>
            )}
            
            {empleado.phoneNumber && (
              <View style={styles.empleadoDetail}>
                <Ionicons name="call" size={16} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                <Text style={[styles.empleadoDetailText, isDarkMode && styles.darkTextSecondary]}>
                  {empleado.phoneNumber}
                </Text>
              </View>
            )}
          </View>
        )}

        {empleado.createdAt && (
          <Text style={[styles.empleadoFecha, isDarkMode && styles.darkTextSecondary]}>
            Creado: {new Date(empleado.createdAt).toLocaleDateString()}
          </Text>
        )}

        {/* Botones de acción */}
        <View style={styles.empleadoActionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.detailButton]}
            onPress={() => navegarADetalleEmpleado(empleado)}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={16} color={colors.info} />
            <Text style={[styles.actionButtonText, { color: colors.info }]}>
              Ver Detalles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.taskButton]}
            onPress={() => navegarAAsignarTarea(empleado)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={16} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Asignar Tarea
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => eliminarEmpleado(empleado)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SlideInView>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => !creating && setShowCreateModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
        <KeyboardAvoidingView 
          style={styles.modalContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.modalHeader, isDarkMode && styles.darkModalHeader]}>
            <TouchableOpacity
              onPress={() => !creating && setShowCreateModal(false)}
              disabled={creating}
            >
              <Ionicons 
                name="close" 
                size={24} 
                color={isDarkMode ? colors.dark.text : colors.light.text} 
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              Nuevo Empleado
            </Text>
            <TouchableOpacity
              onPress={handleCreateEmpleado}
              disabled={creating}
              style={[styles.saveButton, creating && styles.saveButtonDisabled]}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Información Básica */}
            <View style={[styles.formSection, isDarkMode && styles.darkFormSection]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Información Básica
              </Text>
              
              <View style={styles.formRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                    Username *
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput, 
                      isDarkMode && styles.darkTextInput,
                      formErrors.username && styles.inputError
                    ]}
                    value={formData.username}
                    onChangeText={(text) => updateFormField('username', text)}
                    placeholder="ej: juan.perez"
                    placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {formErrors.username && (
                    <Text style={styles.errorText}>{formErrors.username}</Text>
                  )}
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                    Email *
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput, 
                      isDarkMode && styles.darkTextInput,
                      formErrors.email && styles.inputError
                    ]}
                    value={formData.email}
                    onChangeText={(text) => updateFormField('email', text)}
                    placeholder="ej: juan@empresa.com"
                    placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {formErrors.email && (
                    <Text style={styles.errorText}>{formErrors.email}</Text>
                  )}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  Contraseña *
                </Text>
                <TextInput
                  style={[
                    styles.textInput, 
                    isDarkMode && styles.darkTextInput,
                    formErrors.password && styles.inputError
                  ]}
                  value={formData.password}
                  onChangeText={(text) => updateFormField('password', text)}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  secureTextEntry
                />
                {formErrors.password && (
                  <Text style={styles.errorText}>{formErrors.password}</Text>
                )}
              </View>
            </View>

            {/* Información Personal */}
            <View style={[styles.formSection, isDarkMode && styles.darkFormSection]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Información Personal
              </Text>
              
              <View style={styles.formRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                    Nombre
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    value={formData.firstName}
                    onChangeText={(text) => updateFormField('firstName', text)}
                    placeholder="Juan"
                    placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                    Apellido
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    value={formData.lastName}
                    onChangeText={(text) => updateFormField('lastName', text)}
                    placeholder="Pérez"
                    placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  Teléfono
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={formData.phoneNumber}
                  onChangeText={(text) => updateFormField('phoneNumber', text)}
                  placeholder="ej: +503 1234-5678"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Información Laboral */}
            <View style={[styles.formSection, isDarkMode && styles.darkFormSection]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Información Laboral
              </Text>
              
              <View style={styles.formRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                    Puesto
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    value={formData.puesto}
                    onChangeText={(text) => updateFormField('puesto', text)}
                    placeholder="ej: Desarrollador"
                    placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                    Sueldo ($)
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput, 
                      isDarkMode && styles.darkTextInput,
                      formErrors.sueldo && styles.inputError
                    ]}
                    value={formData.sueldo}
                    onChangeText={(text) => updateFormField('sueldo', text)}
                    placeholder="1200.00"
                    placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  {formErrors.sueldo && (
                    <Text style={styles.errorText}>{formErrors.sueldo}</Text>
                  )}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  Notas
                </Text>
                <TextInput
                  style={[
                    styles.textInput, 
                    styles.textArea, 
                    isDarkMode && styles.darkTextInput
                  ]}
                  value={formData.notas}
                  onChangeText={(text) => updateFormField('notas', text)}
                  placeholder="Notas adicionales sobre el empleado..."
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Espacio adicional para el scroll */}
            <View style={{ height: hp(4) }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  // Loading state
  if (loading && empleados.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
            Gestión de Empleados
          </Text>
          <CardSkeleton showHeader={false} lines={1} style={styles.headerButtonSkeleton} />
        </View>

        <View style={styles.statsContainer}>
          <CardSkeleton showHeader={false} lines={2} style={styles.statsSkeleton} />
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <ListSkeleton items={5} itemHeight={120} style={{ marginHorizontal: wp(4) }} />
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
          Gestión de Empleados
        </Text>
        <TouchableOpacity 
          onPress={() => setShowCreateModal(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, isDarkMode && styles.darkStatsContainer]}>
        <SlideInView direction="left" delay={100} duration={400}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
              {empleados.length}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
              Total Empleados
            </Text>
          </View>
        </SlideInView>

        <SlideInView direction="right" delay={200} duration={400}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.success }, isDarkMode && { color: colors.success }]}>
              {empleados.filter(e => e.isActive).length}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
              Activos
            </Text>
          </View>
        </SlideInView>
      </View>

      {/* Lista de Empleados */}
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

        {empleados.length > 0 ? (
          <View style={styles.empleadosContainer}>
            {empleados.map((empleado, index) => renderEmpleadoCard(empleado, index))}
          </View>
        ) : (
          <SlideInView direction="up" delay={100} duration={600}>
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.emptyStateTitle, isDarkMode && styles.darkText]}>
                No hay empleados
              </Text>
              <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                Crea tu primer empleado tocando el botón (+) en la parte superior
              </Text>
              <TouchableOpacity
                style={[styles.createFirstButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.createFirstButtonText}>Crear Primer Empleado</Text>
              </TouchableOpacity>
            </View>
          </SlideInView>
        )}

        {/* Espacio adicional para el scroll */}
        <View style={{ height: hp(4) }} />
      </ScrollView>

      {/* Modal de Crear Empleado */}
      {renderCreateModal()}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  empleadosContainer: {
    padding: 16,
  },
  empleadoCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...globalStyles.shadow,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  empleadoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  empleadoAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empleadoInitials: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  empleadoInfo: {
    flex: 1,
  },
  empleadoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 2,
  },
  empleadoPuesto: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  empleadoEmail: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  empleadoActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeBadge: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  inactiveBadge: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  empleadoDetails: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  empleadoDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  empleadoDetailText: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  empleadoFecha: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 8,
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

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  modalContent: {
    flex: 1,
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
    marginHorizontal: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...globalStyles.shadow,
  },
  darkFormSection: {
    backgroundColor: colors.dark.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.light.text,
    backgroundColor: colors.light.background,
  },
  darkTextInput: {
    borderColor: colors.dark.border,
    color: colors.dark.text,
    backgroundColor: colors.dark.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
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
  // Estilos para botones de acción de empleados
  empleadoActionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailButton: {
    backgroundColor: colors.info + '10',
    borderColor: colors.info + '30',
  },
  taskButton: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary + '30',
  },
  deleteButton: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default GestionEmpleados;