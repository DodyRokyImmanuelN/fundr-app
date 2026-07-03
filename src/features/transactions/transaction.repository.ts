import { getDatabase } from '../../db/database';

export type TransactionWithDetails = {
  id: string;
  budget_cycle_id: string | null;
  account_id: string;
  account_name: string;
  envelope_id: string | null;
  envelope_name: string | null;
  type: string;
  amount: number;
  date: string;
  category: string | null;
  note: string | null;
  created_at: string;
};

export async function getRecentTransactions() {
  const db = await getDatabase();

  return db.getAllAsync<TransactionWithDetails>(
    `
    SELECT
      transactions.id,
      transactions.budget_cycle_id,
      transactions.account_id,
      accounts.name as account_name,
      transactions.envelope_id,
      envelopes.name as envelope_name,
      transactions.type,
      transactions.amount,
      transactions.date,
      transactions.category,
      transactions.note,
      transactions.created_at
    FROM transactions
    INNER JOIN accounts
      ON accounts.id = transactions.account_id
    LEFT JOIN envelopes
      ON envelopes.id = transactions.envelope_id
    ORDER BY transactions.created_at DESC
    LIMIT 50;
    `
  );
}