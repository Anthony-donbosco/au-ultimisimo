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
import { empleadoService, type DashboardEmpleado, type EmpresaInfo } from '../../services/empleadoService';
import { tareasService, type TareaAsignada } from '../../services/tareasService';
import { formatCurrency, formatDateLong, getErrorMessage } from '../../utils/networkUtils';
import { useTokenErrorHandler } from '../../utils/tokenErrorHandler';
import { CardSkeleton, ListSkeleton } from '../../components/common/SkeletonLoader';
import { FadeInView, SlideInView } from '../../components/common/AnimatedComponents';

interface EmpleadoDashboardProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const EmpleadoDashboard: React.FC<EmpleadoDashboardProps> = ({ onAuthChange, onRoleChange }) => {
  const navigation = useNavigation<any>();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const { user, logout } = useAuth();
  const { handleTokenError, isTokenError } = useTokenErrorHandler();

  // Función de logout que maneja la navegación
  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout desde EmpleadoDashboard...');
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
  const { setIsVisible } = useTabBarVisibility();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardEmpleado | null>(null);
  const [empresaInfo, setEmpresaInfo] = useState<EmpresaInfo | null>(null);
  const [tareasRecientes, setTareasRecientes] = useState<TareaAsignada[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(false);
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

  const navegarARegistrarVenta = () => {
    navigation.navigate('RegistrarVenta');
  };

  const navegarAMisVentas = () => {
    navigation.navigate('MisVentas');
  };

  const navegarACrearGasto = () => {
    navigation.navigate('CrearGastoEmpleado');
  };

  const navegarAMisGastos = () => {
    navigation.navigate('MisGastos');
  };

  const navegarAMisTareas = () => {
    navigation.navigate('MisTareas');
  };

  const navegarADetalleTarea = (tareaId: number) => {
    navigation.navigate('DetalleTarea', { tareaId });
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
    loadEmpresaInfo();
    loadTareasRecientes();
  }, []);

  // Carga de datos
  const loadDashboardData = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      console.log('👤 Cargando dashboard de empleado...');

      // Intentar datos cached primero
      const cachedData = await empleadoService.getCachedData('dashboard');
      if (cachedData && !showLoader) {
        setDashboardData(cachedData);
      }

      // Obtener datos frescos
      const data = await empleadoService.getDashboardData();
      setDashboardData(data);

      // Cachear si hay datos válidos
      if (data.totalGastado > 0 || data.gastosPendientes > 0) {
        await empleadoService.setCachedData('dashboard', data);
      }

