import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { authService } from '../../services/auth';
import { formatCurrency, formatDateLong } from '../../utils/networkUtils';
import { useNavigation } from "@react-navigation/native";


interface DashboardData {
  saldoTotal: number;
  objetivos: {
    actual: number;
    meta: number;
    nombre: string;
    progreso: number;
  };
  ingresos: {
    total: number;
    porcentajeIncremento: number;
  };
  gastos: {
    total: number;
    porcentajeIncremento: number;
  };
  transaccionesRecientes: Array<{
    id: number;
    nombre: string;
    categoria: string;
    monto: number;
    fecha: string;
    tipo: 'ingreso' | 'gasto';
  }>;
  facturasPendientes: Array<{
    id: number;
    nombre: string;
    monto: number;
    fechaVencimiento: string;
  }>;
}

interface DashboardProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onAuthChange, onRoleChange }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    saldoTotal: 0,
    objetivos: { actual: 0, meta: 0, nombre: '', progreso: 0 },
    ingresos: { total: 0, porcentajeIncremento: 0 },
    gastos: { total: 0, porcentajeIncremento: 0 },
    transaccionesRecientes: [],
    facturasPendientes: [],
  });
  
  const navegarAConfiguracion = () => {
    navigation.navigate('Configuracion' as never);
  };
  const navegarAObjetivos = () => {
    navigation.navigate('Objetivos' as never);
  };

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await authService.getCurrentUser();
      setUserData(user);
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simulación de datos (reemplazar con API real)
      setTimeout(() => {
        setDashboardData({
          saldoTotal: 240399.75,
          objetivos: {
            actual: 12500,
            meta: 20000,
            nombre: 'Viaje a Europa',
            progreso: 62.5,
          },
          ingresos: {
            total: 3500.00,
            porcentajeIncremento: 12,
          },
          gastos: {
            total: 1150.75,
            porcentajeIncremento: 8,
          },
          transaccionesRecientes: [
            {
              id: 1,
              nombre: 'Salario Mensual',
              categoria: 'Ingreso Laboral',
              monto: 2800.00,
              fecha: '2025-08-10',
              tipo: 'ingreso',
            },
            {
              id: 2,
              nombre: 'Supermercado',
              categoria: 'Alimentación',
              monto: -85.50,
              fecha: '2025-08-12',
              tipo: 'gasto',
            },
            {
              id: 3,
              nombre: 'Freelance Proyecto',
              categoria: 'Ingreso Extra',
              monto: 450.00,
              fecha: '2025-08-11',
              tipo: 'ingreso',
            },
            {
              id: 4,
              nombre: 'Netflix',
              categoria: 'Entretenimiento',
              monto: -15.99,
              fecha: '2025-08-10',
              tipo: 'gasto',
            },
          ],
          facturasPendientes: [
            {
              id: 1,
              nombre: 'Electricidad',
              monto: 45.00,
              fechaVencimiento: '2025-08-20',
            },
            {
              id: 2,
              nombre: 'Internet',
              monto: 25.00,
              fechaVencimiento: '2025-08-22',
            },
          ],
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.log('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    onAuthChange(false);
    onRoleChange(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            {t("dashboard.loading")}
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
          <Text style={[styles.welcomeText, isDarkMode && styles.darkTextSecondary]}>
            {t("dashboard.welcomeBack")}
          </Text>
          <Text
            style={[
              styles.userName,
              isDarkMode && styles.darkText,
              { fontSize: isTablet ? 24 : 20 },
            ]}
          >
            {userData?.nombre || t("common.user")}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* Botón tema */}
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Ionicons
              name={isDarkMode ? "sunny" : "moon"}
              size={24}
              color={isDarkMode ? colors.dark.text : colors.light.text}
            />
          </TouchableOpacity>

          {/* Botón ajustes -> navega a Configuracion */}
          <TouchableOpacity
            onPress={navegarAConfiguracion}
            style={styles.headerButton}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={isDarkMode ? colors.dark.text : colors.light.text}
            />
          </TouchableOpacity>

          {/* Botón logout */}
          <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
            <Ionicons
              name="log-out-outline"
              size={24}
              color={isDarkMode ? colors.dark.text : colors.light.text}
            />
          </TouchableOpacity>
        </View>
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
        {/* Balance Card */}
        <View style={[
          styles.balanceCard,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2) }
        ]}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, isDarkMode && styles.darkTextSecondary]}>
              {t("dashboard.totalBalance")}
            </Text>
            <Text style={[styles.balanceDate, isDarkMode && styles.darkTextSecondary]}>
              {formatDateLong(new Date())}
            </Text>
          </View>
          <Text style={[
            styles.balanceAmount,
            { fontSize: isTablet ? 36 : 32 }
          ]}>
            {formatCurrency(dashboardData.saldoTotal)}
          </Text>
          
          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="trending-up" size={20} color={colors.success} />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statAmount, isDarkMode && styles.darkText]}>
                  {formatCurrency(dashboardData.ingresos.total)}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                  {t("dashboard.incomeWithPct", { pct: dashboardData.ingresos.porcentajeIncremento })}
                </Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="trending-down" size={20} color={colors.error} />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statAmount, isDarkMode && styles.darkText]}>
                  {formatCurrency(dashboardData.gastos.total)}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                  {t("dashboard.expenseWithPct", { pct: dashboardData.gastos.porcentajeIncremento })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Objetivos Card */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2) }
        ]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              {t("dashboard.MyObjective")}
            </Text>
            <TouchableOpacity onPress={navegarAObjetivos}>
              <Ionicons 
                name="settings-outline" 
                size={20} 
                color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.goalName, isDarkMode && styles.darkText]}>
            {dashboardData.objetivos.nombre}
          </Text>
          
          <View style={styles.goalProgress}>
            <View style={styles.goalAmounts}>
              <Text style={[styles.goalCurrent, isDarkMode && styles.darkText]}>
                {formatCurrency(dashboardData.objetivos.actual)}
              </Text>
              <Text style={[styles.goalTarget, isDarkMode && styles.darkTextSecondary]}>
                de {formatCurrency(dashboardData.objetivos.meta)}
              </Text>
            </View>
            
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${dashboardData.objetivos.progreso}%` }
              ]} />
            </View>
            
            <Text style={[styles.progressPercent, isDarkMode && styles.darkTextSecondary]}>
              {dashboardData.objetivos.progreso}% {t("dashboard.ObjectivesProgress")}
            </Text>
          </View>
        </View>

        {/* Transacciones Recientes */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2) }
        ]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              {t("dashboard.Transaction")}
            </Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>{t("dashboard.ViewTransaction")}</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData.transaccionesRecientes.map((transaccion) => (
            <View key={transaccion.id} style={styles.transactionItem}>
              <View style={[
                styles.transactionIcon,
                { backgroundColor: transaccion.tipo === 'ingreso' ? colors.successLight : colors.errorLight }
              ]}>
                <Ionicons 
                  name={transaccion.tipo === 'ingreso' ? "trending-up" : "trending-down"} 
                  size={20} 
                  color={transaccion.tipo === 'ingreso' ? colors.success : colors.error} 
                />
              </View>
              
              <View style={styles.transactionContent}>
                <Text style={[styles.transactionName, isDarkMode && styles.darkText]}>
                  {transaccion.nombre}
                </Text>
                <Text style={[styles.transactionCategory, isDarkMode && styles.darkTextSecondary]}>
                  {transaccion.categoria}
                </Text>
              </View>
              
              <View style={styles.transactionAmount}>
                <Text style={[
                  styles.transactionAmountText,
                  isDarkMode && styles.darkText,
                  { color: transaccion.tipo === 'ingreso' ? colors.success : colors.error }
                ]}>
                  {transaccion.tipo === 'ingreso' ? '+' : ''}{formatCurrency(transaccion.monto)}
                </Text>
                <Text style={[styles.transactionDate, isDarkMode && styles.darkTextSecondary]}>
                  {new Date(transaccion.fecha).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Facturas Pendientes */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(4) }
        ]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              {t("dashboard.billsPending")}
            </Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>{t("dashboard.ViewBills")}</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData.facturasPendientes.length > 0 ? (
            dashboardData.facturasPendientes.map((factura) => (
              <View key={factura.id} style={styles.billItem}>
                <View style={[styles.billIcon, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="document-text" size={20} color={colors.warning} />
                </View>
                
                <View style={styles.billContent}>
                  <Text style={[styles.billName, isDarkMode && styles.darkText]}>
                    {factura.nombre}
                  </Text>
                  <Text style={[styles.billDue, isDarkMode && styles.darkTextSecondary]}>
                    {t("dashboard.dueBills")}: {new Date(factura.fechaVencimiento).toLocaleDateString()}
                  </Text>
                </View>
                
                <Text style={[styles.billAmount, isDarkMode && styles.darkText]}>
                  {formatCurrency(factura.monto)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="checkmark-circle" 
                size={48} 
                color={colors.success} 
              />
              <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                {t("dashboard.NoBillsPending")}
              </Text>
            </View>
          )}
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
  welcomeText: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
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
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    ...globalStyles.shadow,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  balanceDate: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    ...globalStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  goalName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 16,
  },
  goalProgress: {
    marginTop: 8,
  },
  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  goalCurrent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  goalTarget: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  transactionCategory: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billContent: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  billDue: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default Dashboard;