export const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_name TEXT,
  currency TEXT NOT NULL DEFAULT 'IDR',
  minimum_daily_limit INTEGER NOT NULL DEFAULT 30000,
  is_onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'daily_spending',
    'saving',
    'cash',
    'ewallet',
    'other'
  )),
  initial_balance INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS income_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'allowance',
    'salary',
    'freelance',
    'bonus',
    'gift',
    'other'
  )),
  expected_amount INTEGER,
  frequency TEXT NOT NULL CHECK (frequency IN (
    'weekly',
    'biweekly',
    'monthly',
    'irregular',
    'custom'
  )),
  expected_day_of_week INTEGER,
  expected_day_of_month INTEGER,
  custom_interval_days INTEGER,
  is_recurring INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS income_events (
  id TEXT PRIMARY KEY,
  income_source_id TEXT NOT NULL,
  expected_amount INTEGER,
  received_amount INTEGER NOT NULL DEFAULT 0,
  expected_date TEXT,
  received_date TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'received',
    'delayed',
    'partially_received',
    'cancelled',
    'skipped'
  )),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (income_source_id)
    REFERENCES income_sources(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budget_cycles (
  id TEXT PRIMARY KEY,
  income_event_id TEXT,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  planned_amount INTEGER NOT NULL DEFAULT 0,
  actual_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN (
    'planned',
    'waiting_for_income',
    'active',
    'extended',
    'review',
    'closed',
    'skipped'
  )),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (income_event_id)
    REFERENCES income_events(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS envelopes (
  id TEXT PRIMARY KEY,
  budget_cycle_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'need',
    'want',
    'saving',
    'subscription',
    'buffer',
    'reward',
    'other'
  )),
  planned_amount INTEGER NOT NULL DEFAULT 0,
  used_amount INTEGER NOT NULL DEFAULT 0,
  remaining_amount INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (budget_cycle_id)
    REFERENCES budget_cycles(id)
    ON DELETE CASCADE,

  FOREIGN KEY (account_id)
    REFERENCES accounts(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  budget_cycle_id TEXT,
  account_id TEXT NOT NULL,
  envelope_id TEXT,
  type TEXT NOT NULL CHECK (type IN (
    'income',
    'expense',
    'transfer',
    'adjustment'
  )),
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  category TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (budget_cycle_id)
    REFERENCES budget_cycles(id)
    ON DELETE SET NULL,

  FOREIGN KEY (account_id)
    REFERENCES accounts(id)
    ON DELETE CASCADE,

  FOREIGN KEY (envelope_id)
    REFERENCES envelopes(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  budget_cycle_id TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN (
    'info',
    'safe',
    'warning',
    'danger'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,

  FOREIGN KEY (budget_cycle_id)
    REFERENCES budget_cycles(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_budget_cycles_status
ON budget_cycles(status);

CREATE INDEX IF NOT EXISTS idx_transactions_budget_cycle_id
ON transactions(budget_cycle_id);

CREATE INDEX IF NOT EXISTS idx_envelopes_budget_cycle_id
ON envelopes(budget_cycle_id);

CREATE INDEX IF NOT EXISTS idx_insights_budget_cycle_id
ON insights(budget_cycle_id);
`;