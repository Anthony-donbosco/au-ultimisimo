import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import UserNavigator from './UserNavigator';
import AdminNavigator from './AdminNavigator';
import EmpresaNavigator from './EmpresaNavigator';
import EmpleadoNavigator from './EmpleadoNavigator';

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
    console.log(`🔀 AppNavigator: Redirigiendo usuario con rol: ${userRole}`);
    
    switch (userRole) {
      case 1: // Administrador
        return (
          <AdminNavigator 
            onAuthChange={onAuthChange}
            onRoleChange={onRoleChange}
          />
        );
      case 2: // Empresa
        return (
          <EmpresaNavigator 
            onAuthChange={onAuthChange}
            onRoleChange={onRoleChange}
          />
        );
      case 3: // Empleado
        return (
          <EmpleadoNavigator 
            onAuthChange={onAuthChange}
            onRoleChange={onRoleChange}
          />
        );
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

  // Crear componente wrapper para evitar recreación en cada render
  const MainComponent = React.useMemo(() => {
    return renderNavigatorByRole;
  }, [userRole]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main">
        {() => MainComponent()}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AppNavigator;