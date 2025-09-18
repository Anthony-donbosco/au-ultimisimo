import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuth } from '../../context/AuthContext';
import { useTabBarVisibility } from '../../navigation/useTabBarVisibility';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { authService } from '../../services/authService';
import { empresaService, type DashboardEmpresa, type GastoPendiente } from '../../services/empresaService';
import { formatCurrency, formatDateLong, getErrorMessage } from '../../utils/networkUtils';
import { useTokenErrorHandler } from '../../utils/tokenErrorHandler';
import { CardSkeleton, ListSkeleton } from '../../components/common/SkeletonLoader';
import { FadeInView, SlideInView, AnimatedTouchable } from '../../components/common/AnimatedComponents';

interface EmpresaDashboardProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const EmpresaDashboard: React.FC<EmpresaDashboardProps> = ({ onAuthChange, onRoleChange }) => {
  const navigation = useNavigation<any>();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const { user, logout } = useAuth();
  const { setIsVisible } = useTabBarVisibility();
  const { handleTokenError, isTokenError } = useTokenErrorHandler();

  // Función de logout que maneja la navegación
  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout desde EmpresaDashboard...');
      await logout();
      onAuthChange(false);
      onRoleChange(null);
      console.log('✅ Logout y navegación completados');
    } catch (error) {
      console.error('❌ Error durante logout:', error);
      // Forzar navegación aunque falle
      onAuthChange(false);
      onRoleChange(null);
    }
  };

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardEmpresa | null>(null);
  const [gastosPendientes, setGastosPendientes] = useState<GastoPendiente[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Referencia para scroll
  const lastOffsetY = useRef(0);
  const lastAction = useRef<"show" | "hide">("show");

  // Navegación
  const navegarAConfiguracion = () => {
    setIsVisible(true);
    const rootNavigator = navigation.getParent();
    rootNavigator?.navigate('Configuracion');
  };

  const navegarAEmpleados = () => {
    navigation.navigate('GestionEmpleados');
  };

  const navegarAAprobaciones = () => {
    navigation.navigate('AprobacionGastos');
  };

  const navegarAProductos = () => {
    navigation.navigate('GestionProductos');
  };

  const navegarAProyectos = () => {
    navigation.navigate('GestionProyectos');
  };

  const navegarAVentasEmpleados = () => {
    navigation.navigate('VentasEmpleados');
  };

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;

    if (y < 16 && lastAction.current !== "show") {
      setIsVisible(true);
      lastAction.current = "show";
      lastOffsetY.current = y;
      return;
    }

    const delta = y - lastOffsetY.current;
    const THRESHOLD = 12;

    if (Math.abs(delta) < THRESHOLD) return;

    if (delta > 0 && lastAction.current !== "hide") {
      setIsVisible(false);
      lastAction.current = "hide";
    } else if (delta < 0 && lastAction.current !== "show") {
      setIsVisible(true);
      lastAction.current = "show";
    }

    lastOffsetY.current = y;
  }, [setIsVisible]);

  // Efectos
  useEffect(() => {
    loadDashboardData();
    loadGastosPendientes();
  }, []);

  // Carga de datos
  const loadDashboardData = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      console.log('🏢 Cargando dashboard de empresa...');

      // Intentar datos cached primero
      const cachedData = await empresaService.getCachedData('dashboard');
      if (cachedData && !showLoader) {
        setDashboardData(cachedData);
      }

      // Obtener datos frescos
      const data = await empresaService.getDashboardData();
      setDashboardData(data);

      // Cachear si hay datos válidos
      if (data.totalEmpleados > 0 || data.gastosPendientes > 0) {
        await empresaService.setCachedData('dashboard', data);
      }

      console.log('✅ Dashboard de empresa cargado exitosamente');
    } catch (error: any) {
      console.error('❌ Error cargando dashboard de empresa:', error);

      if (isTokenError(error)) {
        await handleTokenError(error, setError, handleLogout);
        return;
      }

      const errorMessage = getErrorMessage(error);
      setError(errorMessage);

      // Fallback a datos cached
      const cachedData = await empresaService.getCachedData('dashboard');
      if (cachedData) {
        console.log('📱 Usando datos cached como fallback');
        setDashboardData(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGastosPendientes = async () => {
    try {
      const gastos = await empresaService.getGastosPendientes();
      setGastosPendientes(gastos);
    } catch (error: any) {
      console.error('❌ Error cargando gastos pendientes:', error);

      if (isTokenError(error)) {
        await handleTokenError(error, setError, handleLogout);
        return;
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadDashboardData(false),
        loadGastosPendientes()
      ]);
    } catch (error) {
      console.log('Error refreshing empresa dashboard:', error);
    }
    setRefreshing(false);
  };


  // Manejo de aprobaciones rápidas
  const handleAprobarGasto = async (gastoId: number) => {
    try {
      const success = await empresaService.aprobarGasto(gastoId, 'Aprobado desde dashboard');
      if (success) {
        Alert.alert('Éxito', 'Gasto aprobado exitosamente');
        await loadGastosPendientes(); // Recargar lista
        await loadDashboardData(false); // Actualizar métricas
      }
    } catch (error: any) {
      if (isTokenError(error)) {
        await handleTokenError(error, setError, handleLogout);
        return;
      }
      Alert.alert('Error', getErrorMessage(error));
    }
  };

  const handleRechazarGasto = async (gastoId: number) => {
    console.log(`🔄 Iniciando rechazo de gasto ID: ${gastoId}`);

    // Mostrar confirmación primero
    Alert.alert(
      'Rechazar Gasto',
      '¿Estás seguro de que quieres rechazar este gasto?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => console.log('❌ Rechazo cancelado por el usuario')
        },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🌐 Enviando solicitud de rechazo para gasto ${gastoId}`);
              const motivo = 'Gasto rechazado desde dashboard empresarial';
              const success = await empresaService.rechazarGasto(gastoId, motivo);
              console.log(`📊 Resultado del rechazo: ${success}`);
              if (success) {
                console.log('✅ Gasto rechazado exitosamente, recargando datos');
                Alert.alert('Éxito', 'Gasto rechazado exitosamente');
                await loadGastosPendientes(); // Recargar lista
                await loadDashboardData(false); // Actualizar métricas
              } else {
                console.log('❌ El servicio retornó false para el rechazo');
                Alert.alert('Error', 'No se pudo rechazar el gasto');
              }
            } catch (error: any) {
              console.error('💥 Error en handleRechazarGasto:', error);
              if (isTokenError(error)) {
                await handleTokenError(error, setError, handleLogout);
                return;
              }
              Alert.alert('Error', getErrorMessage(error));
            }
          }
        }
      ]
    );
  };

  // Loading state
  if (loading && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* Header Skeleton */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <View>
            <CardSkeleton showHeader={false} lines={2} style={styles.headerSkeleton} />
          </View>
          <View style={styles.headerSkeleton}>
            <CardSkeleton showHeader={false} lines={1} style={styles.headerButtonSkeleton} />
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Métricas Skeleton */}
          <CardSkeleton 
            showHeader={true} 
            lines={3} 
            style={{ marginHorizontal: wp(4), marginTop: hp(2) }}
          />
          
          {/* Empleados Skeleton */}
          <CardSkeleton 
            showHeader={true} 
            lines={2} 
            style={{ marginHorizontal: wp(4), marginTop: hp(2) }}
          />
          
          {/* Gastos Pendientes Skeleton */}
          <View style={{ marginHorizontal: wp(4), marginTop: hp(2) }}>
            <CardSkeleton showHeader={true} lines={1} />
            <ListSkeleton items={3} itemHeight={80} style={{ marginTop: 10 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <View>
            <Text style={[styles.welcomeText, isDarkMode && styles.darkTextSecondary]}>
              Panel de Control
            </Text>
            <Text style={[styles.userName, isDarkMode && styles.darkText, { fontSize: isTablet ? 24 : 20 }]}>
              Empresa
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={navegarAConfiguracion} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
              <Ionicons name="log-out-outline" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Error State */}
        <View style={styles.errorContainer}>
          <Ionicons
            name={error?.includes('Sesión expirada') ? "lock-closed-outline" : "wifi-outline"}
            size={64}
            color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
          />
          <Text style={[styles.errorTitle, isDarkMode && styles.darkText]}>
            {error?.includes('Sesión expirada') ? 'Sesión Expirada' : 'Error de Conexión'}
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkTextSecondary]}>
            {error}
          </Text>
          {!error?.includes('Sesión expirada') && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadDashboardData()}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const nombreCompleto = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.username || 'Empresa';

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View>
          <Text style={[styles.welcomeText, isDarkMode && styles.darkTextSecondary]}>
            Panel de Control
          </Text>
          <Text
            style={[
              styles.userName,
              isDarkMode && styles.darkText,
              { fontSize: isTablet ? 24 : 20 },
            ]}
          >
            {nombreCompleto}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Ionicons
              name={isDarkMode ? "sunny" : "moon"}
              size={24}
              color={isDarkMode ? colors.dark.text : colors.light.text}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={navegarAConfiguracion} style={styles.headerButton}>
            <Ionicons
              name="settings-outline"
              size={24}
              color={isDarkMode ? colors.dark.text : colors.light.text}
            />
          </TouchableOpacity>

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
        {/* Métricas Principales */}
        <SlideInView direction="up" delay={100} duration={600}>
          <View style={[styles.metricsCard, isDarkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              📊 Métricas Generales
            </Text>
            
            <View style={styles.metricsGrid}>
              <TouchableOpacity 
                style={[styles.metricItem, styles.pendingMetric]}
                onPress={navegarAAprobaciones}
                activeOpacity={0.7}
              >
                <View style={styles.metricIcon}>
                  <Ionicons name="time-outline" size={24} color={colors.warning} />
                </View>
                <Text style={styles.metricNumber}>
                  {dashboardData?.gastosPendientes || 0}
                </Text>
                <Text style={[styles.metricLabel, isDarkMode && styles.darkTextSecondary]}>
                  Gastos Pendientes
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.metricItem, styles.employeeMetric]}
                onPress={navegarAEmpleados}
                activeOpacity={0.7}
              >
                <View style={styles.metricIcon}>
                  <Ionicons name="people" size={24} color={colors.primary} />
                </View>
                <Text style={styles.metricNumber}>
                  {dashboardData?.totalEmpleados || 0}
                </Text>
                <Text style={[styles.metricLabel, isDarkMode && styles.darkTextSecondary]}>
                  Empleados Activos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SlideInView>

        {/* Acciones Rápidas */}
        <SlideInView direction="up" delay={200} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              ⚡ Acciones Rápidas
            </Text>
            
            <View style={styles.quickActionsGrid}>
              {/* Primera fila */}
              <TouchableOpacity
                style={styles.quickAction}
                onPress={navegarAEmpleados}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person-add" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.quickActionText, isDarkMode && styles.darkText]}>
                  Empleados
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={navegarAAprobaciones}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.warning + '20' }]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.warning} />
                </View>
                <Text style={[styles.quickActionText, isDarkMode && styles.darkText]}>
                  Aprobar Gastos
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickActionsGrid}>
              {/* Segunda fila */}
              <TouchableOpacity
                style={styles.quickAction}
                onPress={navegarAProductos}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="cube" size={24} color={colors.success} />
                </View>
                <Text style={[styles.quickActionText, isDarkMode && styles.darkText]}>
                  Productos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={navegarAProyectos}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.categories.transporte + '20' }]}>
                  <Ionicons name="folder" size={24} color={colors.categories.transporte} />
                </View>
                <Text style={[styles.quickActionText, isDarkMode && styles.darkText]}>
                  Proyectos
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickActionsGrid}>
              {/* Tercera fila */}
              <TouchableOpacity
                style={styles.quickAction}
                onPress={navegarAVentasEmpleados}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.info + '20' }]}>
                  <Ionicons name="stats-chart" size={24} color={colors.info} />
                </View>
                <Text style={[styles.quickActionText, isDarkMode && styles.darkText]}>
                  Ventas
                </Text>
              </TouchableOpacity>

              {/* Espacio para futura acción o vacío */}
              <View style={styles.quickAction} />
            </View>
          </View>
        </SlideInView>

        {/* Gastos Pendientes de Aprobación */}
        <SlideInView direction="up" delay={300} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                ⏳ Gastos Pendientes
              </Text>
              <TouchableOpacity onPress={navegarAAprobaciones}>
                <Text style={styles.seeAllText}>Ver Todos</Text>
              </TouchableOpacity>
            </View>
            
            {gastosPendientes.length > 0 ? (
              gastosPendientes.slice(0, 3).map((gasto, index) => (
                <View key={`gasto-${gasto.id}-${index}`} style={styles.gastoItem}>
                  <View style={styles.gastoMainInfo}>
                    <View style={[styles.gastoIcon, { backgroundColor: colors.warning + '20' }]}>
                      <Ionicons name="receipt" size={20} color={colors.warning} />
                    </View>
                    
                    <View style={styles.gastoContent}>
                      <Text style={[styles.gastoConcepto, isDarkMode && styles.darkText]}>
                        {gasto.concepto}
                      </Text>
                      <Text style={[styles.gastoEmpleado, isDarkMode && styles.darkTextSecondary]}>
                        {gasto.empleado.firstName && gasto.empleado.lastName 
                          ? `${gasto.empleado.firstName} ${gasto.empleado.lastName}`
                          : gasto.empleado.username}
                      </Text>
                      <Text style={[styles.gastoCategoria, isDarkMode && styles.darkTextSecondary]}>
                        {gasto.categoria.nombre} • {new Date(gasto.fecha).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <Text style={[styles.gastoMonto, isDarkMode && styles.darkText]}>
                      {formatCurrency(gasto.monto)}
                    </Text>
                  </View>
                  
                  <View style={styles.gastoActions}>
                    <TouchableOpacity
                      style={[styles.gastoActionButton, styles.approveButton]}
                      onPress={() => handleAprobarGasto(gasto.id)}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.approveButtonText}>Aprobar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.gastoActionButton, styles.rejectButton]}
                      onPress={() => {
                        console.log(`🔴 CLICK RECHAZAR - Gasto ID: ${gasto.id}`);
                        handleRechazarGasto(gasto.id);
                      }}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.rejectButtonText}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                  No hay gastos pendientes de aprobación
                </Text>
              </View>
            )}
          </View>
        </SlideInView>

        {/* Rendimiento por Empleado */}
        {dashboardData?.gastosPorEmpleado && dashboardData.gastosPorEmpleado.length > 0 && (
          <SlideInView direction="up" delay={400} duration={600}>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                👥 Gastos por Empleado
              </Text>
              
              {dashboardData.gastosPorEmpleado.slice(0, 5).map((empleado, index) => (
                <View key={`empleado-${empleado.empleado}-${index}`} style={styles.empleadoItem}>
                  <View style={styles.empleadoInfo}>
                    <View style={[styles.empleadoIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.empleadoNombre, isDarkMode && styles.darkText]}>
                      {empleado.empleado}
                    </Text>
                  </View>
                  
                  <View style={styles.empleadoStats}>
                    <Text style={[styles.empleadoGastos, isDarkMode && styles.darkText]}>
                      {formatCurrency(empleado.gastosAprobados)}
                    </Text>
                    {empleado.gastosPendientes > 0 && (
                      <Text style={[styles.empleadoPendientes, { color: colors.warning }]}>
                        {empleado.gastosPendientes} pendiente{empleado.gastosPendientes !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </SlideInView>
        )}

        {/* Espacio adicional para el scroll */}
        <View style={{ height: hp(4) }} />
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
  metricsCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
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
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  pendingMetric: {
    backgroundColor: colors.warning + '10',
  },
  employeeMetric: {
    backgroundColor: colors.primary + '10',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...globalStyles.shadow,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    ...globalStyles.shadow,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  gastoItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  gastoMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gastoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gastoContent: {
    flex: 1,
  },
  gastoConcepto: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 2,
  },
  gastoEmpleado: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  gastoCategoria: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoMonto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  gastoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  gastoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  empleadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  empleadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  empleadoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empleadoNombre: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  empleadoStats: {
    alignItems: 'flex-end',
  },
  empleadoGastos: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
  },
  empleadoPendientes: {
    fontSize: 12,
    marginTop: 2,
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
  // Skeleton Styles
  headerSkeleton: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerButtonSkeleton: {
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default EmpresaDashboard;