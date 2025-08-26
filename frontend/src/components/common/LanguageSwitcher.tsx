// src/components/common/LanguageSwitcher.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { changeLanguage, getCurrentLanguage, getSupportedLanguages } from '../../i18n/i18n';
import { colors } from '../../styles/colors';

interface LanguageSwitcherProps {
  variant?: 'button' | 'icon' | 'setting';
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'icon',
  showLabel = false,
  size = 'medium',
}) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const currentLanguage = getCurrentLanguage();
  const supportedLanguages = getSupportedLanguages();

  // Añadir banderas a los idiomas
  const languagesWithFlags: Language[] = supportedLanguages.map(lang => ({
    ...lang,
    flag: getLanguageFlag(lang.code),
  }));

  function getLanguageFlag(code: string): string {
    const flags: Record<string, string> = {
      en: '🇺🇸',
      es: '🇪🇸',
    };
    return flags[code] || '🌐';
  }

  const getCurrentLanguageData = (): Language => {
    return languagesWithFlags.find(lang => lang.code === currentLanguage) || languagesWithFlags[0];
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

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === currentLanguage) {
      setShowModal(false);
      return;
    }

    try {
      setIsChanging(true);
      await changeLanguage(languageCode);
      setShowModal(false);
      
      // Mostrar confirmación
      Alert.alert(
        t('common.success'),
        t('language.changeSuccess'),
        [{ text: t('common.done'), style: 'default' }]
      );
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(
        t('common.error'),
        t('language.changeError'),
        [{ text: t('common.retry'), style: 'default' }]
      );
    } finally {
      setIsChanging(false);
    }
  };

  const handlePress = () => {
    if (variant === 'setting' || languagesWithFlags.length <= 2) {
      // Si es variant setting o solo hay 2 idiomas, mostrar modal
      setShowModal(true);
    } else {
      // Toggle simple entre idiomas disponibles
      const currentIndex = languagesWithFlags.findIndex(lang => lang.code === currentLanguage);
      const nextIndex = (currentIndex + 1) % languagesWithFlags.length;
      const nextLanguage = languagesWithFlags[nextIndex];
      handleLanguageSelect(nextLanguage.code);
    }
  };

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        isDarkMode && styles.darkLanguageItem,
        item.code === currentLanguage && styles.selectedLanguageItem,
      ]}
      onPress={() => handleLanguageSelect(item.code)}
      disabled={isChanging || item.code === currentLanguage}
      activeOpacity={0.7}
    >
      <View style={styles.languageLeft}>
        <Text style={styles.languageFlag}>{item.flag}</Text>
        <View style={styles.languageTexts}>
          <Text style={[
            styles.languageName,
            isDarkMode && styles.darkLanguageName,
          ]}>
            {item.nativeName}
          </Text>
          <Text style={[
            styles.languageSubtitle,
            isDarkMode && styles.darkLanguageSubtitle,
          ]}>
            {item.name}
          </Text>
        </View>
      </View>
      
      <View style={styles.languageRight}>
        {item.code === currentLanguage && (
          <>
            <Text style={[styles.currentLabel, { color: colors.primary }]}>
              {t('language.current')}
            </Text>
            <Ionicons 
              name="checkmark" 
              size={24} 
              color={colors.primary} 
            />
          </>
        )}
        {isChanging && item.code !== currentLanguage && (
          <Ionicons 
            name="ellipse" 
            size={20} 
            color={isDarkMode ? colors.dark.textTertiary : colors.light.textTertiary} 
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderButton = () => {
    const currentLang = getCurrentLanguageData();
    
    return (
      <TouchableOpacity
        style={[
          styles.button,
          isDarkMode && styles.darkButton,
          styles[`${size}Button`],
        ]}
        onPress={handlePress}
        disabled={isChanging}
        activeOpacity={0.7}
      >
        <Text style={styles.flagText}>{currentLang.flag}</Text>
        {showLabel && (
          <Text style={[
            styles.buttonText,
            isDarkMode && styles.darkButtonText,
            styles[`${size}Text`],
          ]}>
            {currentLang.nativeName}
          </Text>
        )}
        <Ionicons 
          name="chevron-down" 
          size={getIconSize() - 4} 
          color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} 
        />
      </TouchableOpacity>
    );
  };

  const renderIcon = () => {
    const currentLang = getCurrentLanguageData();
    
    return (
      <TouchableOpacity
        style={[styles.iconButton, styles[`${size}IconButton`]]}
        onPress={handlePress}
        disabled={isChanging}
        activeOpacity={0.7}
      >
        <Text style={[styles.iconFlag, styles[`${size}IconFlag`]]}>
          {currentLang.flag}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSetting = () => (
    <TouchableOpacity
      style={[
        styles.settingRow,
        isDarkMode && styles.darkSettingRow,
      ]}
      onPress={handlePress}
      disabled={isChanging}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[
          styles.settingIcon,
          isDarkMode && styles.darkSettingIcon,
        ]}>
          <Ionicons 
            name="language" 
            size={24} 
            color={colors.primary} 
          />
        </View>
        <View style={styles.settingTexts}>
          <Text style={[
            styles.settingTitle,
            isDarkMode && styles.darkSettingTitle,
          ]}>
            {t('settings.language')}
          </Text>
          <Text style={[
            styles.settingSubtitle,
            isDarkMode && styles.darkSettingSubtitle,
          ]}>
            {getCurrentLanguageData().nativeName}
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
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>
            {t('language.selectLanguage')}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <FlatList
          data={languagesWithFlags}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item.code}
          style={styles.languageList}
          contentContainerStyle={styles.languageListContent}
          showsVerticalScrollIndicator={false}
        />
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
  flagText: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.light.text,
    marginRight: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  iconFlag: {
    fontSize: 20,
  },
  smallIconFlag: {
    fontSize: 16,
  },
  mediumIconFlag: {
    fontSize: 20,
  },
  largeIconFlag: {
    fontSize: 24,
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

  // Language List
  languageList: {
    flex: 1,
  },
  languageListContent: {
    paddingVertical: 20,
  },
  languageItem: {
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
  darkLanguageItem: {
    backgroundColor: colors.dark.surface,
  },
  selectedLanguageItem: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageTexts: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
    marginBottom: 2,
  },
  darkLanguageName: {
    color: colors.dark.text,
  },
  languageSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  darkLanguageSubtitle: {
    color: colors.dark.textSecondary,
  },
  languageRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
});