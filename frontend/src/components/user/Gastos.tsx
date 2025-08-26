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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { formatCurrency, formatDate } from '../../utils/networkUtils';

interface CategoriaGasto {
  id: string;
  nombre: string;
  total: number;
  porcentajeComparacion: number;
  icono: string;
  color: string;
  detalles: Array<{
    concepto: string;
    monto: number;
    fecha: string;
  }>;
}

interface GastosProps {
  onAuthChange: (isAuth: boolean) => void;
}

const Gastos: React.FC<GastosProps> = ({ onAuthChange }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Este Mes');
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [totalGastos, setTotalGastos] = useState(0);
  const [comparacionMensual, setComparacionMensual] = useState<any[]>([]);

  const periodos = [t("period.thisWeek"), t("period.thisMonth"), t("period.last3Months"), t("period.thisYear")];

  useEffect(() => {
    loadGastos();
  }, [selectedPeriod]);

  const loadGastos = async () => {
    try {
      setLoading(true);
      
      // Simular carga de datos
      setTimeout(() => {
        const categoriasData: CategoriaGasto[] = [
          {
            id: 'vivienda',
            nombre: 'Vivienda',
            total: 750.00,
            porcentajeComparacion: 15,
            icono: 'home',
            color: colors.categories.vivienda,
            detalles: [
              { concepto: 'Alquiler', monto: 650.00, fecha: '2025-08-01' },
              { concepto: 'Servicios', monto: 100.00, fecha: '2025-08-05' },
            ],
          },
          {
            id: 'comida',
            nombre: 'Alimentación',
            total: 350.00,
            porcentajeComparacion: -8,
            icono: 'restaurant',
            color: colors.categories.comida,
            detalles: [
              { concepto: 'Supermercado', monto: 250.00, fecha: '2025-08-12' },
              { concepto: 'Restaurantes', monto: 100.00, fecha: '2025-08-10' },
            ],
          },
          {
            id: 'transporte',
            nombre: 'Transporte',
            total: 180.00,
            porcentajeComparacion: -12,
            icono: 'car',
            color: colors.categories.transporte,
            detalles: [
              { concepto: 'Gasolina', monto: 120.00, fecha: '2025-08-08' },
              { concepto: 'Uber', monto: 60.00, fecha: '2025-08-11' },
            ],
          },
          {
            id: 'entretenimiento',
            nombre: 'Entretenimiento',
            total: 120.00,
            porcentajeComparacion: 25,
            icono: 'game-controller',
            color: colors.categories.entretenimiento,
            detalles: [
              { concepto: 'Netflix', monto: 15.99, fecha: '2025-08-01' },
              { concepto: 'Cine', monto: 35.00, fecha: '2025-08-06' },
              { concepto: 'Concierto', monto: 69.01, fecha: '2025-08-09' },
            ],
          },
          {
            id: 'compras',
            nombre: 'Compras',
            total: 280.00,
            porcentajeComparacion: 18,
            icono: 'bag',
            color: colors.categories.compras,
            detalles: [
              { concepto: 'Ropa', monto: 150.00, fecha: '2025-08-07' },
              { concepto: 'Electrónicos', monto: 130.00, fecha: '2025-08-04' },
            ],
          },
        ];

        setCategorias(categoriasData);
        setTotalGastos(categoriasData.reduce((sum, cat) => sum + cat.total, 0));
        
        // Datos para gráfico comparativo (últimos 6 meses)
        setComparacionMensual([
          { mes: 'Mar', gastos: 1200 },
          { mes: 'Abr', gastos: 1350 },
          { mes: 'May', gastos: 1180 },
          { mes: 'Jun', gastos: 1420 },
          { mes: 'Jul', gastos: 1280 },
          { mes: 'Ago', gastos: 1680 },
        ]);
        
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.log('Error loading gastos:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGastos();
    setRefreshing(false);
  };

  const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
    return iconName as keyof typeof Ionicons.glyphMap;
  };

  const renderGraficoComparativo = () => {
    const maxGasto = Math.max(...comparacionMensual.map(item => item.gastos));
    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 80; // Margin
    const chartHeight = 120;

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, isDarkMode && styles.darkText]}>
          {t("expenses.trend6m")}
        </Text>
        <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
          {comparacionMensual.map((item, index) => {
            const barHeight = (item.gastos / maxGasto) * (chartHeight - 20);
            return (
              <View key={item.mes} style={styles.barContainer}>
                <View style={styles.barBackground}>
                  <View 
                    style={[
                      styles.bar,
                      { 
                        height: barHeight,
                        backgroundColor: colors.primary,
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.barLabel, isDarkMode && styles.darkTextSecondary]}>
                  {item.mes}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            {t("expenses.loading")}
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
            Análisis de Gastos
          </Text>
          <Text style={[styles.headerDate, isDarkMode && styles.darkTextSecondary]}>
            {formatDate(new Date())}
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.headerButton}
        >
          <Ionicons 
            name={isDarkMode ? "sunny" : "moon"} 
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
        {/* Selector de Período */}
        <View style={[
          styles.periodSelector,
          { marginHorizontal: wp(4), marginTop: hp(2) }
        ]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {periodos.map((periodo) => (
              <TouchableOpacity
                key={periodo}
                style={[
                  styles.periodButton,
                  selectedPeriod === periodo && styles.periodButtonActive,
                  isDarkMode && styles.darkPeriodButton,
                  selectedPeriod === periodo && isDarkMode && styles.darkPeriodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(periodo)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === periodo && styles.periodButtonTextActive,
                  isDarkMode && styles.darkText,
                  selectedPeriod === periodo && styles.periodButtonTextActive,
                ]}>
                  {periodo}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Resumen Total */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2) }
        ]}>
          <View style={styles.resumenHeader}>
            <View>
              <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
                Total de Gastos - {selectedPeriod}
              </Text>
              <Text style={[
                styles.resumenAmount,
                isDarkMode && styles.darkText,
                { fontSize: isTablet ? 32 : 28 }
              ]}>
                {formatCurrency(totalGastos)}
              </Text>
            </View>
            <View style={[styles.resumenIcon, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="trending-down" size={32} color={colors.error} />
            </View>
          </View>

          <View style={styles.resumenStats}>
            <View style={styles.resumenStat}>
              <Text style={[styles.resumenStatValue, { color: colors.error }]}>
                +8.2%
              </Text>
              <Text style={[styles.resumenStatLabel, isDarkMode && styles.darkTextSecondary]}>
                vs mes anterior
              </Text>
            </View>
            <View style={styles.resumenStat}>
              <Text style={[styles.resumenStatValue, isDarkMode && styles.darkText]}>
                {formatCurrency(totalGastos / 30)}
              </Text>
              <Text style={[styles.resumenStatLabel, isDarkMode && styles.darkTextSecondary]}>
                promedio diario
              </Text>
            </View>
          </View>
        </View>

        {/* Gráfico Comparativo */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2) }
        ]}>
          {renderGraficoComparativo()}
        </View>

        {/* Categorías de Gastos */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(4) }
        ]}>
          <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
            Gastos por Categoría
          </Text>

          {categorias.map((categoria) => (
            <View key={categoria.id} style={styles.categoriaItem}>
              <View style={styles.categoriaHeader}>
                <View style={styles.categoriaInfo}>
                  <View style={[
                    styles.categoriaIcon,
                    { backgroundColor: categoria.color + '20' }
                  ]}>
                    <Ionicons 
                      name={getIconName(categoria.icono)} 
                      size={24} 
                      color={categoria.color} 
                    />
                  </View>
                  <View style={styles.categoriaTexts}>
                    <Text style={[styles.categoriaNombre, isDarkMode && styles.darkText]}>
                      {categoria.nombre}
                    </Text>
                    <Text style={[styles.categoriaTotal, isDarkMode && styles.darkText]}>
                      {formatCurrency(categoria.total)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.categoriaStats}>
                  <View style={[
                    styles.porcentajeTag,
                    { 
                      backgroundColor: categoria.porcentajeComparacion >= 0 
                        ? colors.errorLight 
                        : colors.successLight 
                    }
                  ]}>
                    <Ionicons 
                      name={categoria.porcentajeComparacion >= 0 ? "trending-up" : "trending-down"} 
                      size={12} 
                      color={categoria.porcentajeComparacion >= 0 ? colors.error : colors.success} 
                    />
                    <Text style={[
                      styles.porcentajeText,
                      { 
                        color: categoria.porcentajeComparacion >= 0 
                          ? colors.error 
                          : colors.success 
                      }
                    ]}>
                      {Math.abs(categoria.porcentajeComparacion)}%
                    </Text>
                  </View>
                  <Text style={[styles.porcentajeLabel, isDarkMode && styles.darkTextSecondary]}>
                    vs anterior
                  </Text>
                </View>
              </View>

              {/* Barra de progreso relativa */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${(categoria.total / totalGastos) * 100}%`,
                        backgroundColor: categoria.color,
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressPercent, isDarkMode && styles.darkTextSecondary]}>
                  {((categoria.total / totalGastos) * 100).toFixed(1)}%
                </Text>
              </View>

              {/* Detalles */}
              <View style={styles.detallesContainer}>
                {categoria.detalles.slice(0, 2).map((detalle, index) => (
                  <View key={index} style={styles.detalleItem}>
                    <Text style={[styles.detalleConcepto, isDarkMode && styles.darkTextSecondary]}>
                      {detalle.concepto}
                    </Text>
                    <Text style={[styles.detalleMonto, isDarkMode && styles.darkText]}>
                      {formatCurrency(detalle.monto)}
                    </Text>
                  </View>
                ))}
                {categoria.detalles.length > 2 && (
                  <TouchableOpacity style={styles.verMasButton}>
                    <Text style={styles.verMasText}>
                      Ver {categoria.detalles.length - 2} más
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
  periodSelector: {
    paddingVertical: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light.surfaceSecondary,
    marginRight: 8,
  },
  darkPeriodButton: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  darkPeriodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.light.text,
  },
  periodButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  resumenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resumenLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  resumenAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  resumenIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumenStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
  },
  resumenStat: {
    alignItems: 'center',
  },
  resumenStatValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resumenStatLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  chartContainer: {
    paddingVertical: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barBackground: {
    height: 100,
    width: 20,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
    marginTop: 8,
  },
  categoriaItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  categoriaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoriaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoriaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoriaTexts: {
    flex: 1,
  },
  categoriaNombre: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 2,
  },
  categoriaTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  categoriaStats: {
    alignItems: 'flex-end',
  },
  porcentajeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  porcentajeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  porcentajeLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 12,
    color: colors.light.textSecondary,
    minWidth: 35,
    textAlign: 'right',
  },
  detallesContainer: {
    paddingLeft: 8,
  },
  detalleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detalleConcepto: {
    fontSize: 14,
    color: colors.light.textSecondary,
    flex: 1,
  },
  detalleMonto: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
  },
  verMasButton: {
    paddingVertical: 8,
  },
  verMasText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default Gastos;