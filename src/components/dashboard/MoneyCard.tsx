import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

type MoneyCardProps = {
  label: string;
  amount: number;
  description?: string;
};

export function MoneyCard({ label, amount, description }: MoneyCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount}>{formatCurrency(amount)}</Text>
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
  },
  label: {
    fontSize: typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  description: {
    marginTop: spacing.sm,
    fontSize: typography.tiny,
    color: colors.textMuted,
  },
});
