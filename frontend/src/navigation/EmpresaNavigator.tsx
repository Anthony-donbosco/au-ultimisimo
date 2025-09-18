import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Pantallas de empresa
import EmpresaDashboard from "../screens/empresa/EmpresaDashboard";
import AprobacionGastos from "../screens/empresa/AprobacionGastos";
import GestionEmpleados from "../screens/empresa/GestionEmpleados";
import GestionProductos from "../screens/empresa/GestionProductos";
import DetalleGastoAprobacion from "../screens/empresa/DetalleGastoAprobacion";
import AsignarTarea from "../screens/empresa/AsignarTarea";
import TareasEmpresaMenu from "../screens/empresa/TareasEmpresaMenu";
import GestionProyectos from "../screens/empresa/GestionProyectos";
import CrearProyecto from "../screens/empresa/CrearProyecto";
import DetalleProyecto from "../screens/empresa/DetalleProyecto";
import VentasEmpleados from "../screens/empresa/VentasEmpleados";
import RegistrarVenta from "../screens/empleado/RegistrarVenta";

export type EmpresaStackParamList = {
  EmpresaDashboard: undefined;
  AprobacionGastos: undefined;
  GestionEmpleados: undefined;
  GestionProductos: undefined;
  DetalleGastoAprobacion: { gastoId: string };
  AsignarTarea: { empleadoId?: number; empleadoNombre?: string };
  TareasEmpresaMenu: { empleadoId?: number; empleadoNombre?: string };
  GestionProyectos: undefined;
  CrearProyecto: undefined;
  DetalleProyecto: { proyectoId: number };
  VentasEmpleados: undefined;
};

const Stack = createNativeStackNavigator<EmpresaStackParamList>();

interface EmpresaNavigatorProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const EmpresaNavigator: React.FC<EmpresaNavigatorProps> = ({
  onAuthChange,
  onRoleChange,
}) => {
  return (
    <Stack.Navigator 
      initialRouteName="EmpresaDashboard"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="EmpresaDashboard">
        {(props) => (
          <EmpresaDashboard
            {...props}
            onAuthChange={onAuthChange}
            onRoleChange={onRoleChange}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="AprobacionGastos"
        component={AprobacionGastos}
        options={{ title: 'Aprobación de Gastos' }}
      />

      <Stack.Screen
        name="GestionEmpleados"
        component={GestionEmpleados}
        options={{ title: 'Gestión de Empleados' }}
      />

      <Stack.Screen
        name="DetalleGastoAprobacion"
        component={DetalleGastoAprobacion}
        options={{ title: 'Detalle del Gasto' }}
      />

      <Stack.Screen
        name="AsignarTarea"
        component={AsignarTarea}
        options={{ title: 'Asignar Tarea' }}
      />
      <Stack.Screen
        name="TareasEmpresaMenu"
        component={TareasEmpresaMenu}
        options={{ title: 'Gestión de Tareas' }}
      />    
      <Stack.Screen
        name="GestionProductos"
        component={GestionProductos}
      />

      <Stack.Screen
        name="GestionProyectos"
        component={GestionProyectos}
        options={{ title: 'Gestión de Proyectos' }}
      />

      <Stack.Screen
        name="CrearProyecto"
        component={CrearProyecto}
        options={{ title: 'Crear Proyecto' }}
      />

      <Stack.Screen
        name="DetalleProyecto"
        component={DetalleProyecto}
        options={{ title: 'Detalle del Proyecto' }}
      />

      <Stack.Screen
        name="VentasEmpleados"
        component={VentasEmpleados}
        options={{ title: 'Ventas de Empleados' }}
      />
    </Stack.Navigator>
  );
};


export default EmpresaNavigator;