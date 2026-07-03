import { getDatabase } from './database';
import { INITIAL_SCHEMA_SQL } from './schema.sql';

export async function migrateDatabase() {
  const db = await getDatabase();

  await db.execAsync(INITIAL_SCHEMA_SQL);

  console.log('Database migration completed');
}