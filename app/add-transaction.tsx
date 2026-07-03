import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FormScreen } from '../src/components/layout/FormScreen';
import { PageHeader } from '../src/components/layout/PageHeader';
import { AppButton } from '../src/components/ui/AppButton';
import { Card } from '../src/components/ui/Card';
import { MoneyInput } from '../src/components/ui/MoneyInput';
import { OptionRow } from '../src/components/ui/OptionRow';
import { SectionHeader } from '../src/components/ui/SectionHeader';
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
    <FormScreen>
      <PageHeader
        title="Add Expense"
        subtitle="Record daily spending and update your envelope automatically."
      />

      <Card>
        <SectionHeader title="Amount" />

        <MoneyInput
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 20000"
        />

        <Text style={styles.helperText}>
          Input numbers only. Example: 20000 for Rp20.000.
        </Text>
      </Card>

      <Card>
        <SectionHeader title="Account" />

        <View style={styles.optionList}>
          {accounts.map((account) => (
            <OptionRow
              key={account.id}
              title={account.name}
              meta={formatCurrency(account.current_balance)}
              selected={selectedAccountId === account.id}
              onPress={() => handleSelectAccount(account.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Envelope" />

        {filteredEnvelopes.length === 0 ? (
          <Text style={styles.helperText}>
            No spendable envelope found for this account.
          </Text>
        ) : (
          <View style={styles.optionList}>
            {filteredEnvelopes.map((envelope) => (
              <OptionRow
                key={envelope.id}
                title={envelope.name}
                meta={`Remaining ${formatCurrency(envelope.remaining_amount)}`}
                selected={selectedEnvelopeId === envelope.id}
                onPress={() => setSelectedEnvelopeId(envelope.id)}
              />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeader title="Note" />

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Just Coffee, lunch, parking"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        {selectedEnvelope ? (
          <Text style={styles.helperText}>
            This expense will be recorded under {selectedEnvelope.name}.
          </Text>
        ) : null}
      </Card>

      <AppButton
        label={isSaving ? 'Saving...' : 'Save Expense'}
        onPress={handleSave}
        disabled={isSaving || !selectedAccountId || !selectedEnvelopeId}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
});
