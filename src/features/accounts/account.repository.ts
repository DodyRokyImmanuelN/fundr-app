import { getDatabase } from '../../db/database';

export type Account = {
  id: string;
  name: string;
  type: string;
  current_balance: number;
};

export async function getActiveAccounts() {
  const db = await getDatabase();

  return db.getAllAsync<Account>(
    `
    SELECT
      id,
      name,
      type,
      current_balance
    FROM accounts
    WHERE is_archived = 0
    ORDER BY
      CASE type
        WHEN 'daily_spending' THEN 1
        WHEN 'saving' THEN 2
        WHEN 'cash' THEN 3
        WHEN 'ewallet' THEN 4
        ELSE 5
      END,
      name ASC;
    `
  );
}