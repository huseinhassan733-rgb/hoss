/**
 * Global PDF Export Modal Component
 * نافذة تصدير التقارير لملفات PDF الاحترافية عبر jspdf و jspdf-autotable
 */

import React, { useState } from 'react';
import { CompanyInfo, FinancialYear, User } from '../types';
import { db } from '../database/db';
import { Modal } from './Modal';
import { downloadPDF, PDFTableColumn } from '../utils/pdfExport';
import { FileText, Download, CheckCircle, Sliders, Printer, Table } from 'lucide-react';
import { MainModuleId } from '../screens/MainMenuScreen';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyInfo;
  activeYear: FinancialYear;
  currentUser: User;
  currentModule: MainModuleId | null;
}

export const PDFExportModal: React.FC<PDFExportModalProps> = ({
  isOpen,
  onClose,
  company,
  activeYear,
  currentUser,
  currentModule,
}) => {
  // Determine available reports based on context
  const getInitialReportKey = () => {
    switch (currentModule) {
      case 'system_setup':
        return 'financial_years';
      case 'system_admin':
        return 'users';
      case 'general_ledger':
        return 'accounts';
      case 'inventory':
        return 'inventory_items';
      case 'purchases':
        return 'purchase_invoices';
      case 'sales':
        return 'sales_invoices';
      case 'auxiliary_reports':
        return 'audit_logs';
      default:
        return 'accounts';
    }
  };

  const [selectedReportKey, setSelectedReportKey] = useState<string>(getInitialReportKey);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Report configurations mapping to live database data
  const reportOptions = [
    {
      key: 'accounts',
      label: 'دليل وشجرة الحسابات العامة (Chart of Accounts)',
      module: 'general_ledger',
      columns: [
        { header: '#', dataKey: '#index', width: 12, align: 'center' as const },
        { header: 'Account Code', dataKey: 'code', width: 28, align: 'center' as const },
        { header: 'Account Name', dataKey: 'name', width: 65, align: 'right' as const },
        { header: 'Category', dataKey: 'category', width: 30, align: 'center' as const },
        { header: 'Nature', dataKey: 'nature', width: 22, align: 'center' as const },
        { header: 'Current Balance (SAR)', dataKey: 'balance', width: 35, align: 'right' as const },
      ],
      getData: () => db.getAccounts(),
      getSummary: () => {
        const subAccounts = db.getAccounts().filter((a) => a.isSub);
        const totalDebit = subAccounts.filter((a) => a.nature === 'debit').reduce((s, a) => s + a.balance, 0);
        const totalCredit = subAccounts.filter((a) => a.nature === 'credit').reduce((s, a) => s + a.balance, 0);
        return [
          { label: 'Total Debit Accounts:', value: `${totalDebit.toLocaleString()} SAR` },
          { label: 'Total Credit Accounts:', value: `${totalCredit.toLocaleString()} SAR` },
        ];
      },
    },
    {
      key: 'trial_balance',
      label: 'ميزان المراجعة بالأرصدة (Trial Balance)',
      module: 'general_ledger',
      columns: [
        { header: 'Code', dataKey: 'code', width: 25, align: 'center' as const },
        { header: 'Account Title', dataKey: 'name', width: 70, align: 'right' as const },
        { header: 'Category', dataKey: 'category', width: 30, align: 'center' as const },
        { header: 'Debit Balance (SAR)', dataKey: 'debitBal', width: 35, align: 'right' as const },
        { header: 'Credit Balance (SAR)', dataKey: 'creditBal', width: 35, align: 'right' as const },
      ],
      getData: () => {
        return db.getAccounts().filter((a) => a.isSub).map((a) => ({
          ...a,
          debitBal: a.nature === 'debit' ? a.balance : 0,
          creditBal: a.nature === 'credit' ? a.balance : 0,
        }));
      },
      getSummary: () => {
        const sub = db.getAccounts().filter((a) => a.isSub);
        const deb = sub.filter((a) => a.nature === 'debit').reduce((s, a) => s + a.balance, 0);
        const cred = sub.filter((a) => a.nature === 'credit').reduce((s, a) => s + a.balance, 0);
        return [
          { label: 'Total Debits:', value: `${deb.toLocaleString()} SAR` },
          { label: 'Total Credits:', value: `${cred.toLocaleString()} SAR` },
        ];
      },
    },
    {
      key: 'journal_entries',
      label: 'قيود اليومية العامة (General Journal Entries)',
      module: 'general_ledger',
      columns: [
        { header: 'Entry #', dataKey: 'entryNumber', width: 30, align: 'center' as const },
        { header: 'Date', dataKey: 'date', width: 25, align: 'center' as const },
        { header: 'Reference', dataKey: 'reference', width: 30, align: 'center' as const },
        { header: 'Description / Narration', dataKey: 'description', width: 75, align: 'right' as const },
        { header: 'Total Debit (SAR)', dataKey: 'debitTotal', width: 35, align: 'right' as const },
      ],
      getData: () => db.getJournalEntries(),
    },
    {
      key: 'inventory_items',
      label: 'تقرير الأرصدة وتقييم المخزون (Inventory Valuation)',
      module: 'inventory',
      columns: [
        { header: 'Item Code', dataKey: 'code', width: 28, align: 'center' as const },
        { header: 'Item Description', dataKey: 'name', width: 65, align: 'right' as const },
        { header: 'Unit', dataKey: 'unit', width: 20, align: 'center' as const },
        { header: 'Available Qty', dataKey: 'currentStock', width: 25, align: 'center' as const },
        { header: 'Cost Price (SAR)', dataKey: 'purchasePrice', width: 30, align: 'right' as const },
        { header: 'Selling Price (SAR)', dataKey: 'salePrice', width: 30, align: 'right' as const },
      ],
      getData: () => db.getItems(),
      getSummary: () => {
        const items = db.getItems();
        const costVal = items.reduce((s, i) => s + i.currentStock * i.purchasePrice, 0);
        const saleVal = items.reduce((s, i) => s + i.currentStock * i.salePrice, 0);
        return [
          { label: 'Total Inventory Cost:', value: `${costVal.toLocaleString()} SAR` },
          { label: 'Estimated Sales Value:', value: `${saleVal.toLocaleString()} SAR` },
        ];
      },
    },
    {
      key: 'sales_invoices',
      label: 'فواتير المبيعات الضريبية (Sales Invoices Report)',
      module: 'sales',
      columns: [
        { header: 'Invoice #', dataKey: 'invoiceNumber', width: 35, align: 'center' as const },
        { header: 'Date', dataKey: 'date', width: 25, align: 'center' as const },
        { header: 'Customer Name', dataKey: 'customerName', width: 60, align: 'right' as const },
        { header: 'VAT (15%)', dataKey: 'taxTotal', width: 28, align: 'right' as const },
        { header: 'Net Amount (SAR)', dataKey: 'grandTotal', width: 35, align: 'right' as const },
        { header: 'Status', dataKey: 'paymentStatus', width: 22, align: 'center' as const },
      ],
      getData: () => db.getSalesInvoices(),
      getSummary: () => {
        const invs = db.getSalesInvoices();
        const totalSales = invs.reduce((s, i) => s + i.grandTotal, 0);
        const totalVat = invs.reduce((s, i) => s + i.taxTotal, 0);
        return [
          { label: 'Total Sales (Incl. VAT):', value: `${totalSales.toLocaleString()} SAR` },
          { label: 'Total Output VAT (15%):', value: `${totalVat.toLocaleString()} SAR` },
        ];
      },
    },
    {
      key: 'purchase_invoices',
      label: 'فواتير المشتريات الضريبية (Purchases Report)',
      module: 'purchases',
      columns: [
        { header: 'Invoice #', dataKey: 'invoiceNumber', width: 35, align: 'center' as const },
        { header: 'Date', dataKey: 'date', width: 25, align: 'center' as const },
        { header: 'Supplier Name', dataKey: 'supplierName', width: 60, align: 'right' as const },
        { header: 'VAT (15%)', dataKey: 'taxTotal', width: 28, align: 'right' as const },
        { header: 'Grand Total (SAR)', dataKey: 'grandTotal', width: 35, align: 'right' as const },
        { header: 'Status', dataKey: 'paymentStatus', width: 22, align: 'center' as const },
      ],
      getData: () => db.getPurchaseInvoices(),
      getSummary: () => {
        const invs = db.getPurchaseInvoices();
        const totalPurchases = invs.reduce((s, i) => s + i.grandTotal, 0);
        return [{ label: 'Total Purchases:', value: `${totalPurchases.toLocaleString()} SAR` }];
      },
    },
    {
      key: 'customers',
      label: 'دليل وأرصدة العملاء (Customers Balance Statement)',
      module: 'sales',
      columns: [
        { header: 'Code', dataKey: 'code', width: 25, align: 'center' as const },
        { header: 'Customer Name', dataKey: 'name', width: 70, align: 'right' as const },
        { header: 'Phone', dataKey: 'phone', width: 35, align: 'center' as const },
        { header: 'Credit Limit', dataKey: 'creditLimit', width: 35, align: 'right' as const },
        { header: 'Current Balance (SAR)', dataKey: 'currentBalance', width: 35, align: 'right' as const },
      ],
      getData: () => db.getCustomers(),
    },
    {
      key: 'suppliers',
      label: 'دليل وأرصدة الموردين (Suppliers Balance Statement)',
      module: 'purchases',
      columns: [
        { header: 'Code', dataKey: 'code', width: 25, align: 'center' as const },
        { header: 'Supplier Name', dataKey: 'name', width: 70, align: 'right' as const },
        { header: 'Phone', dataKey: 'phone', width: 35, align: 'center' as const },
        { header: 'Tax ID', dataKey: 'taxNumber', width: 35, align: 'center' as const },
        { header: 'Current Balance (SAR)', dataKey: 'currentBalance', width: 35, align: 'right' as const },
      ],
      getData: () => db.getSuppliers(),
    },
    {
      key: 'audit_logs',
      label: 'سجل العمليات والرقابة (Audit Log Trail)',
      module: 'auxiliary_reports',
      columns: [
        { header: 'Timestamp', dataKey: 'timestamp', width: 38, align: 'center' as const },
        { header: 'User', dataKey: 'username', width: 25, align: 'center' as const },
        { header: 'Action', dataKey: 'action', width: 22, align: 'center' as const },
        { header: 'Module', dataKey: 'module', width: 35, align: 'right' as const },
        { header: 'Reference', dataKey: 'recordId', width: 28, align: 'center' as const },
        { header: 'Audit Details', dataKey: 'details', width: 60, align: 'right' as const },
      ],
      getData: () => db.getAuditLogs(),
    },
    {
      key: 'financial_years',
      label: 'بيانات السنوات المالية (Financial Years Statement)',
      module: 'system_setup',
      columns: [
        { header: 'Year', dataKey: 'year', width: 25, align: 'center' as const },
        { header: 'From Month', dataKey: 'fromMonth', width: 25, align: 'center' as const },
        { header: 'To Month', dataKey: 'toMonth', width: 25, align: 'center' as const },
        { header: 'Start Date', dataKey: 'startDate', width: 30, align: 'center' as const },
        { header: 'End Date', dataKey: 'endDate', width: 30, align: 'center' as const },
        { header: 'Status', dataKey: 'status', width: 25, align: 'center' as const },
      ],
      getData: () => db.getFinancialYears(),
    },
    {
      key: 'users',
      label: 'كشف مستخدمي النظام والصلاحيات (System Users & Roles)',
      module: 'system_admin',
      columns: [
        { header: 'Full Name', dataKey: 'name', width: 60, align: 'right' as const },
        { header: 'Username', dataKey: 'username', width: 35, align: 'center' as const },
        { header: 'Assigned Role', dataKey: 'role', width: 35, align: 'center' as const },
        { header: 'Status', dataKey: 'status', width: 25, align: 'center' as const },
        { header: 'Created Date', dataKey: 'createdAt', width: 40, align: 'center' as const },
      ],
      getData: () => db.getUsers(),
    },
  ];

  const currentReport = reportOptions.find((r) => r.key === selectedReportKey) || reportOptions[0];
  const reportData = currentReport.getData();
  const summaryData = currentReport.getSummary ? currentReport.getSummary() : [];

  const handleGeneratePDF = () => {
    setIsExporting(true);
    setSuccessMessage(null);

    try {
      downloadPDF({
        title: currentReport.label,
        subtitle: `H2pro ERP System · Financial Year ${activeYear.year}`,
        docNumber: `REP-${selectedReportKey.toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-4)}`,
        columns: currentReport.columns,
        data: reportData,
        company,
        activeYear,
        currentUser,
        orientation,
        summaryRows: summaryData,
      });

      db.logAction(
        currentUser.username,
        'print',
        'تصدير PDF',
        selectedReportKey,
        `تصدير تقرير ${currentReport.label} بصيغة PDF`
      );

      setSuccessMessage(`تم إنشاء ملف الـ PDF وتنزيله بنجاح (${reportData.length} سجل).`);
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      alert(`حدث خطأ أثناء تصدير ملف PDF: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مركز تصدير التقارير وجداول البيانات إلى PDF"
      subtitle="توليد مستندات PDF معتمدة مع ترويسة الشركة الرسمية وجداول منسقة"
      width="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            عدد السجلات المستخرجة: <span className="font-bold text-[#1B3A5C]">{reportData.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded cursor-pointer transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isExporting}
              className="px-5 py-2 bg-[#1B3A5C] hover:bg-[#122840] text-white text-xs font-bold rounded shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-[#dfb758]" />
              <span>{isExporting ? 'جاري إنشاء المستند...' : 'تصدير وتحميل PDF الآن'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Report Selection Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#1B3A5C]" />
            <span>اختر جدول البيانات / التقرير المراد تصديره:</span>
          </label>
          <select
            value={selectedReportKey}
            onChange={(e) => {
              setSelectedReportKey(e.target.value);
              setSuccessMessage(null);
            }}
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded font-semibold text-[#1B3A5C] focus:border-[#1B3A5C] focus:outline-none"
          >
            {reportOptions.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label} ({r.getData().length} سجل)
              </option>
            ))}
          </select>
        </div>

        {/* Page Orientation & Settings */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">اتجاه الصفحة (Page Orientation):</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-bold border transition-colors ${
                  orientation === 'portrait'
                    ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                عمودي (Portrait - A4)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-bold border transition-colors ${
                  orientation === 'landscape'
                    ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                أفقي (Landscape - A4)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">حجم ومحاذاة الأعمدة:</label>
            <div className="bg-white p-2 rounded border border-slate-200 text-slate-600 text-[11px]">
              يتضمن التقرير ترويسة الشركة الرسمية، رقم الوثيقة، وأرقام الصفحات التلقائية.
            </div>
          </div>
        </div>

        {/* Live Table Schema Preview */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-[#122840] text-slate-200 px-3 py-1.5 text-[11px] font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#dfb758]">
              <Table className="w-3.5 h-3.5" />
              <span>أعمدة التقرير في ملف الـ PDF المصدّر ({currentReport.columns.length} أعمدة)</span>
            </span>
            <span className="font-mono text-slate-400">jspdf-autotable v5 engine</span>
          </div>

          <div className="p-3 bg-white flex flex-wrap gap-1.5">
            {currentReport.columns.map((col, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-medium text-slate-700"
              >
                {col.header}
              </span>
            ))}
          </div>
        </div>

        {/* Company Letterhead Notice */}
        <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded text-[11px] text-amber-900 leading-relaxed">
          <strong>معلومات الترويسة المضمنة في الـ PDF:</strong> اسم الشركة ({company.name})، الهاتف ({company.phone})، الرقم الضريبي ({company.taxNumber})، والسنة المالية المعتمدة ({activeYear.year}).
        </div>
      </div>
    </Modal>
  );
};
