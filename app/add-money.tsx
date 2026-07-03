import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
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
    getActiveCycleEnvelopes,
} from '../src/features/envelopes/envelope.repository';

import { createIncomeTransaction } from '../src/services/moneyService';

type MoneySource = 'freelance' | 'gift' | 'bonus' | 'refund' | 'other';

const moneySources: MoneySource[] = [
  'freelance',
  'gift',
  'bonus',
  'refund',
  'other',
];

function parseMoney(value: string) {
  const numericValue = value.replace(/[^0-9]/g, '');
  return Number(numericValue || 0);
}

function getSourceLabel(source: MoneySource) {
  switch (source) {
    case 'freelance':
      return 'Freelance';
    case 'gift':
      return 'Gift';
    case 'bonus':
      return 'Bonus';
    case 'refund':
      return 'Refund';
    default:
      return 'Other';
  }
}

export default function AddMoneyScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeWithAccount[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState('');

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<MoneySource>('freelance');
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

      await createIncomeTransaction({
        accountId: selectedAccountId,
        envelopeId: selectedEnvelopeId,
        amount: parseMoney(amount),
        source,
        note,
      });

      router.back();
    } catch (error) {
      Alert.alert(
        'Add Money Error',
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen>
      <PageHeader
        title="Add Money"
        subtitle="Record new money and place it directly into an envelope."
      />

      <Card>
        <SectionHeader title="Amount" />

        <MoneyInput
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 1000000"
        />

        <Text style={styles.helperText}>
          Example: input 1000000 for Rp1.000.000.
        </Text>
      </Card>

      <Card>
        <SectionHeader title="Source" />

        <View style={styles.optionGrid}>
          {moneySources.map((item) => (
            <Pressable
              key={item}
              onPress={() => setSource(item)}
              style={[
                styles.optionButton,
                source === item && styles.optionButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  source === item && styles.optionTextActive,
                ]}
              >
                {getSourceLabel(item)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Account" />

        <View style={styles.optionList}>
          {accounts.map((account) => (
            <OptionRow
              key={account.id}
              title={account.name}
              meta={`Current balance ${formatCurrency(account.current_balance)}`}
              selected={selectedAccountId === account.id}
              onPress={() => handleSelectAccount(account.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Allocate To" />

        {filteredEnvelopes.length === 0 ? (
          <Text style={styles.helperText}>
            No envelope found for this account. Create an envelope first.
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

        {selectedEnvelope ? (
          <Text style={styles.helperText}>
            This money will increase {selectedEnvelope.name}.
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title="Note" />

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. freelance payment, refund, bonus"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Card>

      <AppButton
        label={isSaving ? 'Saving...' : 'Save Money'}
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
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionList: {
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  optionText: {
    fontSize: typography.small,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.primary,
  },
  optionMeta: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textSecondary,
  },
});
