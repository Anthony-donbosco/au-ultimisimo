import { useRef, useCallback, useEffect } from "react";
import { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useTabBarVisibility } from "../navigation/TabBarVisibility";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

export const useHideTabBarOnScroll = () => {
  const { show, hide, height } = useTabBarVisibility();
  const insets = useSafeAreaInsets();
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;

    // throttle muy simple para evitar jitter
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      const dy = y - lastYRef.current;

      // pequeño umbral para no reaccionar a micro-movimientos
      if (Math.abs(dy) > 6) {
        if (dy > 0) hide();      // desplazando hacia abajo -> ocultar
        else show();             // desplazando hacia arriba -> mostrar
      }

      lastYRef.current = y;
      tickingRef.current = false;
    });
  }, [show, hide]);

  // al enfocar una pantalla: asegúrate que reaparezca
  useFocusEffect(useCallback(() => {
    show();
    return () => {};
  }, [show]));

  return {
    onScroll,
    scrollEventThrottle: 16,
    bottomPadding: height + insets.bottom + 12, // para que el contenido no quede tapado
  };
};
