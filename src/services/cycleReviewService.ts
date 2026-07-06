import { getDatabase } from '../db/database';
import { calculatePercentage, calculateSafeDailyLimit } from '../utils/calculations';
import { getRemainingDays } from '../utils/date';

export type CycleReviewStatus = 'active' | 'closed' | 'review';
export type CycleReviewEnvelopeTone = 'safe' | 'warning' | 'danger' | 'info';

export type CycleReviewEnvelope = {
  id: string;
  name: string;
  type: string;
  accountName: string;
  plannedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usedPercentage: number;
  isLocked: boolean;
  tone: CycleReviewEnvelopeTone;
};

export type CycleReviewSummary = {
  id: string;
  name: string;
  status: CycleReviewStatus;
  startDate: string;
  endDate: string;
  plannedAmount: number;
  actualAmount: number;
  usedAmount: number;
  remainingAmount: number;
  flexibleRemaining: number;
  protectedRemaining: number;
  safeDailyLimit: number;
  remainingDays: number;
  usedPercentage: number;
  headline: string;
  message: string;
  recommendation: string;
  envelopes: CycleReviewEnvelope[];
};

type CycleRow = {
  id: string;
  name: string;
  status: CycleReviewStatus;
  start_date: string;
  end_date: string;
  planned_amount: number;
  actual_amount: number;
};

type EnvelopeRow = {
  id: string;
  account_name: string;
  name: string;
  type: string;
  planned_amount: number;
  used_amount: number;
  remaining_amount: number;
  is_locked: number;
};

type MoneySummaryRow = {
  total: number;
};

function getEnvelopeTone(envelope: EnvelopeRow, usedPercentage: number) {
  if (envelope.remaining_amount < 0 || usedPercentage >= 100) {
    return 'danger';
  }

  if (usedPercentage >= 80) {
    return 'warning';
  }

  if (envelope.is_locked) {
    return 'info';
  }

  return 'safe';
}

function buildReviewCopy(params: {
  status: CycleReviewStatus;
  remainingAmount: number;
  usedPercentage: number;
  overBudgetCount: number;
  warningCount: number;
}) {
  if (params.overBudgetCount > 0 || params.remainingAmount < 0) {
    return {
      headline: 'This cycle needs cleanup',
      message: `${params.overBudgetCount} envelope${
        params.overBudgetCount === 1 ? '' : 's'
      } went past the planned allocation.`,
      recommendation:
        'Review the over-budget envelopes and use Buffer or allocation adjustments before the next cycle.',
    };
  }

  if (params.warningCount > 0 || params.usedPercentage >= 80) {
    return {
      headline: 'This cycle is tight',
      message: `${params.usedPercentage}% of planned money has been used.`,
      recommendation:
        'Keep the remaining spend focused and protect Buffer for unavoidable expenses.',
    };
  }

  if (params.status === 'closed' || params.status === 'review') {
    return {
      headline: 'Cycle closed cleanly',
      message: 'The cycle stayed within the planned allocation.',
      recommendation:
        'Use the envelope breakdown to decide what allocation should change next cycle.',
    };
  }

  return {
    headline: 'Cycle is on track',
    message: `${params.usedPercentage}% of planned money has been used so far.`,
    recommendation:
      'Keep watching envelopes that are close to 80% before recording more spending.',
  };
}

