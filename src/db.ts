import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

sqlite3.verbose();

const dbPath = process.env.DB_PATH ?? './data/h2pro.db';
const databaseDirectory = path.dirname(dbPath);

if (!fs.existsSync(databaseDirectory)) {
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

export const db = new sqlite3.Database(dbPath);

export const initializeDatabase = async (): Promise<void> => {
  const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await new Promise<void>((resolve, reject) => {
    db.exec(schemaSql, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};
