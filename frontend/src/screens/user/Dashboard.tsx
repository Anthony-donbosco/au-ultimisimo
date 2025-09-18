import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { authService } from '../../services/authService';
import { financialService, type DashboardData } from '../../services/financialService';
import { formatCurrency, formatDateLong, getErrorMessage } from '../../utils/networkUtils';
import { useTokenErrorHandler } from '../../utils/tokenErrorHandler';
import { useNavigation } from "@react-navigation/native";
import { useTabBarVisibility } from '../../navigation/useTabBarVisibility';
import { UserStackParamList } from '../../navigation/UserNavigator';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardSkeleton, ListSkeleton } from '../../components/common/SkeletonLoader';
import { FadeInView, SlideInView, StaggeredList, AnimatedTouchable } from '../../components/common/AnimatedComponents';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { useNotifications } from '../../hooks/useNotifications';


// DashboardData interface is now imported from financialService

interface DashboardProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onAuthChange, onRoleChange }) => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const { setIsVisible } = useTabBarVisibility();

  // Helper function to safely get category name from either string or object
  const getCategoriaName = (categoria: string | any) => {
    return typeof categoria === 'string' ? categoria : categoria?.nombre || 'Sin categoría';
  };
  const { user, getCurrentUser, logout } = useAuth();
  const { handleTokenError, isTokenError } = useTokenErrorHandler();

  // Función de logout que maneja la navegación
  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout desde Dashboard...');
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  // Notificaciones
  const {
    initializeNotifications,
    checkUpcomingBills,
    checkGoalProgress,
    checkDailyStreak,
    setupStreakReminders
  } = useNotifications({
    onNotificationResponse: (response) => {
      // Access data directly from the correct location
      const data = response.notification.request.content.data || {};
      const { type } = data;

      // Navegar según el tipo de notificación
      if (type === 'bill_due') {
        navigation.navigate('Facturas' as never);
      } else if (type === 'goal_progress') {
        navigation.navigate('Objetivos' as never);
      } else if (type === 'streak_reminder') {
        navigation.navigate('Dashboard' as never);
      }
    },
    autoInitialize: false  // Evitar inicialización automática en cada render
  });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Dashboard Customization State
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  
  // Custom Alert State
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    widgetId: '',
    widgetName: ''
  });
  
  // Available widgets configuration
  const availableWidgets = [
    {
      id: 'balance',
      name: 'Saldo Total',
      icon: 'wallet',
      description: 'Tu saldo total actual',
      color: colors.primary,
    },
    {
      id: 'streaks',
      name: 'Sistema de Rachas',
      icon: 'flame',
      description: 'Días consecutivos registrando datos',
      color: colors.warning,
    },
    {
      id: 'goals',
      name: 'Objetivo Principal',
      icon: 'flag',
      description: 'Tu meta financiera más importante',
      color: colors.success,
    },
    {
      id: 'transactions',
      name: 'Transacciones Recientes',
      icon: 'list',
      description: 'Últimos movimientos financieros',
      color: colors.info,
    },
    {
      id: 'bills',
      name: 'Facturas Pendientes',
      icon: 'document-text',
      description: 'Cuentas por pagar próximamente',
      color: colors.error,
    },
  ];
  
  const navegarAConfiguracion = () => {
    // Show TabBar before navigation
    setIsVisible(true);
    // Navigate to stack screen with navbar maintained
    const rootNavigator = navigation.getParent();
    rootNavigator?.navigate('Configuracion');
  };
  const navegarAObjetivos = () => {
    // Show TabBar before navigation
    setIsVisible(true);
    // Navigate to tab screen
    navigation.navigate('Objetivos');
  };
  const navegarATransacciones = () => {
    // Show TabBar before navigation
    setIsVisible(true);
    // Navigate to stack screen with navbar maintained  
    const rootNavigator = navigation.getParent();
    rootNavigator?.navigate('Transacciones');
  };
  const navegarAFacturas = () => {
    // Show TabBar before navigation
    setIsVisible(true);
    // Navigate to tab screen
    navigation.navigate('Facturas');
  };
  const navegarAIngresos = () => {
    // Show TabBar before navigation
    setIsVisible(true);
    // Navigate to tab screen
    navigation.navigate('Ingresos');
  };
  const navegarAGastos = () => {
    // Show TabBar before navigation
    setIsVisible(true);
    // Navigate to tab screen
    navigation.navigate('Gastos');
  };
  const navegarAChatbot = () => {
    // Navigate to your new Chatbot screen
    navigation.navigate('Chatbot');
    console.log('🤖 Navegando al Chatbot...');
  };

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

  useEffect(() => {
    loadUserData();
    loadDashboardData();
    loadWidgetConfiguration();
    // Inicializar notificaciones una sola vez al montar el componente
    initializeNotifications();
  }, [initializeNotifications]);
  
  // Load user's widget configuration from AsyncStorage
  const loadWidgetConfiguration = async () => {
    try {
      const savedWidgets = await AsyncStorage.getItem('dashboard_widgets');
      if (savedWidgets) {
        const parsedWidgets = JSON.parse(savedWidgets);
        setActiveWidgets(parsedWidgets);
        console.log('📱 Configuración de widgets cargada:', parsedWidgets);
      } else {
        // First time user - show empty state
        setActiveWidgets([]);
        console.log('📱 Usuario nuevo - mostrando estado vacío');
      }
    } catch (error) {
      console.error('❌ Error cargando configuración de widgets:', error);
      setActiveWidgets([]);
    }
  };
  
  // Save widget configuration to AsyncStorage
  const saveWidgetConfiguration = async (widgets: string[]) => {
    try {
      await AsyncStorage.setItem('dashboard_widgets', JSON.stringify(widgets));
      console.log('💾 Configuración de widgets guardada:', widgets);
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
    }
  };
  
  // Add widget to dashboard
  const addWidget = (widgetId: string) => {
    if (!activeWidgets.includes(widgetId)) {
      const newWidgets = [...activeWidgets, widgetId];
      setActiveWidgets(newWidgets);
      saveWidgetConfiguration(newWidgets);
      console.log('✅ Widget agregado:', widgetId);
    }
  };
  
  // Remove widget from dashboard with confirmation
  const removeWidget = (widgetId: string) => {
    const widget = availableWidgets.find(w => w.id === widgetId);
    const widgetName = widget?.name || 'este widget';
    
    setAlertConfig({
      title: 'Eliminar Widget',
      message: `¿Estás seguro de que deseas eliminar "${widgetName}" del dashboard?`,
      widgetId,
      widgetName
    });
    setShowCustomAlert(true);
  };

  // Confirm widget removal
  const confirmRemoveWidget = () => {
    const newWidgets = activeWidgets.filter(id => id !== alertConfig.widgetId);
    setActiveWidgets(newWidgets);
    saveWidgetConfiguration(newWidgets);
    console.log('🗑️ Widget removido:', alertConfig.widgetId);
    setShowCustomAlert(false);
  };
  
  // Toggle widget panel
  const toggleWidgetPanel = () => {
    setShowWidgetPanel(!showWidgetPanel);
  };
  
  // Reset dashboard to empty state (for demo purposes)
  const resetDashboard = async () => {
    setActiveWidgets([]);
    await AsyncStorage.removeItem('dashboard_widgets');
    console.log('🔄 Dashboard reseteado');
  };

  const loadUserData = async () => {
    try {
      let usuario = null;
      
      // 1. Validar token primero
      const tokenValido = await authService.validateToken();
      if (!tokenValido) {
        console.log('🔒 Dashboard: Sesión expirada, cerrando automáticamente...');
        await handleLogout();
        return;
      }
      
      // 2. Priorizar usuario del contexto de autenticación (más actualizado)
      if (user) {
        usuario = user;
        console.log('📱 Dashboard: Cargando usuario desde AuthContext:', usuario);
      } else {
        // 3. Intentar obtener usuario actualizado del backend
        try {
          const usuarioActualizado = await getCurrentUser();
          if (usuarioActualizado) {
            usuario = usuarioActualizado;
            console.log('📱 Dashboard: Usuario obtenido desde backend:', usuario);
          }
        } catch (error) {
          console.log('⚠️ Dashboard: No se pudo obtener usuario del backend, usando AsyncStorage');
        }
        
        // 4. Fallback a AsyncStorage
        if (!usuario) {
          const [usuarioGuardado, userGuardado] = await Promise.all([
            AsyncStorage.getItem('usuario'),
            AsyncStorage.getItem('user')
          ]);
          
          // Priorizar 'user' (authService) sobre 'usuario' (legacy)
          if (userGuardado) {
            usuario = JSON.parse(userGuardado);
            console.log('📱 Dashboard: Cargando usuario desde AsyncStorage "user":', usuario);
          } else if (usuarioGuardado) {
            usuario = JSON.parse(usuarioGuardado);
            console.log('📱 Dashboard: Cargando usuario desde AsyncStorage "usuario" (legacy):', usuario);
          }
        }
      }
      
      if (usuario) {
        // Mapear datos del usuario igual que en otros componentes
        const nombreCompleto = usuario.first_name && usuario.last_name 
          ? `${usuario.first_name} ${usuario.last_name}`.trim()
          : usuario.nombre || usuario.username || 'Usuario';
          
        const datosUsuario = {
          ...usuario,
          nombre: nombreCompleto
        };
        
        setUserData(datosUsuario);
        console.log('✅ Dashboard: Datos de usuario cargados correctamente:', datosUsuario);
      } else {
        console.log('⚠️ Dashboard: No se encontraron datos de usuario disponibles');
        // Si no hay usuario después de validar el token, cerrar sesión
        await handleLogout();
      }
    } catch (error) {
      console.error('❌ Dashboard: Error cargando datos de usuario:', error);
      setUserData(null);
      // En caso de error crítico, cerrar sesión por seguridad
      await handleLogout();
    }
  };

  const loadDashboardData = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      console.log('🔄 Cargando datos del dashboard...');

      // Try to get cached data first for better UX
      const cachedData = await financialService.getCachedData('dashboard_data');
      if (cachedData && !showLoader) {
        setDashboardData(cachedData);
      }

      // Fetch fresh data from API
      const data = await financialService.getDashboardData('current_month');

      setDashboardData(data);

      // Cache the data for offline access only if it's valid data (not empty state)
      if (data.saldoTotal > 0 || data.transaccionesRecientes.length > 0) {
        await financialService.setCachedData('dashboard_data', data);
      }

      console.log('✅ Datos del dashboard cargados exitosamente');

      // Verificar notificaciones después de cargar los datos
      setTimeout(() => {
        checkNotifications();
      }, 1000);

    } catch (error: any) {
      console.error('❌ Error cargando datos del dashboard:', error);

      // Get standardized error message
      const errorMessage = getErrorMessage(error);

      // Handle authentication errors gracefully
      if (isTokenError(error)) {
        console.log('🔒 Error de token detectado en dashboard...');
        await handleTokenError(error, setError, handleLogout);
        return;
      }

      setError(errorMessage);

      // Try to use cached data as fallback
      const cachedData = await financialService.getCachedData('dashboard_data');
      if (cachedData) {
        console.log('📱 Usando datos cached como fallback');
        setDashboardData(cachedData);
      }

    } finally {
      setLoading(false);
    }
  };

  // Verificar y enviar notificaciones relevantes
  const checkNotifications = useCallback(async () => {
    try {
      if (!dashboardData) return;
      
      // Verificar facturas próximas a vencer
      if (dashboardData.facturasPendientes?.length > 0) {
        await checkUpcomingBills(dashboardData.facturasPendientes);
      }

      // Verificar progreso de objetivos
      if (dashboardData.objetivos?.progreso > 0) {
        await checkGoalProgress([{
          nombre: dashboardData.objetivos.nombre,
          ahorroActual: dashboardData.objetivos.actual,
          metaTotal: dashboardData.objetivos.meta
        }]);
      }

      // Configurar recordatorios de racha si no están configurados
      await setupStreakReminders();

      console.log('✅ Verificación de notificaciones completada');
    } catch (error) {
      console.error('❌ Error verificando notificaciones:', error);
    }
  }, [dashboardData, checkUpcomingBills, checkGoalProgress, setupStreakReminders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData(false);
    } catch (error) {
      console.log('Error refreshing dashboard:', error);
    }
    setRefreshing(false);
  };


  // Render empty dashboard with drag & drop area
  const renderEmptyDashboard = () => (
    <View style={styles.emptyDashboardContainer}>
      <SlideInView direction="up" delay={200} duration={800}>
        <TouchableOpacity
          style={[
            styles.addWidgetsArea,
            isDarkMode && styles.darkAddWidgetsArea,
            isDragging && styles.addWidgetsAreaDragging
          ]}
          onPress={toggleWidgetPanel}
          activeOpacity={0.7}
        >
          <View style={styles.addWidgetsContent}>
            <Ionicons
              name="add-circle-outline"
              size={48}
              color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
            />
            <Text style={[styles.addWidgetsTitle, isDarkMode && styles.darkText]}>
              Agregar Widgets
            </Text>
            <Text style={[styles.addWidgetsSubtitle, isDarkMode && styles.darkTextSecondary]}>
              Personaliza tu dashboard arrastrando widgets aquí
            </Text>
          </View>
        </TouchableOpacity>
      </SlideInView>
    </View>
  );

  // Render individual widget based on type
  const renderWidget = (widgetId: string, index: number) => {
    const delay = index * 100;
    
    switch (widgetId) {
      case 'balance':
        return (
          <SlideInView key={widgetId} direction="up" delay={delay} duration={600}>
            <View style={[styles.widget, styles.balanceCard, isDarkMode && styles.darkCard]}>
              
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, isDarkMode && styles.darkTextSecondary]}>
                  {t("dashboard.totalBalance")}
                </Text>
                <Text style={[styles.balanceDate, isDarkMode && styles.darkTextSecondary]}>
                  {formatDateLong(new Date())}
                </Text>
              </View>
              <Text style={[styles.balanceAmount, { fontSize: isTablet ? 36 : 32 }]}>
                {formatCurrency(dashboardData?.saldoTotal || 0)}
              </Text>
              
              <View style={styles.quickStats}>
                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={navegarAIngresos}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="trending-up" size={20} color={colors.success} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={[styles.statAmount, isDarkMode && styles.darkText]}>
                      {formatCurrency(dashboardData?.ingresos?.total || 0)}
                    </Text>
                    <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                      Ingresos
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={navegarAGastos}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: colors.errorLight }]}>
                    <Ionicons name="trending-down" size={20} color={colors.error} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={[styles.statAmount, isDarkMode && styles.darkText]}>
                      {formatCurrency(dashboardData?.gastos?.total || 0)}
                    </Text>
                    <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                      Gastos
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SlideInView>
        );

      case 'streaks':
        return (
          <SlideInView key={widgetId} direction="up" delay={delay} duration={600}>
            <View style={[styles.widget, styles.card, isDarkMode && styles.darkCard]}>
              
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                  🔥 {t("dashboard.streaks")}
                </Text>
                <View style={styles.streakBest}>
                  <Text style={[styles.streakBestLabel, isDarkMode && styles.darkTextSecondary]}>
                    {t("dashboard.bestStreak")}
                  </Text>
                  <Text style={[styles.streakBestNumber, isDarkMode && styles.darkText]}>
                    {dashboardData?.rachas?.mejorRacha || 0}
                  </Text>
                </View>
              </View>
              
              <View style={styles.streaksContainer}>
                <View style={styles.mainStreak}>
                  <View style={styles.streakFireContainer}>
                    <Text style={styles.streakFire}>🔥</Text>
                    <Text style={[styles.streakMainNumber, isDarkMode && styles.darkText]}>
                      {dashboardData?.rachas?.registroDiario || 0}
                    </Text>
                  </View>
                  <Text style={[styles.streakMainLabel, isDarkMode && styles.darkText]}>
                    {t("dashboard.daysInARow")}
                  </Text>
                </View>
              </View>
            </View>
          </SlideInView>
        );

      case 'goals':
        return (
          <SlideInView key={widgetId} direction="up" delay={delay} duration={600}>
            <View style={[styles.widget, styles.card, isDarkMode && styles.darkCard]}>
              
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                  {t("dashboard.MyObjective")}
                </Text>
                <TouchableOpacity onPress={navegarAObjetivos}>
                  <Ionicons name="settings-outline" size={20} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.goalName, isDarkMode && styles.darkText]}>
                {dashboardData?.objetivos?.nombre || t("dashboard.noActiveGoal")}
              </Text>
              
              <View style={styles.goalProgress}>
                <View style={styles.goalAmounts}>
                  <Text style={[styles.goalCurrent, isDarkMode && styles.darkText]}>
                    {formatCurrency(dashboardData?.objetivos?.actual || 0)}
                  </Text>
                  <Text style={[styles.goalTarget, isDarkMode && styles.darkTextSecondary]}>
                    de {formatCurrency(dashboardData?.objetivos?.meta || 0)}
                  </Text>
                </View>
                
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${dashboardData?.objetivos?.progreso || 0}%` }]} />
                </View>
              </View>
            </View>
          </SlideInView>
        );

      case 'transactions':
        return (
          <SlideInView key={widgetId} direction="up" delay={delay} duration={600}>
            <View style={[styles.widget, styles.card, isDarkMode && styles.darkCard]}>
              
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                  {t("dashboard.Transaction")}
                </Text>
                <TouchableOpacity onPress={navegarATransacciones}>
                  <Text style={styles.seeAllText}>{t("dashboard.ViewTransaction")}</Text>
                </TouchableOpacity>
              </View>
              
              {(dashboardData?.transaccionesRecientes || []).slice(0, 5).map((transaccion, index) => (
                <View key={`${transaccion.tipo}-${transaccion.id}-${index}`} style={styles.transactionItem}>
                  <View style={[styles.transactionIcon, { backgroundColor: transaccion.tipo === 'ingreso' ? colors.successLight : colors.errorLight }]}>
                    <Ionicons name={transaccion.tipo === 'ingreso' ? "trending-up" : "trending-down"} size={20} color={transaccion.tipo === 'ingreso' ? colors.success : colors.error} />
                  </View>
                  
                  <View style={styles.transactionContent}>
                    <Text style={[styles.transactionName, isDarkMode && styles.darkText]}>{transaccion.nombre}</Text>
                    <Text style={[styles.transactionCategory, isDarkMode && styles.darkTextSecondary]}>{getCategoriaName(transaccion.categoria)}</Text>
                  </View>
                  
                  <Text style={[styles.transactionAmountText, { color: transaccion.tipo === 'ingreso' ? colors.success : colors.error }]}>
                    {transaccion.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(Math.abs(transaccion.monto))}
                  </Text>
                </View>
              ))}
              
              {(!dashboardData?.transaccionesRecientes || dashboardData.transaccionesRecientes.length === 0) && (
                <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                  No hay transacciones recientes
                </Text>
              )}
            </View>
          </SlideInView>
        );

      case 'bills':
        return (
          <SlideInView key={widgetId} direction="up" delay={delay} duration={600}>
            <View style={[styles.widget, styles.card, isDarkMode && styles.darkCard]}>
              
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                  {t("dashboard.billsPending")}
                </Text>
                <TouchableOpacity onPress={navegarAFacturas}>
                  <Text style={styles.seeAllText}>{t("dashboard.ViewBills")}</Text>
                </TouchableOpacity>
              </View>
              
              {(dashboardData?.facturasPendientes || []).length > 0 ? (
                (dashboardData?.facturasPendientes || []).slice(0, 2).map((factura, index) => (
                  <View key={`factura-${factura.id}-${index}`} style={styles.billItem}>
                    <View style={[styles.billIcon, { backgroundColor: colors.warningLight }]}>
                      <Ionicons name="document-text" size={20} color={colors.warning} />
                    </View>
                    
                    <View style={styles.billContent}>
                      <Text style={[styles.billName, isDarkMode && styles.darkText]}>{factura.nombre}</Text>
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
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                    {t("dashboard.NoBillsPending")}
                  </Text>
                </View>
              )}
            </View>
          </SlideInView>
        );

      default:
        return null;
    }
  };

  // Render custom alert
  const renderCustomAlert = () => (
    <Modal
      visible={showCustomAlert}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowCustomAlert(false)}
    >
      <View style={styles.alertOverlay}>
        <SlideInView direction="up" duration={400}>
          <View style={[styles.alertContainer, isDarkMode && styles.darkAlertContainer]}>
            <View style={styles.alertIconContainer}>
              <Ionicons name="warning" size={48} color={colors.warning} />
            </View>
            
            <Text style={[styles.alertTitle, isDarkMode && styles.darkText]}>
              {alertConfig.title}
            </Text>
            
            <Text style={[styles.alertMessage, isDarkMode && styles.darkTextSecondary]}>
              {alertConfig.message}
            </Text>
            
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.alertButtonCancel]}
                onPress={() => setShowCustomAlert(false)}
              >
                <Text style={styles.alertButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.alertButton, styles.alertButtonConfirm]}
                onPress={confirmRemoveWidget}
              >
                <Text style={styles.alertButtonTextConfirm}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SlideInView>
      </View>
    </Modal>
  );

  // Render widget selection panel
  const renderWidgetPanel = () => (
    <Modal
      visible={showWidgetPanel}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowWidgetPanel(false)}
    >
      <View style={styles.widgetPanelOverlay}>
        <View style={[styles.widgetPanel, isDarkMode && styles.darkWidgetPanel]}>
          <View style={[styles.widgetPanelHeader, isDarkMode && styles.darkWidgetPanelHeader]}>
            <Text style={[styles.widgetPanelTitle, isDarkMode && styles.darkText]}>
              Agregar Widgets
            </Text>
            <TouchableOpacity
              onPress={() => setShowWidgetPanel(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.widgetList}>
            {availableWidgets.map((widget) => (
              <View
                key={widget.id}
                style={[
                  styles.widgetOption,
                  isDarkMode && styles.darkWidgetOption,
                ]}
              >
                <View style={[styles.widgetOptionIcon, { backgroundColor: widget.color + '20' }]}>
                  <Ionicons name={widget.icon as any} size={24} color={widget.color} />
                </View>
                <View style={styles.widgetOptionContent}>
                  <Text style={[styles.widgetOptionName, isDarkMode && styles.darkText]}>
                    {widget.name}
                  </Text>
                  <Text style={[styles.widgetOptionDescription, isDarkMode && styles.darkTextSecondary]}>
                    {widget.description}
                  </Text>
                </View>
                <View style={styles.widgetActions}>
                  {activeWidgets.includes(widget.id) ? (
                    <TouchableOpacity
                      style={[styles.widgetActionButton, styles.removeButton]}
                      onPress={() => removeWidget(widget.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.widgetActionButton, styles.addButton]}
                      onPress={() => addWidget(widget.id)}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          
          {/* Debug button to reset dashboard */}
          {__DEV__ && (
            <TouchableOpacity
              style={[styles.debugResetButton, { backgroundColor: colors.error }]}
              onPress={resetDashboard}
            >
              <Text style={styles.debugResetButtonText}>🔄 Reset Dashboard (Debug)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

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
          {/* Balance Card Skeleton */}
          <CardSkeleton 
            showHeader={true} 
            lines={4} 
            style={{ marginHorizontal: wp(4), marginTop: hp(2) }}
          />
          
          {/* Rachas Card Skeleton */}
          <CardSkeleton 
            showHeader={true} 
            lines={3} 
            style={{ marginHorizontal: wp(4), marginTop: hp(2) }}
          />
          
          {/* Objetivos Card Skeleton */}
          <CardSkeleton 
            showHeader={true} 
            lines={3} 
            style={{ marginHorizontal: wp(4), marginTop: hp(2) }}
          />
          
          {/* Transacciones List Skeleton */}
          <View style={{ marginHorizontal: wp(4), marginTop: hp(2) }}>
            <CardSkeleton showHeader={true} lines={1} />
            <ListSkeleton items={4} itemHeight={70} style={{ marginTop: 10 }} />
          </View>
          
          {/* Facturas Card Skeleton */}
          <CardSkeleton 
            showHeader={true} 
            lines={2} 
            style={{ marginHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(4) }}
          />
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
              {t("dashboard.welcomeBack")}
            </Text>
            <Text style={[styles.userName, isDarkMode && styles.darkText, { fontSize: isTablet ? 24 : 20 }]}>
              {userData?.nombre || t("common.user")}
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
        <View style={[styles.errorContainer, { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(4) }]}>
          <Ionicons
            name={error?.includes('Sesión expirada') ? "lock-closed-outline" : "wifi-outline"}
            size={64}
            color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
          />
          <Text style={[styles.errorTitle, isDarkMode && styles.darkText, { fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }]}>
            {error?.includes('Sesión expirada') ? 'Sesión Expirada' :
             error?.includes('Sin conexión') ? 'Sin Conexión' :
             'Error de Conexión'}
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkTextSecondary, { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }]}>
            {error?.includes('Sesión expirada') ? 'Tu sesión ha expirado. Serás redirigido al login automáticamente.' :
             error?.includes('Sin conexión') ? 'Verifica tu conexión a internet e intenta nuevamente.' :
             error}
          </Text>
          {!error?.includes('Sesión expirada') && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 }]}
              onPress={() => loadDashboardData()}
            >
              <Text style={[styles.retryButtonText, { color: '#fff', fontSize: 14, fontWeight: '600' }]}>
                Reintentar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }
  
  // No data state
  if (!dashboardData) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Cargando datos...
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
        {/* Customizable Dashboard Content */}
        {activeWidgets.length === 0 ? (
          // Empty state with drag & drop area
          renderEmptyDashboard()
        ) : (
          // Render active widgets
          <View style={styles.widgetsContainer}>
            {activeWidgets.map((widgetId, index) => (
              <View key={widgetId} style={styles.widgetContainer}>
                {renderWidget(widgetId, index)}
              </View>
            ))}
            
            {/* Add more widgets button */}
            <SlideInView direction="up" delay={activeWidgets.length * 100} duration={600}>
              <TouchableOpacity
                style={[
                  styles.addMoreWidgetsButton,
                  isDarkMode && styles.darkAddMoreWidgetsButton
                ]}
                onPress={toggleWidgetPanel}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={isDarkMode ? colors.dark.text : colors.light.text}
                />
                <Text style={[styles.addMoreWidgetsText, isDarkMode && styles.darkText]}>
                  Agregar más widgets
                </Text>
              </TouchableOpacity>
            </SlideInView>
          </View>
        )}
      </ScrollView>

      {/* Botón flotante para el Chatbot */}
      <TouchableOpacity 
        style={[styles.chatbotButton, isDarkMode && styles.darkChatbotButton]} 
        onPress={navegarAChatbot}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
      </TouchableOpacity>

      {/* Widget Selection Panel */}
      {renderWidgetPanel()}
      
      {/* Custom Alert */}
      {renderCustomAlert()}
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
  // Estilos para Sistema de Rachas
  streakBest: {
    alignItems: 'flex-end',
  },
  streakBestLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakBestNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  streaksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainStreak: {
    flex: 2,
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: colors.light.divider,
  },
  streakFireContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakFire: {
    fontSize: 32,
    marginRight: 8,
  },
  streakMainNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  streakMainLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    textAlign: 'center',
  },
  streakMainSubtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  secondaryStreaks: {
    flex: 1,
    paddingLeft: 20,
  },
  secondaryStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryStreakIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryStreakNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    marginRight: 6,
  },
  secondaryStreakLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    flex: 1,
  },
  streakMotivation: {
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
  // Estilos específicos para el mensaje motivacional en modo oscuro
  darkStreakMotivation: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  darkMotivationText: {
    color: colors.dark.text, // Texto más claro para mejor legibilidad
  },

  // 🔥 CUSTOMIZABLE DASHBOARD STYLES 🔥
  emptyDashboardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  
  addWidgetsArea: {
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: colors.primary + '05',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginHorizontal: 8,
  },
  
  darkAddWidgetsArea: {
    borderColor: colors.primary + '60',
    backgroundColor: colors.primary + '08',
  },
  
  addWidgetsAreaDragging: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
    transform: [{ scale: 1.02 }],
  },
  
  addWidgetsContent: {
    alignItems: 'center',
  },
  
  addWidgetsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  
  addWidgetsSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Widget container styles
  widgetsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  widgetContainer: {
    marginBottom: 16,
  },
  
  widget: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    ...globalStyles.shadow,
  },
  
  
  addMoreWidgetsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...globalStyles.shadow,
  },
  
  darkAddMoreWidgetsButton: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
  },
  
  addMoreWidgetsText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
    marginLeft: 8,
  },
  
  // Widget panel styles
  widgetPanelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  widgetPanel: {
    backgroundColor: colors.light.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  
  darkWidgetPanel: {
    backgroundColor: colors.dark.surface,
  },
  
  widgetPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  
  darkWidgetPanelHeader: {
    borderBottomColor: colors.dark.border,
  },
  
  widgetPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  
  closeButton: {
    padding: 4,
  },
  
  widgetList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  
  widgetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 12,
    ...globalStyles.shadow,
  },
  
  darkWidgetOption: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  
  widgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  widgetActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  addButton: {
    backgroundColor: colors.primary + '20',
  },

  removeButton: {
    backgroundColor: colors.error + '20',
  },
  
  widgetOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  
  widgetOptionContent: {
    flex: 1,
  },
  
  widgetOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  
  widgetOptionDescription: {
    fontSize: 14,
    color: colors.light.textSecondary,
    lineHeight: 20,
  },
  
  debugResetButton: {
    margin: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  debugResetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  alertContainer: {
    backgroundColor: colors.light.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    ...globalStyles.shadow,
  },

  darkAlertContainer: {
    backgroundColor: colors.dark.surface,
  },

  alertIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  alertMessage: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },

  alertButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },

  alertButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  alertButtonCancel: {
    backgroundColor: colors.light.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.light.border,
  },

  alertButtonConfirm: {
    backgroundColor: colors.error,
  },

  alertButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
  },

  alertButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chatbotButton: {
    position: 'absolute',
    top: 800,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.light.surface,
    borderColor: colors.primary,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...globalStyles.shadow,
    zIndex: 10,
  },
  darkChatbotButton: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.primary,
  },
});

export default Dashboard;