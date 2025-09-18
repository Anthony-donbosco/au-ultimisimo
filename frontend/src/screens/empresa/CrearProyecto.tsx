import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';
import { proyectoService, CrearProyectoRequest } from '../../services/proyectoService';

interface CrearProyectoProps {
  navigation: any;
}

interface Meta {
  titulo: string;
  descripcion: string;
  fechaLimite?: string;
}

const CrearProyecto: React.FC<CrearProyectoProps> = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState<CrearProyectoRequest>({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    presupuesto: 0,
    notas: '',
  });

  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(undefined);
  const [fechaLimite, setFechaLimite] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState<{
    show: boolean;
    mode: 'start' | 'end';
  }>({ show: false, mode: 'start' });

  const [metas, setMetas] = useState<Meta[]>([]);
  const [nuevaMeta, setNuevaMeta] = useState<Meta>({
    titulo: '',
    descripcion: '',
  });

  const [loading, setLoading] = useState(false);

  // Manejar cambios en el formulario
  const handleInputChange = (field: keyof CrearProyectoRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Manejar cambio de fecha
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentMode = showDatePicker.mode;
    setShowDatePicker({ show: false, mode: 'start' });

    if (selectedDate && event.type === 'set') {
      if (currentMode === 'start') {
        setFechaInicio(selectedDate);
        setFormData(prev => ({
          ...prev,
          fechaInicio: selectedDate.toISOString().split('T')[0],
        }));
      } else {
        setFechaLimite(selectedDate);
        setFormData(prev => ({
          ...prev,
          fechaLimite: selectedDate.toISOString().split('T')[0],
        }));
      }
    }
  };

  // Agregar meta
  const agregarMeta = () => {
    if (!nuevaMeta.titulo.trim()) {
      Alert.alert('Error', 'El título de la meta es requerido');
      return;
    }

    setMetas(prev => [...prev, { ...nuevaMeta }]);
    setNuevaMeta({ titulo: '', descripcion: '' });
  };

  // Eliminar meta
  const eliminarMeta = (index: number) => {
    setMetas(prev => prev.filter((_, i) => i !== index));
  };

  // Validar formulario
  const validarFormulario = (): boolean => {
    const validacion = proyectoService.validarProyecto(formData);

    if (!validacion.valido) {
      Alert.alert('Errores de validación', validacion.errores.join('\n'));
      return false;
    }

    return true;
  };

  // Crear proyecto
  const crearProyecto = async () => {
    if (!validarFormulario()) return;

    try {
      setLoading(true);

      const datosProyecto: CrearProyectoRequest = {
        ...formData,
        metas: metas.length > 0 ? metas : undefined,
      };

      console.log('📋 Datos del proyecto a enviar:', JSON.stringify(datosProyecto, null, 2));
      console.log('📝 Metas a enviar:', metas);

      const proyecto = await proyectoService.crearProyecto(datosProyecto);

      Alert.alert(
        'Éxito',
        'Proyecto creado exitosamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creando proyecto:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo crear el proyecto'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDarkMode && styles.darkContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Crear Proyecto</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Información básica */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Información Básica</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Título *</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              value={formData.titulo}
              onChangeText={(value) => handleInputChange('titulo', value)}
              placeholder="Ingresa el título del proyecto"
              placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
              maxLength={200}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
              value={formData.descripcion}
              onChangeText={(value) => handleInputChange('descripcion', value)}
              placeholder="Describe el proyecto"
              placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Prioridad</Text>
            <View style={[styles.pickerContainer, isDarkMode && styles.darkInput]}>
              <Picker
                selectedValue={formData.prioridad}
                onValueChange={(value) => handleInputChange('prioridad', value)}
                style={[styles.picker, isDarkMode && { color: colors.dark.text }]}
              >
                <Picker.Item label="Baja" value="baja" />
                <Picker.Item label="Media" value="media" />
                <Picker.Item label="Alta" value="alta" />
                <Picker.Item label="Crítica" value="critica" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Fechas */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Fechas</Text>
          {showDatePicker.show && (
            <Text style={[styles.debugText, isDarkMode && styles.darkText]}>
              📅 Picker activo: {showDatePicker.mode} - Platform: {Platform.OS}
            </Text>
          )}

          <View style={styles.dateRow}>
            <View style={styles.dateInputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Fecha de Inicio</Text>
              <TouchableOpacity
                style={[styles.dateButton, isDarkMode && styles.darkInput]}
                onPress={() => {
                  console.log('Abriendo selector de fecha de inicio');
                  setShowDatePicker({ show: true, mode: 'start' });
                }}
              >
                <Text style={[styles.dateButtonText, isDarkMode && styles.darkText]}>
                  {fechaInicio ? fechaInicio.toLocaleDateString() : 'Seleccionar'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={isDarkMode ? colors.dark.textSecondary : "#7f8c8d"} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Fecha Límite</Text>
              <TouchableOpacity
                style={[styles.dateButton, isDarkMode && styles.darkInput]}
                onPress={() => {
                  console.log('Abriendo selector de fecha límite');
                  setShowDatePicker({ show: true, mode: 'end' });
                }}
              >
                <Text style={[styles.dateButtonText, isDarkMode && styles.darkText]}>
                  {fechaLimite ? fechaLimite.toLocaleDateString() : 'Seleccionar'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={isDarkMode ? colors.dark.textSecondary : "#7f8c8d"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Presupuesto */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Presupuesto</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Monto (USD)</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              value={formData.presupuesto?.toString() || ''}
              onChangeText={(value) => handleInputChange('presupuesto', parseFloat(value) || 0)}
              placeholder="0.00"
              placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Metas */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Metas del Proyecto</Text>
            <Text style={[styles.sectionSubtitle, isDarkMode && styles.darkTextSecondary]}>
              {metas.length} meta{metas.length !== 1 ? 's' : ''} agregada{metas.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Lista de metas */}
          {metas.map((meta, index) => (
            <View key={index} style={[styles.metaItem, isDarkMode && styles.darkMetaItem]}>
              <View style={styles.metaContent}>
                <Text style={[styles.metaTitulo, isDarkMode && styles.darkText]}>{meta.titulo}</Text>
                {meta.descripcion && (
                  <Text style={[styles.metaDescripcion, isDarkMode && styles.darkTextSecondary]}>{meta.descripcion}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.eliminarMetaButton}
                onPress={() => eliminarMeta(index)}
              >
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Agregar nueva meta */}
          <View style={[styles.nuevaMetaContainer, isDarkMode && styles.darkNuevaMetaContainer]}>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              value={nuevaMeta.titulo}
              onChangeText={(value) => setNuevaMeta(prev => ({ ...prev, titulo: value }))}
              placeholder="Título de la meta"
              placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }, isDarkMode && styles.darkInput]}
              value={nuevaMeta.descripcion}
              onChangeText={(value) => setNuevaMeta(prev => ({ ...prev, descripcion: value }))}
              placeholder="Descripción (opcional)"
              placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
            />
            <TouchableOpacity style={styles.agregarMetaButton} onPress={agregarMeta}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.agregarMetaText}>Agregar Meta</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notas */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Notas Adicionales</Text>

          <TextInput
            style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
            value={formData.notas}
            onChangeText={(value) => handleInputChange('notas', value)}
            placeholder="Notas o comentarios adicionales"
            placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Botón crear */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.crearButton, loading && styles.crearButtonDisabled]}
            onPress={crearProyecto}
            disabled={loading}
          >
            <Text style={styles.crearButtonText}>
              {loading ? 'Creando...' : 'Crear Proyecto'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker.show && Platform.OS === 'ios' && (
        <DateTimePicker
          value={showDatePicker.mode === 'start' ? fechaInicio || new Date() : fechaLimite || new Date()}
          mode="date"
          display="spinner"
          onChange={onDateChange}
          minimumDate={showDatePicker.mode === 'end' ? fechaInicio : undefined}
        />
      )}

      {showDatePicker.show && Platform.OS === 'android' && (
        <DateTimePicker
          value={showDatePicker.mode === 'start' ? fechaInicio || new Date() : fechaLimite || new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={showDatePicker.mode === 'end' ? fechaInicio : undefined}
        />
      )}

      {showDatePicker.show && Platform.OS === 'web' && (
        <input
          type="date"
          value={showDatePicker.mode === 'start' ?
            fechaInicio?.toISOString().split('T')[0] || '' :
            fechaLimite?.toISOString().split('T')[0] || ''
          }
          onChange={(e) => {
            const selectedDate = new Date(e.target.value);
            onDateChange({ type: 'set' }, selectedDate);
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            padding: '10px',
            fontSize: '16px'
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInputGroup: {
    flex: 1,
    marginRight: 8,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  metaContent: {
    flex: 1,
  },
  metaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  metaDescripcion: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  eliminarMetaButton: {
    padding: 8,
  },
  nuevaMetaContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  agregarMetaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  agregarMetaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    padding: 20,
  },
  crearButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  crearButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  crearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Dark mode styles
  darkContainer: {
    backgroundColor: colors.dark.background,
  },
  darkHeader: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  darkSection: {
    backgroundColor: colors.dark.surface,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
  darkInput: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    color: colors.dark.text,
  },
  darkMetaItem: {
    backgroundColor: colors.dark.background,
  },
  darkNuevaMetaContainer: {
    borderTopColor: colors.dark.border,
  },
  debugText: {
    fontSize: 12,
    color: '#e67e22',
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
    padding: 4,
    backgroundColor: '#fef9e7',
    borderRadius: 4,
  },
});

export default CrearProyecto;