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
  Dimensions,
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
import { shareService } from '../../services/shareService';
import { financialService, type Goal, type GoalResumen, type GoalMovement } from '../../services/financialService';
import { confirmDeleteGoal } from '../../utils/deleteConfirmation';

// Goal interface is now imported from financialService

interface ObjetivosProps {
  onAuthChange: (isAuth: boolean) => void;
}

const CircularProgress: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}> = ({ percentage, size = 120, strokeWidth = 8, color = colors.primary }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <View style={styles.progressCircle}>
        <View style={[
          styles.progressBackground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
          }
        ]} />
        <View style={[
          styles.progressForeground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            transform: [{ rotate: '-90deg' }],
          }
        ]} />
        <View style={styles.progressText}>
          <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
        </View>
      </View>
    </View>
  );
};

const Objetivos: React.FC<ObjetivosProps> = ({ onAuthChange }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedObjetivo, setSelectedObjetivo] = useState<Goal | null>(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [objetivos, setObjetivos] = useState<Goal[]>([]);
  const [resumenObjetivos, setResumenObjetivos] = useState<GoalResumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [movimientosHistorial, setMovimientosHistorial] = useState<GoalMovement[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [nuevoObjetivo, setNuevoObjetivo] = useState({
    nombre: '',
    metaTotal: '',
    fechaLimite: '',
    descripcion: '',
    prioridad: 'Media' as 'Alta' | 'Media' | 'Baja',
    categoria: 'Viaje',
  });

  const categorias = ['Viaje', 'Casa', 'Auto', 'Educación', 'Emergencia', 'Inversión', 'Otros'];
  const prioridades = ['Alta', 'Media', 'Baja'];

  useEffect(() => {
    loadObjetivos();
  }, []);

  const { setIsVisible } = useTabBarVisibility();

  const lastOffsetY = useRef(0);
  const lastAction = useRef<"show" | "hide">("show");

  const formatearFecha = (texto: string) => {
  // Remover todos los caracteres que no sean números
  const soloNumeros = texto.replace(/\D/g, '');
  
  // Limitar a 8 dígitos (YYYYMMDD)
  const limitado = soloNumeros.substring(0, 8);
  
  // Aplicar formato YYYY-MM-DD
  let formateado = limitado;
    if (limitado.length >= 5) {
      formateado = `${limitado.substring(0, 4)}-${limitado.substring(4, 6)}`;
      if (limitado.length >= 7) {
        formateado += `-${limitado.substring(6, 8)}`;
      }
    } else if (limitado.length >= 5) {
      formateado = `${limitado.substring(0, 4)}-${limitado.substring(4)}`;
    }
    
    return formateado;
  };

  // Función para validar fecha
  const validarFecha = (fechaStr: string, strict: boolean = true) => {
    if (strict && fechaStr.length !== 10) return false;
    if (!strict && fechaStr.length < 10) return true;
    
    const [año, mes, dia] = fechaStr.split('-').map(Number);

    // Obtener fecha actual
    const fechaActual = new Date();
    const añoActual = fechaActual.getFullYear();

    // Validar año (desde año actual hasta 50 años en el futuro)
    if (año < añoActual || año > añoActual + 50) return false;
    
    // Validar mes
    if (mes < 1 || mes > 12) return false;
    
    // Validar día básico
    if (dia < 1 || dia > 31) return false;

    // Crear fecha y validar que sea válida
    const fechaInput = new Date(año, mes - 1, dia);
    
    // Verificar que la fecha construida coincida con los valores ingresados
    if (fechaInput.getFullYear() !== año || 
        fechaInput.getMonth() !== mes - 1 || 
        fechaInput.getDate() !== dia) {
      return false;
    }

    // Validar que no sea anterior a hoy (opcional, quítalo si quieres permitir fechas pasadas)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    
    return fechaInput >= hoy;
  };

  // Handler para el cambio de fecha
  const handleFechaChange = (texto: string) => {
    const fechaFormateada = formatearFecha(texto);
    setNuevoObjetivo(prev => ({ ...prev, fechaLimite: fechaFormateada }));
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

  const loadObjetivos = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);
      
      console.log('🎯 Cargando objetivos y resumen...');
      
      // Load data in parallel for better performance
      const [objetivosResult, resumenResult] = await Promise.allSettled([
        financialService.getGoals(),
        financialService.getGoalsSummary()
      ]);
      
      // Handle goals data
      if (objetivosResult.status === 'fulfilled') {
        setObjetivos(objetivosResult.value);
        console.log('✅ Objetivos cargados exitosamente:', objetivosResult.value.length);
      } else {
        console.error('❌ Error cargando objetivos:', objetivosResult.reason);
      }
      
      // Handle summary data
      if (resumenResult.status === 'fulfilled') {
        setResumenObjetivos(resumenResult.value);
        console.log('✅ Resumen cargado exitosamente');
      } else {
        console.error('❌ Error cargando resumen:', resumenResult.reason);
      }
      
    } catch (error: any) {
      console.error('❌ Error cargando datos de objetivos:', error);
      setError(error.message || 'Error cargando datos');
      
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteObjetivo = async (objetivo: Goal) => {
    confirmDeleteGoal(objetivo.nombre, async () => {
      try {
        const success = await financialService.deleteGoal(objetivo.id);
        if (success) {
          await loadObjetivos(false);
        }
      } catch (error) {
        console.error('Error eliminando objetivo:', error);
        Alert.alert('Error', 'No se pudo eliminar el objetivo');
      }
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadObjetivos(false);
    } catch (error) {
      console.log('Error refreshing objetivos:', error);
    }
    setRefreshing(false);
  };

  const validateObjetivoInput = () => {
    const errors: string[] = [];
    
    // Validar nombre
    if (!nuevoObjetivo.nombre.trim()) {
      errors.push('• El nombre del objetivo es obligatorio');
    } else if (nuevoObjetivo.nombre.trim().length < 3) {
      errors.push('• El nombre debe tener al menos 3 caracteres');
    } else if (nuevoObjetivo.nombre.trim().length > 50) {
      errors.push('• El nombre no puede exceder 50 caracteres');
    }
    
    // Validar meta total
    if (!nuevoObjetivo.metaTotal.trim()) {
      errors.push('• La meta total es obligatoria');
    } else {
      const metaTotal = parseFloat(nuevoObjetivo.metaTotal.replace(/,/g, ''));
      if (isNaN(metaTotal)) {
        errors.push('• La meta debe ser un número válido');
      } else if (metaTotal <= 0) {
        errors.push('• La meta debe ser mayor a 0');
      } else if (metaTotal < 10) {
        errors.push('• La meta debe ser de al menos $10');
      } else if (metaTotal > 10000000) {
        errors.push('• La meta no puede exceder $10,000,000');
      }
    }
    
    // Validar fecha límite
    if (!nuevoObjetivo.fechaLimite.trim()) {
      errors.push('• La fecha límite es obligatoria');
    } else if (nuevoObjetivo.fechaLimite.length !== 10) {
      errors.push('• La fecha debe tener formato AAAA-MM-DD');
    } else if (!validarFecha(nuevoObjetivo.fechaLimite)) {
      errors.push('• La fecha no es válida');
    } else {
      const fechaLimite = new Date(nuevoObjetivo.fechaLimite + 'T00:00:00');
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaLimite <= hoy) {
        errors.push('• La fecha límite debe ser en el futuro');
      }
      
      // Validar que no sea muy lejos (más de 20 años)
      const maxFecha = new Date(hoy);
      maxFecha.setFullYear(hoy.getFullYear() + 20);
      if (fechaLimite > maxFecha) {
        errors.push('• La fecha límite no puede ser más de 20 años en el futuro');
      }
    }
    
    // Validar descripción (opcional pero con límites)
    if (nuevoObjetivo.descripcion && nuevoObjetivo.descripcion.length > 200) {
      errors.push('• La descripción no puede exceder 200 caracteres');
    }
    
    // Validar categoría y prioridad
    if (!categorias.includes(nuevoObjetivo.categoria)) {
      errors.push('• Selecciona una categoría válida');
    }
    
    if (!prioridades.includes(nuevoObjetivo.prioridad)) {
      errors.push('• Selecciona una prioridad válida');
    }
    
    return errors;
  };

  const handleAddObjetivo = async () => {
    const validationErrors = validateObjetivoInput();
    
    if (validationErrors.length > 0) {
      Alert.alert(
        t('common.validationErrors'), 
        validationErrors.join('\n'),
        [{ text: t('common.understood'), style: 'default' }]
      );
      return;
    }

    const metaTotal = parseFloat(nuevoObjetivo.metaTotal.replace(/,/g, ''));

    // Map priority names to IDs (backend expects prioridad_id)
    const priorityMap = {
      'Alta': 3,
      'Media': 2,
      'Baja': 1
    };

    const goalData = {
      nombre: nuevoObjetivo.nombre.trim(),
      meta_total: metaTotal, // Backend expects meta_total with underscore
      fecha_limite: nuevoObjetivo.fechaLimite,
      descripcion: nuevoObjetivo.descripcion?.trim() || '',
      prioridad_id: priorityMap[nuevoObjetivo.prioridad], // Backend expects prioridad_id
      categoria: nuevoObjetivo.categoria,
    };

    try {
      console.log('🎯 Creando nuevo objetivo...', goalData);
      
      const newObjetivo = await financialService.createGoal(goalData);
      
      // Update local state
      setObjetivos(prev => [newObjetivo, ...prev]);
      
      // Update summary by reloading
      try {
        const updatedResumen = await financialService.getGoalsSummary();
        setResumenObjetivos(updatedResumen);
      } catch (resumenError) {
        console.log('⚠️ No se pudo actualizar el resumen:', resumenError);
      }
      
      // Reset form and close modal
      setNuevoObjetivo({ 
        nombre: '', 
        metaTotal: '', 
        fechaLimite: '', 
        descripcion: '', 
        prioridad: 'Media', 
        categoria: 'Viaje' 
      });
      setShowAddModal(false);
      
      console.log('✅ Objetivo creado exitosamente');
      Alert.alert(t("common.success"), t("goals.created"));
      
    } catch (error: any) {
      console.error('❌ Error creando objetivo:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Error creando el objetivo. Inténtalo de nuevo.',
        [{ text: t('common.understood'), style: 'default' }]
      );
    }
  };

  const handleAddMoney = async (objetivoId: number, cantidad: number) => {
    try {
      console.log(`🎯 Agregando $${cantidad} al objetivo ${objetivoId}...`);

      const updatedGoal = await financialService.addMoneyToGoal(objetivoId, cantidad);

      // Update local state
      setObjetivos(prev => prev.map(obj =>
        obj.id === objetivoId ? updatedGoal : obj
      ));

      // Update selected objetivo if it's the same one we just updated
      if (selectedObjetivo && selectedObjetivo.id === objetivoId) {
        setSelectedObjetivo(updatedGoal);
      }

      // Update summary
      try {
        const updatedResumen = await financialService.getGoalsSummary();
        setResumenObjetivos(updatedResumen);
      } catch (resumenError) {
        console.log('⚠️ No se pudo actualizar el resumen:', resumenError);
      }

      console.log('✅ Dinero agregado exitosamente');
      Alert.alert(t("common.success"), `Se agregaron ${formatCurrency(cantidad)} a "${selectedObjetivo?.nombre}"`);

      // Reload movement history if the details modal is open
      if (selectedObjetivo && showDetailsModal) {
        loadMovimientosHistorial(selectedObjetivo.id);
      }

      // Close modal and reset form
      setShowAddMoneyModal(false);
      setCantidadAgregar('');

    } catch (error: any) {
      console.error('❌ Error agregando dinero al objetivo:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Error agregando dinero. Inténtalo de nuevo.',
        [{ text: t('common.understood'), style: 'default' }]
      );
    }
  };

  const handleAddMoneyPress = (objetivo: Goal) => {
    setSelectedObjetivo(objetivo);
    setCantidadAgregar('');
    setShowAddMoneyModal(true);
  };

  const handleConfirmAddMoney = () => {
    const cantidad = parseFloat(cantidadAgregar.replace(/,/g, ''));

    if (isNaN(cantidad) || cantidad <= 0) {
      Alert.alert(t('common.error'), 'Por favor ingresa una cantidad válida mayor a 0');
      return;
    }

    if (!selectedObjetivo) {
      Alert.alert(t('common.error'), 'Error: objetivo no seleccionado');
      return;
    }

    handleAddMoney(selectedObjetivo.id, cantidad);
  };

  const handleShareObjective = async (objetivo: Goal) => {
    try {
      const progreso = Math.round((objetivo.ahorroActual / objetivo.metaTotal) * 100);

      const shareData = {
        nombre: objetivo.nombre,
        progreso: progreso,
        ahorroActual: objetivo.ahorroActual,
        metaTotal: objetivo.metaTotal,
        fechaLimite: objetivo.fechaLimite,
      };

      const success = await shareService.shareGoalProgress(shareData);

      if (success) {
        console.log('✅ Objetivo compartido exitosamente');
      }
    } catch (error) {
      console.error('❌ Error compartiendo objetivo:', error);
      Alert.alert(t('common.shareError'), t('common.shareErrorMessage'));
    }
  };

  const loadMovimientosHistorial = async (objetivoId: number) => {
    try {
      setLoadingMovimientos(true);
      console.log('🎯 Cargando historial de movimientos para objetivo:', objetivoId);

      const movimientos = await financialService.getGoalMovements(objetivoId);
      setMovimientosHistorial(movimientos);

      console.log('✅ Historial de movimientos cargado exitosamente:', movimientos.length);
    } catch (error: any) {
      console.error('❌ Error cargando historial de movimientos:', error);
      Alert.alert('Error', 'No se pudo cargar el historial de movimientos');
    } finally {
      setLoadingMovimientos(false);
    }
  };

  const getPrioridadName = (prioridad: any): string => {
    if (typeof prioridad === 'string') {
      return prioridad;
    }
    if (typeof prioridad === 'object' && prioridad?.nombre) {
      return prioridad.nombre;
    }
    return 'Media'; // Default fallback
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return colors.error;
      case 'Media': return colors.warning;
      case 'Baja': return colors.success;
      default: return colors.light.textSecondary;
    }
  };

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria) {
      case 'Viaje': return 'airplane';
      case 'Casa': return 'home';
      case 'Auto': return 'car';
      case 'Educación': return 'school';
      case 'Emergencia': return 'medical';
      case 'Inversión': return 'trending-up';
      default: return 'star';
    }
  };

  const getDiasRestantes = (fechaLimite: string) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    const diferencia = limite.getTime() - hoy.getTime();
    const dias = Math.ceil(diferencia / (1000 * 3600 * 24));
    return dias;
  };

  const objetivosPorPrioridad = (objetivos || []).sort((a, b) => {
    const prioridadOrder = { 'Alta': 0, 'Media': 1, 'Baja': 2 };
    const prioridadA = getPrioridadName(a.prioridad);
    const prioridadB = getPrioridadName(b.prioridad);
    return prioridadOrder[prioridadA] - prioridadOrder[prioridadB];
  });

  // Use summary data if available, otherwise calculate from local data
  const totalAhorrado = resumenObjetivos?.totalAhorrado || (objetivos || []).reduce((sum, obj) => sum + obj.ahorroActual, 0);
  const totalMetas = resumenObjetivos?.totalMetas || (objetivos || []).reduce((sum, obj) => sum + obj.metaTotal, 0);
  const progresoGeneral = resumenObjetivos?.progresoGeneral || (totalMetas > 0 ? (totalAhorrado / totalMetas) * 100 : 0);

  if (loading && !resumenObjetivos) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            {t("goals.loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Error state
  if (error && !resumenObjetivos && !objetivos.length) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <View>
            <Text style={[styles.headerTitle, isDarkMode && styles.darkText, { fontSize: isTablet ? 24 : 20 }]}>
              {t("goals.title")}
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
        
        {/* Error State */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(4) }}>
          <Ionicons name="flag-outline" size={64} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
          <Text style={[{ fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }, isDarkMode && styles.darkText]}>
            Error de Conexión
          </Text>
          <Text style={[{ fontSize: 14, marginTop: 8, textAlign: 'center' }, isDarkMode && styles.darkTextSecondary]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 }}
            onPress={() => loadObjetivos()}
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
          <Text style={[
            styles.headerTitle,
            isDarkMode && styles.darkText,
            { fontSize: isTablet ? 24 : 20 }
          ]}>
            {t("goals.title")}
          </Text>
          <Text style={[styles.headerDate, isDarkMode && styles.darkTextSecondary]}>
            {formatDate(new Date())}
          </Text>
        </View>
        <View style={styles.headerActions}>
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
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={[styles.headerButton, styles.addButton]}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
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
        {/* Resumen General */}
        <View style={[
          styles.resumenCard,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2) }
        ]}>
          <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
            {t("goals.overallProgress")}
          </Text>
          
          <View style={styles.resumenContent}>
            <View style={styles.resumenStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
                  {formatCurrency(totalAhorrado)}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                  {t("goals.totalSaved")}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
                  {formatCurrency(totalMetas)}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                  {t("goals.totalTargets")}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
                  {resumenObjetivos?.objetivosActivos || objetivos.length}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.darkTextSecondary]}>
                  {t("goals.activeGoals")}
                </Text>
              </View>
            </View>
            
            <View style={styles.progressContainer}>
              <CircularProgress 
                percentage={progresoGeneral}
                size={isTablet ? 140 : 120}
                color={colors.primary}
              />
            </View>
          </View>
        </View>

        {/* Lista de Objetivos */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(12) }
        ]}>
          <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
            {t("goals.byPriority")}
          </Text>

          {objetivosPorPrioridad.length > 0 ? (
            objetivosPorPrioridad.map((objetivo) => {
              const progreso = (objetivo.ahorroActual / objetivo.metaTotal) * 100;
              const diasRestantes = getDiasRestantes(objetivo.fechaLimite);
              
              return (
                <TouchableOpacity
                  key={objetivo.id}
                  style={styles.objetivoItem}
                  onPress={() => {
                    setSelectedObjetivo(objetivo);
                    setShowDetailsModal(true);
                    loadMovimientosHistorial(objetivo.id);
                  }}
                >
                  <View style={styles.objetivoHeader}>
                    <View style={styles.objetivoInfo}>
                      <View style={[
                        styles.categoriaIcon,
                        { backgroundColor: colors.primary + '20' }
                      ]}>
                        <Ionicons 
                          name={getCategoriaIcon(objetivo.categoria) as any} 
                          size={24} 
                          color={colors.primary} 
                        />
                      </View>
                      
                      <View style={styles.objetivoTexts}>
                        <View style={styles.objetivoTitleRow}>
                          <Text style={[styles.objetivoNombre, isDarkMode && styles.darkText]}>
                            {objetivo.nombre}
                          </Text>
                          <View style={[
                            styles.prioridadTag,
                            { backgroundColor: getPrioridadColor(getPrioridadName(objetivo.prioridad)) + '20' }
                          ]}>
                            <Text style={[
                              styles.prioridadText,
                              { color: getPrioridadColor(getPrioridadName(objetivo.prioridad)) }
                            ]}>
                              {getPrioridadName(objetivo.prioridad)}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={[styles.objetivoCategoria, isDarkMode && styles.darkTextSecondary]}>
                          {objetivo.categoria}
                        </Text>
                        
                        {objetivo.descripcion && (
                          <Text style={[styles.objetivoDescripcion, isDarkMode && styles.darkTextSecondary]}>
                            {objetivo.descripcion}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.objetivoProgress}>
                    <View style={styles.objetivoAmounts}>
                      <Text style={[styles.objetivoActual, isDarkMode && styles.darkText]}>
                        {formatCurrency(objetivo.ahorroActual)}
                      </Text>
                      <Text style={[styles.objetivoMeta, isDarkMode && styles.darkTextSecondary]}>
                        de {formatCurrency(objetivo.metaTotal)}
                      </Text>
                    </View>
                    
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            { 
                              width: `${progreso}%`,
                              backgroundColor: progreso >= 100 ? colors.success : colors.primary,
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.progressPercent, isDarkMode && styles.darkTextSecondary]}>
                        {Math.round(progreso)}%
                      </Text>
                    </View>
                    
                    <View style={styles.objetivoFooter}>
                      <Text style={[
                        styles.diasRestantes,
                        isDarkMode && styles.darkTextSecondary,
                        { color: diasRestantes < 30 ? colors.error : isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary }
                      ]}>
                        {diasRestantes > 0 
                          ? `${diasRestantes} días restantes`
                          : `Vencido hace ${Math.abs(diasRestantes)} días`
                        }
                      </Text>
                      
                      {progreso < 100 && (
                        <TouchableOpacity
                          style={styles.addMoneyButton}
                          onPress={() => handleAddMoneyPress(objetivo)}
                        >
                          <Ionicons name="add" size={16} color="#fff" />
                          <Text style={styles.addMoneyText}>Agregar</Text>
                        </TouchableOpacity>
                      )}
                      
                      <View style={styles.objetivoActions}>
                        {/* Botón de compartir */}
                        <TouchableOpacity
                          style={styles.shareButton}
                          onPress={() => handleShareObjective(objetivo)}
                        >
                          <Ionicons name="share-outline" size={16} color="#fff" />
                          <Text style={styles.shareButtonText}>Compartir</Text>
                        </TouchableOpacity>

                        {/* Botón de eliminar */}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteObjetivo(objetivo)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#fff" />
                          <Text style={styles.deleteButtonText}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="flag-outline" 
                size={48} 
                color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary} 
              />
              <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                No tienes objetivos financieros aún
              </Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.createFirstButtonText}>Crear mi primer objetivo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Agregar Objetivo */}
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
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              {t("goals.newGoal")}
            </Text>
            <TouchableOpacity 
              style={styles.modernSaveButton}
              onPress={handleAddObjetivo}
            >
              <Text style={styles.modernSaveButtonText}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("goals.goalName")} *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={t("goals.goalNamePlaceholder")}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoObjetivo.nombre}
                onChangeText={(text) => setNuevoObjetivo(prev => ({ ...prev, nombre: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("goals.totalTarget")} *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder="0.00"
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoObjetivo.metaTotal}
                onChangeText={(text) => setNuevoObjetivo(prev => ({ ...prev, metaTotal: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("goals.deadline")} *
              </Text>
              <TextInput
                style={[
                  styles.input, 
                  isDarkMode && styles.darkInput,
                  // Agregar indicador visual si la fecha es inválida
                  nuevoObjetivo.fechaLimite.length === 10 && !validarFecha(nuevoObjetivo.fechaLimite) && styles.inputError
                ]}
                placeholder="2027-12-31"
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoObjetivo.fechaLimite}
                onChangeText={handleFechaChange}
                keyboardType="numeric"
                maxLength={10}
              />
              {/* Mensaje de ayuda */}
              <Text style={[styles.helpText, isDarkMode && styles.darkTextSecondary]}>
                {t("goals.dateFormat")}
              </Text>
              {/* Mensaje de error si la fecha es inválida */}
              {nuevoObjetivo.fechaLimite.length === 10 && !validarFecha(nuevoObjetivo.fechaLimite) && (
                <Text style={styles.errorText}>
                  {t("goals.invalidDate")}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("goals.category")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriasPicker}>
                  {categorias.map((categoria) => (
                    <TouchableOpacity
                      key={categoria}
                      style={[
                        styles.categoriaOption,
                        nuevoObjetivo.categoria === categoria && styles.categoriaSelected,
                        isDarkMode && styles.darkCategoriaOption,
                        nuevoObjetivo.categoria === categoria && isDarkMode && styles.darkCategoriaSelected,
                      ]}
                      onPress={() => setNuevoObjetivo(prev => ({ ...prev, categoria }))}
                    >
                      <Ionicons 
                        name={getCategoriaIcon(categoria) as any} 
                        size={16} 
                        color={nuevoObjetivo.categoria === categoria ? '#fff' : (isDarkMode ? colors.dark.text : colors.light.text)}
                      />
                      <Text style={[
                        styles.categoriaOptionText,
                        nuevoObjetivo.categoria === categoria && styles.categoriaSelectedText,
                        isDarkMode && styles.darkText,
                        nuevoObjetivo.categoria === categoria && styles.categoriaSelectedText,
                      ]}>
                        {t(`goals.categories.${categoria.toLowerCase()}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("goals.priority")}
              </Text>
              <View style={styles.prioridadSelector}>
                {prioridades.map((prioridad) => (
                  <TouchableOpacity
                    key={prioridad}
                    style={[
                      styles.prioridadOption,
                      nuevoObjetivo.prioridad === prioridad && styles.prioridadSelected,
                      nuevoObjetivo.prioridad === prioridad && { backgroundColor: getPrioridadColor(prioridad) },
                    ]}
                    onPress={() => setNuevoObjetivo(prev => ({ ...prev, prioridad: prioridad as any }))}
                  >
                    <Text style={[
                      styles.prioridadOptionText,
                      nuevoObjetivo.prioridad === prioridad && styles.prioridadSelectedText,
                      { color: nuevoObjetivo.prioridad === prioridad ? '#fff' : getPrioridadColor(prioridad) }
                    ]}>
                      {t(`goals.priorities.${prioridad.toLowerCase()}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("goals.description")}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
                placeholder={t("goals.descriptionPlaceholder")}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoObjetivo.descripcion}
                onChangeText={(text) => setNuevoObjetivo(prev => ({ ...prev, descripcion: text }))}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Detalles del Objetivo */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.modalHeader, isDarkMode && styles.darkHeader]}>
            <TouchableOpacity
              style={[styles.modernCancelButton, isDarkMode && styles.darkModernCancelButton]}
              onPress={() => {
                setShowDetailsModal(false);
                setMovimientosHistorial([]);
                setSelectedObjetivo(null);
              }}
            >
              <Text style={[styles.modernCancelButtonText, isDarkMode && styles.darkModernCancelButtonText]}>
                Cerrar
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              Detalles del Objetivo
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {selectedObjetivo && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailsContainer}>
                <View style={styles.detailsHeader}>
                  <View style={[
                    styles.detailsIcon,
                    { backgroundColor: colors.primary + '20' }
                  ]}>
                    <Ionicons 
                      name={getCategoriaIcon(selectedObjetivo.categoria) as any} 
                      size={32} 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={[styles.detailsTitle, isDarkMode && styles.darkText]}>
                    {selectedObjetivo.nombre}
                  </Text>
                </View>

                <View style={styles.detailsProgress}>
                  <CircularProgress 
                    percentage={(selectedObjetivo.ahorroActual / selectedObjetivo.metaTotal) * 100}
                    size={150}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.detailsStats}>
                  <View style={styles.detailsStat}>
                    <Text style={[styles.detailsStatLabel, isDarkMode && styles.darkTextSecondary]}>
                      Ahorrado
                    </Text>
                    <Text style={[styles.detailsStatValue, isDarkMode && styles.darkText]}>
                      {formatCurrency(selectedObjetivo.ahorroActual)}
                    </Text>
                  </View>
                  <View style={styles.detailsStat}>
                    <Text style={[styles.detailsStatLabel, isDarkMode && styles.darkTextSecondary]}>
                      Meta
                    </Text>
                    <Text style={[styles.detailsStatValue, isDarkMode && styles.darkText]}>
                      {formatCurrency(selectedObjetivo.metaTotal)}
                    </Text>
                  </View>
                  <View style={styles.detailsStat}>
                    <Text style={[styles.detailsStatLabel, isDarkMode && styles.darkTextSecondary]}>
                      Restante
                    </Text>
                    <Text style={[styles.detailsStatValue, isDarkMode && styles.darkText]}>
                      {formatCurrency(selectedObjetivo.metaTotal - selectedObjetivo.ahorroActual)}
                    </Text>
                  </View>
                </View>

                {/* Botón de Abonar o Mensaje de Completado */}
                {((selectedObjetivo.ahorroActual / selectedObjetivo.metaTotal) * 100) >= 100 ? (
                  <View style={[styles.completedMessage, isDarkMode && styles.darkCompletedMessage]}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    <Text style={[styles.completedMessageText, isDarkMode && styles.darkText]}>
                      ¡Objetivo Completado! 🎉
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.abonarButton, isDarkMode && styles.darkAbonarButton]}
                    onPress={() => {
                      setShowAddMoneyModal(true);
                    }}
                  >
                    <Ionicons name="add-circle" size={24} color="#fff" />
                    <Text style={styles.abonarButtonText}>Abonar al Objetivo</Text>
                  </TouchableOpacity>
                )}

                {selectedObjetivo.descripcion && (
                  <View style={styles.detailsDescription}>
                    <Text style={[styles.detailsDescriptionLabel, isDarkMode && styles.darkTextSecondary]}>
                      Descripción
                    </Text>
                    <Text style={[styles.detailsDescriptionText, isDarkMode && styles.darkText]}>
                      {selectedObjetivo.descripcion}
                    </Text>
                  </View>
                )}

                {/* Historial de Movimientos */}
                <View style={[styles.detailsHistory, isDarkMode && styles.darkCard]}>
                  <Text style={[styles.detailsHistoryLabel, isDarkMode && styles.darkText]}>
                    Historial de Ahorros
                  </Text>

                  {loadingMovimientos ? (
                    <View style={styles.loadingHistoryContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.loadingHistoryText, isDarkMode && styles.darkTextSecondary]}>
                        Cargando movimientos...
                      </Text>
                    </View>
                  ) : movimientosHistorial.length > 0 ? (
                    <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                      {movimientosHistorial.map((movimiento) => (
                        <View
                          key={movimiento.id}
                          style={[styles.historyItem, isDarkMode && styles.darkHistoryItem]}
                        >
                          <View style={styles.historyItemLeft}>
                            <View style={[
                              styles.historyItemIcon,
                              { backgroundColor: movimiento.es_aporte ? colors.success + '20' : colors.error + '20' }
                            ]}>
                              <Ionicons
                                name={movimiento.es_aporte ? 'add' : 'remove'}
                                size={16}
                                color={movimiento.es_aporte ? colors.success : colors.error}
                              />
                            </View>
                            <View style={styles.historyItemDetails}>
                              <Text style={[styles.historyItemTitle, isDarkMode && styles.darkText]}>
                                {movimiento.descripcion || (movimiento.es_aporte ? 'Aporte' : 'Retiro')}
                              </Text>
                              <Text style={[styles.historyItemDate, isDarkMode && styles.darkTextSecondary]}>
                                {formatDate(new Date(movimiento.fecha))}
                              </Text>
                            </View>
                          </View>
                          <Text style={[
                            styles.historyItemAmount,
                            { color: movimiento.es_aporte ? colors.success : colors.error },
                            isDarkMode && { opacity: 0.9 }
                          ]}>
                            {movimiento.es_aporte ? '+' : '-'}{formatCurrency(movimiento.monto)}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyHistoryContainer}>
                      <Ionicons
                        name="time-outline"
                        size={32}
                        color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                      />
                      <Text style={[styles.emptyHistoryText, isDarkMode && styles.darkTextSecondary]}>
                        Aún no hay movimientos registrados
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Modal Agregar Dinero */}
      <Modal
        visible={showAddMoneyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddMoneyModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.modalHeader, isDarkMode && styles.darkHeader]}>
            <TouchableOpacity
              style={[styles.modernCancelButton, isDarkMode && styles.darkModernCancelButton]}
              onPress={() => {
                setShowAddMoneyModal(false);
                setCantidadAgregar('');
                setSelectedObjetivo(null);
              }}
            >
              <Text style={[styles.modernCancelButtonText, isDarkMode && styles.darkModernCancelButtonText]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              Agregar Ahorro
            </Text>
            <TouchableOpacity
              style={styles.modernSaveButton}
              onPress={handleConfirmAddMoney}
            >
              <Text style={styles.modernSaveButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedObjetivo && (
              <>
                <View style={styles.addMoneyHeader}>
                  <View style={[
                    styles.addMoneyIcon,
                    { backgroundColor: colors.success + '20' }
                  ]}>
                    <Ionicons
                      name={getCategoriaIcon(selectedObjetivo.categoria) as any}
                      size={32}
                      color={colors.success}
                    />
                  </View>
                  <Text style={[styles.addMoneyTitle, isDarkMode && styles.darkText]}>
                    {selectedObjetivo.nombre}
                  </Text>
                  <Text style={[styles.addMoneySubtitle, isDarkMode && styles.darkTextSecondary]}>
                    Progreso actual: {formatCurrency(selectedObjetivo.ahorroActual)} de {formatCurrency(selectedObjetivo.metaTotal)}
                  </Text>

                  {/* Barra de progreso */}
                  <View style={styles.addMoneyProgressContainer}>
                    <View style={styles.addMoneyProgressBar}>
                      <View
                        style={[
                          styles.addMoneyProgressFill,
                          {
                            width: `${(selectedObjetivo.ahorroActual / selectedObjetivo.metaTotal) * 100}%`,
                            backgroundColor: colors.success,
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.addMoneyProgressPercent, isDarkMode && styles.darkTextSecondary]}>
                      {Math.round((selectedObjetivo.ahorroActual / selectedObjetivo.metaTotal) * 100)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                    Cantidad a agregar *
                  </Text>
                  <TextInput
                    style={[styles.input, styles.moneyInput, isDarkMode && styles.darkInput]}
                    placeholder="0.00"
                    placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                    value={cantidadAgregar}
                    onChangeText={setCantidadAgregar}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={[styles.helpText, isDarkMode && styles.darkTextSecondary]}>
                    Ingresa la cantidad que quieres ahorrar para este objetivo
                  </Text>
                </View>

                {/* Botones rápidos */}
                <View style={styles.quickAmountsContainer}>
                  <Text style={[styles.quickAmountsLabel, isDarkMode && styles.darkTextSecondary]}>
                    Cantidades rápidas:
                  </Text>
                  <View style={styles.quickAmountsButtons}>
                    {[10, 25, 50, 100].map(amount => (
                      <TouchableOpacity
                        key={amount}
                        style={[styles.quickAmountButton, isDarkMode && styles.darkQuickAmountButton]}
                        onPress={() => setCantidadAgregar(amount.toString())}
                      >
                        <Text style={[styles.quickAmountText, isDarkMode && styles.darkText]}>
                          ${amount}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Previsualización */}
                {cantidadAgregar && !isNaN(parseFloat(cantidadAgregar)) && parseFloat(cantidadAgregar) > 0 && (
                  <View style={[styles.previewContainer, isDarkMode && styles.darkPreviewContainer]}>
                    <Text style={[styles.previewLabel, isDarkMode && styles.darkTextSecondary]}>
                      Nuevo progreso:
                    </Text>
                    <Text style={[styles.previewAmount, isDarkMode && styles.darkText]}>
                      {formatCurrency(selectedObjetivo.ahorroActual + parseFloat(cantidadAgregar))} de {formatCurrency(selectedObjetivo.metaTotal)}
                    </Text>
                    <Text style={[styles.previewPercent, { color: colors.success }]}>
                      {Math.round(((selectedObjetivo.ahorroActual + parseFloat(cantidadAgregar)) / selectedObjetivo.metaTotal) * 100)}%
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
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
  scrollView: {
    flex: 1,
  },
  resumenCard: {
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
  resumenContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumenStats: {
    flex: 1,
  },
  statItem: {
    marginBottom: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressCircle: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBackground: {
    borderColor: colors.light.surfaceSecondary,
    position: 'absolute',
  },
  progressForeground: {
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
  },
  progressText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    ...globalStyles.shadow,
  },
  objetivoItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  objetivoHeader: {
    marginBottom: 12,
  },
  objetivoInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoriaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  objetivoTexts: {
    flex: 1,
  },
  objetivoTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  objetivoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  prioridadTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prioridadText: {
    fontSize: 10,
    fontWeight: '600',
  },
  objetivoCategoria: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  objetivoDescripcion: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },
  objetivoProgress: {
    marginTop: 8,
  },
  objetivoAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  objetivoActual: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  objetivoMeta: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: colors.light.textSecondary,
    minWidth: 35,
    textAlign: 'right',
  },
  objetivoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diasRestantes: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addMoneyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  createFirstButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoriasPicker: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  categoriaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
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
    marginLeft: 6,
  },
  categoriaSelectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  prioridadSelector: {
    flexDirection: 'row',
  },
  prioridadOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  prioridadSelected: {
    borderWidth: 0,
  },
  prioridadOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  prioridadSelectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  detailsContainer: {
    paddingBottom: 20,
  },
  detailsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
    textAlign: 'center',
  },
  detailsProgress: {
    alignItems: 'center',
    marginTop: 70,
    marginBottom: -40,
  },
  detailsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  detailsStat: {
    alignItems: 'center',
  },
  detailsStatLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  detailsStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  abonarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: colors.success,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  darkAbonarButton: {
    backgroundColor: colors.success,
  },
  abonarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  detailsDescription: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
  },
  detailsDescriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.textSecondary,
    marginBottom: 8,
  },
  detailsDescriptionText: {
    fontSize: 16,
    color: colors.light.text,
    lineHeight: 24,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  helpText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  // Estilos para modal de agregar dinero
  addMoneyHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  addMoneyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  addMoneyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  addMoneySubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  addMoneyProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  addMoneyProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  addMoneyProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  addMoneyProgressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  moneyInput: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.success,
  },
  quickAmountsContainer: {
    marginTop: 20,
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.textSecondary,
    marginBottom: 12,
  },
  quickAmountsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 8,
    alignItems: 'center',
  },
  darkQuickAmountButton: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    alignItems: 'center',
  },
  darkPreviewContainer: {
    backgroundColor: colors.success + '20',
  },
  previewLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  previewAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 4,
  },
  previewPercent: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos para el historial de movimientos
  detailsHistory: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
  },
  detailsHistoryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
  },
  loadingHistoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingHistoryText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginLeft: 8,
  },
  historyList: {
    maxHeight: 200,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
  },
  darkHistoryItem: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyItemDetails: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 2,
  },
  historyItemDate: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  historyItemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  objetivoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Objetivos;