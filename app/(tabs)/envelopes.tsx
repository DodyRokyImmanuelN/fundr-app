import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '../../src/components/layout/PageHeader';
import { Screen } from '../../src/components/layout/Screen';
import { AppButton } from '../../src/components/ui/AppButton';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { SectionHeader } from '../../src/components/ui/SectionHeader';

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
      <AppButton
        label="Adjust Allocation"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/adjust-envelope-allocation',
            params: { envelopeId: envelope.id },
          })
        }
      />
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
    <Screen>
      <PageHeader
        title="Envelopes"
        subtitle="See how your money is separated by purpose."
      />

      {isLoading ? (
        <Card>
          <Text style={styles.mutedText}>Loading envelopes...</Text>
        </Card>
      ) : envelopes.length === 0 ? (
        <>
          <Card muted>
            <Text style={styles.emptyTitle}>No envelope found</Text>
            <Text style={styles.mutedText}>
              Complete onboarding or confirm an income to create your first
              budget envelopes.
            </Text>
          </Card>

          <AppButton
            label="Add Envelope"
            onPress={() => router.push('/add-envelope')}
          />
        </>
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
            <SectionHeader
              title="Flexible Envelopes"
              meta={`${flexibleEnvelopes.length} items`}
            />

            {flexibleEnvelopes.length === 0 ? (
              <Card>
                <Text style={styles.mutedText}>
                  No flexible envelope yet. Add one to start tracking daily
                  spending.
                </Text>
              </Card>
            ) : (
              flexibleEnvelopes.map((envelope) => (
                <EnvelopeItem key={envelope.id} envelope={envelope} />
              ))
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Protected Envelopes"
              meta={`${protectedEnvelopes.length} items`}
            />

            {protectedEnvelopes.length === 0 ? (
              <Card>
                <Text style={styles.mutedText}>
                  No protected envelope yet. Protected envelopes are useful for
                  savings, bills, or subscriptions.
                </Text>
              </Card>
            ) : (
              protectedEnvelopes.map((envelope) => (
                <EnvelopeItem key={envelope.id} envelope={envelope} />
              ))
            )}
          </View>

          <AppButton
            label="Add Envelope"
            onPress={() => router.push('/add-envelope')}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
