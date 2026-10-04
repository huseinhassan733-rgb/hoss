import { db } from './db.js';
import { Account } from './types.js';

const run = (sql: string, params: any[] = []): Promise<{ lastID?: number }>
  => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      // @ts-ignore
      resolve({ lastID: this.lastID });
    });
  });

const all = <T = any>(sql: string, params: any[] = []): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows as T[]);
    });
  });

const get = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row as T | undefined);
    });
  });

export const createAccount = async (payload: Account): Promise<Account> => {
  const sql = `INSERT INTO accounts (code, name, type, parent_id, is_active) VALUES (?, ?, ?, ?, ?)`;
  const res = await run(sql, [payload.code, payload.name, payload.type, payload.parent_id ?? null, payload.is_active ?? 1]);
  return { ...payload, id: res.lastID };
};

export const listAccounts = async (): Promise<Account[]> => {
  return all<Account>(`SELECT * FROM accounts ORDER BY code`);
};

export const getAccountById = async (id: number): Promise<Account | undefined> => {
  return get<Account>(`SELECT * FROM accounts WHERE id = ?`, [id]);
};
