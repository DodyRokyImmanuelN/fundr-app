import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MoneyCard } from '../../src/components/dashboard/MoneyCard';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';

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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Fundr</Text>
          <Text style={styles.subtitle}>Your money, planned clearly.</Text>
        </View>

        <Badge label="Safe" variant="safe" />
      </View>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Cycle</Text>
          <Text style={styles.sectionMeta}>{remainingDays} days left</Text>
        </View>

        <Text style={styles.cycleName}>{cycle?.name ?? 'No active cycle'}</Text>

        {cycle ? (
          <Text style={styles.mutedText}>
            {cycle.start_date} - {cycle.end_date}
          </Text>
        ) : (
          <Text style={styles.mutedText}>
            Confirm your income to start a budget cycle.
          </Text>
        )}
      </Card>

      <View style={styles.moneyGrid}>
        <MoneyCard
          label="Flexible Money"
          amount={flexibleMoney}
          description="Money available for this cycle"
        />

        <MoneyCard
          label="Protected Money"
          amount={protectedMoney}
          description="Savings, subscriptions, and locked funds"
        />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Safe Daily Limit</Text>

        <Text style={styles.safeLimit}>{formatCurrency(safeDailyLimit)}</Text>

        <Text style={styles.mutedText}>
          Keep today’s spending below this amount to stay on track.
        </Text>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <Text style={styles.sectionMeta}>{accounts.length} active</Text>
        </View>

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
        <Text style={styles.sectionTitle}>Assistant Summary</Text>

        <Text style={styles.assistantText}>
          You are still on track. Keep spending below{' '}
          <Text style={styles.boldText}>{formatCurrency(safeDailyLimit)}</Text>{' '}
          today to keep this cycle safe.
        </Text>
      </Card>

      <Pressable
        onPress={() => router.push('/add-transaction')}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>Add Expense</Text>
      </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  appName: {
    fontSize: typography.title,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  cycleName: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  mutedText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  moneyGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  safeLimit: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
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
    marginTop: spacing.sm,
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '800',
  },
});