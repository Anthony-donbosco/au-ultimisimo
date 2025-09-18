import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importa AsyncStorage

// 1. CORREGIR LA URL DEL ENDPOINT
const API_URL = 'http://192.168.0.4:5000/api/v1/financial/chat';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const Chatbot = ({ navigation }: { navigation: any }) => {
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 🚀 RATE LIMITING STATES
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);

  const COOLDOWN_DURATION = 4000; // 4 segundos entre mensajes

  // 🎯 MENSAJE DE BIENVENIDA
  useEffect(() => {
    const welcomeMessage: Message = {
      role: 'model',
      parts: [{
        text: `¡Hola! 👋 Soy Aureum IA, tu asistente financiero personal.\n\nPuedo ayudarte con:\n💰 Análisis de tus gastos e ingresos\n📊 Consejos para ahorrar\n🎯 Planificación de objetivos\n📈 Estrategias de inversión\n\n💡 Tip: Espera unos segundos entre preguntas para mantener el servicio estable 😊`
      }]
    };
    setMessages([welcomeMessage]);
  }, []);

  // Función para obtener el token al cargar la pantalla
  useEffect(() => {
    const getToken = async () => {
      const token = await AsyncStorage.getItem('token');
      setAuthToken(token);
    };
    getToken();
  }, []);

  // 🕐 COOLDOWN TIMER EFFECT
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (cooldownRemaining > 0) {
      interval = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            setRateLimitExceeded(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownRemaining]);

  const handleSendMessage = async () => {
    if (input.trim().length === 0 || isLoading) {
      return;
    }

    // 🚦 RATE LIMITING CHECK
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;

    if (timeSinceLastMessage < COOLDOWN_DURATION) {
      const remainingSeconds = Math.ceil((COOLDOWN_DURATION - timeSinceLastMessage) / 1000);
      setCooldownRemaining(remainingSeconds);
      setRateLimitExceeded(true);

      // 🎨 Mensaje amigable al usuario
      const rateLimitMessage: Message = {
        role: 'model',
        parts: [{
          text: `⏳ Por favor, espera ${remainingSeconds} segundos antes de enviar otra pregunta. Esto ayuda a mantener el servicio estable para todos 😊`
        }]
      };
      setMessages(prev => [...prev, rateLimitMessage]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    const userMessage: Message = { role: 'user', parts: [{ text: input.trim() }] };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setLastMessageTime(now);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // 2. AÑADIR EL TOKEN DE AUTENTICACIÓN A LA PETICIÓN
    if (!authToken) {
      const errorMessage: Message = { role: 'model', parts: [{ text: 'Error de autenticación. Por favor, reinicia sesión.' }] };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      setIsLoading(false);
      return;
    }

    try {
      const history = newMessages.slice(0, -1);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Descomentamos y usamos el token real
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: userMessage.parts[0].text,
          history: history,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // 🚨 MANEJO ESPECIAL PARA RATE LIMIT DE GEMINI
        if (response.status === 429) {
          // 🤫 NO hacer console.error para evitar pantalla roja
          console.log('ℹ️ Rate limit alcanzado, mostrando mensaje amigable al usuario');

          const geminiLimitMessage: Message = {
            role: 'model',
            parts: [{
              text: `🤖 ¡Ops! He estado muy ocupado respondiendo preguntas. Por favor espera un minuto antes de volver a preguntar.\n\n💡 Tip: Mientras tanto, puedes revisar mis respuestas anteriores o explorar otras secciones de la app.`
            }]
          };
          setMessages(prevMessages => [...prevMessages, geminiLimitMessage]);
          setIsLoading(false);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
          return; // ✅ SALIR AQUÍ - NO llegar al catch
        }

        // Solo hacer console.error para otros errores que SÍ necesitamos debuggear
        console.error('Error del API:', errorData);
        throw new Error(errorData.message || 'Error en la respuesta de la API');
      }

      const data = await response.json();
      const modelMessage: Message = { role: 'model', parts: [{ text: data.data.reply }] }; // Accedemos a data.data.reply

      setMessages(prevMessages => [...prevMessages, modelMessage]);

    } catch (error: any) {
      // 🎨 MENSAJES DE ERROR MÁS AMIGABLES SIN PANTALLA ROJA
      let errorText = "";
      let shouldLogError = true;

      if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
        errorText = "🌐 No puedo conectar con el servidor. Verifica tu conexión a internet.";
        shouldLogError = false; // Error común, no necesitamos debuggearlo
      } else if (error.message?.includes("timeout")) {
        errorText = "⏱️ La respuesta está tardando demasiado. Inténtalo de nuevo.";
        shouldLogError = false; // Error común, no necesitamos debuggearlo
      } else {
        errorText = `🤖 Lo siento, algo salió mal. Por favor intenta de nuevo en un momento.`;
        // Solo loggeamos errores inesperados que SÍ necesitamos debuggear
      }

      // Solo hacer console.error para errores que realmente necesitamos investigar
      if (shouldLogError) {
        console.error("Error inesperado al enviar mensaje:", error);
      } else {
        console.log(`ℹ️ Error manejado: ${error.message}`);
      }

      const errorMessage: Message = {
        role: 'model',
        parts: [{ text: errorText }]
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // El resto del componente (JSX) se mantiene igual...
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="sparkles" size={22} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Aureum IA</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={{ paddingVertical: 10 }}
        >
          {messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.modelBubble,
                isDarkMode && (msg.role === 'user' ? styles.darkUserBubble : styles.darkModelBubble),
              ]}
            >
              <Text style={[
                styles.messageText,
                isDarkMode && styles.darkText,
                msg.role === 'user' && { color: '#fff' }
              ]}>
                {msg.parts[0].text}
              </Text>
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageBubble, styles.modelBubble, isDarkMode && styles.darkModelBubble]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>

        {/* 🚦 RATE LIMIT INDICATOR */}
        {cooldownRemaining > 0 && (
          <View style={[styles.cooldownIndicator, isDarkMode && styles.darkCooldownIndicator]}>
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={[styles.cooldownText, isDarkMode && styles.darkText]}>
              Espera {cooldownRemaining} segundos para enviar otro mensaje
            </Text>
          </View>
        )}

        <View style={[styles.inputContainer, isDarkMode && styles.darkInputContainer]}>
          <TextInput
            style={[
              styles.input,
              isDarkMode && styles.darkInput,
              (isLoading || cooldownRemaining > 0) && styles.inputDisabled
            ]}
            value={input}
            onChangeText={setInput}
            placeholder={
              cooldownRemaining > 0
                ? `Espera ${cooldownRemaining}s...`
                : isLoading
                ? "Aureum está pensando..."
                : "Escribe tu mensaje..."
            }
            placeholderTextColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
            multiline
            editable={!isLoading && cooldownRemaining === 0}
          />

          {/* 🎨 SMART SEND BUTTON */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (isLoading || cooldownRemaining > 0 || input.trim().length === 0) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={isLoading || cooldownRemaining > 0 || input.trim().length === 0}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : cooldownRemaining > 0 ? (
              <Text style={styles.cooldownButtonText}>{cooldownRemaining}</Text>
            ) : (
              <Ionicons name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  darkContainer: { backgroundColor: colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  darkHeader: { backgroundColor: colors.dark.surface, borderBottomColor: colors.dark.border },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  darkText: { color: colors.dark.text },
  chatContainer: { flex: 1, paddingHorizontal: 10 },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    marginVertical: 5,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  modelBubble: {
    backgroundColor: colors.light.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  darkUserBubble: { backgroundColor: colors.primary },
  darkModelBubble: { backgroundColor: colors.dark.surface },
  messageText: { fontSize: 16, color: colors.light.text },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    alignItems: 'center',
  },
  darkInputContainer: { borderTopColor: colors.dark.border },
  input: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  darkInput: {
    backgroundColor: colors.dark.surface,
    color: colors.dark.text
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 🎨 NUEVOS ESTILOS PARA RATE LIMITING
  sendButtonDisabled: {
    backgroundColor: colors.light.textSecondary,
    opacity: 0.6,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  cooldownIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF3E0',
    borderTopWidth: 1,
    borderTopColor: colors.warning,
  },
  darkCooldownIndicator: {
    backgroundColor: '#2D1B0E',
  },
  cooldownText: {
    marginLeft: 6,
    fontSize: 14,
    color: colors.warning,
    fontWeight: '500',
  },
  cooldownButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Chatbot;