// Crear nuevo archivo: src/components/admin/UserFilterBar.tsx

import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

const FILTER_OPTIONS = ['all', 'active', 'suspended', 'banned'];

interface UserFilterBarProps {
  searchQuery: string;
  activeFilter: string;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
}

export const UserFilterBar: React.FC<UserFilterBarProps> = ({
  searchQuery,
  activeFilter,
  onSearchChange,
  onFilterChange,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
        <Ionicons
          name="search-outline"
          size={20}
          color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
          placeholder="Search by name, ID, or company..."
          placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>
      <View style={styles.filterContainer}>
        {FILTER_OPTIONS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              isDarkMode && styles.filterButtonDark,
              activeFilter === filter && styles.activeFilterButton
            ]}
            onPress={() => onFilterChange(filter)}
          >
            <Text style={[
              styles.filterText,
              isDarkMode && styles.filterTextDark,
              activeFilter === filter && styles.activeFilterText
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  searchContainerDark: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.light.text,
  },
  searchInputDark: {
    color: colors.dark.text,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.light.border,
    borderRadius: 20,
  },
  filterButtonDark: {
    backgroundColor: colors.dark.border,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  filterTextDark: {
    color: colors.dark.textSecondary,
  },
  activeFilterText: {
    color: '#fff',
  },
});