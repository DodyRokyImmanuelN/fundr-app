import { getNowISOString } from '../utils/date';
import { getDatabase } from './database';

export async function seedDatabase() {
  const db = await getDatabase();

  const existingSettings = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM user_settings;'
  );

  if (existingSettings && existingSettings.count > 0) {
    console.log('Seed skipped: settings already exist');
    return;
  }

  const now = getNowISOString();

  await db.runAsync(
    `
    INSERT INTO user_settings (
      id,
      user_name,
      currency,
      minimum_daily_limit,
      is_onboarding_completed,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    ['settings_1', null, 'IDR', 30000, 0, now, now]
  );

  console.log('Default settings seed completed');
}