import { getDatabase } from '../../db/database';

export type IncomeSource = {
  id: string;
  name: string;
  type: string;
  expected_amount: number | null;
  frequency: string;
  expected_day_of_week: number | null;
  expected_day_of_month: number | null;
  custom_interval_days: number | null;
  is_recurring: number;
  is_active: number;
};

export async function getActiveIncomeSources() {
  const db = await getDatabase();

  return db.getAllAsync<IncomeSource>(
    `
    SELECT
      id,
      name,
      type,
      expected_amount,
      frequency,
      expected_day_of_week,
      expected_day_of_month,
      custom_interval_days,
      is_recurring,
      is_active
    FROM income_sources
    WHERE is_active = 1
    ORDER BY created_at ASC;
    `
  );
}