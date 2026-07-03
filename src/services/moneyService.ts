import { getDatabase } from '../db/database';
import { getNowISOString, getTodayISODate } from '../utils/date';
import { createId } from '../utils/id';

type MoneySource = 'freelance' | 'gift' | 'bonus' | 'refund' | 'other';

type CreateIncomeInput = {
  accountId: string;
  envelopeId: string;
  amount: number;
  source: MoneySource;
  note?: string;
};

export async function createIncomeTransaction(input: CreateIncomeInput) {
  if (!input.accountId) {
    throw new Error('Account is required');
  }

  if (!input.envelopeId) {
    throw new Error('Envelope is required');
  }

  if (input.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const db = await getDatabase();

  const now = getNowISOString();
  const today = getTodayISODate();
  const transactionId = createId('txn');

  await db.withExclusiveTransactionAsync(async (tx) => {
    const envelope = await tx.getFirstAsync<{
      id: string;
      budget_cycle_id: string;
      account_id: string;
      name: string;
      planned_amount: number;
      remaining_amount: number;
    }>(
      `
      SELECT
        id,
        budget_cycle_id,
        account_id,
        name,
        planned_amount,
        remaining_amount
      FROM envelopes
      WHERE id = ?
      LIMIT 1;
      `,
      [input.envelopeId]
    );

    if (!envelope) {
      throw new Error('Envelope not found');
    }

    if (envelope.account_id !== input.accountId) {
      throw new Error('Selected envelope does not belong to selected account');
    }

    const account = await tx.getFirstAsync<{
      id: string;
      current_balance: number;
    }>(
      `
      SELECT id, current_balance
      FROM accounts
      WHERE id = ?
      LIMIT 1;
      `,
      [input.accountId]
    );

    if (!account) {
      throw new Error('Account not found');
    }

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
        transactionId,
        envelope.budget_cycle_id,
        input.accountId,
        input.envelopeId,
        'income',
        input.amount,
        today,
        input.source,
        input.note?.trim() || null,
        now,
        now,
      ]
    );

    await tx.runAsync(
      `
      UPDATE accounts
      SET
        current_balance = current_balance + ?,
        updated_at = ?
      WHERE id = ?;
      `,
      [input.amount, now, input.accountId]
    );

    await tx.runAsync(
      `
      UPDATE envelopes
      SET
        planned_amount = planned_amount + ?,
        remaining_amount = remaining_amount + ?,
        updated_at = ?
      WHERE id = ?;
      `,
      [input.amount, input.amount, now, input.envelopeId]
    );

    await tx.runAsync(
      `
      UPDATE budget_cycles
      SET
        planned_amount = planned_amount + ?,
        actual_amount = actual_amount + ?,
        updated_at = ?
      WHERE id = ?;
      `,
      [input.amount, input.amount, now, envelope.budget_cycle_id]
    );
  });
}