// src/components/common/ThemeSelector.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

interface ThemeSelectorProps {
  variant?: 'button' | 'icon' | 'setting';
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  variant = 'icon',
  showLabel = false,
  size = 'medium',
}) => {
  const { theme, themeMode, isLoading, setThemeMode } = useTheme();
  const [showModal, setShowModal] = React.useState(false);

  const isDarkMode = theme === 'dark';

  const getIconName = () => {
    switch (themeMode) {
      case 'light':
        return 'sunny';
      case 'dark':
        return 'moon';
      case 'system':
        return 'phone-portrait';
      default:
        return 'sunny';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 18;
      case 'medium':
        return 24;
      case 'large':
        return 28;
      default:
        return 24;
    }
  };

  const handleQuickToggle = async () => {
    if (variant === 'setting') {
      setShowModal(true);
    } else {
      // Toggle simple entre light y dark
      const nextMode = themeMode === 'light' ? 'dark' : 'light';
      await setThemeMode(nextMode);
    }
  };

  const handleModeSelect = async (mode: 'light' | 'dark' | 'system') => {
    await setThemeMode(mode);
    setShowModal(false);
  };

  if (isLoading && variant !== 'setting') {
    return (
      <View style={[styles.loadingContainer, styles[`${size}Container`]]}>
        <Ionicons 
          name="ellipse" 
          size={getIconSize()} 
          color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary} 
        />
      </View>
    );
  }

  const renderButton = () => (
    <TouchableOpacity
      style={[
        styles.button,
        isDarkMode && styles.darkButton,
        styles[`${size}Button`],
      ]}
      onPress={handleQuickToggle}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={getIconName()} 
        size={getIconSize()} 
        color={isDarkMode ? colors.dark.text : colors.light.text} 
      />
      {showLabel && (
        <Text style={[
          styles.buttonText,
          isDarkMode && styles.darkButtonText,
          styles[`${size}Text`],
        ]}>
          {themeMode === 'system' ? 'Automático' : 
           themeMode === 'light' ? 'Claro' : 'Oscuro'}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderIcon = () => (
    <TouchableOpacity
      style={[styles.iconButton, styles[`${size}IconButton`]]}
      onPress={handleQuickToggle}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={getIconName()} 
        size={getIconSize()} 
        color={isDarkMode ? colors.dark.text : colors.light.text} 
      />
    </TouchableOpacity>
  );

  const renderSetting = () => (
    <TouchableOpacity
      style={[
        styles.settingRow,
        isDarkMode && styles.darkSettingRow,
      ]}
      onPress={handleQuickToggle}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[
          styles.settingIcon,
          isDarkMode && styles.darkSettingIcon,
        ]}>
          <Ionicons 
            name={getIconName()} 
            size={24} 
            color={colors.primary} 
          />
        </View>
        <View style={styles.settingTexts}>
          <Text style={[
            styles.settingTitle,
            isDarkMode && styles.darkSettingTitle,
          ]}>
            Tema de la Aplicación
          </Text>
          <Text style={[
            styles.settingSubtitle,
            isDarkMode && styles.darkSettingSubtitle,
          ]}>
            {themeMode === 'system' ? 'Automático (sigue el sistema)' : 
             themeMode === 'light' ? 'Tema claro' : 'Tema oscuro'}
          </Text>
        </View>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} 
      />
    </TouchableOpacity>
  );

  const renderModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={[
        styles.modalContainer,
        isDarkMode && styles.darkModalContainer,
      ]}>
        <View style={[styles.modalHeader, isDarkMode && styles.darkModalHeader]}>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Text style={[styles.cancelButton, isDarkMode && styles.darkCancelButton]}>
              Cancelar
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>
            Tema de la Aplicación
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.modalContent}>
          {[
            { mode: 'system' as const, title: 'Automático', subtitle: 'Sigue la configuración del sistema', icon: 'phone-portrait' },
            { mode: 'light' as const, title: 'Claro', subtitle: 'Tema claro siempre', icon: 'sunny' },
            { mode: 'dark' as const, title: 'Oscuro', subtitle: 'Tema oscuro siempre', icon: 'moon' },
          ].map((option) => (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.modalOption,
                isDarkMode && styles.darkModalOption,
                themeMode === option.mode && styles.selectedOption,
              ]}
              onPress={() => handleModeSelect(option.mode)}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <View style={[
                  styles.optionIcon,
                  isDarkMode && styles.darkOptionIcon,
                  themeMode === option.mode && styles.selectedOptionIcon,
                ]}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={24} 
                    color={themeMode === option.mode ? '#fff' : colors.primary} 
                  />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={[
                    styles.optionTitle,
                    isDarkMode && styles.darkOptionTitle,
                  ]}>
                    {option.title}
                  </Text>
                  <Text style={[
                    styles.optionSubtitle,
                    isDarkMode && styles.darkOptionSubtitle,
                  ]}>
                    {option.subtitle}
                  </Text>
                </View>
              </View>
              {themeMode === option.mode && (
                <Ionicons 
                  name="checkmark" 
                  size={24} 
                  color={colors.primary} 
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {variant === 'button' && renderButton()}
      {variant === 'icon' && renderIcon()}
      {variant === 'setting' && renderSetting()}
      {renderModal()}
    </>
  );
};

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallContainer: {
    width: 32,
    height: 32,
  },
  mediumContainer: {
    width: 40,
    height: 40,
  },
  largeContainer: {
    width: 48,
    height: 48,
  },

  // Button variant
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  darkButton: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
  },
  smallButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mediumButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  largeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
  },
  darkButtonText: {
    color: colors.dark.text,
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },

  // Icon variant
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  smallIconButton: {
    padding: 6,
  },
  mediumIconButton: {
    padding: 8,
  },
  largeIconButton: {
    padding: 10,
  },

  // Setting variant
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  darkSettingRow: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.divider,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  darkSettingIcon: {
    backgroundColor: colors.dark.surfaceSecondary,
  },
  settingTexts: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 2,
  },
  darkSettingTitle: {
    color: colors.dark.text,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  darkSettingSubtitle: {
    color: colors.dark.textSecondary,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  darkModalContainer: {
    backgroundColor: colors.dark.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  darkModalHeader: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
  },
  darkModalTitle: {
    color: colors.dark.text,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  darkCancelButton: {
    color: colors.dark.textSecondary,
  },
  modalContent: {
    flex: 1,
    paddingTop: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.light.surface,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  darkModalOption: {
    backgroundColor: colors.dark.surface,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  darkOptionIcon: {
    backgroundColor: colors.primaryLight + '20',
  },
  selectedOptionIcon: {
    backgroundColor: colors.primary,
  },
  optionTexts: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 2,
  },
  darkOptionTitle: {
    color: colors.dark.text,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  darkOptionSubtitle: {
    color: colors.dark.textSecondary,
  },
});