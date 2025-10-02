import { StyleSheet, ViewStyle, TextStyle, I18nManager } from 'react-native';

// Enable RTL layout for Persian
I18nManager.allowRTL(true);

export const colors = {
  background: '#F9FAFB',      // Very light gray for a clean look
  text: '#1F2937',            // Dark gray for readability
  textSecondary: '#6B7280',   // Medium gray for less important text
  primary: '#3B82F6',         // Blue for main interactive elements
  secondary: '#6366F1',       // Indigo as a complementary color
  accent: '#22C55E',          // Green for success notifications
  card: '#FFFFFF',            // White for card backgrounds
  highlight: '#E0E7FF',       // Light blue for highlighting selected elements
  error: '#EF4444',           // Red for errors
  warning: '#F59E0B',         // Orange for warnings
  border: '#E5E7EB',          // Light gray for borders
};

export const darkColors = {
  background: '#111827',      // Dark background
  text: '#F9FAFB',           // Light text
  textSecondary: '#9CA3AF',  // Medium gray text
  primary: '#60A5FA',        // Lighter blue for dark mode
  secondary: '#818CF8',      // Lighter indigo
  accent: '#34D399',         // Lighter green
  card: '#1F2937',           // Dark card background
  highlight: '#1E3A8A',      // Darker blue for highlighting
  error: '#F87171',          // Lighter red
  warning: '#FBBF24',        // Lighter orange
  border: '#374151',         // Dark border
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accent: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const textStyles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Vazirmatn_400Regular',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Vazirmatn_400Regular',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 24,
    textAlign: 'right',
    fontFamily: 'Vazirmatn_400Regular',
  },
  bodySecondary: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'right',
    fontFamily: 'Vazirmatn_400Regular',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
    textAlign: 'center',
    fontFamily: 'Vazirmatn_600SemiBold',
  },
});

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginVertical: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  selectedTextContainer: {
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  fullWidthButton: {
    width: '100%',
    marginVertical: 8,
  },
  halfWidthButton: {
    flex: 1,
  },
  notification: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    zIndex: 1000,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 5,
  },
  errorNotification: {
    backgroundColor: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Vazirmatn_400Regular',
    textAlign: 'right',
    backgroundColor: colors.card,
    color: colors.text,
    marginVertical: 8,
    width: '100%',
  },
  inputFocused: {
    borderColor: colors.primary,
  },
});
