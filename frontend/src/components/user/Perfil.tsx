import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteProp } from '@react-navigation/native';
import { UserTabParamList } from '@/navigation/UserNavigator'; // Adjust path as needed

interface PerfilProps {
  route: RouteProp<UserTabParamList, 'Perfil'>;
  navigation: any; // or proper navigation type
  onAuthChange: (isAuth: boolean) => void;
}


interface DatosUsuario {
  id: string;
  nombreCompleto: string;
  email: string;
  usuario: string;
  numeroTelefono: string;
  fotoPerfilUri?: string;
}

interface CampoFormulario {
  id: keyof DatosUsuario;
  label: string;
  valor: string;
  placeholder: string;
  editable: boolean;
  tipo: 'texto' | 'email' | 'telefono';
}

export const Perfil: React.FC<PerfilProps> = ({ route, navigation, onAuthChange }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  
  const [datosUsuario, setDatosUsuario] = useState<DatosUsuario>({
    id: '',
    nombreCompleto: '',
    email: '',
    usuario: '',
    numeroTelefono: '',
    fotoPerfilUri: undefined,
  });

  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatosUsuario();
  }, []);

  const cargarDatosUsuario = async () => {
    try {
      setCargando(true);
      const usuarioGuardado = await AsyncStorage.getItem('usuario');
      if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);
        setDatosUsuario({
          id: usuario.id || '1',
          nombreCompleto: usuario.nombre || 'Rex Raptor',
          email: usuario.email || 'rexraptor@gmail.com',
          usuario: usuario.usuario || 'rexraptor045',
          numeroTelefono: usuario.telefono || '+503 7777-7777',
          fotoPerfilUri: usuario.fotoPerfilUri,
        });
      }
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
      Alert.alert(t("common.error"), t("profile.loadError"));
    } finally {
      setCargando(false);
    }
  };

  const guardarDatosUsuario = async () => {
    try {
      setGuardando(true);
      // await apiService.actualizarPerfil(datosUsuario);

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const usuarioActualizado = {
        ...datosUsuario,
        nombre: datosUsuario.nombreCompleto,
        telefono: datosUsuario.numeroTelefono,
      };
      
      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
      
      setModoEdicion(false);
      Alert.alert(t("common.success"), t("profile.updated"));
    } catch (error) {
      console.error('Error guardando datos:', error);
      Alert.alert(t("common.error"), t("profile.updateError"));
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarFoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("common.cancel"), t("profile.takePhoto"), t("profile.pickFromGallery")],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            abrirCamara();
          } else if (buttonIndex === 2) {
            abrirGaleria();
          }
        }
      );
    } else {
      Alert.alert(
        t("profile.changePhoto"),
        t("profile.selectOption"),
        [
          { text: t("common.cancel"), style: 'cancel' },
          { text: t("profile.takePhoto"), onPress: abrirCamara },
          { text: t("profile.gallery"), onPress: abrirGaleria },
        ]
      );
    }
  };

  const abrirCamara = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t("common.permissionDenied"), t("profile.cameraAccessNeeded"));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setDatosUsuario(prev => ({
          ...prev,
          fotoPerfilUri: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Error abriendo cámara:', error);
      Alert.alert(t("common.error"), t("profile.openCameraError"));
    }
  };

  const abrirGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t("common.permissionDenied"), t("profile.galleryAccessNeeded"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setDatosUsuario(prev => ({
          ...prev,
          fotoPerfilUri: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Error abriendo galería:', error);
      Alert.alert(t("common.error"), t("profile.openGalleryError"));
    }
  };

  const handleCancelarEdicion = () => {
    setModoEdicion(false);
    cargarDatosUsuario();
  };

  const actualizarCampo = (campo: keyof DatosUsuario, valor: string) => {
    setDatosUsuario(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const camposFormulario: CampoFormulario[] = [
    {
      id: 'nombreCompleto',
      label: t("profile.fullName"),
      valor: datosUsuario.nombreCompleto,
      placeholder: t("profile.fullNamePlaceholder"),
      editable: true,
      tipo: 'texto',
    },
    {
      id: 'email',
      label: t("profile.email"),
      valor: datosUsuario.email,
      placeholder: t("profile.emailPlaceholder"),
      editable: false,
      tipo: 'email',
    },
    {
      id: 'usuario',
      label: t("profile.username"),
      valor: datosUsuario.usuario,
      placeholder: t("profile.usernamePlaceholder"),
      editable: true,
      tipo: 'texto',
    },
    {
      id: 'numeroTelefono', // (corregido para que edite el campo correcto)
      label: t("profile.phoneNumber"),
      valor: datosUsuario.numeroTelefono,
      placeholder: t("profile.phonePlaceholder"),
      editable: true,
      tipo: 'telefono',
    },
  ];

  const renderCampo = (campo: CampoFormulario) => {
    const themeStyles = isDarkMode ? darkStyles : lightStyles;
    const esEditable = modoEdicion && campo.editable;

    return (
      <View key={campo.id} style={styles.campoContainer}>
        <Text style={[styles.label, themeStyles.label]}>{campo.label}</Text>
        {esEditable ? (
          <TextInput
            style={[styles.input, themeStyles.input]}
            value={campo.valor}
            onChangeText={(valor) => actualizarCampo(campo.id as keyof DatosUsuario, valor)}
            placeholder={campo.placeholder}
            placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
            keyboardType={campo.tipo === 'email' ? 'email-address' : campo.tipo === 'telefono' ? 'phone-pad' : 'default'}
            autoCapitalize={campo.tipo === 'email' ? 'none' : 'words'}
          />
        ) : (
          <View style={[styles.valorContainer, themeStyles.valorContainer]}>
            <Text style={[styles.valor, themeStyles.valor, !campo.editable && styles.valorNoEditable]}>
              {campo.valor || t("common.notAvailable")}
            </Text>
            {!campo.editable && (
              <Ionicons 
                name="lock-closed" 
                size={16} 
                color={isDarkMode ? '#64748b' : '#94a3b8'} 
              />
            )}
          </View>
        )}
      </View>
    );
  };

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  if (cargando) {
    return (
      <SafeAreaView style={[styles.container, themeStyles.container]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, themeStyles.text]}>{t("profile.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <View style={[styles.header, themeStyles.header]}>
        <Text style={[styles.headerTitle, themeStyles.headerTitle]}>{t("profile.title")}</Text>
        <TouchableOpacity
          onPress={() => (modoEdicion ? guardarDatosUsuario() : setModoEdicion(true))}
          disabled={guardando}
          style={[styles.actionButton, guardando && styles.actionButtonDisabled]}
        >
          <Text style={styles.actionButtonText}>
            {guardando ? t("common.saving") : (modoEdicion ? t("common.save") : t("common.edit"))}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, themeStyles.card]}>
          {/* Sección de Foto de Perfil */}
          <View style={styles.fotoSection}>
            <TouchableOpacity 
              style={styles.fotoContainer}
              onPress={modoEdicion ? handleCambiarFoto : undefined}
              disabled={!modoEdicion}
            >
              {datosUsuario.fotoPerfilUri ? (
                <Image 
                  source={{ uri: datosUsuario.fotoPerfilUri }} 
                  style={styles.fotoPerfil} 
                />
              ) : (
                <View style={[styles.avatarPlaceholder, themeStyles.avatarPlaceholder]}>
                  <Ionicons 
                    name="person" 
                    size={60} 
                    color={isDarkMode ? '#64748b' : '#94a3b8'} 
                  />
                </View>
              )}
              {modoEdicion && (
                <View style={styles.editIconOverlay}>
                  <Ionicons name="camera" size={20} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.fotoLabel, themeStyles.secondaryText]}>
              {t("profile.profilePhoto")}
            </Text>
            {modoEdicion && (
              <Text style={[styles.fotoHint, themeStyles.secondaryText]}>
                {t("profile.changeProfilePhoto")}
              </Text>
            )}
          </View>

          {/* Campos del Formulario */}
          <View style={styles.formSection}>
            {camposFormulario.map(renderCampo)}
          </View>

          {/* Botones de Acción */}
          {modoEdicion && (
            <View style={styles.buttonSection}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelarEdicion}
              >
                <Text style={styles.cancelButtonText}>{t("profile.cancelChanges")}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={guardarDatosUsuario}
                disabled={guardando}
              >
                <Text style={styles.saveButtonText}>
                  {guardando ? t("profile.savingChanges") : t("profile.saveChanges")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Información Adicional */}
          <View style={styles.infoSection}>
            <View style={[styles.infoCard, themeStyles.infoCard]}>
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={isDarkMode ? '#60a5fa' : '#3b82f6'} 
              />
              <Text style={[styles.infoText, themeStyles.secondaryText]}>
                {t("profile.informationWarningProfile")}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  fotoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  fotoContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  fotoPerfil: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fotoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fotoHint: {
    fontSize: 12,
    marginTop: 4,
  },
  formSection: {
    gap: 20,
  },
  campoContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  valorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  valor: {
    fontSize: 16,
    flex: 1,
  },
  valorNoEditable: {
    opacity: 0.7,
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748b',
  },
  saveButton: {
    backgroundColor: '#f59e0b',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    color: '#1e293b',
  },
  card: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  text: {
    color: '#1e293b',
  },
  secondaryText: {
    color: '#64748b',
  },
  label: {
    color: '#374151',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    color: '#1e293b',
  },
  valorContainer: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  valor: {
    color: '#1e293b',
  },
  avatarPlaceholder: {
    backgroundColor: '#f8fafc',
    borderColor: '#d1d5db',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  headerTitle: {
    color: '#f1f5f9',
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: {
    color: '#f1f5f9',
  },
  secondaryText: {
    color: '#94a3b8',
  },
  label: {
    color: '#e2e8f0',
  },
  input: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderColor: '#475569',
    color: '#f1f5f9',
  },
  valorContainer: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderColor: '#475569',
  },
  valor: {
    color: '#f1f5f9',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderColor: '#475569',
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
});