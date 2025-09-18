import { useRef, useCallback } from "react";
import { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useAdminTabBarVisibility } from "../navigation/admin/AdminTabBarVisibility";
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from "@react-navigation/native";

export const useHideAdminTabBarOnScroll = () => {
  const { setIsVisible } = useAdminTabBarVisibility();
  const insets = useSafeAreaInsets();
  const lastYRef = useRef(0);
  const lastActionRef = useRef<"show" | "hide">("show");

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;

    // Mostrar siempre si estás casi arriba
    if (y < 16 && lastActionRef.current !== "show") {
      setIsVisible(true);
      lastActionRef.current = "show";
      lastYRef.current = y;
      return;
    }

    const delta = y - lastYRef.current;
    const THRESHOLD = 12; // umbral anti-parpadeo

    if (Math.abs(delta) < THRESHOLD) return;

    if (delta > 0 && lastActionRef.current !== "hide") {
      // Scrolling down → ocultar
      setIsVisible(false);
      lastActionRef.current = "hide";
    } else if (delta < 0 && lastActionRef.current !== "show") {
      // Scrolling up → mostrar
      setIsVisible(true);
      lastActionRef.current = "show";
    }

    lastYRef.current = y;
  }, [setIsVisible]);

  useFocusEffect(useCallback(() => {
    setIsVisible(true);
    lastYRef.current = 0;
    lastActionRef.current = "show";
  }, [setIsVisible]));

  return {
    onScroll,
    scrollEventThrottle: 16,
    bottomPadding: 75 + insets.bottom, // altura fija del tab bar de admin
  };
};