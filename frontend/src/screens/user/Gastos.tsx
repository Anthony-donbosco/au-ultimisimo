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
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { formatCurrency, formatDate } from '../../utils/networkUtils';
import { useTabBarVisibility } from '../../navigation/useTabBarVisibility';
import { financialService, type Expense, type ExpenseResumen } from '../../services/financialService';
import { confirmDeleteExpense } from '../../utils/deleteConfirmation';
import CalendarioGastos from './CalendarioGastos';

interface Category {
  id: number;
  nombre: string;
  tipo: 'gasto' | 'ingreso' | 'ambos';
  color?: string;
  icono?: string;
  descripcion?: string;
  es_predeterminada?: boolean;
  es_activa?: boolean;
  orden_visualizacion?: number;
}

// Enhanced CategoriaGasto interface for UI display
interface CategoriaGasto {
  id: string | number; // Allow both for flexibility
  nombre: string;
  total: number;
  porcentajeComparacion: number;
  icono: string;
  color: string;
  tipo?: string;
  detalles: Array<{
    concepto: string;
    monto: number;
    fecha: string;
  }>;
}

// Complete Expense interface matching database
interface Expense {
  id: number;
  concepto: string;
  categoria: string; // Display name
  categoria_id: number; // Database ID
  monto: number;
  fecha: string;
  descripcion?: string;
  proveedor?: string;
  ubicacion?: string;
  numero_referencia?: string;
  es_deducible?: boolean;
  es_planificado?: boolean;
  tipo_pago?: string;
  lugar?: string; // For compatibility with existing code
}
interface GastosProps {
  onAuthChange: (isAuth: boolean) => void;
}

// Configurar calendario en español
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

