import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormScreen } from '../src/components/layout/FormScreen';
import { PageHeader } from '../src/components/layout/PageHeader';
import { AppButton } from '../src/components/ui/AppButton';
import { Card } from '../src/components/ui/Card';
import { MoneyInput } from '../src/components/ui/MoneyInput';
import { OptionRow } from '../src/components/ui/OptionRow';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { colors, radius, spacing, typography } from '../src/constants/theme';
import {
  getActiveIncomeSources,
  IncomeSource,
} from '../src/features/income/income.repository';
import { confirmIncomeAndStartNewCycle } from '../src/services/incomeCycleService';
import { formatCurrency } from '../src/utils/currency';
import { getTodayISODate } from '../src/utils/date';

function parseMoney(value: string) {
  const numericValue = value.replace(/[^0-9]/g, '');
  return Number(numericValue || 0);
}

function getFrequencyLabel(frequency: string) {
  switch (frequency) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Bi-weekly';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return 'Custom';
    case 'irregular':
      return 'Irregular';
    default:
      return frequency;
  }
}

function getIncomeSourceMeta(incomeSource: IncomeSource) {
  const frequency = getFrequencyLabel(incomeSource.frequency);

  if (!incomeSource.expected_amount) {
    return frequency;
  }

  return `${frequency} · Expected ${formatCurrency(
    incomeSource.expected_amount
  )}`;
}

function isDateLike(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default function IncomeConfirmationScreen() {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [selectedIncomeSourceId, setSelectedIncomeSourceId] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState(getTodayISODate());
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadIncomeSources() {
        setIsLoading(true);

        const rows = await getActiveIncomeSources();

        setIncomeSources(rows);

        if (!selectedIncomeSourceId && rows.length > 0) {
          const firstIncomeSource = rows[0];

          setSelectedIncomeSourceId(firstIncomeSource.id);
          setReceivedAmount(
            firstIncomeSource.expected_amount
              ? String(firstIncomeSource.expected_amount)
              : ''
          );
        }

        setIsLoading(false);
      }

      loadIncomeSources();
    }, [selectedIncomeSourceId])
  );

  const selectedIncomeSource = incomeSources.find(
    (incomeSource) => incomeSource.id === selectedIncomeSourceId
  );
  const parsedReceivedAmount = parseMoney(receivedAmount);
  const canConfirm =
    Boolean(selectedIncomeSourceId) &&
    parsedReceivedAmount > 0 &&
    isDateLike(receivedDate) &&
    !isSaving;

  function handleSelectIncomeSource(incomeSource: IncomeSource) {
    setSelectedIncomeSourceId(incomeSource.id);
    setReceivedAmount(
      incomeSource.expected_amount ? String(incomeSource.expected_amount) : ''
    );
  }

  async function handleConfirmIncome() {
    try {
      setIsSaving(true);

      await confirmIncomeAndStartNewCycle({
        incomeSourceId: selectedIncomeSourceId,
        receivedAmount: parsedReceivedAmount,
        receivedDate,
        note,
      });

      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Income Confirmation Error',
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen>
      <PageHeader
        title="Confirm Income"
        subtitle="Start a new budget cycle only after the money is actually received."
      />

      {isLoading ? (
        <Card>
          <Text style={styles.helperText}>Loading income sources...</Text>
        </Card>
      ) : incomeSources.length === 0 ? (
        <Card muted>
          <Text style={styles.emptyTitle}>No income source found</Text>
          <Text style={styles.helperText}>
            Add an income source first before confirming income.
          </Text>
        </Card>
      ) : (
        <>
          <Card>
            <SectionHeader title="Income Source" />

            <View style={styles.optionList}>
              {incomeSources.map((incomeSource) => (
                <OptionRow
                  key={incomeSource.id}
                  title={incomeSource.name}
                  meta={getIncomeSourceMeta(incomeSource)}
                  selected={selectedIncomeSourceId === incomeSource.id}
                  onPress={() => handleSelectIncomeSource(incomeSource)}
                />
              ))}
            </View>
          </Card>

          <Card>
            <SectionHeader title="Received Money" />

            <Text style={styles.label}>Amount received</Text>
            <MoneyInput
              value={receivedAmount}
              onChangeText={setReceivedAmount}
              placeholder="e.g. 850000"
            />

            <Text style={styles.label}>Received date</Text>
            <TextInput
              value={receivedDate}
              onChangeText={setReceivedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.helperText}>
              The new cycle will start from this date.
            </Text>
          </Card>

          <Card>
            <SectionHeader title="What Fundr Will Do" />

            <View style={styles.stepList}>
              <Text style={styles.helperText}>
                - Close your current active cycle.
              </Text>
              <Text style={styles.helperText}>
                - Create a new budget cycle using the received amount.
              </Text>
              <Text style={styles.helperText}>
                - Copy your current envelope structure and scale the allocation
                based on the new income.
              </Text>
              <Text style={styles.helperText}>
                - Add the new income to the related accounts.
              </Text>
            </View>
          </Card>

          <Card>
            <SectionHeader title="Note" meta="Optional" />

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. weekly allowance received"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            {selectedIncomeSource ? (
              <Text style={styles.helperText}>
                This will create a new cycle for {selectedIncomeSource.name}.
              </Text>
            ) : null}
          </Card>

          <AppButton
            label={isSaving ? 'Creating Cycle...' : 'Confirm Income'}
            onPress={handleConfirmIncome}
            disabled={!canConfirm}
          />
        </>
      )}
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
  emptyTitle: {
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
  helperText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  optionList: {
    gap: spacing.sm,
  },
  stepList: {
    gap: spacing.xs,
  },
});
