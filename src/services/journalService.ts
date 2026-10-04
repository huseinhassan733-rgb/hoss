import { db } from './db.js';
import { JournalEntry, JournalEntryLine } from './types.js';

const run = (sql: string, params: any[] = []): Promise<{ lastID?: number }> =>
  new Promise((resolve, reject) => {
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

const ensureAccountsExist = async (lines: JournalEntryLine[]) => {
  const ids = Array.from(new Set(lines.map((l) => l.account_id)));
  if (ids.length === 0) throw new Error('No accounts specified in lines');
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all(`SELECT id FROM accounts WHERE id IN (${placeholders})`, ids);
  if (rows.length !== ids.length) throw new Error('One or more accounts do not exist');
};

const isPeriodOpen = async (entryDate: string): Promise<boolean> => {
  const row = await get(`SELECT status FROM financial_periods WHERE year = strftime('%Y', ?) AND month = CAST(strftime('%m', ?) AS INTEGER)`, [entryDate, entryDate]);
  return !!row && (row as any).status === 'open';
};

export const createJournalEntry = async (payload: JournalEntry): Promise<{ id: number }> => {
  if (!payload.lines || payload.lines.length === 0) {
    throw new Error('Journal entry must have at least one line');
  }

  const totalDebit = payload.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = payload.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new Error('Total debit must equal total credit');
  }

  await ensureAccountsExist(payload.lines);

  if (!(await isPeriodOpen(payload.entry_date))) {
    throw new Error('Financial period for entry date is closed');
  }

  // Insert entry and lines in a transaction
  await run('BEGIN TRANSACTION');
  try {
    const res = await run(
      `INSERT INTO journal_entries (entry_number, entry_date, description, status) VALUES (?, ?, ?, ?)`,
      [payload.entry_number, payload.entry_date, payload.description ?? null, payload.status ?? 'draft']
    );

    const entryId = res.lastID!;

    for (const line of payload.lines) {
      await run(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)`,
        [entryId, line.account_id, line.debit ?? 0, line.credit ?? 0, line.description ?? null]
      );
    }

    await run('COMMIT');
    return { id: entryId };
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
};

export const listJournalEntries = async (): Promise<JournalEntry[]> => {
  const entries = await all<any>(`SELECT * FROM journal_entries ORDER BY entry_date DESC`);
  const results: JournalEntry[] = [];

  for (const e of entries) {
    const lines = await all<JournalEntryLine>(`SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?`, [e.id]);
    results.push({ ...e, lines });
  }

  return results;
};

export const getJournalEntryById = async (id: number): Promise<JournalEntry | undefined> => {
  const entry = await get<any>(`SELECT * FROM journal_entries WHERE id = ?`, [id]);
  if (!entry) return undefined;
  const lines = await all<JournalEntryLine>(`SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?`, [id]);
  return { ...entry, lines };
};

export const postJournalEntry = async (id: number): Promise<void> => {
  const entry = await get<any>(`SELECT * FROM journal_entries WHERE id = ?`, [id]);
  if (!entry) throw new Error('Journal entry not found');
  if (entry.status === 'posted') throw new Error('Entry already posted');

  const lines = await all<any>(`SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?`, [id]);
  if (!lines || lines.length === 0) throw new Error('No lines found for entry');

  const totalDebit = lines.reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s: number, l: any) => s + Number(l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.0001) throw new Error('Entry is not balanced');

  if (!(await isPeriodOpen(entry.entry_date))) throw new Error('Financial period for entry date is closed');

  // Posting: mark as posted atomically
  await run('BEGIN TRANSACTION');
  try {
    await run(`UPDATE journal_entries SET status = 'posted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    // TODO: In future this is where posting would create ledger balances or affect other tables
    await run('COMMIT');
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
};
