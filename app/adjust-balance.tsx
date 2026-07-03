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
    <FormScreen>
      <PageHeader
        title="Adjust Balance"
        subtitle="Match Fundr with your real account balance when there is a difference."
      />

      <Card>
        <SectionHeader title="Account" />

        <View style={styles.optionList}>
          {accounts.map((account) => (
            <OptionRow
              key={account.id}
              title={account.name}
              meta={`Fundr balance ${formatCurrency(account.current_balance)}`}
              selected={selectedAccountId === account.id}
              onPress={() => handleSelectAccount(account.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Real Balance" />

        <MoneyInput
          value={actualBalanceInput}
          onChangeText={setActualBalanceInput}
          placeholder="e.g. 430000"
        />

        <Text style={styles.helperText}>
          Enter the current balance shown by your bank, wallet, or cash count.
        </Text>
      </Card>

      <Card style={styles.summaryCard}>
        <SectionHeader title="Difference" />

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
      </Card>

      <Card>
        <SectionHeader title="Envelope" />

        {filteredEnvelopes.length === 0 ? (
          <Text style={styles.helperText}>No envelope found for this account.</Text>
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
            {isIncrease
              ? `This adjustment will increase ${selectedEnvelope.name}.`
              : isDecrease
                ? `This adjustment will reduce ${selectedEnvelope.name}.`
                : `${selectedEnvelope.name} will absorb the difference.`}
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title="Note" />

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. bank balance reconciliation"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Card>

      <AppButton
        label={isSaving ? 'Saving...' : 'Save Adjustment'}
        onPress={handleSave}
        disabled={isSubmitDisabled}
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
  summaryCard: {
    backgroundColor: colors.surface,
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
});
