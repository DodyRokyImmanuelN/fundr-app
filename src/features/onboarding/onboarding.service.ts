import { getDatabase } from '../../db/database';
import { addDaysISO, getNowISOString, getTodayISODate } from '../../utils/date';
import { createId } from '../../utils/id';
import { updateUserSettingsAfterOnboarding } from '../settings/settings.repository';

type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'irregular';

type CompleteOnboardingInput = {
  userName: string;
  currency: string;

  spendingAccountName: string;
  savingAccountName: string;

  incomeName: string;
  incomeAmount: number;
  incomeFrequency: IncomeFrequency;

  savingAmount: number;
};

function getCycleLengthInDays(frequency: IncomeFrequency) {
  switch (frequency) {
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    case 'monthly':
      return 30;
    case 'irregular':
    default:
      return 7;
  }
}

function createDefaultSpendingEnvelopes(params: {
  budgetCycleId: string;
  spendingAccountId: string;
  spendingAmount: number;
  now: string;
}) {
  const { budgetCycleId, spendingAccountId, spendingAmount, now } = params;

  const food = Math.floor(spendingAmount * 0.52);
  const transport = Math.floor(spendingAmount * 0.1);
  const coffeeSnacks = Math.floor(spendingAmount * 0.13);
  const buffer = spendingAmount - food - transport - coffeeSnacks;

  return [
    {
      id: createId('env'),
      budgetCycleId,
      accountId: spendingAccountId,
      name: 'Food',
      type: 'need',
      plannedAmount: food,
      isLocked: 0,
      now,
    },
    {
      id: createId('env'),
      budgetCycleId,
      accountId: spendingAccountId,
      name: 'Transport',
      type: 'need',
      plannedAmount: transport,
      isLocked: 0,
      now,
    },
    {
      id: createId('env'),
      budgetCycleId,
      accountId: spendingAccountId,
      name: 'Coffee / Snacks',
      type: 'want',
      plannedAmount: coffeeSnacks,
      isLocked: 0,
      now,
    },
    {
      id: createId('env'),
      budgetCycleId,
      accountId: spendingAccountId,
      name: 'Buffer',
      type: 'buffer',
      plannedAmount: buffer,
      isLocked: 0,
      now,
    },
  ];
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  if (!input.userName.trim()) {
    throw new Error('User name is required');
  }

  if (!input.spendingAccountName.trim()) {
    throw new Error('Spending account name is required');
  }

  if (!input.savingAccountName.trim()) {
    throw new Error('Saving account name is required');
  }

  if (input.incomeAmount <= 0) {
    throw new Error('Income amount must be greater than 0');
  }

  if (input.savingAmount < 0) {
    throw new Error('Saving amount cannot be negative');
  }

  if (input.savingAmount >= input.incomeAmount) {
    throw new Error('Saving amount must be smaller than income amount');
  }

  const db = await getDatabase();

  const now = getNowISOString();
  const startDate = getTodayISODate();
  const cycleLength = getCycleLengthInDays(input.incomeFrequency);
  const endDate = addDaysISO(startDate, cycleLength - 1);

  const spendingAmount = input.incomeAmount - input.savingAmount;

  const spendingAccountId = createId('acc');
  const savingAccountId = createId('acc');
  const incomeSourceId = createId('incsrc');
  const incomeEventId = createId('incevt');
  const budgetCycleId = createId('cycle');
  const savingEnvelopeId = createId('env');

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `
      DELETE FROM insights;
      `
    );

    await tx.runAsync(
      `
      DELETE FROM transactions;
      `
    );

    await tx.runAsync(
      `
      DELETE FROM envelopes;
      `
    );

    await tx.runAsync(
      `
      DELETE FROM budget_cycles;
      `
    );

    await tx.runAsync(
      `
      DELETE FROM income_events;
      `
    );

    await tx.runAsync(
      `
      DELETE FROM income_sources;
      `
    );

    await tx.runAsync(
      `
      DELETE FROM accounts;
      `
    );

    await tx.runAsync(
      `
      INSERT INTO accounts (
        id,
        name,
        type,
        initial_balance,
        current_balance,
        is_archived,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        spendingAccountId,
        input.spendingAccountName.trim(),
        'daily_spending',
        spendingAmount,
        spendingAmount,
        0,
        now,
        now,
      ]
    );

    await tx.runAsync(
      `
      INSERT INTO accounts (
        id,
        name,
        type,
        initial_balance,
        current_balance,
        is_archived,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        savingAccountId,
        input.savingAccountName.trim(),
        'saving',
        input.savingAmount,
        input.savingAmount,
        0,
        now,
        now,
      ]
    );

    await tx.runAsync(
      `
      INSERT INTO income_sources (
        id,
        name,
        type,
        expected_amount,
        frequency,
        expected_day_of_week,
        expected_day_of_month,
        custom_interval_days,
        is_recurring,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        incomeSourceId,
        input.incomeName.trim() || 'Main Income',
        'allowance',
        input.incomeAmount,
        input.incomeFrequency,
        null,
        null,
        null,
        input.incomeFrequency === 'irregular' ? 0 : 1,
        1,
        now,
        now,
      ]
    );

    await tx.runAsync(
      `
      INSERT INTO income_events (
        id,
        income_source_id,
        expected_amount,
        received_amount,
        expected_date,
        received_date,
        status,
        note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        incomeEventId,
        incomeSourceId,
        input.incomeAmount,
        input.incomeAmount,
        startDate,
        startDate,
        'received',
        'Initial onboarding income',
        now,
        now,
      ]
    );

    await tx.runAsync(
      `
      INSERT INTO budget_cycles (
        id,
        income_event_id,
        name,
        start_date,
        end_date,
        planned_amount,
        actual_amount,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        budgetCycleId,
        incomeEventId,
        'Current Budget Cycle',
        startDate,
        endDate,
        input.incomeAmount,
        input.incomeAmount,
        'active',
        now,
        now,
      ]
    );

    const spendingEnvelopes = createDefaultSpendingEnvelopes({
      budgetCycleId,
      spendingAccountId,
      spendingAmount,
      now,
    });

    for (const envelope of spendingEnvelopes) {
      await tx.runAsync(
        `
        INSERT INTO envelopes (
          id,
          budget_cycle_id,
          account_id,
          name,
          type,
          planned_amount,
          used_amount,
          remaining_amount,
          is_locked,
          is_archived,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          envelope.id,
          envelope.budgetCycleId,
          envelope.accountId,
          envelope.name,
          envelope.type,
          envelope.plannedAmount,
          0,
          envelope.plannedAmount,
          envelope.isLocked,
          0,
          envelope.now,
          envelope.now,
        ]
      );
    }

    await tx.runAsync(
      `
      INSERT INTO envelopes (
        id,
        budget_cycle_id,
        account_id,
        name,
        type,
        planned_amount,
        used_amount,
        remaining_amount,
        is_locked,
        is_archived,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        savingEnvelopeId,
        budgetCycleId,
        savingAccountId,
        'Savings',
        'saving',
        input.savingAmount,
        0,
        input.savingAmount,
        1,
        0,
        now,
        now,
      ]
    );
  });

  await updateUserSettingsAfterOnboarding({
    userName: input.userName.trim(),
    currency: input.currency,
  });
}