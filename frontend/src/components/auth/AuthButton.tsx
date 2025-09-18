import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'google' | 'link';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  isDarkMode?: boolean;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  isDarkMode = false,
  style,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyles = () => {
    const baseStyles = [styles.button, styles[`button_${size}`]];
    
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primaryButton);
        if (isDisabled) baseStyles.push(styles.primaryButtonDisabled);
        break;
      case 'secondary':
        baseStyles.push(isDarkMode ? darkStyles.secondaryButton : lightStyles.secondaryButton);
        if (isDisabled) baseStyles.push(styles.secondaryButtonDisabled);
        break;
      case 'google':
        baseStyles.push(isDarkMode ? darkStyles.googleButton : lightStyles.googleButton);
        if (isDisabled) baseStyles.push(styles.googleButtonDisabled);
        break;
      case 'link':
        baseStyles.push(styles.linkButton);
        break;
      default:
        baseStyles.push(styles.primaryButton);
    }

    return baseStyles;
  };

  const getTextStyles = () => {
    const baseStyles = [styles.buttonText, styles[`buttonText_${size}`]];
    
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primaryButtonText);
        break;
      case 'secondary':
        baseStyles.push(isDarkMode ? darkStyles.secondaryButtonText : lightStyles.secondaryButtonText);
        break;
      case 'google':
        baseStyles.push(isDarkMode ? darkStyles.googleButtonText : lightStyles.googleButtonText);
        break;
      case 'link':
        baseStyles.push(styles.linkButtonText);
        break;
      default:
        baseStyles.push(styles.primaryButtonText);
    }

    if (isDisabled && variant !== 'link') {
      baseStyles.push(styles.disabledText);
    }

    return baseStyles;
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return '#ffffff';
      case 'secondary':
        return isDarkMode ? '#f1f5f9' : '#1e293b';
      case 'google':
        return isDarkMode ? '#f1f5f9' : '#1e293b';
      case 'link':
        return '#f59e0b';
      default:
        return '#ffffff';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' ? '#ffffff' : '#f59e0b'} 
          />
          <Text style={[getTextStyles(), styles.loadingText]}>
            Cargando...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {icon && iconPosition === 'left' && (
          <Ionicons 
            name={icon as any} 
            size={size === 'small' ? 16 : 20} 
            color={getIconColor()}
            style={styles.iconLeft}
          />
        )}
        
        <Text style={getTextStyles()}>
          {title}
        </Text>
        
        {icon && iconPosition === 'right' && (
          <Ionicons 
            name={icon as any} 
            size={size === 'small' ? 16 : 20} 
            color={getIconColor()}
            style={styles.iconRight}
          />
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      disabled={isDisabled}
      activeOpacity={variant === 'link' ? 0.6 : 0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

// 👇 añade estos imports
import type { ViewStyle, TextStyle } from 'react-native';

interface ButtonStyles {
  button: ViewStyle;
  button_small: ViewStyle;
  button_medium: ViewStyle;
  button_large: ViewStyle;
  primaryButton: ViewStyle;
  primaryButtonDisabled: ViewStyle;
  linkButton: ViewStyle;
  secondaryButtonDisabled: ViewStyle;
  googleButtonDisabled: ViewStyle;

  buttonText: TextStyle;
  buttonText_small: TextStyle;
  buttonText_medium: TextStyle;
  buttonText_large: TextStyle;
  primaryButtonText: TextStyle;
  linkButtonText: TextStyle;
  disabledText: TextStyle;

  contentContainer: ViewStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  iconLeft: ViewStyle;
  iconRight: ViewStyle;
}

const styles = StyleSheet.create<ButtonStyles>({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  button_small: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36 },
  button_medium:{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 48 },
  button_large: { paddingHorizontal: 20, paddingVertical: 16, minHeight: 56 },

  primaryButton: {
    backgroundColor: '#f59e0b',
    elevation: 2,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primaryButtonDisabled: { backgroundColor: '#d1d5db', elevation: 0, shadowOpacity: 0 },

  // ❗ sin 'auto'
  linkButton: { backgroundColor: 'transparent', paddingHorizontal: 4, paddingVertical: 4 },

  secondaryButtonDisabled: { opacity: 0.5 },
  googleButtonDisabled: { opacity: 0.5 },

  buttonText: { fontWeight: '600', textAlign: 'center' },
  buttonText_small: { fontSize: 14 },
  buttonText_medium: { fontSize: 16 },
  buttonText_large: { fontSize: 18 },
  primaryButtonText: { color: '#ffffff' },
  linkButtonText: { color: '#f59e0b', fontWeight: '500' },
  disabledText: { color: '#9ca3af' },

  contentContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginLeft: 8 },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});

// y tipa también los “themes”:
interface ThemeButtonStyles {
  secondaryButton: ViewStyle;
  secondaryButtonText: TextStyle;
  googleButton: ViewStyle;
  googleButtonText: TextStyle;
}

const lightStyles = StyleSheet.create<ThemeButtonStyles>({
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db' },
  secondaryButtonText: { color: '#1e293b' },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  googleButtonText: { color: '#1e293b' },
});

const darkStyles = StyleSheet.create<ThemeButtonStyles>({
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#475569' },
  secondaryButtonText: { color: '#f1f5f9' },
  googleButton: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderColor: '#475569',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  googleButtonText: { color: '#f1f5f9' },
});
