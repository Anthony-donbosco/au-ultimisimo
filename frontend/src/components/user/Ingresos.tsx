import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { formatCurrency, formatDate } from '../../utils/networkUtils';

interface Ingreso {
  id: number;
  concepto: string;
  fuente: string;
  monto: number;
  fecha: string;
  categoria: string;
}

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
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [nuevoIngreso, setNuevoIngreso] = useState({
    concepto: '',
    fuente: '',
    monto: '',
    categoria: 'Salario',
  });

  // Datos mock
  const [resumenIngresos] = useState({
    totalMes: 3500.0,
    promedioSemestral: 3200.0,
    incrementoMensual: 12,
    fuentePrincipal: 'Salario',
    porcentajeFuentePrincipal: 80,
  });

  const categorias = ['Salario', 'Freelance', 'Inversiones', 'Ventas', 'Otros'];

  useEffect(() => {
    loadIngresos();
  }, []);

  const loadIngresos = async () => {
    try {
      setLoading(true);

      // Simular carga de datos
      setTimeout(() => {
        setIngresos([
          {
            id: 1,
            concepto: 'Salario mensual',
            fuente: 'Empresa ABC',
            monto: 2800,
            fecha: '2025-08-10',
            categoria: 'Salario',
          },
          {
            id: 2,
            concepto: 'Proyecto freelance',
            fuente: 'Cliente XYZ',
            monto: 450,
            fecha: '2025-08-08',
            categoria: 'Freelance',
          },
          {
            id: 3,
            concepto: 'Dividendos trimestrales',
            fuente: 'Inversiones',
            monto: 250,
            fecha: '2025-08-05',
            categoria: 'Inversiones',
          },
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.log('Error loading ingresos:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIngresos();
    setRefreshing(false);
  };

  const handleAddIngreso = () => {
    if (!nuevoIngreso.concepto || !nuevoIngreso.fuente || !nuevoIngreso.monto) {
      Alert.alert(t('income.error'), t('income.fillAllFields'));
      return;
    }

    const monto = parseFloat(nuevoIngreso.monto);
    if (isNaN(monto) || monto <= 0) {
      Alert.alert(t('income.error'), t('income.amountInvalid'));
      return;
    }

    const newIngreso: Ingreso = {
      id: Date.now(),
      concepto: nuevoIngreso.concepto,
      fuente: nuevoIngreso.fuente,
      monto: monto,
      fecha: new Date().toISOString().split('T')[0],
      categoria: nuevoIngreso.categoria,
    };

    setIngresos((prev) => [newIngreso, ...prev]);
    setNuevoIngreso({ concepto: '', fuente: '', monto: '', categoria: 'Salario' });
    setShowAddModal(false);
    Alert.alert(t('income.success'), t('income.created'));
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'Salario':
        return colors.info;
      case 'Freelance':
        return colors.categories.entretenimiento;
      case 'Inversiones':
        return colors.categories.compras;
      case 'Ventas':
        return colors.warning;
      default:
        return colors.categories.otros;
    }
  };

  if (loading) {
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
                {formatCurrency(resumenIngresos.totalMes)}
              </Text>
              <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
                Ingresos del mes
              </Text>
              <Text style={[styles.resumenPercent, { color: colors.success }]}>
                +{resumenIngresos.incrementoMensual}% vs anterior
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>Promedio semestral</Text>
              <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
                {formatCurrency(resumenIngresos.promedioSemestral)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>Fuente principal</Text>
              <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
                {resumenIngresos.fuentePrincipal} ({resumenIngresos.porcentajeFuentePrincipal}%)
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
                    {ingreso.categoria}
                  </Text>
                </View>

                <View style={styles.ingresoContent}>
                  <Text style={[styles.ingresoConcepto, isDarkMode && styles.darkText]}>{ingreso.concepto}</Text>
                  <Text style={[styles.ingresoFuente, isDarkMode && styles.darkTextSecondary]}>
                    {ingreso.fuente} • {formatDate(new Date(ingreso.fecha))}
                  </Text>
                </View>

                <Text style={[styles.ingresoMonto, { color: colors.success }]}>+{formatCurrency(ingreso.monto)}</Text>
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
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>{t("income.cancel")}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              {t("income.newIncome")}
            </Text>
            <TouchableOpacity onPress={handleAddIngreso}>
              <Text style={styles.saveButton}>{t("income.save")}</Text>
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
                      key={categoria}
                      style={[
                        styles.categoriaOption,
                        nuevoIngreso.categoria === categoria && styles.categoriaSelected,
                        isDarkMode && styles.darkCategoriaOption,
                        nuevoIngreso.categoria === categoria && isDarkMode && styles.darkCategoriaSelected,
                      ]}
                      onPress={() => setNuevoIngreso(prev => ({ ...prev, categoria }))}
                    >
                      <Text style={[
                        styles.categoriaOptionText,
                        nuevoIngreso.categoria === categoria && styles.categoriaSelectedText,
                        isDarkMode && styles.darkText,
                        nuevoIngreso.categoria === categoria && styles.categoriaSelectedText,
                      ]}>
                        {t(`income.categories.${categoria}`)}
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
});

export default Ingresos;