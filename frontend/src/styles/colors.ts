export const colors = {
  // Primary colors
  primary: '#F59E0B', // amber-500
  primaryDark: '#D97706', // amber-600
  primaryLight: '#FDE68A', // amber-200

  // Status colors
  success: '#10B981', // emerald-500
  successLight: '#D1FAE5', // emerald-100
  error: '#EF4444', // red-500
  errorLight: '#FEE2E2', // red-100
  warning: '#F59E0B', // amber-500
  warningLight: '#FEF3C7', // amber-100
  info: '#3B82F6', // blue-500
  infoLight: '#DBEAFE', // blue-100
  infoDark: '#1E3A8A', // blue-800

  // Light theme
  light: {
    background: '#F8FAFC', // slate-50
    surface: '#FFFFFF', // white
    surfaceSecondary: '#F1F5F9', // slate-100
    text: '#1E293B', // slate-800
    textSecondary: '#64748B', // slate-500
    textTertiary: '#94A3B8', // slate-400
    border: '#E2E8F0', // slate-200
    borderSecondary: '#CBD5E1', // slate-300
    disabled: '#F1F5F9', // slate-100
    divider: '#E2E8F0', // slate-200
  },

  // Dark theme
  dark: {
    background: '#222222ff', // slate-950
    surface: 'rgba(20, 20, 20, 1)', // slate-800 with opacity
    surfaceSecondary: '#1E293B', // slate-800
    text: '#F8FAFC', // slate-50
    textSecondary: '#CBD5E1', // slate-300
    textTertiary: '#94A3B8', // slate-400
    border: 'rgba(71, 85, 105, 0.8)', // slate-600 with opacity
    borderSecondary: '#475569', // slate-600
    disabled: '#334155', // slate-700
    divider: 'rgba(71, 85, 105, 0.5)', // slate-600 with opacity
  },

  // Gradients
  gradients: {
    primary: ['#F59E0B', '#D97706'],
    success: ['#10B981', '#059669'],
    error: ['#EF4444', '#DC2626'],
    slate: ['#1E293B', '#0F172A'],
  },

  // Category colors (for expenses, income, etc.)
  categories: {
    vivienda: '#3B82F6', // blue-500
    comida: '#F97316', // orange-500
    transporte: '#8B5CF6', // violet-500
    entretenimiento: '#EC4899', // pink-500
    compras: '#14B8A6', // teal-500
    salud: '#EF4444', // red-500
    educacion: '#10B981', // emerald-500
    otros: '#6B7280', // gray-500
  },
};
