// Reemplazar el contenido de: src/components/admin/UserListItem.tsx

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { User } from '../../services/adminService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';


interface UserListItemProps {
  user: User;
  onStatusChange: (userId: number, status: 'active' | 'suspended' | 'banned') => void;
  onEdit: (userId: number) => void;
  onViewBalance: (userId: number) => void;
}

export const UserListItem: React.FC<UserListItemProps> = ({ user, onStatusChange, onEdit, onViewBalance }) => {
  const { isDarkMode } = useTheme();

  const statusStyles = {
    active: { backgroundColor: '#d4edda', color: '#155724' },
    suspended: { backgroundColor: '#fff3cd', color: '#856404' },
    banned: { backgroundColor: '#f8d7da', color: '#721c24' },
  };

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={styles.userInfo}>
        <Image 
          source={{ uri: user.profile_picture || `https://ui-avatars.com/api/?name=${user.first_name || user.username}&background=random` }} 
          style={styles.avatar} 
        />
        <View style={styles.userDetails}>
          <Text style={[styles.userName, isDarkMode && styles.userNameDark]}>{user.first_name} {user.last_name || ''}</Text>
          <Text style={[styles.userEmail, isDarkMode && styles.userEmailDark]}>{user.email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyles[user.status].backgroundColor }]}>
          <Text style={[styles.statusText, { color: statusStyles[user.status].color }]}>
            {user.status}
          </Text>
        </View>
      </View>
      <View style={[styles.actionsContainer, isDarkMode && styles.actionsContainerDark]}>
        {/* Botón Activar/Suspender */}
        {user.status === 'suspended' ? (
          <TouchableOpacity style={[styles.button, styles.activateButton]} onPress={() => onStatusChange(user.id, 'active')}>
            <Ionicons name="play-circle-outline" size={16} color="#155724" />
            <Text style={[styles.buttonText, styles.activateButtonText]}>Activate</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.suspendButton]} onPress={() => onStatusChange(user.id, 'suspended')}>
            <Ionicons name="pause-circle-outline" size={16} color="#856404" />
            <Text style={[styles.buttonText, styles.suspendButtonText]}>Suspend</Text>
          </TouchableOpacity>
        )}
        
        {/* Botón Editar */}
        <TouchableOpacity style={[styles.button, styles.editButton]} onPress={() => onEdit(user.id)}>
            <Ionicons name="pencil-outline" size={16} color="#495057" />
            <Text style={[styles.buttonText, styles.editButtonText]}>Edit</Text>
        </TouchableOpacity>

        {/* Botón Banear/Desbanear */}
        {user.status === 'banned' ? (
            <TouchableOpacity style={[styles.button, styles.unbanButton]} onPress={() => onStatusChange(user.id, 'active')}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#004085" />
                <Text style={[styles.buttonText, styles.unbanButtonText]}>Unban</Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={[styles.button, styles.banButton]} onPress={() => onStatusChange(user.id, 'banned')}>
                <Ionicons name="shield-outline" size={16} color="#721c24" />
                <Text style={[styles.buttonText, styles.banButtonText]}>Ban</Text>
            </TouchableOpacity>
        )}

        {/* Botón Balance */}
        <TouchableOpacity style={[styles.button, styles.balanceButton]} onPress={() => onViewBalance(user.id)}>
            <Ionicons name="cash-outline" size={16} color="#383d41" />
            <Text style={[styles.buttonText, styles.balanceButtonText]}>Balance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.light.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    cardDark: {
        backgroundColor: colors.dark.surface
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12
    },
    userDetails: {
        flex: 1
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.light.text
    },
    userNameDark: {
        color: colors.dark.text
    },
    userEmail: {
        color: colors.light.textSecondary
    },
    userEmailDark: {
        color: colors.dark.textSecondary
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize'
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.light.border,
        paddingTop: 16
    },
    actionsContainerDark: {
        borderTopColor: colors.dark.border
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginHorizontal: 4,
        flexDirection: 'row'
    },
    buttonText: {
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 6
    },

    activateButton: { backgroundColor: '#d4edda' },
    activateButtonText: { color: '#155724' },

    suspendButton: { backgroundColor: '#fff3cd' },
    suspendButtonText: { color: '#856404' },

    editButton: { backgroundColor: colors.light.border },
    editButtonText: { color: colors.light.textSecondary },

    banButton: { backgroundColor: '#f8d7da' },
    banButtonText: { color: '#721c24' },

    unbanButton: { backgroundColor: '#cce5ff' },
    unbanButtonText: { color: '#004085' },

    balanceButton: { backgroundColor: colors.light.border },
    balanceButtonText: { color: colors.light.textSecondary },
});