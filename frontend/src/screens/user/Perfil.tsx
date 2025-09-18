import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshControl,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteProp } from '@react-navigation/native';
import { colors } from '../../styles/colors';
import { UserTabParamList } from '@/navigation/UserNavigator';
import { useTabBarVisibility } from '../../navigation/useTabBarVisibility';
import { formatCurrency, formatDate } from '../../utils/networkUtils';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';


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
  const { setIsVisible } = useTabBarVisibility();
  const { user, getCurrentUser } = useAuth();
  const lastOffsetY = useRef(0);
  const lastAction = useRef<"show" | "hide">("show");
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatosUsuario();
    setRefreshing(false);
  };

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;

    // Mostrar solo si está en el tope absoluto
    if (y <= 2 && lastAction.current !== "show") {
      setIsVisible(true);
      lastAction.current = "show";
      lastOffsetY.current = y;
      return;
    }

    const delta = y - lastOffsetY.current;
    const THRESHOLD = 1; // umbral mínimo para detectar cualquier movimiento

    if (Math.abs(delta) < THRESHOLD) return;

    if (delta > 0 && lastAction.current !== "hide") {
      // Cualquier scroll hacia abajo → ocultar inmediatamente
      setIsVisible(false);
      lastAction.current = "hide";
    } else if (delta < 0 && lastAction.current !== "show") {
      // Scroll hacia arriba → mostrar
      setIsVisible(true);
      lastAction.current = "show";
    }

    lastOffsetY.current = y;
  }, [setIsVisible]);
  
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
      
      let usuario = null;
      
      // 1. Priorizar usuario del contexto de autenticación (más actualizado)
      if (user) {
        usuario = user;
        console.log('📱 Cargando usuario desde AuthContext:', usuario);
      } else {
        // 2. Intentar obtener usuario actualizado del backend
        try {
          const usuarioActualizado = await getCurrentUser();
          if (usuarioActualizado) {
            usuario = usuarioActualizado;
            console.log('📱 Usuario obtenido desde backend:', usuario);
          }
        } catch (error) {
          console.log('⚠️ No se pudo obtener usuario del backend, usando AsyncStorage');
        }
        
        // 3. Fallback a AsyncStorage
        if (!usuario) {
          const [usuarioGuardado, userGuardado] = await Promise.all([
            AsyncStorage.getItem('usuario'),
            AsyncStorage.getItem('user')
          ]);
          
          // Priorizar 'user' (authService) sobre 'usuario' (legacy)
          if (userGuardado) {
            usuario = JSON.parse(userGuardado);
            console.log('📱 Cargando usuario desde AsyncStorage "user":', usuario);
          } else if (usuarioGuardado) {
            usuario = JSON.parse(usuarioGuardado);
            console.log('📱 Cargando usuario desde AsyncStorage "usuario" (legacy):', usuario);
          }
        }
      }
      
      if (usuario) {
        // Mapear datos del usuario a la interfaz del perfil
        const nombreCompleto = usuario.first_name && usuario.last_name 
          ? `${usuario.first_name} ${usuario.last_name}`.trim()
          : usuario.nombre || usuario.username || 'Usuario';
          
        setDatosUsuario({
          id: usuario.id?.toString() || usuario.user_id?.toString() || '',
          nombreCompleto,
          email: usuario.email || '',
          usuario: usuario.username || usuario.usuario || '',
          numeroTelefono: usuario.telefono || usuario.phone || '',
          fotoPerfilUri: usuario.fotoPerfilUri || usuario.profile_picture_url || usuario.picture,
        });
        console.log('✅ Datos de usuario cargados correctamente en perfil');
      } else {
        console.log('⚠️ No se encontraron datos de usuario disponibles');
        setDatosUsuario({
          id: '',
          nombreCompleto: 'Usuario',
          email: 'No disponible',
          usuario: 'No disponible',
          numeroTelefono: '',
          fotoPerfilUri: undefined,
        });
      }
    } catch (error) {
      console.error('❌ Error cargando datos de usuario:', error);
      Alert.alert(
        t("common.error") || "Error", 
        t("profile.loadError") || "Error cargando datos del perfil"
      );
    } finally {
      setCargando(false);
    }
  };

  
  const guardarDatosUsuario = async () => {
    try {
      setGuardando(true);
      console.log('💾 Guardando datos del perfil...');

      let avatarUrl = datosUsuario.fotoPerfilUri;

      // 1. Si hay una nueva foto local, subirla primero
      if (datosUsuario.fotoPerfilUri && 
          (datosUsuario.fotoPerfilUri.startsWith('file://') || 
           datosUsuario.fotoPerfilUri.startsWith('content://') ||
           datosUsuario.fotoPerfilUri.includes('ImagePicker'))) {
        
        console.log('📸 Subiendo nueva foto...');
        const uploadResult = await authService.uploadAvatar(datosUsuario.fotoPerfilUri);
        
        if (uploadResult.success && uploadResult.imageUrl) {
          avatarUrl = uploadResult.imageUrl;
          console.log('✅ Foto subida exitosamente:', avatarUrl);
        } else {
          console.warn('⚠️ Error subiendo foto:', uploadResult.message);
          Alert.alert(
            t("common.warning"), 
            `${t("profile.uploadPhotoError")}: ${uploadResult.message}. ${t("profile.otherDataWillBeSaved")}`
          );
        }
      }

      // 2. Actualizar datos del perfil en el backend
      const nameParts = datosUsuario.nombreCompleto.trim().split(' ');
      const profileData = {
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        username: datosUsuario.usuario,
      };

      console.log('📝 Actualizando perfil en backend...');
      const updateResult = await authService.updateProfile(profileData);
      
      if (updateResult.success) {
        console.log('✅ Perfil actualizado en backend');
        
        // 3. Actualizar localStorage para compatibilidad (opcional)
        const usuarioActualizado = {
          ...datosUsuario,
          nombre: datosUsuario.nombreCompleto,
          telefono: datosUsuario.numeroTelefono,
          picture: avatarUrl,
          profile_picture_url: avatarUrl,
        };
        await AsyncStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
        
        // 4. Recargar datos del usuario actualizados
        await cargarDatosUsuario();
        
        setModoEdicion(false);
        Alert.alert(t("common.success"), t("profile.updated"));
      } else {
        console.error('❌ Error actualizando perfil:', updateResult.message);
        Alert.alert(t("common.error"), updateResult.message || t("profile.updateError"));
      }
      
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
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
        mediaTypes: ImagePicker.MediaType.Images,
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
        mediaTypes: ImagePicker.MediaType.Images,
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

      <ScrollView
              style={styles.scrollView}
              onScroll={handleScroll}           // ← NEW
              scrollEventThrottle={16}          // ← NEW
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            >
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
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
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
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderWidth: 1.5,
    borderColor: colors.light.textSecondary,
    shadowColor: 'rgba(100, 116, 139, 0.2)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButtonText: {
    color: colors.light.textSecondary,
    fontWeight: '700',
    fontSize: 15,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
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
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333333',
  },
  headerTitle: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#1a1a1a',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  text: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#cccccc',
  },
  label: {
    color: '#cccccc',
  },
  input: {
    backgroundColor: '#333333',
    borderColor: '#555555',
    color: '#ffffff',
  },
  valorContainer: {
    backgroundColor: '#333333',
    borderColor: '#555555',
  },
  valor: {
    color: '#ffffff',
  },
  avatarPlaceholder: {
    backgroundColor: '#333333',
    borderColor: '#555555',
  },
  infoCard: {
    backgroundColor: colors.infoLight,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark.background,
  },
  header: {
    backgroundColor: colors.dark.surface,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    color: colors.dark.text,
  },
  card: {
    backgroundColor: colors.dark.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: {
    color: colors.dark.text,
  },
  secondaryText: {
    color: colors.dark.textSecondary,
  },
  label: {
    color: colors.dark.text,
  },
  input: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
    color: colors.dark.text,
  },
  valorContainer: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
  valor: {
    color: colors.dark.text,
  },
  avatarPlaceholder: {
    backgroundColor: colors.dark.surfaceSecondary,
    borderColor: colors.dark.border,
  },
  infoCard: {
    backgroundColor: colors.infoDark,
  },
});