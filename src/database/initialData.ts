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
  AuditLog,
} from '../types';

export const INITIAL_FINANCIAL_YEARS: FinancialYear[] = [
  {
    id: 'fy-2026',
    year: 2026,
    fromMonth: 1,
    toMonth: 12,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'open',
    notes: 'السنة المالية الحالية الجارية',
  },
  {
    id: 'fy-2025',
    year: 2025,
    fromMonth: 1,
    toMonth: 12,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'closed',
    notes: 'تم إقفال الحسابات واعتماد الميزانية',
  },
];

export const INITIAL_COMPANY_INFO: CompanyInfo = {
  name: '',
  phone: '',
  address: '',
  taxNumber: '',
  crNumber: '',
  defaultCurrency: 'YER',
  logoUrl: '',
  email: '',
  website: '',
};

export const INITIAL_USERS: User[] = [];

export const INITIAL_REGIONS: Region[] = [];

export const INITIAL_CURRENCIES: Currency[] = [
  { id: 'curr-1', name: 'ريال يمني', symbol: 'ر.ي', isLocal: true, rate: 1.0, exchangeRate: 1.0 },
  { id: 'curr-2', name: 'دولار أمريكي', symbol: '$', isLocal: false, rate: 560.0, exchangeRate: 560.0 },
  { id: 'curr-3', name: 'ريال سعودي', symbol: 'ر.س', isLocal: false, rate: 150.0, exchangeRate: 150.0 },
  { id: 'curr-4', name: 'يورو أوروبي', symbol: '€', isLocal: false, rate: 610.0, exchangeRate: 610.0 },
];

