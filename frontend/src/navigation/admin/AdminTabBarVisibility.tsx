import React, { createContext, useState, useContext } from 'react';

const AdminTabBarVisibilityContext = createContext({
  isVisible: true,
  setIsVisible: () => {},
});

export const AdminTabBarVisibilityProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <AdminTabBarVisibilityContext.Provider value={{ isVisible, setIsVisible }}>
      {children}
    </AdminTabBarVisibilityContext.Provider>
  );
};

export const useAdminTabBarVisibility = () => useContext(AdminTabBarVisibilityContext);