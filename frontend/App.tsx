// App.tsx
import React, { useEffect, useState } from 'react';
import './src/i18n/i18n';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useDarkMode } from './src/hooks/useDarkMode';
import { globalStyles } from './src/styles/globalStyles';
import { checkNetworkConnection } from './src/utils/networkUtils';
import { AuthProvider } from './src/context/AuthContext';
import { TabBarVisibilityProvider } from './src/navigation/useTabBarVisibility'; // ← NEW

const queryClient = new QueryClient();

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<number | null>(null);
  const [isDarkMode] = useDarkMode();

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
        setUserRole(userData.tipo_usuario || userData.role_id || 4);
      }
    } catch (error) {
      console.log('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[globalStyles.loadingContainer, isDarkMode && globalStyles.darkBackground]}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TabBarVisibilityProvider>{/* ← NEW */}
            <NavigationContainer>
              <StatusBar style={isDarkMode ? 'light' : 'dark'} />
              <AppNavigator
                isAuthenticated={isAuthenticated}
                userRole={userRole}
                onAuthChange={setIsAuthenticated}
                onRoleChange={setUserRole}
              />
            </NavigationContainer>
          </TabBarVisibilityProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
