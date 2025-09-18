import { Alert } from 'react-native';

export interface DeleteConfirmationOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  itemType: 'ingreso' | 'gasto' | 'objetivo' | 'factura';
  itemName?: string;
}

export const showDeleteConfirmation = (
  options: DeleteConfirmationOptions,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  const {
    title,
    message,
    confirmText = 'Eliminar',
    cancelText = 'Cancelar',
    itemType,
    itemName
  } = options;

  // Mensajes por defecto según el tipo
  const defaultTitles = {
    ingreso: '¿Eliminar Ingreso?',
    gasto: '¿Eliminar Gasto?',
    objetivo: '¿Eliminar Objetivo?',
    factura: '¿Eliminar Factura?'
  };

  const defaultMessages = {
    ingreso: itemName
      ? `¿Estás seguro de que deseas eliminar el ingreso "${itemName}"? Esta acción no se puede deshacer.`
      : '¿Estás seguro de que deseas eliminar este ingreso? Esta acción no se puede deshacer.',
    gasto: itemName
      ? `¿Estás seguro de que deseas eliminar el gasto "${itemName}"? Esta acción no se puede deshacer.`
      : '¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.',
    objetivo: itemName
      ? `¿Estás seguro de que deseas eliminar el objetivo "${itemName}"? Se perderá todo el progreso. Esta acción no se puede deshacer.`
      : '¿Estás seguro de que deseas eliminar este objetivo? Se perderá todo el progreso. Esta acción no se puede deshacer.',
    factura: itemName
      ? `¿Estás seguro de que deseas eliminar la factura "${itemName}"? Esta acción no se puede deshacer.`
      : '¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.'
  };

  Alert.alert(
    title || defaultTitles[itemType],
    message || defaultMessages[itemType],
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm
      }
    ],
    { cancelable: true }
  );
};

// Helper específicos para cada tipo
export const confirmDeleteIncome = (
  incomeName: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  showDeleteConfirmation(
    {
      itemType: 'ingreso',
      itemName: incomeName
    },
    onConfirm,
    onCancel
  );
};

export const confirmDeleteExpense = (
  expenseName: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  showDeleteConfirmation(
    {
      itemType: 'gasto',
      itemName: expenseName
    },
    onConfirm,
    onCancel
  );
};

export const confirmDeleteGoal = (
  goalName: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  showDeleteConfirmation(
    {
      itemType: 'objetivo',
      itemName: goalName
    },
    onConfirm,
    onCancel
  );
};

export const confirmDeleteBill = (
  billName: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  showDeleteConfirmation(
    {
      itemType: 'factura',
      itemName: billName
    },
    onConfirm,
    onCancel
  );
};