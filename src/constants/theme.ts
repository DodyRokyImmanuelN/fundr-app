export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F3F7',
  surfacePressed: '#E9EEF5',

  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  primary: '#2563EB',
  primarySoft: '#DBEAFE',
  primaryMuted: '#EFF6FF',

  success: '#16A34A',
  successSoft: '#DCFCE7',
  successMuted: '#F0FDF4',

  warning: '#D97706',
  warningSoft: '#FEF3C7',
  warningMuted: '#FFFBEB',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  dangerMuted: '#FEF2F2',
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
  sm: 6,
  md: 8,
  lg: 8,
  xl: 8,
};

export const typography = {
  title: 32,
  heading: 22,
  subheading: 18,
  body: 15,
  small: 13,
  tiny: 12,
};

export const layout = {
  screenPadding: spacing.xl,
  screenTopPadding: spacing['3xl'],
  sectionGap: spacing.lg,
  controlHeight: 52,
};

export const shadows = {
  card: {
    shadowColor: '#111827',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
};
