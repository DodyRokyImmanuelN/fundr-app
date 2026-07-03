export const colors = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F5',

  textPrimary: '#101828',
  textSecondary: '#667085',
  textMuted: '#98A2B3',

  border: '#EAECF0',

  primary: '#2563EB',
  primarySoft: '#DBEAFE',

  success: '#16A34A',
  successSoft: '#DCFCE7',

  warning: '#D97706',
  warningSoft: '#FEF3C7',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
};

export const Colors = {
  light: {
    text: colors.textPrimary,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textSecondary,
    tabIconDefault: colors.textMuted,
    tabIconSelected: colors.primary,
  },
  dark: {
    text: colors.surface,
    background: colors.textPrimary,
    tint: colors.primarySoft,
    icon: colors.textMuted,
    tabIconDefault: colors.textSecondary,
    tabIconSelected: colors.primarySoft,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

export const typography = {
  title: 32,
  heading: 22,
  subheading: 18,
  body: 15,
  small: 13,
  tiny: 12,
};
