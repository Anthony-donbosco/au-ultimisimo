import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { empleadoService, type Categoria, type TipoPago } from '../../services/empleadoService';
import { formatCurrency, getErrorMessage } from '../../utils/networkUtils';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';


interface GastoForm {
  concepto: string;
  descripcion: string;
  monto: string;
  fecha: Date;
  categoriaId: number | null;
  tipoPagoId: number | null;
  proveedor: string;
  ubicacion: string;
  notas: string;
  comprobante: ImagePicker.ImagePickerAsset | null;
}

const CrearGastoEmpleado: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { wp, hp } = useResponsive();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tiposPago, setTiposPago] = useState<TipoPago[]>([]);

  // Estados del formulario
  const [formData, setFormData] = useState<GastoForm>({
    concepto: '',
    descripcion: '',
    monto: '',
    fecha: new Date(),
    categoriaId: null,
    tipoPagoId: null,
    proveedor: '',
    ubicacion: '',
    notas: '',
    comprobante: null,
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadFormData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos para acceder a las imágenes');
    }
  };

  const loadFormData = async () => {
    try {
      setLoading(true);

      const [categoriasData, tiposPagoData] = await Promise.all([
        empleadoService.getCategorias(),
        empleadoService.getTiposPago(),
      ]);

      setCategorias(categoriasData);
      setTiposPago(tiposPagoData);

      console.log('✅ Datos del formulario cargados exitosamente');
    } catch (error) {
      console.error('❌ Error cargando datos del formulario:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos necesarios');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.concepto.trim()) {
      errors.concepto = 'El concepto es requerido';
    } else if (formData.concepto.length < 3) {
      errors.concepto = 'El concepto debe tener al menos 3 caracteres';
    }

    if (!formData.monto.trim()) {
      errors.monto = 'El monto es requerido';
    } else {
      const monto = parseFloat(formData.monto);
      if (isNaN(monto) || monto <= 0) {
        errors.monto = 'El monto debe ser un número mayor a 0';
      }
    }

    if (!formData.categoriaId) {
      errors.categoria = 'Selecciona una categoría';
    }

    if (!formData.tipoPagoId) {
      errors.tipoPago = 'Selecciona un método de pago';
    }

    if (formData.descripcion.trim().length < 10) {
      errors.descripcion = 'La descripción debe tener al menos 10 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateFormField = (field: keyof GastoForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      updateFormField('fecha', selectedDate);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        updateFormField('comprobante', result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        updateFormField('comprobante', result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const removeImage = () => {
    updateFormField('comprobante', null);
  };

  const showImagePicker = () => {
    Alert.alert(
      'Seleccionar Comprobante',
      'Elige una opción para agregar el comprobante',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cámara', onPress: takePhoto },
        { text: 'Galería', onPress: pickImage },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Por favor corrige los errores en el formulario');
      return;
    }

    try {
      setSubmitting(true);

        const gastoData = {
        categoria_id: formData.categoriaId!, // Cambiar por categoria_id
        tipo_pago_id: formData.tipoPagoId!, // Cambiar por tipo_pago_id
        concepto: formData.concepto.trim(),
        descripcion: formData.descripcion.trim(),
        monto: parseFloat(formData.monto),
        fecha: formData.fecha.toISOString(),
        proveedor: formData.proveedor.trim() || undefined,
        ubicacion: formData.ubicacion.trim() || undefined,
        adjunto_url: undefined, // Por ahora undefined, después manejarás el archivo
        };

        await empleadoService.crearGasto(gastoData);

      Alert.alert(
        'Éxito',
        'Gasto registrado exitosamente. Estará pendiente de aprobación por la empresa.',
        [{
          text: 'OK',
          onPress: () => navigation.goBack()
        }]
      );

    } catch (error: any) {
      console.error('Error creando gasto:', error);
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoriaSeleccionada = () => {
    return categorias.find(c => c.id === formData.categoriaId);
  };

  const getTipoPagoSeleccionado = () => {
    return tiposPago.find(t => t.id === formData.tipoPagoId);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
            Registrar Gasto
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Cargando formulario...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <KeyboardAvoidingView
        style={[styles.container, isDarkMode && styles.darkContainer]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            disabled={submitting}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
            Registrar Gasto
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.content, isDarkMode && styles.darkContent]} showsVerticalScrollIndicator={false}>
          {/* Información Básica */}
          <View style={[styles.section, isDarkMode && styles.darkSection]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Información Básica *
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                Concepto *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  isDarkMode && styles.darkTextInput,
                  formErrors.concepto && styles.inputError
                ]}
                value={formData.concepto}
                onChangeText={(text) => updateFormField('concepto', text)}
                placeholder="ej: Almuerzo de trabajo con cliente"
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                maxLength={100}
              />
              {formErrors.concepto && (
                <Text style={styles.errorText}>{formErrors.concepto}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                Descripción *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  isDarkMode && styles.darkTextInput,
                  formErrors.descripcion && styles.inputError
                ]}
                value={formData.descripcion}
                onChangeText={(text) => updateFormField('descripcion', text)}
                placeholder="Describe detalladamente el gasto y su justificación..."
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={[styles.characterCount, isDarkMode && styles.darkTextSecondary]}>
                {formData.descripcion.length}/500
              </Text>
              {formErrors.descripcion && (
                <Text style={styles.errorText}>{formErrors.descripcion}</Text>
              )}
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  Monto ($) *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    isDarkMode && styles.darkTextInput,
                    formErrors.monto && styles.inputError
                  ]}
                  value={formData.monto}
                  onChangeText={(text) => updateFormField('monto', text)}
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  keyboardType="decimal-pad"
                />
                {formErrors.monto && (
                  <Text style={styles.errorText}>{formErrors.monto}</Text>
                )}
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  Fecha *
                </Text>
                <TouchableOpacity
                  style={[styles.dateButton, isDarkMode && styles.darkDateButton]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateButtonText, isDarkMode && styles.darkText]}>
                    {formData.fecha.toLocaleDateString()}
                  </Text>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData.fecha}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Categoría y Método de Pago */}
          <View style={[styles.section, isDarkMode && styles.darkSection]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Categoría y Pago *
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                Categoría *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                {categorias.map((categoria) => (
                  <TouchableOpacity
                    key={categoria.id}
                    style={[
                      styles.categoryChip,
                      formData.categoriaId === categoria.id && styles.categoryChipSelected,
                      isDarkMode && styles.darkCategoryChip,
                      formData.categoriaId === categoria.id && isDarkMode && styles.darkCategoryChipSelected,
                    ]}
                    onPress={() => updateFormField('categoriaId', categoria.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      formData.categoriaId === categoria.id && styles.categoryChipTextSelected,
                      isDarkMode && styles.darkText,
                      formData.categoriaId === categoria.id && { color: '#fff' },
                    ]}>
                      {categoria.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {formErrors.categoria && (
                <Text style={styles.errorText}>{formErrors.categoria}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                Método de Pago *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentsScroll}>
                {tiposPago.map((tipo) => (
                  <TouchableOpacity
                    key={tipo.id}
                    style={[
                      styles.paymentChip,
                      formData.tipoPagoId === tipo.id && styles.paymentChipSelected,
                      isDarkMode && styles.darkPaymentChip,
                      formData.tipoPagoId === tipo.id && isDarkMode && styles.darkPaymentChipSelected,
                    ]}
                    onPress={() => updateFormField('tipoPagoId', tipo.id)}
                  >
                    <Ionicons 
                      name={tipo.icono as any} 
                      size={16} 
                      color={formData.tipoPagoId === tipo.id ? '#fff' : colors.primary} 
                    />
                    <Text style={[
                      styles.paymentChipText,
                      formData.tipoPagoId === tipo.id && styles.paymentChipTextSelected,
                      isDarkMode && styles.darkText,
                      formData.tipoPagoId === tipo.id && { color: '#fff' },
                    ]}>
                      {tipo.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {formErrors.tipoPago && (
                <Text style={styles.errorText}>{formErrors.tipoPago}</Text>
              )}
            </View>
          </View>

          {/* Información Adicional */}
          <View style={[styles.section, isDarkMode && styles.darkSection]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Información Adicional
            </Text>

            <View style={styles.rowInputs}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  Proveedor
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={formData.proveedor}
                  onChangeText={(text) => updateFormField('proveedor', text)}
                  placeholder="ej: Restaurant El Buen Sabor"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  maxLength={100}
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  Ubicación
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={formData.ubicacion}
                  onChangeText={(text) => updateFormField('ubicacion', text)}
                  placeholder="ej: San Salvador"
                  placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                  maxLength={100}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                Notas adicionales
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  isDarkMode && styles.darkTextInput
                ]}
                value={formData.notas}
                onChangeText={(text) => updateFormField('notas', text)}
                placeholder="Cualquier información adicional relevante..."
                placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={[styles.characterCount, isDarkMode && styles.darkTextSecondary]}>
                {formData.notas.length}/300
              </Text>
            </View>
          </View>

          {/* Comprobante */}
          <View style={[styles.section, isDarkMode && styles.darkSection]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Comprobante
            </Text>
            <Text style={[styles.sectionSubtitle, isDarkMode && styles.darkTextSecondary]}>
              Adjunta una foto del recibo o comprobante (recomendado)
            </Text>

            {formData.comprobante ? (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: formData.comprobante.uri }} 
                  style={styles.comprobanteImage}
                  resizeMode="cover"
                />
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={[styles.imageActionButton, styles.changeImageButton]}
                    onPress={showImagePicker}
                  >
                    <Ionicons name="camera" size={16} color="#fff" />
                    <Text style={styles.imageActionButtonText}>Cambiar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.imageActionButton, styles.removeImageButton]}
                    onPress={removeImage}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                    <Text style={styles.imageActionButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadButton, isDarkMode && styles.darkUploadButton]}
                onPress={showImagePicker}
              >
                <Ionicons name="camera" size={32} color={colors.primary} />
                <Text style={[styles.uploadButtonText, isDarkMode && styles.darkText]}>
                  Agregar Comprobante
                </Text>
                <Text style={[styles.uploadButtonSubtext, isDarkMode && styles.darkTextSecondary]}>
                  Toca para tomar foto o seleccionar de galería
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Resumen */}
          <View style={[styles.section, isDarkMode && styles.darkSection]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Resumen
            </Text>
            
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, isDarkMode && styles.darkTextSecondary]}>Monto:</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  {formData.monto ? formatCurrency(parseFloat(formData.monto)) : '$0.00'}
                </Text>
              </View>
              
              {getCategoriaSeleccionada() && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, isDarkMode && styles.darkTextSecondary]}>Categoría:</Text>
                  <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                    {getCategoriaSeleccionada()?.nombre}
                  </Text>
                </View>
              )}
              
              {getTipoPagoSeleccionado() && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, isDarkMode && styles.darkTextSecondary]}>Método de pago:</Text>
                  <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                    {getTipoPagoSeleccionado()?.nombre}
                  </Text>
                </View>
              )}
              
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, isDarkMode && styles.darkTextSecondary]}>Estado:</Text>
                <View style={styles.statusPendingBadge}>
                  <Text style={styles.statusPendingText}>Pendiente de Aprobación</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Espacio adicional para el scroll */}
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
  submitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.light.text,
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.light.background,
  },
  darkContent: {
    backgroundColor: colors.dark.background,
  },
  section: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...globalStyles.shadow,
  },
  darkSection: {
    backgroundColor: colors.dark.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 16,
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
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.light.background,
  },
  darkDateButton: {
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.background,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.light.text,
  },
  categoriesScroll: {
    maxHeight: 100,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.light.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  darkCategoryChip: {
    backgroundColor: colors.dark.background,
    borderColor: colors.dark.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  darkCategoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.light.text,
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentsScroll: {
    maxHeight: 100,
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.light.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 6,
  },
  darkPaymentChip: {
    backgroundColor: colors.dark.background,
    borderColor: colors.dark.border,
  },
  paymentChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  darkPaymentChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentChipText: {
    fontSize: 14,
    color: colors.light.text,
  },
  paymentChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
  },
  comprobanteImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  changeImageButton: {
    backgroundColor: colors.primary,
  },
  removeImageButton: {
    backgroundColor: colors.error,
  },
  imageActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primary + '10',
  },
  darkUploadButton: {
    backgroundColor: colors.primary + '15',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryContainer: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
  },
  statusPendingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  statusPendingText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default CrearGastoEmpleado;