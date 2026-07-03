import { getDatabase } from '../db/database';
import { getNowISOString } from '../utils/date';
import { createId } from '../utils/id';

type EnvelopeType =
  | 'need'
  | 'want'
  | 'saving'
  | 'subscription'
  | 'buffer'
  | 'reward'
  | 'other';

type CreateEnvelopeInput = {
  name: string;
  type: EnvelopeType;
  accountId: string;
  sourceEnvelopeId?: string;
  plannedAmount: number;
  isLocked: boolean;
};

export async function createEnvelope(input: CreateEnvelopeInput) {
  if (!input.name.trim()) {
    throw new Error('Envelope name is required');
  }

  if (!input.accountId) {
    throw new Error('Account is required');
  }

  if (input.plannedAmount < 0) {
    throw new Error('Planned amount cannot be negative');
  }

  if (input.plannedAmount > 0 && !input.sourceEnvelopeId) {
    throw new Error('Source envelope is required when amount is greater than 0');
  }

  const db = await getDatabase();

  const activeCycle = await db.getFirstAsync<{
    id: string;
  }>(
    `
    SELECT id
    FROM budget_cycles
    WHERE status = 'active'
    LIMIT 1;
    `
  );

  if (!activeCycle) {
    throw new Error('No active budget cycle found');
  }

  const now = getNowISOString();
  const newEnvelopeId = createId('env');

  await db.withExclusiveTransactionAsync(async (tx) => {
    if (input.plannedAmount > 0) {
      const sourceEnvelopeId = input.sourceEnvelopeId;

      if (!sourceEnvelopeId) {
        throw new Error('Source envelope is required when amount is greater than 0');
      }

      const sourceEnvelope = await tx.getFirstAsync<{
        id: string;
        budget_cycle_id: string;
        account_id: string;
        planned_amount: number;
        used_amount: number;
        remaining_amount: number;
      }>(
        `
        SELECT
          id,
          budget_cycle_id,
          account_id,
          planned_amount,
          used_amount,
          remaining_amount
        FROM envelopes
        WHERE id = ?
        LIMIT 1;
        `,
        [sourceEnvelopeId]
      );

      if (!sourceEnvelope) {
        throw new Error('Source envelope not found');
      }

      if (sourceEnvelope.budget_cycle_id !== activeCycle.id) {
        throw new Error('Source envelope is not in the active cycle');
      }

      if (sourceEnvelope.account_id !== input.accountId) {
        throw new Error('Source envelope must use the same account');
      }

      if (sourceEnvelope.remaining_amount < input.plannedAmount) {
        throw new Error('Source envelope does not have enough remaining money');
      }

      await tx.runAsync(
        `
        UPDATE envelopes
        SET
          planned_amount = planned_amount - ?,
          remaining_amount = remaining_amount - ?,
          updated_at = ?
        WHERE id = ?;
        `,
        [
          input.plannedAmount,
          input.plannedAmount,
          now,
          sourceEnvelopeId,
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
        newEnvelopeId,
        activeCycle.id,
        input.accountId,
        input.name.trim(),
        input.type,
        input.plannedAmount,
        0,
        input.plannedAmount,
        input.isLocked ? 1 : 0,
        0,
        now,
        now,
      ]
    );
  });
}
