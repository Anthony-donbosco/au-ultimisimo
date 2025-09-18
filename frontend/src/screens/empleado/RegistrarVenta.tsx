// Archivo: src/screens/empleado/RegistrarVenta.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { productoService, type Producto } from '../../services/productoService';
import { formatCurrency, getErrorMessage } from '../../utils/networkUtils';
import { colors } from '../../styles/colors';

const RegistrarVenta: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productoService.getProductosParaVenta();
      setProductos(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedProducto = useMemo(() => {
    return productos.find(p => p.id === selectedProductId);
  }, [selectedProductId, productos]);

  const totalVenta = useMemo(() => {
    if (!selectedProducto || !cantidad) return 0;
    const cantNum = parseInt(cantidad, 10);
    if (isNaN(cantNum) || cantNum <= 0) return 0;
    return selectedProducto.precio_venta * cantNum;
  }, [selectedProducto, cantidad]);

  const handleRegistrarVenta = async () => {
    if (!selectedProductId) {
      Alert.alert('Error', 'Debes seleccionar un producto.');
      return;
    }
    const cantNum = parseInt(cantidad, 10);
    if (isNaN(cantNum) || cantNum <= 0) {
      Alert.alert('Error', 'La cantidad debe ser un número mayor a 0.');
      return;
    }
    if (selectedProducto && selectedProducto.stock < cantNum) {
        Alert.alert('Error', `Stock insuficiente. Solo quedan ${selectedProducto.stock} unidades.`);
        return;
    }

    setIsSaving(true);
    try {
      await productoService.registrarVenta({ producto_id: selectedProductId, cantidad: cantNum });
      Alert.alert('Éxito', 'Venta registrada correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderProducto = ({ item }: { item: Producto }) => {
    const isSelected = item.id === selectedProductId;
    return (
        <TouchableOpacity 
            style={[
                styles.card, 
                isDarkMode && styles.darkCard,
                isSelected && styles.selectedCard
            ]} 
            onPress={() => setSelectedProductId(item.id)}
        >
            <View style={styles.cardContent}>
                <View style={styles.infoContainer}>
                    <Text style={[styles.productoNombre, isDarkMode && styles.darkText, isSelected && styles.selectedText]}>{item.nombre}</Text>
                    <View style={styles.detailsContainer}>
                        <Text style={[styles.productoPrecio, isSelected && styles.selectedText]}>{formatCurrency(item.precio_venta)}</Text>
                        <Text style={[styles.productoStock, isDarkMode && styles.darkTextSecondary, isSelected && styles.selectedTextSecondary]}>Stock: {item.stock}</Text>
                    </View>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
            </View>
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Registrar Venta</Text>
        <View style={{width: 28}} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <>
            <View style={styles.listSection}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>1. Selecciona un Producto</Text>
                <FlatList
                    data={productos}
                    renderItem={renderProducto}
                    keyExtractor={(item) => item.id.toString()}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, isDarkMode && styles.darkTextSecondary]}>No hay productos disponibles.</Text>
                        </View>
                    }
                />
            </View>

            <View style={[styles.summarySection, isDarkMode && styles.darkSummarySection]}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>2. Define la Cantidad</Text>
                <View style={styles.cantidadContainer}>
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>Cantidad:</Text>
                    <TextInput
                        style={[styles.input, isDarkMode && styles.darkInput]}
                        value={cantidad}
                        onChangeText={setCantidad}
                        keyboardType="number-pad"
                        maxLength={3}
                        />
                </View>

                <View style={styles.totalContainer}>
                    <Text style={[styles.totalLabel, isDarkMode && styles.darkText]}>Total:</Text>
                    <Text style={styles.totalAmount}>{formatCurrency(totalVenta)}</Text>
                </View>
                
                <TouchableOpacity onPress={handleRegistrarVenta} style={[styles.button, styles.saveButton]} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrar Venta</Text>}
                </TouchableOpacity>
            </View>
        </>
      )}

    </SafeAreaView>
  );
};

// Estilos para RegistrarVenta.tsx
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.light.background },
    darkContainer: { backgroundColor: colors.dark.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
    darkHeader: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.light.text },
    listSection: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: colors.light.text },
    card: { backgroundColor: colors.light.surface, borderRadius: 12, marginBottom: 12, padding: 16, borderWidth: 2, borderColor: 'transparent' },
    darkCard: { backgroundColor: colors.dark.surface },
    selectedCard: { borderColor: colors.primary, backgroundColor: colors.primary + '1A' },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    infoContainer: { flex: 1 },
    productoNombre: { fontSize: 16, fontWeight: '600', color: colors.light.text },
    detailsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    productoPrecio: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
    productoStock: { fontSize: 14, color: colors.light.textSecondary },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: colors.light.textSecondary },
    summarySection: { padding: 16, backgroundColor: colors.light.surface, borderTopWidth: 1, borderTopColor: colors.light.border },
    darkSummarySection: { backgroundColor: colors.dark.surface, borderTopColor: colors.dark.border },
    cantidadContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    label: { fontSize: 16, marginRight: 16, color: colors.light.text },
    input: { flex: 1, borderWidth: 1, borderColor: colors.light.border, borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', color: colors.light.text },
    darkInput: { borderColor: colors.dark.border, backgroundColor: colors.dark.background, color: colors.dark.text },
    totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    totalLabel: { fontSize: 18, fontWeight: '500', color: colors.light.text },
    totalAmount: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
    button: { padding: 16, borderRadius: 8, alignItems: 'center' },
    saveButton: { backgroundColor: colors.primary },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    darkText: { color: colors.dark.text },
    darkTextSecondary: { color: colors.dark.textSecondary },
    selectedText: { color: colors.primary },
    selectedTextSecondary: { color: colors.primary },
});

export default RegistrarVenta;