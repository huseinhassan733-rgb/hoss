/**
 * H2pro ERP - Local Database & Storage Manager
 * نظام إدارة وتخزين البيانات المتكامل لسطح المكتب
 */

import {
  FinancialYear,
  CompanyInfo,
  Region,
  Currency,
  Account,
  BankCashFund,
  InventoryItem,
  Warehouse,
  Supplier,
  Customer,
  JournalEntry,
  CashVoucher,
  PurchaseInvoice,
  PurchaseOrder,
  PurchaseReturn,
  SalesInvoice,
  Quotation,
  SalesReturn,
  StockMovement,
  User,
  UserPermission,
  AuditLog,
  InventoryLayer,
  ExchangeRateRecord,
} from '../types';
import { PeriodClosureService } from '../services/PeriodClosureService';

import {
  INITIAL_FINANCIAL_YEARS,
  INITIAL_COMPANY_INFO,
  INITIAL_USERS,
  INITIAL_REGIONS,
  INITIAL_CURRENCIES,
  INITIAL_ACCOUNTS,
  INITIAL_BANKS_CASH,
  INITIAL_WAREHOUSES,
  INITIAL_ITEMS,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_VOUCHERS,
  INITIAL_PURCHASE_INVOICES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_PURCHASE_RETURNS,
  INITIAL_SALES_INVOICES,
  INITIAL_QUOTATIONS,
  INITIAL_SALES_RETURNS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_AUDIT_LOGS,
} from './initialData';
import { getNextDocSeq } from '../utils/documentSequence';
import { InventoryCostingService } from '../services/inventoryCostingService';
import { ensureAccountingAccounts } from '../services/accountingSchemaMigration';
import { AccountingPostingEngine } from '../services/accountingPostingEngine';
import { AccountingIntegrityService } from '../services/accountingIntegrityService';
import { validateTradeDocumentBase, validateReturnAgainstOriginal, calculateDocumentTotals } from '../services/tradeCycleValidation';

const DB_KEY_PREFIX = 'h2pro_erp_db_';

interface DatabaseState {
  financialYears: FinancialYear[];
  companyInfo: CompanyInfo;
  users: User[];
  regions: Region[];
  currencies: Currency[];
  accounts: Account[];
  banksCash: BankCashFund[];
  warehouses: Warehouse[];
  items: InventoryItem[];
  suppliers: Supplier[];
  customers: Customer[];
  journalEntries: JournalEntry[];
  vouchers: CashVoucher[];
  purchaseInvoices: PurchaseInvoice[];
  purchaseOrders: PurchaseOrder[];
  purchaseReturns: PurchaseReturn[];
  salesInvoices: SalesInvoice[];
  quotations: Quotation[];
  salesReturns: SalesReturn[];
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];
  inventoryLayers: InventoryLayer[];
  closedMonths: string[];
  closedYears: number[];
  exchangeRateHistory: ExchangeRateRecord[];
}

