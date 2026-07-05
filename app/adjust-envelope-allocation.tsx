import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '../src/components/layout/FormScreen';
import { PageHeader } from '../src/components/layout/PageHeader';
import { AppButton } from '../src/components/ui/AppButton';
import { Card } from '../src/components/ui/Card';
import { MoneyInput } from '../src/components/ui/MoneyInput';
import { OptionRow } from '../src/components/ui/OptionRow';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import {
  EnvelopeWithAccount,
  getActiveCycleEnvelopes,
} from '../src/features/envelopes/envelope.repository';
import { adjustEnvelopeAllocation } from '../src/services/envelopeAllocationService';
import { colors, spacing, typography } from '../src/constants/theme';
import { formatCurrency } from '../src/utils/currency';

function parseMoney(value: string) {
  const numericValue = value.replace(/[^0-9]/g, '');
  return Number(numericValue || 0);
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdjustEnvelopeAllocationScreen() {
  const params = useLocalSearchParams<{ envelopeId?: string | string[] }>();
  const envelopeId = getParamValue(params.envelopeId);

  const [envelopes, setEnvelopes] = useState<EnvelopeWithAccount[]>([]);
  const [newPlannedAmount, setNewPlannedAmount] = useState('');
  const [counterpartyEnvelopeId, setCounterpartyEnvelopeId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadEnvelopes() {
        setIsLoading(true);

        const rows = await getActiveCycleEnvelopes();
        const target = rows.find((envelope) => envelope.id === envelopeId);

        setEnvelopes(rows);
        setNewPlannedAmount(
          target ? String(target.planned_amount) : ''
        );
        setCounterpartyEnvelopeId('');
        setIsLoading(false);
      }

      loadEnvelopes();
    }, [envelopeId])
  );

  const targetEnvelope = useMemo(() => {
    return envelopes.find((envelope) => envelope.id === envelopeId);
  }, [envelopes, envelopeId]);

  const parsedNewPlannedAmount = parseMoney(newPlannedAmount);
  const difference = targetEnvelope
    ? parsedNewPlannedAmount - targetEnvelope.planned_amount
    : 0;
  const transferAmount = Math.abs(difference);
  const isIncrease = difference > 0;
  const isDecrease = difference < 0;

  const counterpartyEnvelopes = useMemo(() => {
    if (!targetEnvelope) return [];

    return envelopes.filter((envelope) => {
      return (
        envelope.id !== targetEnvelope.id &&
        envelope.account_id === targetEnvelope.account_id &&
        envelope.budget_cycle_id === targetEnvelope.budget_cycle_id &&
        envelope.is_locked === targetEnvelope.is_locked
      );
    });
  }, [envelopes, targetEnvelope]);

  useEffect(() => {
    if (counterpartyEnvelopes.length === 0) {
      setCounterpartyEnvelopeId('');
      return;
    }

    const stillValid = counterpartyEnvelopes.some(
      (envelope) => envelope.id === counterpartyEnvelopeId
    );

    if (!stillValid) {
      setCounterpartyEnvelopeId(counterpartyEnvelopes[0].id);
    }
  }, [counterpartyEnvelopes, counterpartyEnvelopeId]);

  const selectedCounterparty = counterpartyEnvelopes.find(
    (envelope) => envelope.id === counterpartyEnvelopeId
  );

  const helperMessage = useMemo(() => {
    if (!targetEnvelope) {
      return 'Envelope not found.';
    }

    if (difference === 0) {
      return 'Enter a different planned amount to move allocation.';
    }

    if (!selectedCounterparty) {
      return isIncrease
        ? 'Choose the envelope that will provide the extra allocation.'
        : 'Choose the envelope that will receive the released allocation.';
    }

    if (isIncrease && selectedCounterparty.remaining_amount < transferAmount) {
      return 'Source envelope does not have enough remaining money.';
    }

    if (isDecrease && targetEnvelope.remaining_amount < transferAmount) {
      return 'Cannot reduce planned amount below money already used.';
    }

    return '';
  }, [
    difference,
    isDecrease,
    isIncrease,
    selectedCounterparty,
    targetEnvelope,
    transferAmount,
  ]);

  const canSave =
    Boolean(targetEnvelope) &&
    difference !== 0 &&
    Boolean(selectedCounterparty) &&
    helperMessage === '' &&
    !isSaving;

  async function handleSave() {
    if (!targetEnvelope) return;

    try {
      setIsSaving(true);

      await adjustEnvelopeAllocation({
        envelopeId: targetEnvelope.id,
        newPlannedAmount: parsedNewPlannedAmount,
        sourceEnvelopeId: isIncrease ? counterpartyEnvelopeId : undefined,
        destinationEnvelopeId: isDecrease ? counterpartyEnvelopeId : undefined,
      });

      router.back();
    } catch (error) {
      Alert.alert(
        'Adjust Allocation Error',
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen>
      <PageHeader
        title="Adjust Allocation"
        subtitle="Move planned money between envelopes without changing account balance."
      />

      {isLoading ? (
        <Card>
          <Text style={styles.helperText}>Loading envelope...</Text>
        </Card>
      ) : !targetEnvelope ? (
        <Card>
          <Text style={styles.helperText}>
            Envelope not found. Go back and choose an envelope again.
          </Text>
        </Card>
      ) : (
        <>
          <Card>
            <SectionHeader title="Current Envelope" />

            <Text style={styles.envelopeName}>{targetEnvelope.name}</Text>
            <Text style={styles.helperText}>{targetEnvelope.account_name}</Text>

            <View style={styles.amountGrid}>
              <View>
                <Text style={styles.label}>Planned</Text>
                <Text style={styles.amount}>
                  {formatCurrency(targetEnvelope.planned_amount)}
                </Text>
              </View>

              <View style={styles.amountRight}>
                <Text style={styles.label}>Remaining</Text>
                <Text style={styles.amount}>
                  {formatCurrency(targetEnvelope.remaining_amount)}
                </Text>
              </View>
            </View>
          </Card>

          <Card>
            <SectionHeader title="New Planned Amount" />

            <MoneyInput
              value={newPlannedAmount}
              onChangeText={setNewPlannedAmount}
              placeholder="e.g. 50000"
            />

            <Text style={styles.helperText}>
              This changes the plan and moves the difference from or to another
              envelope.
            </Text>
          </Card>

          <Card>
            <SectionHeader title="Difference" />

            <Text
              style={[
                styles.differenceAmount,
                isIncrease ? styles.increaseText : undefined,
                isDecrease ? styles.decreaseText : undefined,
              ]}
            >
              {difference > 0 ? '+' : ''}
              {formatCurrency(difference)}
            </Text>

            <Text style={styles.helperText}>
              {isIncrease
                ? `Needs ${formatCurrency(transferAmount)} from another envelope.`
                : isDecrease
                  ? `Releases ${formatCurrency(transferAmount)} to another envelope.`
                  : 'No allocation will move yet.'}
            </Text>
          </Card>

          <Card>
            <SectionHeader
              title={isIncrease ? 'Take From' : 'Move Released Money To'}
            />

            {counterpartyEnvelopes.length === 0 ? (
              <Text style={styles.helperText}>
                No matching envelope found for this account and allocation type.
              </Text>
            ) : (
              <View style={styles.optionList}>
                {counterpartyEnvelopes.map((envelope) => (
                  <OptionRow
                    key={envelope.id}
                    title={envelope.name}
                    meta={`Planned ${formatCurrency(
                      envelope.planned_amount
                    )} · Remaining ${formatCurrency(envelope.remaining_amount)}`}
                    selected={counterpartyEnvelopeId === envelope.id}
                    onPress={() => setCounterpartyEnvelopeId(envelope.id)}
                  />
                ))}
              </View>
            )}

            {helperMessage ? (
              <Text style={styles.warningText}>{helperMessage}</Text>
            ) : null}
          </Card>

          <AppButton
            label={isSaving ? 'Saving...' : 'Save Allocation'}
            onPress={handleSave}
            disabled={!canSave}
          />
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  envelopeName: {
    fontSize: typography.subheading,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  amountGrid: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  amountRight: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  amount: {
    fontSize: typography.body,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  differenceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  increaseText: {
    color: colors.success,
  },
  decreaseText: {
    color: colors.warning,
  },
  optionList: {
    gap: spacing.sm,
  },
  helperText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  warningText: {
    fontSize: typography.small,
    color: colors.danger,
    lineHeight: 20,
  },
});
