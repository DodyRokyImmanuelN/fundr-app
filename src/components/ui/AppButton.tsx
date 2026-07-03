import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing, typography } from '../../constants/theme';

type ButtonVariant = 'primary' | 'success' | 'warning' | 'danger' | 'secondary';

type AppButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function getVariantStyle(variant: ButtonVariant) {
  switch (variant) {
    case 'success':
      return {
        backgroundColor: colors.success,
        textColor: colors.surface,
      };
    case 'warning':
      return {
        backgroundColor: colors.warning,
        textColor: colors.surface,
      };
    case 'danger':
      return {
        backgroundColor: colors.danger,
        textColor: colors.surface,
      };
    case 'secondary':
      return {
        backgroundColor: colors.surfaceMuted,
        textColor: colors.textPrimary,
      };
    case 'primary':
    default:
      return {
        backgroundColor: colors.primary,
        textColor: colors.surface,
      };
  }
}

export function AppButton({
  label,
  variant = 'primary',
  icon,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const variantStyle = getVariantStyle(variant);

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variantStyle.backgroundColor },
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, { color: variantStyle.textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.controlHeight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.55,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.body,
    fontWeight: '800',
  },
});
