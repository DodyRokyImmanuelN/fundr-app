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
import { calculateSafeDailyLimit } from '../../src/utils/calculations';
import { formatCurrency } from '../../src/utils/currency';
import { getRemainingDays } from '../../src/utils/date';

type AccountRow = {
  id: string;
  name: string;
  type: string;
  current_balance: number;
};

type CycleRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  actual_amount: number;
};

type MoneySummaryRow = {
  total: number;
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
  const [cycle, setCycle] = useState<CycleRow | null>(null);
  const [safeDailyLimit, setSafeDailyLimit] = useState(0);
  const [remainingDays, setRemainingDays] = useState(0);
  const [flexibleMoney, setFlexibleMoney] = useState(0);
  const [protectedMoney, setProtectedMoney] = useState(0);

  useFocusEffect(
    useCallback(() => {
      async function loadDashboard() {
        const db = await getDatabase();

        const accountRows = await db.getAllAsync<AccountRow>(
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
        );

        const activeCycle = await db.getFirstAsync<CycleRow>(
          `
          SELECT id, name, start_date, end_date, actual_amount
          FROM budget_cycles
          WHERE status = 'active'
          LIMIT 1;
          `
        );

        if (activeCycle) {
          const flexibleMoneyRow = await db.getFirstAsync<MoneySummaryRow>(
            `
            SELECT COALESCE(SUM(remaining_amount), 0) as total
            FROM envelopes
            WHERE budget_cycle_id = ?
            AND is_locked = 0;
            `,
            [activeCycle.id]
          );

          const protectedMoneyRow = await db.getFirstAsync<MoneySummaryRow>(
            `
            SELECT COALESCE(SUM(remaining_amount), 0) as total
            FROM envelopes
            WHERE budget_cycle_id = ?
            AND is_locked = 1;
            `,
            [activeCycle.id]
          );

          const daysLeft = getRemainingDays(activeCycle.end_date);
          const limit = calculateSafeDailyLimit(
            flexibleMoneyRow?.total ?? 0,
            daysLeft
          );

          setCycle(activeCycle);
          setRemainingDays(daysLeft);
          setSafeDailyLimit(limit);
          setFlexibleMoney(flexibleMoneyRow?.total ?? 0);
          setProtectedMoney(protectedMoneyRow?.total ?? 0);
        } else {
          setCycle(null);
          setRemainingDays(0);
          setSafeDailyLimit(0);
          setFlexibleMoney(0);
          setProtectedMoney(0);
        }

        setAccounts(accountRows);
      }

      loadDashboard();
    }, [])
  );

  return (
    <Screen>
      <PageHeader
        title="Fundr"
        subtitle="Your money, planned clearly."
        trailing={<Badge label="Safe" variant="safe" />}
      />

      <Card style={styles.heroCard}>
        <SectionHeader title="Safe Daily Limit" meta={`${remainingDays} days left`} />

        <Text style={styles.safeLimit}>{formatCurrency(safeDailyLimit)}</Text>

        <Text style={styles.mutedText}>
          Keep spending below this amount today to keep the cycle safe.
        </Text>

        {cycle ? (
          <Text style={styles.cycleMeta}>
            {cycle.start_date} - {cycle.end_date}
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
        <SectionHeader title="Assistant Summary" />

        <Text style={styles.assistantText}>
          You are still on track. Keep spending below{' '}
          <Text style={styles.boldText}>{formatCurrency(safeDailyLimit)}</Text>{' '}
          today to keep this cycle safe.
        </Text>
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
  assistantText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
