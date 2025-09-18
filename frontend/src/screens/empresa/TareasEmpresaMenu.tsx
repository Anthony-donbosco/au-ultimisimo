// Nuevo archivo: TareasEmpresaMenu.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

const TareasEmpresaMenu: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Gestión de Tareas
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={[styles.menuOption, isDarkMode && styles.darkMenuOption]}
          onPress={() => navigation.navigate('AsignarTarea', {})} // Navega a Asignar Tarea
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={32} color={colors.primary} />
          <Text style={[styles.menuText, isDarkMode && styles.darkText]}>Asignar Nueva Tarea</Text>
          <Ionicons name="chevron-forward" size={24} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuOption, isDarkMode && styles.darkMenuOption]}
          onPress={() => Alert.alert("Próximamente", "Esta pantalla mostrará todas las tareas asignadas.")} // Navega a la lista de tareas (a futuro)
          activeOpacity={0.7}
        >
          <Ionicons name="list-outline" size={32} color={colors.info} />
          <Text style={[styles.menuText, isDarkMode && styles.darkText]}>Ver Tareas Asignadas</Text>
          <Ionicons name="chevron-forward" size={24} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.light.background },
    darkContainer: { backgroundColor: colors.dark.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.light.surface, borderBottomWidth: 1, borderBottomColor: colors.light.border },
    darkHeader: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.light.text },
    content: { padding: 20 },
    menuOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.surface, padding: 20, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    darkMenuOption: { backgroundColor: colors.dark.surface },
    menuText: { flex: 1, fontSize: 16, fontWeight: '500', marginLeft: 16, color: colors.light.text },
    darkText: { color: colors.dark.text },
    darkTextSecondary: { color: colors.dark.textSecondary },
});

export default TareasEmpresaMenu;