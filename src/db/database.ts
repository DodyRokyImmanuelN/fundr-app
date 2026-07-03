import * as SQLite from 'expo-sqlite';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync('fundr_dev_v2.db');

  await database.execAsync(`
    PRAGMA foreign_keys = ON;
  `);

  return database;
}