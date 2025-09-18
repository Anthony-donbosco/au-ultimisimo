import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { formatCurrency, formatDate } from '../../utils/networkUtils';

interface GastoPlaneado {
  id: number;
  concepto: string;
  categoria: string;
  monto: number;
  fecha: string;
  descripcion: string;
  estado: 'pendiente' | 'completado' | 'cancelado';
}

interface CategoriaGasto {
  id: string;
  nombre: string;
  icono: string;
  color: string;
}

interface CalendarioGastosProps {
  gastosPlanificados: GastoPlaneado[];
  categorias: CategoriaGasto[];
  onEjecutarGasto: (gastoId: number) => void;
  onCancelarGasto: (gastoId: number) => void;
  isDarkMode: boolean;
}

const CalendarioGastos: React.FC<CalendarioGastosProps> = ({
  gastosPlanificados,
  categorias,
  onEjecutarGasto,
  onCancelarGasto,
  isDarkMode,
}) => {
  console.log('📅 CalendarioGastos recibió gastos planificados:', gastosPlanificados.length);
  console.log('📅 Gastos planificados en calendario:', gastosPlanificados);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDayModal, setShowDayModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
    return iconName as keyof typeof Ionicons.glyphMap;
  };

  // Agrupar gastos por fecha
  const gastosPorFecha = useMemo(() => {
    const agrupados: { [key: string]: GastoPlaneado[] } = {};

    console.log('🗓️ Procesando gastos por fecha...');
    const gastosPendientes = gastosPlanificados.filter(gasto => gasto.estado === 'pendiente');
    console.log('🗓️ Gastos pendientes para agrupar:', gastosPendientes.length);

    gastosPendientes.forEach(gasto => {
      const fechaOriginal = gasto.fecha;
      // Convertir fecha del backend al formato YYYY-MM-DD
      const fecha = new Date(fechaOriginal).toISOString().split('T')[0];
      console.log('🗓️ Procesando gasto:', gasto.concepto, 'fecha original:', fechaOriginal, '→ fecha convertida:', fecha);
      if (!agrupados[fecha]) {
        agrupados[fecha] = [];
      }
      agrupados[fecha].push(gasto);
    });

    console.log('🗓️ Gastos agrupados por fecha:', Object.keys(agrupados).length, 'fechas');
    console.log('🗓️ Agrupamiento final:', agrupados);
    return agrupados;
  }, [gastosPlanificados]);

  // Crear marked dates para el calendario
  const markedDates = useMemo(() => {
    const marked: any = {};
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Creando marked dates para el calendario...');
    console.log('📅 Fechas a marcar:', Object.keys(gastosPorFecha));

    Object.keys(gastosPorFecha).forEach(fecha => {
      const gastos = gastosPorFecha[fecha];
      const totalGastos = gastos.length;
      const totalMonto = gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
      
      // Determinar color del marcador basado en la fecha
      let dotColor = colors.primary;
      if (fecha === today) {
        dotColor = colors.warning;
      } else if (new Date(fecha) < new Date(today)) {
        dotColor = colors.error;
      }
      
      marked[fecha] = {
        marked: true,
        dotColor: dotColor,
        customStyles: {
          container: {
            backgroundColor: totalGastos > 2 ? dotColor + '20' : 'transparent',
            borderRadius: 8,
          },
          text: {
            color: isDarkMode ? colors.dark.text : colors.light.text,
            fontWeight: totalGastos > 0 ? 'bold' : 'normal',
          },
        },
      };
    });

    // Marcar el día seleccionado
    if (selectedDate && marked[selectedDate]) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: '#fff',
      };
    } else if (selectedDate) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: '#fff',
      };
    }
    
    return marked;
  }, [gastosPorFecha, selectedDate, isDarkMode]);

  const gastosDelDiaSeleccionado = selectedDate ? gastosPorFecha[selectedDate] || [] : [];

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalDia = (fecha: string) => {
    const gastos = gastosPorFecha[fecha] || [];
    return gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
  };

  const handleDatePress = (day: any) => {
    setSelectedDate(day.dateString);
    if (gastosPorFecha[day.dateString]?.length > 0) {
      setShowDayModal(true);
    }
  };

  const renderDayEvents = () => {
    if (gastosDelDiaSeleccionado.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons 
            name="calendar-outline" 
            size={48} 
            color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary} 
          />
          <Text style={[styles.emptyText, isDarkMode && styles.darkTextSecondary]}>
            No hay gastos programados para este día
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.dayEventsContainer}>
        <Text style={[styles.dayTitle, isDarkMode && styles.darkText]}>
          {formatDateForDisplay(selectedDate)}
        </Text>
        
        <View style={[styles.dayTotal, isDarkMode && styles.darkDayTotal]}>
          <Text style={[styles.dayTotalLabel, isDarkMode && styles.darkTextSecondary]}>
            Total del día:
          </Text>
          <Text style={[styles.dayTotalAmount, isDarkMode && styles.darkText]}>
            {formatCurrency(getTotalDia(selectedDate))}
          </Text>
        </View>

        {gastosDelDiaSeleccionado.map((gasto, index) => {
          const categoria = categorias.find(c => c.nombre === gasto.categoria);
          const esHoy = new Date(gasto.fecha).toDateString() === new Date().toDateString();
          const esPasado = new Date(gasto.fecha) < new Date();

          return (
            <View
              key={`${gasto.id}-${gasto.fecha}-${index}`} 
              style={[
                styles.gastoCard,
                esHoy && styles.gastoCardToday,
                esPasado && styles.gastoCardPast,
                isDarkMode && styles.darkGastoCard
              ]}
            >
              <View style={styles.gastoHeader}>
                <View style={styles.gastoLeft}>
                  <View style={[
                    styles.gastoIcon, 
                    { backgroundColor: categoria?.color + '20' }
                  ]}>
                    <Ionicons 
                      name={getIconName(categoria?.icono || 'help')} 
                      size={20} 
                      color={categoria?.color || colors.primary} 
                    />
                  </View>
                  <View style={styles.gastoInfo}>
                    <Text style={[styles.gastoConcepto, isDarkMode && styles.darkText]}>
                      {gasto.concepto}
                    </Text>
                    <Text style={[styles.gastoCategoria, isDarkMode && styles.darkTextSecondary]}>
                      {gasto.categoria}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.gastoMonto, isDarkMode && styles.darkText]}>
                  {formatCurrency(gasto.monto)}
                </Text>
              </View>

              {gasto.descripcion && (
                <Text style={[styles.gastoDescripcion, isDarkMode && styles.darkTextSecondary]}>
                  {gasto.descripcion}
                </Text>
              )}

              <View style={styles.gastoActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.executeButton]}
                  onPress={() => {
                    onEjecutarGasto(gasto.id);
                    setShowDayModal(false);
                  }}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Ejecutar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    onCancelarGasto(gasto.id);
                    setShowDayModal(false);
                  }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>

              {esHoy && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>HOY</Text>
                </View>
              )}
              
              {esPasado && (
                <View style={styles.pastBadge}>
                  <Text style={styles.pastBadgeText}>VENCIDO</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.calendarHeader}>
        <Text style={[styles.calendarTitle, isDarkMode && styles.darkText]}>
          Gastos Programados - Calendario
        </Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, isDarkMode && styles.darkTextSecondary]}>
              Programado
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, isDarkMode && styles.darkTextSecondary]}>
              Hoy
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.legendText, isDarkMode && styles.darkTextSecondary]}>
              Vencido
            </Text>
          </View>
        </View>
      </View>

      <Calendar
        style={[styles.calendar, isDarkMode && styles.darkCalendar]}
        theme={{
          backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface,
          calendarBackground: isDarkMode ? colors.dark.surface : colors.light.surface,
          textSectionTitleColor: isDarkMode ? colors.dark.text : colors.light.text,
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
          textDayFontWeight: '500',
          textMonthFontWeight: '600',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
        markingType="custom"
        markedDates={markedDates}
        onDayPress={handleDatePress}
        onMonthChange={(month) => {
          setCurrentMonth(new Date(month.timestamp));
        }}
        hideExtraDays={true}
        firstDay={1}
        showWeekNumbers={false}
        enableSwipeMonths={true}
      />

      {selectedDate && gastosDelDiaSeleccionado.length > 0 && (
        <View style={[styles.quickPreview, isDarkMode && styles.darkQuickPreview]}>
          <TouchableOpacity 
            style={styles.quickPreviewContent}
            onPress={() => setShowDayModal(true)}
          >
            <View style={styles.quickPreviewLeft}>
              <Text style={[styles.quickPreviewDate, isDarkMode && styles.darkText]}>
                {new Date(selectedDate).getDate()}
              </Text>
              <View>
                <Text style={[styles.quickPreviewCount, isDarkMode && styles.darkTextSecondary]}>
                  {gastosDelDiaSeleccionado.length} gastos
                </Text>
                <Text style={[styles.quickPreviewTotal, isDarkMode && styles.darkText]}>
                  {formatCurrency(getTotalDia(selectedDate))}
                </Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para ver gastos del día */}
      <Modal
        visible={showDayModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.modalHeader, isDarkMode && styles.darkModalHeader]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDayModal(false)}
            >
              <Ionicons 
                name="close" 
                size={24} 
                color={isDarkMode ? colors.dark.text : colors.light.text} 
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              Gastos del Día
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          {renderDayEvents()}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  darkContainer: {
    backgroundColor: colors.dark.surface,
  },
  calendarHeader: {
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  calendar: {
    borderRadius: 12,
    paddingBottom: 10,
  },
  darkCalendar: {
    backgroundColor: colors.dark.surface,
  },
  quickPreview: {
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    marginTop: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  darkQuickPreview: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  quickPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickPreviewDate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 16,
    minWidth: 32,
    textAlign: 'center',
  },
  quickPreviewCount: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  quickPreviewTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
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
  darkModalHeader: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  dayEventsContainer: {
    flex: 1,
    padding: 20,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  dayTotal: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  dayTotalLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginRight: 8,
  },
  dayTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  gastoCard: {
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    position: 'relative',
  },
  darkGastoCard: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  gastoCardToday: {
    borderLeftColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  gastoCardPast: {
    borderLeftColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  gastoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gastoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gastoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gastoInfo: {
    flex: 1,
  },
  gastoConcepto: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 2,
  },
  gastoCategoria: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  gastoMonto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
  },
  gastoDescripcion: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  gastoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  executeButton: {
    backgroundColor: colors.success,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  todayBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pastBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pastBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
  darkDayTotal: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
});

export default CalendarioGastos;