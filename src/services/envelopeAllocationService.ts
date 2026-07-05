import { getDatabase } from '../db/database';
import { getNowISOString, getTodayISODate } from '../utils/date';
import { createId } from '../utils/id';

type AdjustEnvelopeAllocationInput = {
  envelopeId: string;
  newPlannedAmount: number;
  sourceEnvelopeId?: string;
  destinationEnvelopeId?: string;
};

export async function adjustEnvelopeAllocation(input: AdjustEnvelopeAllocationInput) {
  if (!input.envelopeId) throw new Error('Envelope is required');
  if (input.newPlannedAmount < 0) throw new Error('Planned amount cannot be negative');

  const db = await getDatabase();
  const now = getNowISOString();
  const today = getTodayISODate();

  await db.withExclusiveTransactionAsync(async (tx) => {
    const target = await tx.getFirstAsync<{
      id: string;
      budget_cycle_id: string;
      account_id: string;
      name: string;
      planned_amount: number;
      used_amount: number;
      remaining_amount: number;
      is_locked: number;
    }>(
      `
      SELECT id, budget_cycle_id, account_id, name, planned_amount,
        used_amount, remaining_amount, is_locked
      FROM envelopes
      WHERE id = ?
      LIMIT 1;
      `,
      [input.envelopeId]
    );

    if (!target) throw new Error('Envelope not found');

    const difference = input.newPlannedAmount - target.planned_amount;
    if (difference === 0) throw new Error('Allocation is unchanged');

    const transferAmount = Math.abs(difference);
    const counterpartyId =
      difference > 0 ? input.sourceEnvelopeId : input.destinationEnvelopeId;

    if (!counterpartyId) {
      throw new Error(
        difference > 0
          ? 'Source envelope is required'
          : 'Destination envelope is required'
      );
    }

    if (counterpartyId === target.id) {
      throw new Error('Choose a different envelope');
    }

    const counterparty = await tx.getFirstAsync<{
      id: string;
      budget_cycle_id: string;
      account_id: string;
      name: string;
      planned_amount: number;
      used_amount: number;
      remaining_amount: number;
      is_locked: number;
    }>(
      `
      SELECT id, budget_cycle_id, account_id, name, planned_amount,
        used_amount, remaining_amount, is_locked
      FROM envelopes
      WHERE id = ?
      LIMIT 1;
      `,
      [counterpartyId]
    );

    if (!counterparty) throw new Error('Counterparty envelope not found');
    if (counterparty.budget_cycle_id !== target.budget_cycle_id) {
      throw new Error('Envelope must be in the same budget cycle');
    }
    if (counterparty.account_id !== target.account_id) {
      throw new Error('Envelope must use the same account');
    }
    if (counterparty.is_locked !== target.is_locked) {
      throw new Error('Flexible and protected envelopes cannot be mixed');
    }

    if (difference > 0) {
      if (counterparty.remaining_amount < transferAmount) {
        throw new Error('Source envelope does not have enough remaining money');
      }

      await tx.runAsync(
        `
        UPDATE envelopes
        SET planned_amount = planned_amount + ?,
            remaining_amount = remaining_amount + ?,
            updated_at = ?
        WHERE id = ?;
        `,
        [transferAmount, transferAmount, now, target.id]
      );

      await tx.runAsync(
        `
        UPDATE envelopes
        SET planned_amount = planned_amount - ?,
            remaining_amount = remaining_amount - ?,
            updated_at = ?
        WHERE id = ?;
        `,
        [transferAmount, transferAmount, now, counterparty.id]
      );
    } else {
      if (target.remaining_amount < transferAmount) {
        throw new Error('Cannot reduce below money already used');
      }

      await tx.runAsync(
        `
        UPDATE envelopes
        SET planned_amount = planned_amount - ?,
            remaining_amount = remaining_amount - ?,
            updated_at = ?
        WHERE id = ?;
        `,
        [transferAmount, transferAmount, now, target.id]
      );

      await tx.runAsync(
        `
        UPDATE envelopes
        SET planned_amount = planned_amount + ?,
            remaining_amount = remaining_amount + ?,
            updated_at = ?
        WHERE id = ?;
        `,
        [transferAmount, transferAmount, now, counterparty.id]
      );
    }

    await tx.runAsync(
      `
      INSERT INTO transactions (
        id, budget_cycle_id, account_id, envelope_id, type, amount,
        date, category, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        createId('txn'),
        target.budget_cycle_id,
        target.account_id,
        target.id,
        'transfer',
        transferAmount,
        today,
        difference > 0 ? 'allocation_increase' : 'allocation_decrease',
        difference > 0
          ? `Moved allocation from ${counterparty.name} to ${target.name}`
          : `Moved allocation from ${target.name} to ${counterparty.name}`,
        now,
        now,
      ]
    );
  });
}