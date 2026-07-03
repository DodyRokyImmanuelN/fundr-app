import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { getDatabase } from '../../src/db/database';
import { formatCurrency } from '../../src/utils/currency';
import { calculateSafeDailyLimit } from '../../src/utils/calculations';
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

  useEffect(() => {
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
      }

      setAccounts(accountRows);
    }

    loadDashboard();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 32, fontWeight: '800' }}>Fundr</Text>

      <View
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#f2f2f2',
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700' }}>
          Active Cycle
        </Text>

        <Text>{cycle?.name ?? 'No active cycle'}</Text>

        {cycle && (
          <Text>
            {cycle.start_date} - {cycle.end_date}
          </Text>
        )}
      </View>

      <View
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#f2f2f2',
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700' }}>
          Money Summary
        </Text>

        <Text>Flexible Money: {formatCurrency(flexibleMoney)}</Text>
        <Text>Protected Money: {formatCurrency(protectedMoney)}</Text>
        <Text>Days Left: {remainingDays}</Text>
        <Text>Safe Daily Limit: {formatCurrency(safeDailyLimit)}</Text>
      </View>

      <View
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#f2f2f2',
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Accounts</Text>

        {accounts.length === 0 ? (
          <Text>No account found.</Text>
        ) : (
          accounts.map((account) => (
            <View
              key={account.id}
              style={{
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#ddd',
                gap: 2,
              }}
            >
              <Text style={{ fontWeight: '700' }}>{account.name}</Text>
              <Text>{getAccountTypeLabel(account.type)}</Text>
              <Text>{formatCurrency(account.current_balance)}</Text>
            </View>
          ))
        )}
      </View>

      <View
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#f2f2f2',
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700' }}>
          Assistant Summary
        </Text>

        <Text>Status: Safe</Text>

        <Text>
          Suggestion: Keep your spending below{' '}
          {formatCurrency(safeDailyLimit)} today.
        </Text>
      </View>
    </ScrollView>
  );
}