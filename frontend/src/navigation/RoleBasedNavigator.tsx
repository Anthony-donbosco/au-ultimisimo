import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

// Navegadores por rol
import UserNavigator from './UserNavigator';
import AdminNavigator from './AdminNavigator';
import EmpresaNavigator from './EmpresaNavigator';
import EmpleadoNavigator from './EmpleadoNavigator';

interface RoleBasedNavigatorProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const RoleBasedNavigator: React.FC<RoleBasedNavigatorProps> = ({
  onAuthChange,
  onRoleChange,
}) => {
  const { user, isLoading } = useAuth();

  // Mostrar loading mientras se obtienen los datos del usuario
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Si no hay usuario, esto no debería pasar en este punto
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: No se encontró usuario</Text>
      </View>
    );
  }

  // Determinar el rol del usuario
  const userRoleName = authService.getUserRoleName(user);
  
  console.log(`🔀 Redirigiendo usuario: ${user.username} al rol: ${userRoleName}`);

  // Redirigir según el rol
  switch (userRoleName) {
    case 'administrador':
      return (
        <AdminNavigator 
          onAuthChange={onAuthChange}
          onRoleChange={onRoleChange}
        />
      );
    
    case 'empresa':
      return (
        <EmpresaNavigator 
          onAuthChange={onAuthChange}
          onRoleChange={onRoleChange}
        />
      );
    
    case 'empleado':
      return (
        <EmpleadoNavigator 
          onAuthChange={onAuthChange}
          onRoleChange={onRoleChange}
        />
      );
    
    case 'usuario':
    default:
      return (
        <UserNavigator 
          onAuthChange={onAuthChange}
          onRoleChange={onRoleChange}
        />
      );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    textAlign: 'center',
  },
});

export default RoleBasedNavigator;