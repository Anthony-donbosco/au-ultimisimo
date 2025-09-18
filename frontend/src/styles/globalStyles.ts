import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const globalStyles = StyleSheet.create({
  // Contenedores principales
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  darkContainer: {
    backgroundColor: colors.dark.background,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
  darkBackground: {
    backgroundColor: colors.dark.background,
  },

  // Text styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 8,
  },
  darkTitle: {
    color: colors.dark.text,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.text,
    marginBottom: 6,
  },
  darkSubtitle: {
    color: colors.dark.text,
  },
  bodyText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    lineHeight: 24,
  },
  darkBodyText: {
    color: colors.dark.textSecondary,
  },
  smallText: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  darkSmallText: {
    color: colors.dark.textSecondary,
  },

  // Cards
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  darkCard: {
    backgroundColor: colors.dark.surface,
    shadowColor: '#fff',
    shadowOpacity: 0.05,
  },

  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.light.surface,
    color: colors.light.text,
  },
  darkInput: {
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
    color: colors.dark.text,
  },

  // Layout helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Spacing
  marginVertical8: {
    marginVertical: 8,
  },
  marginVertical16: {
    marginVertical: 16,
  },
  marginHorizontal16: {
    marginHorizontal: 16,
  },
  padding16: {
    padding: 16,
  },
  paddingHorizontal16: {
    paddingHorizontal: 16,
  },

  // Shadows
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  darkShadow: {
    shadowColor: '#fff',
    shadowOpacity: 0.05,
  },
});
