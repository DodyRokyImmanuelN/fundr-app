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
import {
  Account,
  getActiveAccounts,
} from '../src/features/accounts/account.repository';
import {
  EnvelopeWithAccount,
  getActiveCycleEnvelopes,
} from '../src/features/envelopes/envelope.repository';
import { adjustAccountBalance } from '../src/services/balanceAdjustmentService';
import { formatCurrency } from '../src/utils/currency';

function parseMoney(value: string) {
  const numericValue = value.replace(/[^0-9]/g, '');
  return Number(numericValue || 0);
}

export default function AdjustBalanceScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeWithAccount[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState('');
  const [actualBalanceInput, setActualBalanceInput] = useState('');
  const [note, setNote] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadOptions() {
        const [accountRows, envelopeRows] = await Promise.all([
          getActiveAccounts(),
          getActiveCycleEnvelopes(),
        ]);

        setAccounts(accountRows);
        setEnvelopes(envelopeRows);

        if (!selectedAccountId && accountRows.length > 0) {
          const firstAccount =
            accountRows.find((account) => account.type === 'daily_spending') ??
            accountRows[0];

          setSelectedAccountId(firstAccount.id);

          const firstEnvelope = envelopeRows.find(
            (envelope) => envelope.account_id === firstAccount.id
          );

          setSelectedEnvelopeId(firstEnvelope?.id ?? '');
        }
      }

      loadOptions();
    }, [selectedAccountId])
  );

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  const filteredEnvelopes = useMemo(() => {
    return envelopes.filter(
      (envelope) => envelope.account_id === selectedAccountId
    );
  }, [envelopes, selectedAccountId]);

  const selectedEnvelope = envelopes.find(
    (envelope) => envelope.id === selectedEnvelopeId
  );

  const actualBalance = parseMoney(actualBalanceInput);
  const hasActualBalance = actualBalanceInput.trim().length > 0;
  const difference = selectedAccount
    ? actualBalance - selectedAccount.current_balance
    : 0;
  const isIncrease = difference > 0;
  const isDecrease = difference < 0;

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

      await adjustAccountBalance({
        accountId: selectedAccountId,
        envelopeId: selectedEnvelopeId,
        actualBalance,
        note,
      });

      router.back();
    } catch (error) {
      Alert.alert(
        'Adjust Balance Error',
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsSaving(false);
    }
  }

  const isSubmitDisabled =
    isSaving ||
    !selectedAccountId ||
    !selectedEnvelopeId ||
    !hasActualBalance ||
    difference === 0;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Adjust Balance</Text>
          <Text style={styles.subtitle}>
            Match Fundr with your real account balance when there is a
            difference.
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
                    Fundr balance {formatCurrency(account.current_balance)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Real Balance</Text>

          <TextInput
            value={actualBalanceInput}
            onChangeText={setActualBalanceInput}
            keyboardType="number-pad"
            placeholder="e.g. 430000"
            style={styles.amountInput}
          />

          <Text style={styles.helperText}>
            Enter the current balance shown by your bank, wallet, or cash count.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Difference</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fundr</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(selectedAccount?.current_balance ?? 0)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Actual</Text>
            <Text style={styles.summaryValue}>
              {hasActualBalance ? formatCurrency(actualBalance) : '-'}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Adjustment</Text>
            <Text
              style={[
                styles.differenceValue,
                isIncrease && styles.increaseText,
                isDecrease && styles.decreaseText,
              ]}
            >
              {hasActualBalance
                ? `${isIncrease ? '+' : isDecrease ? '-' : ''}${formatCurrency(
                    Math.abs(difference)
                  )}`
                : '-'}
            </Text>
          </View>

          <Text style={styles.helperText}>
            {hasActualBalance && isIncrease
              ? 'Fundr will add this difference to the selected envelope.'
              : hasActualBalance && isDecrease
                ? 'Fundr will reduce this difference from the selected envelope.'
                : 'Input your real balance to calculate the adjustment.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Envelope</Text>

          {filteredEnvelopes.length === 0 ? (
            <Text style={styles.helperText}>
              No envelope found for this account.
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

          {selectedEnvelope ? (
            <Text style={styles.helperText}>
              {isIncrease
                ? `This adjustment will increase ${selectedEnvelope.name}.`
                : isDecrease
                  ? `This adjustment will reduce ${selectedEnvelope.name}.`
                  : `${selectedEnvelope.name} will absorb the difference.`}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Note</Text>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. bank balance reconciliation"
            style={styles.input}
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSubmitDisabled}
          style={[
            styles.submitButton,
            isSubmitDisabled && styles.submitButtonDisabled,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSaving ? 'Saving...' : 'Save Adjustment'}
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: {
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  differenceValue: {
    fontSize: typography.body,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  increaseText: {
    color: colors.success,
  },
  decreaseText: {
    color: colors.danger,
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
