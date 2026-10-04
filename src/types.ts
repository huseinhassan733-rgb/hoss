export interface Account {
  id?: number;
  code: string;
  name: string;
  type: string;
  parent_id?: number | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntryLine {
  id?: number;
  journal_entry_id?: number;
  account_id: number;
  debit: number;
  credit: number;
  description?: string | null;
}

export interface JournalEntry {
  id?: number;
  entry_number: string;
  entry_date: string; // ISO date
  description?: string | null;
  status?: string;
  lines: JournalEntryLine[];
  created_at?: string;
  updated_at?: string;
}
