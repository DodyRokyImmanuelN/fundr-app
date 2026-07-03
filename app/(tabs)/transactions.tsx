import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

  return transaction.envelope_name ?? transaction.category ?? 'Expense';
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>
            Track expenses and extra money recorded in Fundr.
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => router.push('/add-transaction')}
          style={[styles.actionButton, styles.expenseButton]}
        >
          <Text style={styles.actionButtonText}>Add Expense</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/add-money')}
          style={[styles.actionButton, styles.moneyButton]}
        >
          <Text style={styles.actionButtonText}>Add Money</Text>
        </Pressable>
      </View>

      {transactions.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No transaction yet</Text>
          <Text style={styles.mutedText}>
            Add your first expense or money in to start tracking your money flow.
          </Text>
        </Card>
      ) : (
        <View style={styles.transactionList}>
          {transactions.map((transaction) => {
            const isIncome = transaction.type === 'income';

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
                      isIncome ? styles.incomeAmount : styles.expenseAmount,
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}
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
    gap: spacing.md,
  },
  headerText: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  expenseButton: {
    backgroundColor: colors.primary,
  },
  moneyButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '800',
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