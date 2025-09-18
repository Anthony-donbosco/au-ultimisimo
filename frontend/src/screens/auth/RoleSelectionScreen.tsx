import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { AuthButton } from '../../components/auth/AuthButton';

const { width, height } = Dimensions.get('window');

interface RoleSelectionScreenProps {
  navigation: any;
  route: {
    params: {
      flowType: string; // 'registration' or other flow types
    };
  };
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  navigation,
  route
}) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { flowType } = route.params;

  const handleRoleSelection = async (role: number) => {
    try {
      // Store the selected role in AsyncStorage
      await AsyncStorage.setItem('selectedGoogleRole', role.toString());

      // Navigate back to the calling screen
      navigation.goBack();
    } catch (error) {
      console.error('Error storing selected role:', error);
      navigation.goBack();
    }
  };

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80'
          }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Aureum</Text>
          <Text style={styles.subtitle}>Bienvenido/a</Text>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.contentSection, themeStyles.contentSection]}>
        {/* User Info */}
        <View style={styles.userInfoContainer}>
          <Text style={[styles.welcomeText, themeStyles.text]}>
            ¡Bienvenido/a!
          </Text>
          <Text style={[styles.questionText, themeStyles.secondaryText]}>
            ¿Qué tipo de cuenta deseas crear?
          </Text>
        </View>

        {/* Role Selection Buttons */}
        <View style={styles.roleButtonsContainer}>
          {/* Usuario Normal */}
          <TouchableOpacity
            style={[styles.roleButton, themeStyles.roleButton]}
            onPress={() => handleRoleSelection(4)}
          >
            <View style={[styles.roleIconContainer, styles.userRoleIcon]}>
              <Text style={styles.roleIcon}>👤</Text>
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={[styles.roleTitle, themeStyles.text]}>
                Ingresar como Usuario
              </Text>
              <Text style={[styles.roleDescription, themeStyles.secondaryText]}>
                Acceso básico al sistema con funcionalidades estándar
              </Text>
            </View>
          </TouchableOpacity>

          {/* Empresa */}
          <TouchableOpacity
            style={[styles.roleButton, themeStyles.roleButton]}
            onPress={() => handleRoleSelection(2)}
          >
            <View style={[styles.roleIconContainer, styles.companyRoleIcon]}>
              <Text style={styles.roleIcon}>🏢</Text>
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={[styles.roleTitle, themeStyles.text]}>
                Ingresar como Empresa
              </Text>
              <Text style={[styles.roleDescription, themeStyles.secondaryText]}>
                Gestiona empleados, productos y supervisa las ventas
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cancel Button */}
        <AuthButton
          title="Cancelar"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="large"
          isDarkMode={isDarkMode}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    height: height * 0.25,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  logoContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#f59e0b',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  roleButtonsContainer: {
    flex: 1,
    gap: 16,
    marginBottom: 32,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleIcon: {
    fontSize: 28,
  },
  userRoleIcon: {
    backgroundColor: '#ddd6fe',
  },
  companyRoleIcon: {
    backgroundColor: '#fed7aa',
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  contentSection: {
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  text: {
    color: '#1e293b',
  },
  secondaryText: {
    color: '#64748b',
  },
  roleButton: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
  },
  contentSection: {
    backgroundColor: '#1e293b',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  text: {
    color: '#f1f5f9',
  },
  secondaryText: {
    color: '#94a3b8',
  },
  roleButton: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
});

export default RoleSelectionScreen;