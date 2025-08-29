// src/components/user/Configuracion.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { UserTabParamList } from '@/navigation/UserNavigator';
import { useTabBarVisibility } from '../../navigation/useTabBarVisibility';


// Import funciones de idioma
import {
  getCurrentLanguageMode,
  changeLanguage,
} from '../../i18n/i18n';

interface ConfiguracionProps {
  route: RouteProp<UserTabParamList, 'Configuracion'>;
  navigation: any;
  onAuthChange: (isAuth: boolean) => void;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

type LanguageMode = 'en' | 'es' | 'auto';

interface LanguageOption {
  code: LanguageMode;
  name: string;       // nombre en UI (en el idioma actual)
  nativeName: string; // nombre nativo
  flag: string;
}

// ===== MOCK TEMPORAL =====
// Quita esto cuando conectes backend real
const MOCK_USER: Usuario = {
  id: '1',
  nombre: 'Aureum User',
  email: 'user@aureum.com',
};
// =========================

export const Configuracion: React.FC<ConfiguracionProps> = ({ route, navigation, onAuthChange }) => {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const nav = useNavigation();

  const [datosUsuario, setDatosUsuario] = useState<Usuario | null>(null);
  const [notificacionesEmail, setNotificacionesEmail] = useState(false);
  const [notificacionesPush, setNotificacionesPush] = useState(true);
  const [sincronizacionAutomatica, setSincronizacionAutomatica] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguageMode, setCurrentLanguageMode] = useState<LanguageMode>('auto');
  const [languageLoading, setLanguageLoading] = useState(false);
  const { setIsVisible } = useTabBarVisibility();

  const lastOffsetY = useRef(0);
    const lastAction = useRef<"show" | "hide">("show");
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = async () => {
      setRefreshing(true);
      await cargarDatosUsuario();
      setRefreshing(false);
    };

  // Actualiza el título del header al cambiar idioma
  useEffect(() => {
    navigation?.setOptions?.({ title: t('settings.title') });
  }, [navigation, t, i18n.language]);

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

  // Opciones de idioma (se recalculan al cambiar idioma)
  const languageOptions: LanguageOption[] = useMemo(
    () => [
      {
        code: 'auto',
        name: t('language.automatic'),
        nativeName: t('language.automatic'),
        flag: '📱',
      },
      {
        code: 'en',
        name: t('language.english'),
        nativeName: t('language.english'),
        flag: '🇺🇸',
      },
      {
        code: 'es',
        name: t('language.spanish'),
        nativeName: t('language.spanish'),
        flag: '🇸🇻',
      },
    ],
    [t, i18n.language]
  );

  useEffect(() => {
    cargarConfiguraciones();
    loadCurrentLanguage();
  }, []);

