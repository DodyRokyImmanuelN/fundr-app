import { getDatabase } from '../../db/database';

export type EnvelopeWithAccount = {
  id: string;
  budget_cycle_id: string;
  account_id: string;
  account_name: string;
  account_type: string;
  name: string;
  type: string;
  planned_amount: number;
  used_amount: number;
  remaining_amount: number;
  is_locked: number;
};

export async function getActiveCycleEnvelopes() {
  const db = await getDatabase();

  return db.getAllAsync<EnvelopeWithAccount>(
    `
    SELECT
      envelopes.id,
      envelopes.budget_cycle_id,
      envelopes.account_id,
      accounts.name as account_name,
      accounts.type as account_type,
      envelopes.name,
      envelopes.type,
      envelopes.planned_amount,
      envelopes.used_amount,
      envelopes.remaining_amount,
      envelopes.is_locked
    FROM envelopes
    INNER JOIN accounts
      ON accounts.id = envelopes.account_id
    WHERE envelopes.budget_cycle_id = (
      SELECT id
      FROM budget_cycles
      WHERE status = 'active'
      LIMIT 1
    )
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
    `
  );
}

export async function getSpendableActiveCycleEnvelopes() {
  const db = await getDatabase();

  return db.getAllAsync<EnvelopeWithAccount>(
    `
    SELECT
      envelopes.id,
      envelopes.budget_cycle_id,
      envelopes.account_id,
      accounts.name as account_name,
      accounts.type as account_type,
      envelopes.name,
      envelopes.type,
      envelopes.planned_amount,
      envelopes.used_amount,
      envelopes.remaining_amount,
      envelopes.is_locked
    FROM envelopes
    INNER JOIN accounts
      ON accounts.id = envelopes.account_id
    WHERE envelopes.budget_cycle_id = (
      SELECT id
      FROM budget_cycles
      WHERE status = 'active'
      LIMIT 1
    )
    AND envelopes.is_archived = 0
    AND envelopes.is_locked = 0
    ORDER BY
      CASE envelopes.type
        WHEN 'need' THEN 1
        WHEN 'want' THEN 2
        WHEN 'buffer' THEN 3
        ELSE 4
      END,
      envelopes.name ASC;
    `
  );
}