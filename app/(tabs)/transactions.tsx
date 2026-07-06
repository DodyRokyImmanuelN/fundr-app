import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '../../src/components/layout/PageHeader';
import { Screen } from '../../src/components/layout/Screen';
import { AppButton } from '../../src/components/ui/AppButton';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography } from '../../src/constants/theme';
import {
  getRecentTransactions,
  TransactionWithDetails,
} from '../../src/features/transactions/transaction.repository';
import { formatCurrency } from '../../src/utils/currency';

function getTransactionTitle(transaction: TransactionWithDetails) {
  if (transaction.type === 'income') {
    switch (transaction.category) {
      case 'regular_income':
        return 'Regular Income';
      case 'freelance':
        return 'Freelance Income';
      case 'gift':
        return 'Gift';
      case 'bonus':
        return 'Bonus';
      case 'refund':
        return 'Refund';
      default:
        return 'Money In';
    }
  }

  if (transaction.type === 'adjustment') {
    return transaction.category === 'balance_increase'
      ? 'Balance Adjustment In'
      : 'Balance Adjustment Out';
  }

  if (transaction.type === 'transfer') {
    switch (transaction.category) {
      case 'allocation_increase':
      case 'allocation_decrease':
        return 'Allocation Transfer';
      default:
        return 'Transfer';
    }
  }

  return transaction.envelope_name ?? transaction.category ?? 'Expense';
}

function getTransactionTone(transaction: TransactionWithDetails) {
  if (transaction.type === 'income') {
    return 'positive';
  }

  if (transaction.type === 'expense') {
    return 'negative';
  }

  if (transaction.type === 'adjustment') {
    return transaction.category === 'balance_increase'
      ? 'positive'
      : 'negative';
  }

  return 'neutral';
}

function getTransactionSign(transaction: TransactionWithDetails) {
  const tone = getTransactionTone(transaction);

  if (tone === 'positive') return '+';
  if (tone === 'negative') return '-';
  return '';
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function loadTransactions() {
        const rows = await getRecentTransactions();
        setTransactions(rows);
      }

      loadTransactions();
    }, [])
  );

  return (
    <Screen>
      <PageHeader
        title="Transactions"
        subtitle="Track expenses, extra money, regular income, and balance corrections."
      />

      <View style={styles.actionRow}>
        <AppButton
          label="Add Expense"
          onPress={() => router.push('/add-transaction')}
          style={[styles.actionButton, styles.expenseButton]}
        />

        <AppButton
          label="Add Money"
          variant="success"
          onPress={() => router.push('/add-money')}
          style={[styles.actionButton, styles.moneyButton]}
        />

        <AppButton
          label="Adjust Balance"
          variant="warning"
          onPress={() => router.push('/adjust-balance')}
          style={[styles.actionButton, styles.adjustButton]}
        />

        <AppButton
          label="Confirm Income"
          variant="success"
          onPress={() => router.push('/income-confirmation')}
          style={[styles.actionButton, styles.incomeButton]}
        />
      </View>

      {transactions.length === 0 ? (
        <Card muted>
          <Text style={styles.emptyTitle}>No transaction yet</Text>
          <Text style={styles.mutedText}>
            Add your first expense, money in, or confirmed income to start
            tracking your money flow.
          </Text>
        </Card>
      ) : (
        <View style={styles.transactionList}>
          {transactions.map((transaction) => {
            const tone = getTransactionTone(transaction);
            const sign = getTransactionSign(transaction);
            const displayAmount = Math.abs(transaction.amount);

            return (
              <Card key={transaction.id}>
                <View style={styles.transactionItem}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>
                      {getTransactionTitle(transaction)}
                    </Text>

                    <Text style={styles.transactionMeta}>
                      {transaction.account_name} · {transaction.date}
                    </Text>

                    {transaction.envelope_name ? (
                      <Text style={styles.transactionMeta}>
                        Envelope: {transaction.envelope_name}
                      </Text>
                    ) : null}

                    {transaction.note ? (
                      <Text style={styles.transactionNote}>
                        {transaction.note}
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      tone === 'positive' ? styles.incomeAmount : undefined,
                      tone === 'negative' ? styles.expenseAmount : undefined,
                      tone === 'neutral' ? styles.neutralAmount : undefined,
                    ]}
                  >
                    {sign}
                    {formatCurrency(displayAmount)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  expenseButton: {
    backgroundColor: colors.primary,
  },
  moneyButton: {
    backgroundColor: colors.success,
  },
  adjustButton: {
    backgroundColor: colors.warning,
  },
  incomeButton: {
    backgroundColor: colors.success,
  },
  emptyTitle: {
    fontSize: typography.subheading,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  mutedText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  transactionList: {
    gap: spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  transactionMeta: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  transactionNote: {
    marginTop: spacing.sm,
    fontSize: typography.small,
    color: colors.textMuted,
  },
  transactionAmount: {
    fontSize: typography.body,
    fontWeight: '900',
  },
  incomeAmount: {
    color: colors.success,
  },
  expenseAmount: {
    color: colors.danger,
  },
  neutralAmount: {
    color: colors.textSecondary,
  },
});
