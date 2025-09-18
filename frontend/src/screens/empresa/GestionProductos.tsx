// Archivo: src/screens/empresa/GestionProductos.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { productoService, type Producto, type CrearProductoRequest } from '../../services/productoService';
import { formatCurrency, getErrorMessage } from '../../utils/networkUtils';
import { colors } from '../../styles/colors';
import { globalStyles } from '../../styles/globalStyles';

const GestionProductos: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Estados del Modal y Formulario
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_venta: '',
    stock: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productoService.getProductosByEmpresa();
      setProductos(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenModal = () => {
    setFormData({ nombre: '', descripcion: '', precio_venta: '', stock: '' });
    setFormErrors({});
    setModalVisible(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido.';
    if (!formData.precio_venta.trim()) errors.precio_venta = 'El precio es requerido.';
    else if (isNaN(parseFloat(formData.precio_venta)) || parseFloat(formData.precio_venta) <= 0) {
      errors.precio_venta = 'El precio debe ser un número positivo.';
    }
    if (!formData.stock.trim()) errors.stock = 'El stock es requerido.';
    else if (isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0) {
      errors.stock = 'El stock debe ser un número igual o mayor a 0.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProducto = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const datosNuevoProducto: CrearProductoRequest = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        precio_venta: parseFloat(formData.precio_venta),
        stock: parseInt(formData.stock),
      };
      await productoService.crearProducto(datosNuevoProducto);
      Alert.alert('Éxito', 'Producto creado correctamente.');
      setModalVisible(false);
      loadProductos(); // Recargar la lista
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const eliminarProducto = async (producto: Producto) => {
    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro de que deseas eliminar "${producto.nombre}"?\n\nEsta acción no se puede deshacer y se eliminarán todas las ventas asociadas a este producto.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await productoService.eliminarProducto(producto.id);
              Alert.alert('Éxito', 'Producto eliminado correctamente');
              await loadProductos(); // Recargar la lista
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

  const renderProducto = ({ item }: { item: Producto }) => (
    <View style={[styles.card, isDarkMode && styles.darkCard]}>
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
            <Ionicons name="cube-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.productoNombre, isDarkMode && styles.darkText]}>{item.nombre}</Text>
          <Text style={[styles.productoDescripcion, isDarkMode && styles.darkTextSecondary]}>{item.descripcion}</Text>
          <View style={styles.detailsContainer}>
            <Text style={styles.productoPrecio}>{formatCurrency(item.precio_venta)}</Text>
            <Text style={[styles.productoStock, isDarkMode && styles.darkTextSecondary]}>Stock: {item.stock}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => eliminarProducto(item)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Gestión de Productos</Text>
        <TouchableOpacity onPress={handleOpenModal} style={styles.addButton}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={productos}
          renderItem={renderProducto}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.emptyText, isDarkMode && styles.darkTextSecondary]}>No hay productos creados.</Text>
              <Text style={[styles.emptySubText, isDarkMode && styles.darkTextSecondary]}>Toca (+) para añadir el primero.</Text>
            </View>
          }
          onRefresh={loadProductos}
          refreshing={loading}
        />
      )}

      {/* Modal para crear producto */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>Nuevo Producto</Text>
            
            <TextInput
              placeholder="Nombre del producto *"
              value={formData.nombre}
              onChangeText={(text) => setFormData(prev => ({...prev, nombre: text}))}
              style={[styles.input, isDarkMode && styles.darkInput]}
              placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
            />
            {formErrors.nombre && <Text style={styles.errorText}>{formErrors.nombre}</Text>}

            <TextInput
              placeholder="Descripción"
              value={formData.descripcion}
              onChangeText={(text) => setFormData(prev => ({...prev, descripcion: text}))}
              style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
              multiline
              placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
            />
            
            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 8}}>
                    <TextInput
                        placeholder="Precio *"
                        value={formData.precio_venta}
                        onChangeText={(text) => setFormData(prev => ({...prev, precio_venta: text}))}
                        style={[styles.input, isDarkMode && styles.darkInput]}
                        keyboardType="numeric"
                        placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    />
                    {formErrors.precio_venta && <Text style={styles.errorText}>{formErrors.precio_venta}</Text>}
                </View>
                <View style={{flex: 1, marginLeft: 8}}>
                    <TextInput
                        placeholder="Stock *"
                        value={formData.stock}
                        onChangeText={(text) => setFormData(prev => ({...prev, stock: text}))}
                        style={[styles.input, isDarkMode && styles.darkInput]}
                        keyboardType="number-pad"
                        placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                    />
                    {formErrors.stock && <Text style={styles.errorText}>{formErrors.stock}</Text>}
                </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.button, styles.cancelButton]}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveProducto} style={[styles.button, styles.saveButton]} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.light.background },
    darkContainer: { backgroundColor: colors.dark.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
    darkHeader: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.light.text },
    addButton: { padding: 8 },
    listContainer: { padding: 16 },
    card: { backgroundColor: colors.light.surface, borderRadius: 12, marginBottom: 12, padding: 16, ...globalStyles.shadow },
    darkCard: { backgroundColor: colors.dark.surface },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    infoContainer: { flex: 1 },
    productoNombre: { fontSize: 16, fontWeight: '600', color: colors.light.text },
    productoDescripcion: { fontSize: 14, color: colors.light.textSecondary, marginVertical: 4 },
    detailsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    productoPrecio: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
    productoStock: { fontSize: 14, color: colors.light.textSecondary },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: '40%' },
    emptyText: { fontSize: 18, color: colors.light.textSecondary, marginTop: 16 },
    emptySubText: { fontSize: 14, color: colors.light.textSecondary, marginTop: 8 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.light.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    darkModalContent: { backgroundColor: colors.dark.surface },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: colors.light.text },
    input: { borderWidth: 1, borderColor: colors.light.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.light.text },
    darkInput: { borderColor: colors.dark.border, backgroundColor: colors.dark.background, color: colors.dark.text },
    textArea: { height: 80, textAlignVertical: 'top' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
    cancelButton: { backgroundColor: colors.light.border, marginRight: 8 },
    saveButton: { backgroundColor: colors.primary, marginLeft: 8 },
    buttonText: { color: colors.light.text, fontWeight: 'bold' },
    errorText: { color: colors.error, marginTop: -8, marginBottom: 8 },
    deleteButton: { padding: 8 },
    darkText: { color: colors.dark.text },
    darkTextSecondary: { color: colors.dark.textSecondary },
});

export default GestionProductos;