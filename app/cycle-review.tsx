import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '../src/components/layout/PageHeader';
import { Screen } from '../src/components/layout/Screen';
import { Badge } from '../src/components/ui/Badge';
import { Card } from '../src/components/ui/Card';
import { ProgressBar } from '../src/components/ui/ProgressBar';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { colors, spacing, typography } from '../src/constants/theme';
import {
  CycleReviewEnvelope,
  CycleReviewSummary,
  getCycleReviewSummary,
} from '../src/services/cycleReviewService';
import { formatCurrency } from '../src/utils/currency';

function getStatusLabel(status: CycleReviewSummary['status']) {
  switch (status) {
    case 'closed':
      return 'Closed';
    case 'review':
      return 'Review';
    case 'active':
    default:
      return 'Active';
  }
}

function getStatusVariant(status: CycleReviewSummary['status']) {
  switch (status) {
    case 'closed':
      return 'info' as const;
    case 'review':
      return 'warning' as const;
    case 'active':
    default:
      return 'safe' as const;
  }
}

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

function getEnvelopeToneLabel(tone: CycleReviewEnvelope['tone']) {
  switch (tone) {
    case 'danger':
      return 'Over';
    case 'warning':
      return 'Tight';
    case 'info':
      return 'Protected';
    case 'safe':
    default:
      return 'Safe';
  }
}

function getEnvelopeToneVariant(tone: CycleReviewEnvelope['tone']) {
  switch (tone) {
    case 'danger':
      return 'danger' as const;
    case 'warning':
      return 'warning' as const;
    case 'info':
      return 'info' as const;
    case 'safe':
    default:
      return 'safe' as const;
  }
}

function EnvelopeReviewItem({ envelope }: { envelope: CycleReviewEnvelope }) {
  return (
    <Card>
      <View style={styles.envelopeHeader}>
        <View style={styles.envelopeTitleWrapper}>
          <Text style={styles.envelopeName}>{envelope.name}</Text>
          <Text style={styles.envelopeMeta}>
            {getEnvelopeTypeLabel(envelope.type)} · {envelope.accountName}
          </Text>
        </View>

        <Badge
          label={getEnvelopeToneLabel(envelope.tone)}
          variant={getEnvelopeToneVariant(envelope.tone)}
        />
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Used</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(envelope.usedAmount)}
          </Text>
        </View>

        <View style={styles.amountRight}>
          <Text style={styles.amountLabel}>Remaining</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(envelope.remainingAmount)}
          </Text>
        </View>
      </View>

      <View style={styles.progressWrapper}>
        <ProgressBar percentage={envelope.usedPercentage} />

        <View style={styles.progressMeta}>
          <Text style={styles.mutedText}>
            Planned {formatCurrency(envelope.plannedAmount)}
          </Text>
          <Text style={styles.mutedText}>{envelope.usedPercentage}%</Text>
        </View>
      </View>
    </Card>
  );
}

export default function CycleReviewScreen() {
  const [summary, setSummary] = useState<CycleReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadReview() {
        setIsLoading(true);

        const nextSummary = await getCycleReviewSummary();

        setSummary(nextSummary);
        setIsLoading(false);
      }

      loadReview();
    }, [])
  );

  return (
    <Screen>
      <PageHeader
        title="Cycle Review"
        subtitle="Review how the cycle performed across envelopes."
        trailing={
          summary ? (
            <Badge
              label={getStatusLabel(summary.status)}
              variant={getStatusVariant(summary.status)}
            />
          ) : undefined
        }
      />

      {isLoading ? (
        <Card>
          <Text style={styles.mutedText}>Loading cycle review...</Text>
        </Card>
      ) : !summary ? (
        <Card muted>
          <Text style={styles.emptyTitle}>No cycle to review</Text>
          <Text style={styles.mutedText}>
            Confirm income first to create a budget cycle.
          </Text>
        </Card>
      ) : (
        <>
          <Card style={styles.heroCard}>
            <SectionHeader
              title={summary.headline}
              meta={`${summary.startDate} - ${summary.endDate}`}
            />

            <Text style={styles.heroMessage}>{summary.message}</Text>
            <Text style={styles.recommendation}>
              {summary.recommendation}
            </Text>

            <View style={styles.progressWrapper}>
              <ProgressBar percentage={summary.usedPercentage} />

              <View style={styles.progressMeta}>
                <Text style={styles.mutedText}>
                  Used {formatCurrency(summary.usedAmount)}
                </Text>
                <Text style={styles.mutedText}>{summary.usedPercentage}%</Text>
              </View>
            </View>
          </Card>

          <View style={styles.summaryGrid}>
            <Card>
              <Text style={styles.summaryLabel}>Planned</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(summary.plannedAmount)}
              </Text>
            </Card>

            <Card>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(summary.remainingAmount)}
              </Text>
            </Card>
          </View>

          <View style={styles.summaryGrid}>
            <Card>
              <Text style={styles.summaryLabel}>Flexible</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(summary.flexibleRemaining)}
              </Text>
            </Card>

            <Card>
              <Text style={styles.summaryLabel}>Protected</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(summary.protectedRemaining)}
              </Text>
            </Card>
          </View>

          {summary.status === 'active' ? (
            <Card>
              <SectionHeader
                title="Safe Daily Limit"
                meta={`${summary.remainingDays} days left`}
              />
              <Text style={styles.safeLimit}>
                {formatCurrency(summary.safeDailyLimit)}
              </Text>
              <Text style={styles.mutedText}>
                This is based on flexible remaining money.
              </Text>
            </Card>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title="Envelope Breakdown"
              meta={`${summary.envelopes.length} items`}
            />

            {summary.envelopes.map((envelope) => (
              <EnvelopeReviewItem key={envelope.id} envelope={envelope} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primarySoft,
  },
  heroMessage: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  recommendation: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
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
    fontSize: typography.subheading,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  safeLimit: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
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
    fontWeight: '900',
    color: colors.textPrimary,
  },
  envelopeMeta: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  amountRow: {
    marginTop: spacing.md,
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
  amountValue: {
    fontSize: typography.body,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  progressWrapper: {
    marginTop: spacing.md,
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
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});