  // Rehidratación cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      cargarDatosUsuario();
    }, [])
  );

  const loadCurrentLanguage = async () => {
    try {
      const mode = await getCurrentLanguageMode();
      setCurrentLanguageMode(mode);
    } catch (error) {
      console.error('Error loading language mode:', error);
    }
  };

  // --------- Utilidades seguras para AsyncStorage ---------
  const safeParse = (v: string | null) => {
    try {
      if (!v || v === 'null' || v === 'undefined') return null;
      const obj = JSON.parse(v);
      if (obj && typeof obj === 'object') return obj;
      return null;
    } catch {
      return null;
    }
  };

  const normalizarUsuario = (u: any): Usuario | null => {
    if (!u) return null;
    const id = String(u.id ?? u.usuario_id ?? u.userId ?? '').trim();
    const nombre = String(u.nombre ?? u.nombreCompleto ?? u.name ?? '').trim();
    const email = String(u.email ?? u.correo ?? u.mail ?? '').trim();
    if (!id || !nombre || !email) return null;
    return { id, nombre, email };
  };
  // -------------------------------------------------------

  const cargarDatosUsuario = async () => {
    setCargando(true);
    try {
      const raw = await AsyncStorage.getItem('usuario');
      const parsed = safeParse(raw);
      let normalizado = normalizarUsuario(parsed);

      // Si no hay usuario (mock temporal), persistimos y usamos MOCK_USER
      if (!normalizado) {
        await AsyncStorage.setItem('usuario', JSON.stringify(MOCK_USER));
        normalizado = MOCK_USER;
      }

      setDatosUsuario(normalizado);
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
      setDatosUsuario(null);
    } finally {
      setCargando(false);
    }
  };

  const cargarConfiguraciones = async () => {
    try {
      const notifEmail = await AsyncStorage.getItem('notificacionesEmail');
      const notifPush = await AsyncStorage.getItem('notificacionesPush');
      const sincronAuto = await AsyncStorage.getItem('sincronizacionAutomatica');

      if (notifEmail !== null) setNotificacionesEmail(JSON.parse(notifEmail));
      if (notifPush !== null) setNotificacionesPush(JSON.parse(notifPush));
      if (sincronAuto !== null) setSincronizacionAutomatica(JSON.parse(sincronAuto));
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    }
  };

  const guardarConfiguracion = async (clave: string, valor: boolean) => {
    try {
      await AsyncStorage.setItem(clave, JSON.stringify(valor));
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  };

  const handleToggleNotificacionesEmail = (valor: boolean) => {
    setNotificacionesEmail(valor);
    guardarConfiguracion('notificacionesEmail', valor);
  };

  const handleToggleNotificacionesPush = (valor: boolean) => {
    setNotificacionesPush(valor);
    guardarConfiguracion('notificacionesPush', valor);
  };

  const handleToggleSincronizacion = (valor: boolean) => {
    setSincronizacionAutomatica(valor);
    guardarConfiguracion('sincronizacionAutomatica', valor);
  };

  const handleLanguageChange = async (languageMode: LanguageMode) => {
    try {
      setLanguageLoading(true);
      await changeLanguage(languageMode); // <- cambia el idioma en i18n y persiste el modo
      setCurrentLanguageMode(languageMode);
      setShowLanguageModal(false);
      Alert.alert(
        t('common.success'),
        t('language.changeSuccess'),
        [{ text: t('common.done'), style: 'default' }]
      );
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(
        t('common.error'),
        t('language.changeError'),
        [{ text: t('common.retry'), style: 'default' }]
      );
    } finally {
      setLanguageLoading(false);
    }
  };

  // Nueva función para navegar al perfil
  const navegarAPerfil = () => {
    // @ts-ignore
    nav.navigate('Perfil');
  };

  const getCurrentLanguageOption = (): LanguageOption => {
    return languageOptions.find(option => option.code === currentLanguageMode) || languageOptions[0];
  };

  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <SafeAreaView style={[
        styles.modalContainer,
        isDarkMode && styles.darkModalContainer,
      ]}>
        <View style={[styles.modalHeader, isDarkMode && styles.darkModalHeader]}>
          <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
            <Text style={[styles.cancelButton, isDarkMode && styles.darkCancelButton]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>
            {t('language.selectLanguage')}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.languageList}>
          {languageOptions.map((option) => (
            <TouchableOpacity
              key={option.code}
              style={[
                styles.languageOption,
                isDarkMode && styles.darkLanguageOption,
                currentLanguageMode === option.code && styles.selectedLanguageOption,
              ]}
              onPress={() => handleLanguageChange(option.code)}
              activeOpacity={0.7}
              disabled={languageLoading}
            >
              <View style={styles.languageOptionLeft}>
                <Text style={styles.languageFlag}>{option.flag}</Text>
                <View style={styles.languageTexts}>
                  <Text style={[
                    styles.languageOptionTitle,
                    isDarkMode && styles.darkLanguageOptionTitle,
                  ]}>
                    {option.nativeName}
                  </Text>
                  <Text style={[
                    styles.languageOptionSubtitle,
                    isDarkMode && styles.darkLanguageOptionSubtitle,
                  ]}>
                    {option.name}
                  </Text>
                </View>
              </View>

              <View style={styles.languageOptionRight}>
                {currentLanguageMode === option.code && (
                  <>
                    <Text style={[styles.currentLabel, { color: '#f59e0b' }]}>
                      {t('language.current')}
                    </Text>
                    <Ionicons name="checkmark" size={24} color="#f59e0b" />
                  </>
                )}
                {languageLoading && (
                  <ActivityIndicator size="small" color="#f59e0b" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  if (cargando) {
    return (
      <SafeAreaView style={[styles.container, themeStyles.container]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, themeStyles.text]}>
            {t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <View style={[styles.header, themeStyles.header]}>
        <Text style={[styles.headerTitle, themeStyles.headerTitle]}>
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Información del Usuario - Ahora clickeable y resiliente */}
        {datosUsuario && (
          <TouchableOpacity
            style={[styles.userSection, themeStyles.card, styles.userSectionClickable]}
            onPress={navegarAPerfil}
            activeOpacity={0.7}
          >
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {(datosUsuario.nombre?.slice(0, 2) || 'AU').toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, themeStyles.text]}>
                  {datosUsuario.nombre || 'Usuario'}
                </Text>
                <Text style={[styles.userEmail, themeStyles.secondaryText]}>
                  {datosUsuario.email || '—'}
                </Text>
              </View>
              <View style={styles.userChevron}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDarkMode ? '#94a3b8' : '#64748b'}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Sección General */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>
            {t('settings.general')}
          </Text>
          <View style={[styles.sectionCard, themeStyles.card]}>

            {/* Modo Oscuro */}
            <View style={[styles.itemContainer, themeStyles.itemContainer]}>
              <View style={styles.itemContent}>
                <View style={[styles.iconContainer, themeStyles.iconContainer]}>
                  <Ionicons
                    name={isDarkMode ? 'moon' : 'sunny'}
                    size={20}
                    color="#f59e0b"
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.itemTitle, themeStyles.itemTitle]}>
                    {t('settings.darkMode')}
                  </Text>
                  <Text style={[styles.itemDescription, themeStyles.itemDescription]}>
                    {t('settings.appearance')}
                  </Text>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#767577', true: '#f59e0b' }}
                  thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Selector de Idioma */}
            <View style={[styles.itemContainer, themeStyles.itemContainer]}>
              <View style={styles.itemContent}>
                <View style={[styles.iconContainer, themeStyles.iconContainer]}>
                  <Ionicons name="language" size={20} color="#f59e0b" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.itemTitle, themeStyles.itemTitle]}>
                    {t('settings.language')}
                  </Text>
                  <Text style={[styles.itemDescription, themeStyles.itemDescription]}>
                    {t('language.selectLanguage')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.languageSelector}
                  onPress={() => setShowLanguageModal(true)}
                  disabled={languageLoading}
                >
                  {languageLoading ? (
                    <ActivityIndicator size="small" color="#f59e0b" />
                  ) : (
                    <>
                      <Text style={[styles.languageText, themeStyles.itemTitle]}>
                        {getCurrentLanguageOption().flag} {getCurrentLanguageOption().nativeName}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={isDarkMode ? '#94a3b8' : '#64748b'}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Notificaciones Email */}
            <View style={[styles.itemContainer, themeStyles.itemContainer]}>
              <View style={styles.itemContent}>
                <View style={[styles.iconContainer, themeStyles.iconContainer]}>
                  <Ionicons name="mail" size={20} color="#f59e0b" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.itemTitle, themeStyles.itemTitle]}>
                    {t('settings.emailNotifications')}
                  </Text>
                  <Text style={[styles.itemDescription, themeStyles.itemDescription]}>
                    {t('settings.emailNotificationsDesc')}
                  </Text>
                </View>
                <Switch
                  value={notificacionesEmail}
                  onValueChange={handleToggleNotificacionesEmail}
                  trackColor={{ false: '#767577', true: '#f59e0b' }}
                  thumbColor={notificacionesEmail ? '#ffffff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Notificaciones Push */}
            <View style={[styles.itemContainer, themeStyles.itemContainer]}>
              <View style={styles.itemContent}>
                <View style={[styles.iconContainer, themeStyles.iconContainer]}>
                  <Ionicons name="notifications" size={20} color="#f59e0b" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.itemTitle, themeStyles.itemTitle]}>
                    {t('settings.pushNotifications')}
                  </Text>
                  <Text style={[styles.itemDescription, themeStyles.itemDescription]}>
                    {t('settings.pushNotificationsDesc')}
                  </Text>
                </View>
                <Switch
                  value={notificacionesPush}
                  onValueChange={handleToggleNotificacionesPush}
                  trackColor={{ false: '#767577', true: '#f59e0b' }}
                  thumbColor={notificacionesPush ? '#ffffff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Sincronización */}
            <View style={[styles.itemContainer, themeStyles.itemContainer]}>
              <View style={styles.itemContent}>
                <View style={[styles.iconContainer, themeStyles.iconContainer]}>
                  <Ionicons name="sync" size={20} color="#f59e0b" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.itemTitle, themeStyles.itemTitle]}>
                    {t('settings.autoSync')}
                  </Text>
                  <Text style={[styles.itemDescription, themeStyles.itemDescription]}>
                    {t('settings.autoSyncDesc')}
                  </Text>
                </View>
                <Switch
                  value={sincronizacionAutomatica}
                  onValueChange={handleToggleSincronizacion}
                  trackColor={{ false: '#767577', true: '#f59e0b' }}
                  thumbColor={sincronizacionAutomatica ? '#ffffff' : '#f4f3f4'}
                />
              </View>
            </View>

          </View>
        </View>

        {/* Información de la App */}
        <View style={styles.appInfoSection}>
          <Text style={[styles.appInfoText, themeStyles.secondaryText]}>
            Aureum v1.0.0
          </Text>
          <Text style={[styles.appInfoText, themeStyles.secondaryText]}>
            © 2025 Aureum. {t('language.current')}
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Idioma */}
      {renderLanguageModal()}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userSection: {
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  userSectionClickable: {},
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  userChevron: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemContainer: {
    borderBottomWidth: 1,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 14,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    minWidth: 120,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  appInfoSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  darkModalContainer: {
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  darkModalHeader: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  darkModalTitle: {
    color: '#f1f5f9',
  },
  cancelButton: {
    fontSize: 16,
    color: '#64748b',
  },
  darkCancelButton: {
    color: '#94a3b8',
  },
  languageList: {
    flex: 1,
    paddingVertical: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  darkLanguageOption: {
    backgroundColor: '#1e293b',
  },
  selectedLanguageOption: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  languageOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageTexts: {
    flex: 1,
  },
  languageOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  darkLanguageOptionTitle: {
    color: '#f1f5f9',
  },
  languageOptionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  darkLanguageOptionSubtitle: {
    color: '#94a3b8',
  },
  languageOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
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
  sectionTitle: {
    color: '#1e293b',
  },
  itemContainer: {
    borderBottomColor: '#f1f5f9',
  },
  itemTitle: {
    color: '#1e293b',
  },
  itemDescription: {
    color: '#64748b',
  },
  iconContainer: {
    backgroundColor: '#f8fafc',
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
  sectionTitle: {
    color: '#f1f5f9',
  },
  itemContainer: {
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  itemTitle: {
    color: '#f1f5f9',
  },
  itemDescription: {
    color: '#94a3b8',
  },
  iconContainer: {
    backgroundColor: '#334155',
  },
});
