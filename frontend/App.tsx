// App.tsx
import React, { useEffect, useState } from 'react';
// Import i18n asynchronously to avoid blocking
import('./src/i18n/i18n').catch(console.error);
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useTheme } from './src/contexts/ThemeContext';
import { globalStyles } from './src/styles/globalStyles';
import { checkNetworkConnection } from './src/utils/networkUtils';
import { AuthProvider } from './src/context/AuthContext';
import { TabBarVisibilityProvider } from './src/navigation/useTabBarVisibility'; // ← NEW

const queryClient = new QueryClient();

interface ThemedAppProps {
  isAuthenticated: boolean;
  userRole: number | null;
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

function ThemedApp({ isAuthenticated, userRole, onAuthChange, onRoleChange }: ThemedAppProps) {
  const { isDarkMode } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <TabBarVisibilityProvider>
        <NavigationContainer>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          <AppNavigator
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            onAuthChange={onAuthChange}
            onRoleChange={onRoleChange}
          />
        </NavigationContainer>
      </TabBarVisibilityProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<number | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const hasConnection = await checkNetworkConnection();
      if (!hasConnection) {
        setIsLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('token');
      const usuario = await AsyncStorage.getItem('user');

      if (token && usuario) {
        const userData = JSON.parse(usuario);
        setIsAuthenticated(true);
        setUserRole(userData.id_rol || userData.tipo_usuario || userData.role_id || 4);
      }
    } catch (error) {
      console.log('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <ThemedApp
      isAuthenticated={isAuthenticated}
      userRole={userRole}
      onAuthChange={setIsAuthenticated}
      onRoleChange={setUserRole}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
