// Reemplazar el contenido de: src/navigation/AdminNavigator.tsx

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminTabBarVisibilityProvider } from "./admin/AdminTabBarVisibility";
import { AdminFloatingTabBar } from "./admin/AdminFloatingTabBar";

// --- PANTALLAS ---
// Dashboard y Módulos Principales
import AdminDashboard from "../screens/admin/AdminDashboard";
import { ReportsScreen } from "../screens/admin/ReportsScreen";
import { SettingsScreen } from "../screens/admin/SettingsScreen";

// Flujo de Gestión de Usuarios
import { UserManagementScreen } from "../screens/admin/UserManagementScreen";
import { UserFormScreen } from "../screens/admin/UserFormScreen";

// Flujo de Gestión de Empresas
import { CompanyManagementScreen } from "../screens/admin/CompanyManagementScreen";
import { CompanyDetailScreen } from "../screens/admin/CompanyDetailScreen";
import { CompanyEmployeesScreen } from "../screens/admin/company/CompanyEmployeesScreen";
import { CompanySalesScreen } from "../screens/admin/CompanySalesScreen";
import { CompanyTasksScreen } from "../screens/admin/CompanyTasksScreen";
import CompanyProjects from "../screens/admin/CompanyProjects";
import CompanyProjectStats from "../screens/admin/CompanyProjectStats";
import AdminProjectDetail from "../screens/admin/AdminProjectDetail";


// --- TIPOS DE PARÁMETROS PARA NAVEGACIÓN ---

// Parámetros para las Pestañas Principales (Tabs)
export type AdminTabParamList = {
  AdminDashboard: undefined;
  UserManagementStack: undefined;
  CompanyManagementStack: undefined;
  Reports: undefined;
  Settings: undefined;
};

// Parámetros para el Stack de Gestión de Usuarios
export type UserManagementStackParamList = {
  UserManagement: undefined;
  UserForm: { userId?: number; mode?: 'balance' | 'edit' };
};

// Parámetros para el Stack de Gestión de Empresas
export type CompanyManagementStackParamList = {
  CompanyManagement: undefined;
  CompanyDetail: { companyId: number, companyName: string };
  // --- Pantallas que faltaban ---
  CompanyEmployees: { companyId: number, companyName: string };
  CompanySales: { companyId: number, companyName: string };
  CompanyTasks: { companyId: number, companyName: string };
  CompanyProjects: { companyId: number, companyName: string };
  CompanyProjectStats: { companyId: number, companyName: string };
  AdminProjectDetail: { proyectoId: number, companyName: string };
};


// --- INICIALIZACIÓN DE NAVEGADORES ---
const Tab = createBottomTabNavigator<AdminTabParamList>();
const UserStack = createNativeStackNavigator<UserManagementStackParamList>();
const CompanyStack = createNativeStackNavigator<CompanyManagementStackParamList>();


// --- DEFINICIÓN DE STACKS DE NAVEGACIÓN ---

// Stack para el flujo de Gestión de Usuarios
const UserManagementStack = () => (
  <UserStack.Navigator screenOptions={{ headerShown: false }}>
    <UserStack.Screen name="UserManagement" component={UserManagementScreen} />
    <UserStack.Screen name="UserForm" component={UserFormScreen} />
  </UserStack.Navigator>
);

// Stack para el flujo de Gestión de Empresas (Corregido)
const CompanyManagementStack = () => (
  <CompanyStack.Navigator screenOptions={{ headerShown: false }}>
    <CompanyStack.Screen name="CompanyManagement" component={CompanyManagementScreen} />
    <CompanyStack.Screen name="CompanyDetail" component={CompanyDetailScreen} />
    
    {/* --- PANTALLAS AÑADIDAS AL NAVEGADOR --- */}
    <CompanyStack.Screen name="CompanyEmployees" component={CompanyEmployeesScreen} />
    <CompanyStack.Screen name="CompanySales" component={CompanySalesScreen} />
    <CompanyStack.Screen name="CompanyTasks" component={CompanyTasksScreen} />
    <CompanyStack.Screen name="CompanyProjects" component={CompanyProjects} />
    <CompanyStack.Screen name="CompanyProjectStats" component={CompanyProjectStats} />
    <CompanyStack.Screen name="AdminProjectDetail" component={AdminProjectDetail} />
  </CompanyStack.Navigator>
);

// --- NAVEGADOR PRINCIPAL DE PESTAÑAS (TABS) ---
const AdminTabNavigator = ({ onAuthChange, onRoleChange }) => (
  <Tab.Navigator
    tabBar={(props) => <AdminFloatingTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="AdminDashboard" component={AdminDashboard} options={{ tabBarLabel: 'Dashboard' }}/>
    <Tab.Screen name="UserManagementStack" component={UserManagementStack} options={{ tabBarLabel: 'Usuarios' }}/>
    <Tab.Screen name="CompanyManagementStack" component={CompanyManagementStack} options={{ tabBarLabel: 'Empresas' }}/>
    <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarLabel: 'Reportes' }}/>
    <Tab.Screen
      name="Settings"
      options={{ tabBarLabel: 'Ajustes' }}
    >
      {(props) => <SettingsScreen {...props} onAuthChange={onAuthChange} onRoleChange={onRoleChange} />}
    </Tab.Screen>
  </Tab.Navigator>
);


// --- COMPONENTE EXPORTADO ---
interface AdminNavigatorProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const AdminNavigator: React.FC<AdminNavigatorProps> = ({ onAuthChange, onRoleChange }) => (
  <AdminTabBarVisibilityProvider>
    <AdminTabNavigator onAuthChange={onAuthChange} onRoleChange={onRoleChange} />
  </AdminTabBarVisibilityProvider>
);

export default AdminNavigator;