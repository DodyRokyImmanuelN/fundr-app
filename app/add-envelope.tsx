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
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Envelope</Text>
          <Text style={styles.subtitle}>
            Create a new money pocket and fund it from an existing envelope.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Envelope Details</Text>

          <Text style={styles.label}>Envelope name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Laundry, Internet, Pet Needs"
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
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Money Mode</Text>

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
            Flexible envelopes can be used for daily expenses. Protected
            envelopes are locked for savings, bills, or subscriptions.
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
                  styles.accountButton,
                  selectedAccountId === account.id &&
                    styles.optionButtonActive,
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.optionTitle,
                      selectedAccountId === account.id &&
                        styles.optionTextActive,
                    ]}
                  >
                    {account.name}
                  </Text>
                  <Text style={styles.optionMeta}>
                    Balance {formatCurrency(account.current_balance)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Initial Allocation</Text>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={plannedAmount}
            onChangeText={setPlannedAmount}
            keyboardType="number-pad"
            placeholder="e.g. 50000"
            style={styles.amountInput}
          />

          <Text style={styles.label}>Fund from</Text>

          {sourceEnvelopes.length === 0 ? (
            <Text style={styles.helperText}>
              No envelope with remaining money found for this account.
            </Text>
          ) : (
            <View style={styles.optionList}>
              {sourceEnvelopes.map((envelope) => (
                <Pressable
                  key={envelope.id}
                  onPress={() => setSourceEnvelopeId(envelope.id)}
                  style={[
                    styles.accountButton,
                    sourceEnvelopeId === envelope.id &&
                      styles.optionButtonActive,
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.optionTitle,
                        sourceEnvelopeId === envelope.id &&
                          styles.optionTextActive,
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

          <Text style={styles.helperText}>
            This will move money from the selected source envelope into your new
            envelope. Total account balance will not change.
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving || !selectedAccountId}
          style={[
            styles.submitButton,
            (isSaving || !selectedAccountId) && styles.submitButtonDisabled,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSaving ? 'Saving...' : 'Create Envelope'}
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
  label: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.textSecondary,
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
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 26,
    fontWeight: '800',
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
  accountButton: {
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
  optionText: {
    fontSize: typography.small,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.primary,
  },
  optionTitle: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
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