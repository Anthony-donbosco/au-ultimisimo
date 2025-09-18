import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importar las nuevas pantallas de detalle
import { CompanyDashboardScreen } from '../../screens/admin/company/CompanyDashboardScreen';
import { CompanyEmployeesScreen } from '../../screens/admin/company/CompanyEmployeesScreen';
// Importa aquí las otras pantallas (Sales, Tasks, Products) cuando las crees

const Tab = createBottomTabNavigator();

export const CompanyDetailNavigator = ({ route }) => {
  const { companyId, companyName } = route.params; // Recibe el ID y nombre de la empresa

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'CompanyDashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'CompanyEmployees') iconName = focused ? 'people' : 'people-outline';
          // ...otros iconos
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#5a67d8',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="CompanyDashboard" 
        component={CompanyDashboardScreen}
        initialParams={{ companyId, companyName }} // Pasa los params a la pantalla
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="CompanyEmployees" 
        component={CompanyEmployeesScreen} 
        initialParams={{ companyId, companyName }}
        options={{ title: 'Employees' }}
      />
      {/* Añade aquí las otras pantallas (Sales, Tasks, etc.) */}
    </Tab.Navigator>
  );
};