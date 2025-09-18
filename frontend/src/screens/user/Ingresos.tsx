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
import { financialService, type Income, type IncomeResumen, type Category } from '../../services/financialService';
import { confirmDeleteIncome } from '../../utils/deleteConfirmation';

// Income interface is now imported from financialService

interface IngresosProps {
  onAuthChange: (isAuth: boolean) => void;
}

const Ingresos: React.FC<IngresosProps> = ({ onAuthChange }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [ingresos, setIngresos] = useState<Income[]>([]);
  const [resumenIngresos, setResumenIngresos] = useState<IncomeResumen | null>(null);
  const [categorias, setCategorias] = useState<Category[]>([
    { id: 1, nombre: 'Salario', tipo: 'ingreso' },
    { id: 2, nombre: 'Freelance', tipo: 'ingreso' },
    { id: 3, nombre: 'Inversiones', tipo: 'ingreso' },
    { id: 4, nombre: 'Ventas', tipo: 'ingreso' },
    { id: 5, nombre: 'Otros', tipo: 'ingreso' }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [nuevoIngreso, setNuevoIngreso] = useState({
    concepto: '',
    fuente: '',
    monto: '',
    categoria_id: 1, // Use ID instead of name
    categoria_nombre: 'Salario', // Keep name for display
  });

  // Data will be loaded from API

  useEffect(() => {
    loadIngresos();
  }, []);

  const { setIsVisible } = useTabBarVisibility();

  const lastOffsetY = useRef(0);
  const lastAction = useRef<"show" | "hide">("show");
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

  const loadIngresos = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);
      
      console.log('💰 Cargando ingresos y resumen...');
      
      // Load data in parallel for better performance
      const [ingresosResult, resumenResult, categoriasResult] = await Promise.allSettled([
        financialService.getIncomes('current_month'),
        financialService.getIncomeSummary('current_month'),
        financialService.getIncomeCategories()
      ]);
      
      // Handle incomes data
      if (ingresosResult.status === 'fulfilled') {
        setIngresos(ingresosResult.value.items);
        console.log('✅ Ingresos cargados exitosamente:', ingresosResult.value.items.length);
      } else {
        console.error('❌ Error cargando ingresos:', ingresosResult.reason);
      }
      
      // Handle summary data
      if (resumenResult.status === 'fulfilled') {
        setResumenIngresos(resumenResult.value);
        console.log('✅ Resumen cargado exitosamente');
      } else {
        console.error('❌ Error cargando resumen:', resumenResult.reason);
      }
      
      // Handle categories data
      if (categoriasResult.status === 'fulfilled') {
        const cats = categoriasResult.value;
        if (cats.length > 0) {
          setCategorias(cats);
          // Update default category if needed
          if (!cats.find(cat => cat.id === nuevoIngreso.categoria_id)) {
            setNuevoIngreso(prev => ({
              ...prev,
              categoria_id: cats[0].id,
              categoria_nombre: cats[0].nombre
            }));
          }
        }
        console.log('✅ Categorías cargadas exitosamente:', cats.length);
      } else {
        console.log('⚠️ Usando categorías por defecto');
        // Keep default categories as they are already set
      }
      
    } catch (error: any) {
      console.error('❌ Error cargando datos de ingresos:', error);
      setError(error.message || 'Error cargando datos');
      
      // Keep default categories on error (already set in state)
      
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadIngresos(false);
    } catch (error) {
      console.log('Error refreshing ingresos:', error);
    }
    setRefreshing(false);
  };

  const validateIngresoInput = () => {
    const errors: string[] = [];
    
    // Validar concepto
    if (!nuevoIngreso.concepto.trim()) {
      errors.push('• El concepto es obligatorio');
    } else if (nuevoIngreso.concepto.trim().length < 3) {
      errors.push('• El concepto debe tener al menos 3 caracteres');
    } else if (nuevoIngreso.concepto.trim().length > 50) {
      errors.push('• El concepto no puede exceder 50 caracteres');
    }
    
    // Validar fuente
    if (!nuevoIngreso.fuente.trim()) {
      errors.push('• La fuente es obligatoria');
    } else if (nuevoIngreso.fuente.trim().length < 2) {
      errors.push('• La fuente debe tener al menos 2 caracteres');
    } else if (nuevoIngreso.fuente.trim().length > 30) {
      errors.push('• La fuente no puede exceder 30 caracteres');
    }
    
    // Validar monto
    if (!nuevoIngreso.monto.trim()) {
      errors.push('• El monto es obligatorio');
    } else {
      const monto = parseFloat(nuevoIngreso.monto.replace(/,/g, ''));
      if (isNaN(monto)) {
        errors.push('• El monto debe ser un número válido');
      } else if (monto <= 0) {
        errors.push('• El monto debe ser mayor a 0');
      } else if (monto > 1000000) {
        errors.push('• El monto no puede exceder $1,000,000');
      } else if (!/^\d+\.?\d{0,2}$/.test(nuevoIngreso.monto.replace(/,/g, ''))) {
        errors.push('• El monto solo puede tener hasta 2 decimales');
      }
    }
    
    // Validar categoría
    if (!categorias.find(cat => cat.id === nuevoIngreso.categoria_id)) {
      errors.push('• Selecciona una categoría válida');
    }
    
    return errors;
  };

  const handleAddIngreso = async () => {
    const validationErrors = validateIngresoInput();
    
    if (validationErrors.length > 0) {
      Alert.alert(
        t('common.validationErrors'), 
        validationErrors.join('\n'),
        [{ text: t('common.understood'), style: 'default' }]
      );
      return;
    }

    const monto = parseFloat(nuevoIngreso.monto.replace(/,/g, ''));
    
    const ingresoData = {
      concepto: nuevoIngreso.concepto.trim(),
      fuente: nuevoIngreso.fuente.trim(),
      monto: monto,
      categoria_id: nuevoIngreso.categoria_id, // Send ID instead of name
      tipo_ingreso_id: 1, // Default income type - could be made configurable later
      fecha: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    };

    try {
      console.log('💰 Creando nuevo ingreso...', ingresoData);
      
      // Show loading state
      const originalText = 'Guardando...';
      
      const newIngreso = await financialService.createIncome(ingresoData);
      
      // Update local state
      setIngresos((prev) => [newIngreso, ...prev]);
      
      // Update summary by reloading data
      try {
        const updatedResumen = await financialService.getIncomeSummary('current_month');
        setResumenIngresos(updatedResumen);
      } catch (resumenError) {
        console.log('⚠️ No se pudo actualizar el resumen:', resumenError);
      }
      
      // Reset form and close modal
      setNuevoIngreso({
        concepto: '',
        fuente: '',
        monto: '',
        categoria_id: categorias[0]?.id || 1,
        categoria_nombre: categorias[0]?.nombre || 'Salario'
      });
      setShowAddModal(false);
      
      console.log('✅ Ingreso creado exitosamente');
      Alert.alert(t('income.success'), t('income.created'));
      
    } catch (error: any) {
      console.error('❌ Error creando ingreso:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Error creando el ingreso. Inténtalo de nuevo.',
        [{ text: t('common.understood'), style: 'default' }]
      );
    }
  };

  const handleDeleteIngreso = async (ingreso: Income) => {
    confirmDeleteIncome(
      ingreso.concepto,
      async () => {
        try {
          console.log(`💰 Eliminando ingreso ${ingreso.id}...`);

          await financialService.deleteIncome(ingreso.id);

          // Actualizar lista local
          setIngresos((prev) => prev.filter((item) => item.id !== ingreso.id));

          // Actualizar resumen
          try {
            const updatedResumen = await financialService.getIncomeSummary('current_month');
            setResumenIngresos(updatedResumen);
          } catch (resumenError) {
            console.log('⚠️ No se pudo actualizar el resumen:', resumenError);
          }

          console.log('✅ Ingreso eliminado exitosamente');
          Alert.alert('Eliminado', 'El ingreso ha sido eliminado exitosamente');

        } catch (error: any) {
          console.error('❌ Error eliminando ingreso:', error);
          Alert.alert(
            'Error',
            error.message || 'Error eliminando el ingreso. Inténtalo de nuevo.',
            [{ text: 'Entendido', style: 'default' }]
          );
        }
      }
    );
  };

  const getCategoriaColor = (categoria: string | any) => {
    // Handle both string and object category formats
    const categoryName = typeof categoria === 'string' ? categoria : categoria?.nombre || 'Otros';

    switch (categoryName) {
      case 'Salario':
        return colors.info;
      case 'Freelance':
        return colors.categories?.entretenimiento || colors.warning;
      case 'Inversiones':
        return colors.categories?.compras || colors.success;
      case 'Ventas':
        return colors.warning;
      default:
        return colors.categories?.otros || colors.primary;
    }
  };

  const getCategoriaName = (categoria: string | any) => {
    // Handle both string and object category formats
    return typeof categoria === 'string' ? categoria : categoria?.nombre || 'Sin categoría';
  };

  if (loading && !resumenIngresos) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            {t('income.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Error state
  if (error && !resumenIngresos && !ingresos.length) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <View>
            <Text style={[styles.headerTitle, isDarkMode && styles.darkText, { fontSize: isTablet ? 24 : 20 }]}>
              {t('income.title')}
            </Text>
            <Text style={[styles.headerDate, isDarkMode && styles.darkTextSecondary]}>
              {formatDate(new Date())}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
        </View>
        
        {/* Error State */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(4) }}>
          <Ionicons name="wallet-outline" size={64} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
          <Text style={[{ fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }, isDarkMode && styles.darkText]}>
            Error de Conexión
          </Text>
          <Text style={[{ fontSize: 14, marginTop: 8, textAlign: 'center' }, isDarkMode && styles.darkTextSecondary]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 }}
            onPress={() => loadIngresos()}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View>
          <Text
            style={[
              styles.headerTitle,
              isDarkMode && styles.darkText,
              { fontSize: isTablet ? 24 : 20 },
            ]}
          >
            {t('income.title')}
          </Text>
          <Text style={[styles.headerDate, isDarkMode && styles.darkTextSecondary]}>
            {formatDate(new Date())}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={24}
            color={isDarkMode ? colors.dark.text : colors.light.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll} 
        scrollEventThrottle={16}
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
        {/* Resumen Card */}
        <View style={[styles.card, isDarkMode && styles.darkCard, { marginHorizontal: wp(4), marginTop: hp(2) }]}>
          <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>{t('income.monthSummary')}</Text>

          <View style={styles.resumenGrid}>
            <View style={styles.resumenItem}>
              <View style={[styles.resumenIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="trending-up" size={24} color={colors.success} />
              </View>
              <Text
                style={[
                  styles.resumenAmount,
                  isDarkMode && styles.darkText,
                  { fontSize: isTablet ? 28 : 24 },
                ]}
              >
                {formatCurrency(resumenIngresos?.totalMes || 0)}
              </Text>
              <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
                Ingresos del mes
              </Text>
              <Text style={[styles.resumenPercent, { color: colors.success }]}>
                +{resumenIngresos?.incrementoMensual || 0}% vs anterior
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>Promedio semestral</Text>
              <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
                {formatCurrency(resumenIngresos?.promedioSemestral || 0)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>Fuente principal</Text>
              <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
                {resumenIngresos?.fuentePrincipal || 'N/A'} ({resumenIngresos?.porcentajeFuentePrincipal || 0}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Historial Card */}
        <View
          style={[
            styles.card,
            isDarkMode && styles.darkCard,
            { marginHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(4) },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>{t('income.history')}</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {ingresos.length > 0 ? (
            ingresos.map((ingreso) => (
              <View key={ingreso.id} style={styles.ingresoItem}>
                <View style={[styles.categoriaTag, { backgroundColor: getCategoriaColor(ingreso.categoria) + '20' }]}>
                  <Text style={[styles.categoriaText, { color: getCategoriaColor(ingreso.categoria) }]}>
                    {getCategoriaName(ingreso.categoria)}
                  </Text>
                </View>

                <View style={styles.ingresoContent}>
                  <Text style={[styles.ingresoConcepto, isDarkMode && styles.darkText]}>{ingreso.concepto}</Text>
                  <Text style={[styles.ingresoFuente, isDarkMode && styles.darkTextSecondary]}>
                    {ingreso.fuente} • {formatDate(new Date(ingreso.fecha))}
                  </Text>
                </View>

                <View style={styles.ingresoActions}>
                  <Text style={[styles.ingresoMonto, { color: colors.success }]}>+{formatCurrency(ingreso.monto)}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteIngreso(ingreso)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={colors.light.textTertiary} />
              <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                No hay ingresos registrados
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Agregar Ingreso */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.modalHeader, isDarkMode && styles.darkHeader]}>
            <TouchableOpacity 
              style={[styles.modernCancelButton, isDarkMode && styles.darkModernCancelButton]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={[styles.modernCancelButtonText, isDarkMode && styles.darkModernCancelButtonText]}>
                {t("income.cancel")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              {t("income.newIncome")}
            </Text>
            <TouchableOpacity 
              style={styles.modernSaveButton}
              onPress={handleAddIngreso}
            >
              <Text style={styles.modernSaveButtonText}>{t("income.save")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("income.form.concept")}
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={t("income.form.conceptPh")}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoIngreso.concepto}
                onChangeText={(text) => setNuevoIngreso(prev => ({ ...prev, concepto: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("income.form.source")}
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={t("income.form.sourcePh")}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoIngreso.fuente}
                onChangeText={(text) => setNuevoIngreso(prev => ({ ...prev, fuente: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("income.form.amount")}
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={t("income.form.amountPh")}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoIngreso.monto}
                onChangeText={(text) => setNuevoIngreso(prev => ({ ...prev, monto: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("income.form.category")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriasPicker}>
                  {categorias.map((categoria) => (
                    <TouchableOpacity
                      key={categoria.id}
                      style={[
                        styles.categoriaOption,
                        nuevoIngreso.categoria_id === categoria.id && styles.categoriaSelected,
                        isDarkMode && styles.darkCategoriaOption,
                        nuevoIngreso.categoria_id === categoria.id && isDarkMode && styles.darkCategoriaSelected,
                      ]}
                      onPress={() => setNuevoIngreso(prev => ({
                        ...prev,
                        categoria_id: categoria.id,
                        categoria_nombre: categoria.nombre
                      }))}
                    >
                      <Text style={[
                        styles.categoriaOptionText,
                        nuevoIngreso.categoria_id === categoria.id && styles.categoriaSelectedText,
                        isDarkMode && styles.darkText,
                        nuevoIngreso.categoria_id === categoria.id && styles.categoriaSelectedText,
                      ]}>
                        {categoria.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
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
  headerButton: {
    padding: 8,
    borderRadius: 8,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumenGrid: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resumenItem: {
    alignItems: 'center',
  },
  resumenIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resumenAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 4,
  },
  resumenLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  resumenPercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
    textAlign: 'center',
  },
  ingresoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  categoriaTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  categoriaText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ingresoContent: {
    flex: 1,
  },
  ingresoConcepto: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  ingresoFuente: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  ingresoMonto: {
    fontSize: 16,
    fontWeight: '600',
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
  modernCancelButton: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.light.textSecondary,
    minWidth: 80,
    alignItems: 'center',
  },
  darkModernCancelButton: {
    backgroundColor: 'rgba(203, 213, 225, 0.1)',
    borderColor: colors.dark.textSecondary,
  },
  modernCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  darkModernCancelButtonText: {
    color: colors.dark.textSecondary,
  },
  modernSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
  ingresoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Ingresos;