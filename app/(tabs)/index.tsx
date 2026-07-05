import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '../../src/components/layout/PageHeader';
import { Screen } from '../../src/components/layout/Screen';
import { MoneyCard } from '../../src/components/dashboard/MoneyCard';
import { AppButton } from '../../src/components/ui/AppButton';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { SectionHeader } from '../../src/components/ui/SectionHeader';

import { colors, spacing, typography } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/database';
import {
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
  const topInsight = assistantSummary?.insights[0];

  return (
    <Screen>
      <PageHeader
        title="Fundr"
        subtitle="Your money, planned clearly."
        trailing={<Badge label={assistantStatus.label} variant={assistantStatus.variant} />}
      />

      <Card style={styles.heroCard}>
        <SectionHeader title="Safe Daily Limit" meta={`${remainingDays} days left`} />

        <Text style={styles.safeLimit}>{formatCurrency(safeDailyLimit)}</Text>

        <Text style={styles.mutedText}>
          {activeCycle
            ? 'Keep spending below this amount today to keep the cycle safe.'
            : 'Confirm income to start a cycle and calculate your daily limit.'}
        </Text>

        {activeCycle ? (
          <Text style={styles.cycleMeta}>
            {activeCycle.start_date} - {activeCycle.end_date}
          </Text>
        ) : null}
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
            label="Add Money"
            variant="success"
            onPress={() => router.push('/add-money')}
            style={styles.actionButton}
          />
          <AppButton
            label="Adjust Balance"
            variant="warning"
            onPress={() => router.push('/adjust-balance')}
            style={styles.actionButtonWide}
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
        <SectionHeader title="Assistant Summary" meta={assistantStatus.label} />

        {topInsight ? (
          <>
            <Text style={styles.assistantTitle}>{topInsight.title}</Text>
            <Text style={styles.assistantText}>{topInsight.message}</Text>
            {topInsight.recommendation ? (
              <Text style={styles.assistantRecommendation}>
                {topInsight.recommendation}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.assistantText}>
            You are still on track. Keep spending below{' '}
            <Text style={styles.boldText}>{formatCurrency(safeDailyLimit)}</Text>{' '}
            today to keep this cycle safe.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primarySoft,
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  actionButtonWide: {
    flexGrow: 1,
    flexBasis: '100%',
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
  assistantTitle: {
    fontSize: typography.body,
    fontWeight: '900',
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
  boldText: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
