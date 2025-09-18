import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { RoleSelectionScreen } from '../screens/auth/RoleSelectionScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  EmailVerification: {
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    password: string;
  };
  RoleSelection: {
    googleUser: any;
    onRoleSelected: (role: number) => void;
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  onAuthChange: (isAuth: boolean) => void;
  onRoleChange: (role: number | null) => void;
}

const AuthNavigator: React.FC<AuthNavigatorProps> = ({
  onAuthChange,
  onRoleChange,
}) => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen 
            {...props} 
            onLogin={(usuario) => {
              onRoleChange(usuario.id_rol || usuario.tipo_usuario || 4);
              onAuthChange(true);
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => (
          <RegisterScreen 
            {...props} 
            onRegister={(usuario) => {
              onRoleChange(usuario.id_rol || usuario.tipo_usuario || 4);
              onAuthChange(true);
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="EmailVerification">
        {(props) => (
          <EmailVerificationScreen 
            {...props} 
            onVerificationSuccess={(usuario) => {
              onRoleChange(usuario.id_rol || usuario.tipo_usuario || 4);
              onAuthChange(true);
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen 
        name="RoleSelection"
        component={RoleSelectionScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;