class H2proDatabase {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadFromStorage();
    this.persistToSQLite(this.state);
    void this.migrateLegacyPasswords();
  }

  private getSQLiteBridge(): any {
    if (typeof window === 'undefined') return null;
    return (window as any).electronAPI || null;
  }

  private persistToSQLite(state: DatabaseState): void {
    const bridge = this.getSQLiteBridge();
    if (!bridge?.sqliteSaveStateSync) return;
    try {
      const result = bridge.sqliteSaveStateSync(state);
      if (result && result.success === false) {
        throw new Error(result.error || 'SQLite persistence failed');
      }
    } catch (error) {
      console.error('SQLite persistence unavailable:', error);
      throw error;
    }
  }

  public getSQLiteReconciliation(): Record<string, unknown> | null {
    const bridge = this.getSQLiteBridge();
    if (!bridge?.sqliteReconcile) return null;
    try {
      const result = bridge.sqliteReconcile();
      return result && typeof result === 'object' ? result : null;
    } catch {
      return null;
    }
  }

  public getSQLiteDocumentReport(documentType: string, fromDate = '', toDate = ''): Array<Record<string, unknown>> {
    const bridge = this.getSQLiteBridge();
    if (!bridge?.sqliteReportDocumentsSync) return [];
    try {
      const result = bridge.sqliteReportDocumentsSync({ documentType, fromDate, toDate });
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  }

  private async derivePassword(password: string, saltHex?: string, iterations = 120000): Promise<{ hash: string; salt: string; iterations: number }> {
    if (!password || password.length < 8) throw new Error('كلمة المرور يجب أن تحتوي على 8 أحرف/أرقام على الأقل.');
    const salt = saltHex
      ? Uint8Array.from(saltHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || [])
      : crypto.getRandomValues(new Uint8Array(16));
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, 256);
    const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const saltOut = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt: saltOut, iterations };
  }

  private async verifyPassword(password: string, user: User): Promise<boolean> {
    if (!user.passwordHash || !user.passwordSalt) return false;
    const derived = await this.derivePassword(password, user.passwordSalt, user.passwordIterations || 120000);
    return derived.hash === user.passwordHash;
  }

  private async migrateLegacyPasswords(): Promise<void> {
    const legacy = this.state.users.filter((u) => !!u.password && !u.passwordHash);
    if (!legacy.length) return;
    for (const user of legacy) {
      try {
        const derived = await this.derivePassword(user.password || '');
        user.passwordHash = derived.hash;
        user.passwordSalt = derived.salt;
        user.passwordIterations = derived.iterations;
        delete user.password;
      } catch {
        // Invalid legacy account: administrator must reset it.
      }
    }
    if (legacy.some((u) => u.passwordHash)) this.saveToStorage();
  }

  private loadFromStorage(): DatabaseState {
    try {
      const bridge = this.getSQLiteBridge();
      const sqliteState = bridge?.sqliteLoadStateSync ? bridge.sqliteLoadStateSync() : null;
      if (sqliteState && !sqliteState.__sqliteError && typeof sqliteState === 'object') {
        return {
          financialYears: Array.isArray(sqliteState.financialYears) ? sqliteState.financialYears : [...INITIAL_FINANCIAL_YEARS],
          companyInfo: sqliteState.companyInfo || { ...INITIAL_COMPANY_INFO },
          users: Array.isArray(sqliteState.users) ? sqliteState.users : [...INITIAL_USERS],
          regions: Array.isArray(sqliteState.regions) ? sqliteState.regions : [...INITIAL_REGIONS],
          currencies: Array.isArray(sqliteState.currencies) ? sqliteState.currencies : [...INITIAL_CURRENCIES],
          accounts: ensureAccountingAccounts(Array.isArray(sqliteState.accounts) ? sqliteState.accounts : [...INITIAL_ACCOUNTS]),
          banksCash: Array.isArray(sqliteState.banksCash) ? sqliteState.banksCash : [...INITIAL_BANKS_CASH],
          warehouses: Array.isArray(sqliteState.warehouses) ? sqliteState.warehouses : [...INITIAL_WAREHOUSES],
          items: Array.isArray(sqliteState.items) ? sqliteState.items : [...INITIAL_ITEMS],
          suppliers: Array.isArray(sqliteState.suppliers) ? sqliteState.suppliers : [...INITIAL_SUPPLIERS],
          customers: Array.isArray(sqliteState.customers) ? sqliteState.customers : [...INITIAL_CUSTOMERS],
          journalEntries: Array.isArray(sqliteState.journalEntries) ? sqliteState.journalEntries : [...INITIAL_JOURNAL_ENTRIES],
          vouchers: Array.isArray(sqliteState.vouchers) ? sqliteState.vouchers : [...INITIAL_VOUCHERS],
          purchaseInvoices: Array.isArray(sqliteState.purchaseInvoices) ? sqliteState.purchaseInvoices : [...INITIAL_PURCHASE_INVOICES],
          purchaseOrders: Array.isArray(sqliteState.purchaseOrders) ? sqliteState.purchaseOrders : [...INITIAL_PURCHASE_ORDERS],
          purchaseReturns: Array.isArray(sqliteState.purchaseReturns) ? sqliteState.purchaseReturns : [...INITIAL_PURCHASE_RETURNS],
          salesInvoices: Array.isArray(sqliteState.salesInvoices) ? sqliteState.salesInvoices : [...INITIAL_SALES_INVOICES],
          quotations: Array.isArray(sqliteState.quotations) ? sqliteState.quotations : [...INITIAL_QUOTATIONS],
          salesReturns: Array.isArray(sqliteState.salesReturns) ? sqliteState.salesReturns : [...INITIAL_SALES_RETURNS],
          stockMovements: Array.isArray(sqliteState.stockMovements) ? sqliteState.stockMovements : [...INITIAL_STOCK_MOVEMENTS],
          auditLogs: Array.isArray(sqliteState.auditLogs) ? sqliteState.auditLogs : [...INITIAL_AUDIT_LOGS],
          inventoryLayers: Array.isArray(sqliteState.inventoryLayers) ? sqliteState.inventoryLayers : [],
          closedMonths: Array.isArray(sqliteState.closedMonths) ? sqliteState.closedMonths : [],
          closedYears: Array.isArray(sqliteState.closedYears) ? sqliteState.closedYears : [],
          exchangeRateHistory: Array.isArray(sqliteState.exchangeRateHistory) ? sqliteState.exchangeRateHistory : [],
        };
      }

      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(`${DB_KEY_PREFIX}state`) : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          // Existing databases must be loaded as-is. Seed data is used only when no database exists.
          financialYears: Array.isArray(parsed.financialYears) ? parsed.financialYears : [...INITIAL_FINANCIAL_YEARS],
          companyInfo: parsed.companyInfo || { ...INITIAL_COMPANY_INFO },
          users: Array.isArray(parsed.users) ? parsed.users : [...INITIAL_USERS],
          regions: Array.isArray(parsed.regions) ? parsed.regions : [...INITIAL_REGIONS],
          currencies: Array.isArray(parsed.currencies) ? parsed.currencies : [...INITIAL_CURRENCIES],
          accounts: ensureAccountingAccounts(Array.isArray(parsed.accounts) ? parsed.accounts : [...INITIAL_ACCOUNTS]),
          banksCash: Array.isArray(parsed.banksCash) ? parsed.banksCash : [...INITIAL_BANKS_CASH],
          warehouses: Array.isArray(parsed.warehouses) ? parsed.warehouses : [...INITIAL_WAREHOUSES],
          items: Array.isArray(parsed.items) ? parsed.items : [...INITIAL_ITEMS],
          suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [...INITIAL_SUPPLIERS],
          customers: Array.isArray(parsed.customers) ? parsed.customers : [...INITIAL_CUSTOMERS],
          journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [...INITIAL_JOURNAL_ENTRIES],
          vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : [...INITIAL_VOUCHERS],
          purchaseInvoices: Array.isArray(parsed.purchaseInvoices) ? parsed.purchaseInvoices : [...INITIAL_PURCHASE_INVOICES],
          purchaseOrders: Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders : [...INITIAL_PURCHASE_ORDERS],
          purchaseReturns: Array.isArray(parsed.purchaseReturns) ? parsed.purchaseReturns : [...INITIAL_PURCHASE_RETURNS],
          salesInvoices: Array.isArray(parsed.salesInvoices) ? parsed.salesInvoices : [...INITIAL_SALES_INVOICES],
          quotations: Array.isArray(parsed.quotations) ? parsed.quotations : [...INITIAL_QUOTATIONS],
          salesReturns: Array.isArray(parsed.salesReturns) ? parsed.salesReturns : [...INITIAL_SALES_RETURNS],
          stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [...INITIAL_STOCK_MOVEMENTS],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [...INITIAL_AUDIT_LOGS],
          inventoryLayers: parsed.inventoryLayers || [],
          closedMonths: parsed.closedMonths || [],
          closedYears: parsed.closedYears || [],
          exchangeRateHistory: parsed.exchangeRateHistory || [],
        };
      }
    } catch (e) {
      console.error('Error loading database from local storage, using initial seed data', e);
    }

    return {
      financialYears: [...INITIAL_FINANCIAL_YEARS],
      companyInfo: { ...INITIAL_COMPANY_INFO },
      users: [...INITIAL_USERS],
      regions: [...INITIAL_REGIONS],
      currencies: [...INITIAL_CURRENCIES],
      accounts: ensureAccountingAccounts([...INITIAL_ACCOUNTS]),
      banksCash: [...INITIAL_BANKS_CASH],
      warehouses: [...INITIAL_WAREHOUSES],
      items: [...INITIAL_ITEMS],
      suppliers: [...INITIAL_SUPPLIERS],
      customers: [...INITIAL_CUSTOMERS],
      journalEntries: [...INITIAL_JOURNAL_ENTRIES],
      vouchers: [...INITIAL_VOUCHERS],
      purchaseInvoices: [...INITIAL_PURCHASE_INVOICES],
      purchaseOrders: [...INITIAL_PURCHASE_ORDERS],
      purchaseReturns: [...INITIAL_PURCHASE_RETURNS],
      salesInvoices: [...INITIAL_SALES_INVOICES],
      quotations: [...INITIAL_QUOTATIONS],
      salesReturns: [...INITIAL_SALES_RETURNS],
      stockMovements: [...INITIAL_STOCK_MOVEMENTS],
      auditLogs: [...INITIAL_AUDIT_LOGS],
      inventoryLayers: [],
      closedMonths: [],
      closedYears: [],
      exchangeRateHistory: [],
    };
  }

  private saveTimeout: any = null;

  private cache: {
    accounts?: Account[];
    items?: InventoryItem[];
    companyInfo?: CompanyInfo;
    currencies?: Currency[];
    warehouses?: Warehouse[];
  } = {};

  private invalidateCache(): void {
    this.cache = {};
  }

  private saveToStorage(): void {
    const previousState = this.state;
    try {
      this.invalidateCache();
      // SQLite is committed first; local/web storage is updated only after
      // the relational transaction succeeds.
      this.persistToSQLite(this.state);
      if (typeof localStorage !== 'undefined') localStorage.setItem(`${DB_KEY_PREFIX}state`, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      try {
        const bridge = this.getSQLiteBridge();
        const durable = bridge?.sqliteLoadStateSync ? bridge.sqliteLoadStateSync() : null;
        if (durable && !durable.__sqliteError) {
          this.state = durable as DatabaseState;
          this.invalidateCache();
        } else {
          this.state = previousState;
        }
      } catch {
        this.state = previousState;
      }
      console.error('Atomic accounting transaction rejected; state rolled back:', e);
      throw e;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  // --- Audit Logging ---
  public logAction(
    username: string,
    action: AuditLog['action'],
    module: string,
    recordId: string,
    details: string
  ): void {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username,
      action,
      module,
      recordId,
      details,
    };
    this.state.auditLogs = [newLog, ...this.state.auditLogs];
    this.saveToStorage();
  }

  public getAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
  }

  // --- Financial Years ---
  public getFinancialYears(): FinancialYear[] {
    return this.state.financialYears;
  }

  public saveFinancialYear(year: FinancialYear, username: string): void {
    const index = this.state.financialYears.findIndex((y) => y.id === year.id);
    const isEdit = index >= 0;
    if (isEdit) {
      this.state.financialYears[index] = year;
      this.logAction(username, 'edit', 'بيانات السنة المالية', year.year.toString(), `تعديل السنة المالية ${year.year}`);
    } else {
      this.state.financialYears.push(year);
      this.logAction(username, 'add', 'بيانات السنة المالية', year.year.toString(), `إضافة سنة مالية جديدة ${year.year}`);
    }
    this.saveToStorage();
  }

  public deleteFinancialYear(id: string, username: string): boolean {
    const target = this.state.financialYears.find((y) => y.id === id);
    if (!target) return false;
    this.state.financialYears = this.state.financialYears.filter((y) => y.id !== id);
    this.logAction(username, 'delete', 'بيانات السنة المالية', target.year.toString(), `حذف السنة المالية ${target.year}`);
    this.saveToStorage();
    return true;
  }

  // --- Company Info ---
  public getCompanyInfo(): CompanyInfo {
    if (!this.cache.companyInfo) {
      this.cache.companyInfo = this.state.companyInfo;
    }
    return this.cache.companyInfo;
  }

  public updateCompanyInfo(info: CompanyInfo, username: string): void {
    this.state.companyInfo = { ...info };
    this.logAction(username, 'edit', 'بيانات الشركة', 'COMP-01', `تحديث بيانات الشركة وترويسة المطبوعات: ${info.name}`);
    this.saveToStorage();
  }

  // --- Regions ---
  public getRegions(): Region[] {
    return this.state.regions;
  }

  public saveRegion(region: Region, username: string): void {
    const index = this.state.regions.findIndex((r) => r.id === region.id);
    if (index >= 0) {
      this.state.regions[index] = region;
      this.logAction(username, 'edit', 'بيانات المناطق', region.city, `تعديل المنطقة ${region.city}`);
    } else {
      this.state.regions.push(region);
      this.logAction(username, 'add', 'بيانات المناطق', region.city, `إضافة منطقة جديدة ${region.city} - ${region.district}`);
    }
    this.saveToStorage();
  }

  public deleteRegion(id: string, username: string): boolean {
    const reg = this.state.regions.find((r) => r.id === id);
    if (!reg) return false;
    this.state.regions = this.state.regions.filter((r) => r.id !== id);
    this.logAction(username, 'delete', 'بيانات المناطق', reg.city, `حذف المنطقة ${reg.city}`);
    this.saveToStorage();
    return true;
  }

  // --- Currencies ---
  public getCurrencies(): Currency[] {
    if (!this.cache.currencies) {
      this.cache.currencies = this.state.currencies;
    }
    return this.cache.currencies;
  }

  public saveCurrency(curr: Currency, username: string): { success: boolean; message?: string } {
    const index = this.state.currencies.findIndex((c) => c.id === curr.id);
    if (curr.isLocal) {
      // Ensure only one local currency
      this.state.currencies.forEach((c) => {
        if (c.id !== curr.id) c.isLocal = false;
      });
    }

    if (index >= 0) {
      this.state.currencies[index] = curr;
      this.logAction(username, 'edit', 'بيانات العملات', curr.symbol, `تعديل عملة ${curr.name}`);
    } else {
      this.state.currencies.push(curr);
      this.logAction(username, 'add', 'بيانات العملات', curr.symbol, `إضافة عملة جديدة ${curr.name} (${curr.symbol})`);
    }
    this.saveToStorage();
    return { success: true };
  }

  public deleteCurrency(id: string, username: string): { success: boolean; message?: string } {
    const curr = this.state.currencies.find((c) => c.id === id);
    if (!curr) return { success: false, message: 'العملة غير موجودة' };
    if (curr.isLocal) {
      return { success: false, message: 'لا يمكن حذف العملة المحلية الرسمية للنظام!' };
    }
    this.state.currencies = this.state.currencies.filter((c) => c.id !== id);
    this.logAction(username, 'delete', 'بيانات العملات', curr.symbol, `حذف العملة ${curr.name}`);
    this.saveToStorage();
    return { success: true };
  }

  // --- Users & Permissions ---
  public getUsers(): User[] {
    return this.state.users;
  }

  public async authenticate(year: number, user: string, pass: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const trimmedUser = user.trim().toLowerCase();
    const target = this.state.users.find((u) => u.username.toLowerCase() === trimmedUser);
    if (!target || !(await this.verifyPassword(pass, target))) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة!' };
    }
    if (target.status !== 'active') {
      return { success: false, error: 'هذا الحساب معطل حالياً من قِبل إدارة النظام.' };
    }
    const fy = this.state.financialYears.find((y) => y.year === year);
    if (!fy) {
      return { success: false, error: 'السنة المالية المحددة غير معرّفة بالنظام.' };
    }
    const safeUser = { ...target };
    delete safeUser.password;
    this.logAction(target.username, 'login', 'تسجيل الدخول', target.username, 'دخول ناجح للنظام - السنة المالية ' + year);
    return { success: true, user: safeUser };
  }

  public async saveUser(userData: User, actor: string): Promise<void> {
    const index = this.state.users.findIndex((u) => u.id === userData.id);
    const existing = index >= 0 ? this.state.users[index] : undefined;
    const next = { ...userData };
    if (next.password) {
      const derived = await this.derivePassword(next.password);
      next.passwordHash = derived.hash;
      next.passwordSalt = derived.salt;
      next.passwordIterations = derived.iterations;
    } else if (existing) {
      next.passwordHash = existing.passwordHash;
      next.passwordSalt = existing.passwordSalt;
      next.passwordIterations = existing.passwordIterations;
    }
    delete next.password;
    if (!next.passwordHash) throw new Error('كلمة المرور مطلوبة لهذا المستخدم.');
    if (index >= 0) {
      this.state.users[index] = next;
      this.logAction(actor, 'edit', 'إدارة المستخدمين', next.username, 'تعديل بيانات المستخدم ' + next.name);
    } else {
      this.state.users.push(next);
      this.logAction(actor, 'add', 'إدارة المستخدمين', next.username, 'إضافة مستخدم جديد ' + next.name + ' (' + next.role + ')');
    }
    this.saveToStorage();
  }

  public async createFirstAdmin(name: string, username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    if (this.state.users.length) return { success: false, message: 'تمت تهيئة المستخدمين بالفعل.' };
    if (!name.trim() || !username.trim()) return { success: false, message: 'الاسم واسم المستخدم مطلوبان.' };
    const item: User = { id: 'usr-' + Date.now(), name: name.trim(), username: username.trim(), password, role: 'admin', status: 'active', createdAt: new Date().toISOString().slice(0,16).replace('T',' ') };
    await this.saveUser(item, 'system');
    const safe = { ...this.state.users[0] };
    delete safe.password;
    return { success: true, message: 'تم إنشاء المدير الأول بنجاح.', user: safe };
  }

  public deleteUser(id: string, actor: string): { success: boolean; message?: string } {
    const target = this.state.users.find((u) => u.id === id);
    if (!target) return { success: false, message: 'المستخدم غير موجود' };
    if (target.username === 'admin') {
      return { success: false, message: 'لا يمكن حذف حساب المدير العام الأساسي (admin)!' };
    }
    this.state.users = this.state.users.filter((u) => u.id !== id);
    this.logAction(actor, 'delete', 'إدارة المستخدمين', target.username, `حذف المستخدم ${target.name}`);
    this.saveToStorage();
    return { success: true };
  }

  public async changePassword(username: string, oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const user = this.state.users.find((u) => u.username === username);
    if (!user) return { success: false, message: 'المستخدم غير موجود' };
    if (!(await this.verifyPassword(oldPass, user))) return { success: false, message: 'كلمة السر الحالية غير صحيحة!' };
    try {
      const derived = await this.derivePassword(newPass);
      user.passwordHash = derived.hash;
      user.passwordSalt = derived.salt;
      user.passwordIterations = derived.iterations;
      delete user.password;
      this.logAction(username, 'edit', 'إدارة النظام', username, 'تغيير كلمة المرور الخاصة به');
      this.saveToStorage();
      return { success: true, message: 'تم تغيير كلمة المرور بنجاح.' };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'تعذر تغيير كلمة المرور.' };
    }
  }


  // --- General Ledger: Chart of Accounts with Live Double-Entry Balancing ---
  public getAccounts(): Account[] {
    if (!this.cache.accounts) {
      // 1. Calculate leaf accounts balances based on all posted journal lines
      const balanceMap: Record<string, number> = {};
      
      this.state.journalEntries.filter(je => je.status === 'posted').forEach((je) => {
        je.lines.forEach((l) => {
          if (!balanceMap[l.accountCode]) {
            balanceMap[l.accountCode] = 0;
          }
          const acc = this.state.accounts.find((a) => a.code === l.accountCode);
          const nature = acc ? acc.nature : 'debit';
          const debit = Number(l.debit) || 0;
          const credit = Number(l.credit) || 0;
          if (nature === 'debit') {
            balanceMap[l.accountCode] += debit - credit;
          } else {
            balanceMap[l.accountCode] += credit - debit;
          }
        });
      });

      // 2. Map sub accounts
      const accountsWithBalance = this.state.accounts.map((a) => {
        if (a.isSub) {
          const movementBalance = balanceMap[a.code];
          return {
            ...a,
            balance: movementBalance !== undefined ? movementBalance : (a.balance || 0),
          };
        }
        return { ...a, balance: 0 };
      });

      // 3. Roll up into parent accounts (level 3, 2, 1)
      const maxLevel = Math.max(...accountsWithBalance.map((a) => a.level || 1), 4);
      for (let lvl = maxLevel - 1; lvl >= 1; lvl--) {
        accountsWithBalance.forEach((p) => {
          if (p.level === lvl && !p.isSub) {
            const directChildren = accountsWithBalance.filter(
              (c) => c.parentCode === p.code
            );
            p.balance = directChildren.reduce((sum, c) => sum + (c.balance || 0), 0);
          }
        });
      }

      this.cache.accounts = accountsWithBalance;
    }
    return this.cache.accounts;
  }

  public saveAccount(acc: Account, actor: string): void {
    const index = this.state.accounts.findIndex((a) => a.id === acc.id);
    if (index >= 0) {
      this.state.accounts[index] = acc;
      this.logAction(actor, 'edit', 'شجرة الحسابات', acc.code, `تعديل حساب ${acc.code} - ${acc.name}`);
    } else {
      this.state.accounts.push(acc);
      this.logAction(actor, 'add', 'شجرة الحسابات', acc.code, `إضافة حساب جديد ${acc.code} - ${acc.name}`);
    }
    this.saveToStorage();
  }

  public deleteAccount(id: string, actor: string): { success: boolean; message?: string } {
    const acc = this.state.accounts.find((a) => a.id === id);
    if (!acc) return { success: false, message: 'الحساب غير موجود' };
    
    // Check if account has children
    const hasChildren = this.state.accounts.some((a) => a.parentCode === acc.code);
    if (hasChildren) {
      return { success: false, message: 'لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية تحته!' };
    }

    if (acc.balance !== 0) {
      return { success: false, message: 'لا يمكن حذف حساب يحتوي على رصيد مالي غير مساوي للصفر!' };
    }

    this.state.accounts = this.state.accounts.filter((a) => a.id !== id);
    this.logAction(actor, 'delete', 'شجرة الحسابات', acc.code, `حذف حساب ${acc.code} - ${acc.name}`);
    this.saveToStorage();
    return { success: true };
  }

  // --- Banks & Cash Funds with Real-Time GL Sync ---
  public getBanksCash(): BankCashFund[] {
    const accounts = this.getAccounts();
    return this.state.banksCash.map((fund) => {
      const matchingAcc = accounts.find((a) => a.code === fund.accountCode || a.code === fund.code);
      if (matchingAcc) {
        return {
          ...fund,
          currentBalance: matchingAcc.balance,
        };
      }
      return fund;
    });
  }

  public saveBankCash(fund: BankCashFund, actor: string): void {
    const index = this.state.banksCash.findIndex((b) => b.id === fund.id);
    if (index >= 0) {
      this.state.banksCash[index] = fund;
      this.logAction(actor, 'edit', 'البنوك والصناديق', fund.code, `تعديل بيانات ${fund.name}`);
    } else {
      this.state.banksCash.push(fund);
      this.logAction(actor, 'add', 'البنوك والصناديق', fund.code, `إضافة صندوق/بنك جديد ${fund.name}`);
    }
    this.saveToStorage();
  }

  public deleteBankCash(id: string, actor: string): { success: boolean; message?: string } {
    const fund = this.state.banksCash.find((b) => b.id === id);
    if (!fund) return { success: false, message: 'الصندوق/البنك غير موجود' };
    this.state.banksCash = this.state.banksCash.filter((b) => b.id !== id);
    this.logAction(actor, 'delete', 'البنوك والصناديق', fund.code, `حذف ${fund.name}`);
    this.saveToStorage();
    return { success: true };
  }

  // --- Auto Sequential Document Numbering starting from 1 ---
  public getNextJournalEntryNumber(): string {
    return getNextDocSeq(this.state.journalEntries, 'entryNumber');
  }

  public getNextVoucherNumber(): string {
    return getNextDocSeq(this.state.vouchers, 'voucherNumber');
  }

  public getNextPurchaseInvoiceNumber(): string {
    return getNextDocSeq(this.state.purchaseInvoices, 'invoiceNumber');
  }

  public getNextSalesInvoiceNumber(): string {
    return getNextDocSeq(this.state.salesInvoices, 'invoiceNumber');
  }

  public getNextPurchaseOrderNumber(): string {
    return getNextDocSeq(this.state.purchaseOrders, 'orderNumber');
  }

  public getNextPurchaseReturnNumber(): string {
    return getNextDocSeq(this.state.purchaseReturns, 'returnNumber');
  }

  public getNextSalesReturnNumber(): string {
    return getNextDocSeq(this.state.salesReturns, 'returnNumber');
  }

  public getNextQuotationNumber(): string {
    return getNextDocSeq(this.state.quotations, 'quotationNumber');
  }

  public getNextStockMovementNumber(): string {
    return getNextDocSeq(this.state.stockMovements, 'docNumber');
  }

  // --- Journal Entries ---
  public getJournalEntries(): JournalEntry[] {
    return this.state.journalEntries;
  }
  public getAccountingIntegrityReport() {
    return AccountingIntegrityService.validateJournalEntries(this.state.journalEntries);
  }

  public getCustomerLedgerBalance(customerId: string): number {
    return AccountingIntegrityService.customerBalance(this.state.journalEntries, customerId);
  }

  public getSupplierLedgerBalance(supplierId: string): number {
    return AccountingIntegrityService.supplierBalance(this.state.journalEntries, supplierId);
  }


  public saveJournalEntry(entry: JournalEntry, actor: string): { success: boolean; message?: string } {
    const closureCheck = PeriodClosureService.isDateInClosedPeriod(entry.date);
    if (closureCheck.isClosed) {
      return { success: false, message: `عذراً، لا يمكن حفظ أو تعديل القيد. ${closureCheck.reason}` };
    }
    const year=this.state.financialYears.find(y=>y.year===entry.financialYear);
    if(year?.status==='closed') return {success:false,message:`السنة المالية ${entry.financialYear} مقفلة.`};
    if(!entry.lines || entry.lines.length<2) return {success:false,message:'القيد يجب أن يحتوي على سطرين على الأقل.'};
    for(const line of entry.lines){
      const account=this.state.accounts.find(a=>a.code===line.accountCode);
      if(!account || !account.isSub || account.status==='inactive') return {success:false,message:`الحساب ${line.accountCode} غير موجود أو غير قابل للترحيل.`};
      const d=Number(line.debit)||0,c=Number(line.credit)||0;
      if(d<0||c<0|| (d>0&&c>0) || (d===0&&c===0)) return {success:false,message:`السطر ${line.id} في القيد غير صالح: يجب أن يحتوي على مدين أو دائن موجب واحد فقط.`};
    }
    if(entry.status==='posted'){
      const duplicate=this.state.journalEntries.find(j=>j.status==='posted'&&j.reference===entry.reference&&j.id!==entry.id);
      if(duplicate) return {success:false,message:`مرجع الترحيل ${entry.reference} مستخدم مسبقاً في القيد ${duplicate.entryNumber}.`};
    }
    const debitSum = entry.lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
    const creditSum = entry.lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
    if (Math.abs(debitSum - creditSum) > 0.01) {
      return { success: false, message: `قيد اليومية غير متوازن محاسبياً! إجمالي المدين (${debitSum.toLocaleString('ar-SA')}) لا يساوي إجمالي الدائن (${creditSum.toLocaleString('ar-SA')}).` };
    }
    if(debitSum<=0) return {success:false,message:'لا يمكن ترحيل قيد صفري.'};
    entry.debitTotal = debitSum;
    entry.creditTotal = creditSum;
    const index = this.state.journalEntries.findIndex((e) => e.id === entry.id);
    if (index >= 0) {
      if (this.state.journalEntries[index].status === 'posted') {
        return { success: false, message: 'لا يمكن تعديل قيد يومية مرحّل للأستاذ العام. يرجى استخدام القيد العكسي.' };
      }
      this.state.journalEntries[index] = entry;
      this.logAction(actor, 'edit', 'قيود اليومية', entry.entryNumber, `تعديل قيد يومية رقم ${entry.entryNumber}`);
    } else {
      this.state.journalEntries.unshift(entry);
      this.logAction(actor, 'add', 'قيود اليومية', entry.entryNumber, `إضافة قيد يومية جديد رقم ${entry.entryNumber} بمبلغ ${entry.debitTotal}`);
    }
    this.saveToStorage();
    return { success: true };
  }

  public reverseJournalEntry(entryId: string, reason: string, actor: string): { success: boolean; message?: string } {
    const original = this.state.journalEntries.find((j) => j.id === entryId);
    if (!original) return { success: false, message: 'القيد المحاسبي غير موجود.' };

    const reversalEntry: JournalEntry = {
      id: `je-rev-${Date.now()}`,
      entryNumber: this.getNextJournalEntryNumber(),
      date: new Date().toISOString().slice(0, 10),
      reference: `REV-${original.entryNumber}`,
      description: `قيد عكسي لإلغاء القيد رقم ${original.entryNumber} - السبب: ${reason}`,
      debitTotal: original.creditTotal,
      creditTotal: original.debitTotal,
      financialYear: 2026,
      createdBy: actor,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'posted',
      lines: original.lines.map((l, idx) => ({
        id: `rev-l-${idx}`,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.credit,
        credit: l.debit,
        note: `عكس السطر: ${l.note || ''}`,
      })),
    };

    this.saveJournalEntry(reversalEntry, actor);
    original.isReversed = true;
    original.status = 'reversed';
    original.reversalEntryNumber = reversalEntry.entryNumber;
    original.reversedBy = actor;
    original.reversedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    original.reverseReason = reason;

    this.logAction(actor, 'edit', 'قيود اليومية', original.entryNumber, `عكس وإلغاء القيد رقم ${original.entryNumber} بقيد عكسي جديد رقم ${reversalEntry.entryNumber} - السبب: ${reason}`);
    this.saveToStorage();
    return { success: true, message: `تم إنشاء القيد العكسي رقم ${reversalEntry.entryNumber} بنجاح وإلغاء الأثر المالي للقيد السابق.` };
  }

  // --- Centralized advanced accounting operations ---
  public postAccountTransfer(params:{date:string;amount:number;fromAccountCode:string;toAccountCode:string;reference:string;financialYear:number;description?:string},actor:string): {success:boolean;message?:string;entryNumber?:string}{
    try{
      const entry=AccountingPostingEngine.transfer({...params,actor},this.state.accounts);
      entry.entryNumber=this.getNextJournalEntryNumber();
      const saved=this.saveJournalEntry(entry,actor);
      if(!saved.success)return{success:false,message:saved.message};
      this.logAction(actor,'add','تحويلات الحسابات',params.reference,`ترحيل تحويل داخلي بالقيد ${entry.entryNumber}`);
      return{success:true,entryNumber:entry.entryNumber};
    }catch(e){return{success:false,message:e instanceof Error?e.message:'تعذر ترحيل التحويل.'};}
  }

  public postLoan(params:{date:string;amount:number;loanAccountCode?:string;cashAccountCode:string;reference:string;financialYear:number;repayment?:boolean},actor:string): {success:boolean;message?:string;entryNumber?:string}{
    try{
      const entry=AccountingPostingEngine.loan({...params,loanAccountCode:params.loanAccountCode||'215',actor},this.state.accounts);
      entry.entryNumber=this.getNextJournalEntryNumber();
      const saved=this.saveJournalEntry(entry,actor);
      if(!saved.success)return{success:false,message:saved.message};
      this.logAction(actor,'add',params.repayment?'سداد قرض':'قرض',params.reference,`ترحيل عملية قرض بالقيد ${entry.entryNumber}`);
      return{success:true,entryNumber:entry.entryNumber};
    }catch(e){return{success:false,message:e instanceof Error?e.message:'تعذر ترحيل القرض.'};}
  }

  public postFixedAssetPurchase(params:{date:string;amount:number;assetAccountCode:string;paymentAccountCode:string;reference:string;financialYear:number},actor:string): {success:boolean;message?:string;entryNumber?:string}{
    try{
      const entry=AccountingPostingEngine.fixedAssetPurchase({...params,actor},this.state.accounts);
      entry.entryNumber=this.getNextJournalEntryNumber();
      const saved=this.saveJournalEntry(entry,actor);
      if(!saved.success)return{success:false,message:saved.message};
      this.logAction(actor,'add','الأصول الثابتة',params.reference,`شراء أصل ثابت بالقيد ${entry.entryNumber}`);
      return{success:true,entryNumber:entry.entryNumber};
    }catch(e){return{success:false,message:e instanceof Error?e.message:'تعذر ترحيل شراء الأصل.'};}
  }

  public postDepreciation(params:{date:string;amount:number;assetAccountCode:string;reference:string;financialYear:number},actor:string): {success:boolean;message?:string;entryNumber?:string}{
    try{
      const entry=AccountingPostingEngine.depreciation({...params,actor},this.state.accounts);
      entry.entryNumber=this.getNextJournalEntryNumber();
      const saved=this.saveJournalEntry(entry,actor);
      if(!saved.success)return{success:false,message:saved.message};
      this.logAction(actor,'add','الإهلاك',params.reference,`ترحيل إهلاك أصل بالقيد ${entry.entryNumber}`);
      return{success:true,entryNumber:entry.entryNumber};
    }catch(e){return{success:false,message:e instanceof Error?e.message:'تعذر ترحيل الإهلاك.'};}
  }

  public getTrialBalance(year: number = 2026): {
    rows: Array<{
      accountCode: string;
      accountName: string;
      category: string;
      nature: string;
      debit: number;
      credit: number;
    }>;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
  } {
    const accounts = this.getAccounts().filter((a) => a.isSub);
    const rows = accounts.map((a) => {
      const isDebit = a.nature === 'debit';
      const bal = a.balance || 0;
      return {
        accountCode: a.code,
        accountName: a.name,
        category: a.category,
        nature: a.nature,
        debit: isDebit ? Math.max(0, bal) : 0,
        credit: !isDebit ? Math.max(0, bal) : 0,
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    const difference = Math.abs(totalDebit - totalCredit);

    return {
      rows,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      isBalanced: difference < 0.05,
    };
  }

  public getIncomeStatement(year: number = 2026): {
    revenues: Array<{ code: string; name: string; amount: number }>;
    totalRevenue: number;
    cogs: number;
    grossProfit: number;
    expenses: Array<{ code: string; name: string; amount: number }>;
    totalExpenses: number;
    netIncome: number;
  } {
    const accounts=this.getAccounts().filter(a=>a.isSub);
    const revenues=accounts.filter(a=>a.category==='revenue').map(a=>({
      code:a.code,name:a.name,amount:(a.nature==='credit' ? (a.balance||0) : -(a.balance||0))
    }));
    const totalRevenue=revenues.reduce((s,r)=>s+r.amount,0);
    const cogsAcc=accounts.find(a=>a.code==='51');
    const cogs=cogsAcc ? Math.max(0,cogsAcc.balance||0) : 0;
    const expenses=accounts.filter(a=>a.category==='expense'&&a.code!=='51').map(a=>({
      code:a.code,name:a.name,amount:(a.nature==='debit' ? (a.balance||0) : -(a.balance||0))
    }));
    const totalExpenses=expenses.reduce((s,e)=>s+e.amount,0);
    const grossProfit=totalRevenue-cogs;
    const netIncome=grossProfit-totalExpenses;
    return {revenues,totalRevenue:Math.round(totalRevenue*100)/100,cogs:Math.round(cogs*100)/100,grossProfit:Math.round(grossProfit*100)/100,expenses,totalExpenses:Math.round(totalExpenses*100)/100,netIncome:Math.round(netIncome*100)/100};
  }

  public getBalanceSheet(year: number = 2026): {
    assets: Array<{ code: string; name: string; amount: number }>;
    totalAssets: number;
    liabilities: Array<{ code: string; name: string; amount: number }>;
    totalLiabilities: number;
    equity: Array<{ code: string; name: string; amount: number }>;
    totalEquity: number;
    netIncome: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
    difference: number;
  } {
    const accounts = this.getAccounts().filter((a) => a.isSub);
    const assets = accounts
      .filter((a) => a.category === 'asset')
      .map((a) => ({ code: a.code, name: a.name, amount: a.balance || 0 }));
    const totalAssets = assets.reduce((s, a) => s + a.amount, 0);

    const liabilities = accounts
      .filter((a) => a.category === 'liability')
      .map((a) => ({ code: a.code, name: a.name, amount: a.balance || 0 }));
    const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);

    const equity = accounts
      .filter((a) => a.category === 'equity')
      .map((a) => ({ code: a.code, name: a.name, amount: a.balance || 0 }));
    const totalEquity = equity.reduce((s, e) => s + e.amount, 0);

    const pnl = this.getIncomeStatement(year);
    const netIncome = pnl.netIncome;

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netIncome;
    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);

    return {
      assets,
      totalAssets: Math.round(totalAssets * 100) / 100,
      liabilities,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      equity,
      totalEquity: Math.round(totalEquity * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      totalLiabilitiesAndEquity: Math.round(totalLiabilitiesAndEquity * 100) / 100,
      isBalanced: difference < 0.05,
      difference: Math.round(difference * 100) / 100,
    };
  }

  public deleteJournalEntry(id: string, actor: string): { success: boolean; message?: string } {
    const entry = this.state.journalEntries.find((e) => e.id === id);
    if (!entry) return { success: false, message: 'القيد غير موجود' };
    if (entry.status === 'posted') {
      return {
        success: false,
        message: 'لا يمكن حذف قيد يومية مرحّل محاسبياً مباشرة وفقاً لمعايير الرقابة (قاعدة 6). يرجى استخدام أمر "عكس القيد" (Reversal) لإنشاء قيد عكسي وتوثيق سبب الإلغاء في سجل الرقابة.',
      };
    }
    this.state.journalEntries = this.state.journalEntries.filter((e) => e.id !== id);
    this.logAction(actor, 'delete', 'قيود اليومية', entry.entryNumber, `حذف قيد اليومية رقم ${entry.entryNumber}`);
    this.saveToStorage();
    return { success: true };
  }

  // --- Cash Vouchers (Payment / Receipt) ---
  public getVouchers(): CashVoucher[] {
    return this.state.vouchers;
  }

  public saveVoucher(vch: CashVoucher, actor: string): { success: boolean; message?: string } {
    const closureCheck=PeriodClosureService.isDateInClosedPeriod(vch.date);
    if(closureCheck.isClosed) return {success:false,message:`عذراً، لا يمكن حفظ السند في فترة محاسبية مقفلة. ${closureCheck.reason}`};
    if(!vch.amount || vch.amount<=0) return {success:false,message:'يجب أن يكون مبلغ السند أكبر من صفر.'};

    const index=this.state.vouchers.findIndex(v=>v.id===vch.id);
    if(index>=0){
      if(this.state.vouchers[index].status==='posted') return {success:false,message:'لا يمكن تعديل سند مرحّل. استخدم الإلغاء والعكس.'};
      this.state.vouchers[index]=vch;
      this.logAction(actor,'edit',vch.type==='payment'?'سند صرف':'سند قبض',vch.voucherNumber,`تعديل السند ${vch.voucherNumber}`);
      this.saveToStorage();
      return {success:true};
    }

    try{
      const bank=this.state.banksCash.find(b=>b.id===vch.bankCashId);
      const cashAccountCode=bank?.accountCode;
      const je=AccountingPostingEngine.voucher(vch,this.state.accounts,actor,cashAccountCode);
      je.entryNumber=this.getNextJournalEntryNumber();
      vch.status='posted';
      vch.journalEntryNumber=je.entryNumber;

      const targetCustomer=this.state.customers.find(c=>c.id===vch.accountCode || c.code===vch.accountCode || c.name===vch.partyName);
      const targetSupplier=this.state.suppliers.find(s=>s.id===vch.accountCode || s.code===vch.accountCode || s.name===vch.partyName);
      if(vch.type==='receipt' && targetCustomer && vch.accountCode==='1121') {
        targetCustomer.currentBalance=Math.max(0,(targetCustomer.currentBalance||0)-vch.amount);
        je.lines.forEach(line=>{ if(line.credit>0 && line.accountCode===vch.accountCode) line.customerId=targetCustomer.id; });
      }
      if(vch.type==='payment' && targetSupplier && vch.accountCode==='211') {
        targetSupplier.currentBalance=Math.max(0,(targetSupplier.currentBalance||0)-vch.amount);
        je.lines.forEach(line=>{ if(line.debit>0 && line.accountCode===vch.accountCode) line.supplierId=targetSupplier.id; });
      }

      const saved=this.saveJournalEntry(je,actor);
      if(!saved.success) throw new Error(saved.message || 'تعذر ترحيل السند.');
      this.state.vouchers.unshift(vch);
      this.logAction(actor,'add',vch.type==='payment'?'سند صرف':'سند قبض',vch.voucherNumber,`ترحيل السند ${vch.voucherNumber} بالقيد ${je.entryNumber}`);
      this.saveToStorage();
      return {success:true};
    }catch(e){
      return {success:false,message:e instanceof Error?e.message:'تعذر ترحيل السند.'};
    }
  }


  public deleteVoucher(id: string, actor: string): { success: boolean; message?: string } {
    const vch = this.state.vouchers.find((v) => v.id === id);
    if (!vch) return { success: false, message: 'السند غير موجود' };
    if (vch.status === 'posted') {
      return {
        success: false,
        message: 'لا يمكن حذف سند قبض أو صرف مرحّل للأستاذ العام مباشرة (قاعدة 6). يرجى استخدام خيار "إلغاء وعكس السند" لإنشاء قيد عكسي واستعادة الأرصدة نظامياً.',
      };
    }
    const typeLabel = vch.type === 'payment' ? 'سند صرف' : 'سند قبض';
    this.state.vouchers = this.state.vouchers.filter((v) => v.id !== id);
    this.logAction(actor, 'delete', typeLabel, vch.voucherNumber, `حذف ${typeLabel} رقم ${vch.voucherNumber}`);
    this.saveToStorage();
    return { success: true };
  }

  public cancelCashVoucher(voucherId: string, reason: string, actor: string): { success: boolean; message: string; reversalEntryNumber?: string } {
    const vch = this.state.vouchers.find((v) => v.id === voucherId);
    if (!vch) return { success: false, message: 'السند غير موجود.' };
    if (vch.status === 'cancelled') return { success: false, message: 'هذا السند تم إلغاؤه وعكسه مسبقاً.' };

    const closureCheck = PeriodClosureService.isDateInClosedPeriod(new Date().toISOString().slice(0, 10));
    if (closureCheck.isClosed) {
      return { success: false, message: `لا يمكن إلغاء السند في فترة محاسبية مقفلة. ${closureCheck.reason}` };
    }

    const isPay = vch.type === 'payment';
    const typeLabel = isPay ? 'سند صرف' : 'سند قبض';

    // 1. Reverse customer / supplier balance
    if (vch.type === 'receipt') {
      const cust = this.state.customers.find((c) => c.name === vch.partyName || c.code === vch.accountCode);
      if (cust) {
        cust.currentBalance = (cust.currentBalance || 0) + vch.amount;
      }
    } else if (vch.type === 'payment') {
      const supp = this.state.suppliers.find((s) => s.name === vch.partyName || s.code === vch.accountCode);
      if (supp) {
        supp.currentBalance = (supp.currentBalance || 0) + vch.amount;
      }
    }

    // 2. Create Reversing Journal Entry
    const targetAcc = this.state.accounts.find((a) => a.code === vch.accountCode);
    const accName = targetAcc ? targetAcc.name : (isPay ? 'حسابات الموردين والدائنين' : 'حسابات العملاء التجاريين');
    const cashAcc = this.state.accounts.find((a) => a.code === '1111') || { code: '1111', name: 'الصندوق الرئيسي' };

    const revJe: JournalEntry = {
      id: `je-rev-vch-${Date.now()}`,
      entryNumber: this.getNextJournalEntryNumber(),
      date: new Date().toISOString().slice(0, 10),
      reference: `REV-VCH-${vch.voucherNumber}`,
      description: `قيد عكسي لإلغاء ${typeLabel} رقم ${vch.voucherNumber} لصالح/من ${vch.partyName} - السبب: ${reason}`,
      debitTotal: vch.amount,
      creditTotal: vch.amount,
      financialYear: vch.financialYear || 2026,
      createdBy: actor,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'posted',
      lines: isPay ? [
        {
          id: 'rev-l1',
          accountCode: cashAcc.code,
          accountName: cashAcc.name,
          debit: vch.amount,
          credit: 0,
          note: `عكس صرف نقدي لسند ${vch.voucherNumber}`,
        },
        {
          id: 'rev-l2',
          accountCode: vch.accountCode || '211',
          accountName: accName,
          debit: 0,
          credit: vch.amount,
          note: `عكس سداد لصالح ${vch.partyName}`,
        },
      ] : [
        {
          id: 'rev-l1',
          accountCode: vch.accountCode || '1121',
          accountName: accName,
          debit: vch.amount,
          credit: 0,
          note: `عكس قبض من ${vch.partyName}`,
        },
        {
          id: 'rev-l2',
          accountCode: cashAcc.code,
          accountName: cashAcc.name,
          debit: 0,
          credit: vch.amount,
          note: `عكس استلام بالصندوق لسند ${vch.voucherNumber}`,
        },
      ],
    };

    this.saveJournalEntry(revJe, actor);

    vch.status = 'cancelled';
    vch.cancelReason = reason;
    vch.cancelledBy = actor;
    vch.cancelledAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    vch.reversalEntryNumber = revJe.entryNumber;

    const origJe = this.state.journalEntries.find((j) => j.reference === `VCH-${vch.voucherNumber}`);
    if (origJe) {
      origJe.isReversed = true;
      origJe.status = 'reversed';
      origJe.reversalEntryNumber = revJe.entryNumber;
    }

    this.logAction(actor, 'edit', typeLabel, vch.voucherNumber, `عكس وإلغاء ${typeLabel} رقم ${vch.voucherNumber} بالقيد العكسي ${revJe.entryNumber} - السبب: ${reason}`);
    this.saveToStorage();
    return { success: true, message: `تم إلغاء ${typeLabel} وعكس الأثر المالي بالقيد رقم ${revJe.entryNumber} بنجاح.`, reversalEntryNumber: revJe.entryNumber };
  }

  // --- Inventory & Warehouses ---
  public getWarehouses(): Warehouse[] {
    if (!this.cache.warehouses) {
      this.cache.warehouses = this.state.warehouses;
    }
    return this.cache.warehouses;
  }

  public saveWarehouse(wh: Warehouse, actor: string): void {
    const index = this.state.warehouses.findIndex((w) => w.id === wh.id);
    if (index >= 0) {
      this.state.warehouses[index] = wh;
      this.logAction(actor, 'edit', 'إدارة المستودعات', wh.code, `تعديل مستودع ${wh.name}`);
    } else {
      this.state.warehouses.push(wh);
      this.logAction(actor, 'add', 'إدارة المستودعات', wh.code, `إضافة مستودع جديد ${wh.name}`);
    }
    this.saveToStorage();
  }

  public deleteWarehouse(id: string, actor: string): boolean {
    const wh = this.state.warehouses.find((w) => w.id === id);
    if (!wh) return false;
    this.state.warehouses = this.state.warehouses.filter((w) => w.id !== id);
    this.logAction(actor, 'delete', 'إدارة المستودعات', wh.code, `حذف مستودع ${wh.name}`);
    this.saveToStorage();
    return true;
  }

  public getItems(): InventoryItem[] {
    if (!this.cache.items) {
      this.cache.items = this.state.items;
    }
    return this.cache.items;
  }

  public saveItem(item: InventoryItem, actor: string): void {
    const index = this.state.items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      this.state.items[index] = item;
      this.logAction(actor, 'edit', 'بيانات الأصناف', item.code, `تعديل الصنف ${item.name}`);
    } else {
      this.state.items.push(item);
      this.logAction(actor, 'add', 'بيانات الأصناف', item.code, `إضافة صنف جديد ${item.name}`);
    }
    this.saveToStorage();
  }

  public deleteItem(id: string, actor: string): boolean {
    const item = this.state.items.find((i) => i.id === id);
    if (!item) return false;
    this.state.items = this.state.items.filter((i) => i.id !== id);
    this.logAction(actor, 'delete', 'بيانات الأصناف', item.code, `حذف الصنف ${item.name}`);
    this.saveToStorage();
    return true;
  }

  // --- Suppliers & Purchase Invoices ---
  public getSuppliers(): Supplier[] {
    return this.state.suppliers;
  }

  public saveSupplier(sup: Supplier, actor: string): void {
    const index = this.state.suppliers.findIndex((s) => s.id === sup.id);
    if (index >= 0) {
      this.state.suppliers[index] = sup;
      this.logAction(actor, 'edit', 'إدارة الموردين', sup.code, `تعديل بيانات المورد ${sup.name}`);
    } else {
      this.state.suppliers.push(sup);
      this.logAction(actor, 'add', 'إدارة الموردين', sup.code, `إضافة مورد جديد ${sup.name}`);
    }
    this.saveToStorage();
  }

  public deleteSupplier(id: string, actor: string): boolean {
    const sup = this.state.suppliers.find((s) => s.id === id);
    if (!sup) return false;
    this.state.suppliers = this.state.suppliers.filter((s) => s.id !== id);
    this.logAction(actor, 'delete', 'إدارة الموردين', sup.code, `حذف المورد ${sup.name}`);
    this.saveToStorage();
    return true;
  }

  public getPurchaseInvoices(): PurchaseInvoice[] {
    return this.state.purchaseInvoices;
  }

  public savePurchaseInvoice(inv: PurchaseInvoice, actor: string): { success: boolean; message?: string } {
    const closureCheck = PeriodClosureService.isDateInClosedPeriod(inv.date);
    if (closureCheck.isClosed) return { success: false, message: `عذراً، لا يمكن حفظ فاتورة المشتريات في فترة محاسبية مقفلة. ${closureCheck.reason}` };
    const transactionSnapshot = JSON.stringify(this.state);
    try {
      if (!Array.isArray(inv.items) || inv.items.length === 0) throw new Error('يجب أن تحتوي فاتورة المشتريات على صنف واحد على الأقل.');
      if ((inv.paymentStatus === 'credit' || inv.paymentStatus === 'partial') && !this.state.suppliers.some(s => s.id === inv.supplierId)) throw new Error('المورد المحدد للفواتير الآجلة غير موجود.');
      for (const item of inv.items) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error(`كمية الصنف ${item.itemCode} يجب أن تكون أكبر من صفر.`);
        if (!this.state.items.some(i => i.code === item.itemCode)) throw new Error(`الصنف ${item.itemCode} غير موجود في دليل الأصناف.`);
      }
      inv.taxTotal = 0;
      inv.items = (inv.items || []).map(i => ({ ...i, taxRate: 0, taxAmount: 0, total: Math.max(0, (Number(i.quantity)||0)*(Number(i.unitPrice)||0)-(Number(i.discount)||0)) }));
      const currency = inv.currency && this.state.currencies.find(c => c.id === inv.currency || c.symbol === inv.currency);
      if (!currency) throw new Error('العملة المحددة غير موجودة في دليل العملات.');
      const paymentType = inv.paymentType || (inv.paymentStatus === 'credit' ? 'credit' : 'cash');
      inv.paymentType = paymentType;
      if (paymentType === 'cash') {
        const fund = inv.cashFundId ? this.state.banksCash.find(b => b.id === inv.cashFundId) : undefined;
        if (!fund) throw new Error('يجب تحديد الصندوق للفاتورة النقدية.');
        inv.cashAccountCode = fund.accountCode;
        inv.paymentStatus = 'paid';
        inv.paidAmount = inv.grandTotal;
      } else {
        if (!inv.supplierId) throw new Error('حساب المورد إلزامي للفاتورة الآجلة.');
        inv.paymentStatus = 'credit';
        inv.paidAmount = 0;
      }
      validateTradeDocumentBase(inv, paymentType === 'credit' ? inv.supplierId : 'cash');
      const totals = calculateDocumentTotals(inv.items);
      inv.subtotal = totals.subtotal; inv.discountTotal = totals.discountTotal; inv.grandTotal = totals.grandTotal;
      if (inv.paymentType === 'cash') inv.paidAmount = inv.grandTotal;
      const beforePurchaseInvoices=[...this.state.purchaseInvoices];
      const beforeItems = this.state.items.map(i=>({...i}));
      const beforeLayers = (this.state.inventoryLayers||[]).map(l=>({...l}));
      const beforeSuppliers = this.state.suppliers.map(v=>({...v}));
      const beforeJournals = [...this.state.journalEntries];
      const beforeMovements = [...(this.state.stockMovements||[])];
      const index = this.state.purchaseInvoices.findIndex(p => p.id === inv.id);
      if (index >= 0) {
        if (this.state.purchaseInvoices[index].status === 'posted') {
          const reversed=this.cancelPurchaseInvoice(inv.id,'تعديل المستند وإعادة الترحيل',actor);
          if(!reversed.success) return {success:false,message:reversed.message};
        }
        const current=this.state.purchaseInvoices.find(p=>p.id===inv.id);
        if(current && current.status!=='cancelled'){
          this.state.purchaseInvoices[index] = inv;
          this.logAction(actor, 'edit', 'فواتير المشتريات', inv.invoiceNumber, `تعديل فاتورة مشتريات ${inv.invoiceNumber}`);
          this.saveToStorage();
          return { success:true };
        }
      }
      try {
        const posting = AccountingPostingEngine.purchaseInvoice(inv, this.state.accounts, actor);
        if (!this.state.inventoryLayers) this.state.inventoryLayers = [];
        for (const item of inv.items) {
          const target = this.state.items.find(i => i.code === item.itemCode);
          if (!target) throw new Error(`الصنف ${item.itemCode} غير موجود في دليل المخزون.`);
          const qty = Number(item.quantity)||0;
          const unitCost = Math.max(0, ((Number(item.unitPrice)||0)*qty-(Number(item.discount)||0))/Math.max(qty,1));
          target.currentStock += qty;
          this.state.inventoryLayers.push({ id:`layer-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, itemCode:item.itemCode, quantity:qty, remainingQty:qty, unitCost, date:inv.date, refNumber:inv.invoiceNumber });
          this.state.stockMovements.unshift({ id:`sm-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, docNumber:inv.invoiceNumber, date:inv.date, type:'in', sourceWarehouseId:item.warehouseId || target.warehouseId || 'MAIN', items:[{itemCode:item.itemCode,itemName:item.itemName,unit:target.unit,quantity:qty,unitCost,total:qty*unitCost}], notes:`فاتورة مشتريات ${inv.invoiceNumber}`, createdBy:actor });
        }
        this.state.purchaseInvoices=this.state.purchaseInvoices.filter(p=>p.id!==inv.id);
        this.state.purchaseInvoices.unshift(inv);
        const supp=this.state.suppliers.find(s=>s.id===inv.supplierId);
        if(supp && posting.supplierAmount>0) supp.currentBalance=(supp.currentBalance||0)+posting.supplierAmount;
        posting.entry.entryNumber=this.getNextJournalEntryNumber();
        inv.status='posted'; inv.journalEntryNumber=posting.entry.entryNumber;
        const saved=this.saveJournalEntry(posting.entry,actor);
        if(!saved.success) throw new Error(saved.message || 'تعذر ترحيل قيد المشتريات.');
        this.logAction(actor,'add','فواتير المشتريات',inv.invoiceNumber,`ترحيل فاتورة مشتريات ${inv.invoiceNumber} بالقيد ${posting.entry.entryNumber}`);
        this.saveToStorage();
        return {success:true};
      } catch(e) {
        this.state.purchaseInvoices=beforePurchaseInvoices; this.state.items=beforeItems; this.state.inventoryLayers=beforeLayers; this.state.suppliers=beforeSuppliers; this.state.journalEntries=beforeJournals; this.state.stockMovements=beforeMovements; this.saveToStorage();
        throw e;
      }
    } catch(e) {
      this.state = JSON.parse(transactionSnapshot) as DatabaseState;
      this.invalidateCache();
      this.saveToStorage();
      return {success:false,message:e instanceof Error?e.message:'تعذر حفظ فاتورة المشتريات.'};
    }
  }

  public deletePurchaseInvoice(id: string, actor: string): { success: boolean; message?: string } {
    const inv = this.state.purchaseInvoices.find((p) => p.id === id);
    if (!inv) return { success: false, message: 'فاتورة المشتريات غير موجودة' };
    if (inv.status === 'posted') {
      return {
        success: false,
        message: 'لا يمكن حذف فاتورة مشتريات مرحّلة محاسبياً مباشرة (قاعدة 6). يرجى استخدام أمر "إلغاء وعكس الفاتورة" لإنشاء قيد عكسي واسترجاع كميات المخزون وتعديل رصيد المورد نظامياً.',
      };
    }
    this.state.purchaseInvoices = this.state.purchaseInvoices.filter((p) => p.id !== id);
    this.logAction(actor, 'delete', 'فواتير المشتريات', inv.invoiceNumber, `حذف فاتورة مشتريات ${inv.invoiceNumber}`);
    this.saveToStorage();
    return { success: true };
  }

  public cancelPurchaseInvoice(invoiceId: string, reason: string, actor: string): { success: boolean; message: string; reversalEntryNumber?: string } {
    const inv=this.state.purchaseInvoices.find(p=>p.id===invoiceId);
    if(!inv) return {success:false,message:'فاتورة المشتريات غير موجودة.'};
    if(inv.status==='cancelled') return {success:false,message:'هذه الفاتورة ملغاة مسبقاً.'};
    const closure=PeriodClosureService.isDateInClosedPeriod(new Date().toISOString().slice(0,10));
    if(closure.isClosed) return {success:false,message:`لا يمكن إلغاء فاتورة في فترة محاسبية مقفلة. ${closure.reason}`};
    const original=this.state.journalEntries.find(j=>j.reference===`PINV-${inv.invoiceNumber}` || j.entryNumber===inv.journalEntryNumber);
    if(!original) return {success:false,message:'القيد الأصلي للفاتورة غير موجود؛ تم إيقاف الإلغاء لحماية الدفاتر.'};
    try{
      for(const item of inv.items||[]){
        const qty=Number(item.quantity)||0;
        const target=this.state.items.find(i=>i.code===item.itemCode);
        if(!target || target.currentStock<qty) return {success:false,message:`لا يمكن إلغاء الفاتورة: كمية الصنف ${item.itemCode} غير متاحة بالكامل.`};
        target.currentStock-=qty;
        let remaining=qty;
        const layers=this.state.inventoryLayers.filter(l=>l.itemCode===item.itemCode&&l.remainingQty>0&&l.refNumber===inv.invoiceNumber);
        for(const layer of layers){if(remaining<=0)break;const take=Math.min(remaining,layer.remainingQty);layer.remainingQty-=take;remaining-=take;}
        if(remaining>0) return {success:false,message:`لا يمكن إلغاء الفاتورة: طبقة المخزون للصنف ${item.itemCode} غير متاحة بالكامل.`};
      }
      const reversal:JournalEntry={id:`je-rev-pi-${Date.now()}`,entryNumber:this.getNextJournalEntryNumber(),date:new Date().toISOString().slice(0,10),reference:`REV-PINV-${inv.invoiceNumber}`,description:`عكس فاتورة مشتريات ${inv.invoiceNumber} - ${reason}`,debitTotal:original.creditTotal,creditTotal:original.debitTotal,financialYear:inv.financialYear||2026,createdBy:actor,createdAt:new Date().toISOString().replace('T',' ').slice(0,19),status:'posted',sourceType:'purchase_invoice_reversal',sourceId:inv.id,lines:original.lines.map((l,idx)=>({...l,id:`rev-pi-${idx}-${Date.now()}`,debit:l.credit,credit:l.debit,note:`عكس: ${l.note||''}`}))};
      const saved=this.saveJournalEntry(reversal,actor);
      if(!saved.success)return{success:false,message:saved.message||'تعذر إنشاء القيد العكسي.'};
      inv.status='cancelled';inv.cancelReason=reason;inv.cancelledBy=actor;inv.cancelledAt=new Date().toISOString().replace('T',' ').slice(0,19);inv.reversalEntryNumber=reversal.entryNumber;
      original.isReversed=true;original.status='reversed';original.reversalEntryNumber=reversal.entryNumber;
      const supp=this.state.suppliers.find(s=>s.id===inv.supplierId);
      if(supp)supp.currentBalance=Math.max(0,(supp.currentBalance||0)-Math.max(0,inv.grandTotal-(inv.paidAmount||0)));
      this.logAction(actor,'edit','فواتير المشتريات',inv.invoiceNumber,`عكس فاتورة مشتريات ${inv.invoiceNumber} بالقيد ${reversal.entryNumber}`);
      this.saveToStorage();
      return{success:true,message:`تم إلغاء فاتورة المشتريات وعكس أثرها بالقيد ${reversal.entryNumber}.`,reversalEntryNumber:reversal.entryNumber};
    }catch(e){return{success:false,message:e instanceof Error?e.message:'تعذر إلغاء فاتورة المشتريات.'};}
  }


  public getPurchaseOrders(): PurchaseOrder[] {
    return this.state.purchaseOrders || [];
  }

  public savePurchaseOrder(order: PurchaseOrder, actor: string): void {
    if (!this.state.purchaseOrders) this.state.purchaseOrders = [];
    const index=this.state.purchaseOrders.findIndex(p=>p.id===order.id);
    if(index>=0){ this.state.purchaseOrders[index]=order; this.logAction(actor,'edit','أوامر الشراء',order.orderNumber,`تعديل أمر الشراء ${order.orderNumber}`); }
    else { this.state.purchaseOrders.unshift(order); this.logAction(actor,'add','أوامر الشراء',order.orderNumber,`إنشاء أمر شراء جديد ${order.orderNumber} بمبلغ ${order.grandTotal}`); }
    this.saveToStorage();
  }

  public deletePurchaseOrder(id: string, actor: string): boolean {
    const order=(this.state.purchaseOrders||[]).find(p=>p.id===id);
    if(!order)return false;
    this.state.purchaseOrders=this.state.purchaseOrders.filter(p=>p.id!==id);
    this.logAction(actor,'delete','أوامر الشراء',order.orderNumber,`حذف أمر الشراء ${order.orderNumber}`);
    this.saveToStorage();
    return true;
  }

  public convertPOToInvoice(orderId: string, actor: string): PurchaseInvoice | null {
    const order=(this.state.purchaseOrders||[]).find(p=>p.id===orderId);
    if(!order)return null;
    const newInvoice:PurchaseInvoice={
      id:`pi-${Date.now()}`,invoiceNumber:`PINV-${Date.now().toString().slice(-4)}`,date:new Date().toISOString().slice(0,10),
      supplierId:order.supplierId,supplierName:order.supplierName,items:order.items,subtotal:order.subtotal,taxTotal:order.taxTotal,
      discountTotal:0,grandTotal:order.grandTotal,paymentStatus:'credit',notes:`تم التوليد آلياً من أمر الشراء رقم ${order.orderNumber}`,financialYear:2026,createdBy:actor
    };
    order.status='converted_to_invoice';
    const result=this.savePurchaseInvoice(newInvoice,actor);
    if(!result.success)return null;
    this.logAction(actor,'add','فواتير المشتريات',newInvoice.invoiceNumber,`تحويل أمر الشراء ${order.orderNumber} إلى فاتورة مشتريات رقم ${newInvoice.invoiceNumber}`);
    return newInvoice;
  }

  public getPurchaseReturns(): PurchaseReturn[] {
    return this.state.purchaseReturns || [];
  }

  public savePurchaseReturn(ret: PurchaseReturn, actor: string): { success: boolean; message?: string } {
    const closure=PeriodClosureService.isDateInClosedPeriod(ret.date);
    if(closure.isClosed)return{success:false,message:`عذراً، لا يمكن حفظ مردود المشتريات في فترة محاسبية مقفلة. ${closure.reason}`};
    try{
      if((this.state.purchaseReturns||[]).some(r=>r.id===ret.id || r.returnNumber===ret.returnNumber)) throw new Error('مردود المشتريات موجود مسبقاً.');
      if(!ret.invoiceNumber?.trim()) return {success:false,message:'لا يمكن إنشاء مردود مشتريات بدون رقم فاتورة شراء أصلية.'};
      const original=ret.invoiceNumber ? this.state.purchaseInvoices.find(p=>p.invoiceNumber===ret.invoiceNumber) : undefined;
      if(!original) throw new Error('فاتورة الشراء الأصلية غير موجودة.');
      if(original.status!=='posted') throw new Error('لا يمكن إنشاء مردود إلا من فاتورة مشتريات مرحّلة.');
      if(original.supplierId!==ret.supplierId) throw new Error('المورد في المردود لا يطابق المورد في الفاتورة الأصلية.');
      if(!original.currency) throw new Error('الفاتورة الأصلية لا تحتوي على عملة؛ لا يمكن إنشاء مردود جديد عليها.');
      if(ret.originalInvoiceId && ret.originalInvoiceId!==original.id) throw new Error('رابط الفاتورة الأصلية غير صحيح.');
      const previous=(this.state.purchaseReturns||[]).filter(r=>r.invoiceNumber===original.invoiceNumber && r.status!=='cancelled');
      validateReturnAgainstOriginal(original,previous,ret.items||[]);
      const currency=original.currency;
      ret.originalInvoiceId=original.id; ret.invoiceNumber=original.invoiceNumber; ret.currency=currency;
      ret.supplierId=original.supplierId; ret.supplierName=original.supplierName; ret.paymentType=original.paymentType; ret.paymentStatus=original.paymentStatus; ret.cashAccountCode=original.cashAccountCode; ret.cashFundId=original.cashFundId;
      ret.items=(ret.items||[]).map(item=>{const src=original.items.find(i=>i.itemCode===item.itemCode)!; return {...item,itemName:src.itemName,unitPrice:src.unitPrice,discount:src.discount,taxRate:0,taxAmount:0,total:Math.max(0,(Number(item.quantity)||0)*(Number(src.unitPrice)||0)-(Number(src.discount)||0)),warehouseId:item.warehouseId||src.warehouseId};});
      const totals=calculateDocumentTotals(ret.items); ret.subtotal=totals.subtotal; ret.discountTotal=totals.discountTotal; ret.taxTotal=0; ret.grandTotal=totals.grandTotal;
      const beforeItems=this.state.items.map(i=>({...i})), beforeLayers=(this.state.inventoryLayers||[]).map(l=>({...l})), beforeSuppliers=this.state.suppliers.map(v=>({...v})), beforeJournals=[...this.state.journalEntries], beforeReturns=[...(this.state.purchaseReturns||[])], beforeMovements=[...(this.state.stockMovements||[])];
      try{
        for(const item of ret.items){
          const qty=Number(item.quantity)||0, target=this.state.items.find(i=>i.code===item.itemCode);
          if(!target || target.currentStock<qty) throw new Error(`المخزون غير كافٍ لإرجاع الصنف ${item.itemCode} للمورد.`);
          const layers=this.state.inventoryLayers.filter(l=>l.itemCode===item.itemCode && l.remainingQty>0 && l.refNumber===original.invoiceNumber).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
          let remaining=qty;
          for(const layer of layers){if(remaining<=0)break; const take=Math.min(remaining,layer.remainingQty); layer.remainingQty-=take; remaining-=take;}
          if(remaining>0) throw new Error(`لا يمكن ربط كمية المرتجع بطبقات الفاتورة الأصلية للصنف ${item.itemCode}.`);
          target.currentStock-=qty;
          this.state.stockMovements.unshift({id:`sm-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,docNumber:ret.returnNumber,date:ret.date,type:'out',sourceWarehouseId:item.warehouseId||target.warehouseId||'MAIN',items:[{itemCode:item.itemCode,itemName:item.itemName,unit:target.unit,quantity:qty,unitCost:Number(item.unitPrice)||0,total:qty*(Number(item.unitPrice)||0)}],notes:`مردود مشتريات ${ret.returnNumber} من الفاتورة ${original.invoiceNumber}`,createdBy:actor});
        }
        const je=AccountingPostingEngine.purchaseReturn(ret,this.state.accounts,actor); je.entryNumber=this.getNextJournalEntryNumber();
        const saved=this.saveJournalEntry(je,actor); if(!saved.success) throw new Error(saved.message||'تعذر ترحيل مردود المشتريات.');
        if(original.paymentType==='credit'){const supp=this.state.suppliers.find(v=>v.id===original.supplierId); if(supp)supp.currentBalance=Math.max(0,(supp.currentBalance||0)-ret.grandTotal);}
        ret.status='posted'; ret.journalEntryNumber=je.entryNumber; this.state.purchaseReturns.unshift(ret);
        this.logAction(actor,'add','مردودات المشتريات',ret.returnNumber,`ترحيل مردود مشتريات ${ret.returnNumber} من الفاتورة ${original.invoiceNumber} بالقيد ${je.entryNumber}`);
        this.saveToStorage(); return{success:true};
      }catch(e){this.state.items=beforeItems;this.state.inventoryLayers=beforeLayers;this.state.suppliers=beforeSuppliers;this.state.journalEntries=beforeJournals;this.state.purchaseReturns=beforeReturns;this.state.stockMovements=beforeMovements;throw e;}
    }catch(e){return{success:false,message:e instanceof Error?e.message:'تعذر حفظ مردود المشتريات.'};}
  }

  public getCustomers(): Customer[] {
    return this.state.customers;
  }

  public saveCustomer(cust: Customer, actor: string): void {
    const index = this.state.customers.findIndex((c) => c.id === cust.id);
    if (index >= 0) {
      this.state.customers[index] = cust;
      this.logAction(actor, 'edit', 'إدارة العملاء', cust.code, `تعديل بيانات العميل ${cust.name}`);
    } else {
      this.state.customers.push(cust);
      this.logAction(actor, 'add', 'إدارة العملاء', cust.code, `إضافة عميل جديد ${cust.name}`);
    }
    this.saveToStorage();
  }

  public deleteCustomer(id: string, actor: string): boolean {
    const cust = this.state.customers.find((c) => c.id === id);
    if (!cust) return false;
    this.state.customers = this.state.customers.filter((c) => c.id !== id);
    this.logAction(actor, 'delete', 'إدارة العملاء', cust.code, `حذف العميل ${cust.name}`);
    this.saveToStorage();
    return true;
  }

  public getSalesInvoices(): SalesInvoice[] {
    return this.state.salesInvoices;
  }

  public saveSalesInvoice(inv: SalesInvoice, actor: string): { success: boolean; message?: string } {
    const closureCheck = PeriodClosureService.isDateInClosedPeriod(inv.date);
    if (closureCheck.isClosed) return { success: false, message: `عذراً، لا يمكن حفظ فاتورة المبيعات في فترة محاسبية مقفلة. ${closureCheck.reason}` };
    const transactionSnapshot = JSON.stringify(this.state);
    try {
      if (!Array.isArray(inv.items) || inv.items.length === 0) throw new Error('يجب أن تحتوي فاتورة المبيعات على صنف واحد على الأقل.');
      if ((inv.paymentStatus === 'credit' || inv.paymentStatus === 'partial') && !this.state.customers.some(c => c.id === inv.customerId)) throw new Error('العميل المحدد للفواتير الآجلة غير موجود.');
      for (const item of inv.items) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error(`كمية الصنف ${item.itemCode} يجب أن تكون أكبر من صفر.`);
        if (!this.state.items.some(i => i.code === item.itemCode)) throw new Error(`الصنف ${item.itemCode} غير موجود في دليل الأصناف.`);
      }
      inv.taxTotal=0;
      inv.items=(inv.items||[]).map(i=>({...i,taxRate:0,taxAmount:0,total:Math.max(0,(Number(i.quantity)||0)*(Number(i.unitPrice)||0)-(Number(i.discount)||0))}));
      const currency=inv.currency && this.state.currencies.find(c=>c.id===inv.currency || c.symbol===inv.currency);
      if(!currency) throw new Error('العملة المحددة غير موجودة في دليل العملات.');
      const paymentType=inv.paymentType || (inv.paymentStatus==='credit'?'credit':'cash');
      inv.paymentType=paymentType;
      if(paymentType==='cash'){
        const fund=inv.cashFundId ? this.state.banksCash.find(b=>b.id===inv.cashFundId):undefined;
        if(!fund) throw new Error('يجب تحديد الصندوق للفاتورة النقدية.');
        inv.cashAccountCode=fund.accountCode; inv.paymentStatus='paid'; inv.paidAmount=inv.grandTotal;
      }else{
        if(!inv.customerId) throw new Error('حساب العميل إلزامي للفاتورة الآجلة.');
        inv.paymentStatus='credit'; inv.paidAmount=0;
      }
      validateTradeDocumentBase(inv,paymentType==='credit'?inv.customerId:'cash');
      const totals=calculateDocumentTotals(inv.items); inv.subtotal=totals.subtotal; inv.discountTotal=totals.discountTotal; inv.grandTotal=totals.grandTotal;
      if(inv.paymentType==='cash') inv.paidAmount=inv.grandTotal;
      const beforeSalesInvoices=[...this.state.salesInvoices];
      const beforeItems=this.state.items.map(i=>({...i}));
      const beforeLayers=(this.state.inventoryLayers||[]).map(l=>({...l}));
      const beforeCustomers=this.state.customers.map(v=>({...v}));
      const beforeJournals=[...this.state.journalEntries];
      const beforeMovements=[...(this.state.stockMovements||[])];
      const index=this.state.salesInvoices.findIndex(s=>s.id===inv.id);
      if(index>=0){
        if(this.state.salesInvoices[index].status==='posted'){
          const reversed=this.cancelSalesInvoice(inv.id,'تعديل المستند وإعادة الترحيل',actor);
          if(!reversed.success) return {success:false,message:reversed.message};
        }
        const current=this.state.salesInvoices.find(s=>s.id===inv.id);
        if(current && current.status!=='cancelled'){
          this.state.salesInvoices[index]=inv; this.logAction(actor,'edit','فواتير المبيعات',inv.invoiceNumber,`تعديل فاتورة مبيعات ${inv.invoiceNumber}`); this.saveToStorage(); return {success:true};
        }
      }
      const cogsResult=InventoryCostingService.calculateFifoCogs(inv.items,this.state.inventoryLayers||[],this.state.items);
      inv.items=inv.items.map(i=>({...i,unitCost:(cogsResult.cogsByItem[i.itemCode]||0)/Math.max(Number(i.quantity)||1)}));
      try{
        const posting=AccountingPostingEngine.salesInvoice(inv,this.state.accounts,actor,cogsResult.totalCogs);
        for(const item of inv.items){
          const target=this.state.items.find(i=>i.code===item.itemCode);
          const qty=Number(item.quantity)||0;
          if(!target) throw new Error(`الصنف ${item.itemCode} غير موجود في دليل المخزون.`);
          if(target.currentStock<qty) throw new Error(`المخزون غير كافٍ للصنف ${item.itemCode}. المتاح ${target.currentStock} والمطلوب ${qty}.`);
          target.currentStock-=qty;
          this.state.stockMovements.unshift({id:`sm-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,docNumber:inv.invoiceNumber,date:inv.date,type:'out',sourceWarehouseId:item.warehouseId||target.warehouseId||'MAIN',items:[{itemCode:item.itemCode,itemName:item.itemName,unit:target.unit,quantity:qty,unitCost:(cogsResult.cogsByItem[item.itemCode]||0)/Math.max(qty,1),total:(cogsResult.cogsByItem[item.itemCode]||0)}],notes:`فاتورة مبيعات ${inv.invoiceNumber}`,createdBy:actor});
        }
        this.state.inventoryLayers=cogsResult.updatedLayers;
        this.state.salesInvoices=this.state.salesInvoices.filter(v=>v.id!==inv.id);
        this.state.salesInvoices.unshift(inv);
        const cust=this.state.customers.find(c=>c.id===inv.customerId);
        if(cust && posting.customerAmount>0) cust.currentBalance=(cust.currentBalance||0)+posting.customerAmount;
        posting.entry.entryNumber=this.getNextJournalEntryNumber(); inv.status='posted'; inv.journalEntryNumber=posting.entry.entryNumber;
        const saved=this.saveJournalEntry(posting.entry,actor); if(!saved.success) throw new Error(saved.message||'تعذر ترحيل قيد المبيعات.');
        this.logAction(actor,'add','فواتير المبيعات',inv.invoiceNumber,`ترحيل فاتورة مبيعات ${inv.invoiceNumber} بالقيد ${posting.entry.entryNumber} وتكلفة ${posting.cogsAmount}`);
        this.saveToStorage(); return {success:true};
      }catch(e){
        this.state.salesInvoices=beforeSalesInvoices; this.state.items=beforeItems; this.state.inventoryLayers=beforeLayers; this.state.customers=beforeCustomers; this.state.journalEntries=beforeJournals; this.state.stockMovements=beforeMovements; this.saveToStorage(); throw e;
      }
    }catch(e){
      this.state = JSON.parse(transactionSnapshot) as DatabaseState;
      this.invalidateCache();
      this.saveToStorage();
      return {success:false,message:e instanceof Error?e.message:'تعذر ترحيل فاتورة المبيعات.'}; }
  }

  public deleteSalesInvoice(id: string, actor: string): { success: boolean; message?: string } {
    const inv = this.state.salesInvoices.find((s) => s.id === id);
    if (!inv) return { success: false, message: 'فاتورة المبيعات غير موجودة' };
    if (inv.status === 'posted') {
      return {
        success: false,
        message: 'لا يمكن حذف فاتورة مبيعات مرحّلة محاسبياً مباشرة (قاعدة 6). يرجى استخدام أمر "إلغاء وعكس الفاتورة" لإنشاء قيد عكسي واسترجاع كميات المخزون وتعديل رصيد العميل نظامياً.',
      };
    }
    this.state.salesInvoices = this.state.salesInvoices.filter((s) => s.id !== id);
    this.logAction(actor, 'delete', 'فواتير المبيعات', inv.invoiceNumber, `حذف فاتورة مبيعات ${inv.invoiceNumber}`);
    this.saveToStorage();
    return { success: true };
  }

  public cancelSalesInvoice(invoiceId: string, reason: string, actor: string): { success: boolean; message: string; reversalEntryNumber?: string } {
    const inv=this.state.salesInvoices.find(s=>s.id===invoiceId);
    if(!inv)return{success:false,message:'فاتورة المبيعات غير موجودة.'};
    if(inv.status==='cancelled')return{success:false,message:'هذه الفاتورة ملغاة مسبقاً.'};
    const closure=PeriodClosureService.isDateInClosedPeriod(new Date().toISOString().slice(0,10));
    if(closure.isClosed)return{success:false,message:`لا يمكن إلغاء فاتورة في فترة محاسبية مقفلة. ${closure.reason}`};
    const original=this.state.journalEntries.find(j=>j.reference===`SINV-${inv.invoiceNumber}`||j.entryNumber===inv.journalEntryNumber);
    if(!original)return{success:false,message:'القيد الأصلي للفاتورة غير موجود؛ تم إيقاف الإلغاء لحماية الدفاتر.'};
    try{
      const cogsAmount=original.lines.filter(l=>l.accountCode==='51').reduce((s,l)=>s+l.debit,0);
      const totalQty=inv.items.reduce((s,i)=>s+(Number(i.quantity)||0),0);
      const unitCost=cogsAmount/Math.max(totalQty,1);
      for(const item of inv.items||[]){
        const qty=Number(item.quantity)||0;
        const target=this.state.items.find(i=>i.code===item.itemCode);
        if(target)target.currentStock+=qty;
        this.state.inventoryLayers.push({id:`cancel-layer-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,itemCode:item.itemCode,quantity:qty,remainingQty:qty,unitCost,date:new Date().toISOString().slice(0,10),refNumber:`REV-${inv.invoiceNumber}`});
        this.state.stockMovements.unshift({id:`sm-rev-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,docNumber:`REV-${inv.invoiceNumber}`,date:new Date().toISOString().slice(0,10),type:'in',sourceWarehouseId:item.warehouseId||target?.warehouseId||'MAIN',items:[{itemCode:item.itemCode,itemName:item.itemName,unit:target?.unit||'',quantity:qty,unitCost,total:qty*unitCost}],notes:`عكس حركة مخزون فاتورة المبيعات ${inv.invoiceNumber}`,createdBy:actor});
      }
      const reversal:JournalEntry={id:`je-rev-si-${Date.now()}`,entryNumber:this.getNextJournalEntryNumber(),date:new Date().toISOString().slice(0,10),reference:`REV-SINV-${inv.invoiceNumber}`,description:`عكس فاتورة مبيعات ${inv.invoiceNumber} - ${reason}`,debitTotal:original.creditTotal,creditTotal:original.debitTotal,financialYear:inv.financialYear||2026,createdBy:actor,createdAt:new Date().toISOString().replace('T',' ').slice(0,19),status:'posted',sourceType:'sales_invoice_reversal',sourceId:inv.id,lines:original.lines.map((l,idx)=>({...l,id:`rev-si-${idx}-${Date.now()}`,debit:l.credit,credit:l.debit,note:`عكس: ${l.note||''}`}))};
      const saved=this.saveJournalEntry(reversal,actor);
      if(!saved.success)return{success:false,message:saved.message||'تعذر إنشاء القيد العكسي.'};
      inv.status='cancelled';inv.cancelReason=reason;inv.cancelledBy=actor;inv.cancelledAt=new Date().toISOString().replace('T',' ').slice(0,19);inv.reversalEntryNumber=reversal.entryNumber;
      original.isReversed=true;original.status='reversed';original.reversalEntryNumber=reversal.entryNumber;
      const cust=this.state.customers.find(c=>c.id===inv.customerId);
      if(cust)cust.currentBalance=Math.max(0,(cust.currentBalance||0)-Math.max(0,inv.grandTotal-(inv.paidAmount||0)));
      this.logAction(actor,'edit','فواتير المبيعات',inv.invoiceNumber,`عكس فاتورة مبيعات ${inv.invoiceNumber} بالقيد ${reversal.entryNumber}`);
      this.saveToStorage();
      return{success:true,message:`تم إلغاء فاتورة المبيعات وعكس أثرها بالقيد ${reversal.entryNumber}.`,reversalEntryNumber:reversal.entryNumber};
    }catch(e){return{success:false,message:e instanceof Error?e.message:'تعذر إلغاء فاتورة المبيعات.'};}
  }


  public getQuotations(): Quotation[] {
    return this.state.quotations || [];
  }

  public saveQuotation(quot: Quotation, actor: string): void {
    if (!this.state.quotations) this.state.quotations = [];
    const index = this.state.quotations.findIndex((q) => q.id === quot.id);
    if (index >= 0) {
      this.state.quotations[index] = quot;
      this.logAction(actor, 'edit', 'عروض الأسعار', quot.quotationNumber, `تعديل عرض السعر ${quot.quotationNumber}`);
    } else {
      this.state.quotations.unshift(quot);
      this.logAction(actor, 'add', 'عروض الأسعار', quot.quotationNumber, `إنشاء عرض سعر جديد ${quot.quotationNumber} للعميل ${quot.customerName}`);
    }
    this.saveToStorage();
  }

  public deleteQuotation(id: string, actor: string): boolean {
    const quot = (this.state.quotations || []).find((q) => q.id === id);
    if (!quot) return false;
    this.state.quotations = this.state.quotations.filter((q) => q.id !== id);
    this.logAction(actor, 'delete', 'عروض الأسعار', quot.quotationNumber, `حذف عرض السعر ${quot.quotationNumber}`);
    this.saveToStorage();
    return true;
  }

  public convertQuotationToInvoice(quotationId: string, actor: string): SalesInvoice | null {
    const quot = (this.state.quotations || []).find((q) => q.id === quotationId);
    if (!quot) return null;

    const newInvoice: SalesInvoice = {
      id: `si-${Date.now()}`,
      invoiceNumber: `SINV-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      customerId: quot.customerId,
      customerName: quot.customerName,
      items: quot.items,
      subtotal: quot.subtotal,
      taxTotal: quot.taxTotal,
      discountTotal: quot.discountTotal,
      grandTotal: quot.grandTotal,
      paymentStatus: 'paid',
      notes: `تم التوليد والاعتماد آلياً من عرض السعر رقم ${quot.quotationNumber}`,
      financialYear: 2026,
      createdBy: actor,
    };

    quot.status = 'converted_to_invoice';
    this.saveSalesInvoice(newInvoice, actor);
    this.logAction(actor, 'add', 'فواتير المبيعات', newInvoice.invoiceNumber, `تحويل عرض السعر ${quot.quotationNumber} إلى فاتورة مبيعات ضريبية رقم ${newInvoice.invoiceNumber}`);
    return newInvoice;
  }

  // --- Sales Returns ---
  public getSalesReturns(): SalesReturn[] {
    return this.state.salesReturns || [];
  }

  public saveSalesReturn(ret: SalesReturn, actor: string): { success: boolean; message?: string } {
    const closure=PeriodClosureService.isDateInClosedPeriod(ret.date);
    if(closure.isClosed)return{success:false,message:`عذراً، لا يمكن حفظ مردود المبيعات في فترة محاسبية مقفلة. ${closure.reason}`};
    try{
      if((this.state.salesReturns||[]).some(r=>r.id===ret.id || r.returnNumber===ret.returnNumber)) throw new Error('مردود المبيعات موجود مسبقاً.');
      if(!ret.invoiceNumber?.trim()) return {success:false,message:'لا يمكن إنشاء مردود مبيعات بدون رقم فاتورة مبيعات أصلية.'};
      const original=ret.invoiceNumber ? this.state.salesInvoices.find(v=>v.invoiceNumber===ret.invoiceNumber) : undefined;
      if(!original) throw new Error('فاتورة المبيعات الأصلية غير موجودة.');
      if(original.status!=='posted') throw new Error('لا يمكن إنشاء مردود إلا من فاتورة مبيعات مرحّلة.');
      if(original.customerId!==ret.customerId) throw new Error('العميل في المردود لا يطابق العميل في الفاتورة الأصلية.');
      if(!original.currency) throw new Error('الفاتورة الأصلية لا تحتوي على عملة؛ لا يمكن إنشاء مردود جديد عليها.');
      if(ret.originalInvoiceId && ret.originalInvoiceId!==original.id) throw new Error('رابط الفاتورة الأصلية غير صحيح.');
      const previous=(this.state.salesReturns||[]).filter(r=>r.invoiceNumber===original.invoiceNumber && r.status!=='cancelled');
      validateReturnAgainstOriginal(original,previous,ret.items||[]);
      ret.originalInvoiceId=original.id; ret.invoiceNumber=original.invoiceNumber; ret.currency=original.currency;
      ret.customerId=original.customerId; ret.customerName=original.customerName; ret.paymentType=original.paymentType; ret.paymentStatus=original.paymentStatus; ret.cashAccountCode=original.cashAccountCode; ret.cashFundId=original.cashFundId;
      ret.items=(ret.items||[]).map(item=>{const src=original.items.find(i=>i.itemCode===item.itemCode)!; return {...item,itemName:src.itemName,unitPrice:src.unitPrice,discount:src.discount,taxRate:0,taxAmount:0,total:Math.max(0,(Number(item.quantity)||0)*(Number(src.unitPrice)||0)-(Number(src.discount)||0)),warehouseId:item.warehouseId||src.warehouseId,unitCost:src.unitCost};});
      const totals=calculateDocumentTotals(ret.items); ret.subtotal=totals.subtotal; ret.discountTotal=totals.discountTotal; ret.taxTotal=0; ret.grandTotal=totals.grandTotal;
      const beforeItems=this.state.items.map(i=>({...i})), beforeLayers=(this.state.inventoryLayers||[]).map(l=>({...l})), beforeCustomers=this.state.customers.map(v=>({...v})), beforeJournals=[...this.state.journalEntries], beforeReturns=[...(this.state.salesReturns||[])], beforeMovements=[...(this.state.stockMovements||[])];
      try{
        let cogsAmount=0;
        for(const item of ret.items){
          const qty=Number(item.quantity)||0, target=this.state.items.find(i=>i.code===item.itemCode);
          if(!target) throw new Error(`الصنف ${item.itemCode} غير موجود في دليل المخزون.`);
          const unitCost=Number(item.unitCost)||0; cogsAmount+=unitCost*qty;
          target.currentStock+=qty;
          this.state.inventoryLayers.push({id:`return-layer-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,itemCode:item.itemCode,quantity:qty,remainingQty:qty,unitCost,date:ret.date,refNumber:ret.returnNumber});
          this.state.stockMovements.unshift({id:`sm-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,docNumber:ret.returnNumber,date:ret.date,type:'in',sourceWarehouseId:item.warehouseId||target.warehouseId||'MAIN',items:[{itemCode:item.itemCode,itemName:item.itemName,unit:target.unit,quantity:qty,unitCost,total:qty*unitCost}],notes:`مردود مبيعات ${ret.returnNumber} من الفاتورة ${original.invoiceNumber}`,createdBy:actor});
        }
        const je=AccountingPostingEngine.salesReturn(ret,this.state.accounts,actor,Math.round(cogsAmount*100)/100); je.entryNumber=this.getNextJournalEntryNumber();
        const saved=this.saveJournalEntry(je,actor); if(!saved.success) throw new Error(saved.message||'تعذر ترحيل مردود المبيعات.');
        if(original.paymentType==='credit'){const cust=this.state.customers.find(v=>v.id===original.customerId); if(cust)cust.currentBalance=Math.max(0,(cust.currentBalance||0)-ret.grandTotal);}
        ret.status='posted'; ret.journalEntryNumber=je.entryNumber; this.state.salesReturns.unshift(ret);
        this.logAction(actor,'add','مردودات المبيعات',ret.returnNumber,`ترحيل مردود مبيعات ${ret.returnNumber} من الفاتورة ${original.invoiceNumber} بالقيد ${je.entryNumber}`);
        this.saveToStorage(); return{success:true};
      }catch(e){this.state.items=beforeItems;this.state.inventoryLayers=beforeLayers;this.state.customers=beforeCustomers;this.state.journalEntries=beforeJournals;this.state.salesReturns=beforeReturns;this.state.stockMovements=beforeMovements;throw e;}
    }catch(e){return{success:false,message:e instanceof Error?e.message:'تعذر حفظ مردود المبيعات.'};}
  }

  public findDocumentByRef(ref: string): {
    found: boolean;
    type: 'sales_invoice' | 'purchase_invoice' | 'voucher' | 'journal' | 'quotation' | 'sales_return' | 'purchase_return' | 'stock_movement' | 'unknown';
    doc: any;
    linkedJournal?: JournalEntry;
  } {
    if (!ref) return { found: false, type: 'unknown', doc: null };
    const clean = ref.trim().toUpperCase();

    // 1. Sales Invoice (e.g. SINV-1, SI-..., or invoiceNumber = 1)
    const salesInv = this.state.salesInvoices.find(
      (s) =>
        s.invoiceNumber.toUpperCase() === clean ||
        clean.includes(`SINV-${s.invoiceNumber.toUpperCase()}`) ||
        clean === `SINV-${s.invoiceNumber.toUpperCase()}` ||
        s.id.toUpperCase() === clean
    );
    if (salesInv) {
      const linked = this.state.journalEntries.find(
        (j) => j.reference === `SINV-${salesInv.invoiceNumber}` || j.entryNumber === salesInv.journalEntryNumber
      );
      return { found: true, type: 'sales_invoice', doc: salesInv, linkedJournal: linked };
    }

    // 2. Purchase Invoice (e.g. PINV-1, PI-...)
    const purchInv = this.state.purchaseInvoices.find(
      (p) =>
        p.invoiceNumber.toUpperCase() === clean ||
        clean.includes(`PINV-${p.invoiceNumber.toUpperCase()}`) ||
        clean === `PINV-${p.invoiceNumber.toUpperCase()}` ||
        p.id.toUpperCase() === clean
    );
    if (purchInv) {
      const linked = this.state.journalEntries.find(
        (j) => j.reference === `PINV-${purchInv.invoiceNumber}` || j.entryNumber === purchInv.journalEntryNumber
      );
      return { found: true, type: 'purchase_invoice', doc: purchInv, linkedJournal: linked };
    }

    // 3. Voucher (e.g. VCH-1, VCH-...)
    const voucher = this.state.vouchers.find(
      (v) =>
        v.voucherNumber.toUpperCase() === clean ||
        clean.includes(`VCH-${v.voucherNumber.toUpperCase()}`) ||
        clean === `VCH-${v.voucherNumber.toUpperCase()}` ||
        v.id.toUpperCase() === clean
    );
    if (voucher) {
      const linked = this.state.journalEntries.find(
        (j) => j.reference === `VCH-${voucher.voucherNumber}` || j.entryNumber === voucher.journalEntryNumber
      );
      return { found: true, type: 'voucher', doc: voucher, linkedJournal: linked };
    }

    // 4. Sales Return (e.g. SRET-...)
    const sRet = (this.state.salesReturns || []).find(
      (r) => r.returnNumber.toUpperCase() === clean || clean === `SRET-${r.returnNumber.toUpperCase()}`
    );
    if (sRet) {
      const linked = this.state.journalEntries.find((j) => j.reference === `SRET-${sRet.returnNumber}`);
      return { found: true, type: 'sales_return', doc: sRet, linkedJournal: linked };
    }

    // 5. Purchase Return (e.g. PRET-...)
    const pRet = (this.state.purchaseReturns || []).find(
      (r) => r.returnNumber.toUpperCase() === clean || clean === `PRET-${r.returnNumber.toUpperCase()}`
    );
    if (pRet) {
      const linked = this.state.journalEntries.find((j) => j.reference === `PRET-${pRet.returnNumber}`);
      return { found: true, type: 'purchase_return', doc: pRet, linkedJournal: linked };
    }

    // 6. Journal Entry directly (e.g. JE-..., or entryNumber)
    const je = this.state.journalEntries.find(
      (j) => j.entryNumber.toUpperCase() === clean || j.id.toUpperCase() === clean || clean === `JE-${j.entryNumber}` || clean === `REV-${j.entryNumber}`
    );
    if (je) {
      return { found: true, type: 'journal', doc: je, linkedJournal: je };
    }

    return { found: false, type: 'unknown', doc: null };
  }

  public deleteSalesReturn(id: string, actor: string): boolean {
    const ret = (this.state.salesReturns || []).find((r) => r.id === id);
    if (!ret) return false;
    // A posted return has accounting and stock impact; never delete it silently.
    return false;
  }

  // --- Stock Movements History ---
  public getStockMovements(): StockMovement[] {
    return this.state.stockMovements || [];
  }

  public saveStockMovement(mov: StockMovement, actor: string): void {
    if (!this.state.stockMovements) this.state.stockMovements = [];
    this.state.stockMovements.unshift(mov);
    // Update inventory item stock levels
    if (mov.items && mov.items.length > 0) {
      mov.items.forEach((mItem) => {
        const it = this.state.items.find((i) => i.code === mItem.itemCode);
        if (it) {
          if (mov.type === 'in') {
            it.currentStock += Number(mItem.quantity) || 0;
          } else if (mov.type === 'out') {
            it.currentStock = Math.max(0, it.currentStock - (Number(mItem.quantity) || 0));
          }
        }
      });
    }
    this.logAction(actor, 'add', 'حركات المخزون', mov.docNumber, `حركة ${mov.type === 'in' ? 'إدخال' : mov.type === 'out' ? 'صرف' : 'تحويل'} بضاعة`);
    this.saveToStorage();
  }

  // --- User Permissions Update ---
  public saveUserPermissions(userId: string, perms: Record<string, UserPermission>, actor: string): void {
    const user = this.state.users.find((u) => u.id === userId);
    if (user) {
      user.permissions = perms;
      this.logAction(actor, 'edit', 'إدارة الصلاحيات', user.username, `تعديل وتخصيص مصفوفة الصلاحيات للمستخدم ${user.name}`);
      this.saveToStorage();
    }
  }

  // --- Export Full SQLite SQL Script ---
  public exportSQLScript(): string {
    const lines: string[] = [
      '-- H2pro ERP - SQLite Database Schema & Seed Data',
      '-- Generated on: ' + new Date().toISOString(),
      'BEGIN TRANSACTION;',
      '',
      'CREATE TABLE IF NOT EXISTS financial_years (id TEXT PRIMARY KEY, year INTEGER, status TEXT, start_date TEXT, end_date TEXT);',
      'CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, code TEXT, name TEXT, category TEXT, balance REAL, nature TEXT);',
      'CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, code TEXT, name TEXT, category TEXT, purchase_price REAL, sale_price REAL, stock INTEGER);',
      'CREATE TABLE IF NOT EXISTS sales_invoices (id TEXT PRIMARY KEY, invoice_no TEXT, customer_name TEXT, grand_total REAL, date TEXT);',
      'CREATE TABLE IF NOT EXISTS purchase_invoices (id TEXT PRIMARY KEY, invoice_no TEXT, supplier_name TEXT, grand_total REAL, date TEXT);',
      '',
    ];

    this.state.accounts.forEach((a) => {
      lines.push(`INSERT OR REPLACE INTO accounts VALUES ('${a.id}', '${a.code}', '${a.name.replace(/'/g, "''")}', '${a.category}', ${a.balance}, '${a.nature}');`);
    });

    this.state.items.forEach((i) => {
      lines.push(`INSERT OR REPLACE INTO items VALUES ('${i.id}', '${i.code}', '${i.name.replace(/'/g, "''")}', '${i.category}', ${i.purchasePrice}, ${i.salePrice}, ${i.currentStock});`);
    });

    lines.push('', 'COMMIT;', '');
    return lines.join('\n');
  }

  // --- Backup & Restore (SQLite/JSON export & import) ---
  public exportBackup(): string {
    return JSON.stringify(
      {
        format: 'H2PRO_LOCAL_JSON_EXPORT_V1',
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        data: this.state,
      },
      null,
      2
    );
  }

  public restoreBackup(jsonString: string, actor: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!['H2PRO_LOCAL_JSON_EXPORT_V1', 'H2PRO_SQLITE_EXPORT_V1'].includes(parsed.format) || parsed.version !== '1.0.0' || !parsed.data) {
        return { success: false, message: 'صيغة النسخة الاحتياطية أو إصدارها غير معتمد.' };
      }
      const requiredArrays = ['financialYears','users','regions','currencies','accounts','banksCash','warehouses','items','suppliers','customers','journalEntries','vouchers','purchaseInvoices','purchaseOrders','purchaseReturns','salesInvoices','quotations','salesReturns','stockMovements','auditLogs','inventoryLayers','closedMonths','closedYears','exchangeRateHistory'];
      for (const key of requiredArrays) {
        if (!Array.isArray(parsed.data[key])) return { success: false, message: 'ملف النسخة الاحتياطية غير مكتمل: ' + key };
      }
      if (!parsed.data.companyInfo || typeof parsed.data.companyInfo !== 'object') {
        return { success: false, message: 'بيانات الشركة داخل النسخة الاحتياطية غير صالحة.' };
      }
      const current = JSON.stringify({
        format: 'H2PRO_LOCAL_JSON_EXPORT_V1',
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        data: this.state,
      });
      localStorage.setItem(`${DB_KEY_PREFIX}pre_restore_${Date.now()}`, current);
      this.state = {
        ...parsed.data,
        accounts: ensureAccountingAccounts(parsed.data.accounts),
      };
      this.invalidateCache();
      this.saveToStorage();
      this.logAction(actor, 'restore', 'النسخ الاحتياطي', 'RESTORE_ALL', 'تمت استعادة نسخة احتياطية بعد التحقق من البنية والإصدار');
      return { success: true, message: 'تم استرجاع النسخة الاحتياطية بنجاح بعد التحقق من سلامة البنية.' };
    } catch (e: unknown) {
      return { success: false, message: 'فشلت الاستعادة: ' + (e instanceof Error ? e.message : 'ملف غير صالح') };
    }
  }

  // --- Period Closings (Monthly & Annual) ---
  public getClosedMonths(): string[] {
    return this.state.closedMonths || [];
  }

  public closeMonth(period: string, actor: string): void {
    const match = String(period).match(/^(\d{4})-(\d{1,2})$/);
    if (!match) throw new Error('صيغة الشهر المحاسبي غير صحيحة؛ استخدم YYYY-MM');
    const bridge = this.getSQLiteBridge();
    if (bridge?.sqliteClosePeriod) {
      const result = bridge.sqliteClosePeriod({ fiscalYear: Number(match[1]), month: Number(match[2]), closedBy: actor });
      if (!result?.ok) throw new Error(result?.error || 'تعذر إقفال الشهر في SQLite');
    }
    if (!this.state.closedMonths) this.state.closedMonths = [];
    if (!this.state.closedMonths.includes(period)) {
      this.state.closedMonths.push(period);
      this.logAction(actor, 'add', 'الإقفال الشهري', period, `تم إقفال الشهر المحاسبي ${period} بنجاح`);
      this.saveToStorage();
    }
  }

  public reopenMonth(period: string, actor: string): void {
    const match = String(period).match(/^(\d{4})-(\d{1,2})$/);
    if (!match) throw new Error('صيغة الشهر المحاسبي غير صحيحة؛ استخدم YYYY-MM');
    const bridge = this.getSQLiteBridge();
    if (bridge?.sqliteReopenPeriod) {
      const result = bridge.sqliteReopenPeriod({ fiscalYear: Number(match[1]), month: Number(match[2]) });
      if (!result?.ok) throw new Error(result?.error || 'تعذر فتح الشهر في SQLite');
    }
    if (this.state.closedMonths) {
      this.state.closedMonths = this.state.closedMonths.filter((p) => p !== period);
      this.logAction(actor, 'edit', 'الإقفال الشهري', period, `تم فتح الشهر المحاسبي ${period} مجدداً`);
      this.saveToStorage();
    }
  }

  public getClosedYears(): number[] {
    return this.state.closedYears || [];
  }

  public closeYear(year: number, actor: string): void {
    const bridge = this.getSQLiteBridge();
    if (bridge?.sqliteCloseYear) {
      const result = bridge.sqliteCloseYear({ fiscalYear: year, closedBy: actor });
      if (!result?.ok) throw new Error(result?.error || 'تعذر إقفال السنة في SQLite');
    }
    if (!this.state.closedYears) this.state.closedYears = [];
    if (!this.state.closedYears.includes(year)) {
      this.state.closedYears.push(year);
      const financialYear = (this.state.financialYears || []).find((y) => y.year === year);
      if (financialYear) financialYear.status = 'closed';
      this.logAction(actor, 'add', 'الإقفال السنوي', String(year), `تم إقفال السنة المالية ${year} وترحيل الحسابات الختامية بنجاح`);
      this.saveToStorage();
    }
  }

  public reopenYear(year: number, actor: string): void {
    const bridge = this.getSQLiteBridge();
    if (bridge?.sqliteReopenYear) {
      const result = bridge.sqliteReopenYear({ fiscalYear: year });
      if (!result?.ok) throw new Error(result?.error || 'تعذر فتح السنة في SQLite');
    }
    if (this.state.closedYears) {
      this.state.closedYears = this.state.closedYears.filter((y) => y !== year);
      const financialYear = (this.state.financialYears || []).find((y) => y.year === year);
      if (financialYear) financialYear.status = 'open';
      this.logAction(actor, 'edit', 'الإقفال السنوي', String(year), `تم فتح السنة المالية ${year} مجدداً`);
      this.saveToStorage();
    }
  }

  public resetToFactory(actor: string): void {
    localStorage.removeItem(`${DB_KEY_PREFIX}state`);
    this.state = this.loadFromStorage();
    this.logAction(actor, 'restore', 'إدارة النظام', 'FACTORY_RESET', 'إعادة تعيين قاعدة البيانات إلى الإعدادات الأولية للشركة المصنعة');
    this.notifyListeners();
  }
}

export const db = new H2proDatabase();
