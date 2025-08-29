import React, { createContext, useContext, useState } from "react";

const TabBarVisibilityContext = createContext<{
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}>({
  isVisible: true,
  setIsVisible: () => {},
});

export const TabBarVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);
  return (
    <TabBarVisibilityContext.Provider value={{ isVisible, setIsVisible }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
};

export const useTabBarVisibility = () => useContext(TabBarVisibilityContext);