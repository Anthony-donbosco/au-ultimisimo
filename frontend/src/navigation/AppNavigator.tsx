import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import UserNavigator from './UserNavigator';
import AdminWelcome from '../screens/AdminWelcome';
import EmpresaWelcome from '../screens/EmpresaWelcome';
import EmpleadoWelcome from '../screens/EmpleadoWelcome';

const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
  isAuthenticated: boolean;
  userRole: number | null;
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({
  isAuthenticated,
  userRole,
  onAuthChange,
  onRoleChange,
}) => {
  if (!isAuthenticated) {
    return (
      <AuthNavigator 
        onAuthChange={onAuthChange}
        onRoleChange={onRoleChange}
      />
    );
  }

  // Determinar navegación según el rol del usuario
  const renderNavigatorByRole = () => {
    switch (userRole) {
      case 1: // Admin
        return <AdminWelcome />;
      case 2: // Empresa
        return <EmpresaWelcome />;
      case 3: // Empleado
        return <EmpleadoWelcome />;
      case 4: // Usuario normal
      default:
        return (
          <UserNavigator 
            onAuthChange={onAuthChange}
            onRoleChange={onRoleChange}
          />
        );
    }
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={() => renderNavigatorByRole()} />
    </Stack.Navigator>
  );
};

export default AppNavigator;