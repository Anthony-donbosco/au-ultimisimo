import { useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notificationService';

export interface UseNotificationsOptions {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
  autoInitialize?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    onNotificationReceived,
    onNotificationResponse,
    autoInitialize = true
  } = options;

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Inicializar el servicio de notificaciones
  const initializeNotifications = useCallback(async () => {
    try {
      const success = await notificationService.initialize();
      if (success) {
        console.log('✅ Notificaciones inicializadas correctamente');
      }
      return success;
    } catch (error) {
      console.error('❌ Error inicializando notificaciones:', error);
      return false;
    }
  }, []);

  // Configurar listeners de notificaciones
  useEffect(() => {
    if (autoInitialize) {
      initializeNotifications();
    }

    // Listener para notificaciones recibidas mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📧 Notificación recibida:', notification);
        onNotificationReceived?.(notification);
      }
    );

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notificación tocada:', response);
        onNotificationResponse?.(response);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [autoInitialize, onNotificationReceived, onNotificationResponse, initializeNotifications]);

  // Métodos específicos para la app
  const notifyBillDue = useCallback(async (billName: string, amount: number, daysUntilDue: number) => {
    const isEnabled = await notificationService.isNotificationEnabled('bills');
    if (!isEnabled) return null;
    
    return notificationService.notifyBillDue(billName, amount, daysUntilDue);
  }, []);

  const notifyStreakReminder = useCallback(async () => {
    const isEnabled = await notificationService.isNotificationEnabled('streaks');
    if (!isEnabled) return null;
    
    return notificationService.notifyStreakReminder();
  }, []);

  const notifyGoalProgress = useCallback(async (goalName: string, progress: number) => {
    const isEnabled = await notificationService.isNotificationEnabled('goals');
    if (!isEnabled) return null;
    
    return notificationService.notifyGoalProgress(goalName, progress);
  }, []);

  const notifyBudgetExceeded = useCallback(async (category: string, amount: number, budget: number) => {
    const isEnabled = await notificationService.isNotificationEnabled('general');
    if (!isEnabled) return null;
    
    return notificationService.notifyBudgetExceeded(category, amount, budget);
  }, []);

  // Programar recordatorios automáticos
  const setupStreakReminders = useCallback(async () => {
    const isEnabled = await notificationService.isNotificationEnabled('streaks');
    if (!isEnabled) return;
    
    await notificationService.scheduleStreakReminders();
  }, []);

  // Configuración de notificaciones
  const setNotificationEnabled = useCallback(async (
    type: 'bills' | 'goals' | 'streaks' | 'general', 
    enabled: boolean
  ) => {
    await notificationService.setNotificationEnabled(type, enabled);
  }, []);

  const getNotificationEnabled = useCallback(async (
    type: 'bills' | 'goals' | 'streaks' | 'general'
  ) => {
    return await notificationService.isNotificationEnabled(type);
  }, []);

  // Gestión de notificaciones
  const cancelAllNotifications = useCallback(async () => {
    await notificationService.cancelAllNotifications();
  }, []);

  const cancelNotificationsByType = useCallback(async (type: string) => {
    await notificationService.cancelNotificationsByType(type);
  }, []);

  const getScheduledNotifications = useCallback(async () => {
    return await notificationService.getScheduledNotifications();
  }, []);

  // Verificar facturas próximas a vencer
  const checkUpcomingBills = useCallback(async (bills: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const bill of bills) {
      if (bill.estado === 'Pendiente') {
        const dueDate = new Date(bill.fechaVencimiento);
        dueDate.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Notificar a los 3 días, 1 día y el día de vencimiento
        if ([3, 1, 0].includes(daysUntilDue)) {
          await notifyBillDue(bill.nombre, bill.monto, daysUntilDue);
        }
      }
    }
  }, [notifyBillDue]);

  // Verificar progreso de objetivos
  const checkGoalProgress = useCallback(async (goals: any[]) => {
    for (const goal of goals) {
      const progress = Math.round((goal.ahorroActual / goal.metaTotal) * 100);
      
      // Notificar en hitos específicos (25%, 50%, 75%, 90%, 100%)
      const milestones = [25, 50, 75, 90, 100];
      if (milestones.includes(progress)) {
        await notifyGoalProgress(goal.nombre, progress);
      }
    }
  }, [notifyGoalProgress]);

  // Verificar racha diaria
  const checkDailyStreak = useCallback(async (lastActivity: Date) => {
    const today = new Date();
    const diffInDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    // Si han pasado más de 23 horas sin actividad, enviar recordatorio
    if (diffInDays >= 1) {
      await notifyStreakReminder();
    }
  }, [notifyStreakReminder]);

  return {
    // Inicialización
    initializeNotifications,
    
    // Notificaciones específicas
    notifyBillDue,
    notifyStreakReminder,
    notifyGoalProgress,
    notifyBudgetExceeded,
    
    // Configuración
    setNotificationEnabled,
    getNotificationEnabled,
    setupStreakReminders,
    
    // Gestión
    cancelAllNotifications,
    cancelNotificationsByType,
    getScheduledNotifications,
    
    // Verificaciones automáticas
    checkUpcomingBills,
    checkGoalProgress,
    checkDailyStreak,
  };
};