import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormScreen } from '../src/components/layout/FormScreen';
import { PageHeader } from '../src/components/layout/PageHeader';
import { AppButton } from '../src/components/ui/AppButton';
import { Badge } from '../src/components/ui/Badge';
import { Card } from '../src/components/ui/Card';
import { MoneyInput } from '../src/components/ui/MoneyInput';
import { OptionRow } from '../src/components/ui/OptionRow';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { colors, radius, spacing, typography } from '../src/constants/theme';
import {
  EnvelopeWithAccount,
  getSpendableActiveCycleEnvelopes,
} from '../src/features/envelopes/envelope.repository';
import {
  PurchaseDecision,
  evaluatePurchaseDecision,
} from '../src/services/decisionAssistantService';
import { formatCurrency } from '../src/utils/currency';

function parseMoney(value: string) {
  const numericValue = value.replace(/[^0-9]/g, '');
  return Number(numericValue || 0);
}

function getResultCardStyle(variant: PurchaseDecision['variant']) {
  switch (variant) {
    case 'danger':
      return {
        backgroundColor: colors.dangerMuted,
        borderColor: colors.dangerSoft,
      };
    case 'warning':
      return {
        backgroundColor: colors.warningMuted,
        borderColor: colors.warningSoft,
      };
    case 'safe':
    default:
      return {
        backgroundColor: colors.successMuted,
        borderColor: colors.successSoft,
      };
  }
}

function getPrimaryAction(decision: PurchaseDecision) {
  if (decision.rating === 'not_recommended') {
    return {
      label: 'Review Envelopes',
      onPress: () => router.push('/envelopes'),
    };
  }

  return {
    label: 'Record Expense',
    onPress: () => router.push('/add-transaction'),
  };
}

function DecisionResultCard({ decision }: { decision: PurchaseDecision }) {
  const primaryAction = getPrimaryAction(decision);

  return (
    <Card style={[styles.resultCard, getResultCardStyle(decision.variant)]}>
      <View style={styles.resultHeader}>
        <View style={styles.resultTitleWrapper}>
          <Text style={styles.resultEyebrow}>Fundr says</Text>
          <Text style={styles.resultTitle}>{decision.title}</Text>
        </View>

        <Badge label={decision.label} variant={decision.variant} />
      </View>

      <Text style={styles.resultMessage}>{decision.message}</Text>
      <Text style={styles.resultRecommendation}>
        {decision.recommendation}
      </Text>

      <View style={styles.impactGrid}>
        <View style={styles.impactItem}>
          <Text style={styles.metricLabel}>After purchase</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(decision.envelope.remainingAmountAfter)}
          </Text>
          <Text style={styles.metricMeta}>{decision.envelope.name}</Text>
        </View>

        <View style={styles.impactItemRight}>
          <Text style={styles.metricLabel}>Envelope used</Text>
          <Text style={styles.metricValue}>
            {decision.envelope.usedPercentageAfter}%
          </Text>
          <Text style={styles.metricMeta}>
            Safe daily {formatCurrency(decision.safeDailyLimit)}
          </Text>
        </View>
      </View>

      <View style={styles.reasonList}>
        {decision.reasons.map((reason) => (
          <View key={reason.id} style={styles.reasonItem}>
            <View style={styles.reasonCopy}>
              <Text style={styles.reasonTitle}>{reason.title}</Text>
              <Text style={styles.reasonText}>{reason.message}</Text>
            </View>

            <Badge
              label={
                reason.variant === 'danger'
                  ? 'Risk'
                  : reason.variant === 'warning'
                    ? 'Watch'
                    : 'Safe'
              }
              variant={reason.variant}
            />
          </View>
        ))}
      </View>

      <AppButton label={primaryAction.label} onPress={primaryAction.onPress} />
    </Card>
  );
}

export default function DecisionAssistantScreen() {
  const [envelopes, setEnvelopes] = useState<EnvelopeWithAccount[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<PurchaseDecision | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadEnvelopes() {
        setIsLoading(true);

        const rows = await getSpendableActiveCycleEnvelopes();

        setEnvelopes(rows);
        setSelectedEnvelopeId((currentEnvelopeId) => {
          if (rows.some((envelope) => envelope.id === currentEnvelopeId)) {
            return currentEnvelopeId;
          }

          return rows[0]?.id ?? '';
        });
        setIsLoading(false);
      }

      loadEnvelopes();
    }, [])
  );

  const selectedEnvelope = useMemo(() => {
    return envelopes.find((envelope) => envelope.id === selectedEnvelopeId);
  }, [envelopes, selectedEnvelopeId]);

  const parsedAmount = parseMoney(amount);
  const canCheck = parsedAmount > 0 && Boolean(selectedEnvelopeId) && !isChecking;

  async function handleCheckDecision() {
    try {
      setIsChecking(true);

      const nextDecision = await evaluatePurchaseDecision({
        envelopeId: selectedEnvelopeId,
        amount: parsedAmount,
      });

      setDecision(nextDecision);
    } catch (error) {
      Alert.alert(
        'Decision Assistant Error',
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsChecking(false);
    }
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    setDecision(null);
  }

  function handleEnvelopeChange(envelopeId: string) {
    setSelectedEnvelopeId(envelopeId);
    setDecision(null);
  }

  return (
    <FormScreen>
      <PageHeader
        title="Decision Assistant"
        subtitle="Check whether a purchase still fits your current plan."
      />

      <Card>
        <SectionHeader title="Purchase Amount" />

        <MoneyInput
          value={amount}
          onChangeText={handleAmountChange}
          placeholder="e.g. 75000"
        />

        <Text style={styles.helperText}>
          Fundr compares this amount with the selected envelope and safe daily
          limit.
        </Text>
      </Card>

      <Card>
        <SectionHeader title="Envelope" />

        {isLoading ? (
          <Text style={styles.helperText}>Loading envelopes...</Text>
        ) : envelopes.length === 0 ? (
          <Text style={styles.helperText}>
            No spendable envelope found. Create a flexible envelope first.
          </Text>
        ) : (
          <View style={styles.optionList}>
            {envelopes.map((envelope) => (
              <OptionRow
                key={envelope.id}
                title={envelope.name}
                meta={`Remaining ${formatCurrency(
                  envelope.remaining_amount
                )} · Planned ${formatCurrency(envelope.planned_amount)}`}
                selected={selectedEnvelopeId === envelope.id}
                onPress={() => handleEnvelopeChange(envelope.id)}
              />
            ))}
          </View>
        )}

        {selectedEnvelope ? (
          <Text style={styles.helperText}>
            This check will use {selectedEnvelope.name} from{' '}
            {selectedEnvelope.account_name}.
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title="What is it?" meta="Optional" />

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. shoes, dinner, keyboard"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Card>

      <AppButton
        label={isChecking ? 'Checking...' : 'Ask Fundr'}
        onPress={handleCheckDecision}
        disabled={!canCheck}
      />

      {decision ? <DecisionResultCard decision={decision} /> : null}
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
    color: colors.textSecondary,
    lineHeight: 20,
  },
  optionList: {
    gap: spacing.sm,
  },
  resultCard: {
    gap: spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  resultTitleWrapper: {
    flex: 1,
  },
  resultEyebrow: {
    fontSize: typography.tiny,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  resultTitle: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  resultMessage: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  resultRecommendation: {
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  impactItem: {
    flex: 1,
  },
  impactItemRight: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: typography.heading,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricMeta: {
    marginTop: spacing.xs,
    fontSize: typography.tiny,
    color: colors.textSecondary,
  },
  reasonList: {
    gap: spacing.md,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reasonCopy: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: typography.body,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  reasonText: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
