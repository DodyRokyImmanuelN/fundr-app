import { getDatabase } from '../../db/database';
import { getNowISOString } from '../../utils/date';

export type UserSettings = {
  id: string;
  user_name: string | null;
  currency: string;
  minimum_daily_limit: number;
  is_onboarding_completed: number;
  created_at: string;
  updated_at: string;
};

export async function getUserSettings() {
  const db = await getDatabase();

  return db.getFirstAsync<UserSettings>(
    `
    SELECT
      id,
      user_name,
      currency,
      minimum_daily_limit,
      is_onboarding_completed,
      created_at,
      updated_at
    FROM user_settings
    LIMIT 1;
    `
  );
}

export async function updateUserSettingsAfterOnboarding(params: {
  userName: string;
  currency: string;
}) {
  const db = await getDatabase();
  const now = getNowISOString();

  await db.runAsync(
    `
    UPDATE user_settings
    SET
      user_name = ?,
      currency = ?,
      is_onboarding_completed = 1,
      updated_at = ?
    WHERE id = 'settings_1';
    `,
    [params.userName, params.currency, now]
  );
}