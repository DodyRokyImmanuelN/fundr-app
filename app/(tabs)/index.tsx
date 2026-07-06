import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MoneyCard } from '../../src/components/dashboard/MoneyCard';
import { PageHeader } from '../../src/components/layout/PageHeader';
import { Screen } from '../../src/components/layout/Screen';
import { AppButton } from '../../src/components/ui/AppButton';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { SectionHeader } from '../../src/components/ui/SectionHeader';

import { colors, spacing, typography } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/database';
import {
  AssistantInsightSeverity,
  AssistantInsightSummary,
  getAssistantInsightSummary,
} from '../../src/services/assistantInsightService';
import { formatCurrency } from '../../src/utils/currency';

type AccountRow = {
  id: string;
  name: string;
  type: string;
  current_balance: number;
};

function getAccountTypeLabel(type: string) {
  switch (type) {
    case 'daily_spending':
      return 'Daily Spending';
    case 'saving':
      return 'Saving';
    case 'cash':
      return 'Cash';
    case 'ewallet':
      return 'E-Wallet';
    default:
      return 'Other';
  }
}

function getAssistantHeroStyle(variant: 'safe' | 'warning' | 'danger') {
  switch (variant) {
    case 'danger':
      return {
        backgroundColor: colors.dangerMuted,
        borderColor: colors.dangerSoft,
      };
    case 'warning':
      return {
        backgroundColor: colors.warningMuted,
        borderColor: colors.warningSoft,
      };
    case 'safe':
    default:
      return {
        backgroundColor: colors.primaryMuted,
        borderColor: colors.primarySoft,
      };
  }
}

function getAssistantButtonVariant(variant: 'safe' | 'warning' | 'danger') {
  switch (variant) {
    case 'danger':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'safe':
    default:
      return 'primary';
  }
}

function getSignalCountText(summary: AssistantInsightSummary | null) {
  if (!summary) return 'Loading';

  const { danger, warning, info } = summary.signalCounts;

  if (danger > 0) return `${danger} danger`;
  if (warning > 0) return `${warning} warning`;
  if (info > 0) return `${info} info`;

  return 'No warnings';
}

