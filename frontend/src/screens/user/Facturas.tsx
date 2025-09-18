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
  Image,
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
import financialService from '../../services/financialService';
import { confirmDeleteBill } from '../../utils/deleteConfirmation';

// Interfaces para tipos y estados de factura
interface TipoFactura {
  id: number;
  nombre: string;
  icono?: string;
  codigo?: string;
}

interface EstadoFactura {
  id: number;
  nombre: string;
  color?: string;
  icono?: string;
  orden?: number;
}

interface Factura {
  id: number;
  nombre: string;
  // tipo: string; // Elimina esta línea
  tipoFacturaId: number; // Campo con el ID
  tipoFactura: TipoFactura; // Objeto anidado con los detalles
  monto: number;
  fechaVencimiento: string;
  estado: 'Pendiente' | 'Pagada' | 'Vencida';
  logoUrl?: string;
  ultimoPago?: string;
  descripcion?: string;
  esRecurrente?: boolean;
  frecuenciaDias?: number;
}

interface FacturasProps {
  onAuthChange: (isAuth: boolean) => void;
}

const Facturas: React.FC<FacturasProps> = ({ onAuthChange }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [tiposFactura, setTiposFactura] = useState<TipoFactura[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [nuevaFactura, setNuevaFactura] = useState({
    nombre: '',
    tipoFacturaId: 0,
    monto: '',
    fechaVencimiento: '',
    descripcion: '',
  });

  useEffect(() => {
    loadFacturas();
    loadTiposFactura();
  }, []);

  const loadTiposFactura = async () => {
    try {
      setLoadingTipos(true);
      const response = await financialService.getBillTypes();
      setTiposFactura(response);
    } catch (error) {
      console.error('Error cargando tipos de factura:', error);
    } finally {
      setLoadingTipos(false);
    }
  };

  // Reload data when filter changes
  useEffect(() => {
    if (facturas.length > 0) { // Only reload if we have data
      loadFacturas(false); // Don't show loading spinner for filter changes
    }
  }, [filtroEstado]);
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
    

  // ===== Formateo y Validación de Fecha (igual que v2) =====
  const formatearFecha = (texto: string) => {
    const soloNumeros = texto.replace(/\D/g, '');
    const limitado = soloNumeros.substring(0, 8);

    let formateado = limitado;
    if (limitado.length >= 6) {
      formateado = `${limitado.substring(0, 4)}-${limitado.substring(4, 6)}`;
      if (limitado.length >= 8) {
        formateado += `-${limitado.substring(6, 8)}`;
      }
    } else if (limitado.length >= 5) {
      formateado = `${limitado.substring(0, 4)}-${limitado.substring(4)}`;
    }
    return formateado;
  };

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


  const handleFechaVencimientoChange = (text: string) => {
    // Solo permitir números y guiones
    const cleanText = text.replace(/[^0-9-]/g, '');
    
    // Formatear automáticamente mientras escribe
    let formattedText = cleanText;
    
    // Auto-agregar guiones en las posiciones correctas
    if (cleanText.length >= 4 && cleanText.charAt(4) !== '-') {
      formattedText = cleanText.slice(0, 4) + '-' + cleanText.slice(4);
    }
    if (cleanText.length >= 7 && cleanText.charAt(7) !== '-') {
      formattedText = cleanText.slice(0, 7) + '-' + cleanText.slice(7);
    }
    
    // Limitar longitud
    if (formattedText.length <= 10) {
      setNuevaFactura(prev => ({
        ...prev,
        fechaVencimiento: formattedText
      }));
    }
  };

  // =========================================================

  const loadFacturas = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      
      console.log('💰 Cargando facturas...');
      
      // Load bills data from API
      const [facturasResult, resumenResult] = await Promise.allSettled([
        financialService.getBills(filtroEstado),
        financialService.getBillsSummary()
      ]);
      
      // Handle bills data
      if (facturasResult.status === 'fulfilled') {
        setFacturas(facturasResult.value);
        console.log('✅ Facturas cargadas exitosamente');
      } else {
        console.error('❌ Error cargando facturas:', facturasResult.reason);
        setFacturas([]); // Set empty array on error
      }
      
      // Handle summary data (for totalPendientes, facturasPendientes, facturasVencidas)
      if (resumenResult.status === 'fulfilled') {
        console.log('✅ Resumen de facturas cargado exitosamente');
      } else {
        console.error('❌ Error cargando resumen:', resumenResult.reason);
      }
      
    } catch (error) {
      console.error('❌ Error general cargando facturas:', error);
      setFacturas([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const handleDeleteFactura = async (factura: Factura) => {
    confirmDeleteBill(factura.nombre, async () => {
      try {
        const success = await financialService.deleteBill(factura.id);
        if (success) {
          await loadFacturas(false);
        }
      } catch (error) {
        console.error('Error eliminando factura:', error);
        Alert.alert('Error', 'No se pudo eliminar la factura');
      }
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFacturas();
    setRefreshing(false);
  };

  const validateFacturaInput = () => {
    const errors: string[] = [];
    
    // Validar nombre
    if (!nuevaFactura.nombre.trim()) {
      errors.push('• El nombre de la factura es obligatorio');
    } else if (nuevaFactura.nombre.trim().length < 2) {
      errors.push('• El nombre debe tener al menos 2 caracteres');
    } else if (nuevaFactura.nombre.trim().length > 50) {
      errors.push('• El nombre no puede exceder 50 caracteres');
    }
    
    // Validar tipo
    if (!nuevaFactura.tipoFacturaId || nuevaFactura.tipoFacturaId === 0) {
      errors.push('• El tipo de factura es obligatorio');
    }
    
    // Validar monto
    if (!nuevaFactura.monto.trim()) {
      errors.push('• El monto es obligatorio');
    } else {
      const monto = parseFloat(nuevaFactura.monto.replace(/,/g, ''));
      if (isNaN(monto)) {
        errors.push('• El monto debe ser un número válido');
      } else if (monto <= 0) {
        errors.push('• El monto debe ser mayor a 0');
      } else if (monto > 100000) {
        errors.push('• El monto no puede exceder $100,000');
      } else if (!/^\d+\.?\d{0,2}$/.test(nuevaFactura.monto.replace(/,/g, ''))) {
        errors.push('• El monto solo puede tener hasta 2 decimales');
      }
    }
    
    // Validar fecha de vencimiento
    if (!nuevaFactura.fechaVencimiento.trim()) {
      errors.push('• La fecha de vencimiento es obligatoria');
    } else if (nuevaFactura.fechaVencimiento.length !== 10) {
      errors.push('• La fecha debe tener formato AAAA-MM-DD');
    } else if (!validarFecha(nuevaFactura.fechaVencimiento)) {
      errors.push('• La fecha no es válida');
    } else {
      const fechaVencimiento = new Date(nuevaFactura.fechaVencimiento + 'T00:00:00');
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      // Validar que no sea muy antigua (más de 1 mes atrás)
      const unMesAtras = new Date(hoy);
      unMesAtras.setMonth(hoy.getMonth() - 1);
      if (fechaVencimiento < unMesAtras) {
        errors.push('• La fecha de vencimiento no puede ser más de 1 mes en el pasado');
      }
      
      // Validar que no sea muy lejos (más de 5 años)
      const cincoAnosAdelante = new Date(hoy);
      cincoAnosAdelante.setFullYear(hoy.getFullYear() + 5);
      if (fechaVencimiento > cincoAnosAdelante) {
        errors.push('• La fecha de vencimiento no puede ser más de 5 años en el futuro');
      }
    }
    
    // Validar descripción (opcional pero con límites)
    if (nuevaFactura.descripcion && nuevaFactura.descripcion.length > 150) {
      errors.push('• La descripción no puede exceder 150 caracteres');
    }
    
    return errors;
  };

  const handleAddFactura = async () => {
    const validationErrors = validateFacturaInput();
    
    if (validationErrors.length > 0) {
      Alert.alert(
        t('common.validationErrors'), 
        validationErrors.join('\n'),
        [{ text: t('common.understood'), style: 'default' }]
      );
      return;
    }

    try {
      const monto = parseFloat(nuevaFactura.monto.replace(/,/g, ''));
      
      const billData = {
        nombre: nuevaFactura.nombre.trim(),
        tipo_factura_id: nuevaFactura.tipoFacturaId,
        monto: monto,
        fechaVencimiento: nuevaFactura.fechaVencimiento,
        descripcion: nuevaFactura.descripcion?.trim() || '',
      };

      // La llamada al servicio también necesita ser actualizada para enviar el nombre correcto
      const createdBill = await financialService.createBill(billData);
      
      // Add the new bill to the list
      setFacturas(prev => [createdBill, ...prev]);
      setNuevaFactura({ nombre: '', tipoFacturaId: 0, monto: '', fechaVencimiento: '', descripcion: '' });
      setShowAddModal(false);
      Alert.alert(t("common.success"), t("bills.created"));
      
    } catch (error) {
      console.error('❌ Error creating bill:', error);
      Alert.alert(
        t("common.error"), 
        'Error al crear la factura. Por favor intenta nuevamente.'
      );
    }
  };

  const handleMarcarPagada = (id: number) => {
    Alert.alert(
      'Marcar como pagada',
      '¿Estás seguro de que quieres marcar esta factura como pagada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, marcar',
          onPress: async () => {
            try {
              await financialService.markBillAsPaid(id);
              
              // Update local state
              setFacturas(prev => prev.map(f =>
                f.id === id
                  ? { ...f, estado: 'Pagada' as const, ultimoPago: new Date().toISOString().split('T')[0] }
                  : f
              ));
              
              console.log('✅ Factura marcada como pagada');
            } catch (error) {
              console.error('❌ Error marking bill as paid:', error);
              Alert.alert(
                'Error', 
                'No se pudo marcar la factura como pagada. Intenta nuevamente.'
              );
            }
          }
        }
      ]
    );
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pagada': return colors.success;
      case 'Pendiente': return colors.warning;
      case 'Vencida': return colors.error;
      default: return colors.light.textSecondary;
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Pagada': return 'checkmark-circle';
      case 'Pendiente': return 'time';
      case 'Vencida': return 'alert-circle';
      default: return 'document';
    }
  };

  const facturasFiltradas = facturas.filter(f => {
    const estadoMap: Record<Factura['estado'], 'pending' | 'paid' | 'overdue'> = {
      Pendiente: 'pending', Pagada: 'paid', Vencida: 'overdue'
    };
    const matchEstado = filtroEstado === 'all' || estadoMap[f.estado] === filtroEstado;
    const matchBusqueda = f.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
                      f.tipoFactura.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  const totalPendientes = facturas.filter(f => f.estado === 'Pendiente').reduce((sum, f) => sum + f.monto, 0);
  const facturasPendientes = facturas.filter(f => f.estado === 'Pendiente').length;
  const facturasVencidas = facturas.filter(f => f.estado === 'Vencida').length;

  const shouldShowDateError = (fechaStr: string) => {
    return fechaStr.length === 10 && !validarFecha(fechaStr, true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            {t("bills.loading")}
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
              { fontSize: isTablet ? 24 : 20 }
            ]}
          >
            {t("bills.title")}
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
            onPress={() => setShowAddModal(true)}
            style={[styles.headerButton, styles.addButton]}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros y búsqueda */}
      <View style={[styles.filtersContainer, { paddingHorizontal: wp(4) }]}>
        <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
          <Ionicons
            name="search"
            size={20}
            color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
            placeholder={t("bills.searchPlaceholder")}
            placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
            value={terminoBusqueda}
            onChangeText={setTerminoBusqueda}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
          <View style={styles.filterTabs}>
            {['all', 'pending', 'paid', 'overdue'].map((estado) => (
              <TouchableOpacity
                key={estado}
                style={[
                  styles.filterTab,
                  filtroEstado === estado && styles.filterTabActive,
                  isDarkMode && styles.darkFilterTab,
                  filtroEstado === estado && isDarkMode && styles.darkFilterTabActive,
                ]}
                onPress={() => setFiltroEstado(estado as any)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filtroEstado === estado && styles.filterTabTextActive,
                    isDarkMode && styles.darkText,
                    filtroEstado === estado && styles.filterTabTextActive,
                  ]}
                >
                  {estado === 'all' ? t("bills.filters.all")
                    : estado === 'pending' ? t("bills.filters.pending")
                    : estado === 'paid' ? t("bills.filters.paid")
                    : t("bills.filters.overdue")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
        {/* Resumen */}
        <View
          style={[
            styles.resumenContainer,
            isDarkMode && styles.darkCard,
            { marginHorizontal: wp(4), marginTop: hp(2) }
          ]}
        >
          <View style={styles.resumenItem}>
            <View style={[styles.resumenIcon, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="document-text" size={24} color={colors.warning} />
            </View>
            <Text style={[styles.resumenValue, isDarkMode && styles.darkText]}>
              {formatCurrency(totalPendientes)}
            </Text>
            <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
              {t("bills.totalPending")}
            </Text>
          </View>

          <View style={styles.resumenItem}>
            <View style={[styles.resumenIcon, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="time" size={24} color={colors.info} />
            </View>
            <Text style={[styles.resumenValue, isDarkMode && styles.darkText]}>
              {facturasPendientes}
            </Text>
            <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
              {t("bills.pendingCount")}
            </Text>
          </View>

          <View style={styles.resumenItem}>
            <View style={[styles.resumenIcon, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="alert-circle" size={24} color={colors.error} />
            </View>
            <Text style={[styles.resumenValue, isDarkMode && styles.darkText]}>
              {facturasVencidas}
            </Text>
            <Text style={[styles.resumenLabel, isDarkMode && styles.darkTextSecondary]}>
              {t("bills.overdueCount")}
            </Text>
          </View>
        </View>

        {/* Lista de Facturas */}
        <View
          style={[
            styles.card,
            isDarkMode && styles.darkCard,
            { marginHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(4) }
          ]}
        >
          {facturasFiltradas.length > 0 ? (
            facturasFiltradas.map((factura) => (
              <View key={factura.id} style={styles.facturaItem}>
                <View style={styles.facturaHeader}>
                  <View style={styles.facturaInfo}>
                    {factura.logoUrl ? (
                      <View style={styles.logoContainer}>
                        <Image
                          source={{ uri: factura.logoUrl }}
                          style={styles.logo}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <View style={[styles.facturaIcon, { backgroundColor: colors.light.surfaceSecondary }]}>
                        <Ionicons
                          name="document-text"
                          size={24}
                          color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                        />
                      </View>
                    )}

                    <View style={styles.facturaTexts}>
                      <Text style={[styles.facturaNombre, isDarkMode && styles.darkText]}>
                        {factura.nombre}
                      </Text>
                      <Text style={[styles.facturaTipo, isDarkMode && styles.darkTextSecondary]}>
                        {factura.tipoFactura.nombre}
                      </Text>
                      {factura.descripcion && (
                        <Text style={[styles.facturaDescripcion, isDarkMode && styles.darkTextSecondary]}>
                          {factura.descripcion}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.facturaRight}>
                    <Text style={[styles.facturaMonto, isDarkMode && styles.darkText]}>
                      {formatCurrency(factura.monto)}
                    </Text>
                    <View style={styles.facturaEstadoContainer}>
                      <View
                        style={[
                          styles.estadoTag,
                          { backgroundColor: getEstadoColor(factura.estado) + '20' }
                        ]}
                      >
                        <Ionicons
                          name={getEstadoIcon(factura.estado) as any}
                          size={12}
                          color={getEstadoColor(factura.estado)}
                        />
                        <Text
                          style={[
                            styles.estadoText,
                            { color: getEstadoColor(factura.estado) }
                          ]}
                        >
                          {factura.estado}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.facturaFooter}>
                  <View style={styles.facturaFechas}>
                    <Text style={[styles.fechaLabel, isDarkMode && styles.darkTextSecondary]}>
                      Vence: {formatDate(new Date(factura.fechaVencimiento))}
                    </Text>
                    {factura.ultimoPago && (
                      <Text style={[styles.fechaLabel, isDarkMode && styles.darkTextSecondary]}>
                        Último pago: {formatDate(new Date(factura.ultimoPago))}
                      </Text>
                    )}
                  </View>

                  <View style={styles.facturaActions}>
                    {factura.estado === 'Pendiente' && (
                      <TouchableOpacity
                        style={styles.pagarButton}
                        onPress={() => handleMarcarPagada(factura.id)}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.pagarButtonText}>{t("bills.markAsPaid")}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteFactura(factura)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text style={styles.deleteButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-outline"
                size={48}
                color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
              />
              <Text style={[styles.emptyStateText, isDarkMode && styles.darkTextSecondary]}>
                No hay facturas que mostrar
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Agregar Factura */}
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
              {t("bills.newBill")}
            </Text>
            <TouchableOpacity 
              style={styles.modernSaveButton}
              onPress={handleAddFactura}
            >
              <Text style={styles.modernSaveButtonText}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("bills.billName")} *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={t("bills.billNamePlaceholder")}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevaFactura.nombre}
                onChangeText={(text) => setNuevaFactura(prev => ({ ...prev, nombre: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("bills.billType")} *
              </Text>
              {loadingTipos ? (
                <View style={[styles.input, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.inputLabel, { marginTop: 4 }]}>Cargando tipos...</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesContainer}
                >
                  {tiposFactura.map((tipo) => (
                    <TouchableOpacity
                      key={tipo.id}
                      style={[
                        styles.categoryOption,
                        nuevaFactura.tipoFacturaId === tipo.id && styles.categoryOptionSelected
                      ]}
                      onPress={() => setNuevaFactura(prev => ({ ...prev, tipoFacturaId: tipo.id }))}
                    >
                      <Text style={[
                        styles.categoryText,
                        nuevaFactura.tipoFacturaId === tipo.id && styles.categoryTextSelected
                      ]}>
                        {tipo.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {nuevaFactura.tipoFacturaId === 0 && (
                <Text style={styles.helpText}>
                  Selecciona un tipo de factura
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("bills.amount")} *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder="0.00"
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevaFactura.monto}
                onChangeText={(text) => setNuevaFactura(prev => ({ ...prev, monto: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("bills.dueDate")} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isDarkMode && styles.darkInput,
                  shouldShowDateError(nuevaFactura.fechaVencimiento) && styles.inputError
                ]}
                placeholder="2025-12-31"
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevaFactura.fechaVencimiento}
                onChangeText={handleFechaVencimientoChange}
                keyboardType="numeric"
                maxLength={10}
              />
              <Text style={[styles.helpText, isDarkMode && styles.darkTextSecondary]}>
                {t("bills.dateFormat")}
              </Text>
              {shouldShowDateError(nuevaFactura.fechaVencimiento) && (
                <Text style={styles.errorText}>
                  {t("bills.invalidDate")}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.darkTextSecondary]}>
                {t("bills.description")}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
                placeholder={t("bills.descriptionPlaceholder")}
                placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}
                value={nuevaFactura.descripcion}
                onChangeText={(text) => setNuevaFactura(prev => ({ ...prev, descripcion: text }))}
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
  darkSearchContainer: {
    backgroundColor: colors.dark.surface,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.light.text,
  },
  darkSearchInput: {
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
  scrollView: {
    flex: 1,
  },
  resumenContainer: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...globalStyles.shadow,
  },
  resumenItem: {
    alignItems: 'center',
    flex: 1,
  },
  resumenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  resumenValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 4,
  },
  resumenLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
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
  facturaItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  facturaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  facturaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logo: {
    width: 32,
    height: 32,
  },
  facturaIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  facturaTexts: {
    flex: 1,
  },
  facturaNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 2,
  },
  facturaTipo: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  facturaDescripcion: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },
  facturaRight: {
    alignItems: 'flex-end',
  },
  facturaMonto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 4,
  },
  facturaEstadoContainer: {
    alignItems: 'flex-end',
  },
  estadoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  facturaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  facturaFechas: {
    flex: 1,
  },
  fechaLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  pagarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pagarButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  facturaActions: {
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
  categoriesContainer: {
    marginTop: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.light.text,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default Facturas;