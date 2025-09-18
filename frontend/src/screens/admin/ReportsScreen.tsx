// Reemplazar el contenido de: src/screens/admin/ReportsScreen.tsx

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { adminService } from '../../services/adminService';
import { useHideAdminTabBarOnScroll } from '../../hooks/useHideAdminTabBarOnScroll';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

const ReportCard = ({ icon, title, value, color = '#333', iconColor = '#5a67d8', isDarkMode }) => (
  <View style={[styles.card, isDarkMode && styles.cardDark]}>
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
      <Ionicons name={icon} size={28} color={iconColor} />
    </View>
    <Text style={[styles.cardValue, isDarkMode && styles.cardValueDark]}>{value}</Text>
    <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]}>{title}</Text>
  </View>
);

export const ReportsScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const { onScroll, scrollEventThrottle, bottomPadding } = useHideAdminTabBarOnScroll();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminReportsSummary'],
    queryFn: adminService.getReportsSummary,
  });

  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState(new Date().getMonth());
  const [selectedReportYear, setSelectedReportYear] = useState(new Date().getFullYear());
  const [reportTitle, setReportTitle] = useState('');

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const formatCurrency = (num) => {
    if (typeof num !== 'number') return '$0.00';
    return `$${num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generateReport = async () => {
    if (!reportTitle.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para el reporte');
      return;
    }

    const reportData = {
      newUsers: data?.newUsersThisMonth || '0',
      bannedUsers: data?.bannedUsers || '0',
      totalIncome: formatCurrency(data?.totalIncomeProcessed),
      totalExpenses: formatCurrency(data?.totalExpensesProcessed),
    };

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const period = `${monthNames[selectedReportMonth]} ${selectedReportYear}`;

    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${reportTitle}</title>
          <style>
            body { font-family: sans-serif; color: #333; margin: 20px; }
            .container { max-width: 800px; margin: auto; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
            .header { background-color: #5a67d8; color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; } .header p { margin: 5px 0 0; }
            .content { padding: 30px; }
            .report-info { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .report-info h2 { font-size: 22px; color: #5a67d8; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .stat-card { background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e9ecef; }
            .stat-card .value { font-size: 32px; font-weight: bold; margin-bottom: 8px; }
            .stat-card .title { font-size: 14px; color: #555; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; background-color: #f8f9fa; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Reporte Administrativo</h1><p>AUREUM</p></div>
            <div class="content">
              <div class="report-info"><h2>${reportTitle}</h2><p>Período: ${period}</p><p>Generado el: ${new Date().toLocaleDateString('es-ES')}</p></div>
              <div class="stats-grid">
                <div class="stat-card"><div class="value">${reportData.newUsers}</div><div class="title">Nuevos Usuarios</div></div>
                <div class="stat-card"><div class="value">${reportData.bannedUsers}</div><div class="title">Usuarios Baneados</div></div>
                <div class="stat-card"><div class="value">${reportData.totalIncome}</div><div class="title">Ingresos Totales</div></div>
                <div class="stat-card"><div class="value">${reportData.totalExpenses}</div><div class="title">Gastos Totales</div></div>
              </div>
            </div>
            <div class="footer">Este es un reporte generado automáticamente.</div>
          </div>
        </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `Reporte_${reportTitle.replace(/\s/g, '_')}_${Date.now()}.pdf`;
      const newPath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: newPath });
      await Sharing.shareAsync(newPath, { mimeType: 'application/pdf', dialogTitle: 'Compartir Reporte' });
      setShowReportModal(false);
      setReportTitle('');
    } catch (e) {
      Alert.alert('Error', `No se pudo generar el reporte: ${e.message}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Reportes</Text>
        <View style={{ width: 24 }} />
      </View>
      {isLoading ? <ActivityIndicator size="large" style={styles.centered} color={colors.primary} />
      : isError ? <Text style={[styles.centered, isDarkMode && styles.centeredDark]}>Error: {error.message}</Text>
      : (
        <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} contentContainerStyle={[styles.gridContainer, { paddingBottom: bottomPadding }]} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} />}>
          <View style={styles.createReportContainer}>
            <TouchableOpacity style={styles.generateReportButton} onPress={() => setShowReportModal(true)}>
              <View style={styles.generateReportContent}><Ionicons name="document-text-outline" size={24} color="#fff" style={styles.generateReportIcon} /><Text style={styles.generateReportText}>Crear Reporte PDF</Text></View>
            </TouchableOpacity>
          </View>
          <ReportCard icon="person-add-outline" title="Nuevos Usuarios (Mes)" value={data?.newUsersThisMonth || '0'} iconColor="#28a745" isDarkMode={isDarkMode} />
          <ReportCard icon="shield-checkmark-outline" title="Usuarios Baneados" value={data?.bannedUsers || '0'} iconColor="#dc3545" isDarkMode={isDarkMode} />
          <ReportCard icon="arrow-up-circle-outline" title="Ingresos Totales" value={formatCurrency(data?.totalIncomeProcessed)} iconColor="#17a2b8" isDarkMode={isDarkMode} />
          <ReportCard icon="arrow-down-circle-outline" title="Gastos Totales" value={formatCurrency(data?.totalExpensesProcessed)} iconColor="#ffc107" isDarkMode={isDarkMode} />
        </ScrollView>
      )}

      <Modal visible={showReportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReportModal(false)}>
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
          <View style={[styles.modalHeader, isDarkMode && styles.modalHeaderDark]}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowReportModal(false)}><Text style={[styles.cancelButtonText, isDarkMode && styles.cancelButtonTextDark]}>Cancelar</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>Crear Reporte</Text>
            <TouchableOpacity style={styles.saveButton} onPress={generateReport}><Text style={styles.saveButtonText}>Generar</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.inputLabelDark]}>Título del Reporte</Text>
              <TextInput style={[styles.textInput, isDarkMode && styles.textInputDark]} value={reportTitle} onChangeText={setReportTitle} placeholder="Ej: Resumen Financiero Mensual" placeholderTextColor={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary}/>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.inputLabelDark]}>Mes</Text>
              <View style={styles.monthContainer}>{Array.from({ length: 12 }, (_, i) => (<TouchableOpacity key={i} style={[styles.monthButton, isDarkMode && styles.monthButtonDark, selectedReportMonth === i && styles.monthButtonSelected]} onPress={() => setSelectedReportMonth(i)}><Text style={[styles.monthButtonText, isDarkMode && styles.monthButtonTextDark, selectedReportMonth === i && styles.monthButtonTextSelected]}>{new Date(2023, i, 1).toLocaleDateString('es-ES', { month: 'short' })}</Text></TouchableOpacity>))}</View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDarkMode && styles.inputLabelDark]}>Año</Text>
              <View style={styles.yearContainer}>{[new Date().getFullYear() -1, new Date().getFullYear()].map((year) => (<TouchableOpacity key={year} style={[styles.yearButton, isDarkMode && styles.yearButtonDark, selectedReportYear === year && styles.yearButtonSelected]} onPress={() => setSelectedReportYear(year)}><Text style={[styles.yearButtonText, isDarkMode && styles.yearButtonTextDark, selectedReportYear === year && styles.yearButtonTextSelected]}>{year}</Text></TouchableOpacity>))}</View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  containerDark: { backgroundColor: colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  headerDark: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.light.text },
  headerTitleDark: { color: colors.dark.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', color: colors.light.text },
  centeredDark: { color: colors.dark.text },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', padding: 10 },
  card: { width: '45%', backgroundColor: colors.light.surface, borderRadius: 16, padding: 20, margin: '2.5%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 4 },
  cardDark: { backgroundColor: colors.dark.surface },
  iconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: colors.light.text },
  cardValueDark: { color: colors.dark.text },
  cardTitle: { marginTop: 8, fontSize: 14, color: colors.light.textSecondary, textAlign: 'center' },
  cardTitleDark: { color: colors.dark.textSecondary },
  createReportContainer: { width: '95%', margin: '2.5%', marginBottom: 10 },
  generateReportButton: { backgroundColor: colors.success, borderRadius: 12, padding: 16, elevation: 5 },
  generateReportContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  generateReportIcon: { marginRight: 12 },
  generateReportText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalContainer: { flex: 1, backgroundColor: colors.light.background },
  modalContainerDark: { backgroundColor: colors.dark.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  modalHeaderDark: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.light.text },
  modalTitleDark: { color: colors.dark.text },
  cancelButton: { padding: 8 },
  cancelButtonText: { color: colors.primary, fontWeight: '500' },
  cancelButtonTextDark: { color: colors.primary },
  saveButton: { padding: 8 },
  saveButtonText: { color: colors.primary, fontWeight: '600' },
  modalContent: { flex: 1, padding: 20 },
  inputContainer: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: colors.light.text, marginBottom: 12 },
  inputLabelDark: { color: colors.dark.text },
  textInput: { borderWidth: 1, borderColor: colors.light.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: colors.light.surface, color: colors.light.text },
  textInputDark: { borderColor: colors.dark.border, backgroundColor: colors.dark.surface, color: colors.dark.text },
  monthContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.light.surface, borderWidth: 1, borderColor: colors.light.border, minWidth: 60, alignItems: 'center' },
  monthButtonDark: { backgroundColor: colors.dark.surface, borderColor: colors.dark.border },
  monthButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthButtonText: { fontSize: 14, color: colors.light.text },
  monthButtonTextDark: { color: colors.dark.text },
  monthButtonTextSelected: { color: '#fff', fontWeight: '600' },
  yearContainer: { flexDirection: 'row', gap: 12 },
  yearButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: colors.light.surface, borderWidth: 1, borderColor: colors.light.border, flex: 1, alignItems: 'center' },
  yearButtonDark: { backgroundColor: colors.dark.surface, borderColor: colors.dark.border },
  yearButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  yearButtonText: { fontSize: 16, color: colors.light.text, fontWeight: '500' },
  yearButtonTextDark: { color: colors.dark.text },
  yearButtonTextSelected: { color: '#fff', fontWeight: '600' },
});