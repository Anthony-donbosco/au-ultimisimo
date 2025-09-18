import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { formatCurrency, formatDate } from '../../utils/networkUtils';
import { useTabBarVisibility } from '../../navigation/useTabBarVisibility';
import { financialService } from '../../services/financialService';

interface Transaccion {
  id: string; // Ahora es string para permitir IDs únicos como "ingreso-1", "gasto-1"
  originalId?: number; // ID original del backend
  nombre: string;
  categoria: string;
  monto: number;
  fecha: string;
  tipo: 'ingreso' | 'gasto';
  descripcion?: string;
}

interface TransaccionesProps {
  onAuthChange: (isAuth: boolean) => void;
}

const Transacciones: React.FC<TransaccionesProps> = ({ onAuthChange }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<'all' | 'income' | 'expense'>('all');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    nombre: '',
    categoria: '',
    monto: '',
    tipo: 'gasto' as 'ingreso' | 'gasto',
    descripcion: '',
  });

  const categoriasIngreso = ['Salario', 'Freelance', 'Inversiones', 'Ventas', 'Otros'];
  const categoriasGasto = ['Alimentación', 'Transporte', 'Entretenimiento', 'Compras', 'Servicios', 'Otros'];

  useEffect(() => {
    loadTransacciones();
  }, []);

  // Recargar cuando cambie el filtro
  useEffect(() => {
    if (transacciones.length > 0) { // Solo recargar si ya hay datos cargados inicialmente
      loadTransacciones();
    }
  }, [filtroTipo]);

  const { setIsVisible } = useTabBarVisibility();

  const lastOffsetY = useRef(0);
  const lastAction = useRef<"show" | "hide">("show");

  const loadTransacciones = async () => {
    try {
      setLoading(true);

      // Mapear filtro de UI a formato del backend
      const tipoBackend = filtroTipo === 'all' ? 'all' :
                         filtroTipo === 'income' ? 'ingreso' : 'gasto';

      // Obtener transacciones reales del backend
      const data = await financialService.getTransactions('mes_actual', tipoBackend);

      // Convertir formato del backend al formato de la UI
      const transaccionesFormateadas = data.transacciones.map((t, index) => ({
        id: `${t.tipo}-${t.id}`, // Crear ID único combinando tipo e id
        originalId: t.id, // Mantener ID original por si se necesita
        nombre: t.nombre,
        categoria: t.categoria,
        monto: t.tipo === 'gasto' ? -Math.abs(t.monto) : Math.abs(t.monto), // Negativos para gastos
        fecha: t.fecha,
        tipo: t.tipo,
        descripcion: '' // El backend no devuelve descripción, se podría agregar después
      }));

      setTransacciones(transaccionesFormateadas);
      setLoading(false);
    } catch (error) {
      console.error('Error loading transacciones:', error);
      setLoading(false);
      // Fallback a array vacío en caso de error
      setTransacciones([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransacciones();
    setRefreshing(false);
  };

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;

    // Mostrar siempre si estás casi arriba
    if (y < 16 && lastAction.current !== "show") {
      setIsVisible(true);
      lastAction.current = "show";
      lastOffsetY.current = y;
      return;
    }

    const delta = y - lastOffsetY.current;
    const THRESHOLD = 12; // umbral anti-parpadeo

    if (Math.abs(delta) < THRESHOLD) return;

    if (delta > 0 && lastAction.current !== "hide") {
      // Scrolling down → ocultar
      setIsVisible(false);
      lastAction.current = "hide";
    } else if (delta < 0 && lastAction.current !== "show") {
      // Scrolling up → mostrar
      setIsVisible(true);
      lastAction.current = "show";
    }

    lastOffsetY.current = y;
  }, [setIsVisible]);

  const handleAddTransaccion = () => {
    if (!nuevaTransaccion.nombre || !nuevaTransaccion.categoria || !nuevaTransaccion.monto) {
      Alert.alert(t('common.error'), t('common.fillAllFields'));
      return;
    }
    const monto = parseFloat(nuevaTransaccion.monto);
    if (isNaN(monto) || monto <= 0) {
      Alert.alert(t('common.error'), t('common.amountInvalid'));
      return;
    }

    const newTransaccion: Transaccion = {
      id: Date.now(),
      nombre: nuevaTransaccion.nombre,
      categoria: nuevaTransaccion.categoria,
      monto: nuevaTransaccion.tipo === 'gasto' ? -monto : monto,
      fecha: new Date().toISOString().split('T')[0],
      tipo: nuevaTransaccion.tipo,
      descripcion: nuevaTransaccion.descripcion,
    };

    setTransacciones(prev => [newTransaccion, ...prev]);
    setNuevaTransaccion({ nombre: '', categoria: '', monto: '', tipo: 'gasto', descripcion: '' });
    setShowAddModal(false);
    Alert.alert(t('common.success'), t('tx.created'));
  };

  const transaccionesFiltradas = transacciones.filter(t => {
    const matchTipo =
      filtroTipo === 'all' ||
      (filtroTipo === 'income' && t.tipo === 'ingreso') ||
      (filtroTipo === 'expense' && t.tipo === 'gasto');
    const matchBusqueda =
      t.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      t.categoria.toLowerCase().includes(terminoBusqueda.toLowerCase());
    return matchTipo && matchBusqueda;
  });

  const totalIngresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
  const totalGastos = Math.abs(transacciones.filter(t => t.tipo === 'gasto').reduce((sum, t) => sum + t.monto, 0));
  const balance = totalIngresos - totalGastos;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            {t("tx.loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View>
          <Text style={[
            styles.headerTitle,
            isDarkMode && styles.darkText,
            { fontSize: isTablet ? 24 : 20 }
          ]}>
            {t("tx.title")}
          </Text>
          <Text style={[styles.headerDate, isDarkMode && styles.darkTextSecondary]}>
            {formatDate(new Date())}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Ionicons name={isDarkMode ? "sunny" : "moon"} size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.headerButton, styles.addButton]}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros y búsqueda */}
      <View style={[styles.filtersContainer, { paddingHorizontal: wp(4) }]}>
        <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
          <Ionicons name="search" size={20} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
            placeholder={t("tx.searchPlaceholder")}
            placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
            value={terminoBusqueda}
            onChangeText={setTerminoBusqueda}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterTabs}>
            {['all', 'income', 'expense'].map((tipo) => (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.filterTab,
                  filtroTipo === tipo && styles.filterTabActive,
                  isDarkMode && styles.darkFilterTab,
                  filtroTipo === tipo && isDarkMode && styles.darkFilterTabActive,
                ]}
                onPress={() => setFiltroTipo(tipo as 'all' | 'income' | 'expense')}
              >
                <Text style={[
                  styles.filterTabText,
                  filtroTipo === tipo && styles.filterTabTextActive,
                  isDarkMode && styles.darkText,
                  filtroTipo === tipo && styles.filterTabTextActive,
                ]}>
                  {tipo === 'all' ? t("tx.filters.all")
                    : tipo === 'income' ? t("tx.filters.income")
                    : t("tx.filters.expense")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Resumen */}
      <View style={[
        styles.resumenContainer,
        isDarkMode && styles.darkCard,
        { marginHorizontal: wp(4) }
      ]}>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
            {t("tx.summary.income")}
          </Text>
          <Text style={[styles.resumenValue, { color: colors.success }]}>+{formatCurrency(totalIngresos)}</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
            {t("tx.summary.expense")}
          </Text>
          <Text style={[styles.resumenValue, { color: colors.error }]}>-{formatCurrency(totalGastos)}</Text>
        </View>
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
            {t("tx.summary.balance")}
          </Text>
          <Text style={[
            styles.resumenValue,
            { color: balance >= 0 ? colors.success : colors.error }
          ]}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll} 
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Lista de Transacciones */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(4) }
        ]}>
          {transaccionesFiltradas.length > 0 ? (
            transaccionesFiltradas.map((transaccion) => (
              <View key={transaccion.id} style={styles.transaccionItem}>
                <View style={[
                  styles.transaccionIcon,
                  { backgroundColor: transaccion.tipo === 'ingreso' ? colors.successLight : colors.errorLight }
                ]}>
                  <Ionicons
                    name={transaccion.tipo === 'ingreso' ? "trending-up" : "trending-down"}
                    size={20}
                    color={transaccion.tipo === 'ingreso' ? colors.success : colors.error}
                  />
                </View>

                <View style={styles.transaccionContent}>
                  <Text style={[styles.transaccionNombre, isDarkMode && styles.darkText]}>
                    {transaccion.nombre}
                  </Text>
                  <Text style={[styles.transaccionCategoria, isDarkMode && styles.darkTextSecondary]}>
                    {transaccion.categoria} • {formatDate(new Date(transaccion.fecha))}
                  </Text>
                  {transaccion.descripcion && (
                    <Text style={[styles.transaccionDescripcion, isDarkMode && styles.darkTextSecondary]}>
                      {transaccion.descripcion}
                    </Text>
                  )}
                </View>

                <Text style={[
                  styles.transaccionMonto,
                  { color: transaccion.tipo === 'ingreso' ? colors.success : colors.error }
                ]}>
                  {transaccion.tipo === 'ingreso' ? '+' : ''}{formatCurrency(transaccion.monto)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="swap-horizontal-outline"
                size={48}
                color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
              />
              <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                {t('tx.empty')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Agregar Transacción */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.modalHeader, isDarkMode && styles.darkHeader]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>{t("tx.cancelTransaction")}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              {t("tx.newTransaction")}
            </Text>
            <TouchableOpacity onPress={handleAddTransaccion}>
              <Text style={styles.saveButton}>{t("tx.saveTransaction")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Tipo de transacción */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t('transaction.type')}
              </Text>
              <View style={styles.tipoSelector}>
                {['ingreso', 'gasto'].map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.tipoOption,
                      nuevaTransaccion.tipo === tipo && styles.tipoOptionActive,
                      isDarkMode && styles.darkTipoOption,
                      nuevaTransaccion.tipo === tipo && isDarkMode && styles.darkTipoOptionActive,
                    ]}
                    onPress={() => setNuevaTransaccion(prev => ({
                      ...prev,
                      tipo: tipo as 'ingreso' | 'gasto',
                      categoria: '' // reset categoría cuando cambia el tipo
                    }))}
                  >
                    <Text style={[
                      styles.tipoOptionText,
                      nuevaTransaccion.tipo === tipo && styles.tipoOptionTextActive,
                      isDarkMode && styles.darkText,
                      nuevaTransaccion.tipo === tipo && styles.tipoOptionTextActive,
                    ]}>
                      {t(`transaction.types.${tipo}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t('transaction.name')} *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={t('transaction.namePlaceholder')}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevaTransaccion.nombre}
                onChangeText={(text) => setNuevaTransaccion(prev => ({ ...prev, nombre: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t('transaction.category')} *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriasPicker}>
                  {(nuevaTransaccion.tipo === 'ingreso' ? categoriasIngreso : categoriasGasto).map((categoria) => (
                    <TouchableOpacity
                      key={categoria}
                      style={[
                        styles.categoriaOption,
                        nuevaTransaccion.categoria === categoria && styles.categoriaSelected,
                        isDarkMode && styles.darkCategoriaOption,
                        nuevaTransaccion.categoria === categoria && isDarkMode && styles.darkCategoriaSelected,
                      ]}
                      onPress={() => setNuevaTransaccion(prev => ({ ...prev, categoria }))}
                    >
                      <Text style={[
                        styles.categoriaOptionText,
                        nuevaTransaccion.categoria === categoria && styles.categoriaSelectedText,
                        isDarkMode && styles.darkText,
                        nuevaTransaccion.categoria === categoria && styles.categoriaSelectedText,
                      ]}>
                        {t(`txcategories.${categoria}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t('transaction.amount')} *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={t('transaction.amountPlaceholder')}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevaTransaccion.monto}
                onChangeText={(text) => setNuevaTransaccion(prev => ({ ...prev, monto: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t('transaction.description')}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
                placeholder={t('transaction.descriptionPlaceholder')}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevaTransaccion.descripcion}
                onChangeText={(text) => setNuevaTransaccion(prev => ({ ...prev, descripcion: text }))}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  headerDate: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  filtersContainer: {
    paddingVertical: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.light.text,
  },
  darkSearchInput: {
    backgroundColor: colors.dark.surface,
    color: colors.dark.text,
  },
  filterTabs: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light.surfaceSecondary,
    marginRight: 8,
  },
  darkFilterTab: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  darkFilterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: colors.light.text,
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resumenContainer: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...globalStyles.shadow,
  },
  resumenItem: {
    alignItems: 'center',
  },
  resumenLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  resumenValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    ...globalStyles.shadow,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  transaccionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  transaccionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transaccionContent: {
    flex: 1,
  },
  transaccionNombre: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  transaccionCategoria: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  transaccionDescripcion: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
    fontStyle: 'italic',
  },
  transaccionMonto: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.light.surface,
    color: colors.light.text,
  },
  darkInput: {
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
    color: colors.dark.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  tipoSelector: {
    flexDirection: 'row',
  },
  tipoOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  darkTipoOption: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  tipoOptionActive: {
    backgroundColor: colors.primary,
  },
  darkTipoOptionActive: {
    backgroundColor: colors.primary,
  },
  tipoOptionText: {
    fontSize: 14,
    color: colors.light.text,
  },
  tipoOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  categoriasPicker: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  categoriaOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light.surfaceSecondary,
    marginRight: 8,
  },
  darkCategoriaOption: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  categoriaSelected: {
    backgroundColor: colors.primary,
  },
  darkCategoriaSelected: {
    backgroundColor: colors.primary,
  },
  categoriaOptionText: {
    fontSize: 14,
    color: colors.light.text,
  },
  categoriaSelectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
  darkSearchContainer: {
    backgroundColor: colors.dark.surface,
  },
});

export default Transacciones;