import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { tareasService, type CrearTareaRequest, type Empleado, type EstadoTarea, type CategoriaTarea } from '../../services/tareasService';
import { financialService, type Prioridad } from '../../services/financialService';
import { getErrorMessage } from '../../utils/networkUtils';
import { SlideInView, AnimatedTouchable } from '../../components/common/AnimatedComponents';

interface AsignarTareaParams {
  empleadoId?: number;
  empleadoNombre?: string;
}

const AsignarTarea: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { empleadoId, empleadoNombre } = route.params as AsignarTareaParams;
  const { isDarkMode } = useTheme();
  const { isTablet, wp, hp } = useResponsive();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [prioridades, setPrioridades] = useState<Prioridad[]>([]);
  const [categorias, setCategorias] = useState<CategoriaTarea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryToggle = (categoryId: number) => {
      setFormData(prev => {
        const currentCategories = prev.categoria_ids || [];
        const isSelected = currentCategories.includes(categoryId);

        if (isSelected) {
          // Si ya está seleccionada, la quitamos
          return {
            ...prev,
            categoria_ids: currentCategories.filter(id => id !== categoryId),
          };
        } else {
          // Si no está seleccionada, la añadimos
          return {
            ...prev,
            categoria_ids: [...currentCategories, categoryId],
          };
        }
      });
  };

  // Estados del formulario
  const [formData, setFormData] = useState<CrearTareaRequest>({
    titulo: '',
    descripcion: '',
    empleado_id: empleadoId || 0,
    prioridad_id: 2,
    fecha_limite: '',
    tiempo_estimado_horas: undefined,
    categoria_ids: [], 
    ubicacion: '',
    requiere_aprobacion: false,
    notas_empresa: '',
    es_recurrente: false,
    frecuencia_dias: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [empleadosData, prioridadesData, categoriasData] = await Promise.all([
        tareasService.getEmpleadosEmpresa(),
        financialService.getPrioridades(),
        tareasService.getCategoriasTareas(),
      ]);

      setEmpleados(empleadosData);
      setPrioridades(prioridadesData);
      setCategorias(categoriasData);

      console.log('✅ Datos iniciales cargados:', {
        empleados: empleadosData.length,
        prioridades: prioridadesData.length,
        categorias: categoriasData.length
      });
    } catch (error: any) {
      console.error('❌ Error cargando datos iniciales:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validaciones obligatorias
    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es requerido';
    }

    if (!formData.empleado_id) {
      newErrors.empleado_id = 'Debes seleccionar un empleado';
    }

    if (!formData.prioridad_id) {
      newErrors.prioridad_id = 'Debes seleccionar una prioridad';
    }

    // Validar fecha límite si está presente
    if (formData.fecha_limite) {
      const fechaLimite = new Date(formData.fecha_limite);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaLimite < hoy) {
        newErrors.fecha_limite = 'La fecha límite no puede ser anterior a hoy';
      }
    }

    // Validar tiempo estimado
    if (formData.tiempo_estimado_horas && formData.tiempo_estimado_horas <= 0) {
      newErrors.tiempo_estimado_horas = 'El tiempo estimado debe ser mayor a 0';
    }

    // Validar frecuencia si es recurrente
    if (formData.es_recurrente && (!formData.frecuencia_dias || formData.frecuencia_dias <= 0)) {
      newErrors.frecuencia_dias = 'La frecuencia es requerida para tareas recurrentes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Por favor corrige los errores en el formulario');
      return;
    }

    try {
      setSaving(true);

      await tareasService.crearTarea(formData);

      Alert.alert(
        'Éxito',
        'Tarea asignada exitosamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error creando tarea:', error);
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // Función para formatear automáticamente la fecha en tiempo real
  const formatDateInput = (input: string): string => {
    // Remover todo lo que no sean números
    const numbersOnly = input.replace(/\D/g, '');

    // Si está vacío, devolver vacío
    if (numbersOnly.length === 0) return '';

    // Formateo progresivo mientras escribe
    if (numbersOnly.length <= 4) {
      // Solo año: 2025
      return numbersOnly;
    } else if (numbersOnly.length <= 6) {
      // Año y mes: 2025-10
      const year = numbersOnly.substring(0, 4);
      const month = numbersOnly.substring(4);
      return `${year}-${month}`;
    } else {
      // Año, mes y día: 2025-10-28
      const year = numbersOnly.substring(0, 4);
      const month = numbersOnly.substring(4, 6);
      const day = numbersOnly.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
  };

  // Función para validar que la fecha no sea anterior a hoy
  const isValidDate = (dateString: string): boolean => {
    if (!dateString || dateString.length < 10) return false;

    try {
      const inputDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo la fecha

      return inputDate >= today;
    } catch {
      return false;
    }
  };

  const updateFormData = (field: keyof CrearTareaRequest, value: any) => {
    // Manejo especial para fecha_limite
    if (field === 'fecha_limite') {
      const formattedDate = formatDateInput(value);
      setFormData(prev => ({ ...prev, [field]: formattedDate }));

      // Validar fecha en tiempo real
      if (formattedDate.length === 10) { // YYYY-MM-DD completo
        if (!isValidDate(formattedDate)) {
          setErrors(prev => ({ ...prev, [field]: 'La fecha debe ser hoy o posterior' }));
        } else {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      } else {
        // Limpiar error mientras se está escribiendo
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Limpiar error del campo si existe
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  // Formatear fecha para el input
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
            Asignar Tarea
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkTextSecondary]}>
            Cargando datos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
            Asignar Tarea
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, isDarkMode && styles.darkText]}>
            Error
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkTextSecondary]}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const empleadoSeleccionado = empleados.find(emp => emp.id === formData.empleado_id);

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Asignar Tarea
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Información del empleado si viene preseleccionado */}
          {empleadoNombre && (
            <SlideInView direction="up" delay={100} duration={400}>
              <View style={[styles.empleadoInfo, isDarkMode && styles.darkCard]}>
                <View style={styles.empleadoHeader}>
                  <Ionicons name="person-circle" size={24} color={colors.primary} />
                  <Text style={[styles.empleadoLabel, isDarkMode && styles.darkText]}>
                    Asignando tarea a: {empleadoNombre}
                  </Text>
                </View>
              </View>
            </SlideInView>
          )}

          {/* Título */}
          <SlideInView direction="up" delay={150} duration={400}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Título de la tarea *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isDarkMode && styles.darkInput,
                  errors.titulo && styles.inputError
                ]}
                value={formData.titulo}
                onChangeText={(value) => updateFormData('titulo', value)}
                placeholder="Ingresa el título de la tarea"
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                maxLength={100}
              />
              {errors.titulo && (
                <Text style={styles.errorText}>{errors.titulo}</Text>
              )}
            </View>
          </SlideInView>

          {/* Descripción */}
          <SlideInView direction="up" delay={200} duration={400}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Descripción
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  isDarkMode && styles.darkInput,
                ]}
                value={formData.descripcion}
                onChangeText={(value) => updateFormData('descripcion', value)}
                placeholder="Describe los detalles de la tarea..."
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </SlideInView>

          {/* Empleado (si no viene preseleccionado) */}
          {!empleadoId && (
            <SlideInView direction="up" delay={250} duration={400}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>
                  Empleado *
                </Text>
                <View style={[styles.pickerContainer, isDarkMode && styles.darkCard]}>
                  {empleados.map((empleado) => (
                    <TouchableOpacity
                      key={empleado.id}
                      style={[
                        styles.pickerOption,
                        formData.empleado_id === empleado.id && styles.pickerOptionSelected,
                        errors.empleado_id && styles.inputError
                      ]}
                      onPress={() => updateFormData('empleado_id', empleado.id)}
                    >
                      <View style={styles.empleadoOption}>
                        <View>
                          <Text style={[
                            styles.empleadoOptionName,
                            isDarkMode && styles.darkText,
                            formData.empleado_id === empleado.id && styles.selectedText
                          ]}>
                            {empleado.first_name} {empleado.last_name}
                          </Text>
                          <Text style={[
                            styles.empleadoOptionDetail,
                            isDarkMode && styles.darkTextSecondary,
                            formData.empleado_id === empleado.id && styles.selectedTextSecondary
                          ]}>
                            {empleado.puesto || 'Sin puesto'} • {empleado.email}
                          </Text>
                        </View>
                        {formData.empleado_id === empleado.id && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.empleado_id && (
                  <Text style={styles.errorText}>{errors.empleado_id}</Text>
                )}
              </View>
            </SlideInView>
          )}

          {/* Prioridad */}
          <SlideInView direction="up" delay={300} duration={400}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Prioridad *
              </Text>
              <View style={[styles.pickerContainer, isDarkMode && styles.darkCard]}>
                {prioridades.map((prioridad) => (
                  <TouchableOpacity
                    key={prioridad.id}
                    style={[
                      styles.pickerOption,
                      formData.prioridad_id === prioridad.id && styles.pickerOptionSelected
                    ]}
                    onPress={() => updateFormData('prioridad_id', prioridad.id)}
                  >
                    <View style={styles.prioridadOption}>
                      <View style={[styles.prioridadIndicator, { backgroundColor: prioridad.color }]} />
                      <Text style={[
                        styles.prioridadText,
                        isDarkMode && styles.darkText,
                        formData.prioridad_id === prioridad.id && styles.selectedText
                      ]}>
                        {prioridad.nombre}
                      </Text>
                      {formData.prioridad_id === prioridad.id && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.prioridad_id && (
                <Text style={styles.errorText}>{errors.prioridad_id}</Text>
              )}
            </View>
          </SlideInView>

          {/* Fecha límite */}
          <SlideInView direction="up" delay={350} duration={400}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Fecha límite
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isDarkMode && styles.darkInput,
                  errors.fecha_limite && styles.inputError
                ]}
                value={formData.fecha_limite}
                onChangeText={(value) => updateFormData('fecha_limite', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                keyboardType="numeric"
                maxLength={10}
              />
              {errors.fecha_limite && (
                <Text style={styles.errorText}>{errors.fecha_limite}</Text>
              )}
            </View>
          </SlideInView>

          {/* Tiempo estimado */}
          <SlideInView direction="up" delay={400} duration={400}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Tiempo estimado (horas)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isDarkMode && styles.darkInput,
                  errors.tiempo_estimado_horas && styles.inputError
                ]}
                value={formData.tiempo_estimado_horas?.toString() || ''}
                onChangeText={(value) => updateFormData('tiempo_estimado_horas', value ? parseFloat(value) : undefined)}
                placeholder="Ej: 2.5"
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                keyboardType="numeric"
              />
              {errors.tiempo_estimado_horas && (
                <Text style={styles.errorText}>{errors.tiempo_estimado_horas}</Text>
              )}
            </View>
          </SlideInView>

          {/* Categoría */}
          <SlideInView direction="up" delay={450} duration={400}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Categoría(s)
              </Text>
              <View style={styles.categorySelectorContainer}>
                {categorias.map((categoria) => {
                  const isSelected = formData.categoria_ids?.includes(categoria.id);
                  return (
                    <TouchableOpacity
                      key={categoria.id}
                      style={[
                        styles.categoryButton,
                        isDarkMode && styles.darkCategoryButton,
                        isSelected && styles.categoryButtonSelected,
                      ]}
                      onPress={() => handleCategoryToggle(categoria.id)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        isDarkMode && styles.darkText,
                        isSelected && styles.categoryButtonTextSelected
                      ]}>
                        {/* Aquí puedes agregar un ícono si lo tienes en tu data */}
                        {categoria.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </SlideInView>

          {/* Ubicación */}
          <SlideInView direction="up" delay={500} duration={400}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Ubicación
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                value={formData.ubicacion}
                onChangeText={(value) => updateFormData('ubicacion', value)}
                placeholder="Oficina, Remoto, Cliente, etc."
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
              />
            </View>
          </SlideInView>

          {/* Notas para el empleado */}
          <SlideInView direction="up" delay={550} duration={400}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Notas para el empleado
              </Text>
              <TextInput
                style={[styles.textArea, isDarkMode && styles.darkInput]}
                value={formData.notas_empresa}
                onChangeText={(value) => updateFormData('notas_empresa', value)}
                placeholder="Instrucciones adicionales, contexto, recursos necesarios..."
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </SlideInView>

          {/* Opciones adicionales */}
          <SlideInView direction="up" delay={600} duration={400}>
            <View style={[styles.optionsCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.optionsTitle, isDarkMode && styles.darkText]}>
                Opciones adicionales
              </Text>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => updateFormData('requiere_aprobacion', !formData.requiere_aprobacion)}
              >
                <View style={styles.optionLeft}>
                  <Ionicons
                    name="shield-checkmark"
                    size={20}
                    color={formData.requiere_aprobacion ? colors.primary : isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  />
                  <Text style={[styles.optionText, isDarkMode && styles.darkText]}>
                    Requiere aprobación al completar
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  formData.requiere_aprobacion && styles.checkboxChecked
                ]}>
                  {formData.requiere_aprobacion && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => updateFormData('es_recurrente', !formData.es_recurrente)}
              >
                <View style={styles.optionLeft}>
                  <Ionicons
                    name="refresh"
                    size={20}
                    color={formData.es_recurrente ? colors.primary : isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  />
                  <Text style={[styles.optionText, isDarkMode && styles.darkText]}>
                    Tarea recurrente
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  formData.es_recurrente && styles.checkboxChecked
                ]}>
                  {formData.es_recurrente && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>

              {formData.es_recurrente && (
                <View style={styles.frecuenciaContainer}>
                  <Text style={[styles.label, isDarkMode && styles.darkText]}>
                    Repetir cada (días) *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      isDarkMode && styles.darkInput,
                      errors.frecuencia_dias && styles.inputError
                    ]}
                    value={formData.frecuencia_dias?.toString() || ''}
                    onChangeText={(value) => updateFormData('frecuencia_dias', value ? parseInt(value) : undefined)}
                    placeholder="Ej: 7 (semanal), 30 (mensual)"
                    placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    keyboardType="numeric"
                  />
                  {errors.frecuencia_dias && (
                    <Text style={styles.errorText}>{errors.frecuencia_dias}</Text>
                  )}
                </View>
              )}
            </View>
          </SlideInView>

          {/* Botón de envío */}
          <SlideInView direction="up" delay={650} duration={400}>
            <AnimatedTouchable
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                saving && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Asignar Tarea</Text>
              )}
            </AnimatedTouchable>
          </SlideInView>

          {/* Espacio adicional */}
          <View style={{ height: hp(4) }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  empleadoInfo: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...globalStyles.shadow,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  empleadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empleadoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.light.text,
  },
  darkInput: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    color: colors.dark.text,
  },
  textArea: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.light.text,
    minHeight: 100,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: colors.light.surface,
    borderRadius: 8,
    ...globalStyles.shadow,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  empleadoOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empleadoOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  empleadoOptionDetail: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  prioridadOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prioridadIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  prioridadText: {
    flex: 1,
    fontSize: 16,
    color: colors.light.text,
  },
  selectedText: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedTextSecondary: {
    color: colors.primary + '80',
  },
  optionsCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...globalStyles.shadow,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: colors.light.text,
    marginLeft: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frecuenciaContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
  categorySelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10, // Espacio entre botones
  },
  categoryButton: {
    backgroundColor: colors.light.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  darkCategoryButton: {
    backgroundColor: '#374151', // Un color oscuro para los botones en modo noche
    borderColor: colors.dark.border,
  },
  categoryButtonSelected: {
    backgroundColor: '#FFC107', // Amarillo, como en tu imagen
    borderColor: '#FFC107',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
  },
  categoryButtonTextSelected: {
    color: '#111827', // Un color oscuro para el texto del botón amarillo
    fontWeight: '600',
  },
});

export default AsignarTarea;