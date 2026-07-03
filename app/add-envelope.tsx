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

import { createEnvelope } from '../src/services/envelopeService';

type EnvelopeType =
  | 'need'
  | 'want'
  | 'saving'
  | 'subscription'
  | 'buffer'
  | 'reward'
  | 'other';

const envelopeTypes: EnvelopeType[] = [
  'need',
  'want',
  'saving',
  'subscription',
  'buffer',
  'reward',
  'other',
];

function parseMoney(value: string) {
  const numericValue = value.replace(/[^0-9]/g, '');
  return Number(numericValue || 0);
}

function getEnvelopeTypeLabel(type: EnvelopeType) {
  switch (type) {
    case 'need':
      return 'Need';
    case 'want':
      return 'Want';
    case 'saving':
      return 'Saving';
    case 'subscription':
      return 'Subscription';
    case 'buffer':
      return 'Buffer';
    case 'reward':
      return 'Reward';
    default:
      return 'Other';
  }
}

export default function AddEnvelopeScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeWithAccount[]>([]);

  const [name, setName] = useState('');
  const [type, setType] = useState<EnvelopeType>('need');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sourceEnvelopeId, setSourceEnvelopeId] = useState('');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadData() {
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

          const firstSourceEnvelope = envelopeRows.find(
            (envelope) =>
              envelope.account_id === firstAccount.id &&
              envelope.remaining_amount > 0
          );

          setSourceEnvelopeId(firstSourceEnvelope?.id ?? '');
        }
      }

      loadData();
    }, [selectedAccountId])
  );

  const sourceEnvelopes = useMemo(() => {
    return envelopes.filter(
      (envelope) =>
        envelope.account_id === selectedAccountId &&
        envelope.remaining_amount > 0
    );
  }, [envelopes, selectedAccountId]);

  function handleSelectAccount(accountId: string) {
    setSelectedAccountId(accountId);

    const firstSourceEnvelope = envelopes.find(
      (envelope) =>
        envelope.account_id === accountId && envelope.remaining_amount > 0
    );

    setSourceEnvelopeId(firstSourceEnvelope?.id ?? '');
  }

  async function handleSave() {
    try {
      setIsSaving(true);

      await createEnvelope({
        name,
        type,
        accountId: selectedAccountId,
        sourceEnvelopeId,
        plannedAmount: parseMoney(plannedAmount),
        isLocked,
      });

      router.back();
    } catch (error) {
      Alert.alert(
        'Envelope Error',
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen>
      <PageHeader
        title="Add Envelope"
        subtitle="Create a new money pocket and fund it from an existing envelope."
      />

      <Card>
        <SectionHeader title="Envelope Details" />

        <Text style={styles.label}>Envelope name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Laundry, Internet, Pet Needs"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Envelope type</Text>
        <View style={styles.optionGrid}>
          {envelopeTypes.map((item) => (
            <Pressable
              key={item}
              onPress={() => setType(item)}
              style={[
                styles.optionButton,
                type === item && styles.optionButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  type === item && styles.optionTextActive,
                ]}
              >
                {getEnvelopeTypeLabel(item)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Money Mode" />

        <View style={styles.optionGrid}>
          <Pressable
            onPress={() => setIsLocked(false)}
            style={[
              styles.optionButton,
              !isLocked && styles.optionButtonActive,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                !isLocked && styles.optionTextActive,
              ]}
            >
              Flexible
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setIsLocked(true)}
            style={[
              styles.optionButton,
              isLocked && styles.optionButtonActive,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                isLocked && styles.optionTextActive,
              ]}
            >
              Protected
            </Text>
          </Pressable>
        </View>

        <Text style={styles.helperText}>
          Flexible envelopes can be used for daily expenses. Protected envelopes
          are locked for savings, bills, or subscriptions.
        </Text>
      </Card>

      <Card>
        <SectionHeader title="Account" />

        <View style={styles.optionList}>
          {accounts.map((account) => (
            <OptionRow
              key={account.id}
              title={account.name}
              meta={`Balance ${formatCurrency(account.current_balance)}`}
              selected={selectedAccountId === account.id}
              onPress={() => handleSelectAccount(account.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Initial Allocation" />

        <Text style={styles.label}>Amount</Text>
        <MoneyInput
          value={plannedAmount}
          onChangeText={setPlannedAmount}
          placeholder="e.g. 50000"
        />

        <Text style={styles.label}>Fund from</Text>

        {sourceEnvelopes.length === 0 ? (
          <Text style={styles.helperText}>
            No envelope with remaining money found for this account.
          </Text>
        ) : (
          <View style={styles.optionList}>
            {sourceEnvelopes.map((envelope) => (
              <OptionRow
                key={envelope.id}
                title={envelope.name}
                meta={`Remaining ${formatCurrency(envelope.remaining_amount)}`}
                selected={sourceEnvelopeId === envelope.id}
                onPress={() => setSourceEnvelopeId(envelope.id)}
              />
            ))}
          </View>
        )}

        <Text style={styles.helperText}>
          This will move money from the selected source envelope into your new
          envelope. Total account balance will not change.
        </Text>
      </Card>

      <AppButton
        label={isSaving ? 'Saving...' : 'Create Envelope'}
        onPress={handleSave}
        disabled={isSaving || !selectedAccountId}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.textSecondary,
  },
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
});