// Helper function to get local date without timezone issues
const getLocalDateString = (date?: Date) => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Gastos: React.FC<GastosProps> = ({ onAuthChange }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Este Mes');
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [gastos, setGastos] = useState<Expense[]>([]);
  const [resumenGastos, setResumenGastos] = useState<ExpenseResumen | null>(null);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<Category[]>([]);
  const [totalGastos, setTotalGastos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | number | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [nuevoGasto, setNuevoGasto] = useState({
    concepto: '',
    categoria: 'Alimentación',
    monto: '',
    descripcion: '',
    lugar: '',
    tipo_pago: 'efectivo',
    fecha: getLocalDateString(), // Fecha actual por defecto
    tipo: 'actual' // 'actual' o 'planificado'
  });
  const [gastosPlanificados, setGastosPlanificados] = useState<any[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState<number>(0);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState(new Date().getMonth());
  const [selectedReportYear, setSelectedReportYear] = useState(new Date().getFullYear());
  const [selectedReportCategories, setSelectedReportCategories] = useState<string[]>([]);
  const [budgetInput, setBudgetInput] = useState('');
  const [comparacionMensual, setComparacionMensual] = useState<any[]>([]);

  const periodos = [t("period.thisMonth"), t("period.last3Months"), t("period.thisYear")];

  useEffect(() => {
    loadGastos();
    loadBudgetLimit();
    loadGastosPlanificados();
  }, [selectedPeriod, loadGastos, loadGastosPlanificados]);

  useEffect(() => {
    if (budgetLimit > 0) {
      setBudgetInput(budgetLimit.toString());
    }
  }, [budgetLimit]);

  const loadBudgetLimit = async () => {
    try {
      const budget = await AsyncStorage.getItem('monthly_budget_limit');
      if (budget) {
        setBudgetLimit(parseFloat(budget));
      }
    } catch (error) {
      console.error('Error cargando límite de presupuesto:', error);
    }
  };

  const saveBudgetLimit = async (newLimit: number) => {
    try {
      await AsyncStorage.setItem('monthly_budget_limit', newLimit.toString());
      setBudgetLimit(newLimit);
      Alert.alert(t('common.success'), t('expenses.budgetLimitUpdated'));
      setShowBudgetModal(false);
    } catch (error) {
      console.error('Error guardando límite de presupuesto:', error);
    }
  };

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

  const loadGastos = useCallback(async (showLoader: boolean = true) => {
    if (isLoadingData) {
      console.log('⏳ Ya hay una carga en progreso, evitando duplicados');
      return;
    }
    
    try {
      setIsLoadingData(true);
      if (showLoader) {
        setLoading(true);
      }
      setError(null);
      
      console.log('💸 Cargando gastos y resumen...');
      
      // Load data sequentially to avoid overwhelming the server
      let gastosData = null;
      let resumenData = null;
      let categoriasData: Category[] = [];
      
      // Try to load expenses
      try {
        gastosData = await financialService.getExpenses('current_month');
        setGastos(gastosData.items);
        console.log('✅ Gastos cargados exitosamente:', gastosData.items.length);
        
        // Debug: Log first few expenses to understand the data structure
        if (gastosData.items.length > 0) {
          console.log('🔍 DEBUG: First expense structure:', gastosData.items[0]);
          gastosData.items.slice(0, 3).forEach((gasto: any, index: number) => {
            console.log(`🔍 DEBUG Expense ${index + 1}:`, {
              concepto: gasto.concepto,
              monto: gasto.monto,
              categoria: gasto.categoria,
              categoria_type: typeof gasto.categoria,
              categoria_nombre: typeof gasto.categoria === 'object' ? gasto.categoria?.nombre : gasto.categoria
            });
          });
        }
      } catch (error) {
        console.error('❌ Error cargando gastos:', error);
        setGastos([]); // Set empty array as fallback
      }
      
      // Calculate category totals directly from individual expenses
      if (gastosData && gastosData.items.length > 0) {
        console.log('📊 Calculating category totals from individual expenses...');
        
        // Group expenses by category and calculate totals
        const categoriaMap = new Map<string, {
          nombre: string,
          total: number,
          count: number,
          detalles: Array<{concepto: string, monto: number, fecha: string}>
        }>();

        gastosData.items.forEach((gasto: Expense, index: number) => {
          const categoriaName = typeof gasto.categoria === 'object' ? gasto.categoria?.nombre : gasto.categoria;
          const categoriaNombre = categoriaName || 'Sin categoría';
          const monto = parseFloat(gasto.monto.toString());
          
          console.log(`📊 Processing expense ${index + 1}: "${gasto.concepto}" - Category: "${categoriaNombre}" - Amount: ${monto}`);
          
          if (!categoriaMap.has(categoriaNombre)) {
            categoriaMap.set(categoriaNombre, {
              nombre: categoriaNombre,
              total: 0,
              count: 0,
              detalles: []
            });
            console.log(`📊 Created new category: "${categoriaNombre}"`);
          }
          
          const categoria = categoriaMap.get(categoriaNombre)!;
          categoria.total += monto;
          categoria.count += 1;
          categoria.detalles.push({
            concepto: gasto.concepto,
            monto: monto,
            fecha: gasto.fecha
          });
          
          console.log(`📊 Updated category "${categoriaNombre}": total=${categoria.total}, count=${categoria.count}`);
        });

        // Get all available categories first
        let todasLasCategorias: CategoriaGasto[] = [];
        try {
          const categoriasDisponibles = await financialService.getExpenseCategories();
          
          // Transform all categories, adding calculated totals where they exist
          todasLasCategorias = categoriasDisponibles.map(cat => {
            const categoriaConGastos = categoriaMap.get(cat.nombre);
            return {
              id: cat.nombre.toLowerCase().replace(/ /g, '_'),
              nombre: cat.nombre,
              total: categoriaConGastos ? categoriaConGastos.total : 0,
              porcentajeComparacion: Math.round((Math.random() - 0.5) * 40),
              icono: getIconName(cat.nombre),
              color: getCategoryColor(cat.nombre),
              detalles: categoriaConGastos ? categoriaConGastos.detalles : []
            };
          });
          
          console.log('✅ All categories with calculated totals:', todasLasCategorias.map(cat => ({ nombre: cat.nombre, total: cat.total })));
        } catch (error) {
          console.error('Error loading all categories, using only categories with expenses');
          // Fallback to only categories with expenses
          todasLasCategorias = Array.from(categoriaMap.values()).map((cat, index) => ({
            id: cat.nombre.toLowerCase().replace(/ /g, '_'),
            nombre: cat.nombre,
            total: cat.total,
            porcentajeComparacion: Math.round((Math.random() - 0.5) * 40),
            icono: getIconName(cat.nombre),
            color: getCategoryColor(cat.nombre),
            detalles: cat.detalles
          }));
        }

        // Calculate total expenses
        const totalGastos = Array.from(categoriaMap.values()).reduce((sum, cat) => sum + cat.total, 0);
        
        // Asegurar IDs únicos para evitar keys duplicadas
        const categoriasConIDsUnicos = todasLasCategorias.map((cat, index) => ({
          ...cat,
          id: cat.id === 'sin-categoria' || !cat.id ? `sin-categoria-${index}` : cat.id
        }));
        setCategorias(categoriasConIDsUnicos);
        setTotalGastos(totalGastos);
        console.log('✅ Category totals calculated:', todasLasCategorias.length, 'categories, total:', totalGastos);
        console.log('🔍 DEBUG: All categories with totals:', todasLasCategorias.map(cat => ({ nombre: cat.nombre, total: cat.total })));
        
        // Set a mock summary for compatibility
        const resumenData = {
          totalMes: totalGastos,
          gastosPorCategoria: todasLasCategorias.map(cat => ({
            categoria: cat.nombre,  // Cambiar a 'categoria'
            total: cat.total,       // Cambiar a 'total'
            cantidad_gastos: cat.detalles.length
          }))
        };
        console.log('📊 Seteando resumenGastos:', resumenData);
        setResumenGastos(resumenData);
      } else {
        console.log('📊 No expenses found, but will load default categories with 0 totals');
        
        // Load default categories with 0 totals if no expenses exist
        try {
          const categoriasDisponibles = await financialService.getExpenseCategories();
          const categoriasConCeros = categoriasDisponibles.map(cat => ({
            id: cat.nombre.toLowerCase().replace(/ /g, '_'),
            nombre: cat.nombre,
            total: 0,
            porcentajeComparacion: 0,
            icono: getIconName(cat.nombre),
            color: getCategoryColor(cat.nombre),
            detalles: []
          }));
          
          setCategorias(categoriasConCeros);
          console.log('📊 Set default categories with 0 totals:', categoriasConCeros.length);
        } catch (error) {
          console.error('Error loading default categories:', error);
          setCategorias([]);
        }
        
        setTotalGastos(0);
        setResumenGastos({ totalMes: 0, gastosPorCategoria: [] });
      }
      
      // Try to load categories
      try {
        categoriasData = await financialService.getExpenseCategories();
        setCategoriasDisponibles(categoriasData.length > 0 ? categoriasData : getDefaultCategoriesWithIds());
        console.log('✅ Categorías cargadas exitosamente');
      } catch (error) {
        console.log('⚠️ Usando categorías por defecto');
        setCategoriasDisponibles(getDefaultCategoriesWithIds());
      }
      
    } catch (error: unknown) {
      console.error('❌ Error cargando datos de gastos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error cargando datos';
      setError(errorMessage);
      
      // Set default categories on error
      setCategoriasDisponibles(getDefaultCategoriesWithIds());
      
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  }, [isLoadingData]);
  
  // Helper functions
  const getDefaultCategories = () => [
    'Alimentación', 'Transporte', 'Entretenimiento', 'Salud', 
    'Educación', 'Hogar', 'Ropa', 'Otros'
  ];

  const getDefaultCategoriesWithIds = (): Category[] => [
    { id: 7, nombre: 'Alimentación', tipo: 'gasto', color: getCategoryColor('alimentación'), icono: 'restaurant' },
    { id: 8, nombre: 'Transporte', tipo: 'gasto', color: getCategoryColor('transporte'), icono: 'car' },
    { id: 9, nombre: 'Vivienda', tipo: 'gasto', color: getCategoryColor('vivienda'), icono: 'home' },
    { id: 10, nombre: 'Salud', tipo: 'gasto', color: getCategoryColor('salud'), icono: 'medical' },
    { id: 11, nombre: 'Entretenimiento', tipo: 'gasto', color: getCategoryColor('entretenimiento'), icono: 'game-controller' },
    { id: 12, nombre: 'Compras', tipo: 'gasto', color: getCategoryColor('compras'), icono: 'bag' },
    { id: 13, nombre: 'Educación', tipo: 'gasto', color: getCategoryColor('educación'), icono: 'school' },
    { id: 14, nombre: 'Servicios', tipo: 'gasto', color: getCategoryColor('servicios'), icono: 'wifi' },
    { id: 15, nombre: 'Otros Gastos', tipo: 'gasto', color: getCategoryColor('otros gastos'), icono: 'ellipsis-horizontal' }
  ];
    
  
  const getCategoryColor = (categoria: string): string => {
    const colorMap: { [key: string]: string } = {
      'alimentación': '#FF6B6B',
      'transporte': '#4ECDC4', 
      'vivienda': '#45B7D1',
      'salud': '#96CEB4',
      'entretenimiento': '#FFEAA7',
      'compras': '#DDA0DD',
      'educación': '#74B9FF',
      'servicios': '#A29BFE',
      'otros gastos': '#6C757D',
      'otros': '#6C757D'
    };
    return colorMap[(categoria || '').toLowerCase()] || '#6C757D';
  };

  const getIconName = (iconString: string): string => {
    const iconMap: { [key: string]: string } = {
      'restaurant': 'restaurant',
      'alimentación': 'restaurant',
      'car': 'car',
      'transporte': 'car',
      'home': 'home',
      'vivienda': 'home',
      'medical': 'medical',
      'salud': 'medical',
      'game-controller': 'game-controller',
      'entretenimiento': 'game-controller',
      'bag': 'bag',
      'compras': 'bag',
      'school': 'school',
      'educación': 'school',
      'wifi': 'wifi',
      'servicios': 'wifi',
      'ellipsis-horizontal': 'ellipsis-horizontal',
      'otros gastos': 'ellipsis-horizontal',
      'otros': 'ellipsis-horizontal'
    };
    return iconMap[(iconString || '').toLowerCase()] || 'ellipsis-horizontal';
  };

  const getDefaultCategoriesWithFullData = (gastosActuales = []) => {
    const baseCategories = [
      { id: 1, nombre: 'Alimentación', color: getCategoryColor('alimentación'), icono: 'restaurant', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 2, nombre: 'Transporte', color: getCategoryColor('transporte'), icono: 'car', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 3, nombre: 'Entretenimiento', color: getCategoryColor('entretenimiento'), icono: 'game-controller', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 4, nombre: 'Salud', color: getCategoryColor('salud'), icono: 'medical', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 5, nombre: 'Educación', color: getCategoryColor('educación'), icono: 'school', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 6, nombre: 'Hogar', color: getCategoryColor('hogar'), icono: 'home', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 7, nombre: 'Ropa', color: getCategoryColor('ropa'), icono: 'shirt', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 8, nombre: 'Compras', color: getCategoryColor('compras'), icono: 'bag', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 9, nombre: 'Servicios', color: getCategoryColor('servicios'), icono: 'construct', total: 0, porcentajeComparacion: 0, tipo: 'gasto' },
      { id: 10, nombre: 'Otros', color: getCategoryColor('otros'), icono: 'ellipsis-horizontal', total: 0, porcentajeComparacion: 0, tipo: 'gasto' }
    ];

    // Agregar detalles y totales basados en gastos actuales
    return baseCategories.map(categoria => {
      const gastosCategoria = gastosActuales.filter(gasto => {
        const categoriaName = typeof gasto.categoria === 'object' ? gasto.categoria?.nombre : gasto.categoria;
        return (categoriaName || '').toLowerCase() === (categoria.nombre || '').toLowerCase();
      });
      
      const total = gastosCategoria.reduce((sum, gasto) => sum + gasto.monto, 0);
      
      return {
        ...categoria,
        total,
        detalles: gastosCategoria.map(gasto => ({
          concepto: gasto.concepto,
          monto: gasto.monto,
          fecha: gasto.fecha
        }))
      };
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadGastos(false);
      await loadGastosPlanificados();
    } catch (error: unknown) {
      console.log('Error refreshing gastos:', error instanceof Error ? error.message : 'Unknown error');
    }
    setRefreshing(false);
  }, [loadGastos, loadGastosPlanificados]);

  const loadGastosPlanificados = useCallback(async () => {
    try {
      console.log('📅 Cargando gastos planificados...');
      const gastosPlanificadosData = await financialService.getPlannedExpenses();
      console.log('📊 Gastos planificados recibidos del backend:', gastosPlanificadosData);
      console.log('📊 Categorías disponibles:', categoriasDisponibles.length);

      // Transformar datos del backend al formato del frontend
      const gastosPlanificadosFormateados = gastosPlanificadosData.map((gasto: any) => {
        console.log('🔍 Procesando gasto planificado:', gasto);
        // Buscar el nombre de la categoría por su ID
        const categoria = categoriasDisponibles.find(cat => cat.id === gasto.categoria_id);
        const categoriaNombre = categoria ? categoria.nombre : 'Otros';
        console.log('🏷️ Categoría encontrada para ID', gasto.categoria_id, ':', categoriaNombre);

        const estadoFinal = gasto.estado_id === 1 ? 'pendiente' :
                           gasto.estado_id === 2 ? 'completado' : 'cancelado';
        console.log('📊 Estado ID:', gasto.estado_id, '-> Estado final:', estadoFinal);

        return {
          id: gasto.id,
          concepto: gasto.concepto,
          categoria: categoriaNombre,
          monto: gasto.monto_estimado,
          fecha: gasto.fecha_planificada,
          descripcion: gasto.descripcion || '',
          estado: estadoFinal
        };
      });

      console.log('📅 Gastos planificados formateados:', gastosPlanificadosFormateados);
      console.log('🔄 Seteando estado de gastos planificados...');
      setGastosPlanificados(gastosPlanificadosFormateados);
      console.log('✅ Estado de gastos planificados actualizado:', gastosPlanificadosFormateados.length);
    } catch (error) {
      console.error('Error loading planned expenses:', error);
    }
  }, []);

  const handleCategorySelection = (categoriaId: string | number) => {
    setSelectedCategory(
      selectedCategory === categoriaId ? null : categoriaId
    );
  };

  const validateGastoInput = () => {
    const errors: string[] = [];
    
    if (!nuevoGasto.concepto.trim()) {
      errors.push('• El concepto del gasto es obligatorio');
    } else if (nuevoGasto.concepto.trim().length < 2) {
      errors.push('• El concepto debe tener al menos 2 caracteres');
    }
    
    if (!nuevoGasto.categoria) {
      errors.push('• La categoría es obligatoria');
    }
    
    if (!nuevoGasto.monto.trim()) {
      errors.push('• El monto es obligatorio');
    } else {
      const monto = parseFloat(nuevoGasto.monto.replace(/,/g, ''));
      if (isNaN(monto) || monto <= 0) {
        errors.push('• El monto debe ser un número válido mayor a 0');
      }
    }
    
    if (nuevoGasto.tipo === 'planificado') {
      const fechaSeleccionada = new Date(nuevoGasto.fecha);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaSeleccionada <= hoy) {
        errors.push('• Para gastos planificados, la fecha debe ser futura');
      }
    }
    
    return errors;
  };

  const updateDailyStreak = async () => {
    try {
      const today = getLocalDateString();
      const lastActivityKey = 'last_financial_activity';
      const streakKey = 'daily_financial_streak';
      
      const lastActivity = await AsyncStorage.getItem(lastActivityKey);
      const currentStreak = await AsyncStorage.getItem(streakKey);
      
      let newStreak = 1;
      
      if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const todayDate = new Date(today);
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          return;
        } else if (diffDays === 1) {
          newStreak = currentStreak ? parseInt(currentStreak) + 1 : 1;
        }
      }
      
      await AsyncStorage.setItem(lastActivityKey, today);
      await AsyncStorage.setItem(streakKey, newStreak.toString());
      
      console.log(`🔥 Racha actualizada: ${newStreak} días`);
    } catch (error) {
      console.error('Error actualizando racha:', error);
    }
  };

  const handleAddGasto = async () => {
    const validationErrors = validateGastoInput();
    
    if (validationErrors.length > 0) {
      Alert.alert(
        t('common.validationErrors'), 
        validationErrors.join('\n'),
        [{ text: t('common.understood'), style: 'default' }]
      );
      return;
    }

    const monto = parseFloat(nuevoGasto.monto.replace(/,/g, ''));
    
    if (nuevoGasto.tipo === 'actual' && budgetLimit > 0) {
      const newTotal = totalGastos + monto;
      if (newTotal > budgetLimit) {
        const exceeded = newTotal - budgetLimit;
        Alert.alert(
          t('expenses.budgetWarning'),
          t('expenses.budgetExceededMessage', { 
            amount: formatCurrency(monto),
            exceeded: formatCurrency(exceeded),
            budgetLimit: formatCurrency(budgetLimit)
          }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { 
              text: t('expenses.addAnyway'), 
              style: 'destructive',
              onPress: () => proceedWithAddGasto(monto)
            }
          ]
        );
        return;
      }
    }
    
    proceedWithAddGasto(monto);
  };

  const proceedWithAddGasto = async (monto: number) => {
    if (nuevoGasto.tipo === 'planificado') {
      try {
        // Find categoria_id from the category name
        const categoriaSeleccionada = categoriasDisponibles.find(cat => cat.nombre === nuevoGasto.categoria);
        if (!categoriaSeleccionada) {
          throw new Error('Categoría no encontrada');
        }

        const gastoPlanificadoData = {
          concepto: nuevoGasto.concepto.trim(),
          categoria_id: categoriaSeleccionada.id,
          monto: monto,
          fecha: nuevoGasto.fecha,
          descripcion: nuevoGasto.descripcion?.trim() || ''
        };

        const newPlannedGasto = await financialService.createPlannedExpense(gastoPlanificadoData);

        // Update local state with the new planned expense
        const gastoPlaneado = {
          id: newPlannedGasto.id,
          concepto: newPlannedGasto.concepto,
          categoria: nuevoGasto.categoria,
          monto: newPlannedGasto.monto_estimado,
          fecha: newPlannedGasto.fecha_planificada,
          descripcion: newPlannedGasto.descripcion || '',
          estado: 'pendiente'
        };

        setGastosPlanificados(prev => [...prev, gastoPlaneado]);
        Alert.alert(t("common.success"), t("expenses.plannedExpenseCreated"));
      } catch (error) {
        console.error('Error creating planned expense:', error);
        Alert.alert(t("common.error"), t("expenses.errorCreatingPlannedExpense"));
        return;
      }
      
      setNuevoGasto({ 
        concepto: '', 
        categoria: 'Alimentación', 
        monto: '', 
        descripcion: '',
        lugar: '',
        tipo_pago: 'efectivo',
        fecha: getLocalDateString(),
        tipo: 'actual'
      });
      setShowAddModal(false);
      await updateDailyStreak();
      return;
    }

    try {
      console.log('💸 Creando nuevo gasto...', {
        concepto: nuevoGasto.concepto.trim(),
        categoria: nuevoGasto.categoria,
        monto: monto,
        descripcion: nuevoGasto.descripcion?.trim(),
        lugar: nuevoGasto.lugar?.trim(),
        tipo_pago: nuevoGasto.tipo_pago
      });
      
      // Find categoria_id from the category name
      const categoriaSeleccionada = categoriasDisponibles.find(cat => cat.nombre === nuevoGasto.categoria);
      if (!categoriaSeleccionada) {
        throw new Error('Categoría no encontrada');
      }

      // Map payment type to ID (backend expects tipo_pago_id)
      const tiposPagoMap = {
        'efectivo': 1,
        'tarjeta_debito': 2,  
        'tarjeta_credito': 3,
        'transferencia': 4,
        'cheque': 5
      };
      
      const gastoData = {
        concepto: nuevoGasto.concepto.trim(),
        categoria_id: categoriaSeleccionada.id,
        monto: monto,
        fecha: nuevoGasto.fecha, // Include the selected date
        tipo_pago_id: tiposPagoMap[nuevoGasto.tipo_pago as keyof typeof tiposPagoMap] || 1, // Default to efectivo
        descripcion: nuevoGasto.descripcion?.trim() || null,
        ubicacion: nuevoGasto.lugar?.trim() || null // Map 'lugar' to 'ubicacion' as expected by backend
      };
      
      const newGasto = await financialService.createExpense(gastoData);
      
      // Update local state
      setGastos(prev => [newGasto, ...prev]);
      
      // Update categories by reloading summary
      try {
        const updatedResumen = await financialService.getExpenseSummary('current_month');
        setResumenGastos(updatedResumen);
        setTotalGastos(updatedResumen.totalMes);
        
        // Transform API data to categories format
        const categoriasData: CategoriaGasto[] = updatedResumen.gastosPorCategoria.map((cat: any, index: number) => ({
          id: cat.categoria ? cat.categoria.toLowerCase().replace(/ /g, '_') : `sin-categoria-${index}`,
          nombre: cat.categoria || 'Sin categoría',
          total: cat.total,
          porcentajeComparacion: Math.round((Math.random() - 0.5) * 40),
          icono: getIconName(cat.categoria),
          color: getCategoryColor(cat.categoria),
          detalles: gastos.concat([newGasto])
            .filter((gasto: Expense) => {
              const categoriaName = typeof gasto.categoria === 'object' ? gasto.categoria?.nombre : gasto.categoria;
              return categoriaName === cat.categoria;
            })
            .map((gasto: Expense) => ({
              concepto: gasto.concepto,
              monto: gasto.monto,
              fecha: gasto.fecha
            }))
        }));
        
        // Asegurar IDs únicos para evitar keys duplicadas
        const categoriasDataConIDsUnicos = categoriasData.map((cat, index) => ({
          ...cat,
          id: cat.id === 'sin-categoria' || !cat.id ? `sin-categoria-${index}` : cat.id
        }));
        setCategorias(categoriasDataConIDsUnicos);
      } catch (resumenError) {
        console.log('⚠️ No se pudo actualizar el resumen:', resumenError);
      }
      
      Alert.alert(t("common.success"), t("expenses.created"));
      console.log('✅ Gasto creado exitosamente');
      
    } catch (error: unknown) {
      console.error('❌ Error creando gasto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error creando el gasto. Inténtalo de nuevo.';
      Alert.alert(
        t('common.error'),
        errorMessage,
        [{ text: t('common.understood'), style: 'default' }]
      );
      return; // Exit early on error
    }

    // Limpiar formulario y cerrar modal
    setNuevoGasto({ 
      concepto: '', 
      categoria: 'Alimentación', 
      monto: '', 
      descripcion: '',
      lugar: '',
      tipo_pago: 'efectivo',
      fecha: getLocalDateString(),
      tipo: 'actual'
    });
    setShowAddModal(false);
    
    // Actualizar racha de registro diario al agregar gasto
    await updateDailyStreak();
  };

  const handleDeleteGasto = async (gasto: Expense) => {
    confirmDeleteExpense(
      gasto.concepto,
      async () => {
        try {
          console.log(`💸 Eliminando gasto ${gasto.id}...`);

          await financialService.deleteExpense(gasto.id);

          // Actualizar datos
          await loadGastos(false);

          console.log('✅ Gasto eliminado exitosamente');
          Alert.alert('Eliminado', 'El gasto ha sido eliminado exitosamente');

        } catch (error: any) {
          console.error('❌ Error eliminando gasto:', error);
          Alert.alert(
            'Error',
            error.message || 'Error eliminando el gasto. Inténtalo de nuevo.',
            [{ text: 'Entendido', style: 'default' }]
          );
        }
      }
    );
  };

  const categoriesOptions = categoriasDisponibles ? categoriasDisponibles.map(cat => ({
    label: cat.nombre,
    value: cat.nombre
  })) : [];

  const formatDateForDisplay = (dateString: string) => {
    // Parse the date manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  const ejecutarGastoPlaneado = async (gastoId: number) => {
    const gasto = gastosPlanificados.find(g => g.id === gastoId);
    if (!gasto) return;

    // Verificar que no esté ya completado para evitar duplicación
    if (gasto.estado === 'completado') {
      Alert.alert(t("expenses.notice"), t("expenses.alreadyExecuted"));
      return;
    }

    try {
      // Ejecutar gasto planificado en el servidor
      const gastoReal = await financialService.executePlannedExpense(gastoId);

      // Actualizar categorías localmente
      setCategorias(prev => prev.map(cat => {
        const categoriaName = typeof gasto.categoria === 'object' ? gasto.categoria?.nombre : gasto.categoria;
        if (cat.nombre === categoriaName) {
          return {
            ...cat,
            total: cat.total + gasto.monto,
            detalles: [{
              concepto: gasto.concepto,
              monto: gasto.monto,
              fecha: getLocalDateString()
            }, ...cat.detalles]
          };
        }
        return cat;
      }));

      // Actualizar total de gastos
      setTotalGastos(prev => prev + gasto.monto);

      // Marcar como completado para evitar re-ejecución
      setGastosPlanificados(prev => prev.map(g =>
        g.id === gastoId ? { ...g, estado: 'completado' } : g
      ));

      // Actualizar racha al ejecutar gasto planificado
      await updateDailyStreak();

      Alert.alert(t("common.success"), t("expenses.expenseExecuted"));

      // Recargar datos
      loadGastos(false);
    } catch (error) {
      console.error('Error executing planned expense:', error);
      Alert.alert(t("common.error"), t("expenses.errorExecutingExpense"));
    }
  };

  const cancelarGastoPlaneado = (gastoId: number) => {
    Alert.alert(
      t("expenses.cancelPlannedExpense"),
      t("expenses.confirmCancel"),
      [
        { text: t("common.no"), style: "cancel" },
        {
          text: t("common.yesCancelIt"),
          onPress: async () => {
            try {
              const success = await financialService.cancelPlannedExpense(gastoId);
              if (success) {
                // Recargar gastos planificados para asegurar sincronización
                await loadGastosPlanificados();
                Alert.alert(t("common.success"), t("expenses.plannedExpenseCancelled"));
              } else {
                Alert.alert(t("common.error"), t("expenses.errorCancellingExpense"));
              }
            } catch (error) {
              console.error('Error cancelling planned expense:', error);
              Alert.alert(t("common.error"), t("expenses.errorCancellingExpense"));
            }
          }
        }
      ]
    );
  };

  const getEmptyChartData = () => [{
    name: 'Sin gastos',
    population: 100,
    color: colors.light.textTertiary,
    legendFontColor: isDarkMode ? colors.dark.text : colors.light.text,
    legendFontSize: 12,
  }];

  const getPieChartData = () => {
    console.log('📊 Generando datos para PieChart...');
    console.log('📊 resumenGastos:', resumenGastos);
    console.log('📊 categorias:', categorias.length, 'categorías disponibles');
    console.log('📊 budgetLimit:', budgetLimit);

    // Calcular total gastado
    let totalGastado = 0;
    if (resumenGastos && resumenGastos.gastosPorCategoria && resumenGastos.gastosPorCategoria.length > 0) {
      totalGastado = resumenGastos.gastosPorCategoria.reduce((sum, cat) => sum + cat.total, 0);
    } else if (categorias.length > 0) {
      totalGastado = categorias.reduce((sum, cat) => sum + cat.total, 0);
    }

    console.log('📊 Total gastado calculado:', totalGastado);

    // Si hay presupuesto, mostrar proporción vs presupuesto
    if (budgetLimit > 0) {
      const data = [];

      // Agregar categorías con gastos
      if (resumenGastos && resumenGastos.gastosPorCategoria && resumenGastos.gastosPorCategoria.length > 0) {
        console.log('📊 Usando datos de resumenGastos con presupuesto');
        resumenGastos.gastosPorCategoria
          .filter(cat => cat.total > 0)
          .forEach(cat => {
            const porcentaje = Math.round((cat.total / budgetLimit) * 100);
            data.push({
              name: `${cat.categoria} ${porcentaje}%`,
              population: cat.total,
              color: getCategoryColor(cat.categoria),
              legendFontColor: isDarkMode ? colors.dark.text : colors.light.text,
              legendFontSize: 12,
            });
          });
      } else if (categorias.length > 0) {
        console.log('📊 Usando datos de categorias con presupuesto');
        categorias
          .filter(cat => cat.total > 0)
          .forEach(cat => {
            const porcentaje = Math.round((cat.total / budgetLimit) * 100);
            data.push({
              name: `${cat.nombre} ${porcentaje}%`,
              population: cat.total,
              color: cat.color,
              legendFontColor: isDarkMode ? colors.dark.text : colors.light.text,
              legendFontSize: 12,
            });
          });
      }

      // Agregar presupuesto restante
      const remaining = budgetLimit - totalGastado;
      if (remaining > 0) {
        const porcentajeDisponible = Math.round((remaining / budgetLimit) * 100);
        data.push({
          name: `Disponible ${porcentajeDisponible}%`,
          population: remaining,
          color: '#E8E8E8', // Gris claro
          legendFontColor: isDarkMode ? colors.dark.text : colors.light.text,
          legendFontSize: 12,
        });
      }

      console.log('📊 Datos del gráfico con presupuesto:', data);
      return data.length > 0 ? data : getEmptyChartData();
    }

    // Fallback sin presupuesto (comportamiento original)
    if (resumenGastos && resumenGastos.gastosPorCategoria && resumenGastos.gastosPorCategoria.length > 0) {
      console.log('📊 Usando datos de resumenGastos sin presupuesto');
      const data = resumenGastos.gastosPorCategoria
        .filter(cat => cat.total > 0)
        .map(cat => {
          const porcentaje = Math.round((cat.total / totalGastado) * 100);
          return {
            name: `${cat.categoria} ${porcentaje}%`,
            population: cat.total,
            color: getCategoryColor(cat.categoria),
            legendFontColor: isDarkMode ? colors.dark.text : colors.light.text,
            legendFontSize: 12,
          };
        });

      console.log('📊 Datos del gráfico desde resumen:', data);
      return data.length > 0 ? data : getEmptyChartData();
    }

    // Si no hay datos, retornar gráfico vacío
    console.log('📊 No hay datos disponibles, retornando datos vacíos');
    return getEmptyChartData();
  };

  const generateReport = async () => {
    if (selectedReportCategories.length === 0) {
      Alert.alert(
        t('common.validationErrors'),
        t('expenses.selectAtLeastOneCategory'),
        [{ text: t('common.understood'), style: 'default' }]
      );
      return;
    }

    console.log('🔄 Iniciando generación de PDF...');

    try {
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];

      const reportTitle = `Reporte de Gastos - ${monthNames[selectedReportMonth]} ${selectedReportYear}`;

      // Obtener gastos específicos del período seleccionado
      console.log(`📅 Obteniendo gastos para ${monthNames[selectedReportMonth]} ${selectedReportYear}`);

      // Obtener todos los gastos del año para filtrar después
      const gastosDelAno = await financialService.getExpenses('current_year', 1, 1000);

      // Filtrar gastos por el mes y año específicos seleccionados
      const gastosDelPeriodo = gastosDelAno.items.filter((gasto: Expense) => {
        const fechaGasto = new Date(gasto.fecha);
        return fechaGasto.getFullYear() === selectedReportYear &&
               fechaGasto.getMonth() === selectedReportMonth;
      });

      console.log(`📊 Gastos encontrados para el período: ${gastosDelPeriodo.length}`);

      // Crear mapa de categorías con datos del período seleccionado
      const categoriaMap = new Map<string, CategoriaGasto>();

      gastosDelPeriodo.forEach((gasto: Expense) => {
        const categoriaNombre = typeof gasto.categoria === 'object' ? gasto.categoria?.nombre : gasto.categoria;
        const monto = typeof gasto.monto === 'string' ? parseFloat(gasto.monto) : gasto.monto;

        if (!categoriaMap.has(categoriaNombre)) {
          categoriaMap.set(categoriaNombre, {
            id: categoriaNombre.toLowerCase().replace(/ /g, '_'),
            nombre: categoriaNombre,
            total: 0,
            porcentajeComparacion: 0,
            icono: getIconName(categoriaNombre),
            color: getCategoryColor(categoriaNombre),
            detalles: []
          });
        }

        const categoria = categoriaMap.get(categoriaNombre)!;
        categoria.total += monto;
        categoria.detalles.push({
          concepto: gasto.concepto,
          monto: monto,
          fecha: gasto.fecha
        });
      });

      // Filtrar solo las categorías seleccionadas y que tengan gastos
      const selectedCats = selectedReportCategories
        .map(catName => categoriaMap.get(catName))
        .filter(cat => cat && cat.total > 0); // Solo incluir categorías con gastos

      const reportTotal = selectedCats.reduce((sum, cat) => sum + (cat?.total || 0), 0);

      if (selectedCats.length === 0) {
        Alert.alert(
          t('common.warning'),
          `No hay gastos registrados para las categorías seleccionadas en ${monthNames[selectedReportMonth]} ${selectedReportYear}`,
          [{ text: t('common.understood'), style: 'default' }]
        );
        return;
      }
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${reportTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #333;
              line-height: 1.6;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 15px;
              overflow: hidden;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
              position: relative;
            }
            .header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><pattern id="grain" width="100" height="20" patternUnits="userSpaceOnUse"><circle cx="25" cy="5" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="15" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="20" fill="url(%23grain)"/></svg>');
              opacity: 0.3;
            }
            .logo {
              font-size: 2.5em;
              font-weight: bold;
              margin-bottom: 10px;
              position: relative;
              z-index: 1;
            }
            .subtitle {
              font-size: 1.2em;
              opacity: 0.9;
              position: relative;
              z-index: 1;
            }
            .content {
              padding: 40px 30px;
            }
            .report-info {
              background: #f8f9fa;
              border-radius: 10px;
              padding: 25px;
              margin-bottom: 30px;
              border-left: 4px solid #667eea;
            }
            .report-title {
              font-size: 1.8em;
              font-weight: bold;
              color: #333;
              margin-bottom: 15px;
            }
            .report-summary {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .summary-item {
              background: white;
              border: 2px solid #e9ecef;
              border-radius: 10px;
              padding: 20px;
              text-align: center;
            }
            .summary-label {
              font-size: 0.9em;
              color: #666;
              margin-bottom: 5px;
            }
            .summary-value {
              font-size: 1.4em;
              font-weight: bold;
              color: #667eea;
            }
            .categories-section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 1.4em;
              font-weight: bold;
              color: #333;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e9ecef;
            }
            .category-item {
              background: white;
              border: 1px solid #e9ecef;
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 15px;
              transition: transform 0.2s;
            }
            .category-item:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            .category-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
            }
            .category-name {
              font-size: 1.2em;
              font-weight: bold;
              color: #333;
            }
            .category-amount {
              font-size: 1.3em;
              font-weight: bold;
              color: #667eea;
            }
            .details-list {
              margin-left: 20px;
            }
            .detail-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f1f3f4;
            }
            .detail-item:last-child {
              border-bottom: none;
            }
            .detail-concept {
              color: #666;
            }
            .detail-amount {
              font-weight: 600;
              color: #333;
            }
            .footer {
              background: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #666;
              border-top: 1px solid #e9ecef;
            }
            .generated-by {
              font-size: 0.9em;
              margin-bottom: 10px;
            }
            .aureum-brand {
              font-weight: bold;
              color: #667eea;
              font-size: 1.1em;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .container {
                box-shadow: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">💰 AUREUM</div>
              <div class="subtitle">Gestión Inteligente de Finanzas</div>
            </div>
            
            <div class="content">
              <div class="report-info">
                <div class="report-title">${reportTitle}</div>
                <p>Generado el ${new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
              
              <div class="report-summary">
                <div class="summary-item">
                  <div class="summary-label">Total de Gastos</div>
                  <div class="summary-value">${formatCurrency(reportTotal)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Categorías Incluidas</div>
                  <div class="summary-value">${selectedReportCategories.length}</div>
                </div>
              </div>
              
              <div class="categories-section">
                <div class="section-title">Desglose por Categorías</div>
                ${selectedCats.map(cat => `
                  <div class="category-item">
                    <div class="category-header">
                      <div class="category-name">${cat.nombre}</div>
                      <div class="category-amount">${formatCurrency(cat.total)}</div>
                    </div>
                    ${cat.detalles.length > 0 ? `
                      <div class="details-list">
                        ${cat.detalles.map(detail => `
                          <div class="detail-item">
                            <span class="detail-concept">${detail.concepto}</span>
                            <span class="detail-amount">${formatCurrency(detail.monto)}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      <p style="color: #999; font-style: italic;">No hay gastos registrados en esta categoría</p>
                    `}
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="footer">
              <div class="generated-by">🤖 Generado automáticamente por</div>
              <div class="aureum-brand">AUREUM - Tu asistente financiero personal</div>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log('📄 Generando PDF con expo-print...');
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      console.log('✅ PDF generado temporalmente en:', uri);

      // Verificar que el archivo temporal existe
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📋 Info del archivo temporal:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('El archivo PDF temporal no se generó correctamente');
      }

      // Generar nombre de archivo seguro
      const fileName = `AUREUM_${reportTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      console.log('📝 Nombre del archivo:', fileName);
      
      let newPath = uri;
      let finalPath = fileName;
      let saveSuccess = false;
      
      // Método más simple y efectivo: Copiar a cache y usar sharing para guardar
      console.log('💾 Guardando archivo temporalmente y permitiendo al usuario elegir ubicación...');
      const tempPath = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: tempPath
      });
      
      const tempFileInfo = await FileSystem.getInfoAsync(tempPath);
      console.log('📋 Archivo temporal - Info:', tempFileInfo);
      
      if (tempFileInfo.exists) {
        newPath = tempPath;
        finalPath = `Cache (temporal)/${fileName}`;
        saveSuccess = true;
        console.log('✅ Archivo preparado para compartir/guardar');
      }
      
      if (!saveSuccess) {
        throw new Error('No se pudo guardar el archivo en ninguna ubicación');
      }

      setShowReportModal(false);
      console.log('🎯 Proceso completado. Archivo final:', finalPath);
      
      // Mostrar diálogo de confirmación con opciones
      Alert.alert(
        t('common.success'),
        t('expenses.reportGenerated'),
        [
          { 
            text: t('expenses.saveFile'), 
            style: 'default',
            onPress: async () => {
              try {
                console.log('💾 Guardando archivo usando sharing nativo...');
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(newPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Guardar ${fileName}`,
                    UTI: 'com.adobe.pdf'
                  });
                  console.log('✅ Diálogo de guardado mostrado');
                } else {
                  console.log('❌ Sharing no disponible');
                  Alert.alert('Error', 'La función de guardado no está disponible en este dispositivo');
                }
              } catch (error) {
                console.error('❌ Error guardando:', error);
                Alert.alert('Error', `No se pudo abrir el diálogo de guardado: ${error.message}`);
              }
            }
          },
          { 
            text: t('expenses.shareFile'), 
            onPress: async () => {
              try {
                console.log('📤 Compartiendo archivo...');
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(newPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Compartir ${fileName}`,
                    UTI: 'com.adobe.pdf'
                  });
                  console.log('✅ Diálogo de compartir mostrado');
                } else {
                  Alert.alert('Error', 'La función de compartir no está disponible');
                }
              } catch (error) {
                console.error('❌ Error compartiendo:', error);
                Alert.alert('Error', `No se pudo compartir: ${error.message}`);
              }
            }
          },
          { 
            text: t('common.done'),
            style: 'cancel'
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      Alert.alert(
        t('common.error'), 
        `${t('expenses.reportError')}\n\nDetalle técnico: ${error.message}`,
        [{ text: t('common.understood'), style: 'default' }]
      );
    }
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

  // Inicializar categorías disponibles al cargar el componente
  React.useEffect(() => {
    console.log('🏷️ Inicializando categorías disponibles...');
    const defaultCategories = getDefaultCategoriesWithFullData();
    setCategoriasDisponibles(defaultCategories);
    setCategorias(defaultCategories);
    console.log('✅ Categorías inicializadas:', defaultCategories.length);
  }, []);

  // Cargar gastos planificados cuando las categorías estén disponibles
  React.useEffect(() => {
    if (categoriasDisponibles.length > 0) {
      loadGastosPlanificados();
    }
  }, [categoriasDisponibles, loadGastosPlanificados]);

  // Actualizar categorías cuando cambien los gastos
  React.useEffect(() => {
    if (gastos.length > 0) {
      console.log('🔄 Actualizando categorías con gastos:', gastos.length);
      const updatedCategories = getDefaultCategoriesWithFullData(gastos);
      setCategorias(updatedCategories);
      console.log('✅ Categorías actualizadas con detalles');
    }
  }, [gastos]);

  // Monitorear cambios en gastos planificados
  React.useEffect(() => {
    console.log('📋 Estado de gastos planificados cambió:', gastosPlanificados.length);
    console.log('📋 Gastos planificados actuales:', gastosPlanificados);
  }, [gastosPlanificados]);

  if (loading && !resumenGastos) {
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
  
  // Error state
  if (error && !resumenGastos && !gastos.length) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <View>
            <Text style={[styles.headerTitle, isDarkMode && styles.darkText, { fontSize: isTablet ? 24 : 20 }]}>
              {t("expenses.title")}
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
          <Ionicons name="card-outline" size={64} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
          <Text style={[{ fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }, isDarkMode && styles.darkText]}>
            Error de Conexión
          </Text>
          <Text style={[{ fontSize: 14, marginTop: 8, textAlign: 'center' }, isDarkMode && styles.darkTextSecondary]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 }}
            onPress={() => loadGastos()}
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
            {t("expenses.title")}
          </Text>
          <Text style={[styles.headerDate, isDarkMode && styles.darkTextSecondary]}>
            {formatDate(new Date())}
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
          <TouchableOpacity
            onPress={() => setShowBudgetModal(true)}
            style={[styles.headerButton, styles.budgetButton]}
          >
            <Ionicons name="wallet-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowDateModal(true)}
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

        {/* Gráfico Presupuesto */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2) }
        ]}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
              {budgetLimit > 0 ? t('expenses.budgetStatus') : t('expenses.categoryDistribution')}
            </Text>
            {budgetLimit > 0 && (
              <View style={styles.budgetInfo}>
                <Text style={[styles.budgetUsed, isDarkMode && styles.darkText]}>
                  {formatCurrency(totalGastos)} / {formatCurrency(budgetLimit)}
                </Text>
                <Text style={[
                  styles.budgetPercentage, 
                  { color: totalGastos > budgetLimit ? colors.error : colors.success }
                ]}>
                  {budgetLimit > 0 ? Math.round((totalGastos / budgetLimit) * 100) : 0}%
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.chartContainer}>
            {(() => {
              try {
                const chartData = getPieChartData();
                console.log('📊 Renderizando PieChart con datos:', chartData);
                return (
                  <PieChart
                    data={chartData}
                    width={Dimensions.get('window').width - 80}
                    height={200}
                    chartConfig={{
                      backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface,
                      backgroundGradientFrom: isDarkMode ? colors.dark.surface : colors.light.surface,
                      backgroundGradientTo: isDarkMode ? colors.dark.surface : colors.light.surface,
                      color: (opacity = 1) => isDarkMode ? colors.dark.text : colors.light.text,
                      labelColor: (opacity = 1) => isDarkMode ? colors.dark.text : colors.light.text,
                      style: { borderRadius: 16 }
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[10, 10]}
                    absolute={false}
                    hasLegend={false}
                  />
                );
              } catch (error) {
                console.error('❌ Error renderizando PieChart:', error);
                return (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: isDarkMode ? colors.dark.text : colors.light.text }}>
                      Error cargando gráfico
                    </Text>
                  </View>
                );
              }
            })()}

            {/* Leyenda personalizada del PieChart */}
            <View style={styles.pieChartLegend}>
              {(() => {
                const chartData = getPieChartData();
                return chartData.map((item, index) => (
                  <View key={index} style={styles.pieChartLegendItem}>
                    <View style={[styles.pieChartLegendColor, { backgroundColor: item.color }]} />
                    <Text style={[styles.pieChartLegendText, isDarkMode && styles.darkText]}>
                      {item.name}
                    </Text>
                  </View>
                ));
              })()}
            </View>
            
            {/* Categorías con funcionalidad de clic */}
            <View style={styles.categoryLegend}>
              <Text style={[styles.chartTitle, isDarkMode && styles.darkText, { marginBottom: 16 }]}>
                {t("expenses.expensesByCategory")}
              </Text>
              {categorias && categorias.length > 0 ? (
                categorias.map((categoria) => {
                  const isSelected = selectedCategory === categoria.id.toString() || selectedCategory === categoria.id;
                  return (
                    <React.Fragment key={`categoria-${categoria.id}`}>
                      <TouchableOpacity 
                        style={[styles.legendItem, isDarkMode && styles.darkLegendItem]}
                        onPress={() => handleCategorySelection(categoria.id)}
                      >
                        <View style={[styles.legendColor, { backgroundColor: categoria.color || getCategoryColor(categoria.nombre) }]} />
                        <View style={styles.legendContent}>
                          <Text style={[styles.legendName, isDarkMode && styles.darkText]}>
                            {categoria.nombre}
                          </Text>
                          <Text style={[styles.legendAmount, isDarkMode && styles.darkText]}>
                            {formatCurrency(categoria.total || 0)}
                          </Text>
                        </View>
                        <View style={styles.legendArrow}>
                          <Ionicons 
                            name={isSelected ? "chevron-up" : "chevron-down"} 
                            size={16} 
                            color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} 
                          />
                        </View>
                      </TouchableOpacity>
                      
                      {/* Expandable expenses list for selected category */}
                      {isSelected && (
                        <View style={[styles.expandedExpenses, isDarkMode && styles.darkExpandedExpenses]}>
                          <Text style={[styles.expandedTitle, isDarkMode && styles.darkText]}>
                            Gastos en {categoria.nombre}
                          </Text>
                          {(() => {
                            const categoryExpenses = gastos.filter(gasto => {
                              const categoriaName = typeof gasto.categoria === 'object' ? gasto.categoria?.nombre : gasto.categoria;
                              return (categoriaName || '').toLowerCase() === (categoria.nombre || '').toLowerCase();
                            });
                            
                            if (categoryExpenses.length === 0) {
                              return (
                                <Text style={[styles.noExpensesText, isDarkMode && styles.darkTextSecondary]}>
                                  No hay gastos registrados en esta categoría
                                </Text>
                              );
                            }
                            
                            return categoryExpenses.map((gasto, index) => (
                              <View key={`${gasto.id || 'no-id'}-${gasto.concepto}-${index}`} style={[styles.expenseItem, isDarkMode && styles.darkExpenseItem]}>
                                <View style={styles.expenseLeft}>
                                  <Text style={[styles.expenseConcepto, isDarkMode && styles.darkText]}>
                                    {gasto.concepto}
                                  </Text>
                                  <Text style={[styles.expenseFecha, isDarkMode && styles.darkTextSecondary]}>
                                    {formatDate(new Date(gasto.fecha))}
                                  </Text>
                                </View>
                                <View style={styles.expenseActions}>
                                  <Text style={[styles.expenseMonto, isDarkMode && styles.darkText]}>
                                    {formatCurrency(gasto.monto)}
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteGasto(gasto)}
                                  >
                                    <Ionicons name="trash-outline" size={16} color="#fff" />
                                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ));
                          })()}
                        </View>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <View style={styles.emptyLegend}>
                  <Text style={[styles.emptyLegendText, isDarkMode && styles.darkTextSecondary]}>
                    No hay categorías disponibles
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Gastos Planificados */}
        {(() => {
          const gastosPendientes = gastosPlanificados.filter(g => g.estado === 'pendiente');
          console.log('🎯 Renderizando gastos planificados - Total:', gastosPlanificados.length, 'Pendientes:', gastosPendientes.length);
          return gastosPendientes.length > 0;
        })() && (
          <View style={[
            styles.card,
            isDarkMode && styles.darkCard,
            { marginHorizontal: wp(4), marginTop: hp(2) }
          ]}>
            <View style={styles.plannedExpensesHeader}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                📅 Gastos Planificados ({gastosPlanificados.filter(g => g.estado === 'pendiente').length})
              </Text>
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    viewMode === 'calendar' && styles.toggleButtonActive,
                    isDarkMode && styles.darkToggleButton,
                    viewMode === 'calendar' && isDarkMode && styles.darkToggleButtonActive,
                  ]}
                  onPress={() => setViewMode('calendar')}
                >
                  <Ionicons 
                    name="calendar" 
                    size={16} 
                    color={viewMode === 'calendar' ? '#fff' : (isDarkMode ? colors.dark.text : colors.light.text)} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    viewMode === 'list' && styles.toggleButtonActive,
                    isDarkMode && styles.darkToggleButton,
                    viewMode === 'list' && isDarkMode && styles.darkToggleButtonActive,
                  ]}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons 
                    name="list" 
                    size={16} 
                    color={viewMode === 'list' ? '#fff' : (isDarkMode ? colors.dark.text : colors.light.text)} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {viewMode === 'calendar' ? (
              <CalendarioGastos
                gastosPlanificados={gastosPlanificados}
                categorias={categorias}
                onEjecutarGasto={ejecutarGastoPlaneado}
                onCancelarGasto={cancelarGastoPlaneado}
                isDarkMode={isDarkMode}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {/* código actual de tarjetas horizontales */}
              </ScrollView>
            )}
          </View>
        )}

        {/* Botón Generar Informe */}
        <View style={[
          styles.card,
          isDarkMode && styles.darkCard,
          { marginHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(4) }
        ]}>
          <TouchableOpacity
            style={[styles.generateReportButton, isDarkMode && styles.darkGenerateReportButton]}
            onPress={() => setShowReportModal(true)}
          >
            <View style={styles.generateReportContent}>
              <Ionicons 
                name="document-text-outline" 
                size={24} 
                color="#fff" 
                style={styles.generateReportIcon}
              />
              <Text style={styles.generateReportText}>
                {t("expenses.generateReport")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Selector de Fecha */}
      <Modal
        visible={showDateModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.dateModalOverlay}>
          <View style={[styles.dateModalContent, isDarkMode && styles.darkDateModalContent]}>
            <Text style={[styles.dateModalTitle, isDarkMode && styles.darkText]}>
              {t("expenses.whenWillThisExpense")}
            </Text>
            
            <View style={styles.dateOptions}>
              <TouchableOpacity
                style={[styles.dateOptionButton, styles.todayButton]}
                onPress={() => {
                  setNuevoGasto(prev => ({ 
                    ...prev, 
                    tipo: 'actual',
                    fecha: getLocalDateString()
                  }));
                  setShowDateModal(false);
                  setShowAddModal(true);
                }}
              >
                <Ionicons name="today" size={24} color="#fff" />
                <Text style={styles.dateOptionText}>{t("expenses.todayOption")}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dateOptionButton, styles.futureButton]}
                onPress={() => {
                  setNuevoGasto(prev => ({ 
                    ...prev, 
                    tipo: 'planificado',
                    fecha: getLocalDateString(new Date(Date.now() + 24*60*60*1000))
                  }));
                  setShowDateModal(false);
                  setShowCustomCalendar(true);
                }}
              >
                <Ionicons name="calendar" size={24} color="#fff" />
                <Text style={styles.dateOptionText}>{t("expenses.anotherDayOption")}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.cancelDateModal}
              onPress={() => setShowDateModal(false)}
            >
              <Text style={[styles.cancelDateText, isDarkMode && styles.darkTextSecondary]}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calendario */}
      <Modal
        visible={showCustomCalendar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomCalendar(false)}
      >
        <SafeAreaView style={[styles.calendarModalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.calendarHeader, isDarkMode && styles.darkHeader]}>
            <TouchableOpacity 
              style={[styles.modernCancelButton, isDarkMode && styles.darkModernCancelButton]}
              onPress={() => setShowCustomCalendar(false)}
            >
              <Text style={[styles.modernCancelButtonText, isDarkMode && styles.darkModernCancelButtonText]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.calendarTitle, isDarkMode && styles.darkText]}>
              📅 {t("expenses.selectDate")}
            </Text>
            <View style={{ width: 60 }} />
          </View>
          
          <View style={styles.calendarContainer}>
            <Calendar
              style={[styles.calendar, isDarkMode && styles.darkCalendar]}
              theme={{
                backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface,
                calendarBackground: isDarkMode ? colors.dark.surface : colors.light.surface,
                textSectionTitleColor: isDarkMode ? colors.dark.text : colors.light.text,
                textSectionTitleDisabledColor: isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.primary,
                dayTextColor: isDarkMode ? colors.dark.text : colors.light.text,
                textDisabledColor: isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary,
                dotColor: colors.primary,
                selectedDotColor: '#ffffff',
                arrowColor: colors.primary,
                disabledArrowColor: isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary,
                monthTextColor: isDarkMode ? colors.dark.text : colors.light.text,
                indicatorColor: colors.primary,
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
                'stylesheet.calendar.header': {
                  week: {
                    marginTop: 5,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                  },
                },
              }}
              minDate={getLocalDateString()}
              onDayPress={(day) => {
                // Asegurar que la fecha se guarde correctamente sin problemas de zona horaria
                const formattedDate = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
                
                setNuevoGasto(prev => ({
                  ...prev,
                  fecha: formattedDate
                }));
                setShowCustomCalendar(false);
                setShowAddModal(true);
              }}
              markedDates={{
                [nuevoGasto.fecha]: {
                  selected: true,
                  selectedColor: colors.primary,
                  selectedTextColor: '#ffffff'
                }
              }}
              hideExtraDays={true}
              firstDay={1} // Lunes como primer día
              showWeekNumbers={false}
              disableMonthChange={false}
              hideArrows={false}
              hideDayNames={false}
              showScrollIndicator={true}
            />
          </View>
          
          <View style={[styles.calendarFooter, isDarkMode && styles.darkCalendarFooter]}>
            <View style={[styles.calendarInfo, isDarkMode && styles.darkCalendarInfo]}>
              <Ionicons name="information-circle-outline" size={16} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.calendarInfoText, isDarkMode && styles.darkTextSecondary]}>
                {t("expenses.selectDayMessage")}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Configurar Presupuesto */}
      <Modal
        visible={showBudgetModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.modalHeader, isDarkMode && styles.darkHeader]}>
            <TouchableOpacity 
              style={[styles.modernCancelButton, isDarkMode && styles.darkModernCancelButton]}
              onPress={() => setShowBudgetModal(false)}
            >
              <Text style={[styles.modernCancelButtonText, isDarkMode && styles.darkModernCancelButtonText]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              {t("expenses.setBudgetLimit")}
            </Text>
            <TouchableOpacity 
              style={styles.modernSaveButton}
              onPress={() => {
                const newLimit = parseFloat(budgetInput);
                if (newLimit > 0) {
                  saveBudgetLimit(newLimit);
                }
              }}
            >
              <Text style={styles.modernSaveButtonText}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("expenses.monthlyBudgetLimit")}
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder="0.00"
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                onSubmitEditing={() => {
                  const newLimit = parseFloat(budgetInput);
                  if (newLimit > 0) {
                    saveBudgetLimit(newLimit);
                  }
                }}
              />
            </View>
            
            <View style={styles.budgetTips}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.tipTitle, isDarkMode && styles.darkText]}>
                  {t("expenses.budgetTips")}
                </Text>
                <Text style={[styles.tipText, isDarkMode && styles.darkTextSecondary]}>
                  {t("expenses.budgetTipsDescription")}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Crear Informe */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReportModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.modalHeader, isDarkMode && styles.darkHeader]}>
            <TouchableOpacity 
              style={[styles.modernCancelButton, isDarkMode && styles.darkModernCancelButton]}
              onPress={() => setShowReportModal(false)}
            >
              <Text style={[styles.modernCancelButtonText, isDarkMode && styles.darkModernCancelButtonText]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              📊 {t("expenses.createReport")}
            </Text>
            <TouchableOpacity 
              style={styles.modernSaveButton}
              onPress={generateReport}
            >
              <Text style={styles.modernSaveButtonText}>{t("common.generate")}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Selector de Mes y Año */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("expenses.selectMonth")}
              </Text>
              <View style={styles.dateSelectors}>
                <View style={styles.monthSelector}>
                  <Text style={[styles.selectorLabel, isDarkMode && styles.darkText]}>
                    {t("expenses.month")}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[...Array(12)].map((_, index) => {
                      const monthNames = [
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                      ];
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.monthButton,
                            selectedReportMonth === index && styles.monthButtonSelected,
                            isDarkMode && styles.darkMonthButton,
                            selectedReportMonth === index && isDarkMode && styles.darkMonthButtonSelected,
                          ]}
                          onPress={() => setSelectedReportMonth(index)}
                        >
                          <Text style={[
                            styles.monthButtonText,
                            selectedReportMonth === index && styles.monthButtonTextSelected,
                            isDarkMode && styles.darkText,
                            selectedReportMonth === index && styles.monthButtonTextSelected,
                          ]}>
                            {monthNames[index].substring(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
                
                <View style={styles.yearSelector}>
                  <Text style={[styles.selectorLabel, isDarkMode && styles.darkText]}>
                    {t("expenses.year")}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[...Array(3)].map((_, index) => {
                      const year = new Date().getFullYear() - index;
                      return (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.yearButton,
                            selectedReportYear === year && styles.yearButtonSelected,
                            isDarkMode && styles.darkYearButton,
                            selectedReportYear === year && isDarkMode && styles.darkYearButtonSelected,
                          ]}
                          onPress={() => setSelectedReportYear(year)}
                        >
                          <Text style={[
                            styles.yearButtonText,
                            selectedReportYear === year && styles.yearButtonTextSelected,
                            isDarkMode && styles.darkText,
                            selectedReportYear === year && styles.yearButtonTextSelected,
                          ]}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Selector de Categorías */}
            <View style={styles.inputContainer}>
              <View style={styles.categorySelectorHeader}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  {t("expenses.selectCategories")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedReportCategories.length === (categorias?.length || 0)) {
                      setSelectedReportCategories([]);
                    } else {
                      setSelectedReportCategories(categorias ? categorias.map(c => c.nombre) : []);
                    }
                  }}
                  style={styles.selectAllButton}
                >
                  <Text style={[styles.selectAllText, { color: colors.primary }]}>
                    {selectedReportCategories.length === categorias.length 
                      ? t("common.deselectAll")
                      : t("common.selectAll")
                    }
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.categoriesGrid}>
                {categorias && categorias.length > 0 ? categorias.map((categoria) => {
                  const isSelected = selectedReportCategories.includes(categoria.nombre);
                  return (
                    <TouchableOpacity
                      key={categoria.id}
                      style={[
                        styles.categoryCheckbox,
                        isSelected && styles.categoryCheckboxSelected,
                        isDarkMode && styles.darkCategoryCheckbox,
                        isSelected && isDarkMode && styles.darkCategoryCheckboxSelected,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedReportCategories(prev => 
                            prev.filter(c => c !== categoria.nombre)
                          );
                        } else {
                          setSelectedReportCategories(prev => [...prev, categoria.nombre]);
                        }
                      }}
                    >
                      <View style={[styles.categoryCheckboxIcon, { backgroundColor: categoria.color + '20' }]}>
                        <Ionicons 
                          name={getIconName(categoria.icono)} 
                          size={16} 
                          color={categoria.color} 
                        />
                      </View>
                      <Text style={[
                        styles.categoryCheckboxText,
                        isSelected && styles.categoryCheckboxTextSelected,
                        isDarkMode && styles.darkText,
                        isSelected && styles.categoryCheckboxTextSelected,
                      ]}>
                        {categoria.nombre}
                      </Text>
                      <View style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color={colors.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }) : null}
              </View>
            </View>

            {/* Información del reporte */}
            <View style={[styles.reportInfo, isDarkMode && styles.darkReportInfo]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.tipTitle, isDarkMode && styles.darkText]}>
                  {t("expenses.reportInfo")}
                </Text>
                <Text style={[styles.tipText, isDarkMode && styles.darkTextSecondary]}>
                  {t("expenses.reportInfoDescription")}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Agregar Gasto */}
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
              {nuevoGasto.tipo === 'planificado' 
                ? `${t("expenses.expenseFor")} ${formatDateForDisplay(nuevoGasto.fecha)}` 
                : t("expenses.newExpense")
              }
            </Text>
            <TouchableOpacity 
              style={styles.modernSaveButton}
              onPress={handleAddGasto}
            >
              <Text style={styles.modernSaveButtonText}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("expenses.concept")} *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={t("expenses.conceptPlaceholder")}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoGasto.concepto}
                onChangeText={(text) => setNuevoGasto(prev => ({ ...prev, concepto: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("expenses.category")} *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
                {categoriasDisponibles && categoriasDisponibles.length > 0 ? categoriasDisponibles.map((categoria, index) => {
                  const categoriaIcon = getIconName(categoria.nombre);
                  const categoriaColor = getCategoryColor(categoria.nombre);
                  
                  return (
                    <TouchableOpacity
                      key={`${categoria.id}-${index}`}
                      style={[
                        styles.categoryOption,
                        nuevoGasto.categoria === categoria.nombre && styles.categoryOptionSelected,
                        isDarkMode && styles.darkCategoryOption,
                        nuevoGasto.categoria === categoria.nombre && isDarkMode && styles.darkCategoryOptionSelected,
                      ]}
                      onPress={() => setNuevoGasto(prev => ({ ...prev, categoria: categoria.nombre }))}
                    >
                      <Ionicons 
                        name={getIconName(categoriaIcon)} 
                        size={20} 
                        color={nuevoGasto.categoria === categoria.nombre ? '#fff' : categoriaColor} 
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          { color: nuevoGasto.categoria === categoria.nombre ? '#fff' : (isDarkMode ? colors.dark.text : colors.light.text) }
                        ]}
                      >
                        {categoria.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                }) : null}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                Monto *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder="0.00"
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoGasto.monto}
                onChangeText={(text) => setNuevoGasto(prev => ({ ...prev, monto: text }))}
                keyboardType="numeric"
              />
            </View>

            {nuevoGasto.tipo === 'planificado' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                  {t("expenses.selectedDate")}
                </Text>
                <TouchableOpacity 
                  style={[styles.input, isDarkMode && styles.darkInput, styles.dateInput]}
                  onPress={() => setShowCustomCalendar(true)}
                >
                  <Text style={[styles.dateText, isDarkMode && styles.darkText]}>
                    {formatDateForDisplay(nuevoGasto.fecha)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                Descripción (opcional)
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
                placeholder="Agregar una descripción..."
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevoGasto.descripcion}
                onChangeText={(text) => setNuevoGasto(prev => ({ ...prev, descripcion: text }))}
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

const additionalStyles = StyleSheet.create({
  plannedExpensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 1,
  },
  darkToggleButton: {
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  darkToggleButtonActive: {
    backgroundColor: colors.primary,
  },

});


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
  // Estilos del modal
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
  darkHeader: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
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
  categoriesContainer: {
    marginTop: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  darkCategoryOption: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  darkCategoryOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  darkText: {
    color: colors.dark.text,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 16,
  },
  // Estilos para fecha
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 16,
    color: colors.light.text,
  },
  // Estilos para gastos planificados
  plannedExpenseCard: {
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 180,
    maxWidth: 200,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  darkPlannedExpenseCard: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  plannedExpenseToday: {
    borderLeftColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  plannedExpensePast: {
    borderLeftColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  plannedExpenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  plannedExpenseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plannedExpenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  plannedExpenseConcept: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  plannedExpenseDate: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 12,
  },
  plannedExpenseActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  plannedExpenseButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executeButton: {
    backgroundColor: colors.success,
    marginRight: 6,
  },
  cancelButton: {
    backgroundColor: colors.error,
    marginLeft: 6,
  },
  // Estilos para modal de fecha
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateModalContent: {
    backgroundColor: colors.light.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  darkDateModalContent: {
    backgroundColor: colors.dark.surface,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  dateOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateOptionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  todayButton: {
    backgroundColor: colors.success,
  },
  futureButton: {
    backgroundColor: colors.primary,
  },
  dateOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  cancelDateModal: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelDateText: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  // Estilos para calendario personalizado
  calendarModalContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  calendarContainer: {
    flex: 1,
    paddingTop: 20,
  },
  calendar: {
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  darkCalendar: {
    backgroundColor: colors.dark.surface,
  },
  calendarFooter: {
    padding: 20,
    backgroundColor: colors.light.surface,
  },
  darkCalendarFooter: {
    backgroundColor: colors.dark.surface,
  },
  calendarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
  },
  darkCalendarInfo: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  calendarInfoText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
  // Estilos para detalles expandibles
  expandIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  detallesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
  },
  detalleLeft: {
    flex: 1,
  },
  detalleFecha: {
    fontSize: 12,
    color: colors.light.textTertiary,
    marginTop: 2,
  },
  noDetalles: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  // Estilos para botones del header
  budgetButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginRight: 8,
  },
  reportButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    marginRight: 8,
  },
  // Estilos para modal de reportes
  dateSelectors: {
    marginTop: 8,
  },
  monthSelector: {
    marginBottom: 20,
  },
  yearSelector: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 8,
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: colors.light.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.light.border,
    minWidth: 50,
    alignItems: 'center',
  },
  darkMonthButton: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
  monthButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  darkMonthButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  monthButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.light.text,
  },
  monthButtonTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  yearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: colors.light.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
  },
  darkYearButton: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
  yearButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  darkYearButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
  },
  yearButtonTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  categorySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 8,
  },
  darkCategoryCheckbox: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
  categoryCheckboxSelected: {
    backgroundColor: colors.primaryLight + '40',
    borderColor: colors.primary,
  },
  darkCategoryCheckboxSelected: {
    backgroundColor: colors.primaryLight + '40',
    borderColor: colors.primary,
  },
  categoryCheckboxIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryCheckboxText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
    flex: 1,
  },
  categoryCheckboxTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  darkReportInfo: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    lineHeight: 18,
  },
  // Estilos para botón generar informe
  generateReportButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  darkGenerateReportButton: {
    backgroundColor: colors.success,
    shadowColor: colors.dark.shadow,
  },
  generateReportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateReportIcon: {
    marginRight: 12,
  },
  generateReportText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // PieChart Legend Styles
  pieChartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  pieChartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  pieChartLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  pieChartLegendText: {
    fontSize: 12,
    color: colors.light.text,
  },
  // Category Legend Styles
  categoryLegend: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  darkLegendItem: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
    flex: 1,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 12,
  },
  legendPercentage: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.light.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  legendArrow: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLegend: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyLegendText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },
  // Estilos para categorías principales
  categoriaItem: {
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  categoriaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 4,
  },
  categoriaTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
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
  // Estilos para progreso y detalles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.light.border,
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.light.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 8,
  },
  detallesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  detallesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 12,
  },
  detalleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border + '50',
  },
  detalleLeft: {
    flex: 1,
  },
  detalleConcepto: {
    fontSize: 14,
    color: colors.light.text,
    marginBottom: 2,
  },
  detalleFecha: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  detalleMonto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  noDetalles: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  // Expandable expenses styles
  expandedExpenses: {
    marginTop: 12,
    marginBottom: 16,
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border + '40',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  darkExpandedExpenses: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border + '40',
  },
  expandedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border + '30',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.light.border + '20',
    backgroundColor: 'transparent',
  },
  darkExpenseItem: {
    borderBottomColor: colors.dark.border + '20',
  },
  expenseLeft: {
    flex: 1,
    marginRight: 16,
  },
  expenseConcepto: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 4,
  },
  expenseFecha: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },
  expenseMonto: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
  },
  noExpensesText: {
    fontSize: 13,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 20,
  },
  expenseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ...additionalStyles,
});

export default Gastos;