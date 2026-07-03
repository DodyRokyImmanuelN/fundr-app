import { getDatabase } from './database';
import { getNowISOString } from '../utils/date';

export async function seedDatabase() {
  const db = await getDatabase();

  const existingAccount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM accounts;'
  );

  if (existingAccount && existingAccount.count > 0) {
    console.log('Seed skipped: data already exists');
    return;
  }

  const now = getNowISOString();

  await db.execAsync(`
    INSERT INTO user_settings (
      id,
      user_name,
      currency,
      minimum_daily_limit,
      is_onboarding_completed,
      created_at,
      updated_at
    ) VALUES (
      'settings_1',
      'Demo User',
      'IDR',
      30000,
      1,
      '${now}',
      '${now}'
    );

    INSERT INTO accounts (
      id,
      name,
      type,
      initial_balance,
      current_balance,
      is_archived,
      created_at,
      updated_at
    ) VALUES
    (
      'acc_daily_wallet',
      'Daily Wallet',
      'daily_spending',
      500000,
      500000,
      0,
      '${now}',
      '${now}'
    ),
    (
      'acc_savings_wallet',
      'Savings Wallet',
      'saving',
      350000,
      350000,
      0,
      '${now}',
      '${now}'
    );

    INSERT INTO income_sources (
      id,
      name,
      type,
      expected_amount,
      frequency,
      expected_day_of_week,
      is_recurring,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      'incsrc_weekly_allowance',
      'Weekly Allowance',
      'allowance',
      850000,
      'weekly',
      6,
      1,
      1,
      '${now}',
      '${now}'
    );

    INSERT INTO income_events (
      id,
      income_source_id,
      expected_amount,
      received_amount,
      expected_date,
      received_date,
      status,
      note,
      created_at,
      updated_at
    ) VALUES (
      'incevt_demo_weekly',
      'incsrc_weekly_allowance',
      850000,
      850000,
      '2026-07-04',
      '2026-07-04',
      'received',
      'Initial demo income',
      '${now}',
      '${now}'
    );

    INSERT INTO budget_cycles (
      id,
      income_event_id,
      name,
      start_date,
      end_date,
      planned_amount,
      actual_amount,
      status,
      created_at,
      updated_at
    ) VALUES (
      'cycle_demo_weekly',
      'incevt_demo_weekly',
      'Weekly Budget Demo',
      '2026-07-04',
      '2026-07-10',
      850000,
      850000,
      'active',
      '${now}',
      '${now}'
    );

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
    ) VALUES
    (
      'env_food',
      'cycle_demo_weekly',
      'acc_daily_wallet',
      'Food',
      'need',
      260000,
      0,
      260000,
      0,
      0,
      '${now}',
      '${now}'
    ),
    (
      'env_transport',
      'cycle_demo_weekly',
      'acc_daily_wallet',
      'Transport',
      'need',
      50000,
      0,
      50000,
      0,
      0,
      '${now}',
      '${now}'
    ),
    (
      'env_laundry',
      'cycle_demo_weekly',
      'acc_daily_wallet',
      'Laundry',
      'need',
      50000,
      0,
      50000,
      0,
      0,
      '${now}',
      '${now}'
    ),
    (
      'env_electricity',
      'cycle_demo_weekly',
      'acc_daily_wallet',
      'Electricity',
      'need',
      25000,
      0,
      25000,
      0,
      0,
      '${now}',
      '${now}'
    ),
    (
      'env_pet',
      'cycle_demo_weekly',
      'acc_daily_wallet',
      'Pet Needs',
      'need',
      25000,
      0,
      25000,
      0,
      0,
      '${now}',
      '${now}'
    ),
    (
      'env_coffee',
      'cycle_demo_weekly',
      'acc_daily_wallet',
      'Coffee / Snacks',
      'want',
      65000,
      0,
      65000,
      0,
      0,
      '${now}',
      '${now}'
    ),
    (
      'env_buffer',
      'cycle_demo_weekly',
      'acc_daily_wallet',
      'Buffer',
      'buffer',
      25000,
      0,
      25000,
      0,
      0,
      '${now}',
      '${now}'
    ),
    (
      'env_savings',
      'cycle_demo_weekly',
      'acc_savings_wallet',
      'Savings',
      'saving',
      180000,
      0,
      180000,
      1,
      0,
      '${now}',
      '${now}'
    ),
    (
      'env_subscription',
      'cycle_demo_weekly',
      'acc_savings_wallet',
      'Subscription',
      'subscription',
      170000,
      0,
      170000,
      1,
      0,
      '${now}',
      '${now}'
    );
  `);

  console.log('Seed completed');
}