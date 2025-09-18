import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons';
import { useAdminTabBarVisibility } from './AdminTabBarVisibility';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

const ICONS = {
  AdminDashboard: 'grid-outline',
  UserManagementStack: 'people-outline',
  CompanyManagementStack: 'business-outline',
  Reports: 'bar-chart-outline',
  Settings: 'settings-outline',
};

export const AdminFloatingTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { isVisible } = useAdminTabBarVisibility();
  const { isDarkMode } = useTheme();

  // Animaciones suaves
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 100, // desplazar hacia abajo
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
        {
          bottom: insets.bottom,
          transform: [{ translateY }],
          opacity,
          pointerEvents: isVisible ? "auto" : "none",
        }
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabButton}
          >
            <Ionicons
              name={ICONS[route.name]}
              size={24}
              color={isFocused ? colors.primary : (isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary)}
            />
            <Text style={[
              styles.tabLabel,
              isDarkMode && styles.tabLabelDark,
              { color: isFocused ? colors.primary : (isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary) }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flexDirection: 'row',
    left: 20,
    right: 20,
    height: 75,
    backgroundColor: colors.light.surface,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  containerDark: {
    backgroundColor: colors.dark.surface,
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    color: colors.light.textSecondary,
  },
  tabLabelDark: {
    color: colors.dark.textSecondary,
  },
});