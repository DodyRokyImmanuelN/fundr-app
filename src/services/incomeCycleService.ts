import { getDatabase } from '../db/database';
import { addDaysISO, getNowISOString, getTodayISODate } from '../utils/date';
import { createId } from '../utils/id';

type ConfirmIncomeInput = {
  incomeSourceId: string;
  receivedAmount: number;
  receivedDate?: string;
  note?: string;
};

type IncomeSourceRow = {
  id: string;
  name: string;
  expected_amount: number | null;
  frequency: string;
  custom_interval_days: number | null;
};

type ActiveCycleRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type PreviousEnvelopeRow = {
  id: string;
  account_id: string;
  name: string;
  type: string;
  planned_amount: number;
  is_locked: number;
  is_archived: number;
};

type NewEnvelopeAllocation = {
  id: string;
  accountId: string;
  name: string;
  type: string;
  plannedAmount: number;
  isLocked: number;
};

function isValidISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function getCycleLengthInDays(
  frequency: string,
  customIntervalDays: number | null
) {
  switch (frequency) {
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    case 'monthly':
      return 30;
    case 'custom':
      return customIntervalDays && customIntervalDays > 0
        ? customIntervalDays
        : 7;
    case 'irregular':
    default:
      return 7;
  }
}

function distributeAmountByPreviousEnvelopePattern(params: {
  receivedAmount: number;
  previousEnvelopes: PreviousEnvelopeRow[];
}) {
  const { receivedAmount, previousEnvelopes } = params;

  const totalPreviousPlanned = previousEnvelopes.reduce(
    (total, envelope) => total + envelope.planned_amount,
    0
  );

  if (totalPreviousPlanned <= 0) {
    throw new Error('Previous envelope allocation is empty');
  }

  const allocations: NewEnvelopeAllocation[] = previousEnvelopes.map(
    (envelope) => {
      const ratio = envelope.planned_amount / totalPreviousPlanned;
      const plannedAmount = Math.floor(receivedAmount * ratio);

      return {
        id: createId('env'),
        accountId: envelope.account_id,
        name: envelope.name,
        type: envelope.type,
        plannedAmount,
        isLocked: envelope.is_locked,
      };
    }
  );

  const allocatedTotal = allocations.reduce(
    (total, allocation) => total + allocation.plannedAmount,
    0
  );

  const remainder = receivedAmount - allocatedTotal;

  if (remainder > 0 && allocations.length > 0) {
    const bufferIndex = allocations.findIndex(
      (allocation) => allocation.type === 'buffer'
    );

    const targetIndex = bufferIndex >= 0 ? bufferIndex : 0;

    allocations[targetIndex] = {
      ...allocations[targetIndex],
      plannedAmount: allocations[targetIndex].plannedAmount + remainder,
    };
  }

  return allocations;
}

export async function confirmIncomeAndStartNewCycle(
  input: ConfirmIncomeInput
) {
  if (!input.incomeSourceId) {
    throw new Error('Income source is required');
  }

  if (input.receivedAmount <= 0) {
    throw new Error('Received amount must be greater than 0');
  }

  const db = await getDatabase();

  const now = getNowISOString();
  const receivedDate = input.receivedDate || getTodayISODate();

  if (!isValidISODate(receivedDate)) {
    throw new Error('Received date must use YYYY-MM-DD format');
  }

  const incomeSource = await db.getFirstAsync<IncomeSourceRow>(
    `
    SELECT
      id,
      name,
      expected_amount,
      frequency,
      custom_interval_days
    FROM income_sources
    WHERE id = ?
    AND is_active = 1
    LIMIT 1;
    `,
    [input.incomeSourceId]
  );

  if (!incomeSource) {
    throw new Error('Income source not found');
  }

  const activeCycle = await db.getFirstAsync<ActiveCycleRow>(
    `
    SELECT id, name, start_date, end_date
    FROM budget_cycles
    WHERE status = 'active'
    LIMIT 1;
    `
  );

  if (!activeCycle) {
    throw new Error('No active budget cycle found');
  }

  const previousEnvelopes = await db.getAllAsync<PreviousEnvelopeRow>(
    `
    SELECT
      id,
      account_id,
      name,
      type,
      planned_amount,
      is_locked,
      is_archived
    FROM envelopes
    WHERE budget_cycle_id = ?
    AND is_archived = 0
    ORDER BY
      is_locked ASC,
      CASE type
        WHEN 'need' THEN 1
        WHEN 'want' THEN 2
        WHEN 'buffer' THEN 3
        WHEN 'saving' THEN 4
        WHEN 'subscription' THEN 5
        ELSE 6
      END,
      name ASC;
    `,
    [activeCycle.id]
  );

  if (previousEnvelopes.length === 0) {
    throw new Error('No previous envelope found to create new cycle');
  }

  const newEnvelopeAllocations = distributeAmountByPreviousEnvelopePattern({
    receivedAmount: input.receivedAmount,
    previousEnvelopes,
  });

  const cycleLength = getCycleLengthInDays(
    incomeSource.frequency,
    incomeSource.custom_interval_days
  );

  const newCycleStartDate = receivedDate;
  const newCycleEndDate = addDaysISO(newCycleStartDate, cycleLength - 1);

  const incomeEventId = createId('incevt');
  const newCycleId = createId('cycle');

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `
      UPDATE budget_cycles
      SET
        status = 'closed',
        updated_at = ?
      WHERE id = ?;
      `,
      [now, activeCycle.id]
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
        incomeSource.id,
        incomeSource.expected_amount,
        input.receivedAmount,
        receivedDate,
        receivedDate,
        'received',
        input.note?.trim() || 'Income confirmed',
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
        newCycleId,
        incomeEventId,
        `${incomeSource.name} Cycle`,
        newCycleStartDate,
        newCycleEndDate,
        input.receivedAmount,
        input.receivedAmount,
        'active',
        now,
        now,
      ]
    );

    for (const allocation of newEnvelopeAllocations) {
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
          allocation.id,
          newCycleId,
          allocation.accountId,
          allocation.name,
          allocation.type,
          allocation.plannedAmount,
          0,
          allocation.plannedAmount,
          allocation.isLocked,
          0,
          now,
          now,
        ]
      );
    }

    const accountAllocationMap = new Map<string, number>();

    for (const allocation of newEnvelopeAllocations) {
      const currentAmount = accountAllocationMap.get(allocation.accountId) ?? 0;
      accountAllocationMap.set(
        allocation.accountId,
        currentAmount + allocation.plannedAmount
      );
    }

    for (const [accountId, amount] of accountAllocationMap.entries()) {
      await tx.runAsync(
        `
        UPDATE accounts
        SET
          current_balance = current_balance + ?,
          updated_at = ?
        WHERE id = ?;
        `,
        [amount, now, accountId]
      );

      await tx.runAsync(
        `
        INSERT INTO transactions (
          id,
          budget_cycle_id,
          account_id,
          envelope_id,
          type,
          amount,
          date,
          category,
          note,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          createId('txn'),
          newCycleId,
          accountId,
          null,
          'income',
          amount,
          receivedDate,
          'regular_income',
          input.note?.trim() || incomeSource.name,
          now,
          now,
        ]
      );
    }
  });
}
