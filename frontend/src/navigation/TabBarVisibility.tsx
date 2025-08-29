import React, { createContext, useContext, useRef } from "react";
import { Animated, Easing } from "react-native";

type Ctx = {
  translateY: Animated.Value;
  show: () => void;
  hide: () => void;
  height: number;
};

const TabBarVisibilityContext = createContext<Ctx | null>(null);

export const TabBarVisibilityProvider: React.FC<{
  children: React.ReactNode;
  height?: number; // alto aproximado de tu tab
}> = ({ children, height = 72 }) => {
  const translateY = useRef(new Animated.Value(0)).current;

  const show = () => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const hide = () => {
    Animated.timing(translateY, {
      toValue: height + 24, // empújalo hacia abajo
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <TabBarVisibilityContext.Provider value={{ translateY, show, hide, height }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
};

export const useTabBarVisibility = () => {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) throw new Error("useTabBarVisibility debe usarse dentro de TabBarVisibilityProvider");
  return ctx;
};