export async function getCycleReviewSummary() {
  const db = await getDatabase();

  const cycle = await db.getFirstAsync<CycleRow>(
    `
    SELECT
      id,
      name,
      status,
      start_date,
      end_date,
      planned_amount,
      actual_amount
    FROM budget_cycles
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    `
  );

  const reviewCycle =
    cycle ??
    (await db.getFirstAsync<CycleRow>(
      `
      SELECT
        id,
        name,
        status,
        start_date,
        end_date,
        planned_amount,
        actual_amount
      FROM budget_cycles
      WHERE status IN ('review', 'closed')
      ORDER BY updated_at DESC
      LIMIT 1;
      `
    ));

  if (!reviewCycle) {
    return null;
  }

  const [envelopes, flexibleRow, protectedRow] = await Promise.all([
    db.getAllAsync<EnvelopeRow>(
      `
      SELECT
        envelopes.id,
        accounts.name as account_name,
        envelopes.name,
        envelopes.type,
        envelopes.planned_amount,
        envelopes.used_amount,
        envelopes.remaining_amount,
        envelopes.is_locked
      FROM envelopes
      INNER JOIN accounts
        ON accounts.id = envelopes.account_id
      WHERE envelopes.budget_cycle_id = ?
      AND envelopes.is_archived = 0
      ORDER BY
        envelopes.is_locked ASC,
        CASE envelopes.type
          WHEN 'need' THEN 1
          WHEN 'want' THEN 2
          WHEN 'buffer' THEN 3
          WHEN 'saving' THEN 4
          WHEN 'subscription' THEN 5
          ELSE 6
        END,
        envelopes.name ASC;
      `,
      [reviewCycle.id]
    ),
    db.getFirstAsync<MoneySummaryRow>(
      `
      SELECT COALESCE(SUM(remaining_amount), 0) as total
      FROM envelopes
      WHERE budget_cycle_id = ?
      AND is_archived = 0
      AND is_locked = 0;
      `,
      [reviewCycle.id]
    ),
    db.getFirstAsync<MoneySummaryRow>(
      `
      SELECT COALESCE(SUM(remaining_amount), 0) as total
      FROM envelopes
      WHERE budget_cycle_id = ?
      AND is_archived = 0
      AND is_locked = 1;
      `,
      [reviewCycle.id]
    ),
  ]);

  const plannedAmount = envelopes.reduce(
    (total, envelope) => total + envelope.planned_amount,
    0
  );
  const usedAmount = envelopes.reduce(
    (total, envelope) => total + envelope.used_amount,
    0
  );
  const remainingAmount = envelopes.reduce(
    (total, envelope) => total + envelope.remaining_amount,
    0
  );
  const usedPercentage = calculatePercentage(usedAmount, plannedAmount);
  const remainingDays =
    reviewCycle.status === 'active' ? getRemainingDays(reviewCycle.end_date) : 0;
  const flexibleRemaining = flexibleRow?.total ?? 0;
  const safeDailyLimit =
    reviewCycle.status === 'active'
      ? calculateSafeDailyLimit(flexibleRemaining, remainingDays)
      : 0;

  const reviewEnvelopes: CycleReviewEnvelope[] = envelopes.map((envelope) => {
    const envelopeUsedPercentage = calculatePercentage(
      envelope.used_amount,
      envelope.planned_amount
    );

    return {
      id: envelope.id,
      name: envelope.name,
      type: envelope.type,
      accountName: envelope.account_name,
      plannedAmount: envelope.planned_amount,
      usedAmount: envelope.used_amount,
      remainingAmount: envelope.remaining_amount,
      usedPercentage: envelopeUsedPercentage,
      isLocked: Boolean(envelope.is_locked),
      tone: getEnvelopeTone(envelope, envelopeUsedPercentage),
    };
  });

  const overBudgetCount = reviewEnvelopes.filter(
    (envelope) => envelope.tone === 'danger'
  ).length;
  const warningCount = reviewEnvelopes.filter(
    (envelope) => envelope.tone === 'warning'
  ).length;
  const copy = buildReviewCopy({
    status: reviewCycle.status,
    remainingAmount,
    usedPercentage,
    overBudgetCount,
    warningCount,
  });

  return {
    id: reviewCycle.id,
    name: reviewCycle.name,
    status: reviewCycle.status,
    startDate: reviewCycle.start_date,
    endDate: reviewCycle.end_date,
    plannedAmount: plannedAmount || reviewCycle.planned_amount,
    actualAmount: reviewCycle.actual_amount,
    usedAmount,
    remainingAmount,
    flexibleRemaining,
    protectedRemaining: protectedRow?.total ?? 0,
    safeDailyLimit,
    remainingDays,
    usedPercentage,
    headline: copy.headline,
    message: copy.message,
    recommendation: copy.recommendation,
    envelopes: reviewEnvelopes,
  } satisfies CycleReviewSummary;
}
