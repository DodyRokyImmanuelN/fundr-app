import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';

type BadgeVariant = 'safe' | 'warning' | 'danger' | 'info';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

function getBadgeStyle(variant: BadgeVariant) {
  switch (variant) {
    case 'safe':
      return {
        backgroundColor: colors.successSoft,
        color: colors.success,
      };
    case 'warning':
      return {
        backgroundColor: colors.warningSoft,
        color: colors.warning,
      };
    case 'danger':
      return {
        backgroundColor: colors.dangerSoft,
        color: colors.danger,
      };
    case 'info':
    default:
      return {
        backgroundColor: colors.primarySoft,
        color: colors.primary,
      };
  }
}

export function Badge({ label, variant = 'info' }: BadgeProps) {
  const badgeStyle = getBadgeStyle(variant);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeStyle.backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: badgeStyle.color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});