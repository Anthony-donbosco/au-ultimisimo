import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Pantallas de empleado
import EmpleadoDashboard from "../screens/empleado/EmpleadoDashboard";
import CrearGastoEmpleado from "../screens/empleado/CrearGastoEmpleado";
import MisGastos from "../screens/empleado/MisGastos";
import MisTareas from "../screens/empleado/MisTareas";
import DetalleTarea from "../screens/empleado/DetalleTarea";
import RegistrarVenta from "../screens/empleado/RegistrarVenta";
import MisVentas from "../screens/empleado/MisVentas";

export type EmpleadoStackParamList = {
  EmpleadoDashboard: undefined;
  CrearGastoEmpleado: undefined;
  MisGastos: undefined;
  MisTareas: undefined;
  DetalleTarea: { tareaId: number };
  RegistrarVenta: undefined;
  MisVentas: undefined;
};

const Stack = createNativeStackNavigator<EmpleadoStackParamList>();

interface EmpleadoNavigatorProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const EmpleadoNavigator: React.FC<EmpleadoNavigatorProps> = ({
  onAuthChange,
  onRoleChange,
}) => {
  return (
    <Stack.Navigator 
      initialRouteName="EmpleadoDashboard"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="EmpleadoDashboard">
        {(props) => (
          <EmpleadoDashboard
            {...props}
            onAuthChange={onAuthChange}
            onRoleChange={onRoleChange}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen
        name="CrearGastoEmpleado"
        component={CrearGastoEmpleado}
      />

      <Stack.Screen
        name="MisGastos"
        component={MisGastos}
      />

      <Stack.Screen
        name="MisTareas"
        component={MisTareas}
      />

      <Stack.Screen
        name="DetalleTarea"
        component={DetalleTarea}
      />
      <Stack.Screen
        name="RegistrarVenta"
        component={RegistrarVenta}
      />

      <Stack.Screen
        name="MisVentas"
        component={MisVentas}
      />
    </Stack.Navigator>
  );
};

export default EmpleadoNavigator;