function getInsightBadgeLabel(severity: AssistantInsightSeverity) {
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

export default function DashboardScreen() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [assistantSummary, setAssistantSummary] =
    useState<AssistantInsightSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function loadDashboard() {
        const db = await getDatabase();

        const [accountRows, nextAssistantSummary] = await Promise.all([
          db.getAllAsync<AccountRow>(
            `
            SELECT id, name, type, current_balance
            FROM accounts
            WHERE is_archived = 0
            ORDER BY
              CASE type
                WHEN 'daily_spending' THEN 1
                WHEN 'saving' THEN 2
                WHEN 'cash' THEN 3
                WHEN 'ewallet' THEN 4
                ELSE 5
              END,
              name ASC;
            `
          ),
          getAssistantInsightSummary(),
        ]);

        setAccounts(accountRows);
        setAssistantSummary(nextAssistantSummary);
      }

      loadDashboard();
    }, [])
  );

  const activeCycle = assistantSummary?.activeCycle ?? null;
  const safeDailyLimit = assistantSummary?.safeDailyLimit ?? 0;
  const remainingDays = assistantSummary?.remainingDays ?? 0;
  const flexibleMoney = assistantSummary?.flexibleMoney ?? 0;
  const protectedMoney = assistantSummary?.protectedMoney ?? 0;

  const assistantStatus = assistantSummary?.status ?? {
    label: 'Safe' as const,
    variant: 'safe' as const,
  };

  const dashboardSummary = assistantSummary?.dashboardSummary ?? {
    headline: 'Loading assistant',
    message: 'Checking your latest cycle data.',
    reason: 'Fundr is reading your envelopes, transactions, and settings.',
    recommendation: 'Give it a moment.',
    ctaLabel: 'Open Insights',
  };

  const topInsights = assistantSummary?.insights.slice(0, 2) ?? [];
  const signalCountText = getSignalCountText(assistantSummary);

  return (
    <Screen>
      <PageHeader
        title="Fundr"
        subtitle="Your money, planned clearly."
        trailing={
          <Badge
            label={assistantStatus.label}
            variant={assistantStatus.variant}
          />
        }
      />

      <Card
        style={[
          styles.assistantHero,
          getAssistantHeroStyle(assistantStatus.variant),
        ]}
      >
        <View style={styles.assistantHeroHeader}>
          <View style={styles.assistantHeroTitleWrapper}>
            <Text style={styles.eyebrow}>Assistant Status</Text>
            <Text style={styles.assistantHeadline}>
              {dashboardSummary.headline}
            </Text>
          </View>

          <Badge
            label={assistantStatus.label}
            variant={assistantStatus.variant}
          />
        </View>

        <Text style={styles.assistantLead}>{dashboardSummary.message}</Text>

        <View style={styles.reasonPanel}>
          <Text style={styles.reasonLabel}>Why this status</Text>
          <Text style={styles.reasonText}>{dashboardSummary.reason}</Text>
        </View>

        <View style={styles.limitPanel}>
          <View style={styles.limitItem}>
            <Text style={styles.metricLabel}>Safe daily limit</Text>
            <Text style={styles.safeLimit}>
              {formatCurrency(safeDailyLimit)}
            </Text>
          </View>

          <View style={styles.limitItemRight}>
            <Text style={styles.metricLabel}>Days left</Text>
            <Text style={styles.daysLeft}>{remainingDays}</Text>
          </View>
        </View>

        <Text style={styles.assistantRecommendation}>
          {dashboardSummary.recommendation}
        </Text>

        {activeCycle ? (
          <Text style={styles.cycleMeta}>
            {activeCycle.start_date} - {activeCycle.end_date}
          </Text>
        ) : null}

        <AppButton
          label={dashboardSummary.ctaLabel}
          variant={getAssistantButtonVariant(assistantStatus.variant)}
          onPress={() => router.push('/insights')}
        />
      </Card>

      <View style={styles.moneyGrid}>
        <MoneyCard
          label="Flexible Money"
          amount={flexibleMoney}
          description="Money available for this cycle"
          tone="neutral"
        />

        <MoneyCard
          label="Protected Money"
          amount={protectedMoney}
          description="Savings, subscriptions, and locked funds"
          tone="success"
        />
      </View>

      <Card>
        <SectionHeader title="Quick Actions" />

        <View style={styles.actionGrid}>
          <AppButton
            label="Add Expense"
            onPress={() => router.push('/add-transaction')}
            style={styles.actionButton}
          />

          <AppButton
            label="Ask Fundr"
            variant="secondary"
            onPress={() => router.push('/decision-assistant')}
            style={styles.actionButton}
          />

          <AppButton
            label="Add Money"
            variant="success"
            onPress={() => router.push('/add-money')}
            style={styles.actionButton}
          />

          <AppButton
            label="Adjust Balance"
            variant="warning"
            onPress={() => router.push('/adjust-balance')}
            style={styles.actionButton}
          />

          <AppButton
            label="Confirm Income"
            variant="success"
            onPress={() => router.push('/income-confirmation')}
            style={styles.actionButton}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Accounts" meta={`${accounts.length} active`} />

        {accounts.length === 0 ? (
          <Text style={styles.mutedText}>No account found.</Text>
        ) : (
          <View style={styles.accountList}>
            {accounts.map((account) => (
              <View key={account.id} style={styles.accountItem}>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountType}>
                    {getAccountTypeLabel(account.type)}
                  </Text>
                </View>

                <Text style={styles.accountBalance}>
                  {formatCurrency(account.current_balance)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeader title="Active Signals" meta={signalCountText} />

        {topInsights.length > 0 ? (
          <View style={styles.signalList}>
            {topInsights.map((insight) => (
              <View key={insight.id} style={styles.signalItem}>
                <View style={styles.signalCopy}>
                  <Text style={styles.signalTitle}>{insight.title}</Text>
                  <Text style={styles.signalMessage}>{insight.message}</Text>
                </View>

                <Badge
                  label={getInsightBadgeLabel(insight.severity)}
                  variant={
                    insight.severity === 'info'
                      ? 'info'
                      : insight.severity
                  }
                />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.assistantText}>
            No active warning right now. Keep spending below{' '}
            <Text style={styles.boldText}>
              {formatCurrency(safeDailyLimit)}
            </Text>{' '}
            today to keep this cycle safe.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  assistantHero: {
    gap: spacing.md,
  },
  assistantHeroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  assistantHeroTitleWrapper: {
    flex: 1,
  },
  eyebrow: {
    fontSize: typography.tiny,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  assistantHeadline: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  assistantLead: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  reasonPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reasonLabel: {
    fontSize: typography.tiny,
    fontWeight: '900',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  limitPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  limitItem: {
    flex: 1,
  },
  limitItemRight: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  mutedText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cycleMeta: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    fontWeight: '700',
  },
  moneyGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  safeLimit: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
  },
  daysLeft: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  accountList: {
    gap: spacing.md,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  accountType: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  accountBalance: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  assistantText: {
    marginTop: spacing.xs,
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  assistantRecommendation: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  signalList: {
    gap: spacing.md,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signalCopy: {
    flex: 1,
  },
  signalTitle: {
    fontSize: typography.body,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  signalMessage: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
});