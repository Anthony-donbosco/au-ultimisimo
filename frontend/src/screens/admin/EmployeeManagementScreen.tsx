import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

export const EmployeeManagementScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Employee Management</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Ionicons name="person-add-outline" size={80} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
        <Text style={[styles.placeholderText, isDarkMode && styles.placeholderTextDark]}>Gestión de Empleados - Próximamente</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background
  },
  containerDark: {
    backgroundColor: colors.dark.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border
  },
  headerDark: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.text
  },
  headerTitleDark: {
    color: colors.dark.text
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderText: {
    marginTop: 20,
    fontSize: 18,
    color: colors.light.textSecondary
  },
  placeholderTextDark: {
    color: colors.dark.textSecondary
  },
});