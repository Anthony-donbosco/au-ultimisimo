// Reemplazar el contenido de: src/screens/admin/UserManagementScreen.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';

import { adminService } from '../../services/adminService';
import { UserFilterBar } from '../../components/admin/UserFilterBar';
import { UserListItem } from '../../components/admin/UserListItem';
import { VerificationModal } from '../../components/admin/VerificationModal';
import { useHideAdminTabBarOnScroll } from '../../hooks/useHideAdminTabBarOnScroll';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

export const UserManagementScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [actionToVerify, setActionToVerify] = useState(null);

  const { onScroll, scrollEventThrottle, bottomPadding } = useHideAdminTabBarOnScroll();

  const queryFilters = { page: 1, limit: 20, search: searchQuery, status: activeFilter };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminUsers', queryFilters],
    queryFn: () => adminService.getUsers(queryFilters),
    keepPreviousData: true,
  });

  const mutation = useMutation({
    mutationFn: ({ userId, status, verificationCode }) => 
      adminService.updateUserStatus(userId, status, verificationCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setActionToVerify(null);
    },
    onError: (err) => {
      alert(`Error updating status: ${err.message || 'An error occurred'}`);
    }
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const debouncedSetSearch = useCallback(debounce((query) => setSearchQuery(query), 300), []);

  const handleEdit = (userId) => { navigation.navigate('UserForm', { userId }); };
  const handleViewBalance = (userId) => { navigation.navigate('UserForm', { userId, mode: 'balance' }); };

  const handleStatusChange = async (userId, status) => {
    if (status === 'banned') {
      try {
        await adminService.initiateActionVerification('BAN_USER');
        setActionToVerify({ userId, status, title: `Ban user ${userId}` });
        setModalVisible(true);
      } catch (e) {
        alert('Could not send verification code.');
      }
    } else {
      mutation.mutate({ userId, status });
    }
  };
  
  const handleVerification = async (code) => {
    if (actionToVerify) {
      await mutation.mutateAsync({ ...actionToVerify, verificationCode: code });
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>User Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('UserForm', {})}>
            <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <UserFilterBar
        searchQuery={searchQuery}
        activeFilter={activeFilter}
        onSearchChange={debouncedSetSearch}
        onFilterChange={setActiveFilter}
      />
      
      {isLoading && !data ? (
        <ActivityIndicator size="large" style={styles.centered} color={colors.primary} />
      ) : isError ? (
        <Text style={[styles.centered, isDarkMode && styles.centeredDark]}>Error: {error.message}</Text>
      ) : (
        <FlatList
          data={data?.users || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <UserListItem
              user={item}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onViewBalance={handleViewBalance}
            />
          )}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{ ...styles.listContainer, paddingBottom: bottomPadding }}
          ListEmptyComponent={<Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>No users found.</Text>}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        />
      )}

      <VerificationModal
        isVisible={modalVisible}
        actionTitle={actionToVerify?.title || ''}
        onClose={() => setModalVisible(false)}
        onVerify={handleVerification}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background
  },
  containerDark: {
    backgroundColor: colors.dark.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border
  },
  headerDark: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text
  },
  headerTitleDark: {
    color: colors.dark.text
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    color: colors.light.text
  },
  centeredDark: {
    color: colors.dark.text
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: colors.light.textSecondary,
    fontSize: 16
  },
  emptyTextDark: {
    color: colors.dark.textSecondary
  }
});