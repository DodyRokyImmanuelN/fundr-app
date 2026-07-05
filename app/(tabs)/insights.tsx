import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '../../src/components/layout/PageHeader';
import { Screen } from '../../src/components/layout/Screen';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { colors, spacing, typography } from '../../src/constants/theme';
import {
  AssistantInsight,
  AssistantInsightSeverity,
  AssistantInsightSummary,
  getAssistantInsightSummary,
} from '../../src/services/assistantInsightService';
import { formatCurrency } from '../../src/utils/currency';

function getSeverityLabel(severity: AssistantInsightSeverity) {
  switch (severity) {
    case 'danger':
      return 'Danger';
    case 'warning':
      return 'Watch';
    case 'info':
    default:
      return 'Info';
  }
}

function InsightCard({ insight }: { insight: AssistantInsight }) {
  return (
    <Card style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={styles.insightTitleWrapper}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightMessage}>{insight.message}</Text>
        </View>

        <Badge
          label={getSeverityLabel(insight.severity)}
          variant={insight.severity === 'info' ? 'info' : insight.severity}
        />
      </View>

      {insight.recommendation ? (
        <Text style={styles.recommendation}>{insight.recommendation}</Text>
      ) : null}
    </Card>
  );
}

export default function InsightsScreen() {
  const [summary, setSummary] = useState<AssistantInsightSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadInsights() {
        setIsLoading(true);

        const nextSummary = await getAssistantInsightSummary();

        setSummary(nextSummary);
        setIsLoading(false);
      }

      loadInsights();
    }, [])
  );

  return (
    <Screen>
      <PageHeader
        title="Insights"
        subtitle="Assistant signals based on your latest cycle data."
        trailing={
          summary ? (
            <Badge label={summary.status.label} variant={summary.status.variant} />
          ) : undefined
        }
      />

      {isLoading || !summary ? (
        <Card>
          <Text style={styles.mutedText}>Loading insights...</Text>
        </Card>
      ) : (
        <>
          <Card style={styles.summaryCard}>
            <SectionHeader
              title="Safe Daily Limit"
              meta={`${summary.remainingDays} days left`}
            />

            <Text style={styles.safeLimit}>
              {formatCurrency(summary.safeDailyLimit)}
            </Text>

            <Text style={styles.mutedText}>
              Minimum daily limit is {formatCurrency(summary.minimumDailyLimit)}.
            </Text>
          </Card>

          <View style={styles.summaryGrid}>
            <Card>
              <Text style={styles.summaryLabel}>Flexible</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(summary.flexibleMoney)}
              </Text>
            </Card>

            <Card>
              <Text style={styles.summaryLabel}>Protected</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(summary.protectedMoney)}
              </Text>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Active Signals"
              meta={`${summary.insights.length} items`}
            />

            {summary.insights.length === 0 ? (
              <Card>
                <Text style={styles.emptyTitle}>No warning right now</Text>
                <Text style={styles.mutedText}>
                  You are still on track for this cycle.
                </Text>
              </Card>
            ) : (
              summary.insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primarySoft,
  },
  safeLimit: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
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
  section: {
    gap: spacing.md,
  },
  insightCard: {
    gap: spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  insightTitleWrapper: {
    flex: 1,
  },
  insightTitle: {
    fontSize: typography.body,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  insightMessage: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  recommendation: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
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
