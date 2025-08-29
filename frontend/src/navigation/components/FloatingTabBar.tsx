// src/navigation/components/FloatingTabBar.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "../../contexts/ThemeContext";
import { colors as Palette } from "../../styles/colors";
import { useTabBarVisibility } from "../useTabBarVisibility"; // ← FIX PATH

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function useColors() {
  const { isDarkMode } = useTheme();
  const base = {
    primary: Palette.primary,
    text: isDarkMode ? Palette.dark.text : Palette.light.text,
    textMuted: isDarkMode ? Palette.dark.textSecondary : Palette.light.textSecondary,
    bg: isDarkMode ? Palette.dark.surface : Palette.light.surface,
    card: isDarkMode ? "#101113" : "#F7F7FA",
    chip: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    stroke: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    shadow: "#000",
  };
  return base;
}

const ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }
> = {
  Ingresos: { active: "trending-up", inactive: "trending-up-outline", label: "Ingresos" },
  Gastos: { active: "trending-down", inactive: "trending-down-outline", label: "Gastos" },
  Dashboard: { active: "home", inactive: "home-outline", label: "Inicio" },
  Facturas: { active: "document-text", inactive: "document-text-outline", label: "Facturas" },
  Objetivos: { active: "trophy", inactive: "trophy-outline", label: "Objetivos" },
  Transacciones: { active: "swap-horizontal", inactive: "swap-horizontal-outline", label: "Movs" },
  Configuracion: { active: "settings", inactive: "settings-outline", label: "Ajustes" },
  Perfil: { active: "person", inactive: "person-outline", label: "Perfil" },
};

const BAR_WIDTH = Math.min(SCREEN_WIDTH - 24, 360);

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const C = useColors();
  const insets = useSafeAreaInsets();

  // --- Animación de visibilidad ---
  const { isVisible } = useTabBarVisibility();
  const translateY = useRef(new Animated.Value(0)).current; // 0 = visible
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 100,  // desplazar hacia abajo
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

  const content = (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom * 0.6, 8),
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: C.card,
            borderColor: C.stroke,
            shadowColor: C.shadow,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const icon = ICONS[route.name] ?? {
            active: "ellipse",
            inactive: "ellipse-outline",
            label: options.tabBarLabel ?? route.name,
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: true }}
              style={({ pressed }) => [
                styles.item,
                pressed && Platform.OS === "ios" ? { opacity: 0.75 } : null,
              ]}
            >
              <View
                style={[
                  styles.iconChip,
                  { backgroundColor: C.chip, borderColor: C.stroke },
                  isFocused && { backgroundColor: C.primary },
                ]}
              >
                <Ionicons
                  name={isFocused ? icon.active : icon.inactive}
                  size={22}
                  color={isFocused ? (Platform.OS === "ios" ? "#0B0B0D" : "#0B0B0D") : C.text}
                />
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: isFocused ? C.text : C.textMuted },
                  isFocused && { fontWeight: "600" },
                ]}
              >
                {String(icon.label)}
              </Text>

              <View
                style={[
                  styles.dot,
                  { backgroundColor: C.primary, opacity: isFocused ? 1 : 0 },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const body = (
    <Animated.View
      style={[
        styles.absolute,
        {
          transform: [{ translateY }],
          opacity,
          // evita que se pueda tocar cuando está oculto
          // (en Android ayuda a que no “robe” toques fuera de la vista)
          pointerEvents: isVisible ? "auto" : "none",
        },
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={40} tint="dark" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          {content}
        </BlurView>
      ) : (
        <View>{content}</View>
      )}
    </Animated.View>
  );

  return body;
}

const styles = StyleSheet.create({
  absolute: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrapper: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  bar: {
    width: BAR_WIDTH,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 11,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});
