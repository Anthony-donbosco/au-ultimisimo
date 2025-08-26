import type { NavigatorScreenParams } from '@react-navigation/native';

export type UserTabParamList = {
  Dashboard: undefined;
  Transacciones: undefined;
  Ingresos: undefined;
  Gastos: undefined;
  Facturas: undefined;
  Objetivos: undefined;
  Configuracion: undefined;
  Perfil: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  UserTabs: NavigatorScreenParams<UserTabParamList>;
};