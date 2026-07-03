import { getDatabase } from '../db/database';
import { getNowISOString, getTodayISODate } from '../utils/date';
import { createId } from '../utils/id';

type AdjustBalanceInput = {
  accountId: string;
  envelopeId: string;
  actualBalance: number;
  note?: string;
};

export async function adjustAccountBalance(input: AdjustBalanceInput) {
  if (!input.accountId) {
    throw new Error('Account is required');
  }

  if (!input.envelopeId) {
    throw new Error('Envelope is required');
  }

  if (input.actualBalance < 0) {
    throw new Error('Actual balance cannot be negative');
  }

  const db = await getDatabase();

  const now = getNowISOString();
  const today = getTodayISODate();
  const transactionId = createId('txn');

  await db.withExclusiveTransactionAsync(async (tx) => {
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

    const envelope = await tx.getFirstAsync<{
      id: string;
      budget_cycle_id: string;
      account_id: string;
      name: string;
      remaining_amount: number;
      used_amount: number;
    }>(
      `
      SELECT
        id,
        budget_cycle_id,
        account_id,
        name,
        remaining_amount,
        used_amount
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

    const difference = input.actualBalance - account.current_balance;

    if (difference === 0) {
      throw new Error('Account balance already matches the actual balance');
    }

    const adjustmentAmount = Math.abs(difference);
    const category = difference > 0 ? 'balance_increase' : 'balance_decrease';

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
        'adjustment',
        adjustmentAmount,
        today,
        category,
        input.note?.trim() || null,
        now,
        now,
      ]
    );

    await tx.runAsync(
      `
      UPDATE accounts
      SET
        current_balance = ?,
        updated_at = ?
      WHERE id = ?;
      `,
      [input.actualBalance, now, input.accountId]
    );

    if (difference > 0) {
      await tx.runAsync(
        `
        UPDATE envelopes
        SET
          remaining_amount = remaining_amount + ?,
          updated_at = ?
        WHERE id = ?;
        `,
        [adjustmentAmount, now, input.envelopeId]
      );
    } else {
      await tx.runAsync(
        `
        UPDATE envelopes
        SET
          used_amount = used_amount + ?,
          remaining_amount = remaining_amount - ?,
          updated_at = ?
        WHERE id = ?;
        `,
        [adjustmentAmount, adjustmentAmount, now, input.envelopeId]
      );
    }
  });
}
