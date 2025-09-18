import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Handle notification properly without accessing deprecated properties
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

export interface NotificationConfig {
  title: string;
  body: string;
  data?: any;
  categoryIdentifier?: string;
  sound?: boolean | string;
  priority?: 'default' | 'low' | 'normal' | 'high' | 'max';
}

export interface ScheduledNotificationConfig extends NotificationConfig {
  trigger: {
    type: 'date' | 'daily' | 'weekly';
    date?: Date;
    hour?: number;
    minute?: number;
    weekday?: number; // 1-7, donde 1 = domingo
  };
}

class NotificationService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Solicitar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ No se obtuvieron permisos para notificaciones');
        return false;
      }

      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Canal para facturas
        await Notifications.setNotificationChannelAsync('bills', {
          name: 'Recordatorios de Facturas',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });

        // Canal para objetivos
        await Notifications.setNotificationChannelAsync('goals', {
          name: 'Objetivos Financieros',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#4CAF50',
        });

        // Canal para rachas
        await Notifications.setNotificationChannelAsync('streaks', {
          name: 'Recordatorios de Racha',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 100],
          lightColor: '#FFC107',
        });
      }

      this.isInitialized = true;
      console.log('✅ Servicio de notificaciones inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando notificaciones:', error);
      return false;
    }
  }

  // Enviar notificación inmediata
  async sendNotification(config: NotificationConfig): Promise<string | null> {
    if (!this.isInitialized) {
      console.log('⚠️ Servicio de notificaciones no inicializado');
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
          data: config.data || {},
          categoryIdentifier: config.categoryIdentifier,
          sound: config.sound !== false,
          priority: this.mapPriority(config.priority || 'normal'),
        },
        trigger: null, // Inmediato
      });

      console.log('📧 Notificación enviada:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
      return null;
    }
  }

  // Programar notificación
  async scheduleNotification(config: ScheduledNotificationConfig): Promise<string | null> {
    if (!this.isInitialized) {
      console.log('⚠️ Servicio de notificaciones no inicializado');
      return null;
    }

    try {
      let trigger: any = null;

      switch (config.trigger.type) {
        case 'date':
          if (config.trigger.date) {
            trigger = config.trigger.date;
          }
          break;

        case 'daily':
          trigger = {
            hour: config.trigger.hour || 9,
            minute: config.trigger.minute || 0,
            repeats: true,
          };
          break;

        case 'weekly':
          trigger = {
            weekday: config.trigger.weekday || 1,
            hour: config.trigger.hour || 9,
            minute: config.trigger.minute || 0,
            repeats: true,
          };
          break;
      }

      if (!trigger) {
        throw new Error('Trigger de notificación inválido');
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
          data: config.data || {},
          categoryIdentifier: config.categoryIdentifier,
          sound: config.sound !== false,
        },
        trigger,
      });

      console.log('⏰ Notificación programada:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error programando notificación:', error);
      return null;
    }
  }

  // Notificaciones específicas para la app
  async notifyBillDue(billName: string, amount: number, daysUntilDue: number): Promise<string | null> {
    const messages = {
      0: `¡Hoy vence tu factura de ${billName}! Monto: $${amount.toFixed(2)}`,
      1: `Mañana vence tu factura de ${billName}. Monto: $${amount.toFixed(2)}`,
      3: `En 3 días vence tu factura de ${billName}. Monto: $${amount.toFixed(2)}`
    };

    const message = messages[daysUntilDue as keyof typeof messages] || 
      `En ${daysUntilDue} días vence tu factura de ${billName}. Monto: $${amount.toFixed(2)}`;

    return this.sendNotification({
      title: '💸 Factura por Vencer',
      body: message,
      data: { type: 'bill_due', billName, amount, daysUntilDue },
      categoryIdentifier: 'bills',
      priority: daysUntilDue === 0 ? 'high' : 'normal',
    });
  }

  async notifyStreakReminder(): Promise<string | null> {
    return this.sendNotification({
      title: '🔥 ¡No rompas tu racha!',
      body: 'Registra algún gasto o ingreso hoy para mantener tu racha activa.',
      data: { type: 'streak_reminder' },
      categoryIdentifier: 'streaks',
      priority: 'normal',
    });
  }

  async notifyGoalProgress(goalName: string, progress: number): Promise<string | null> {
    const messages = {
      25: `¡Ya tienes 25% de tu objetivo "${goalName}"! 🎯`,
      50: `¡Mitad del camino! 50% de "${goalName}" completado 🎉`,
      75: `¡Casi lo logras! 75% de "${goalName}" alcanzado 🚀`,
      90: `¡Falta muy poco! 90% de "${goalName}" completado ⭐`,
      100: `¡FELICITACIONES! Has completado tu objetivo "${goalName}" 🏆`
    };

    const milestone = Object.keys(messages)
      .map(Number)
      .reverse()
      .find(m => progress >= m);

    if (!milestone) return null;

    return this.sendNotification({
      title: '🎯 Progreso en Objetivo',
      body: messages[milestone as keyof typeof messages],
      data: { type: 'goal_progress', goalName, progress },
      categoryIdentifier: 'goals',
      priority: progress === 100 ? 'high' : 'normal',
    });
  }

  async notifyBudgetExceeded(category: string, amount: number, budget: number): Promise<string | null> {
    const percentage = Math.round((amount / budget) * 100);
    return this.sendNotification({
      title: '⚠️ Presupuesto Excedido',
      body: `Has gastado $${amount.toFixed(2)} en ${category}, que es ${percentage}% de tu presupuesto mensual.`,
      data: { type: 'budget_exceeded', category, amount, budget, percentage },
      categoryIdentifier: 'default',
      priority: 'high',
    });
  }

  // Programar recordatorios diarios de racha
  async scheduleStreakReminders(): Promise<void> {
    // Cancelar recordatorios previos
    await this.cancelNotificationsByType('streak_reminder');

    // Programar recordatorio diario a las 8 PM
    await this.scheduleNotification({
      title: '🔥 Recordatorio de Racha',
      body: '¿Ya registraste alguna transacción hoy? ¡Mantén tu racha activa!',
      data: { type: 'streak_reminder' },
      categoryIdentifier: 'streaks',
      trigger: {
        type: 'daily',
        hour: 20,
        minute: 0,
      },
    });
  }

  // Cancelar notificación por ID
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancelar todas las notificaciones programadas
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Cancelar notificaciones por tipo
  async cancelNotificationsByType(type: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

      for (const notification of scheduledNotifications) {
        // Access data more safely to avoid deprecated warnings
        const notificationData = notification.content?.data;
        if (notificationData && typeof notificationData === 'object' && 'type' in notificationData) {
          if ((notificationData as any).type === type) {
            await this.cancelNotification(notification.identifier);
          }
        }
      }
    } catch (error) {
      console.error('Error cancelando notificaciones por tipo:', error);
    }
  }

  // Obtener notificaciones programadas
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Mapear prioridad a formato nativo
  private mapPriority(priority: string): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case 'low':
        return Notifications.AndroidNotificationPriority.LOW;
      case 'normal':
        return Notifications.AndroidNotificationPriority.DEFAULT;
      case 'high':
        return Notifications.AndroidNotificationPriority.HIGH;
      case 'max':
        return Notifications.AndroidNotificationPriority.MAX;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  // Verificar configuraciones de usuario
  async isNotificationEnabled(type: 'bills' | 'goals' | 'streaks' | 'general' = 'general'): Promise<boolean> {
    try {
      const setting = await AsyncStorage.getItem(`notifications_${type}`);
      return setting !== 'false'; // Por defecto habilitado
    } catch {
      return true;
    }
  }

  // Configurar notificaciones por tipo
  async setNotificationEnabled(type: 'bills' | 'goals' | 'streaks' | 'general', enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(`notifications_${type}`, enabled ? 'true' : 'false');
      
      if (!enabled) {
        // Si se deshabilitaron, cancelar notificaciones de ese tipo
        await this.cancelNotificationsByType(type);
      }
    } catch (error) {
      console.error(`Error configurando notificaciones ${type}:`, error);
    }
  }
}

export const notificationService = new NotificationService();