      console.log('✅ Dashboard de empleado cargado exitosamente');
    } catch (error: any) {
      console.error('❌ Error cargando dashboard de empleado:', error);
      const errorMessage = getErrorMessage(error);

      if (isTokenError(error)) {
        await handleTokenError(error, setError, handleLogout);
        return;
      }

      setError(errorMessage);

      // Fallback a datos cached
      const cachedData = await empleadoService.getCachedData('dashboard');
      if (cachedData) {
        console.log('📱 Usando datos cached como fallback');
        setDashboardData(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEmpresaInfo = async () => {
    try {
      const info = await empleadoService.getEmpresaInfo();
      setEmpresaInfo(info);
      if (info) {
        console.log('✅ Información de empresa cargada:', info.nombre);
      } else {
        console.log('ℹ️ Este empleado no tiene empresa asociada');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo cargar info de empresa (esto es opcional):', error);
      // No es un error crítico, solo no mostramos la sección de empresa
    }
  };

  const loadTareasRecientes = async () => {
    try {
      setLoadingTareas(true);
      console.log('📋 Cargando tareas recientes del empleado...');

      const tareas = await tareasService.getTareasRecientesDashboard(5);
      setTareasRecientes(tareas);

      console.log('✅ Tareas recientes cargadas:', tareas.length);
    } catch (error: any) {
      console.warn('⚠️ No se pudieron cargar las tareas recientes:', error);
      // No es un error crítico, las tareas son opcionales
      setTareasRecientes([]);
    } finally {
      setLoadingTareas(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadDashboardData(false),
        loadEmpresaInfo(),
        loadTareasRecientes()
      ]);
    } catch (error) {
      console.log('Error refreshing empleado dashboard:', error);
    }
    setRefreshing(false);
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
          {/* Empresa Info Skeleton */}
          <CardSkeleton 
            showHeader={true} 
            lines={2} 
            style={{ marginHorizontal: wp(4), marginTop: hp(2) }}
          />
          
          {/* Métricas Skeleton */}
          <CardSkeleton 
            showHeader={true} 
            lines={3} 
            style={{ marginHorizontal: wp(4), marginTop: hp(2) }}
          />
          
          {/* Gastos Recientes Skeleton */}
          <View style={{ marginHorizontal: wp(4), marginTop: hp(2) }}>
            <CardSkeleton showHeader={true} lines={1} />
            <ListSkeleton items={3} itemHeight={70} style={{ marginTop: 10 }} />
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
              Mi Dashboard
            </Text>
            <Text style={[styles.userName, isDarkMode && styles.darkText, { fontSize: isTablet ? 24 : 20 }]}>
              Empleado
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
    : user?.username || 'Empleado';

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View>
          <Text style={[styles.welcomeText, isDarkMode && styles.darkTextSecondary]}>
            Mi Dashboard
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
        {/* Información de la Empresa */}
        {empresaInfo && (
          <SlideInView direction="up" delay={100} duration={600}>
            <View style={[styles.empresaCard, isDarkMode && styles.darkCard]}>
              <View style={styles.empresaHeader}>
                <View style={[styles.empresaIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="business" size={24} color={colors.primary} />
                </View>
                <View style={styles.empresaInfo}>
                  <Text style={[styles.empresaLabel, isDarkMode && styles.darkTextSecondary]}>
                    Trabajas para
                  </Text>
                  <Text style={[styles.empresaNombre, isDarkMode && styles.darkText]}>
                    {empresaInfo.nombre}
                  </Text>
                </View>
              </View>
            </View>
          </SlideInView>
        )}

        {/* Resumen de Gastos */}
        <SlideInView direction="up" delay={200} duration={600}>
          <View style={[styles.resumenCard, isDarkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              📊 Resumen de Gastos
            </Text>
            
            <View style={styles.metricsGrid}>
              <View style={[styles.metricItem, styles.pendingMetric]}>
                <View style={styles.metricIcon}>
                  <Ionicons name="time-outline" size={20} color={colors.warning} />
                </View>
                <Text style={styles.metricNumber}>
                  {dashboardData?.gastosPendientes || 0}
                </Text>
                <Text style={[styles.metricLabel, isDarkMode && styles.darkTextSecondary]}>
                  Pendientes
                </Text>
              </View>
              
              <View style={[styles.metricItem, styles.approvedMetric]}>
                <View style={styles.metricIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </View>
                <Text style={styles.metricNumber}>
                  {dashboardData?.gastosAprobados || 0}
                </Text>
                <Text style={[styles.metricLabel, isDarkMode && styles.darkTextSecondary]}>
                  Aprobados
                </Text>
              </View>
              
              <View style={[styles.metricItem, styles.rejectedMetric]}>
                <View style={styles.metricIcon}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </View>
                <Text style={styles.metricNumber}>
                  {dashboardData?.gastosRechazados || 0}
                </Text>
                <Text style={[styles.metricLabel, isDarkMode && styles.darkTextSecondary]}>
                  Rechazados
                </Text>
              </View>
            </View>

            {/* Totales */}
            <View style={styles.totalesContainer}>
              <View style={styles.totalItem}>
                <Text style={[styles.totalLabel, isDarkMode && styles.darkTextSecondary]}>
                  Total Gastado (Aprobado)
                </Text>
                <Text style={[styles.totalAmount, { color: colors.success }]}>
                  {formatCurrency(dashboardData?.totalGastado || 0)}
                </Text>
              </View>
              
              {(dashboardData?.totalPendienteAprobacion || 0) > 0 && (
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, isDarkMode && styles.darkTextSecondary]}>
                    Pendiente de Aprobación
                  </Text>
                  <Text style={[styles.totalAmount, { color: colors.warning }]}>
                    {formatCurrency(dashboardData?.totalPendienteAprobacion || 0)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SlideInView>

        {/* Acciones Rápidas */}
        <SlideInView direction="up" delay={300} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              ⚡ Acciones Rápidas
            </Text>
            
            <View style={styles.quickActionsGrid}>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={navegarACrearGasto}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="add-circle" size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.quickActionText, isDarkMode && styles.darkText]} numberOfLines={2}>
                    Registrar Gasto
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={navegarAMisGastos}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: colors.info + '20' }]}>
                    <Ionicons name="list" size={28} color={colors.info} />
                  </View>
                  <Text style={[styles.quickActionText, isDarkMode && styles.darkText]} numberOfLines={2}>
                    Ver Mis Gastos
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={navegarARegistrarVenta}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="cart" size={28} color={colors.success} />
                  </View>
                  <Text style={[styles.quickActionText, isDarkMode && styles.darkText]} numberOfLines={2}>
                    Registrar Venta
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={navegarAMisVentas}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="stats-chart" size={28} color={colors.warning} />
                  </View>
                  <Text style={[styles.quickActionText, isDarkMode && styles.darkText]} numberOfLines={2}>
                    Mis Ventas
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SlideInView>

        {/* Gastos Recientes */}
        <SlideInView direction="up" delay={400} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                📋 Gastos Recientes
              </Text>
              <TouchableOpacity onPress={navegarAMisGastos}>
                <Text style={styles.seeAllText}>Ver Todos</Text>
              </TouchableOpacity>
            </View>
            
            {dashboardData?.gastosRecientes && dashboardData.gastosRecientes.length > 0 ? (
              dashboardData.gastosRecientes.map((gasto, index) => (
                <View key={`gasto-reciente-${index}`} style={styles.gastoRecenteItem}>
                  <View style={styles.gastoRecenteMain}>
                    <View style={[
                      styles.gastoRecenteIcon, 
                      { backgroundColor: gasto.estado.color + '20' }
                    ]}>
                      <Ionicons 
                        name={empleadoService.getEstadoIcon(
                          gasto.estado.nombre === 'Pendiente' ? 'pendiente' : 
                          gasto.estado.nombre === 'Aprobado' ? 'aprobado' : 'rechazado'
                        ) as any} 
                        size={20} 
                        color={gasto.estado.color} 
                      />
                    </View>
                    
                    <View style={styles.gastoRecenteContent}>
                      <Text style={[styles.gastoRecenteConcepto, isDarkMode && styles.darkText]}>
                        {gasto.concepto}
                      </Text>
                      <Text style={[styles.gastoRecenteFecha, isDarkMode && styles.darkTextSecondary]}>
                        {new Date(gasto.fecha).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <View style={styles.gastoRecenteRight}>
                      <Text style={[styles.gastoRecenteMonto, isDarkMode && styles.darkText]}>
                        {formatCurrency(gasto.monto)}
                      </Text>
                      <View style={[
                        styles.estadoBadge,
                        { backgroundColor: gasto.estado.color + '20', borderColor: gasto.estado.color }
                      ]}>
                        <Text style={[styles.estadoText, { color: gasto.estado.color }]}>
                          {gasto.estado.nombre}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                  No hay gastos recientes
                </Text>
                <TouchableOpacity
                  style={[styles.createFirstButton, { backgroundColor: colors.primary }]}
                  onPress={navegarACrearGasto}
                >
                  <Text style={styles.createFirstButtonText}>Registrar Primer Gasto</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SlideInView>

        {/* Tareas Asignadas */}
        <SlideInView direction="up" delay={450} duration={600}>
          <View style={[styles.card, isDarkMode && styles.darkCard]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                ✅ Tareas Asignadas
              </Text>
              <TouchableOpacity onPress={navegarAMisTareas}>
                <Text style={styles.seeAllText}>Ver Todas</Text>
              </TouchableOpacity>
            </View>

            {loadingTareas ? (
              <View style={styles.tareasLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, isDarkMode && styles.darkTextSecondary]}>
                  Cargando tareas...
                </Text>
              </View>
            ) : tareasRecientes && tareasRecientes.length > 0 ? (
              tareasRecientes.map((tarea, index) => (
                <TouchableOpacity
                  key={`tarea-${tarea.id}`}
                  style={styles.tareaRecenteItem}
                  onPress={() => navegarADetalleTarea(tarea.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tareaRecenteMain}>
                    <View style={[
                      styles.tareaRecenteIcon,
                      { backgroundColor: tarea.estado_color ? `${tarea.estado_color}20` : `${colors.primary}20` }
                    ]}>
                      <Ionicons
                        name={tarea.estado_icono as any || 'checkmark-circle'}
                        size={20}
                        color={tarea.estado_color || colors.primary}
                      />
                    </View>

                    <View style={styles.tareaRecenteContent}>
                      <Text style={[styles.tareaRecenteTitulo, isDarkMode && styles.darkText]}>
                        {tarea.titulo}
                      </Text>
                      <Text style={[styles.tareaRecenteDetalle, isDarkMode && styles.darkTextSecondary]}>
                        {tarea.categoria || 'Sin categoría'} •
                        {tarea.fecha_limite ?
                          ` Vence: ${new Date(tarea.fecha_limite).toLocaleDateString()}` :
                          ' Sin fecha límite'
                        }
                      </Text>
                      {tarea.prioridad_nombre && (
                        <View style={[
                          styles.prioridadBadge,
                          { backgroundColor: tarea.prioridad_color ? `${tarea.prioridad_color}20` : `${colors.warning}20` }
                        ]}>
                          <Text style={[
                            styles.prioridadText,
                            { color: tarea.prioridad_color || colors.warning }
                          ]}>
                            {tarea.prioridad_nombre}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.tareaRecenteRight}>
                      <View style={[
                        styles.estadoBadge,
                        {
                          backgroundColor: tarea.estado_color ? `${tarea.estado_color}20` : `${colors.primary}20`,
                          borderColor: tarea.estado_color || colors.primary
                        }
                      ]}>
                        <Text style={[
                          styles.estadoText,
                          { color: tarea.estado_color || colors.primary }
                        ]}>
                          {tarea.estado_nombre || 'Pendiente'}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="clipboard-outline"
                  size={48}
                  color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                />
                <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                  No hay tareas asignadas
                </Text>
                <Text style={[styles.emptyStateSubtext, isDarkMode && styles.darkTextSecondary]}>
                  Las tareas asignadas por tu empresa aparecerán aquí
                </Text>
              </View>
            )}
          </View>
        </SlideInView>

        {/* Información Importante */}
        <SlideInView direction="up" delay={500} duration={600}>
          <View style={[styles.infoCard, isDarkMode && styles.darkInfoCard]}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color={colors.info} />
              <Text style={[styles.infoTitle, isDarkMode && styles.darkText]}>
                Información Importante
              </Text>
            </View>
            <Text style={[styles.infoText, isDarkMode && styles.darkText]}>
              • Todos los gastos requieren aprobación de la empresa
            </Text>
            <Text style={[styles.infoText, isDarkMode && styles.darkText]}>
              • Incluye siempre la información completa del gasto
            </Text>
            <Text style={[styles.infoText, isDarkMode && styles.darkText]}>
              • Los comprobantes son importantes para la aprobación
            </Text>
            <Text style={[styles.infoText, isDarkMode && styles.darkText]}>
              • Consulta con tu supervisor ante dudas
            </Text>
          </View>
        </SlideInView>

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
  empresaCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    ...globalStyles.shadow,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  empresaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empresaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empresaInfo: {
    flex: 1,
  },
  empresaLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  empresaNombre: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  resumenCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    ...globalStyles.shadow,
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
    marginBottom: 20,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  pendingMetric: {
    backgroundColor: colors.warning + '10',
  },
  approvedMetric: {
    backgroundColor: colors.success + '10',
  },
  rejectedMetric: {
    backgroundColor: colors.error + '10',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...globalStyles.shadow,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  totalesContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
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
    gap: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    maxWidth: 120,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.light.text,
    textAlign: 'center',
    lineHeight: 16,
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
  gastoRecenteItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  gastoRecenteMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gastoRecenteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gastoRecenteContent: {
    flex: 1,
  },
  gastoRecenteConcepto: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 2,
  },
  gastoRecenteFecha: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoRecenteRight: {
    alignItems: 'flex-end',
  },
  gastoRecenteMonto: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  createFirstButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.info + '10',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  darkInfoCard: {
    backgroundColor: colors.info + '15',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.light.text,
    marginBottom: 6,
    lineHeight: 20,
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
  // Estilos para tareas
  tareasLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  tareaRecenteItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  tareaRecenteMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tareaRecenteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tareaRecenteContent: {
    flex: 1,
  },
  tareaRecenteTitulo: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 4,
  },
  tareaRecenteDetalle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  tareaRecenteRight: {
    alignItems: 'flex-end',
  },
  prioridadBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  prioridadText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default EmpleadoDashboard;