import { getDatabase } from '../db/database';
import { getUserSettings } from '../features/settings/settings.repository';
import { calculatePercentage, calculateSafeDailyLimit } from '../utils/calculations';
import { formatCurrency } from '../utils/currency';
import { getRemainingDays } from '../utils/date';

export type AssistantInsightSeverity = 'info' | 'warning' | 'danger';
export type AssistantInsightSource =
  | 'cycle'
  | 'daily_limit'
  | 'envelope'
  | 'spending';

export type AssistantInsight = {
  id: string;
  title: string;
  message: string;
  recommendation?: string;
  severity: AssistantInsightSeverity;
  source: AssistantInsightSource;
  sourceId?: string;
  priority: number;
};

export type AssistantStatus = {
  label: 'Safe' | 'Watch' | 'Danger';
  variant: 'safe' | 'warning' | 'danger';
};

export type AssistantSignalCounts = {
  danger: number;
  warning: number;
  info: number;
};

export type AssistantDashboardSummary = {
  headline: string;
  message: string;
  reason: string;
  recommendation: string;
  ctaLabel: string;
};

export type AssistantCycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

export type AssistantInsightSummary = {
  status: AssistantStatus;
  insights: AssistantInsight[];
  signalCounts: AssistantSignalCounts;
  dashboardSummary: AssistantDashboardSummary;
  activeCycle: AssistantCycle | null;
  safeDailyLimit: number;
  minimumDailyLimit: number;
  flexibleMoney: number;
  protectedMoney: number;
  remainingDays: number;
};

type EnvelopeInsightRow = {
  id: string;
  name: string;
  planned_amount: number;
  used_amount: number;
  remaining_amount: number;
  is_locked: number;
};

type MoneySummaryRow = {
  total: number;
};

type ExpenseSummaryRow = {
  count: number;
};

const DEFAULT_MINIMUM_DAILY_LIMIT = 30000;

function getAssistantStatus(insights: AssistantInsight[]): AssistantStatus {
  if (insights.some((insight) => insight.severity === 'danger')) {
    return {
      label: 'Danger',
      variant: 'danger',
    };
  }

  if (insights.some((insight) => insight.severity === 'warning')) {
    return {
      label: 'Watch',
      variant: 'warning',
    };
  }

  return {
    label: 'Safe',
    variant: 'safe',
  };
}

function sortInsights(insights: AssistantInsight[]) {
  return insights.sort((first, second) => {
    if (first.priority !== second.priority) {
      return second.priority - first.priority;
    }

    return first.title.localeCompare(second.title);
  });
}

function getSignalCounts(insights: AssistantInsight[]): AssistantSignalCounts {
  return insights.reduce(
    (counts, insight) => {
      counts[insight.severity] += 1;
      return counts;
    },
    {
      danger: 0,
      warning: 0,
      info: 0,
    }
  );
}

function buildDashboardSummary(params: {
  activeCycle: AssistantCycle | null;
  status: AssistantStatus;
  insights: AssistantInsight[];
  safeDailyLimit: number;
  minimumDailyLimit: number;
  remainingDays: number;
  currency: string;
}): AssistantDashboardSummary {
  const primaryInsight = params.insights[0];

  if (!params.activeCycle) {
    return {
      headline: 'Set up your active cycle',
      message: 'Fundr needs an active budget cycle before it can judge today.',
      reason: 'No active cycle is running right now.',
      recommendation:
        'Confirm income first, then Fundr can calculate safe daily limits and envelope signals.',
      ctaLabel: 'Review Insights',
    };
  }

  if (params.status.variant === 'danger' && primaryInsight) {
    return {
      headline: 'Needs attention',
      message: primaryInsight.title,
      reason: primaryInsight.message,
      recommendation:
        primaryInsight.recommendation ??
        'Review the signal before recording more spending.',
      ctaLabel: 'Review Insights',
    };
  }

  if (params.status.variant === 'warning' && primaryInsight) {
    return {
      headline: 'Worth watching',
      message: primaryInsight.title,
      reason: primaryInsight.message,
      recommendation:
        primaryInsight.recommendation ??
        `Keep today's spending below ${formatCurrency(
          params.safeDailyLimit,
          params.currency
        )}.`,
      ctaLabel: 'Open Insights',
    };
  }

  if (primaryInsight) {
    return {
      headline: 'Plan is ready',
      message: primaryInsight.message,
      reason: `${formatCurrency(
        params.safeDailyLimit,
        params.currency
      )} is available per day for the next ${params.remainingDays} days.`,
      recommendation:
        primaryInsight.recommendation ??
        'Keep the first spend intentional and record it when it happens.',
      ctaLabel: 'Open Insights',
    };
  }

  return {
    headline: 'You are on track',
    message: 'No active warning is showing for this cycle.',
    reason: `${formatCurrency(
      params.safeDailyLimit,
      params.currency
    )} is available per day, above your minimum daily limit of ${formatCurrency(
      params.minimumDailyLimit,
      params.currency
    )}.`,
    recommendation: `Keep today's spending below ${formatCurrency(
      params.safeDailyLimit,
      params.currency
    )}.`,
    ctaLabel: 'Open Insights',
  };
}

