import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Alert, Share } from 'react-native';

export interface ShareGoalData {
  nombre: string;
  progreso: number;
  ahorroActual: number;
  metaTotal: number;
  fechaLimite?: string;
}

class ShareService {
  
  // Compartir progreso de objetivo con imagen generada
  async shareGoalProgress(goalData: ShareGoalData, imageRef?: any): Promise<boolean> {
    try {
      const message = this.generateGoalMessage(goalData);
      
      if (imageRef) {
        // Generar imagen del progreso
        const imageUri = await captureRef(imageRef, {
          format: 'png',
          quality: 1,
        });

        // Verificar si se puede compartir archivos
        const canShare = await Sharing.isAvailableAsync();
        
        if (canShare) {
          await Sharing.shareAsync(imageUri, {
            mimeType: 'image/png',
            dialogTitle: 'Compartir progreso de objetivo',
          });
          return true;
        }
      }

      // Fallback: compartir solo texto
      const result = await Share.share({
        message: message,
        title: 'Mi progreso financiero - AUREUM',
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('❌ Error compartiendo objetivo:', error);
      Alert.alert('Error', 'No se pudo compartir el objetivo. Intenta nuevamente.');
      return false;
    }
  }

  // Generar mensaje de texto para compartir
  private generateGoalMessage(goalData: ShareGoalData): string {
    const { nombre, progreso, ahorroActual, metaTotal, fechaLimite } = goalData;
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    const progressEmoji = this.getProgressEmoji(progreso);
    const motivationalMessage = this.getMotivationalMessage(progreso);
    
    let message = `🎯 Mi objetivo financiero: "${nombre}"\n\n`;
    message += `${progressEmoji} Progreso: ${progreso}% completado\n`;
    message += `💰 ${formatCurrency(ahorroActual)} de ${formatCurrency(metaTotal)}\n`;
    
    if (fechaLimite) {
      message += `📅 Meta: ${formatDate(fechaLimite)}\n`;
    }
    
    message += `\n${motivationalMessage}\n\n`;
    message += `#AhorroInteligente #MetasFinancieras #AUREUM\n`;
    message += `📱 Gestiona tus finanzas con AUREUM`;

    return message;
  }

  // Obtener emoji según el progreso
  private getProgressEmoji(progreso: number): string {
    if (progreso >= 100) return '🏆';
    if (progreso >= 75) return '🚀';
    if (progreso >= 50) return '💪';
    if (progreso >= 25) return '📈';
    return '🌱';
  }

  // Obtener mensaje motivacional según el progreso
  private getMotivationalMessage(progreso: number): string {
    const messages = {
      100: [
        '¡OBJETIVO COMPLETADO! 🎉 ¡Eres increíble!',
        '¡Meta alcanzada! 🏆 ¡Tu disciplina financiera es admirable!',
        '¡FELICITACIONES! 🎊 Has demostrado que los sueños se hacen realidad',
      ],
      75: [
        '¡Solo falta un 25%! 💪 ¡Estás en la recta final!',
        '¡Casi lo logras! 🚀 ¡Tu determinación es inspiradora!',
        '¡Excelente progreso! ⭐ ¡El éxito está muy cerca!',
      ],
      50: [
        '¡Mitad del camino! 🎯 ¡Sigues por buen rumbo!',
        '¡50% completado! 💫 ¡Tu constancia está dando frutos!',
        '¡Vas por la mitad! 🌟 ¡Mantén el ritmo!',
      ],
      25: [
        '¡Gran comienzo! 📈 ¡Cada paso cuenta!',
        '¡25% alcanzado! 🌱 ¡Tu viaje financiero ha comenzado!',
        '¡Primer cuarto completado! 🎪 ¡Sigue así!',
      ],
      0: [
        '¡Es hora de comenzar! 🚀 ¡Tu futuro financiero te espera!',
        '¡Primer paso hacia tu meta! 🌱 ¡Cada pequeño ahorro cuenta!',
        '¡Nueva meta activada! 💪 ¡Tú puedes lograrlo!',
      ]
    };

    let messageGroup: string[];
    
    if (progreso >= 100) messageGroup = messages[100];
    else if (progreso >= 75) messageGroup = messages[75];
    else if (progreso >= 50) messageGroup = messages[50];
    else if (progreso >= 25) messageGroup = messages[25];
    else messageGroup = messages[0];

    return messageGroup[Math.floor(Math.random() * messageGroup.length)];
  }

  // Compartir texto simple
  async shareText(title: string, message: string): Promise<boolean> {
    try {
      const result = await Share.share({
        message: message,
        title: title,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('❌ Error compartiendo texto:', error);
      return false;
    }
  }

  // Compartir logro específico
  async shareAchievement(type: 'goal' | 'streak' | 'savings', data: any): Promise<boolean> {
    try {
      let message = '';

      switch (type) {
        case 'goal':
          message = `🏆 ¡OBJETIVO COMPLETADO!\n\n`;
          message += `Acabo de alcanzar mi meta de "${data.nombre}"\n`;
          message += `💰 Total ahorrado: ${this.formatCurrency(data.metaTotal)}\n\n`;
          message += `¡La disciplina financiera realmente funciona! 💪\n\n`;
          message += `#ObjetivoCompletado #AhorroInteligente #AUREUM`;
          break;

        case 'streak':
          message = `🔥 ¡RACHA DE AHORRO!\n\n`;
          message += `¡${data.dias} días seguidos registrando mis finanzas!\n`;
          message += `💪 La constancia es la clave del éxito financiero\n\n`;
          message += `#RachaFinanciera #DisciplinaFinanciera #AUREUM`;
          break;

        case 'savings':
          message = `📈 ¡PROGRESO FINANCIERO!\n\n`;
          message += `Este mes he ahorrado: ${this.formatCurrency(data.monto)}\n`;
          message += `🎯 Mi siguiente meta: ${data.proximaMeta || 'Continuar ahorrando'}\n\n`;
          message += `#AhorroMensual #MetasFinancieras #AUREUM`;
          break;
      }

      return await this.shareText('Mi progreso financiero - AUREUM', message);
    } catch (error) {
      console.error('❌ Error compartiendo logro:', error);
      return false;
    }
  }

  // Formatear moneda
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Generar imagen personalizada de progreso (para futuras implementaciones)
  generateProgressImage(goalData: ShareGoalData): Promise<string> {
    // Esta función podría implementarse usando react-native-svg
    // o una librería para generar imágenes dinámicamente
    return Promise.resolve('');
  }

  // Verificar si el dispositivo puede compartir
  async canShare(): Promise<boolean> {
    try {
      return await Sharing.isAvailableAsync();
    } catch {
      return false;
    }
  }
}

export const shareService = new ShareService();