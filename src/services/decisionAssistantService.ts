import { getDatabase } from '../db/database';
import { calculatePercentage } from '../utils/calculations';
import { getAssistantInsightSummary } from './assistantInsightService';

export type DecisionRating = 'safe' | 'think_twice' | 'not_recommended';
export type DecisionVariant = 'safe' | 'warning' | 'danger';

export type DecisionReason = {
  id: string;
  title: string;
  message: string;
  variant: DecisionVariant;
};

export type PurchaseDecision = {
  rating: DecisionRating;
  label: 'Safe' | 'Think Twice' | 'Not Recommended';
  variant: DecisionVariant;
  title: string;
  message: string;
  recommendation: string;
  reasons: DecisionReason[];
  amount: number;
  safeDailyLimit: number;
  remainingDays: number;
  flexibleMoneyAfter: number;
  envelope: {
    id: string;
    name: string;
    accountName: string;
    plannedAmount: number;
    usedAmount: number;
    remainingAmount: number;
    usedPercentageAfter: number;
    remainingAmountAfter: number;
  };
};

type EvaluatePurchaseDecisionInput = {
  envelopeId: string;
  amount: number;
};

type DecisionEnvelopeRow = {
  id: string;
  account_name: string;
  name: string;
  planned_amount: number;
  used_amount: number;
  remaining_amount: number;
  is_locked: number;
};

function getRating(reasons: DecisionReason[]): DecisionRating {
  if (reasons.some((reason) => reason.variant === 'danger')) {
    return 'not_recommended';
  }

  if (reasons.some((reason) => reason.variant === 'warning')) {
    return 'think_twice';
  }

  return 'safe';
}

function getDecisionCopy(rating: DecisionRating) {
  switch (rating) {
    case 'not_recommended':
      return {
        label: 'Not Recommended' as const,
        variant: 'danger' as const,
        title: 'Not recommended right now',
        message: 'This purchase would make the current plan unsafe.',
        recommendation:
          'Choose a smaller amount, use a different envelope, or adjust allocation first.',
      };
    case 'think_twice':
      return {
        label: 'Think Twice' as const,
        variant: 'warning' as const,
        title: 'Think twice before buying',
        message: 'This purchase is possible, but it will put pressure on the cycle.',
        recommendation:
          'Buy it only if it matters, then keep the rest of today quieter.',
      };
    case 'safe':
    default:
      return {
        label: 'Safe' as const,
        variant: 'safe' as const,
        title: 'Looks safe',
        message: 'This purchase fits the selected envelope and daily limit.',
        recommendation: 'You can record it as an expense if you decide to buy it.',
      };
  }
}

export async function evaluatePurchaseDecision(
  input: EvaluatePurchaseDecisionInput
): Promise<PurchaseDecision> {
  if (!input.envelopeId) {
    throw new Error('Envelope is required');
  }

  if (input.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const db = await getDatabase();
  const assistantSummary = await getAssistantInsightSummary();

  if (!assistantSummary.activeCycle) {
    throw new Error('No active budget cycle found');
  }

  const envelope = await db.getFirstAsync<DecisionEnvelopeRow>(
    `
    SELECT
      envelopes.id,
      accounts.name as account_name,
      envelopes.name,
      envelopes.planned_amount,
      envelopes.used_amount,
      envelopes.remaining_amount,
      envelopes.is_locked
    FROM envelopes
    INNER JOIN accounts
      ON accounts.id = envelopes.account_id
    WHERE envelopes.id = ?
    AND envelopes.budget_cycle_id = ?
    AND envelopes.is_archived = 0
    LIMIT 1;
    `,
    [input.envelopeId, assistantSummary.activeCycle.id]
  );

  if (!envelope) {
    throw new Error('Envelope not found');
  }

  const reasons: DecisionReason[] = [];
  const remainingAmountAfter = envelope.remaining_amount - input.amount;
  const usedAmountAfter = envelope.used_amount + input.amount;
  const usedPercentageAfter = calculatePercentage(
    usedAmountAfter,
    envelope.planned_amount
  );
  const flexibleMoneyAfter = assistantSummary.flexibleMoney - input.amount;

  if (envelope.is_locked) {
    reasons.push({
      id: 'protected-envelope',
      title: 'Protected envelope',
      message: 'Protected envelopes should not be used for daily spending.',
      variant: 'danger',
    });
  }

  if (input.amount > envelope.remaining_amount) {
    reasons.push({
      id: 'not-enough-envelope-money',
      title: 'Envelope is not enough',
      message: 'The purchase is higher than the remaining money in this envelope.',
      variant: 'danger',
    });
  }

  if (flexibleMoneyAfter < 0) {
    reasons.push({
      id: 'flexible-money-negative',
      title: 'Flexible money would go below zero',
      message: 'The purchase would make flexible money negative for this cycle.',
      variant: 'danger',
    });
  }

  if (usedPercentageAfter >= 100) {
    reasons.push({
      id: 'envelope-would-pass-budget',
      title: 'Envelope would pass budget',
      message: 'After this purchase, the envelope would reach or pass 100% used.',
      variant: 'danger',
    });
  } else if (usedPercentageAfter >= 80) {
    reasons.push({
      id: 'envelope-would-be-tight',
      title: 'Envelope would be tight',
      message: 'After this purchase, the envelope would be at least 80% used.',
      variant: 'warning',
    });
  }

  if (input.amount > assistantSummary.safeDailyLimit) {
    reasons.push({
      id: 'above-safe-daily-limit',
      title: 'Above safe daily limit',
      message: 'The purchase is higher than today’s safe daily limit.',
      variant: 'warning',
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      id: 'fits-plan',
      title: 'Fits the current plan',
      message: 'The purchase stays inside the envelope and daily limit.',
      variant: 'safe',
    });
  }

  const rating = getRating(reasons);
  const copy = getDecisionCopy(rating);

  return {
    rating,
    ...copy,
    reasons,
    amount: input.amount,
    safeDailyLimit: assistantSummary.safeDailyLimit,
    remainingDays: assistantSummary.remainingDays,
    flexibleMoneyAfter,
    envelope: {
      id: envelope.id,
      name: envelope.name,
      accountName: envelope.account_name,
      plannedAmount: envelope.planned_amount,
      usedAmount: envelope.used_amount,
      remainingAmount: envelope.remaining_amount,
      usedPercentageAfter,
      remainingAmountAfter,
    },
  };
}
