/**
 * 3. إدارة الأستاذ العام (General Ledger Screen)
 * يشمل: شجرة الحسابات، البنوك والصناديق، قيود اليومية، سندات الصرف والقبض، والتقارير المالية الختامية
 */

import React, { useState, useEffect } from 'react';
import {
  Account,
  BankCashFund,
  JournalEntry,
  CashVoucher,
  User,
  CompanyInfo,
  FinancialYear,
} from '../types';
import { db } from '../database/db';
import { PeriodClosureService } from '../services/PeriodClosureService';
import { DataGrid, Column } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { PrintHeader } from '../components/PrintHeader';
import { ERPActionBar, ERPMode } from '../components/ERPActionBar';
import { SourceDocumentModal } from '../components/SourceDocumentModal';
import { tafqeet } from '../utils/tafqeet';
import {
  BookOpen,
  FolderTree,
  Building,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  Trash2,
  Printer,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  BarChart3,
  Scale,
  CheckCircle,
  AlertCircle,
  List,
  Search,
  FileText,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

interface GeneralLedgerScreenProps {
  currentUser: User;
  activeYear: FinancialYear;
  onBack: () => void;
  defaultTab?: TabType;
}

type TabType = 'accounts' | 'banks' | 'journal' | 'vouchers' | 'reports' | 'tax_zakat' | 'period_closing';

export const GeneralLedgerScreen: React.FC<GeneralLedgerScreenProps> = ({
  currentUser,
  activeYear,
  onBack,
  defaultTab = 'accounts',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [accounts, setAccounts] = useState<Account[]>(() => db.getAccounts());
  const [banksCash, setBanksCash] = useState<BankCashFund[]>(() => db.getBanksCash());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => db.getJournalEntries());
  const [vouchers, setVouchers] = useState<CashVoucher[]>(() => db.getVouchers());
  const [closedMonths, setClosedMonths] = useState<string[]>(() => db.getClosedMonths());
  const [closedYears, setClosedYears] = useState<number[]>(() => db.getClosedYears());
  const [company] = useState<CompanyInfo>(() => db.getCompanyInfo());

  // Print Preview
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState('');
  const [printDocNumber, setPrintDocNumber] = useState<string | undefined>();
  const [printContent, setPrintContent] = useState<React.ReactNode>(null);

  // Drill-down Source Document Modal
  const [drillDownDocRef, setDrillDownDocRef] = useState<string | null>(null);

  // Journal Reversal Modal State
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalTargetEntry, setReversalTargetEntry] = useState<JournalEntry | null>(null);

  // --- Accounts State & Modal ---
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountForm, setAccountForm] = useState<Partial<Account>>({
    code: '',
    name: '',
    category: 'asset',
    parentCode: null,
    currency: 'YER',
    nature: 'debit',
    status: 'active',
    balance: 0,
    isSub: true,
  });

  // --- Bank & Cash Modal ---
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankCashFund | null>(null);
  const [bankForm, setBankForm] = useState<Partial<BankCashFund>>({
    code: '',
    name: '',
    type: 'cash',
    accountNumber: '',
    openingBalance: 0,
    currentBalance: 0,
    currency: 'YER',
    accountCode: '1111',
  });

  // --- Journal Entry State & Input Screen ---
  const [journalSubView, setJournalSubView] = useState<'entry' | 'register'>('entry');
  const [currentJournalIndex, setCurrentJournalIndex] = useState<number>(0);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalMode, setJournalMode] = useState<ERPMode>('view');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [searchJournalModalOpen, setSearchJournalModalOpen] = useState(false);
  const [journalSearchTerm, setJournalSearchTerm] = useState('');
  const [journalForm, setJournalForm] = useState<{
    entryNumber: string;
    date: string;
    reference: string;
    description: string;
    lines: { id: string; accountCode: string; accountName: string; debit: number; credit: number; note: string }[];
  }>({
    entryNumber: '1',
    date: new Date().toISOString().slice(0, 10),
    reference: '',
    description: '',
    lines: [
      { id: '1', accountCode: '1111', accountName: 'الصندوق الرئيسي', debit: 0, credit: 0, note: '' },
      { id: '2', accountCode: '411', accountName: 'مبيعات المنتجات والأجهزة', debit: 0, credit: 0, note: '' },
    ],
  });
  const [journalError, setJournalError] = useState<string | null>(null);

  // --- Cash Voucher State & Input Screen (Payment/Receipt) ---
  const [voucherSubView, setVoucherSubView] = useState<'entry' | 'register'>('entry');
  const [currentVoucherIndex, setCurrentVoucherIndex] = useState<number>(0);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherMode, setVoucherMode] = useState<ERPMode>('view');
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [voucherType, setVoucherType] = useState<'payment' | 'receipt'>('payment');
  const [searchVoucherModalOpen, setSearchVoucherModalOpen] = useState(false);
  const [voucherSearchTerm, setVoucherSearchTerm] = useState('');
  const [voucherForm, setVoucherForm] = useState<Partial<CashVoucher>>({
    voucherNumber: '1',
    date: new Date().toISOString().slice(0, 10),
    partyName: '',
    amount: 0,
    paymentMethod: 'cash',
    bankCashId: 'bc-1',
    accountCode: '521',
    reference: '',
    description: '',
  });

  // Load an existing journal entry into the form
  const loadJournalIntoForm = (entry: JournalEntry, mode: ERPMode = 'view') => {
    setJournalError(null);
    setJournalMode(mode);
    setSelectedJournalId(entry.id);
    setJournalForm({
      entryNumber: entry.entryNumber,
      date: entry.date,
      reference: entry.reference || '',
      description: entry.description,
      lines: entry.lines.map((l) => ({ ...l, note: l.note || '' })),
    });
  };

  // Load an existing voucher into the form
  const loadVoucherIntoForm = (vch: CashVoucher, mode: ERPMode = 'view') => {
    setVoucherMode(mode);
    setSelectedVoucherId(vch.id);
    setVoucherType(vch.type);
    setVoucherForm({ ...vch });
  };

  // Sync initial journal entry into entry screen on load
  useEffect(() => {
    if (journalEntries.length > 0 && !selectedJournalId && journalMode === 'view') {
      loadJournalIntoForm(journalEntries[0], 'view');
      setCurrentJournalIndex(0);
    }
  }, [journalEntries]);

  // Sync initial voucher into entry screen on load
  useEffect(() => {
    if (vouchers.length > 0 && !selectedVoucherId && voucherMode === 'view') {
      loadVoucherIntoForm(vouchers[0], 'view');
      setCurrentVoucherIndex(0);
    }
  }, [vouchers]);

  // --- Financial Reports State ---
  const [selectedReport, setSelectedReport] = useState<
    'trial_balance' | 'journal_book' | 'general_ledger' | 'income_statement' | 'balance_sheet'
  >('trial_balance');

  const reloadData = () => {
    setAccounts(db.getAccounts());
    setBanksCash(db.getBanksCash());
    setJournalEntries(db.getJournalEntries());
    setVouchers(db.getVouchers());
    setClosedMonths(db.getClosedMonths());
    setClosedYears(db.getClosedYears());
  };

  // --- Account Logic ---
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      code: '',
      name: '',
      category: 'asset',
      parentCode: '11',
      currency: 'YER',
      nature: 'debit',
      status: 'active',
      balance: 0,
      isSub: true,
    });
    setAccountModalOpen(true);
  };

  const handleEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccountForm({ ...acc });
    setAccountModalOpen(true);
  };

  const handleDeleteAccount = (acc: Account) => {
    if (confirm(`هل أنت متأكد من حذف الحساب "${acc.code} - ${acc.name}"؟`)) {
      const res = db.deleteAccount(acc.id, currentUser.username);
      if (!res.success) {
        alert(res.message);
      } else {
        reloadData();
      }
    }
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const item: Account = {
      id: editingAccount ? editingAccount.id : `acc-${accountForm.code}`,
      code: accountForm.code || '',
      name: accountForm.name || '',
      category: accountForm.category || 'asset',
      parentCode: accountForm.parentCode || null,
      currency: accountForm.currency || 'YER',
      nature: accountForm.nature || 'debit',
      status: accountForm.status || 'active',
      level: accountForm.code ? accountForm.code.length : 1,
      balance: Number(accountForm.balance) || 0,
      isSub: !!accountForm.isSub,
    };
    db.saveAccount(item, currentUser.username);
    reloadData();
    setAccountModalOpen(false);
  };

  // --- Bank & Cash Logic ---
  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankForm({
      code: `BNK-0${banksCash.length + 1}`,
      name: '',
      type: 'bank',
      accountNumber: '',
      openingBalance: 0,
      currentBalance: 0,
      currency: 'YER',
      accountCode: '1112',
    });
    setBankModalOpen(true);
  };

  const handleEditBank = (item: BankCashFund) => {
    setEditingBank(item);
    setBankForm({ ...item });
    setBankModalOpen(true);
  };

  const handleDeleteBank = (item: BankCashFund) => {
    if (confirm(`هل أنت متأكد من حذف ${item.name}؟`)) {
      db.deleteBankCash(item.id, currentUser.username);
      reloadData();
    }
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    const item: BankCashFund = {
      id: editingBank ? editingBank.id : `bc-${Date.now()}`,
      code: bankForm.code || '',
      name: bankForm.name || '',
      type: bankForm.type || 'bank',
      accountNumber: bankForm.accountNumber || '',
      openingBalance: Number(bankForm.openingBalance) || 0,
      currentBalance: Number(bankForm.currentBalance) || Number(bankForm.openingBalance) || 0,
      currency: bankForm.currency || 'YER',
      accountCode: bankForm.accountCode || '1111',
    };
    db.saveBankCash(item, currentUser.username);
    reloadData();
    setBankModalOpen(false);
  };

  // --- Journal Entry Logic ---
  const handleFirstJournal = () => {
    if (journalEntries.length > 0) {
      setCurrentJournalIndex(0);
      loadJournalIntoForm(journalEntries[0], 'view');
    }
  };

  const handlePrevJournal = () => {
    if (currentJournalIndex > 0) {
      const idx = currentJournalIndex - 1;
      setCurrentJournalIndex(idx);
      loadJournalIntoForm(journalEntries[idx], 'view');
    }
  };

  const handleNextJournal = () => {
    if (currentJournalIndex < journalEntries.length - 1) {
      const idx = currentJournalIndex + 1;
      setCurrentJournalIndex(idx);
      loadJournalIntoForm(journalEntries[idx], 'view');
    }
  };

  const handleLastJournal = () => {
    if (journalEntries.length > 0) {
      const idx = journalEntries.length - 1;
      setCurrentJournalIndex(idx);
      loadJournalIntoForm(journalEntries[idx], 'view');
    }
  };

  const handleOpenAddJournal = () => {
    setJournalSubView('entry');
    setJournalError(null);
    setJournalMode('add');
    setSelectedJournalId(null);
    setJournalForm({
      entryNumber: db.getNextJournalEntryNumber(),
      date: new Date().toISOString().slice(0, 10),
      reference: '',
      description: '',
      lines: [
        { id: '1', accountCode: '1111', accountName: 'الصندوق الرئيسي', debit: 0, credit: 0, note: '' },
        { id: '2', accountCode: '411', accountName: 'مبيعات المنتجات والأجهزة', debit: 0, credit: 0, note: '' },
      ],
    });
  };

  const handleDeleteActiveJournal = () => {
    if (!selectedJournalId) return;
    if (confirm(`هل أنت متأكد من حذف قيد اليومية رقم ${journalForm.entryNumber} نهائياً؟`)) {
      db.deleteJournalEntry(selectedJournalId, currentUser.username);
      reloadData();
      const updated = db.getJournalEntries();
      if (updated.length > 0) {
        const nextIdx = Math.min(currentJournalIndex, updated.length - 1);
        setCurrentJournalIndex(nextIdx);
        loadJournalIntoForm(updated[nextIdx], 'view');
      } else {
        handleOpenAddJournal();
      }
    }
  };

  const handleCancelActiveJournal = () => {
    if (journalEntries.length > 0) {
      const idx = currentJournalIndex >= 0 && currentJournalIndex < journalEntries.length ? currentJournalIndex : 0;
      loadJournalIntoForm(journalEntries[idx], 'view');
    } else {
      handleOpenAddJournal();
    }
  };

  const handleOpenEditJournal = (entry: JournalEntry) => {
    setJournalSubView('entry');
    setJournalError(null);
    setJournalMode('edit');
    setSelectedJournalId(entry.id);
    setJournalForm({
      entryNumber: entry.entryNumber,
      date: entry.date,
      reference: entry.reference || '',
      description: entry.description,
      lines: entry.lines.map((l) => ({ ...l, note: l.note || '' })),
    });
  };

  const handleAddJournalLine = () => {
    setJournalForm({
      ...journalForm,
      lines: [
        ...journalForm.lines,
        { id: String(Date.now()), accountCode: '1111', accountName: 'الصندوق الرئيسي', debit: 0, credit: 0, note: '' },
      ],
    });
  };

  const handleRemoveJournalLine = (index: number) => {
    if (journalForm.lines.length <= 2) {
      alert('يجب أن يحتوي القيد المحاسبي على طرفين على الأقل (مدين ودائن).');
      return;
    }
    const updated = [...journalForm.lines];
    updated.splice(index, 1);
    setJournalForm({ ...journalForm, lines: updated });
  };

  const handleJournalLineChange = (index: number, field: string, value: any) => {
    const updated = [...journalForm.lines];
    if (field === 'accountCode') {
      const acc = accounts.find((a) => a.code === value);
      updated[index] = {
        ...updated[index],
        accountCode: value,
        accountName: acc ? acc.name : '',
      };
    } else {
      (updated[index] as any)[field] = value;
    }
    setJournalForm({ ...journalForm, lines: updated });
  };

  const totalDebit = journalForm.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = journalForm.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const handleSaveJournal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isJournalBalanced) {
      setJournalError(`القيد غير متزن! إجمالي المدين (${totalDebit}) يجب أن يساوي إجمالي الدائن (${totalCredit}) ولا يمكن أن يكون صفراً.`);
      return;
    }

    const newEntry: JournalEntry = {
      id: selectedJournalId || `je-${Date.now()}`,
      entryNumber: journalForm.entryNumber || db.getNextJournalEntryNumber(),
      date: journalForm.date,
      reference: journalForm.reference,
      description: journalForm.description,
      debitTotal: totalDebit,
      creditTotal: totalCredit,
      financialYear: activeYear.year,
      createdBy: currentUser.username,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      lines: journalForm.lines.map((l) => ({
        ...l,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    };

    db.saveJournalEntry(newEntry, currentUser.username);
    reloadData();
    const updated = db.getJournalEntries();
    const savedIdx = updated.findIndex((j) => j.id === newEntry.id || j.entryNumber === newEntry.entryNumber);
    const targetIdx = savedIdx >= 0 ? savedIdx : 0;
    setCurrentJournalIndex(targetIdx);
    loadJournalIntoForm(updated[targetIdx], 'view');
    setJournalModalOpen(false);
    alert(`تم حفظ وترحيل قيد اليومية رقم ${newEntry.entryNumber} بنجاح.`);
  };

  const handlePrintJournal = (entry: JournalEntry) => {
    setPrintTitle(`سند قيد اليومية المحاسبي`);
    setPrintDocNumber(entry.entryNumber);
    setPrintContent(
      <div>
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs bg-slate-50 p-3 rounded border">
          <div>تاريخ القيد: <span className="font-mono font-bold">{entry.date}</span></div>
          <div>المرجع: <span className="font-mono">{entry.reference || 'بدون مرجع'}</span></div>
          <div className="col-span-2">البيان العام: <span className="font-semibold">{entry.description}</span></div>
        </div>

        <table className="w-full text-xs text-right border-collapse border border-slate-300">
          <thead className="bg-[#1B3A5C] text-white">
            <tr>
              <th className="border p-2 w-28">رقم الحساب</th>
              <th className="border p-2">اسم الحساب</th>
              <th className="border p-2 w-28 text-left">مدين</th>
              <th className="border p-2 w-28 text-left">دائن</th>
              <th className="border p-2">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((l, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="border p-2 font-mono">{l.accountCode}</td>
                <td className="border p-2 font-bold">{l.accountName}</td>
                <td className="border p-2 font-mono text-left">{l.debit > 0 ? l.debit.toLocaleString('ar-SA') : '-'}</td>
                <td className="border p-2 font-mono text-left">{l.credit > 0 ? l.credit.toLocaleString('ar-SA') : '-'}</td>
                <td className="border p-2 text-slate-500">{l.note || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold">
            <tr>
              <td colSpan={2} className="border p-2 text-center">الإجمالي العام</td>
              <td className="border p-2 font-mono text-left text-emerald-800">{entry.debitTotal.toLocaleString('ar-SA')}</td>
              <td className="border p-2 font-mono text-left text-emerald-800">{entry.creditTotal.toLocaleString('ar-SA')}</td>
              <td className="border p-2 text-center text-emerald-700">متزن ومطابق</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
    setIsPrintModalOpen(true);
  };

  // --- Cash Voucher Logic ---
  const handleFirstVoucher = () => {
    if (vouchers.length > 0) {
      setCurrentVoucherIndex(0);
      loadVoucherIntoForm(vouchers[0], 'view');
    }
  };

  const handlePrevVoucher = () => {
    if (currentVoucherIndex > 0) {
      const idx = currentVoucherIndex - 1;
      setCurrentVoucherIndex(idx);
      loadVoucherIntoForm(vouchers[idx], 'view');
    }
  };

  const handleNextVoucher = () => {
    if (currentVoucherIndex < vouchers.length - 1) {
      const idx = currentVoucherIndex + 1;
      setCurrentVoucherIndex(idx);
      loadVoucherIntoForm(vouchers[idx], 'view');
    }
  };

  const handleLastVoucher = () => {
    if (vouchers.length > 0) {
      const idx = vouchers.length - 1;
      setCurrentVoucherIndex(idx);
      loadVoucherIntoForm(vouchers[idx], 'view');
    }
  };

  const handleOpenAddVoucher = (type: 'payment' | 'receipt' = voucherType) => {
    setVoucherSubView('entry');
    setVoucherType(type);
    setVoucherMode('add');
    setSelectedVoucherId(null);
    setVoucherForm({
      voucherNumber: db.getNextVoucherNumber(),
      date: new Date().toISOString().slice(0, 10),
      partyName: '',
      amount: 0,
      paymentMethod: 'cash',
      bankCashId: banksCash[0]?.id || 'bc-1',
      accountCode: type === 'payment' ? '521' : '1121',
      reference: '',
      description: '',
    });
  };

  const handleDeleteActiveVoucher = () => {
    if (!selectedVoucherId) return;
    if (confirm(`هل أنت متأكد من حذف السند رقم ${voucherForm.voucherNumber} نهائياً؟`)) {
      db.deleteVoucher(selectedVoucherId, currentUser.username);
      reloadData();
      const updated = db.getVouchers();
      if (updated.length > 0) {
        const nextIdx = Math.min(currentVoucherIndex, updated.length - 1);
        setCurrentVoucherIndex(nextIdx);
        loadVoucherIntoForm(updated[nextIdx], 'view');
      } else {
        handleOpenAddVoucher();
      }
    }
  };

  const handleCancelActiveVoucher = () => {
    if (vouchers.length > 0) {
      const idx = currentVoucherIndex >= 0 && currentVoucherIndex < vouchers.length ? currentVoucherIndex : 0;
      loadVoucherIntoForm(vouchers[idx], 'view');
    } else {
      handleOpenAddVoucher();
    }
  };

  const handleOpenEditVoucher = (vch: CashVoucher) => {
    setVoucherSubView('entry');
    setVoucherType(vch.type);
    setVoucherMode('edit');
    setSelectedVoucherId(vch.id);
    setVoucherForm({
      voucherNumber: vch.voucherNumber,
      date: vch.date,
      partyName: vch.partyName,
      amount: vch.amount,
      paymentMethod: vch.paymentMethod,
      bankCashId: vch.bankCashId,
      accountCode: vch.accountCode,
      reference: vch.reference || '',
      description: vch.description,
    });
  };

  const handleSaveVoucher = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newVoucher: CashVoucher = {
      id: selectedVoucherId || `vch-${Date.now()}`,
      voucherNumber: voucherForm.voucherNumber || db.getNextVoucherNumber(),
      type: voucherType,
      date: voucherForm.date || new Date().toISOString().slice(0, 10),
      partyName: voucherForm.partyName || '',
      amount: Number(voucherForm.amount) || 0,
      paymentMethod: voucherForm.paymentMethod || 'cash',
      bankCashId: voucherForm.bankCashId || 'bc-1',
      accountCode: voucherForm.accountCode || '1111',
      reference: voucherForm.reference || '',
      description: voucherForm.description || '',
      financialYear: activeYear.year,
      createdBy: currentUser.username,
    };
    db.saveVoucher(newVoucher, currentUser.username);
    reloadData();
    const updated = db.getVouchers();
    const savedIdx = updated.findIndex((v) => v.id === newVoucher.id || v.voucherNumber === newVoucher.voucherNumber);
    const targetIdx = savedIdx >= 0 ? savedIdx : 0;
    setCurrentVoucherIndex(targetIdx);
    loadVoucherIntoForm(updated[targetIdx], 'view');
    setVoucherModalOpen(false);
    alert(`تم حفظ السند المالي رقم ${newVoucher.voucherNumber} بنجاح وترحيل الحسابات.`);
  };

  const handlePrintVoucher = (vch: CashVoucher) => {
    const isPayment = vch.type === 'payment';
    setPrintTitle(isPayment ? 'سند صرف نقدي / بنكي' : 'سند قبض مالي');
    setPrintDocNumber(vch.voucherNumber);
    setPrintContent(
      <div className="space-y-4">
        <div className="border border-slate-300 rounded p-4 bg-slate-50 space-y-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <div>
              <span className="text-slate-500">تاريخ السند:</span>{' '}
              <span className="font-mono font-bold text-slate-800">{vch.date}</span>
            </div>
            <div>
              <span className="text-slate-500">طريقة الدفع:</span>{' '}
              <span className="font-bold text-[#1B3A5C]">
                {vch.paymentMethod === 'cash' ? 'نقداً من الصندوق' : vch.paymentMethod === 'bank' ? 'تحويل بنكي' : 'شيك مصرفي'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 bg-amber-50 px-3 rounded border border-amber-200">
            <span className="font-bold text-slate-800">
              {isPayment ? 'يُصرف إلى السيد / السادة:' : 'استلمنا من السيد / السادة:'}
            </span>
            <span className="text-sm font-bold text-[#1B3A5C]">{vch.partyName}</span>
          </div>

          <div className="flex justify-between items-center py-2 bg-white px-3 rounded border">
            <span className="font-bold text-slate-700">المبلغ المستحق رقماً:</span>
            <span className="text-base font-bold font-mono text-emerald-800">
              {vch.amount.toLocaleString('ar-SA')} {company.defaultCurrency}
            </span>
          </div>

          <div>
            <span className="text-slate-500">وذلك عن (البيان):</span>{' '}
            <span className="font-semibold text-slate-800">{vch.description}</span>
          </div>

          {vch.reference && (
            <div>
              <span className="text-slate-500">المرجع / الشيك:</span>{' '}
              <span className="font-mono text-slate-700">{vch.reference}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
          <div className="border-t border-slate-400 pt-2">
            <div className="font-bold">المستلم / المستفيد</div>
            <div className="mt-8 text-slate-400">التوقيع: ____________</div>
          </div>
          <div className="border-t border-slate-400 pt-2">
            <div className="font-bold">المحاسب المسؤول</div>
            <div className="mt-8 text-slate-600 font-mono">{vch.createdBy}</div>
          </div>
          <div className="border-t border-slate-400 pt-2">
            <div className="font-bold">اعتماد الإدارة المالية</div>
            <div className="mt-8 text-slate-400">التوقيع والختم</div>
          </div>
        </div>
      </div>
    );
    setIsPrintModalOpen(true);
  };

  // Columns for DataGrids
  const accountColumns: Column<Account>[] = [
    { key: 'code', header: 'رمز الحساب', width: '110px', render: (a) => <span className="font-mono font-bold text-[#1B3A5C]">{a.code}</span> },
    {
      key: 'name',
      header: 'اسم الحساب',
      render: (a) => (
        <div style={{ paddingRight: `${(a.level - 1) * 16}px` }} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${a.isSub ? 'bg-emerald-500' : 'bg-[#c49a37]'}`} />
          <span className={a.isSub ? 'text-slate-800' : 'font-bold text-[#1B3A5C]'}>{a.name}</span>
          {!a.isSub && <span className="text-[10px] text-slate-400">(رئيسي)</span>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'التصنيف المحاسبي',
      width: '120px',
      render: (a) => {
        const catMap = { asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
        return <span className="text-slate-700 font-medium">{catMap[a.category]}</span>;
      },
    },
    { key: 'nature', header: 'الطبيعة', width: '90px', render: (a) => a.nature === 'debit' ? 'مدين' : 'دائن' },
    { key: 'balance', header: 'الرصيد الحالي', width: '130px', align: 'left', render: (a) => <span className="font-mono font-bold text-slate-800">{a.balance.toLocaleString('ar-SA')}</span> },
  ];

  const bankColumns: Column<BankCashFund>[] = [
    { key: 'code', header: 'الكود', width: '90px', render: (b) => <span className="font-mono font-bold">{b.code}</span> },
    { key: 'name', header: 'الاسم', render: (b) => <span className="font-bold text-[#1B3A5C]">{b.name}</span> },
    { key: 'type', header: 'النوع', width: '100px', render: (b) => b.type === 'bank' ? 'حساب بنكي' : 'صندوق نقدي (خزينة)' },
    { key: 'accountNumber', header: 'رقم الحساب / الآيبان', render: (b) => <span className="font-mono text-slate-600">{b.accountNumber || '-'}</span> },
    { key: 'openingBalance', header: 'الرصيد الافتتاحي', width: '130px', align: 'left', render: (b) => <span className="font-mono">{b.openingBalance.toLocaleString('ar-SA')}</span> },
    { key: 'currentBalance', header: 'الرصيد الحالي', width: '130px', align: 'left', render: (b) => <span className="font-mono font-bold text-emerald-800">{b.currentBalance.toLocaleString('ar-SA')}</span> },
  ];

  const journalColumns: Column<JournalEntry>[] = [
    {
      key: 'entryNumber',
      header: 'رقم القيد',
      width: '140px',
      render: (j) => (
        <button
          type="button"
          onClick={() => setDrillDownDocRef(j.entryNumber)}
          className="font-mono font-bold text-[#1B3A5C] hover:underline hover:text-[#c49a37] flex items-center gap-1 cursor-pointer"
          title="معاينة تفاصيل القيد والأثر المحاسبي"
        >
          <span>{j.entryNumber}</span>
          {j.isReversed && <span className="text-[10px] text-red-600 font-bold">(معكوس)</span>}
        </button>
      ),
    },
    { key: 'date', header: 'التاريخ', width: '110px', render: (j) => <span className="font-mono">{j.date}</span> },
    { key: 'description', header: 'البيان المحاسبي', render: (j) => <span className="font-medium text-slate-800">{j.description}</span> },
    {
      key: 'reference',
      header: 'المستند المرجعي',
      width: '130px',
      render: (j) =>
        j.reference ? (
          <button
            type="button"
            onClick={() => setDrillDownDocRef(j.reference)}
            className="font-mono text-blue-700 hover:text-[#c49a37] hover:underline flex items-center gap-1 cursor-pointer font-bold"
            title="الانتقال للمستند الأصلي مباشرة"
          >
            <span>{j.reference}</span>
            <ExternalLink className="w-3 h-3 text-[#c49a37]" />
          </button>
        ) : (
          <span className="font-mono text-slate-400">-</span>
        ),
    },
    { key: 'debitTotal', header: 'المبلغ الإجمالي', width: '130px', align: 'left', render: (j) => <span className="font-mono font-bold text-emerald-800">{j.debitTotal.toLocaleString('ar-SA')}</span> },
    {
      key: 'actions',
      header: 'إجراءات ومعاينة',
      width: '140px',
      align: 'center',
      render: (j) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handlePrintJournal(j)}
            className="px-2 py-0.5 text-[11px] font-bold bg-[#1B3A5C] text-white hover:bg-[#122840] rounded transition-colors cursor-pointer"
            title="طباعة سند القيد"
          >
            سند القيد
          </button>
          {!j.isReversed && j.status !== 'reversed' && (
            <button
              onClick={() => {
                setReversalTargetEntry(j);
                setReversalReason('');
                setReversalModalOpen(true);
              }}
              className="px-2 py-0.5 text-[11px] font-bold bg-amber-700 hover:bg-amber-800 text-white rounded transition-colors cursor-pointer"
              title="عكس القيد المحاسبي"
            >
              عكس القيد
            </button>
          )}
        </div>
      ),
    },
  ];

  const voucherColumns: Column<CashVoucher>[] = [
    {
      key: 'voucherNumber',
      header: 'رقم السند',
      width: '140px',
      render: (v) => (
        <button
          type="button"
          onClick={() => setDrillDownDocRef(v.voucherNumber)}
          className="font-mono font-bold text-[#1B3A5C] hover:underline hover:text-[#c49a37] flex items-center gap-1 cursor-pointer"
          title="معاينة السند الأصلي والقيد المولد"
        >
          <span>{v.voucherNumber}</span>
          <ExternalLink className="w-3 h-3 text-[#c49a37]" />
        </button>
      ),
    },
    {
      key: 'type',
      header: 'نوع السند',
      width: '100px',
      render: (v) =>
        v.type === 'payment' ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
            سند صرف
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            سند قبض
          </span>
        ),
    },
    { key: 'date', header: 'التاريخ', width: '110px', render: (v) => <span className="font-mono">{v.date}</span> },
    { key: 'partyName', header: 'المستفيد / الدافع', render: (v) => <span className="font-bold text-slate-800">{v.partyName}</span> },
    { key: 'amount', header: 'المبلغ', width: '130px', align: 'left', render: (v) => <span className="font-mono font-bold text-[#1B3A5C]">{v.amount.toLocaleString('ar-SA')}</span> },
    {
      key: 'print',
      header: 'طباعة',
      width: '80px',
      align: 'center',
      render: (v) => (
        <button
          onClick={() => handlePrintVoucher(v)}
          className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300"
        >
          طباعة
        </button>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-2.5 overflow-hidden">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between mb-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded hover:bg-slate-100 text-[#1B3A5C] border border-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <ArrowRight className="w-4 h-4 text-[#c49a37]" />
            <span>الشاشة الرئيسية</span>
          </button>
          <span className="text-slate-400">/</span>
          <h1 className="text-base font-bold text-[#1B3A5C]">3. إدارة الأستاذ العام (General Ledger)</h1>
        </div>

        {/* 5 Tabs Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'accounts' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>دليل وشجرة الحسابات</span>
          </button>

          <button
            onClick={() => setActiveTab('banks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'banks' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>البنوك والصناديق</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'journal' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>قيود اليومية المحاسبية</span>
          </button>

          <button
            onClick={() => setActiveTab('vouchers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'vouchers' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>سندات الصرف والقبض</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'reports' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>القوائم والتقارير الختامية</span>
          </button>

          <button
            onClick={() => setActiveTab('tax_zakat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'tax_zakat' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>إقرار الضرائب والزكاة (اليمن)</span>
          </button>

          <button
            onClick={() => setActiveTab('period_closing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'period_closing' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>الإقفال الشهري والسنوي</span>
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-hidden">
        {/* TAB 1: Chart of Accounts */}
        {activeTab === 'accounts' && (
          <DataGrid
            title="دليل وشجرة الحسابات العامة (Chart of Accounts)"
            subtitle="الأصول، الخصوم، حقوق الملكية، الإيرادات، والمصروفات بحسابات رئيسية وفرعية"
            data={accounts}
            columns={accountColumns}
            onAdd={handleOpenAddAccount}
            onEdit={handleEditAccount}
            onDelete={handleDeleteAccount}
            onPrint={() => {
              setPrintTitle('شجرة ودليل الحسابات المحاسبية العامة');
              setPrintDocNumber('COA-2026');
              setPrintContent(
                <table className="w-full text-xs text-right border-collapse border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-2">رقم الحساب</th>
                      <th className="border p-2">اسم الحساب</th>
                      <th className="border p-2">التصنيف</th>
                      <th className="border p-2">الطبيعة</th>
                      <th className="border p-2 text-left">الرصيد الحالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.id} className={!a.isSub ? 'font-bold bg-slate-50' : ''}>
                        <td className="border p-2 font-mono">{a.code}</td>
                        <td className="border p-2" style={{ paddingRight: `${(a.level - 1) * 16}px` }}>{a.name}</td>
                        <td className="border p-2">{a.category}</td>
                        <td className="border p-2">{a.nature === 'debit' ? 'مدين' : 'دائن'}</td>
                        <td className="border p-2 font-mono text-left">{a.balance.toLocaleString('ar-SA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
              setIsPrintModalOpen(true);
            }}
            addLabel="إضافة حساب جديد"
          />
        )}

        {/* TAB 2: Banks & Cash Funds */}
        {activeTab === 'banks' && (
          <DataGrid
            title="إدارة البنوك والصناديق النقدية (الخزينة)"
            subtitle="ربط الحسابات المصرفية والخزن مع دليل الحسابات ومتابعة الأرصدة"
            data={banksCash}
            columns={bankColumns}
            onAdd={handleOpenAddBank}
            onEdit={handleEditBank}
            onDelete={handleDeleteBank}
            onPrint={() => {
              setPrintTitle('كشف أرصدة البنوك والصناديق النقدية');
              setPrintDocNumber('BNK-REPORT');
              setPrintContent(
                <table className="w-full text-xs text-right border-collapse border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-2">كود الصندوق/البنك</th>
                      <th className="border p-2">الاسم</th>
                      <th className="border p-2">رقم الحساب</th>
                      <th className="border p-2 text-left">الرصيد الافتتاحي</th>
                      <th className="border p-2 text-left">الرصيد الحالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banksCash.map((b) => (
                      <tr key={b.id}>
                        <td className="border p-2 font-mono">{b.code}</td>
                        <td className="border p-2 font-bold">{b.name}</td>
                        <td className="border p-2 font-mono">{b.accountNumber || '-'}</td>
                        <td className="border p-2 font-mono text-left">{b.openingBalance.toLocaleString('ar-SA')}</td>
                        <td className="border p-2 font-mono text-left font-bold text-emerald-800">{b.currentBalance.toLocaleString('ar-SA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
              setIsPrintModalOpen(true);
            }}
            addLabel="إضافة بنك / صندوق جديد"
          />
        )}

        {/* TAB 3: Journal Entries */}
        {activeTab === 'journal' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Sub-view Switcher: Entry Screen vs Register List */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setJournalSubView('entry')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    journalSubView === 'entry'
                      ? 'bg-[#1B3A5C] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#dfb758]" />
                  <span>شاشة إدخال قيد اليومية (مباشر)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setJournalSubView('register')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    journalSubView === 'register'
                      ? 'bg-[#1B3A5C] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-[#dfb758]" />
                  <span>سجل دفتر اليومية العامة ({journalEntries.length})</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {journalSubView === 'entry' ? (
                  <span>
                    مستند معروض: <strong className="text-[#1B3A5C] font-mono">{journalForm.entryNumber}</strong> | التسلسل يبدأ من 1 تلقائياً
                  </span>
                ) : (
                  <span>استعراض سجل ودفتر قيود اليومية المحاسبية</span>
                )}
              </div>
            </div>

            {/* Sub-View A: Direct Document Entry Screen */}
            {journalSubView === 'entry' ? (
              <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                {/* 1. Window Header Bar */}
                <div className="bg-[#1B3A5C] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#dfb758]" />
                    <span>شاشة إدخال: قيد اليومية العام (General Journal Voucher)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-300">السنة المالية: {activeYear.year}</span>
                    <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                      {journalMode === 'add' ? 'وضع إدخال قيد جديد' : journalMode === 'edit' ? 'وضع تعديل القيد' : 'وضع استعراض القيد'}
                    </span>
                  </div>
                </div>

                {/* 2. THE 7 ERP ACTION BUTTONS INSIDE THE ENTRY SCREEN */}
                <div className="p-2 border-b border-slate-300 bg-slate-50 shrink-0">
                  <ERPActionBar
                    mode={journalMode}
                    docNumber={journalForm.entryNumber}
                    docTitle="قيد اليومية"
                    onAdd={handleOpenAddJournal}
                    onEdit={() => {
                      setJournalSubView('entry');
                      setJournalMode('edit');
                    }}
                    onDelete={handleDeleteActiveJournal}
                    onSearch={() => setSearchJournalModalOpen(true)}
                    onSave={() => handleSaveJournal()}
                    onCancel={handleCancelActiveJournal}
                    onPrint={() => {
                      const entry = journalEntries.find((j) => j.id === selectedJournalId) || {
                        id: 'temp',
                        entryNumber: journalForm.entryNumber,
                        date: journalForm.date,
                        reference: journalForm.reference,
                        description: journalForm.description,
                        lines: journalForm.lines,
                        debitTotal: totalDebit,
                        creditTotal: totalCredit,
                        financialYear: activeYear.year,
                        createdBy: currentUser.username,
                        createdAt: '',
                      };
                      handlePrintJournal(entry);
                    }}
                    onFirst={handleFirstJournal}
                    onPrev={handlePrevJournal}
                    onNext={handleNextJournal}
                    onLast={handleLastJournal}
                    canNavigateFirst={currentJournalIndex > 0}
                    canNavigatePrev={currentJournalIndex > 0}
                    canNavigateNext={currentJournalIndex < journalEntries.length - 1}
                    canNavigateLast={currentJournalIndex < journalEntries.length - 1}
                    currentRecordIndex={journalEntries.length > 0 ? currentJournalIndex + 1 : 0}
                    totalRecordsCount={journalEntries.length}
                    canDelete={!!selectedJournalId && journalEntries.length > 0}
                  />
                </div>

                {/* 3. Document Form Body */}
                <form onSubmit={handleSaveJournal} className="flex-1 flex flex-col p-3 overflow-auto space-y-3">
                  {journalError && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-2 font-bold shrink-0">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{journalError}</span>
                    </div>
                  )}

                  {/* Header Fields Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-md border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم القيد: <span className="text-[11px] text-emerald-700 font-semibold">(تسلسل تلقائي)</span>
                      </label>
                      <input
                        type="text"
                        value={journalForm.entryNumber}
                        onChange={(e) => setJournalForm({ ...journalForm, entryNumber: e.target.value })}
                        disabled={journalMode === 'view'}
                        required
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ القيد:</label>
                      <input
                        type="date"
                        value={journalForm.date}
                        onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                        disabled={journalMode === 'view'}
                        required
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الرقم المرجعي / السند اليدوي:</label>
                      <input
                        type="text"
                        value={journalForm.reference}
                        onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
                        disabled={journalMode === 'view'}
                        placeholder="رقم المستند المرفق إن وجد..."
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">البيان العام للقيد:</label>
                      <input
                        type="text"
                        value={journalForm.description}
                        onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                        disabled={journalMode === 'view'}
                        required
                        placeholder="شرح وتفاصيل العملية المالية أو القيد المحاسبي..."
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>
                  </div>

                  {/* Journal Lines Table */}
                  <div className="border border-slate-300 rounded-md overflow-hidden flex-1 flex flex-col">
                    <div className="bg-[#1B3A5C] text-white px-3 py-1.5 text-xs font-bold flex justify-between items-center shrink-0">
                      <span>أطراف وبنود القيد المزدوج ({journalForm.lines.length} بنود)</span>
                      {journalMode !== 'view' && (
                        <button
                          type="button"
                          onClick={handleAddJournalLine}
                          className="px-2.5 py-1 bg-[#c49a37] hover:bg-[#dfb758] text-[#122840] font-black rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة سطر قيد جديد</span>
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-auto bg-white">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead className="bg-slate-100 border-b border-slate-300 sticky top-0">
                          <tr>
                            <th className="p-2 border-l border-slate-300 w-10 text-center">#</th>
                            <th className="p-2 border-l border-slate-300 w-32">رقم الحساب</th>
                            <th className="p-2 border-l border-slate-300">اسم الحساب المالي</th>
                            <th className="p-2 border-l border-slate-300 w-28 text-left">مدين (Debit)</th>
                            <th className="p-2 border-l border-slate-300 w-28 text-left">دائن (Credit)</th>
                            <th className="p-2 border-l border-slate-300">ملاحظات / مركز التكلفة</th>
                            {journalMode !== 'view' && <th className="p-2 w-12 text-center">حذف</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {journalForm.lines.map((line, idx) => (
                            <tr key={line.id || idx} className="hover:bg-slate-50">
                              <td className="p-1.5 border-l border-slate-200 text-center font-mono text-slate-500 font-bold">
                                {idx + 1}
                              </td>

                              <td className="p-1.5 border-l border-slate-200">
                                {journalMode === 'view' ? (
                                  <span className="font-mono font-bold text-[#1B3A5C]">{line.accountCode}</span>
                                ) : (
                                  <select
                                    value={line.accountCode}
                                    onChange={(e) => handleJournalLineChange(idx, 'accountCode', e.target.value)}
                                    className="w-full text-xs p-1 border border-slate-300 rounded font-mono font-bold"
                                  >
                                    {accounts.filter((a) => a.isSub).map((a) => (
                                      <option key={a.id} value={a.code}>
                                        {a.code} - {a.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              <td className="p-1.5 border-l border-slate-200 font-semibold text-slate-800">
                                {line.accountName}
                              </td>

                              <td className="p-1.5 border-l border-slate-200">
                                {journalMode === 'view' ? (
                                  <div className="font-mono text-left font-bold text-emerald-800">
                                    {line.debit > 0 ? Number(line.debit).toLocaleString('ar-SA') : '-'}
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={line.debit}
                                    onChange={(e) => handleJournalLineChange(idx, 'debit', Number(e.target.value))}
                                    className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-left font-bold"
                                  />
                                )}
                              </td>

                              <td className="p-1.5 border-l border-slate-200">
                                {journalMode === 'view' ? (
                                  <div className="font-mono text-left font-bold text-blue-800">
                                    {line.credit > 0 ? Number(line.credit).toLocaleString('ar-SA') : '-'}
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={line.credit}
                                    onChange={(e) => handleJournalLineChange(idx, 'credit', Number(e.target.value))}
                                    className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-left font-bold"
                                  />
                                )}
                              </td>

                              <td className="p-1.5 border-l border-slate-200">
                                {journalMode === 'view' ? (
                                  <span className="text-slate-600 text-xs">{line.note || '-'}</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={line.note || ''}
                                    onChange={(e) => handleJournalLineChange(idx, 'note', e.target.value)}
                                    placeholder="بيان تفصيلي للسطر..."
                                    className="w-full text-xs p-1 border border-slate-300 rounded"
                                  />
                                )}
                              </td>

                              {journalMode !== 'view' && (
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveJournalLine(idx)}
                                    className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                                    title="حذف هذا السطر"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Balancing Summary Bar & Tafqeet */}
                  <div className="bg-slate-50 border border-slate-300 rounded-md p-3 shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs mb-2">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-500 block">إجمالي المدين (Debit):</span>
                        <span className="text-base font-bold font-mono text-emerald-800">
                          {totalDebit.toLocaleString('ar-SA')} {company.defaultCurrency}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-500 block">إجمالي الدائن (Credit):</span>
                        <span className="text-base font-bold font-mono text-blue-800">
                          {totalCredit.toLocaleString('ar-SA')} {company.defaultCurrency}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-500 block">الفرق بين الطرفين:</span>
                        <span
                          className={`text-base font-bold font-mono ${
                            Math.abs(totalDebit - totalCredit) < 0.001 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {Math.abs(totalDebit - totalCredit).toFixed(2)} {company.defaultCurrency}
                        </span>
                      </div>

                      <div
                        className={`p-2 rounded text-white font-bold flex items-center justify-center gap-2 shadow-xs ${
                          isJournalBalanced ? 'bg-emerald-700' : 'bg-red-700'
                        }`}
                      >
                        {isJournalBalanced ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-emerald-200" />
                            <span>القيد متوازن وجاهز للترحيل ✅</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-red-200" />
                            <span>القيد غير متزن (يوجد فرق) ❌</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Tafqeet in Arabic */}
                    <div className="bg-emerald-50/80 border border-emerald-200 p-2 rounded text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-900">المبلغ كتابةً وتفقيطاً:</span>
                        <span className="font-semibold text-emerald-800">{tafqeet(totalDebit)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        رقم القيد: {journalForm.entryNumber} | السنة: {activeYear.year}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              /* Sub-View B: Register / List Table */
              <div className="flex-1 overflow-hidden">
                <DataGrid
                  title="سجل قيود اليومية العامة (General Journal Entries)"
                  subtitle="تسجيل القيود المحاسبية المزدوجة المتزنة آلياً"
                  data={journalEntries}
                  columns={journalColumns}
                  onAdd={handleOpenAddJournal}
                  onEdit={(j) => {
                    const idx = journalEntries.findIndex((item) => item.id === j.id);
                    if (idx >= 0) setCurrentJournalIndex(idx);
                    loadJournalIntoForm(j, 'edit');
                    setJournalSubView('entry');
                  }}
                  onDelete={(j) => {
                    if (confirm(`هل أنت متأكد من حذف قيد اليومية رقم ${j.entryNumber}؟`)) {
                      db.deleteJournalEntry(j.id, currentUser.username);
                      reloadData();
                    }
                  }}
                  onPrint={() => {
                    if (journalEntries.length > 0) {
                      handlePrintJournal(journalEntries[0]);
                    }
                  }}
                  addLabel="فتح شاشة الإدخال لقيد جديد"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Cash Vouchers */}
        {activeTab === 'vouchers' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Sub-view Switcher: Entry Screen vs Register List */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setVoucherSubView('entry')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    voucherSubView === 'entry'
                      ? 'bg-[#1B3A5C] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#dfb758]" />
                  <span>شاشة إدخال السند المالي (مباشر)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVoucherSubView('register')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    voucherSubView === 'register'
                      ? 'bg-[#1B3A5C] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-[#dfb758]" />
                  <span>سجل السندات المالية السابقة ({vouchers.length})</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {voucherSubView === 'entry' ? (
                  <span>
                    سند معروض: <strong className="text-[#1B3A5C] font-mono">{voucherForm.voucherNumber}</strong> | التسلسل يبدأ من 1 تلقائياً
                  </span>
                ) : (
                  <span>استعراض كافة سندات الصرف والقبض المسجلة</span>
                )}
              </div>
            </div>

            {/* Sub-View A: Direct Document Entry Screen */}
            {voucherSubView === 'entry' ? (
              <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                {/* 1. Window Header Bar */}
                <div className="bg-[#1B3A5C] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#dfb758]" />
                    <span>
                      شاشة إدخال: {voucherType === 'payment' ? 'سند صرف نقدي / بنكي (Payment Voucher)' : 'سند قبض نقدي / بنكي (Receipt Voucher)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-300">السنة المالية: {activeYear.year}</span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-bold text-white ${
                        voucherType === 'payment' ? 'bg-red-700' : 'bg-emerald-700'
                      }`}
                    >
                      {voucherType === 'payment' ? 'سند صرف' : 'سند قبض'}
                    </span>
                  </div>
                </div>

                {/* 2. THE 7 ERP ACTION BUTTONS INSIDE THE ENTRY SCREEN */}
                <div className="p-2 border-b border-slate-300 bg-slate-50 shrink-0">
                  <ERPActionBar
                    mode={voucherMode}
                    docNumber={voucherForm.voucherNumber}
                    docTitle={voucherType === 'payment' ? 'سند صرف' : 'سند قبض'}
                    onAdd={() => handleOpenAddVoucher(voucherType)}
                    onEdit={() => {
                      setVoucherSubView('entry');
                      setVoucherMode('edit');
                    }}
                    onDelete={handleDeleteActiveVoucher}
                    onSearch={() => setSearchVoucherModalOpen(true)}
                    onSave={() => handleSaveVoucher()}
                    onCancel={handleCancelActiveVoucher}
                    onPrint={() => {
                      const vch: CashVoucher = {
                        id: selectedVoucherId || 'temp',
                        voucherNumber: voucherForm.voucherNumber || '1',
                        type: voucherType,
                        date: voucherForm.date || new Date().toISOString().slice(0, 10),
                        partyName: voucherForm.partyName || '',
                        amount: Number(voucherForm.amount) || 0,
                        paymentMethod: voucherForm.paymentMethod || 'cash',
                        bankCashId: voucherForm.bankCashId || 'bc-1',
                        accountCode: voucherForm.accountCode || '1111',
                        reference: voucherForm.reference || '',
                        description: voucherForm.description || '',
                        financialYear: activeYear.year,
                        createdBy: currentUser.username,
                      };
                      handlePrintVoucher(vch);
                    }}
                    onFirst={handleFirstVoucher}
                    onPrev={handlePrevVoucher}
                    onNext={handleNextVoucher}
                    onLast={handleLastVoucher}
                    canNavigateFirst={currentVoucherIndex > 0}
                    canNavigatePrev={currentVoucherIndex > 0}
                    canNavigateNext={currentVoucherIndex < vouchers.length - 1}
                    canNavigateLast={currentVoucherIndex < vouchers.length - 1}
                    currentRecordIndex={vouchers.length > 0 ? currentVoucherIndex + 1 : 0}
                    totalRecordsCount={vouchers.length}
                    canDelete={!!selectedVoucherId && vouchers.length > 0}
                  />
                </div>

                {/* 3. Document Form Body */}
                <form onSubmit={handleSaveVoucher} className="flex-1 flex flex-col p-4 overflow-auto space-y-4">
                  {/* Voucher Type Selector Toggle */}
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">نوع السند المالي:</span>
                    <button
                      type="button"
                      disabled={voucherMode === 'view'}
                      onClick={() => setVoucherType('receipt')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        voucherType === 'receipt'
                          ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4 text-emerald-300" />
                      <span>سند قبض مالي (استلام أموال)</span>
                    </button>

                    <button
                      type="button"
                      disabled={voucherMode === 'view'}
                      onClick={() => setVoucherType('payment')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        voucherType === 'payment'
                          ? 'bg-red-800 text-white shadow-md ring-2 ring-red-400'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4 text-red-300" />
                      <span>سند صرف مالي (دفع مصاريف / التزامات)</span>
                    </button>
                  </div>

                  {/* Header Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم السند: <span className="text-[11px] text-emerald-700 font-semibold">(تسلسل تلقائي)</span>
                      </label>
                      <input
                        type="text"
                        value={voucherForm.voucherNumber}
                        onChange={(e) => setVoucherForm({ ...voucherForm, voucherNumber: e.target.value })}
                        disabled={voucherMode === 'view'}
                        required
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono font-bold bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ السند:</label>
                      <input
                        type="date"
                        value={voucherForm.date}
                        onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
                        disabled={voucherMode === 'view'}
                        required
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {voucherType === 'payment' ? 'يصرف من حساب الصندوق/البنك:' : 'يقبض في حساب الصندوق/البنك:'}
                      </label>
                      <select
                        value={voucherForm.bankCashId}
                        onChange={(e) => setVoucherForm({ ...voucherForm, bankCashId: e.target.value })}
                        disabled={voucherMode === 'view'}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-bold bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      >
                        {banksCash.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.type === 'cash' ? 'خزينة نقدية' : 'حساب بنكي'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {voucherType === 'payment' ? 'المستلم / المسلّم له (المستفيد):' : 'المقبوض منه (المودع):'}
                      </label>
                      <input
                        type="text"
                        value={voucherForm.partyName}
                        onChange={(e) => setVoucherForm({ ...voucherForm, partyName: e.target.value })}
                        disabled={voucherMode === 'view'}
                        required
                        placeholder="اسم الطرف الآخر كاملاً..."
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-bold bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الحساب المالي المقابل:</label>
                      <select
                        value={voucherForm.accountCode}
                        onChange={(e) => setVoucherForm({ ...voucherForm, accountCode: e.target.value })}
                        disabled={voucherMode === 'view'}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-bold bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      >
                        {accounts.filter((a) => a.isSub).map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع:</label>
                      <select
                        value={voucherForm.paymentMethod}
                        onChange={(e) => setVoucherForm({ ...voucherForm, paymentMethod: e.target.value as any })}
                        disabled={voucherMode === 'view'}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-600 font-bold focus:outline-none focus:border-[#1B3A5C]"
                      >
                        <option value="cash">نقداً من الخزينة</option>
                        <option value="bank">تحويل بنكي فوري</option>
                        <option value="check">شيك مصرفي</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المالي:</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={voucherForm.amount}
                          onChange={(e) => setVoucherForm({ ...voucherForm, amount: Number(e.target.value) })}
                          disabled={voucherMode === 'view'}
                          required
                          className="w-full text-sm px-3 py-2 pl-12 border border-slate-300 rounded font-mono font-black bg-white disabled:bg-slate-100 disabled:text-slate-600 text-[#1B3A5C] focus:outline-none focus:border-[#1B3A5C]"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          {company.defaultCurrency}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الرقم المرجعي / رقم الشيك:</label>
                      <input
                        type="text"
                        value={voucherForm.reference || ''}
                        onChange={(e) => setVoucherForm({ ...voucherForm, reference: e.target.value })}
                        disabled={voucherMode === 'view'}
                        placeholder="رقم الشيك أو المرجع إن وجد..."
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">البيان والشرح:</label>
                      <input
                        type="text"
                        value={voucherForm.description}
                        onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                        disabled={voucherMode === 'view'}
                        required
                        placeholder="وذلك لقاء / سداداً لـ..."
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>
                  </div>

                  {/* Summary & Arabic Tafqeet for Voucher */}
                  <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                    <div className="flex items-center justify-between bg-white p-3 rounded border border-slate-200 mb-3">
                      <div>
                        <span className="text-xs text-slate-500 block">إجمالي مبلغ السند:</span>
                        <span className="text-xl font-black font-mono text-[#1B3A5C]">
                          {(Number(voucherForm.amount) || 0).toLocaleString('ar-SA')} {company.defaultCurrency}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-xs text-slate-500 block">حالة التوثيق:</span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          معتمد ومرحل آلياً للحسابات
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-900">المبلغ كتابةً وتفقيطاً:</span>
                        <span className="font-semibold text-emerald-800">
                          {tafqeet(Number(voucherForm.amount) || 0)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        رقم السند: {voucherForm.voucherNumber} | {voucherType === 'payment' ? 'سند صرف' : 'سند قبض'}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              /* Sub-View B: Register / List Table */
              <div className="flex-1 overflow-hidden">
                <DataGrid
                  title="سندات الصرف والقبض النقدي والبنكي"
                  subtitle="توثيق المدفوعات والمقبوضات النقدية والبنكية مع الطباعة الفورية"
                  data={vouchers}
                  columns={voucherColumns}
                  onAdd={() => handleOpenAddVoucher('payment')}
                  onEdit={(v) => {
                    const idx = vouchers.findIndex((item) => item.id === v.id);
                    if (idx >= 0) setCurrentVoucherIndex(idx);
                    loadVoucherIntoForm(v, 'edit');
                    setVoucherSubView('entry');
                  }}
                  onDelete={(v) => {
                    if (confirm(`هل أنت متأكد من حذف السند رقم ${v.voucherNumber}؟`)) {
                      db.deleteVoucher(v.id, currentUser.username);
                      reloadData();
                    }
                  }}
                  onPrint={() => {
                    if (vouchers.length > 0) {
                      handlePrintVoucher(vouchers[0]);
                    }
                  }}
                  addLabel="فتح شاشة الإدخال لسند جديد"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Financial Reports */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full flex flex-col overflow-hidden">
            {/* Reports Selector Bar */}
            <div className="bg-slate-100 p-3 border-b border-slate-300 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1B3A5C]">اختر التقرير المالي:</span>
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value as any)}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-[#1B3A5C]"
                >
                  <option value="trial_balance">1. ميزان المراجعة بالأرصدة (Trial Balance)</option>
                  <option value="journal_book">2. دفتر اليومية العامة (General Journal)</option>
                  <option value="income_statement">3. قائمة الدخل والأرباح والخسائر (P&L)</option>
                  <option value="balance_sheet">4. الميزانية العمومية والمركز المالي (Balance Sheet)</option>
                </select>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1B3A5C] text-white hover:bg-[#122840] text-xs font-bold rounded shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#dfb758]" />
                <span>طباعة التقرير المالي الحالي</span>
              </button>
            </div>

            {/* Printable Report Viewport */}
            <div className="flex-1 overflow-y-auto p-6 printable-area bg-white">
              {/* Official Letterhead */}
              <PrintHeader
                company={company}
                title={
                  selectedReport === 'trial_balance'
                    ? `ميزان المراجعة بالأرصدة للسنة المالية ${activeYear.year}`
                    : selectedReport === 'income_statement'
                    ? `قائمة الدخل الشامل (الأرباح والخسائر) للسنة ${activeYear.year}`
                    : selectedReport === 'balance_sheet'
                    ? `الميزانية العمومية والمركز المالي كما في 31-12-${activeYear.year}`
                    : `دفتر اليومية العامة للقيود المحاسبية`
                }
              />

              {/* REPORT 1: Trial Balance */}
              {selectedReport === 'trial_balance' && (
                <div>
                  <table className="w-full text-xs text-right border-collapse border border-slate-300">
                    <thead className="bg-[#1B3A5C] text-white">
                      <tr>
                        <th className="border border-slate-700 p-2 w-28">رقم الحساب</th>
                        <th className="border border-slate-700 p-2">اسم الحساب</th>
                        <th className="border border-slate-700 p-2 w-32 text-left">أرصدة مدينة</th>
                        <th className="border border-slate-700 p-2 w-32 text-left">أرصدة دائنة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.filter((a) => a.isSub).map((a) => {
                        const isDebit = a.nature === 'debit';
                        return (
                          <tr key={a.id} className="hover:bg-slate-50 border-b">
                            <td className="border p-2 font-mono">{a.code}</td>
                            <td className="border p-2 font-medium">{a.name}</td>
                            <td className="border p-2 font-mono text-left">{isDebit ? a.balance.toLocaleString('ar-SA') : '-'}</td>
                            <td className="border p-2 font-mono text-left">{!isDebit ? a.balance.toLocaleString('ar-SA') : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold">
                      <tr>
                        <td colSpan={2} className="border p-2 text-center">المجموع العام المتوازن</td>
                        <td className="border p-2 font-mono text-left text-emerald-800">
                          {accounts.filter((a) => a.isSub && a.nature === 'debit').reduce((sum, a) => sum + a.balance, 0).toLocaleString('ar-SA')}
                        </td>
                        <td className="border p-2 font-mono text-left text-emerald-800">
                          {accounts.filter((a) => a.isSub && a.nature === 'credit').reduce((sum, a) => sum + a.balance, 0).toLocaleString('ar-SA')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* REPORT 2: Income Statement (P&L) */}
              {selectedReport === 'income_statement' && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Revenues */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <div className="bg-emerald-800 text-white px-4 py-2 font-bold flex justify-between">
                      <span>أولاً: الإيرادات التشغيلية والمبيعات</span>
                      <span>المبلغ</span>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {accounts.filter((a) => a.category === 'revenue' && a.isSub).map((a) => (
                        <div key={a.id} className="flex justify-between px-4 py-2 text-xs">
                          <span>{a.name} ({a.code})</span>
                          <span className="font-mono font-bold">{a.balance.toLocaleString('ar-SA')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-100 px-4 py-2 text-xs font-bold flex justify-between border-t border-slate-300">
                      <span>إجمالي الإيرادات</span>
                      <span className="font-mono text-emerald-800">
                        {accounts.filter((a) => a.category === 'revenue' && a.isSub).reduce((sum, a) => sum + a.balance, 0).toLocaleString('ar-SA')} {company.defaultCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <div className="bg-red-800 text-white px-4 py-2 font-bold flex justify-between">
                      <span>ثانياً: المصروفات العمومية والإدارية وتكلفة النشاط</span>
                      <span>المبلغ</span>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {accounts.filter((a) => a.category === 'expense' && a.isSub).map((a) => (
                        <div key={a.id} className="flex justify-between px-4 py-2 text-xs">
                          <span>{a.name} ({a.code})</span>
                          <span className="font-mono font-bold">{a.balance.toLocaleString('ar-SA')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-100 px-4 py-2 text-xs font-bold flex justify-between border-t border-slate-300">
                      <span>إجمالي المصروفات</span>
                      <span className="font-mono text-red-800">
                        {accounts.filter((a) => a.category === 'expense' && a.isSub).reduce((sum, a) => sum + a.balance, 0).toLocaleString('ar-SA')} {company.defaultCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Net Profit Summary */}
                  <div className="bg-amber-50 border-2 border-[#c49a37] p-4 rounded-lg flex justify-between items-center text-sm font-bold text-[#1B3A5C]">
                    <span>صافي الربح للفترة المحاسبية:</span>
                    <span className="text-lg font-mono text-emerald-700">
                      {(
                        accounts.filter((a) => a.category === 'revenue' && a.isSub).reduce((sum, a) => sum + a.balance, 0) -
                        accounts.filter((a) => a.category === 'expense' && a.isSub).reduce((sum, a) => sum + a.balance, 0)
                      ).toLocaleString('ar-SA')}{' '}
                      {company.defaultCurrency}
                    </span>
                  </div>
                </div>
              )}

              {/* REPORT 3: Balance Sheet */}
              {selectedReport === 'balance_sheet' && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Right Side: Assets */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <div className="bg-[#1B3A5C] text-white px-4 py-2 font-bold text-center">
                      الأصول (الموجودات)
                    </div>
                    <div className="divide-y divide-slate-200 text-xs">
                      {accounts.filter((a) => a.category === 'asset' && a.isSub).map((a) => (
                        <div key={a.id} className="flex justify-between p-2">
                          <span>{a.name}</span>
                          <span className="font-mono font-bold">{a.balance.toLocaleString('ar-SA')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-100 p-3 text-xs font-bold flex justify-between border-t border-slate-300">
                      <span>مجموع الأصول:</span>
                      <span className="font-mono text-emerald-800">
                        {accounts.filter((a) => a.category === 'asset' && a.isSub).reduce((sum, a) => sum + a.balance, 0).toLocaleString('ar-SA')}
                      </span>
                    </div>
                  </div>

                  {/* Left Side: Liabilities & Equity */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <div className="bg-[#1B3A5C] text-white px-4 py-2 font-bold text-center">
                      الخصوم وحقوق الملكية (المطلوبات)
                    </div>
                    <div className="divide-y divide-slate-200 text-xs">
                      <div className="bg-slate-50 px-2 py-1 font-bold text-slate-700">الخصوم والالتزامات:</div>
                      {accounts.filter((a) => a.category === 'liability' && a.isSub).map((a) => (
                        <div key={a.id} className="flex justify-between p-2">
                          <span>{a.name}</span>
                          <span className="font-mono font-bold">{a.balance.toLocaleString('ar-SA')}</span>
                        </div>
                      ))}
                      <div className="bg-slate-50 px-2 py-1 font-bold text-slate-700">حقوق الملكية:</div>
                      {accounts.filter((a) => a.category === 'equity' && a.isSub).map((a) => (
                        <div key={a.id} className="flex justify-between p-2">
                          <span>{a.name}</span>
                          <span className="font-mono font-bold">{a.balance.toLocaleString('ar-SA')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-100 p-3 text-xs font-bold flex justify-between border-t border-slate-300">
                      <span>مجموع الخصوم وحقوق الملكية:</span>
                      <span className="font-mono text-emerald-800">
                        {(
                          accounts.filter((a) => a.category === 'liability' && a.isSub).reduce((sum, a) => sum + a.balance, 0) +
                          accounts.filter((a) => a.category === 'equity' && a.isSub).reduce((sum, a) => sum + a.balance, 0)
                        ).toLocaleString('ar-SA')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT 4: General Journal */}
              {selectedReport === 'journal_book' && (
                <div className="space-y-6">
                  {journalEntries.map((je) => (
                    <div key={je.id} className="border border-slate-300 rounded overflow-hidden text-xs">
                      <div className="bg-slate-100 p-2.5 flex justify-between items-center font-bold">
                        <span className="text-[#1B3A5C]">قيد رقم: {je.entryNumber}</span>
                        <span>التاريخ: <span className="font-mono">{je.date}</span></span>
                        <span>البيان: {je.description}</span>
                      </div>
                      <table className="w-full text-xs text-right border-collapse">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="p-1.5 border-l">رقم الحساب</th>
                            <th className="p-1.5 border-l">اسم الحساب</th>
                            <th className="p-1.5 border-l text-left">مدين</th>
                            <th className="p-1.5 border-l text-left">دائن</th>
                            <th className="p-1.5">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {je.lines.map((l, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-1.5 font-mono border-l">{l.accountCode}</td>
                              <td className="p-1.5 border-l">{l.accountName}</td>
                              <td className="p-1.5 font-mono border-l text-left">{l.debit > 0 ? l.debit.toLocaleString('ar-SA') : '-'}</td>
                              <td className="p-1.5 font-mono border-l text-left">{l.credit > 0 ? l.credit.toLocaleString('ar-SA') : '-'}</td>
                              <td className="p-1.5 text-slate-500">{l.note || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}

              {/* Official Signatures for Auditing and Archiving */}
              <div className="printable-signatures mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs font-semibold text-slate-700">
                <div>
                  <p>المحاسب المسؤول</p>
                  <p className="mt-6 font-mono text-[11px] text-slate-500">..............................</p>
                </div>
                <div>
                  <p>المراجع المالي الداخلي</p>
                  <p className="mt-6 font-mono text-[11px] text-slate-500">..............................</p>
                </div>
                <div>
                  <p>المدير المالي والاعتماد</p>
                  <p className="mt-6 font-mono text-[11px] text-slate-500">..............................</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Yemeni Tax & Zakat Compliance */}
        {activeTab === 'tax_zakat' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full flex flex-col overflow-hidden p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-[#1B3A5C]">وحدة الحسابات والضرائب والزكاة (الجمهورية اليمنية)</h3>
                <p className="text-xs text-slate-500">حساب وضبط الضرائب التجارية وضريبة المبيعات والزكاة الشرعية وفقاً للقوانين النافذة</p>
              </div>
              <button
                onClick={() => {
                  setPrintTitle('إقرار الضرائب والزكاة الشامل - الجمهورية اليمنية');
                  setPrintDocNumber('TAX-ZAKAT-2026');
                  setPrintContent(
                    <div className="space-y-4 text-xs">
                      <div className="bg-slate-50 p-4 rounded border space-y-2">
                        <div className="font-bold text-[#1B3A5C]">بيانات المنشأة الضريبية:</div>
                        <div>اسم المنشأة: {company.name}</div>
                        <div>الرقم الضريبي: {company.taxNumber}</div>
                        <div>السجل التجاري: {company.crNumber || 'غير محدد'}</div>
                      </div>
                      <table className="w-full text-xs text-right border-collapse border border-slate-300">
                        <thead className="bg-[#1B3A5C] text-white">
                          <tr>
                            <th className="border p-2">نوع الوعاء الضريبي / الزكوي</th>
                            <th className="border p-2">الوعاء الخاضع (المبلغ)</th>
                            <th className="border p-2">النسبة القانونية</th>
                            <th className="border p-2 text-left">المبلغ المستحق (ريال/عملة)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border p-2 font-bold">1. ضريبة المبيعات العامة</td>
                            <td className="border p-2 font-mono">
                              {accounts.filter(a => a.category === 'revenue' && a.isSub).reduce((s, a) => s + a.balance, 0).toLocaleString('ar-SA')}
                            </td>
                            <td className="border p-2">5%</td>
                            <td className="border p-2 font-mono text-left font-bold text-red-800">
                              {(accounts.filter(a => a.category === 'revenue' && a.isSub).reduce((s, a) => s + a.balance, 0) * 0.05).toLocaleString('ar-SA')}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2 font-bold">2. ضريبة أرباح تجارية وصناعية (منبع)</td>
                            <td className="border p-2 font-mono">
                              {accounts.filter(a => a.category === 'revenue' && a.isSub).reduce((s, a) => s + a.balance, 0).toLocaleString('ar-SA')}
                            </td>
                            <td className="border p-2">2.5%</td>
                            <td className="border p-2 font-mono text-left font-bold text-red-800">
                              {(accounts.filter(a => a.category === 'revenue' && a.isSub).reduce((s, a) => s + a.balance, 0) * 0.025).toLocaleString('ar-SA')}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2 font-bold">3. وعاء زكاة المال (رأس المال العامل + النقدية والمخزون)</td>
                            <td className="border p-2 font-mono">
                              {accounts.filter(a => a.category === 'asset' && a.isSub).reduce((s, a) => s + a.balance, 0).toLocaleString('ar-SA')}
                            </td>
                            <td className="border p-2">2.5%</td>
                            <td className="border p-2 font-mono text-left font-bold text-emerald-800">
                              {(accounts.filter(a => a.category === 'asset' && a.isSub).reduce((s, a) => s + a.balance, 0) * 0.025).toLocaleString('ar-SA')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                  setIsPrintModalOpen(true);
                }}
                className="px-4 py-2 bg-[#1B3A5C] text-white text-xs font-bold rounded flex items-center gap-1.5 hover:bg-[#122840] cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#dfb758]" />
                <span>طباعة إقرار الضرائب والزكاة الرسمي</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                <div className="text-xs font-bold text-blue-900">إقرار ضريبة المبيعات (5%)</div>
                <div className="text-xl font-mono font-black text-[#1B3A5C]">
                  {(accounts.filter(a => a.category === 'revenue' && a.isSub).reduce((s, a) => s + a.balance, 0) * 0.05).toLocaleString('ar-SA')} {company.defaultCurrency}
                </div>
                <p className="text-[11px] text-blue-700">محسوبة آلياً بنسبة 5% من إجمالي الإيرادات والمبيعات الخاضعة للضريبة.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-2">
                <div className="text-xs font-bold text-amber-900">ضريبة الأرباح التجارية والصناعية</div>
                <div className="text-xl font-mono font-black text-amber-800">
                  {(accounts.filter(a => a.category === 'revenue' && a.isSub).reduce((s, a) => s + a.balance, 0) * 0.025).toLocaleString('ar-SA')} {company.defaultCurrency}
                </div>
                <p className="text-[11px] text-amber-700">استقطاعات ضريبة المنبع وفقاً للقانون الضريبي اليمني المعمول به.</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg space-y-2">
                <div className="text-xs font-bold text-emerald-900">زكاة المال الشرعية (2.5%)</div>
                <div className="text-xl font-mono font-black text-emerald-800">
                  {(accounts.filter(a => a.category === 'asset' && a.isSub).reduce((s, a) => s + a.balance, 0) * 0.025).toLocaleString('ar-SA')} {company.defaultCurrency}
                </div>
                <p className="text-[11px] text-emerald-700">محسوبة على إجمالي الأصول النقدية والمخزون والعاملة بنسبة 2.5%.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: Period Closings (Monthly & Annual) */}
        {activeTab === 'period_closing' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full flex flex-col overflow-hidden p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-[#1B3A5C] flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#dfb758]" />
                  <span>إدارة الإقفال الشهري والإقفال السنوي للفترات المالية</span>
                </h3>
                <p className="text-xs text-slate-500">إقفال الشهور المحاسبية والسنوات المالية لمنع التعديل على المعاملات المقفلة وضمان دقة النتائج الختامية</p>
              </div>
              <div className="text-left bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <span className="text-xs text-slate-600 block">السنة المالية النشطة:</span>
                <span className="text-sm font-extrabold text-[#1B3A5C] font-mono">{activeYear.year}</span>
              </div>
            </div>

            {/* Annual Closing Card */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#1B3A5C]" />
                    <span>إقفال السنة المالية السنوي ({activeYear.year})</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">ترحيل الأرباح والخسائر وحسابات النتيجة وإقفال السنة بالكامل.</p>
                </div>
                <div>
                  {closedYears.includes(activeYear.year) ? (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-600"></span>
                      السنة مغلقة بالكامل
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      السنة المالية مفتوحة
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-slate-600">
                  {closedYears.includes(activeYear.year) ? (
                    <span>هذه السنة مقفلة رسمياً. لا يمكن إضافة قيود جديدة تخصها إلا بعد إعادة فتح السنة.</span>
                  ) : (
                    <span>تأكد من مراجعة ميزان المراجعة وقائمة الدخل قبل إقفال السنة المالية.</span>
                  )}
                </div>
                <div>
                  {closedYears.includes(activeYear.year) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من إعادة فتح السنة المالية ${activeYear.year}؟`)) {
                          db.reopenYear(activeYear.year, currentUser.username);
                          reloadData();
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 rounded-lg cursor-pointer"
                    >
                      إلغاء الإقفال السنوي (فتح السنة)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const valCheck = PeriodClosureService.validatePeriodClosure(String(activeYear.year), true);
                        if (!valCheck.isReady) {
                          alert(`عذراً، لا يمكن إقفال السنة المالية ${activeYear.year} لوجود مستندات غير مرحلة أو مسودات (${valCheck.totalUnpostedCount} مستند).\nيرجى اعتماد وترحيل المستندات أولاً.`);
                          return;
                        }
                        if (confirm(`تحذير: هل أنت متأكد من إقفال السنة المالية ${activeYear.year}؟`)) {
                          db.closeYear(activeYear.year, currentUser.username);
                          reloadData();
                          alert(`تم إقفال السنة المالية ${activeYear.year} وترحيل الحسابات بنجاح!`);
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold bg-[#1B3A5C] text-white hover:bg-[#122840] rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4 text-[#dfb758]" />
                      <span>إقفال السنة المالية الحالية وترحيل الحسابات</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Closing Table Card */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#1B3A5C]" />
                <span>جدول الإقفال الشهري للسنة المالية ({activeYear.year})</span>
              </h4>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 border-l border-slate-200">الشهر</th>
                      <th className="p-2.5 border-l border-slate-200">رمز الفترة</th>
                      <th className="p-2.5 border-l border-slate-200">الحالة</th>
                      <th className="p-2.5 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((mNum, idx) => {
                      const periodKey = `${activeYear.year}-${mNum}`;
                      const monthName = [
                        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
                      ][idx];
                      const isClosed = closedMonths.includes(periodKey);

                      return (
                        <tr key={periodKey} className="hover:bg-blue-50/50 transition-colors border-t border-slate-200">
                          <td className="p-2.5 font-bold text-slate-800 border-l border-slate-200 flex items-center gap-2">
                            <span className="font-mono text-slate-400">{mNum}</span>
                            <span>{monthName} {activeYear.year}</span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 border-l border-slate-200">{periodKey}</td>
                          <td className="p-2.5 border-l border-slate-200">
                            {isClosed ? (
                              <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded text-[11px] font-bold">مقفل</span>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold">مفتوح</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {isClosed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  db.reopenMonth(periodKey, currentUser.username);
                                  reloadData();
                                }}
                                className="px-3 py-1 bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 rounded cursor-pointer"
                              >
                                إلغاء الإقفال (فتح)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const valCheck = PeriodClosureService.validatePeriodClosure(periodKey, false);
                                  if (!valCheck.isReady) {
                                    alert(`عذراً، لا يمكن إقفال شهر ${monthName} لوجود مستندات غير مرحلة أو مسودات (${valCheck.totalUnpostedCount} مستند).\nيرجى اعتماد وترحيل المستندات أولاً.`);
                                    return;
                                  }
                                  if (confirm(`هل أنت متأكد من إقفال شهر ${monthName} ${activeYear.year}؟`)) {
                                    db.closeMonth(periodKey, currentUser.username);
                                    reloadData();
                                  }
                                }}
                                className="px-3 py-1 bg-[#1B3A5C] text-white text-[11px] font-bold hover:bg-[#122840] rounded cursor-pointer"
                              >
                                إقفال الشهر
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Modal: Add/Edit Account --- */}
      <Modal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title={editingAccount ? `تعديل الحساب ${editingAccount.code}` : 'إضافة حساب جديد إلى دليل الحسابات'}
      >
        <form onSubmit={handleSaveAccount} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم / كود الحساب:</label>
              <input
                type="text"
                value={accountForm.code}
                onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                placeholder="مثال: 1114"
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الحساب الأب (الرئيسي):</label>
              <select
                value={accountForm.parentCode || ''}
                onChange={(e) => setAccountForm({ ...accountForm, parentCode: e.target.value || null })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              >
                <option value="">بدون أب (حساب رئيسي أعلى مستوى)</option>
                {accounts.filter((a) => !a.isSub).map((a) => (
                  <option key={a.id} value={a.code}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم الحساب (عربي):</label>
            <input
              type="text"
              value={accountForm.name}
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              placeholder="مثال: بنك الجزيرة - حساب جاري"
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-bold"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف المحاسبي:</label>
              <select
                value={accountForm.category}
                onChange={(e) => setAccountForm({ ...accountForm, category: e.target.value as any })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                <option value="asset">أصول (Assets)</option>
                <option value="liability">خصوم (Liabilities)</option>
                <option value="equity">حقوق ملكية (Equity)</option>
                <option value="revenue">إيرادات (Revenues)</option>
                <option value="expense">مصروفات (Expenses)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طبيعة الحساب:</label>
              <select
                value={accountForm.nature}
                onChange={(e) => setAccountForm({ ...accountForm, nature: e.target.value as any })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                <option value="debit">مدين (Debit)</option>
                <option value="credit">دائن (Credit)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحساب:</label>
              <select
                value={accountForm.isSub ? 'sub' : 'main'}
                onChange={(e) => setAccountForm({ ...accountForm, isSub: e.target.value === 'sub' })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-bold"
              >
                <option value="sub">فرعي (يقبل القيود)</option>
                <option value="main">رئيسي تجميعي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عملة الحساب:</label>
              <input
                type="text"
                value={accountForm.currency}
                onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الافتتاحي:</label>
              <input
                type="number"
                value={accountForm.balance || 0}
                onChange={(e) => setAccountForm({ ...accountForm, balance: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAccountModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ الحساب
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal: Add/Edit Bank/Cash --- */}
      <Modal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        title={editingBank ? `تعديل ${editingBank.name}` : 'إضافة حساب بنكي أو صندوق نقدي جديد'}
      >
        <form onSubmit={handleSaveBank} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الكود التعريفي:</label>
              <input
                type="text"
                value={bankForm.code}
                onChange={(e) => setBankForm({ ...bankForm, code: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">النوع:</label>
              <select
                value={bankForm.type}
                onChange={(e) => setBankForm({ ...bankForm, type: e.target.value as any })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                <option value="bank">حساب بنكي</option>
                <option value="cash">صندوق نقدي (خزينة)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل:</label>
            <input
              type="text"
              value={bankForm.name}
              onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
              placeholder="مثال: مصرف الإنماء - الحساب الرئيسي"
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الحساب المصرفي / الآيبان (IBAN):</label>
            <input
              type="text"
              value={bankForm.accountNumber || ''}
              onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
              placeholder="SA..."
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الحساب المرتبط بدليل الحسابات:</label>
              <select
                value={bankForm.accountCode}
                onChange={(e) => setBankForm({ ...bankForm, accountCode: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              >
                {accounts.filter((a) => a.isSub && a.code.startsWith('111')).map((a) => (
                  <option key={a.id} value={a.code}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الافتتاحي:</label>
              <input
                type="number"
                value={bankForm.openingBalance || 0}
                onChange={(e) => setBankForm({ ...bankForm, openingBalance: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBankModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal: Add Journal Entry --- */}
      <Modal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        title={journalMode === 'edit' ? `تعديل قيد يومية رقم ${journalForm.entryNumber}` : "إنشاء قيد يومية محاسبي مزدوج جديد"}
        width="4xl"
      >
        {/* Unified 7-Button Toolbar inside Journal Entry Screen */}
        <ERPActionBar
          mode={journalMode}
          docNumber={journalForm.entryNumber}
          docTitle="قيد اليومية"
          onAdd={handleOpenAddJournal}
          onEdit={() => setJournalMode('edit')}
          onDelete={() => {
            if (selectedJournalId && confirm(`هل أنت متأكد من حذف قيد اليومية رقم ${journalForm.entryNumber}؟`)) {
              db.deleteJournalEntry(selectedJournalId, currentUser.username);
              reloadData();
              setJournalModalOpen(false);
            }
          }}
          canDelete={!!selectedJournalId}
          onSave={() => handleSaveJournal()}
          onCancel={() => setJournalModalOpen(false)}
          onPrint={() => {
            const sumDebit = journalForm.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
            const sumCredit = journalForm.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
            handlePrintJournal({
              id: selectedJournalId || 'temp',
              entryNumber: journalForm.entryNumber,
              date: journalForm.date,
              reference: journalForm.reference,
              description: journalForm.description,
              debitTotal: sumDebit,
              creditTotal: sumCredit,
              financialYear: activeYear.year,
              createdBy: currentUser.username,
              createdAt: new Date().toISOString(),
              lines: journalForm.lines,
            });
          }}
          className="mb-3"
        />

        <form onSubmit={handleSaveJournal} className="space-y-4">
          {journalError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{journalError}</span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded border">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم القيد:</label>
              <input
                type="text"
                value={journalForm.entryNumber}
                onChange={(e) => setJournalForm({ ...journalForm, entryNumber: e.target.value })}
                required
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ القيد:</label>
              <input
                type="date"
                value={journalForm.date}
                onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                required
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">المرجع / المستند المؤيد:</label>
              <input
                type="text"
                value={journalForm.reference}
                onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
                placeholder="رقم الشيك أو الفاتورة المؤيدة"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">البيان العام للقيد:</label>
              <input
                type="text"
                value={journalForm.description}
                onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                placeholder="أدخل بياناً محاسبياً وافياً للعملية..."
                required
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
              />
            </div>
          </div>

          {/* Journal Entry Lines */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-[#1B3A5C] text-white p-2 text-xs font-bold flex justify-between items-center">
              <span>أطراف القيد المحاسبي (مدين / دائن)</span>
              <button
                type="button"
                onClick={handleAddJournalLine}
                className="px-2.5 py-1 bg-[#c49a37] hover:bg-[#dfb758] text-[#122840] font-black rounded text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة طرف جديد</span>
              </button>
            </div>

            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="p-2 border-l w-64">الحساب</th>
                  <th className="p-2 border-l w-32">مدين</th>
                  <th className="p-2 border-l w-32">دائن</th>
                  <th className="p-2 border-l">البيان الفرعي (ملاحظة)</th>
                  <th className="p-2 w-12 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {journalForm.lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="p-1.5 border-l">
                      <select
                        value={line.accountCode}
                        onChange={(e) => handleJournalLineChange(idx, 'accountCode', e.target.value)}
                        className="w-full text-xs p-1 border border-slate-300 rounded"
                      >
                        {accounts.filter((a) => a.isSub).map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-1.5 border-l">
                      <input
                        type="number"
                        step="0.01"
                        value={line.debit || ''}
                        onChange={(e) => handleJournalLineChange(idx, 'debit', Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-left"
                      />
                    </td>

                    <td className="p-1.5 border-l">
                      <input
                        type="number"
                        step="0.01"
                        value={line.credit || ''}
                        onChange={(e) => handleJournalLineChange(idx, 'credit', Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-left"
                      />
                    </td>

                    <td className="p-1.5 border-l">
                      <input
                        type="text"
                        value={line.note || ''}
                        onChange={(e) => handleJournalLineChange(idx, 'note', e.target.value)}
                        placeholder="ملاحظة..."
                        className="w-full text-xs p-1 border border-slate-300 rounded"
                      />
                    </td>

                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveJournalLine(idx)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td className="p-2 border-l text-center font-bold">المجموع الكلي للقيد</td>
                  <td className="p-2 border-l font-mono text-left text-emerald-800 font-bold">{totalDebit.toFixed(2)}</td>
                  <td className="p-2 border-l font-mono text-left text-emerald-800 font-bold">{totalCredit.toFixed(2)}</td>
                  <td colSpan={2} className="p-2 text-center">
                    {isJournalBalanced ? (
                      <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>القيد متزن تماماً</span>
                      </span>
                    ) : (
                      <span className="text-red-700 font-bold flex items-center justify-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>الفرق: {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setJournalModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isJournalBalanced}
              className={`px-5 py-2 text-xs font-bold rounded flex items-center gap-1.5 ${
                isJournalBalanced
                  ? 'bg-[#1B3A5C] text-white hover:bg-[#122840]'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>ترحيل وحفظ القيد</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal: Add Cash Voucher --- */}
      <Modal
        isOpen={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        title={voucherMode === 'edit' ? `تعديل السند رقم ${voucherForm.voucherNumber}` : (voucherType === 'payment' ? 'تحرير سند صرف جديد' : 'تحرير سند قبض جديد')}
      >
        {/* Unified 7-Button Toolbar inside Voucher Screen */}
        <ERPActionBar
          mode={voucherMode}
          docNumber={voucherForm.voucherNumber}
          docTitle={voucherType === 'payment' ? 'سند صرف' : 'سند قبض'}
          onAdd={() => handleOpenAddVoucher(voucherType)}
          onEdit={() => setVoucherMode('edit')}
          onDelete={() => {
            if (selectedVoucherId && confirm(`هل أنت متأكد من حذف السند رقم ${voucherForm.voucherNumber}؟`)) {
              db.deleteVoucher(selectedVoucherId, currentUser.username);
              reloadData();
              setVoucherModalOpen(false);
            }
          }}
          canDelete={!!selectedVoucherId}
          onSave={() => handleSaveVoucher()}
          onCancel={() => setVoucherModalOpen(false)}
          onPrint={() => {
            handlePrintVoucher({
              id: selectedVoucherId || 'temp',
              voucherNumber: voucherForm.voucherNumber || '1',
              type: voucherType,
              date: voucherForm.date || '',
              partyName: voucherForm.partyName || '',
              amount: voucherForm.amount || 0,
              paymentMethod: voucherForm.paymentMethod || 'cash',
              bankCashId: voucherForm.bankCashId || 'bc-1',
              accountCode: voucherForm.accountCode || '1111',
              reference: voucherForm.reference || '',
              description: voucherForm.description || '',
              financialYear: activeYear.year,
              createdBy: currentUser.username,
            });
          }}
          className="mb-3"
        />

        <form onSubmit={handleSaveVoucher} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم السند:</label>
              <input
                type="text"
                value={voucherForm.voucherNumber}
                onChange={(e) => setVoucherForm({ ...voucherForm, voucherNumber: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ:</label>
              <input
                type="date"
                value={voucherForm.date}
                onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {voucherType === 'payment' ? 'يُصرف إلى السيد / الجهة:' : 'المستلم منه (العميل / الدافع):'}
            </label>
            <input
              type="text"
              value={voucherForm.partyName}
              onChange={(e) => setVoucherForm({ ...voucherForm, partyName: e.target.value })}
              placeholder="الاسم الكامل للشخص أو الشركة"
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المطلوب:</label>
              <input
                type="number"
                step="0.01"
                value={voucherForm.amount || 0}
                onChange={(e) => setVoucherForm({ ...voucherForm, amount: Number(e.target.value) })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع:</label>
              <select
                value={voucherForm.paymentMethod}
                onChange={(e) => setVoucherForm({ ...voucherForm, paymentMethod: e.target.value as any })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                <option value="cash">نقداً من الخزينة</option>
                <option value="bank">تحويل بنكي</option>
                <option value="cheque">شيك مصرفي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الصندوق أو البنك المنفذ:</label>
              <select
                value={voucherForm.bankCashId}
                onChange={(e) => setVoucherForm({ ...voucherForm, bankCashId: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                {banksCash.map((bc) => (
                  <option key={bc.id} value={bc.id}>
                    {bc.name} ({bc.currentBalance.toLocaleString('ar-SA')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الحساب المقابل:</label>
              <select
                value={voucherForm.accountCode}
                onChange={(e) => setVoucherForm({ ...voucherForm, accountCode: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                {accounts.filter((a) => a.isSub).map((a) => (
                  <option key={a.id} value={a.code}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">البيان والشرح:</label>
            <textarea
              rows={2}
              value={voucherForm.description || ''}
              onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
              placeholder="سبب الصرف أو القبض بالتفصيل..."
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setVoucherModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              اعتماد السند وحفظه
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Quick Search & Select Journal Entry Modal --- */}
      <Modal
        isOpen={searchJournalModalOpen}
        onClose={() => setSearchJournalModalOpen(false)}
        title="بحث واستدعاء قيد اليومية إلى شاشة الإدخال"
        width="2xl"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={journalSearchTerm}
              onChange={(e) => setJournalSearchTerm(e.target.value)}
              placeholder="ابحث برقم القيد، البيان، التاريخ، أو المبلغ..."
              className="w-full text-xs pr-9 pl-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] text-slate-800"
            />
          </div>

          <div className="border border-slate-300 rounded overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-[#1B3A5C] text-white sticky top-0">
                <tr>
                  <th className="p-2 border-l border-slate-700">رقم القيد</th>
                  <th className="p-2 border-l border-slate-700">التاريخ</th>
                  <th className="p-2 border-l border-slate-700">البيان</th>
                  <th className="p-2 border-l border-slate-700 text-left">إجمالي القيد</th>
                  <th className="p-2 text-center w-24">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {journalEntries
                  .filter((j) => {
                    if (!journalSearchTerm.trim()) return true;
                    const term = journalSearchTerm.toLowerCase();
                    return (
                      j.entryNumber.toLowerCase().includes(term) ||
                      j.description.toLowerCase().includes(term) ||
                      j.date.includes(term) ||
                      j.debitTotal.toString().includes(term)
                    );
                  })
                  .map((j) => (
                    <tr key={j.id} className="hover:bg-blue-50/70 transition-colors">
                      <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">
                        {j.entryNumber}
                      </td>
                      <td className="p-2 font-mono border-l border-slate-200">{j.date}</td>
                      <td className="p-2 font-bold text-slate-800 border-l border-slate-200">{j.description}</td>
                      <td className="p-2 font-mono font-bold text-emerald-800 text-left border-l border-slate-200">
                        {j.debitTotal.toLocaleString('ar-SA')} {company.defaultCurrency}
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const idx = journalEntries.findIndex((item) => item.id === j.id);
                            if (idx >= 0) setCurrentJournalIndex(idx);
                            loadJournalIntoForm(j, 'view');
                            setJournalSubView('entry');
                            setSearchJournalModalOpen(false);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#1B3A5C] text-white hover:bg-[#122840] rounded cursor-pointer"
                        >
                          استدعاء
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* --- Quick Search & Select Cash Voucher Modal --- */}
      <Modal
        isOpen={searchVoucherModalOpen}
        onClose={() => setSearchVoucherModalOpen(false)}
        title="بحث واستدعاء سند مالي إلى شاشة الإدخال"
        width="2xl"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={voucherSearchTerm}
              onChange={(e) => setVoucherSearchTerm(e.target.value)}
              placeholder="ابحث برقم السند، اسم الطرف، البيان، أو المبلغ..."
              className="w-full text-xs pr-9 pl-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] text-slate-800"
            />
          </div>

          <div className="border border-slate-300 rounded overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-[#1B3A5C] text-white sticky top-0">
                <tr>
                  <th className="p-2 border-l border-slate-700">رقم السند</th>
                  <th className="p-2 border-l border-slate-700">النوع</th>
                  <th className="p-2 border-l border-slate-700">التاريخ</th>
                  <th className="p-2 border-l border-slate-700">الطرف / المستفيد</th>
                  <th className="p-2 border-l border-slate-700 text-left">المبلغ</th>
                  <th className="p-2 text-center w-24">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vouchers
                  .filter((v) => {
                    if (!voucherSearchTerm.trim()) return true;
                    const term = voucherSearchTerm.toLowerCase();
                    return (
                      v.voucherNumber.toLowerCase().includes(term) ||
                      v.partyName.toLowerCase().includes(term) ||
                      v.description.toLowerCase().includes(term) ||
                      v.date.includes(term) ||
                      v.amount.toString().includes(term)
                    );
                  })
                  .map((v) => (
                    <tr key={v.id} className="hover:bg-blue-50/70 transition-colors">
                      <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">
                        {v.voucherNumber}
                      </td>
                      <td className="p-2 border-l border-slate-200">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                            v.type === 'payment' ? 'bg-red-700' : 'bg-emerald-700'
                          }`}
                        >
                          {v.type === 'payment' ? 'صرف' : 'قبض'}
                        </span>
                      </td>
                      <td className="p-2 font-mono border-l border-slate-200">{v.date}</td>
                      <td className="p-2 font-bold text-slate-800 border-l border-slate-200">{v.partyName}</td>
                      <td className="p-2 font-mono font-bold text-emerald-800 text-left border-l border-slate-200">
                        {v.amount.toLocaleString('ar-SA')} {company.defaultCurrency}
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const idx = vouchers.findIndex((item) => item.id === v.id);
                            if (idx >= 0) setCurrentVoucherIndex(idx);
                            loadVoucherIntoForm(v, 'view');
                            setVoucherSubView('entry');
                            setSearchVoucherModalOpen(false);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#1B3A5C] text-white hover:bg-[#122840] rounded cursor-pointer"
                        >
                          استدعاء
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* --- Print Preview Modal with Official Letterhead --- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="معاينة المستند الرسمي للطباعة"
        width="4xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إغلاق
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-[#dfb758]" />
              <span>طباعة المستند الآن (Ctrl+P)</span>
            </button>
          </div>
        }
      >
        <div className="printable-area bg-white p-4">
          <PrintHeader company={company} title={printTitle} docNumber={printDocNumber} />
          {printContent}
        </div>
      </Modal>

      {/* --- Source Document Drill-Down Modal --- */}
      <SourceDocumentModal
        isOpen={Boolean(drillDownDocRef)}
        onClose={() => setDrillDownDocRef(null)}
        documentRef={drillDownDocRef || ''}
        currentUser={currentUser}
        onDocumentCancelled={() => {
          reloadData();
        }}
      />

      {/* --- Journal Reversal Modal --- */}
      {reversalModalOpen && reversalTargetEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-300">
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
              <RotateCcw className="w-5 h-5" />
              <span>إلغاء وعكس قيد اليومية رقم #{reversalTargetEntry.entryNumber}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              وفقاً لقواعد المحاسبة المالية والرقابة (قاعدة 6 و 7)، لا يتم حذف القيود المرحلة نهائياً بل يتم توليد <strong>قيد محاسبي عكسي</strong> لتصفير الأثر المالي للأطراف المدينة والدائنة مع تسجيل سبب العملية في سجل الرقابة (Audit Log).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سبب عكس القيد (إلزامي للتدقيق):</label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="اكتب سبب عكس القيد بالتفصيل..."
                rows={3}
                className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-red-600"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReversalModalOpen(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!reversalReason.trim()) {
                    alert('يرجى كتابة سبب عكس القيد.');
                    return;
                  }
                  const res = db.reverseJournalEntry(reversalTargetEntry.id, reversalReason, currentUser.username);
                  if (res.success) {
                    alert(res.message);
                    setReversalModalOpen(false);
                    setReversalReason('');
                    reloadData();
                  } else {
                    alert(res.message);
                  }
                }}
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-bold cursor-pointer shadow-xs"
              >
                تأكيد إنشاء القيد العكسي الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
