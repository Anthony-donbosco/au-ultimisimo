import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { authService } from '../services/auth';

const EmpleadoWelcome: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { isTablet, wp, hp } = useResponsive();

  const handleLogout = async () => {
    await authService.logout();
    // La navegación se manejará automáticamente por el estado de autenticación
  };

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode && styles.darkContainer
    ]}>
      <View style={styles.header}>
        <Text style={[
          styles.title,
          isDarkMode && styles.darkText,
          { fontSize: isTablet ? 32 : 28 }
        ]}>
          AUREUM
        </Text>
        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.darkModeButton}
        >
          <Ionicons 
            name={isDarkMode ? "sunny" : "moon"} 
            size={24} 
            color={isDarkMode ? colors.dark.text : colors.light.text} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[
          styles.welcomeCard,
          isDarkMode && styles.darkCard,
          { 
            paddingHorizontal: wp(8),
            paddingVertical: hp(4)
          }
        ]}>
          <Ionicons 
            name="people" 
            size={isTablet ? 80 : 60} 
            color={colors.primary}
            style={styles.icon}
          />
          
          <Text style={[
            styles.welcomeTitle,
            isDarkMode && styles.darkText,
            { fontSize: isTablet ? 28 : 24 }
          ]}>
            Bienvenido Empleado
          </Text>
          
          <Text style={[
            styles.welcomeSubtitle,
            isDarkMode && styles.darkTextSecondary,
            { fontSize: isTablet ? 18 : 16 }
          ]}>
            Rol de usuario: Empleado
          </Text>
          
          <Text style={[
            styles.description,
            isDarkMode && styles.darkTextSecondary,
            { fontSize: isTablet ? 16 : 14 }
          ]}>
            Como empleado, tendrás acceso a funcionalidades específicas para 
            gestionar tus gastos corporativos, solicitar reembolsos y 
            registrar gastos de viaje y trabajo.
          </Text>

          <View style={styles.featuresContainer}>
            <Text style={[
              styles.featuresTitle,
              isDarkMode && styles.darkText,
              { fontSize: isTablet ? 18 : 16 }
            ]}>
              Próximamente disponible:
            </Text>
            
            {[
              'Registro de gastos corporativos',
              'Solicitudes de reembolso',
              'Gestión de gastos de viaje',
              'Reportes de gastos personales',
              'Aprobaciones de supervisor'
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={isTablet ? 20 : 16} 
                  color={colors.success} 
                />
                <Text style={[
                  styles.featureText,
                  isDarkMode && styles.darkTextSecondary,
                  { fontSize: isTablet ? 16 : 14 }
                ]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutButton, { paddingVertical: hp(2) }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={[styles.logoutText, { fontSize: isTablet ? 16 : 14 }]}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  darkModeButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  welcomeCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...globalStyles.shadow,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
  },
  icon: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  featuresContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginLeft: 8,
  },
  footer: {
    padding: 20,
  },
  logoutButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  darkText: {
    color: colors.dark.text,
  },
  darkTextSecondary: {
    color: colors.dark.textSecondary,
  },
});

export default EmpleadoWelcome;