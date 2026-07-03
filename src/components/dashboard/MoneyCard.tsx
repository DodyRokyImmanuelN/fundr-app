import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

type MoneyCardProps = {
  label: string;
  amount: number;
  description?: string;
  tone?: 'neutral' | 'success' | 'warning';
};

function getToneColor(tone: NonNullable<MoneyCardProps['tone']>) {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'neutral':
    default:
      return colors.primary;
  }
}

export function MoneyCard({
  label,
  amount,
  description,
  tone = 'neutral',
}: MoneyCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color: getToneColor(tone) }]}>
        {formatCurrency(amount)}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    ...shadows.card,
  },
  label: {
    fontSize: typography.small,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  amount: {
    fontSize: 24,
    fontWeight: '900',
  },
  description: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
