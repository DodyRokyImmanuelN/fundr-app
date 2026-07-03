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
      ? 'Balance Adjustment'
      : 'Balance Correction';
  }

  return transaction.envelope_name ?? transaction.category ?? 'Expense';
}

function isPositiveTransaction(transaction: TransactionWithDetails) {
  return (
    transaction.type === 'income' ||
    (transaction.type === 'adjustment' &&
      transaction.category === 'balance_increase')
  );
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
        subtitle="Track expenses, extra money, and balance corrections."
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
      </View>

      {transactions.length === 0 ? (
        <Card muted>
          <Text style={styles.emptyTitle}>No transaction yet</Text>
          <Text style={styles.mutedText}>
            Add your first expense or money in to start tracking your money flow.
          </Text>
        </Card>
      ) : (
        <View style={styles.transactionList}>
          {transactions.map((transaction) => {
            const isPositive = isPositiveTransaction(transaction);

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
                      isPositive ? styles.incomeAmount : styles.expenseAmount,
                    ]}
                  >
                    {isPositive ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
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
    flexBasis: '100%',
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
});
