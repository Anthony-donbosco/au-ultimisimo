import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';

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
              onRoleChange(usuario.tipo_usuario || 4);
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
              onRoleChange(usuario.tipo_usuario || 4);
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
              onRoleChange(usuario.tipo_usuario || 4);
              onAuthChange(true);
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AuthNavigator;