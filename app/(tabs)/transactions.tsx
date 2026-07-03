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
        <View>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>
            Track expenses recorded in your active budget cycle.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/add-transaction')}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>Add</Text>
        </Pressable>
      </View>

      {transactions.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No transaction yet</Text>
          <Text style={styles.mutedText}>
            Add your first expense to start tracking your money flow.
          </Text>
        </Card>
      ) : (
        <View style={styles.transactionList}>
          {transactions.map((transaction) => (
            <Card key={transaction.id}>
              <View style={styles.transactionItem}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {transaction.envelope_name ?? transaction.category ?? 'Expense'}
                  </Text>
                  <Text style={styles.transactionMeta}>
                    {transaction.account_name} · {transaction.date}
                  </Text>
                  {transaction.note ? (
                    <Text style={styles.transactionNote}>{transaction.note}</Text>
                  ) : null}
                </View>

                <Text style={styles.transactionAmount}>
                  -{formatCurrency(transaction.amount)}
                </Text>
              </View>
            </Card>
          ))}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  headerButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButtonText: {
    color: '#FFFFFF',
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
    color: colors.danger,
  },
});