export async function getAssistantInsightSummary(): Promise<AssistantInsightSummary> {
  const db = await getDatabase();
  const settings = await getUserSettings();
  const currency = settings?.currency ?? 'IDR';
  const minimumDailyLimit =
    settings?.minimum_daily_limit ?? DEFAULT_MINIMUM_DAILY_LIMIT;

  const activeCycle = await db.getFirstAsync<AssistantCycle>(
    `
    SELECT id, name, start_date, end_date
    FROM budget_cycles
    WHERE status = 'active'
    LIMIT 1;
    `
  );

  if (!activeCycle) {
    const insights: AssistantInsight[] = [
      {
        id: 'no-active-cycle',
        title: 'No active cycle yet',
        message: 'Confirm income to start receiving cycle-based assistant insights.',
        severity: 'info',
        source: 'cycle',
        priority: 10,
      },
    ];
    const status = getAssistantStatus(insights);

    return {
      status,
      insights,
      signalCounts: getSignalCounts(insights),
      dashboardSummary: buildDashboardSummary({
        activeCycle: null,
        status,
        insights,
        safeDailyLimit: 0,
        minimumDailyLimit,
        remainingDays: 0,
        currency,
      }),
      activeCycle: null,
      safeDailyLimit: 0,
      minimumDailyLimit,
      flexibleMoney: 0,
      protectedMoney: 0,
      remainingDays: 0,
    };
  }

  const [envelopes, flexibleMoneyRow, protectedMoneyRow, expenseSummary] =
    await Promise.all([
      db.getAllAsync<EnvelopeInsightRow>(
        `
        SELECT
          id,
          name,
          planned_amount,
          used_amount,
          remaining_amount,
          is_locked
        FROM envelopes
        WHERE budget_cycle_id = ?
        AND is_archived = 0;
        `,
        [activeCycle.id]
      ),
      db.getFirstAsync<MoneySummaryRow>(
        `
        SELECT COALESCE(SUM(remaining_amount), 0) as total
        FROM envelopes
        WHERE budget_cycle_id = ?
        AND is_archived = 0
        AND is_locked = 0;
        `,
        [activeCycle.id]
      ),
      db.getFirstAsync<MoneySummaryRow>(
        `
        SELECT COALESCE(SUM(remaining_amount), 0) as total
        FROM envelopes
        WHERE budget_cycle_id = ?
        AND is_archived = 0
        AND is_locked = 1;
        `,
        [activeCycle.id]
      ),
      db.getFirstAsync<ExpenseSummaryRow>(
        `
        SELECT COUNT(*) as count
        FROM transactions
        WHERE budget_cycle_id = ?
        AND type = 'expense';
        `,
        [activeCycle.id]
      ),
    ]);

  const insights: AssistantInsight[] = [];
  const flexibleMoney = flexibleMoneyRow?.total ?? 0;
  const protectedMoney = protectedMoneyRow?.total ?? 0;
  const remainingDays = getRemainingDays(activeCycle.end_date);
  const safeDailyLimit = calculateSafeDailyLimit(flexibleMoney, remainingDays);
  const expenseCount = expenseSummary?.count ?? 0;

  if (flexibleMoney < 0) {
    insights.push({
      id: 'flexible-overspending',
      title: 'Flexible money is below zero',
      message: `Flexible envelopes are ${formatCurrency(
        Math.abs(flexibleMoney),
        currency
      )} over the available money for this cycle.`,
      recommendation:
        'Use Buffer if the spending was unavoidable, or reduce another flexible envelope.',
      severity: 'danger',
      source: 'spending',
      priority: 500,
    });
  }

  envelopes.forEach((envelope) => {
    const usedPercentage = calculatePercentage(
      envelope.used_amount,
      envelope.planned_amount
    );

    if (usedPercentage >= 100) {
      insights.push({
        id: `envelope-danger-${envelope.id}`,
        title: `${envelope.name} is past budget`,
        message: `${envelope.name} has used ${usedPercentage}% of its planned allocation.`,
        recommendation: 'Use Buffer if this spending is unavoidable.',
        severity: 'danger',
        source: 'envelope',
        sourceId: envelope.id,
        priority: 300 + usedPercentage,
      });
      return;
    }

    if (usedPercentage >= 80) {
      insights.push({
        id: `envelope-warning-${envelope.id}`,
        title: `${envelope.name} is ${usedPercentage}% used`,
        message: `${envelope.name} is getting close to its planned allocation.`,
        recommendation: 'Be careful for the rest of this cycle.',
        severity: 'warning',
        source: 'envelope',
        sourceId: envelope.id,
        priority: 200 + usedPercentage,
      });
    }
  });

  if (flexibleMoney >= 0 && safeDailyLimit < minimumDailyLimit) {
    insights.push({
      id: 'low-daily-limit',
      title: 'Safe daily limit is low',
      message: `Safe daily limit is ${formatCurrency(
        safeDailyLimit,
        currency
      )}, below your minimum of ${formatCurrency(minimumDailyLimit, currency)}.`,
      recommendation: `Try to keep today's spending below ${formatCurrency(
        safeDailyLimit,
        currency
      )}.`,
      severity: 'warning',
      source: 'daily_limit',
      priority: 250,
    });
  }

  if (expenseCount === 0) {
    insights.push({
      id: 'no-spending-yet',
      title: 'No spending yet',
      message: 'No expense has been recorded in this active cycle.',
      recommendation: 'Your plan is still untouched. Keep the first spend intentional.',
      severity: 'info',
      source: 'spending',
      priority: 50,
    });
  }

  sortInsights(insights);
  const status = getAssistantStatus(insights);

  return {
    status,
    insights,
    signalCounts: getSignalCounts(insights),
    dashboardSummary: buildDashboardSummary({
      activeCycle,
      status,
      insights,
      safeDailyLimit,
      minimumDailyLimit,
      remainingDays,
      currency,
    }),
    activeCycle,
    safeDailyLimit,
    minimumDailyLimit,
    flexibleMoney,
    protectedMoney,
    remainingDays,
  };
}
