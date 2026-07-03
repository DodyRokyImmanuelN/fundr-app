import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../src/constants/theme';
import { formatCurrency } from '../src/utils/currency';

import {
  Account,
  getActiveAccounts,
} from '../src/features/accounts/account.repository';

import {
  EnvelopeWithAccount,
  getSpendableActiveCycleEnvelopes,
} from '../src/features/envelopes/envelope.repository';

import { createExpenseTransaction } from '../src/services/transactionService';

function parseMoney(value: string) {
  const numericValue = value.replace(/[^0-9]/g, '');
  return Number(numericValue || 0);
}

export default function AddTransactionScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeWithAccount[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState('');

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadOptions() {
        const [accountRows, envelopeRows] = await Promise.all([
          getActiveAccounts(),
          getSpendableActiveCycleEnvelopes(),
        ]);

        setAccounts(accountRows);
        setEnvelopes(envelopeRows);

        if (!selectedAccountId && accountRows.length > 0) {
          const firstSpendingAccount =
            accountRows.find((account) => account.type === 'daily_spending') ??
            accountRows[0];

          setSelectedAccountId(firstSpendingAccount.id);

          const firstEnvelope = envelopeRows.find(
            (envelope) => envelope.account_id === firstSpendingAccount.id
          );

          if (firstEnvelope) {
            setSelectedEnvelopeId(firstEnvelope.id);
          }
        }
      }

      loadOptions();
    }, [selectedAccountId])
  );

  const filteredEnvelopes = useMemo(() => {
    return envelopes.filter(
      (envelope) => envelope.account_id === selectedAccountId
    );
  }, [envelopes, selectedAccountId]);

  const selectedEnvelope = envelopes.find(
    (envelope) => envelope.id === selectedEnvelopeId
  );

  function handleSelectAccount(accountId: string) {
    setSelectedAccountId(accountId);

    const firstEnvelopeForAccount = envelopes.find(
      (envelope) => envelope.account_id === accountId
    );

    setSelectedEnvelopeId(firstEnvelopeForAccount?.id ?? '');
  }

  async function handleSave() {
    try {
      setIsSaving(true);

      await createExpenseTransaction({
        accountId: selectedAccountId,
        envelopeId: selectedEnvelopeId,
        amount: parseMoney(amount),
        note,
      });

      router.back();
    } catch (error) {
      Alert.alert(
        'Transaction Error',
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Expense</Text>
          <Text style={styles.subtitle}>
            Record daily spending and update your envelope automatically.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Amount</Text>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="e.g. 20000"
            style={styles.amountInput}
          />

          <Text style={styles.helperText}>
            Input numbers only. Example: 20000 for Rp20.000.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.optionList}>
            {accounts.map((account) => (
              <Pressable
                key={account.id}
                onPress={() => handleSelectAccount(account.id)}
                style={[
                  styles.optionButton,
                  selectedAccountId === account.id && styles.optionButtonActive,
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.optionTitle,
                      selectedAccountId === account.id &&
                        styles.optionTitleActive,
                    ]}
                  >
                    {account.name}
                  </Text>
                  <Text style={styles.optionMeta}>
                    {formatCurrency(account.current_balance)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Envelope</Text>

          {filteredEnvelopes.length === 0 ? (
            <Text style={styles.helperText}>
              No spendable envelope found for this account.
            </Text>
          ) : (
            <View style={styles.optionList}>
              {filteredEnvelopes.map((envelope) => (
                <Pressable
                  key={envelope.id}
                  onPress={() => setSelectedEnvelopeId(envelope.id)}
                  style={[
                    styles.optionButton,
                    selectedEnvelopeId === envelope.id &&
                      styles.optionButtonActive,
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.optionTitle,
                        selectedEnvelopeId === envelope.id &&
                          styles.optionTitleActive,
                      ]}
                    >
                      {envelope.name}
                    </Text>
                    <Text style={styles.optionMeta}>
                      Remaining {formatCurrency(envelope.remaining_amount)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Note</Text>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Just Coffee, lunch, parking"
            style={styles.input}
          />

          {selectedEnvelope ? (
            <Text style={styles.helperText}>
              This expense will be recorded under {selectedEnvelope.name}.
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving || !selectedAccountId || !selectedEnvelopeId}
          style={[
            styles.submitButton,
            (isSaving || !selectedAccountId || !selectedEnvelopeId) &&
              styles.submitButtonDisabled,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSaving ? 'Saving...' : 'Save Expense'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.xl,
    paddingTop: spacing['3xl'],
    gap: spacing.lg,
  },
  header: {
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.subheading,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  helperText: {
    fontSize: typography.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  optionList: {
    gap: spacing.sm,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  optionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionTitle: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  optionTitleActive: {
    color: colors.primary,
  },
  optionMeta: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '800',
  },
});