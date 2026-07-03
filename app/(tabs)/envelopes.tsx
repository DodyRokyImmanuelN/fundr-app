import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';

import {
  EnvelopeWithAccount,
  getActiveCycleEnvelopes,
} from '../../src/features/envelopes/envelope.repository';

import { colors, spacing, typography } from '../../src/constants/theme';
import { calculatePercentage } from '../../src/utils/calculations';
import { formatCurrency } from '../../src/utils/currency';

function getEnvelopeTypeLabel(type: string) {
  switch (type) {
    case 'need':
      return 'Need';
    case 'want':
      return 'Want';
    case 'saving':
      return 'Saving';
    case 'subscription':
      return 'Subscription';
    case 'buffer':
      return 'Buffer';
    case 'reward':
      return 'Reward';
    default:
      return 'Other';
  }
}

function getEnvelopeStatus(envelope: EnvelopeWithAccount) {
  const usedPercentage = calculatePercentage(
    envelope.used_amount,
    envelope.planned_amount
  );

  if (envelope.is_locked) {
    return {
      label: 'Protected',
      variant: 'info' as const,
    };
  }

  if (usedPercentage >= 100) {
    return {
      label: 'Limit reached',
      variant: 'danger' as const,
    };
  }

  if (usedPercentage >= 80) {
    return {
      label: 'Watch',
      variant: 'warning' as const,
    };
  }

  return {
    label: 'Safe',
    variant: 'safe' as const,
  };
}

function EnvelopeItem({ envelope }: { envelope: EnvelopeWithAccount }) {
  const usedPercentage = calculatePercentage(
    envelope.used_amount,
    envelope.planned_amount
  );

  const status = getEnvelopeStatus(envelope);

  return (
    <Card>
      <View style={styles.envelopeHeader}>
        <View style={styles.envelopeTitleWrapper}>
          <Text style={styles.envelopeName}>{envelope.name}</Text>
          <Text style={styles.envelopeMeta}>
            {getEnvelopeTypeLabel(envelope.type)} · {envelope.account_name}
          </Text>
        </View>

        <Badge label={status.label} variant={status.variant} />
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Remaining</Text>
          <Text style={styles.remainingAmount}>
            {formatCurrency(envelope.remaining_amount)}
          </Text>
        </View>

        <View style={styles.amountRight}>
          <Text style={styles.amountLabel}>Planned</Text>
          <Text style={styles.plannedAmount}>
            {formatCurrency(envelope.planned_amount)}
          </Text>
        </View>
      </View>

      <View style={styles.progressWrapper}>
        <ProgressBar percentage={usedPercentage} />

        <View style={styles.progressMeta}>
          <Text style={styles.mutedText}>
            Used {formatCurrency(envelope.used_amount)}
          </Text>
          <Text style={styles.mutedText}>{usedPercentage}%</Text>
        </View>
      </View>
    </Card>
  );
}

export default function EnvelopesScreen() {
  const [envelopes, setEnvelopes] = useState<EnvelopeWithAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadEnvelopes() {
        setIsLoading(true);

        const rows = await getActiveCycleEnvelopes();

        setEnvelopes(rows);
        setIsLoading(false);
      }

      loadEnvelopes();
    }, [])
  );

  const flexibleEnvelopes = envelopes.filter((envelope) => !envelope.is_locked);
  const protectedEnvelopes = envelopes.filter((envelope) =>
    Boolean(envelope.is_locked)
  );

  const totalFlexible = flexibleEnvelopes.reduce(
    (total, envelope) => total + envelope.remaining_amount,
    0
  );

  const totalProtected = protectedEnvelopes.reduce(
    (total, envelope) => total + envelope.remaining_amount,
    0
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Envelopes</Text>
        <Text style={styles.subtitle}>
          See how your money is separated by purpose.
        </Text>
      </View>

      {isLoading ? (
        <Card>
          <Text style={styles.mutedText}>Loading envelopes...</Text>
        </Card>
      ) : envelopes.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No envelope found</Text>
          <Text style={styles.mutedText}>
            Complete onboarding or confirm an income to create your first budget
            envelopes.
          </Text>
        </Card>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <Card>
              <Text style={styles.summaryLabel}>Flexible</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(totalFlexible)}
              </Text>
              <Text style={styles.mutedText}>Available for this cycle</Text>
            </Card>

            <Card>
              <Text style={styles.summaryLabel}>Protected</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(totalProtected)}
              </Text>
              <Text style={styles.mutedText}>Locked or protected money</Text>
            </Card>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Flexible Envelopes</Text>
              <Text style={styles.sectionMeta}>
                {flexibleEnvelopes.length} items
              </Text>
            </View>

            {flexibleEnvelopes.map((envelope) => (
              <EnvelopeItem key={envelope.id} envelope={envelope} />
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Protected Envelopes</Text>
              <Text style={styles.sectionMeta}>
                {protectedEnvelopes.length} items
              </Text>
            </View>

            {protectedEnvelopes.map((envelope) => (
              <EnvelopeItem key={envelope.id} envelope={envelope} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    paddingTop: spacing['3xl'],
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryLabel: {
    fontSize: typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.subheading,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionMeta: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  envelopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  envelopeTitleWrapper: {
    flex: 1,
  },
  envelopeName: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  envelopeMeta: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  amountRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  amountRight: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  remainingAmount: {
    fontSize: typography.subheading,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  plannedAmount: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  progressWrapper: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mutedText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: typography.subheading,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});