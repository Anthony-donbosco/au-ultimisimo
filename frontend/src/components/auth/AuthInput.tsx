import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  isDarkMode?: boolean;
  icon?: string;
  isPassword?: boolean;
  required?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  isDarkMode = false,
  icon,
  isPassword = false,
  required = false,
  style,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, themeStyles.label]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        themeStyles.inputContainer,
        isFocused && styles.inputFocused,
        isFocused && themeStyles.inputFocused,
        error && styles.inputError,
      ]}>
        {/* Icon */}
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons 
              name={icon as any} 
              size={20} 
              color={isDarkMode ? '#94a3b8' : '#64748b'} 
            />
          </View>
        )}

        {/* Text Input */}
        <TextInput
          style={[
            styles.input,
            themeStyles.input,
            icon && styles.inputWithIcon,
            isPassword && styles.inputWithPasswordToggle,
            style,
          ]}
          placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {/* Password Toggle */}
        {isPassword && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={isDarkMode ? '#94a3b8' : '#64748b'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 52,
  },
  inputFocused: {
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputWithPasswordToggle: {
    paddingRight: 0,
  },
  passwordToggle: {
    paddingLeft: 12,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
});

const lightStyles = StyleSheet.create({
  label: {
    color: '#374151',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  inputFocused: {
    borderColor: '#f59e0b',
  },
  input: {
    color: '#1e293b',
  },
});

const darkStyles = StyleSheet.create({
  label: {
    color: '#e2e8f0',
  },
  inputContainer: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderColor: '#475569',
  },
  inputFocused: {
    borderColor: '#f59e0b',
  },
  input: {
    color: '#f1f5f9',
  },
});