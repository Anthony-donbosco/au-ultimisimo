import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from '../contexts/ThemeContext';

// Hooks
import { useResponsive } from "../hooks/useResponsive";

// Componentes de pantallas
import Dashboard from "../components/user/Dashboard";
import Transacciones from "../components/user/Transacciones";
import Ingresos from "../components/user/Ingresos";
import Gastos from "../components/user/Gastos";
import Facturas from "../components/user/Facturas";
import Objetivos from "../components/user/Objetivos";
import { Configuracion } from "../components/user/Configuracion";
import { Perfil } from "../components/user/Perfil";
import FloatingTabBar from "./components/FloatingTabBar";

export type UserTabParamList = {
  Dashboard: undefined;
  Transacciones: undefined;
  Ingresos: undefined;
  Gastos: undefined;
  Facturas: undefined;
  Objetivos: undefined;
};

export type UserStackParamList = {
  MainTabs: undefined;
  Transacciones: undefined;  // Agregar aquí
  Configuracion: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<UserTabParamList>();
const Stack = createNativeStackNavigator<UserStackParamList>();

interface UserNavigatorProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

// Componente que envuelve las pantallas del Stack manteniendo el TabBar visible
const StackScreenWrapper: React.FC<{
  children: React.ReactNode;
  navigation: any;
}> = ({ children, navigation }) => {
  const { isDarkMode } = useTheme();
  
  // Props del TabBar para las 5 opciones principales
  const tabBarProps = {
    state: {
      index: 2, // Dashboard como índice activo
      routes: [
        { key: 'Ingresos-key', name: 'Ingresos' },
        { key: 'Gastos-key', name: 'Gastos' },
        { key: 'Dashboard-key', name: 'Dashboard' },
        { key: 'Facturas-key', name: 'Facturas' },
        { key: 'Objetivos-key', name: 'Objetivos' },
      ],
    },
    navigation: {
      navigate: (routeName: string) => {
        // Navegar a las pantallas del Tab Navigator
        navigation.navigate('MainTabs', { screen: routeName });
      },
      emit: () => ({ defaultPrevented: false }),
    },
    descriptors: {
      'Ingresos-key': { options: {} },
      'Gastos-key': { options: {} },
      'Dashboard-key': { options: {} },
      'Facturas-key': { options: {} },
      'Objetivos-key': { options: {} },
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <View style={styles.screenContent}>
        {children}
      </View>
      <FloatingTabBar {...tabBarProps} />
    </View>
  );
};

const MainTabNavigator: React.FC<UserNavigatorProps> = ({
  onAuthChange,
  onRoleChange,
}) => {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"              
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Ingresos"
        options={{ tabBarLabel: "" }}
      >
        {(props) => <Ingresos {...props} onAuthChange={onAuthChange} />}
      </Tab.Screen>

      <Tab.Screen
        name="Gastos"
        options={{ tabBarLabel: "" }}
      >
        {(props) => <Gastos {...props} onAuthChange={onAuthChange} />}
      </Tab.Screen>

      <Tab.Screen
        name="Dashboard"
        options={{ tabBarLabel: "" }}
      >
        {(props) => (
          <Dashboard
            {...props}
            onAuthChange={onAuthChange}
            onRoleChange={onRoleChange}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Facturas"
        options={{ tabBarLabel: "" }}
      >
        {(props) => <Facturas {...props} onAuthChange={onAuthChange} />}
      </Tab.Screen>

      <Tab.Screen
        name="Objetivos"
        options={{ tabBarLabel: "" }}
      >
        {(props) => <Objetivos {...props} onAuthChange={onAuthChange} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const UserNavigator: React.FC<UserNavigatorProps> = (props) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {() => <MainTabNavigator {...props} />}
      </Stack.Screen>
      
      {/* Pantallas adicionales CON navbar visible */}
      <Stack.Screen name="Transacciones">
        {(stackProps) => (
          <StackScreenWrapper navigation={stackProps.navigation}>
            <Transacciones {...stackProps} onAuthChange={props.onAuthChange} />
          </StackScreenWrapper>
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Configuracion">
        {(stackProps) => (
          <StackScreenWrapper navigation={stackProps.navigation}>
            <Configuracion {...stackProps} onAuthChange={props.onAuthChange} />
          </StackScreenWrapper>
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Perfil">
        {(stackProps) => (
          <StackScreenWrapper navigation={stackProps.navigation}>
            <Perfil {...stackProps} onAuthChange={props.onAuthChange} />
          </StackScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
});

export default UserNavigator;