export const INITIAL_ACCOUNTS: Account[] = [
  // 1 الأصول
  { id: 'acc-1', code: '1', name: 'الأصول', category: 'asset', parentCode: null, currency: 'YER', nature: 'debit', status: 'active', level: 1, balance: 0, isSub: false },
  { id: 'acc-11', code: '11', name: 'الأصول المتداولة', category: 'asset', parentCode: '1', currency: 'YER', nature: 'debit', status: 'active', level: 2, balance: 0, isSub: false },
  { id: 'acc-111', code: '111', name: 'النقدية وما في حكمها', category: 'asset', parentCode: '11', currency: 'YER', nature: 'debit', status: 'active', level: 3, balance: 0, isSub: false },
  { id: 'acc-1111', code: '1111', name: 'الصندوق الرئيسي', category: 'asset', parentCode: '111', currency: 'YER', nature: 'debit', status: 'active', level: 4, balance: 0, isSub: true },
  { id: 'acc-1112', code: '1112', name: 'بنك اليمن والكويت - الحساب الجاري', category: 'asset', parentCode: '111', currency: 'YER', nature: 'debit', status: 'active', level: 4, balance: 0, isSub: true },
  { id: 'acc-1113', code: '1113', name: 'البنك التجاري اليمني', category: 'asset', parentCode: '111', currency: 'YER', nature: 'debit', status: 'active', level: 4, balance: 0, isSub: true },
  { id: 'acc-112', code: '112', name: 'المدينون والعملاء', category: 'asset', parentCode: '11', currency: 'YER', nature: 'debit', status: 'active', level: 3, balance: 0, isSub: false },
  { id: 'acc-1121', code: '1121', name: 'حسابات العملاء التجاريين', category: 'asset', parentCode: '112', currency: 'YER', nature: 'debit', status: 'active', level: 4, balance: 0, isSub: true },
  { id: 'acc-113', code: '113', name: 'المخزون السلعي', category: 'asset', parentCode: '11', currency: 'YER', nature: 'debit', status: 'active', level: 3, balance: 0, isSub: false },
  { id: 'acc-1131', code: '1131', name: 'مخزون بضاعة المستودع المركزي', category: 'asset', parentCode: '113', currency: 'YER', nature: 'debit', status: 'active', level: 4, balance: 0, isSub: true },
  { id: 'acc-12', code: '12', name: 'الأصول غير المتداولة (الثابتة)', category: 'asset', parentCode: '1', currency: 'YER', nature: 'debit', status: 'active', level: 2, balance: 0, isSub: false },
  { id: 'acc-121', code: '121', name: 'الأثاث والمعدات المكتبية', category: 'asset', parentCode: '12', currency: 'YER', nature: 'debit', status: 'active', level: 3, balance: 0, isSub: true },
  { id: 'acc-122', code: '122', name: 'أجهزة الحاسب والشبكات', category: 'asset', parentCode: '12', currency: 'YER', nature: 'debit', status: 'active', level: 3, balance: 0, isSub: true },

  // 2 الخصوم
  { id: 'acc-2', code: '2', name: 'الخصوم', category: 'liability', parentCode: null, currency: 'YER', nature: 'credit', status: 'active', level: 1, balance: 0, isSub: false },
  { id: 'acc-21', code: '21', name: 'الخصوم المتداولة', category: 'liability', parentCode: '2', currency: 'YER', nature: 'credit', status: 'active', level: 2, balance: 0, isSub: false },
  { id: 'acc-211', code: '211', name: 'الموردون والدائنون', category: 'liability', parentCode: '21', currency: 'YER', nature: 'credit', status: 'active', level: 3, balance: 0, isSub: true },
  { id: 'acc-212', code: '212', name: 'الضرائب المستحقة', category: 'liability', parentCode: '21', currency: 'YER', nature: 'credit', status: 'active', level: 3, balance: 0, isSub: true },

  // 3 حقوق الملكية
  { id: 'acc-3', code: '3', name: 'حقوق الملكية', category: 'equity', parentCode: null, currency: 'YER', nature: 'credit', status: 'active', level: 1, balance: 0, isSub: false },
  { id: 'acc-31', code: '31', name: 'رأس المال المدفوع', category: 'equity', parentCode: '3', currency: 'YER', nature: 'credit', status: 'active', level: 2, balance: 0, isSub: true },
  { id: 'acc-32', code: '32', name: 'الأرباح المحتجزة / المبقاة', category: 'equity', parentCode: '3', currency: 'YER', nature: 'credit', status: 'active', level: 2, balance: 0, isSub: true },

  // 4 الإيرادات
  { id: 'acc-4', code: '4', name: 'الإيرادات', category: 'revenue', parentCode: null, currency: 'YER', nature: 'credit', status: 'active', level: 1, balance: 0, isSub: false },
  { id: 'acc-41', code: '41', name: 'إيرادات المبيعات والخدمات', category: 'revenue', parentCode: '4', currency: 'YER', nature: 'credit', status: 'active', level: 2, balance: 0, isSub: false },
  { id: 'acc-411', code: '411', name: 'مبيعات المنتجات والأجهزة', category: 'revenue', parentCode: '41', currency: 'YER', nature: 'credit', status: 'active', level: 3, balance: 0, isSub: true },
  { id: 'acc-412', code: '412', name: 'إيرادات عقود الصيانة والدعم', category: 'revenue', parentCode: '41', currency: 'YER', nature: 'credit', status: 'active', level: 3, balance: 0, isSub: true },

  // 5 المصروفات
  { id: 'acc-5', code: '5', name: 'المصروفات', category: 'expense', parentCode: null, currency: 'YER', nature: 'debit', status: 'active', level: 1, balance: 0, isSub: false },
  { id: 'acc-51', code: '51', name: 'تكلفة المبيعات', category: 'expense', parentCode: '5', currency: 'YER', nature: 'debit', status: 'active', level: 2, balance: 0, isSub: true },
  { id: 'acc-52', code: '52', name: 'المصروفات التشغيلية والإدارية', category: 'expense', parentCode: '5', currency: 'YER', nature: 'debit', status: 'active', level: 2, balance: 0, isSub: false },
  { id: 'acc-521', code: '521', name: 'إيجار المكاتب والمخازن', category: 'expense', parentCode: '52', currency: 'YER', nature: 'debit', status: 'active', level: 3, balance: 0, isSub: true },
  { id: 'acc-522', code: '522', name: 'مصاريف الهاتف والإنترنت والكهرباء', category: 'expense', parentCode: '52', currency: 'YER', nature: 'debit', status: 'active', level: 3, balance: 0, isSub: true },
  { id: 'acc-523', code: '523', name: 'رواتب وأجور الموظفين', category: 'expense', parentCode: '52', currency: 'YER', nature: 'debit', status: 'active', level: 3, balance: 0, isSub: true },
];

export const INITIAL_BANKS_CASH: any[] = [];

export const INITIAL_WAREHOUSES: any[] = [];

export const INITIAL_ITEMS: any[] = [];

export const INITIAL_SUPPLIERS: any[] = [];

export const INITIAL_CUSTOMERS: any[] = [];

export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [];

export const INITIAL_VOUCHERS: CashVoucher[] = [];

export const INITIAL_PURCHASE_INVOICES: PurchaseInvoice[] = [];

export const INITIAL_SALES_INVOICES: SalesInvoice[] = [];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];

export const INITIAL_PURCHASE_RETURNS: PurchaseReturn[] = [];

export const INITIAL_QUOTATIONS: Quotation[] = [];

export const INITIAL_SALES_RETURNS: SalesReturn[] = [];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
