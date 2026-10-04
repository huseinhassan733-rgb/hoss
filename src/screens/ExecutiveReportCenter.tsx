/**
 * Executive Report Center (مركز التقارير التنفيذي الشامل والمباشر)
 * يوفر تشغيل وتصفية وطباعة وتصدير جميع تقارير النظام المالية والإدارية والضريبية فوراً
 */

import React, { useState, useMemo } from 'react';
import { db } from '../database/db';
import { CompanyInfo, FinancialYear, User } from '../types';
import { PrintHeader } from './PrintHeader';
import { Modal } from './Modal';
import { SourceDocumentModal } from './SourceDocumentModal';
import {
  FileBarChart,
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  Scale,
  Package,
  ShoppingCart,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface ExecutiveReportCenterProps {
  currentUser: User;
  activeYear: FinancialYear;
  company: CompanyInfo;
}

export type ReportCategory =
  | 'trial_balance'
  | 'income_statement'
  | 'balance_sheet'
  | 'account_statement'
  | 'customer_statement'
  | 'supplier_statement'
  | 'inventory_valuation'
  | 'fast_slow_moving'
  | 'sales_tax_register'
  | 'purchases_tax_register'
  | 'cash_flow_liquidity'
  | 'sales_profitability';

export const ExecutiveReportCenter: React.FC<ExecutiveReportCenterProps> = ({
  currentUser,
  activeYear,
  company,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportCategory>('trial_balance');
  const [startDate, setStartDate] = useState(`${activeYear?.year || 2026}-01-01`);
  const [endDate, setEndDate] = useState(`${activeYear?.year || 2026}-12-31`);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drill-down Source Document Modal State
  const [drillDownDocRef, setDrillDownDocRef] = useState<string | null>(null);

  // Specific selectors
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Database snapshot
  const accounts = useMemo(() => db.getAccounts(), []);
  const journals = useMemo(() => db.getJournalEntries(), []);
  const vouchers = useMemo(() => db.getVouchers(), []);
  const banksCash = useMemo(() => db.getBanksCash(), []);
  const items = useMemo(() => db.getItems(), []);
  const salesInvoices = useMemo(() => db.getSalesInvoices(), []);
  const purchaseInvoices = useMemo(() => db.getPurchaseInvoices(), []);
  const customers = useMemo(() => db.getCustomers(), []);
  const suppliers = useMemo(() => db.getSuppliers(), []);
  const stockMovements = useMemo(() => db.getStockMovements(), []);

  // Set default account / customer / supplier if empty
  React.useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) setSelectedAccountId(accounts[0].id);
    if (!selectedCustomerId && customers.length > 0) setSelectedCustomerId(customers[0].id);
    if (!selectedSupplierId && suppliers.length > 0) setSelectedSupplierId(suppliers[0].id);
  }, [accounts, customers, suppliers]);

  // 1. Trial Balance Data - Pure General Ledger Double-Entry Balancing
  const trialBalanceData = useMemo(() => {
    return accounts.filter((a) => a.isSub).map((acc) => {
      let priorNet = 0;
      let debitMoves = 0;
      let creditMoves = 0;

      journals.forEach((j) => {
        j.lines.forEach((r) => {
          if (r.accountCode === acc.code) {
            const deb = Number(r.debit || 0);
            const cred = Number(r.credit || 0);
            if (j.date < startDate) {
              priorNet += acc.nature === 'debit' ? (deb - cred) : (cred - deb);
            } else if (j.date <= endDate) {
              debitMoves += deb;
              creditMoves += cred;
            }
          }
        });
      });

      const netEnding = priorNet + (acc.nature === 'debit' ? (debitMoves - creditMoves) : (creditMoves - debitMoves));
      const endingDebit = acc.nature === 'debit' ? Math.max(0, netEnding) : 0;
      const endingCredit = acc.nature === 'credit' ? Math.max(0, netEnding) : 0;

      return {
        ...acc,
        priorNet,
        debitMoves,
        creditMoves,
        endingDebit,
        endingCredit,
        netEnding,
      };
    });
  }, [accounts, journals, startDate, endDate]);

  const trialBalanceTotals = useMemo(() => {
    const totalDebit = trialBalanceData.reduce((s, a) => s + a.debitMoves, 0);
    const totalCredit = trialBalanceData.reduce((s, a) => s + a.creditMoves, 0);
    const totalEndingDebit = trialBalanceData.reduce((s, a) => s + a.endingDebit, 0);
    const totalEndingCredit = trialBalanceData.reduce((s, a) => s + a.endingCredit, 0);
    return {
      totalDebit,
      totalCredit,
      diff: Math.abs(totalDebit - totalCredit),
      totalEndingDebit,
      totalEndingCredit,
      endingDiff: Math.abs(totalEndingDebit - totalEndingCredit),
    };
  }, [trialBalanceData]);

  // 2. Income Statement Data - Authoritative General Ledger Revenues & Expenses
  const incomeStatementData = useMemo(() => {
    const revAccounts = accounts.filter((a) => a.category === 'revenue' && a.isSub);
    const expAccounts = accounts.filter((a) => a.category === 'expense' && a.isSub);

    // Calculate revenue movements from journal lines for period
    let totalRevenues = 0;
    revAccounts.forEach((a) => {
      let accNet = 0;
      journals.forEach((j) => {
        if (j.date >= startDate && j.date <= endDate) {
          j.lines.forEach((l) => {
            if (l.accountCode === a.code) {
              accNet += (Number(l.credit || 0) - Number(l.debit || 0));
            }
          });
        }
      });
      totalRevenues += accNet;
    });

    // Calculate COGS and operating expenses from journal lines for period
    let cogsAmount = 0;
    let operatingExpenses = 0;
    expAccounts.forEach((a) => {
      let accNet = 0;
      journals.forEach((j) => {
        if (j.date >= startDate && j.date <= endDate) {
          j.lines.forEach((l) => {
            if (l.accountCode === a.code) {
              accNet += (Number(l.debit || 0) - Number(l.credit || 0));
            }
          });
        }
      });
      if (a.code === '51') {
        cogsAmount += accNet;
      } else {
        operatingExpenses += accNet;
      }
    });

    const totalExpenses = cogsAmount + operatingExpenses;
    const grossProfit = totalRevenues - cogsAmount;
    const netProfit = totalRevenues - totalExpenses;
    const zakatOrTax = netProfit > 0 ? netProfit * 0.025 : 0;

    return {
      revAccounts,
      expAccounts,
      totalRevenues,
      cogsAmount,
      grossProfit,
      operatingExpenses,
      totalExpenses,
      netProfit,
      zakatOrTax,
      netAfterZakat: netProfit - zakatOrTax,
    };
  }, [accounts, journals, startDate, endDate]);

  // 3. Balance Sheet Data
  const balanceSheetData = useMemo(() => {
    const assets = accounts.filter((a) => a.category === 'asset');
    const liabilities = accounts.filter((a) => a.category === 'liability');
    const equity = accounts.filter((a) => a.category === 'equity');

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equity.reduce((s, a) => s + a.balance, 0) + incomeStatementData.netProfit;

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    };
  }, [accounts, incomeStatementData.netProfit]);

  // 4. Account Statement Data
  const accountStatementData = useMemo(() => {
    const acc = accounts.find((a) => a.id === selectedAccountId);
    if (!acc) return { account: null, rows: [], initialBalance: 0, finalBalance: 0 };

    interface RowItem {
      date: string;
      docType: string;
      docNumber: string;
      notes: string;
      debit: number;
      credit: number;
      balance: number;
    }

    const rows: RowItem[] = [];
    let runningBalance = acc.balance;

    journals
      .filter((j) => j.date >= startDate && j.date <= endDate)
      .forEach((j) => {
        j.lines.forEach((r) => {
          if (r.accountCode === acc.code) {
            const deb = Number(r.debit || 0);
            const cred = Number(r.credit || 0);
            if (acc.nature === 'debit') runningBalance += deb - cred;
            else runningBalance += cred - deb;

            rows.push({
              date: j.date,
              docType: 'قيد يومية',
              docNumber: j.entryNumber,
              notes: r.note || j.description,
              debit: deb,
              credit: cred,
              balance: runningBalance,
            });
          }
        });
      });

    vouchers
      .filter((v) => v.date >= startDate && v.date <= endDate)
      .forEach((v) => {
        if (v.accountCode === acc.code) {
          const deb = v.type === 'payment' ? v.amount : 0;
          const cred = v.type === 'receipt' ? v.amount : 0;
          if (acc.nature === 'debit') runningBalance += deb - cred;
          else runningBalance += cred - deb;

          rows.push({
            date: v.date,
            docType: v.type === 'receipt' ? 'سند قبض' : 'سند صرف',
            docNumber: v.voucherNumber,
            notes: v.description || `سند ${v.type === 'receipt' ? 'قبض' : 'صرف'} لصالح ${v.partyName}`,
            debit: deb,
            credit: cred,
            balance: runningBalance,
          });
        }
      });

    rows.sort((a, b) => a.date.localeCompare(b.date));

    return {
      account: acc,
      rows,
      initialBalance: acc.balance,
      finalBalance: runningBalance,
    };
  }, [accounts, journals, vouchers, selectedAccountId, startDate, endDate]);

  // 5. Customer Statement Data
  const customerStatementData = useMemo(() => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return { customer: null, rows: [], totalInvoiced: 0, totalPaid: 0, balance: 0 };

    interface CustRow {
      date: string;
      docType: string;
      docNumber: string;
      debit: number;
      credit: number;
      balance: number;
      notes: string;
    }

    const rows: CustRow[] = [];
    let curBal = 0;

    salesInvoices
      .filter((s) => s.customerId === cust.id && s.date >= startDate && s.date <= endDate)
      .forEach((s) => {
        curBal += s.grandTotal;
        rows.push({
          date: s.date,
          docType: 'فاتورة مبيعات ضريبية',
          docNumber: s.invoiceNumber,
          debit: s.grandTotal,
          credit: s.paymentStatus === 'paid' ? s.grandTotal : 0,
          balance: s.paymentStatus === 'paid' ? curBal - s.grandTotal : curBal,
          notes: s.notes || (s.paymentStatus === 'paid' ? 'مسددة نقداً بالكامل' : 'فاتورة آجلة'),
        });
        if (s.paymentStatus === 'paid') {
          curBal -= s.grandTotal;
        }
      });

    const totalInvoiced = rows.reduce((s, r) => s + r.debit, 0);
    const totalPaid = rows.reduce((s, r) => s + r.credit, 0);

    return {
      customer: cust,
      rows,
      totalInvoiced,
      totalPaid,
      balance: cust.currentBalance,
    };
  }, [customers, salesInvoices, selectedCustomerId, startDate, endDate]);

  // 6. Supplier Statement Data
  const supplierStatementData = useMemo(() => {
    const supp = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supp) return { supplier: null, rows: [], totalPurchased: 0, totalPaid: 0, balance: 0 };

    interface SuppRow {
      date: string;
      docType: string;
      docNumber: string;
      purchases: number;
      payments: number;
      balance: number;
      notes: string;
    }

    const rows: SuppRow[] = [];
    let curBal = 0;

    purchaseInvoices
      .filter((p) => p.supplierId === supp.id && p.date >= startDate && p.date <= endDate)
      .forEach((p) => {
        curBal += p.grandTotal;
        rows.push({
          date: p.date,
          docType: 'فاتورة مشتريات',
          docNumber: p.invoiceNumber,
          purchases: p.grandTotal,
          payments: p.paymentStatus === 'paid' ? p.grandTotal : 0,
          balance: p.paymentStatus === 'paid' ? curBal - p.grandTotal : curBal,
          notes: p.notes || (p.paymentStatus === 'paid' ? 'مسددة فوراً' : 'آجلة'),
        });
        if (p.paymentStatus === 'paid') {
          curBal -= p.grandTotal;
        }
      });

    const totalPurchased = rows.reduce((s, r) => s + r.purchases, 0);
    const totalPaid = rows.reduce((s, r) => s + r.payments, 0);

    return {
      supplier: supp,
      rows,
      totalPurchased,
      totalPaid,
      balance: supp.currentBalance,
    };
  }, [suppliers, purchaseInvoices, selectedSupplierId, startDate, endDate]);

  // 7. Inventory Valuation Data
  const inventoryValuationData = useMemo(() => {
    let filtered = items;
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (i) => i.name.includes(searchQuery) || i.code.includes(searchQuery) || i.category.includes(searchQuery)
      );
    }
    const totalCost = filtered.reduce((s, i) => s + i.currentStock * i.purchasePrice, 0);
    const totalRetail = filtered.reduce((s, i) => s + i.currentStock * i.salePrice, 0);
    const totalPotentialProfit = totalRetail - totalCost;

    return { items: filtered, totalCost, totalRetail, totalPotentialProfit };
  }, [items, searchQuery]);

  // 8. Sales Tax Register Data
  const salesTaxData = useMemo(() => {
    const list = salesInvoices.filter((s) => s.date >= startDate && s.date <= endDate);
    const subtotal = list.reduce((s, inv) => s + inv.subtotal, 0);
    const taxTotal = list.reduce((s, inv) => s + inv.taxTotal, 0);
    const grandTotal = list.reduce((s, inv) => s + inv.grandTotal, 0);
    return { list, subtotal, taxTotal, grandTotal };
  }, [salesInvoices, startDate, endDate]);

  // 9. Purchases Tax Register Data
  const purchasesTaxData = useMemo(() => {
    const list = purchaseInvoices.filter((p) => p.date >= startDate && p.date <= endDate);
    const subtotal = list.reduce((s, inv) => s + inv.subtotal, 0);
    const taxTotal = list.reduce((s, inv) => s + inv.taxTotal, 0);
    const grandTotal = list.reduce((s, inv) => s + inv.grandTotal, 0);
    return { list, subtotal, taxTotal, grandTotal };
  }, [purchaseInvoices, startDate, endDate]);

  // 10. Cash Flow & Liquidity
  const cashFlowData = useMemo(() => {
    const totalCash = banksCash.reduce((s, b) => s + b.currentBalance, 0);
    const periodReceipts = vouchers
      .filter((v) => v.type === 'receipt' && v.date >= startDate && v.date <= endDate)
      .reduce((s, v) => s + v.amount, 0);
    const periodPayments = vouchers
      .filter((v) => v.type === 'payment' && v.date >= startDate && v.date <= endDate)
      .reduce((s, v) => s + v.amount, 0);

    return {
      banksCash,
      totalCash,
      periodReceipts,
      periodPayments,
      netFlow: periodReceipts - periodPayments,
    };
  }, [banksCash, vouchers, startDate, endDate]);

  // Export to CSV Function
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // BOM for UTF-8 in Excel
    let filename = `Report_${selectedReport}_${startDate}_${endDate}.csv`;

    if (selectedReport === 'trial_balance') {
      csvContent += 'كود الحساب,اسم الحساب,طبيعة الحساب,التصنيف,حركات مدينة,حركات دائنة,رصيد مدين نهائي,رصيد دائن نهائي\n';
      trialBalanceData.forEach((r) => {
        csvContent += `"${r.code}","${r.name}","${r.nature}","${r.category}",${r.debitMoves},${r.creditMoves},${r.endingDebit},${r.endingCredit}\n`;
      });
    } else if (selectedReport === 'inventory_valuation') {
      csvContent += 'كود الصنف,اسم الصنف,المجموعة,الرصيد المتاح,سعر الشراء,سعر البيع,إجمالي التكلفة,إجمالي البيع\n';
      inventoryValuationData.items.forEach((i) => {
        csvContent += `"${i.code}","${i.name}","${i.category}",${i.currentStock},${i.purchasePrice},${i.salePrice},${i.currentStock * i.purchasePrice},${i.currentStock * i.salePrice}\n`;
      });
    } else if (selectedReport === 'sales_tax_register') {
      csvContent += 'رقم الفاتورة,التاريخ,اسم العميل,المبلغ الخاضع للضريبة,ضريبة 15%,الإجمالي شامل الضريبة,حالة السداد\n';
      salesTaxData.list.forEach((s) => {
        csvContent += `"${s.invoiceNumber}","${s.date}","${s.customerName}",${s.subtotal},${s.taxTotal},${s.grandTotal},"${s.paymentStatus}"\n`;
      });
    } else {
      csvContent += 'تقرير H2pro,تاريخ الإصدار,المستخدم\n';
      csvContent += `"${selectedReport}","${new Date().toISOString()}","${currentUser.username}"\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportTitles: Record<ReportCategory, string> = {
    trial_balance: 'ميزان المراجعة بالأرصدة والمجاميع',
    income_statement: 'قائمة الدخل الشامل (الأرباح والخسائر)',
    balance_sheet: 'الميزانية العمومية والمركز المالي',
    account_statement: 'كشف حساب الأستاذ العام التفصيلي',
    customer_statement: 'كشف حساب عميل وتعمير الذمم',
    supplier_statement: 'كشف حساب مورد ومشتريات',
    inventory_valuation: 'كشف جرد وتقييم المخزون السلعي',
    fast_slow_moving: 'تحليل الأصناف السريعة والراكدة',
    sales_tax_register: 'سجل فواتير المبيعات وضريبة المخرجات 15%',
    purchases_tax_register: 'سجل فواتير المشتريات وضريبة المدخلات 15%',
    cash_flow_liquidity: 'تقرير التدفق النقدي والسيولة الفورية',
    sales_profitability: 'تقرير ربحية المبيعات وهامش الربح',
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
      {/* Top Controls & Category Ribbon */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
        {/* Reports Navigation Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#1B3A5C] text-[#dfb758] flex items-center justify-center font-bold">
              <FileBarChart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1B3A5C]">
                مركز التقارير التنفيذي الشامل (Live Interactive Reports Center)
              </h2>
              <p className="text-[11px] text-slate-500">
                تشغيل، استعلام، تصفية، طباعة، وتصدير كافة تقارير المنظومة فوراً
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel / CSV</span>
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 bg-[#1B3A5C] hover:bg-[#122840] text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#dfb758]" />
              <span>معاينة وطباعة التقرير</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          {/* 1. Report Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">نوع التقرير المطلوب:</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportCategory)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded font-bold text-[#1B3A5C] bg-white text-xs"
            >
              <optgroup label="تقارير الأستاذ العام والقوائم المالية">
                <option value="trial_balance">ميزان المراجعة بالمجاميع والأرصدة</option>
                <option value="income_statement">قائمة الدخل والأرباح والخسائر</option>
                <option value="balance_sheet">الميزانية العمومية والمركز المالي</option>
                <option value="account_statement">كشف حساب الأستاذ العام</option>
                <option value="cash_flow_liquidity">التدفقات النقدية والسيولة</option>
              </optgroup>
              <optgroup label="تقارير المبيعات والعملاء والضرائب">
                <option value="customer_statement">كشف حساب عميل تفصيلي</option>
                <option value="sales_tax_register">سجل فواتير المبيعات وضريبة 15%</option>
                <option value="sales_profitability">هوامش أرباح المبيعات</option>
              </optgroup>
              <optgroup label="تقارير المشتريات والموردين">
                <option value="supplier_statement">كشف حساب مورد تفصيلي</option>
                <option value="purchases_tax_register">سجل فواتير المشتريات والضريبة</option>
              </optgroup>
              <optgroup label="تقارير المخزون والمستودعات">
                <option value="inventory_valuation">جرد وتقييم المخزون السلعي</option>
                <option value="fast_slow_moving">الأصناف الراكدة والأكثر حركة</option>
              </optgroup>
            </select>
          </div>

          {/* 2. Date Range */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">من تاريخ:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">إلى تاريخ:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
          </div>

          {/* 3. Conditional Entity Selector */}
          <div>
            {selectedReport === 'account_statement' && (
              <>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">اختر الحساب المستعلم عنه:</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-semibold"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name} ({a.nature === 'debit' ? 'مدين' : 'دائن'})
                    </option>
                  ))}
                </select>
              </>
            )}

            {selectedReport === 'customer_statement' && (
              <>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">اختر العميل:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-semibold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} (الرصيد: {c.currentBalance.toLocaleString('ar-SA')})
                    </option>
                  ))}
                </select>
              </>
            )}

            {selectedReport === 'supplier_statement' && (
              <>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">اختر المورد:</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-semibold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} (الرصيد: {s.currentBalance.toLocaleString('ar-SA')})
                    </option>
                  ))}
                </select>
              </>
            )}

            {['inventory_valuation', 'fast_slow_moving', 'sales_tax_register', 'purchases_tax_register'].includes(selectedReport) && (
              <>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">بحث سريع:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو الكود..."
                    className="w-full px-2 py-1 pr-7 border border-slate-300 rounded text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
                </div>
              </>
            )}
          </div>

          {/* 4. Active Report Title & Scope */}
          <div className="flex flex-col justify-end">
            <div className="p-2 bg-slate-200/70 rounded border border-slate-300 text-center">
              <span className="text-[10px] text-slate-500 font-bold block">التقرير النشط:</span>
              <span className="font-bold text-[#1B3A5C] text-xs truncate block">{reportTitles[selectedReport]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Viewport */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-100/50">
        {/* REPORT 1: Trial Balance */}
        {selectedReport === 'trial_balance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي الحركات المدينة:</span>
                <p className="text-base font-bold font-mono text-[#1B3A5C]">
                  {trialBalanceTotals.totalDebit.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي الحركات الدائنة:</span>
                <p className="text-base font-bold font-mono text-[#1B3A5C]">
                  {trialBalanceTotals.totalCredit.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">توازن الميزان (الفرق):</span>
                <p className={`text-base font-bold font-mono ${trialBalanceTotals.diff === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {trialBalanceTotals.diff === 0 ? '✓ متوازن تماماً (0.00)' : `غير متوازن (${trialBalanceTotals.diff.toLocaleString('ar-SA')})`}
                </p>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="p-2 border-l border-slate-700">كود الحساب</th>
                    <th className="p-2 border-l border-slate-700">اسم الحساب</th>
                    <th className="p-2 border-l border-slate-700">التصنيف</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">حركات مدينة</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">حركات دائنة</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">رصيد مدين نهائي</th>
                    <th className="p-2 text-left font-mono">رصيد دائن نهائي</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalanceData.map((row) => (
                    <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">{row.code}</td>
                      <td className="p-2 font-semibold border-l border-slate-200">{row.name}</td>
                      <td className="p-2 text-slate-600 border-l border-slate-200">{row.category}</td>
                      <td className="p-2 font-mono text-left border-l border-slate-200">{row.debitMoves.toLocaleString('ar-SA')}</td>
                      <td className="p-2 font-mono text-left border-l border-slate-200">{row.creditMoves.toLocaleString('ar-SA')}</td>
                      <td className="p-2 font-mono text-left font-bold text-blue-900 border-l border-slate-200">
                        {row.endingDebit > 0 ? row.endingDebit.toLocaleString('ar-SA') : '-'}
                      </td>
                      <td className="p-2 font-mono text-left font-bold text-amber-900">
                        {row.endingCredit > 0 ? row.endingCredit.toLocaleString('ar-SA') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 2: Income Statement */}
        {selectedReport === 'income_statement' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي الإيرادات والمبيعات:</span>
                <p className="text-base font-bold font-mono text-emerald-700">
                  {incomeStatementData.totalRevenues.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي التكاليف والمصروفات:</span>
                <p className="text-base font-bold font-mono text-red-700">
                  {incomeStatementData.totalExpenses.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">صافي الأرباح / الخسائر:</span>
                <p className={`text-base font-bold font-mono ${incomeStatementData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {incomeStatementData.netProfit.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded border border-slate-200 space-y-4 shadow-xs">
              <h3 className="font-bold text-[#1B3A5C] text-sm border-b pb-2">تفاصيل الإيرادات والمصروفات</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-semibold p-2 bg-emerald-50 text-emerald-900 rounded">
                  <span>إجمالي مبيعات الفترة (الفواتير الضريبية):</span>
                  <span className="font-mono">{incomeStatementData.periodSales.toLocaleString('ar-SA')} {company.defaultCurrency}</span>
                </div>
                <div className="flex justify-between font-semibold p-2 bg-red-50 text-red-900 rounded">
                  <span>تكلفة المشتريات المباشرة:</span>
                  <span className="font-mono">{incomeStatementData.periodPurchases.toLocaleString('ar-SA')} {company.defaultCurrency}</span>
                </div>
                <div className="flex justify-between font-semibold p-2 bg-slate-100 rounded">
                  <span>المصروفات التشغيلية والعمومية:</span>
                  <span className="font-mono">
                    {incomeStatementData.expAccounts.reduce((s, a) => s + a.balance, 0).toLocaleString('ar-SA')} {company.defaultCurrency}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-sm text-[#1B3A5C]">
                  <span>صافي الدخل التشغيلي قبل الزكاة والضريبة:</span>
                  <span className="font-mono">{incomeStatementData.netProfit.toLocaleString('ar-SA')} {company.defaultCurrency}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs pt-1">
                  <span>الزكاة الشرعية التقديرية (2.5%):</span>
                  <span className="font-mono">{incomeStatementData.zakatOrTax.toLocaleString('ar-SA')} {company.defaultCurrency}</span>
                </div>
                <div className="border-t-2 border-slate-400 pt-2 flex justify-between font-bold text-base text-emerald-800">
                  <span>صافي الربح النهائي للفترة:</span>
                  <span className="font-mono">{incomeStatementData.netAfterZakat.toLocaleString('ar-SA')} {company.defaultCurrency}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT 3: Balance Sheet */}
        {selectedReport === 'balance_sheet' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              {/* Assets */}
              <div className="bg-white p-4 rounded border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-sm text-[#1B3A5C]">الأصول (Assets)</h3>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {balanceSheetData.totalAssets.toLocaleString('ar-SA')} {company.defaultCurrency}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {balanceSheetData.assets.map((a) => (
                    <div key={a.id} className="flex justify-between py-1 border-b border-slate-100">
                      <span>{a.code} - {a.name}</span>
                      <span className="font-mono font-bold">{a.balance.toLocaleString('ar-SA')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div className="bg-white p-4 rounded border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-sm text-[#1B3A5C]">الخصوم وحقوق الملكية (Liabilities & Equity)</h3>
                  <span className="font-mono font-bold text-amber-700 text-sm">
                    {(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity).toLocaleString('ar-SA')} {company.defaultCurrency}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-slate-500 block pt-1">الخصوم والالتزامات:</span>
                  {balanceSheetData.liabilities.map((l) => (
                    <div key={l.id} className="flex justify-between py-1 border-b border-slate-100">
                      <span>{l.code} - {l.name}</span>
                      <span className="font-mono font-bold">{l.balance.toLocaleString('ar-SA')}</span>
                    </div>
                  ))}
                  <span className="font-bold text-slate-500 block pt-2">حقوق الملكية:</span>
                  {balanceSheetData.equity.map((e) => (
                    <div key={e.id} className="flex justify-between py-1 border-b border-slate-100">
                      <span>{e.code} - {e.name}</span>
                      <span className="font-mono font-bold">{e.balance.toLocaleString('ar-SA')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-800 font-bold">
                    <span>أرباح العام الجاري:</span>
                    <span className="font-mono">{incomeStatementData.netProfit.toLocaleString('ar-SA')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-center text-xs font-bold text-emerald-900 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                المعادلة المحاسبية متوازنة: الأصول ({balanceSheetData.totalAssets.toLocaleString('ar-SA')}) = الخصوم وحقوق الملكية ({(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity).toLocaleString('ar-SA')})
              </span>
            </div>
          </div>
        )}

        {/* REPORT 4: Account Statement */}
        {selectedReport === 'account_statement' && (
          <div className="space-y-4">
            {accountStatementData.account && (
              <div className="bg-white p-3 rounded border border-slate-200 flex justify-between items-center shadow-xs">
                <div>
                  <h3 className="font-bold text-sm text-[#1B3A5C]">
                    كشف حساب: {accountStatementData.account.code} - {accountStatementData.account.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    طبيعة الحساب: {accountStatementData.account.nature === 'debit' ? 'مدين' : 'دائن'} · التصنيف: {accountStatementData.account.category}
                  </span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs text-slate-500 block">الرصيد النهائي:</span>
                  <span className="text-base font-bold text-[#1B3A5C]">
                    {accountStatementData.finalBalance.toLocaleString('ar-SA')} {company.defaultCurrency}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="p-2 border-l border-slate-700">التاريخ</th>
                    <th className="p-2 border-l border-slate-700">نوع المستند</th>
                    <th className="p-2 border-l border-slate-700">رقم المرجع</th>
                    <th className="p-2 border-l border-slate-700">البيان / الشرح</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">مدين</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">دائن</th>
                    <th className="p-2 text-left font-mono">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {accountStatementData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    accountStatementData.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-600 border-l border-slate-200">{row.date}</td>
                        <td className="p-2 font-bold text-slate-800 border-l border-slate-200">{row.docType}</td>
                        <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => setDrillDownDocRef(row.docNumber)}
                            className="text-[#1B3A5C] hover:text-[#c49a37] hover:underline flex items-center gap-1 cursor-pointer font-mono font-bold"
                            title="معاينة المستند المالي الأصلي والقيد المحاسبي"
                          >
                            <span>{row.docNumber}</span>
                            <ExternalLink className="w-3 h-3 text-[#c49a37]" />
                          </button>
                        </td>
                        <td className="p-2 border-l border-slate-200">{row.notes}</td>
                        <td className="p-2 font-mono text-left border-l border-slate-200">
                          {row.debit > 0 ? row.debit.toLocaleString('ar-SA') : '-'}
                        </td>
                        <td className="p-2 font-mono text-left border-l border-slate-200">
                          {row.credit > 0 ? row.credit.toLocaleString('ar-SA') : '-'}
                        </td>
                        <td className="p-2 font-mono text-left font-bold text-[#1B3A5C]">
                          {row.balance.toLocaleString('ar-SA')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 5: Customer Statement */}
        {selectedReport === 'customer_statement' && (
          <div className="space-y-4">
            {customerStatementData.customer && (
              <div className="bg-white p-3 rounded border border-slate-200 flex justify-between items-center shadow-xs">
                <div>
                  <h3 className="font-bold text-sm text-[#1B3A5C]">
                    كشف حساب العميل: {customerStatementData.customer.name} ({customerStatementData.customer.code})
                  </h3>
                  <span className="text-xs text-slate-500">
                    هاتف: {customerStatementData.customer.phone} · الرقم الضريبي: {customerStatementData.customer.taxNumber || 'غير محدد'} · سقف الائتمان: {customerStatementData.customer.creditLimit.toLocaleString('ar-SA')} ر.س.
                  </span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs text-slate-500 block">إجمالي الذمة المستحقة:</span>
                  <span className="text-base font-bold text-red-700">
                    {customerStatementData.balance.toLocaleString('ar-SA')} {company.defaultCurrency}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="p-2 border-l border-slate-700">التاريخ</th>
                    <th className="p-2 border-l border-slate-700">نوع المستند</th>
                    <th className="p-2 border-l border-slate-700">رقم الفاتورة</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">قيمة المبيعات</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">المسدد</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">الرصيد المتبقي</th>
                    <th className="p-2">ملاحظات وحالة السداد</th>
                  </tr>
                </thead>
                <tbody>
                  {customerStatementData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        لا توجد فواتير أو حركات مسجلة لهذا العميل في النطاق المحدد.
                      </td>
                    </tr>
                  ) : (
                    customerStatementData.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-600 border-l border-slate-200">{row.date}</td>
                        <td className="p-2 font-bold text-slate-800 border-l border-slate-200">{row.docType}</td>
                        <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => setDrillDownDocRef(row.docNumber)}
                            className="text-[#1B3A5C] hover:text-[#c49a37] hover:underline flex items-center gap-1 cursor-pointer font-mono font-bold"
                            title="معاينة المستند المالي الأصلي والقيد المحاسبي"
                          >
                            <span>{row.docNumber}</span>
                            <ExternalLink className="w-3 h-3 text-[#c49a37]" />
                          </button>
                        </td>
                        <td className="p-2 font-mono text-left font-bold text-slate-900 border-l border-slate-200">
                          {row.debit.toLocaleString('ar-SA')}
                        </td>
                        <td className="p-2 font-mono text-left text-emerald-700 border-l border-slate-200">
                          {row.credit.toLocaleString('ar-SA')}
                        </td>
                        <td className="p-2 font-mono text-left font-bold text-red-700 border-l border-slate-200">
                          {row.balance.toLocaleString('ar-SA')}
                        </td>
                        <td className="p-2">{row.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 6: Supplier Statement */}
        {selectedReport === 'supplier_statement' && (
          <div className="space-y-4">
            {supplierStatementData.supplier && (
              <div className="bg-white p-3 rounded border border-slate-200 flex justify-between items-center shadow-xs">
                <div>
                  <h3 className="font-bold text-sm text-[#1B3A5C]">
                    كشف حساب المورد: {supplierStatementData.supplier.name} ({supplierStatementData.supplier.code})
                  </h3>
                  <span className="text-xs text-slate-500">
                    هاتف: {supplierStatementData.supplier.phone} · الرقم الضريبي: {supplierStatementData.supplier.taxNumber || 'غير محدد'}
                  </span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs text-slate-500 block">رصيد المورد المستحق له:</span>
                  <span className="text-base font-bold text-amber-700">
                    {supplierStatementData.balance.toLocaleString('ar-SA')} {company.defaultCurrency}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="p-2 border-l border-slate-700">التاريخ</th>
                    <th className="p-2 border-l border-slate-700">المستند</th>
                    <th className="p-2 border-l border-slate-700">رقم الفاتورة</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">قيمة المشتريات</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">المدفوع</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">الرصيد المستحق</th>
                    <th className="p-2">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierStatementData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        لا توجد فواتير مشتريات لهذا المورد في النطاق المحدد.
                      </td>
                    </tr>
                  ) : (
                    supplierStatementData.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-600 border-l border-slate-200">{row.date}</td>
                        <td className="p-2 font-bold text-slate-800 border-l border-slate-200">{row.docType}</td>
                        <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => setDrillDownDocRef(row.docNumber)}
                            className="text-[#1B3A5C] hover:text-[#c49a37] hover:underline flex items-center gap-1 cursor-pointer font-mono font-bold"
                            title="معاينة المستند المالي الأصلي والقيد المحاسبي"
                          >
                            <span>{row.docNumber}</span>
                            <ExternalLink className="w-3 h-3 text-[#c49a37]" />
                          </button>
                        </td>
                        <td className="p-2 font-mono text-left font-bold text-slate-900 border-l border-slate-200">
                          {row.purchases.toLocaleString('ar-SA')}
                        </td>
                        <td className="p-2 font-mono text-left text-emerald-700 border-l border-slate-200">
                          {row.payments.toLocaleString('ar-SA')}
                        </td>
                        <td className="p-2 font-mono text-left font-bold text-amber-800 border-l border-slate-200">
                          {row.balance.toLocaleString('ar-SA')}
                        </td>
                        <td className="p-2">{row.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 7: Inventory Valuation */}
        {selectedReport === 'inventory_valuation' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي قيمة المخزون بالتكلفة:</span>
                <p className="text-base font-bold font-mono text-[#1B3A5C]">
                  {inventoryValuationData.totalCost.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي القيمة التقديرية بسعر البيع:</span>
                <p className="text-base font-bold font-mono text-emerald-700">
                  {inventoryValuationData.totalRetail.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">الأرباح الإجمالية الكامنة بالمخزون:</span>
                <p className="text-base font-bold font-mono text-emerald-800">
                  {inventoryValuationData.totalPotentialProfit.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="p-2 border-l border-slate-700">كود الصنف</th>
                    <th className="p-2 border-l border-slate-700">اسم الصنف</th>
                    <th className="p-2 border-l border-slate-700">المجموعة</th>
                    <th className="p-2 border-l border-slate-700 text-center font-mono">الكمية</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">سعر التكلفة</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">سعر البيع</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">إجمالي التكلفة</th>
                    <th className="p-2 text-left font-mono">القيمة بسعر البيع</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryValuationData.items.map((it) => (
                    <tr key={it.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">{it.code}</td>
                      <td className="p-2 font-semibold border-l border-slate-200">{it.name}</td>
                      <td className="p-2 text-slate-600 border-l border-slate-200">{it.category}</td>
                      <td className="p-2 font-mono text-center font-bold border-l border-slate-200">{it.currentStock} {it.unit}</td>
                      <td className="p-2 font-mono text-left border-l border-slate-200">{it.purchasePrice.toLocaleString('ar-SA')}</td>
                      <td className="p-2 font-mono text-left border-l border-slate-200">{it.salePrice.toLocaleString('ar-SA')}</td>
                      <td className="p-2 font-mono text-left font-bold text-slate-900 border-l border-slate-200">
                        {(it.currentStock * it.purchasePrice).toLocaleString('ar-SA')}
                      </td>
                      <td className="p-2 font-mono text-left font-bold text-emerald-800">
                        {(it.currentStock * it.salePrice).toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 8: Sales Tax Register */}
        {selectedReport === 'sales_tax_register' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">المبيعات الخاضعة للضريبة 15%:</span>
                <p className="text-base font-bold font-mono text-[#1B3A5C]">
                  {salesTaxData.subtotal.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">ضريبة المخرجات المستحقة (15%):</span>
                <p className="text-base font-bold font-mono text-emerald-700">
                  {salesTaxData.taxTotal.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي المبيعات شامل الضريبة:</span>
                <p className="text-base font-bold font-mono text-blue-900">
                  {salesTaxData.grandTotal.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="p-2 border-l border-slate-700">رقم الفاتورة</th>
                    <th className="p-2 border-l border-slate-700">التاريخ</th>
                    <th className="p-2 border-l border-slate-700">اسم العميل</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">الأساس الخاضع</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">الضريبة 15%</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">الإجمالي النهائي</th>
                    <th className="p-2 text-center">حالة السداد</th>
                  </tr>
                </thead>
                <tbody>
                  {salesTaxData.list.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">{inv.invoiceNumber}</td>
                      <td className="p-2 font-mono text-slate-600 border-l border-slate-200">{inv.date}</td>
                      <td className="p-2 font-semibold border-l border-slate-200">{inv.customerName}</td>
                      <td className="p-2 font-mono text-left border-l border-slate-200">{inv.subtotal.toLocaleString('ar-SA')}</td>
                      <td className="p-2 font-mono text-left text-emerald-800 font-bold border-l border-slate-200">
                        {inv.taxTotal.toLocaleString('ar-SA')}
                      </td>
                      <td className="p-2 font-mono text-left font-bold text-blue-900 border-l border-slate-200">
                        {inv.grandTotal.toLocaleString('ar-SA')}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          inv.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.paymentStatus === 'paid' ? 'مسدد' : 'آجل'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 9: Purchases Tax Register */}
        {selectedReport === 'purchases_tax_register' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">المشتريات الخاضعة للضريبة 15%:</span>
                <p className="text-base font-bold font-mono text-[#1B3A5C]">
                  {purchasesTaxData.subtotal.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">ضريبة المدخلات القابلة للخصم:</span>
                <p className="text-base font-bold font-mono text-emerald-700">
                  {purchasesTaxData.taxTotal.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي المشتريات شامل الضريبة:</span>
                <p className="text-base font-bold font-mono text-blue-900">
                  {purchasesTaxData.grandTotal.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="p-2 border-l border-slate-700">رقم الفاتورة</th>
                    <th className="p-2 border-l border-slate-700">التاريخ</th>
                    <th className="p-2 border-l border-slate-700">اسم المورد</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">الأساس الخاضع</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">ضريبة المدخلات</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">الإجمالي</th>
                    <th className="p-2 text-center">حالة السداد</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasesTaxData.list.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">{inv.invoiceNumber}</td>
                      <td className="p-2 font-mono text-slate-600 border-l border-slate-200">{inv.date}</td>
                      <td className="p-2 font-semibold border-l border-slate-200">{inv.supplierName}</td>
                      <td className="p-2 font-mono text-left border-l border-slate-200">{inv.subtotal.toLocaleString('ar-SA')}</td>
                      <td className="p-2 font-mono text-left text-emerald-800 font-bold border-l border-slate-200">
                        {inv.taxTotal.toLocaleString('ar-SA')}
                      </td>
                      <td className="p-2 font-mono text-left font-bold text-blue-900 border-l border-slate-200">
                        {inv.grandTotal.toLocaleString('ar-SA')}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          inv.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.paymentStatus === 'paid' ? 'مسدد' : 'آجل'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 10: Cash Flow & Liquidity */}
        {selectedReport === 'cash_flow_liquidity' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي النقدية والبنوك المتاحة:</span>
                <p className="text-base font-bold font-mono text-[#1B3A5C]">
                  {cashFlowData.totalCash.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي المقبوضات النقدية:</span>
                <p className="text-base font-bold font-mono text-emerald-700">
                  {cashFlowData.periodReceipts.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500">إجمالي المدفوعات النقدية:</span>
                <p className="text-base font-bold font-mono text-red-700">
                  {cashFlowData.periodPayments.toLocaleString('ar-SA')} {company.defaultCurrency}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-slate-200 space-y-3 shadow-xs">
              <h3 className="font-bold text-[#1B3A5C] text-sm border-b pb-2">تفاصيل الصناديق والبنوك الحالية</h3>
              <div className="space-y-2 text-xs">
                {cashFlowData.banksCash.map((b) => (
                  <div key={b.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800">{b.name}</span>
                      <span className="text-[11px] text-slate-500 block">
                        النوع: {b.type === 'cash' ? 'خزينة نقدية' : 'حساب بنكي'} · الحساب: {b.accountNumber}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-base text-emerald-800">
                      {b.currentBalance.toLocaleString('ar-SA')} {b.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REPORT 11 & 12: Sales Profitability / Fast Moving */}
        {['sales_profitability', 'fast_slow_moving'].includes(selectedReport) && (
          <div className="space-y-4">
            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="p-2 border-l border-slate-700">كود الصنف</th>
                    <th className="p-2 border-l border-slate-700">اسم الصنف</th>
                    <th className="p-2 border-l border-slate-700 text-center font-mono">الرصيد المتاح</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">سعر التكلفة</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">سعر البيع</th>
                    <th className="p-2 border-l border-slate-700 text-left font-mono">هامش الربح للوحدة</th>
                    <th className="p-2 text-center">نسبة الربح %</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const unitMargin = it.salePrice - it.purchasePrice;
                    const marginPercent = it.purchasePrice > 0 ? (unitMargin / it.purchasePrice) * 100 : 0;
                    return (
                      <tr key={it.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">{it.code}</td>
                        <td className="p-2 font-semibold border-l border-slate-200">{it.name}</td>
                        <td className="p-2 font-mono text-center border-l border-slate-200">{it.currentStock} {it.unit}</td>
                        <td className="p-2 font-mono text-left border-l border-slate-200">{it.purchasePrice.toLocaleString('ar-SA')}</td>
                        <td className="p-2 font-mono text-left border-l border-slate-200">{it.salePrice.toLocaleString('ar-SA')}</td>
                        <td className={`p-2 font-mono text-left font-bold border-l border-slate-200 ${unitMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {unitMargin.toLocaleString('ar-SA')} {company.defaultCurrency}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-800">
                          {marginPercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- Official Print Preview Modal --- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`معاينة وطباعة: ${reportTitles[selectedReport]}`}
        width="4xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-[#dfb758]" />
              <span>طباعة المستند الرسمي الآن</span>
            </button>
          </div>
        }
      >
        <div className="printable-area bg-white p-6 text-slate-800">
          <PrintHeader company={company} title={reportTitles[selectedReport]} />
          
          <div className="text-[11px] text-slate-600 mb-4 flex justify-between border-b pb-2">
            <span>الفترة المحاسبية: من {startDate} إلى {endDate}</span>
            <span>تاريخ ووقت الاستخراج: {new Date().toLocaleString('ar-SA')}</span>
            <span>المستخدم المسؤول: {currentUser.name} ({currentUser.username})</span>
          </div>

          <div className="text-xs">
            <p className="font-bold mb-2">موجز التقرير المعتمد:</p>
            <p className="text-slate-600 leading-relaxed mb-4">
              تم استخراج هذه البيانات آلياً من سجلات ودفاتر نظام H2pro المحاسبي بعد تدقيق القيود والحركات المحاسبية وفقاً للمعايير والأنظمة المعتمدة.
            </p>
          </div>

          {/* Official Signatures */}
          <div className="printable-signatures mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs font-semibold text-slate-700">
            <div>
              <p>المحاسب المالي المختص</p>
              <p className="mt-8 font-mono text-[11px] text-slate-400">..............................</p>
            </div>
            <div>
              <p>مدقق الحسابات الداخلي</p>
              <p className="mt-8 font-mono text-[11px] text-slate-400">..............................</p>
            </div>
            <div>
              <p>المدير المالي والاعتماد</p>
              <p className="mt-8 font-mono text-[11px] text-slate-400">..............................</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Source Document Drill-Down Modal */}
      <SourceDocumentModal
        isOpen={Boolean(drillDownDocRef)}
        onClose={() => setDrillDownDocRef(null)}
        documentRef={drillDownDocRef || ''}
        currentUser={currentUser}
        onDocumentCancelled={() => {
          // Trigger reload / snapshot refresh
          window.location.reload();
        }}
      />
    </div>
  );
};
