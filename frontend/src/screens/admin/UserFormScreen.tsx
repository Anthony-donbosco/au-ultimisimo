// Reemplazar el contenido de: src/screens/admin/UserFormScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { Ionicons } from '@expo/vector-icons';

// Esquema de validación con Yup
const schema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string(),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  roleId: yup.number().required('Role is required'),
  password: yup.string().when('$isCreateMode', {
    is: true,
    then: (s) => s.min(8, 'Password must be at least 8 characters').required('Password is required'),
    otherwise: (s) => s.optional(),
  }),
  confirmPassword: yup.string().when('password', {
      is: (val) => val && val.length > 0,
      then: (s) => s.oneOf([yup.ref('password')], 'Passwords must match'),
  }),
});

// Componente reutilizable para un grupo de input
const InputGroup = ({ label, control, name, iconName, error, ...props }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputContainer, error && styles.inputContainerError]}>
      <Ionicons name={iconName} size={20} color={error ? '#dc3545' : '#6c757d'} style={styles.inputIcon} />
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholderTextColor="#adb5bd"
            {...props}
          />
        )}
      />
    </View>
    {error && <Text style={styles.errorText}>{error.message}</Text>}
  </View>
);

export const UserFormScreen = ({ route, navigation }) => {
  const { userId, mode } = route.params || {};
  const isCreateMode = !userId;
  const isBalanceMode = mode === 'balance';
  
  const queryClient = useQueryClient();

  // Fetch de datos si estamos en modo edición
  const { data: existingUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['adminUser', userId],
    queryFn: () => adminService.getUserById(userId),
    enabled: !isCreateMode,
  });

  // Fetch de balance si estamos en modo balance
  const { data: userBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['userBalance', userId],
    queryFn: () => adminService.getUserBalance(userId),
    enabled: isBalanceMode,
  });

  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(schema),
    context: { isCreateMode },
    defaultValues: { roleId: 4 } // Rol de usuario por defecto
  });

  // Llenar el formulario con datos existentes al cargar
  useEffect(() => {
    if (existingUser) {
      reset({
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
        email: existingUser.email,
        roleId: existingUser.id_rol,
      });
    }
  }, [existingUser, reset]);

  const mutation = useMutation({
    mutationFn: (data) => 
      isCreateMode 
        ? adminService.createUser(data) 
        : adminService.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      navigation.goBack();
    },
    onError: (error) => {
      alert(`Error: ${error.message || 'An error occurred'}`);
    }
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  if (isLoadingUser || isLoadingBalance) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }
  
  if (isBalanceMode && userBalance) {
    // La vista de balance no se rediseña por ahora
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>User Balance</Text>
                <Text style={styles.subtitle}>Financial summary for the user.</Text>
            </View>

            <View style={styles.balanceCard}>
                <Text style={styles.balanceTitle}>
                    {userBalance.user_info.first_name} {userBalance.user_info.last_name}
                </Text>
                <Text style={styles.balanceSubtitle}>{userBalance.user_info.email}</Text>
                <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Total Income:</Text>
                    <Text style={[styles.balanceAmount, styles.incomeText]}>
                    ${userBalance.total_ingresos.toFixed(2)}
                    </Text>
                </View>
                <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Total Expenses:</Text>
                    <Text style={[styles.balanceAmount, styles.expenseText]}>
                    ${userBalance.total_gastos.toFixed(2)}
                    </Text>
                </View>
                <View style={[styles.balanceRow, styles.balanceTotal]}>
                    <Text style={styles.balanceTotalLabel}>Net Balance:</Text>
                    <Text style={[styles.balanceAmount, styles.balanceTotalAmount, userBalance.balance_neto >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
                    ${userBalance.balance_neto.toFixed(2)}
                    </Text>
                </View>
            </View>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
        </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>{isCreateMode ? 'Create New User' : 'Edit User'}</Text>
        <Text style={styles.subtitle}>{isCreateMode ? 'Fill in the details to add a new user.' : 'Update the user\'s profile information.'}</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Information</Text>
        <InputGroup label="First Name" control={control} name="firstName" iconName="person-outline" error={errors.firstName} placeholder="Enter user's first name" />
        <InputGroup label="Last Name" control={control} name="lastName" iconName="person-outline" error={errors.lastName} placeholder="Enter user's last name" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Credentials</Text>
        <InputGroup label="Email Address" control={control} name="email" iconName="at-outline" error={errors.email} keyboardType="email-address" autoCapitalize="none" editable={isCreateMode} placeholder="user@example.com" />

        {isCreateMode && (
          <>
            <InputGroup label="Temporary Password" control={control} name="password" iconName="lock-closed-outline" error={errors.password} secureTextEntry placeholder="Min. 8 characters" />
            <InputGroup label="Confirm Password" control={control} name="confirmPassword" iconName="lock-closed-outline" error={errors.confirmPassword} secureTextEntry placeholder="Repeat password" />
          </>
        )}
      </View>

      {/* Aquí iría un componente Picker para el Rol (roleId) */}

      <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={mutation.isLoading}>
        {mutation.isLoading ? (
            <ActivityIndicator color="#fff" />
        ) : (
            <Text style={styles.saveButtonText}>Save User</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fe' },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#334155',
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingBottom: 10
  },
  inputGroup: {
      marginBottom: 15,
  },
  label: { fontSize: 14, color: '#475569', fontWeight: '500', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputContainerError: {
      borderColor: '#dc3545',
  },
  inputIcon: {
      marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1e293b',
  },
  errorText: { color: '#dc3545', marginTop: 5, fontSize: 12, fontWeight: '500' },
  
  saveButton: {
    backgroundColor: '#5a67d8',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Estilos para balance (sin cambios de diseño mayores)
  balanceCard: { backgroundColor: '#fff', padding: 20, borderRadius: 10, margin: 20, borderWidth: 1, borderColor: '#dee2e6' },
  balanceTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  balanceSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  balanceLabel: { fontSize: 16, color: '#333' },
  balanceAmount: { fontSize: 16, fontWeight: 'bold' },
  incomeText: { color: '#28a745' },
  expenseText: { color: '#dc3545' },
  balanceTotal: { borderTopWidth: 2, borderTopColor: '#dee2e6', paddingTop: 15, marginTop: 10 },
  balanceTotalLabel: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  balanceTotalAmount: { fontSize: 18, fontWeight: 'bold' },
  positiveBalance: { color: '#28a745' },
  negativeBalance: { color: '#dc3545' },
  backButton: { backgroundColor: '#6c757d', padding: 15, borderRadius: 8, alignItems: 'center', margin: 20 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});