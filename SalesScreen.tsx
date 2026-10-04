/**
 * 6. إدارة المبيعات والعملاء (Sales Management Screen)
 * يشمل: بيانات العملاء، فاتورة مبيعات ضريبية، عروض الأسعار، مردودات المبيعات، وتقارير المبيعات
 */

import React, { useState, useEffect } from 'react';
import {
  Customer,
  SalesInvoice,
  SalesItem,
  User,
  CompanyInfo,
  FinancialYear,
  InventoryItem,
} from '../types';
import { db } from '../database/db';
import { DataGrid, Column } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { PrintHeader } from '../components/PrintHeader';
import { ERPActionBar, ERPMode } from '../components/ERPActionBar';
import { tafqeet } from '../utils/tafqeet';
import {
  ShoppingBag,
  Users,
  FileText,
  RotateCcw,
  ArrowRight,
  Plus,
  Trash2,
  Printer,
  DollarSign,
  TrendingUp,
  Tag,
  Search,
  CheckCircle,
  List,
} from 'lucide-react';

interface SalesScreenProps {
  currentUser: User;
  activeYear: FinancialYear;
  onBack: () => void;
  defaultTab?: TabType;
}

type TabType = 'invoices' | 'customers' | 'quotations' | 'returns' | 'reports';

export const SalesScreen: React.FC<SalesScreenProps> = ({
  currentUser,
  activeYear,
  onBack,
  defaultTab = 'invoices',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [customers, setCustomers] = useState<Customer[]>(() => db.getCustomers());
  const [invoices, setInvoices] = useState<SalesInvoice[]>(() => db.getSalesInvoices());
  const [items] = useState<InventoryItem[]>(() => db.getItems());
  const [company] = useState<CompanyInfo>(() => db.getCompanyInfo());

  // Invoices SubView: 'entry' (Direct input screen) or 'register' (Table grid)
  const [invoiceSubView, setInvoiceSubView] = useState<'entry' | 'register'>('entry');
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number>(0);
  const [invoiceMode, setInvoiceMode] = useState<ERPMode>('view');
  const [searchInvoiceModalOpen, setSearchInvoiceModalOpen] = useState(false);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');

  // Print Preview
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState('');
  const [printDocNumber, setPrintDocNumber] = useState<string | undefined>();
  const [printContent, setPrintContent] = useState<React.ReactNode>(null);

  // Customer Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '310',
    currentBalance: 0,
    creditLimit: 50000,
  });

  // Invoice Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<{
    invoiceNumber: string;
    date: string;
    customerId: string;
    paymentStatus: 'paid' | 'partial' | 'credit';
    notes: string;
    items: SalesItem[];
  }>({
    invoiceNumber: '1',
    date: new Date().toISOString().slice(0, 10),
    customerId: customers[0]?.id || '',
    paymentStatus: 'paid',
    notes: '',
    items: [
      {
        itemCode: items[0]?.code || 'ITM-001',
        itemName: items[0]?.name || 'صنف',
        quantity: 1,
        unitPrice: items[0]?.salePrice || 200,
        taxRate: 0,
        taxAmount: 0,
        discount: 0,
        total: 200,
      },
    ],
  });

  // Load an invoice into the form
  const loadInvoiceIntoForm = (inv: SalesInvoice, mode: ERPMode = 'view') => {
    setSelectedInvoiceId(inv.id);
    setInvoiceMode(mode);
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      customerId: inv.customerId,
      paymentStatus: inv.paymentStatus,
      notes: inv.notes || '',
      items: inv.items.map((it) => ({ ...it })),
    });
  };

  // Sync initial invoice on load
  useEffect(() => {
    if (invoices.length > 0 && !selectedInvoiceId && invoiceMode === 'view') {
      loadInvoiceIntoForm(invoices[0], 'view');
      setCurrentInvoiceIndex(0);
    }
  }, [invoices]);

  const reloadData = () => {
    const updatedCust = db.getCustomers();
    const updatedInv = db.getSalesInvoices();
    setCustomers(updatedCust);
    setInvoices(updatedInv);
    return updatedInv;
  };

  // Navigation handlers between invoices inside the input screen
  const handleFirstInvoice = () => {
    if (invoices.length > 0) {
      setCurrentInvoiceIndex(0);
      loadInvoiceIntoForm(invoices[0], 'view');
    }
  };

  const handlePrevInvoice = () => {
    if (currentInvoiceIndex > 0) {
      const idx = currentInvoiceIndex - 1;
      setCurrentInvoiceIndex(idx);
      loadInvoiceIntoForm(invoices[idx], 'view');
    }
  };

  const handleNextInvoice = () => {
    if (currentInvoiceIndex < invoices.length - 1) {
      const idx = currentInvoiceIndex + 1;
      setCurrentInvoiceIndex(idx);
      loadInvoiceIntoForm(invoices[idx], 'view');
    }
  };

  const handleLastInvoice = () => {
    if (invoices.length > 0) {
      const idx = invoices.length - 1;
      setCurrentInvoiceIndex(idx);
      loadInvoiceIntoForm(invoices[idx], 'view');
    }
  };

  // 7 ERP Buttons Handlers for Sales Invoice Screen
  // 1. إضافة (Add) - Auto sequential number starting from 1
  const handleAddNewInvoice = () => {
    setInvoiceSubView('entry');
    setInvoiceMode('add');
    setSelectedInvoiceId(null);
    setInvoiceForm({
      invoiceNumber: db.getNextSalesInvoiceNumber(),
      date: new Date().toISOString().slice(0, 10),
      customerId: customers[0]?.id || '',
      paymentStatus: 'paid',
      notes: '',
      items: [
        {
          itemCode: items[0]?.code || 'ITM-001',
          itemName: items[0]?.name || 'صنف',
          quantity: 1,
          unitPrice: items[0]?.salePrice || 200,
          taxRate: 0,
          taxAmount: 0,
          discount: 0,
          total: 200,
        },
      ],
    });
  };

  // 2. تعديل (Edit)
  const handleEditActiveInvoice = () => {
    setInvoiceSubView('entry');
    setInvoiceMode('edit');
  };

  // 3. حذف (Delete)
  const handleDeleteActiveInvoice = () => {
    if (!selectedInvoiceId) return;
    if (confirm(`هل أنت متأكد من حذف فاتورة المبيعات رقم ${invoiceForm.invoiceNumber} نهائياً؟`)) {
      db.deleteSalesInvoice(selectedInvoiceId, currentUser.username);
      const updated = reloadData();
      if (updated.length > 0) {
        const nextIdx = Math.min(currentInvoiceIndex, updated.length - 1);
        setCurrentInvoiceIndex(nextIdx);
        loadInvoiceIntoForm(updated[nextIdx], 'view');
      } else {
        handleAddNewInvoice();
      }
    }
  };

  // 4. بحث (Search) - Open quick search selector
  const handleSearchClick = () => {
    setSearchInvoiceModalOpen(true);
  };

  // 5. حفظ (Save)
  const handleSaveActiveInvoice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invoiceForm.items || invoiceForm.items.length === 0) {
      alert('يجب إضافة صنف واحد على الأقل في الفاتورة.');
      return;
    }
    const cust = customers.find((c) => c.id === invoiceForm.customerId);
    const newInv: SalesInvoice = {
      id: selectedInvoiceId || `si-${Date.now()}`,
      invoiceNumber: invoiceForm.invoiceNumber || db.getNextSalesInvoiceNumber(),
      date: invoiceForm.date,
      customerId: invoiceForm.customerId,
      customerName: cust ? cust.name : 'عميل عام',
      items: invoiceForm.items,
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      paymentStatus: invoiceForm.paymentStatus,
      notes: invoiceForm.notes,
      financialYear: activeYear.year,
      createdBy: currentUser.username,
    };
    db.saveSalesInvoice(newInv, currentUser.username);
    const updated = reloadData();
    const savedIdx = updated.findIndex((i) => i.id === newInv.id || i.invoiceNumber === newInv.invoiceNumber);
    const targetIdx = savedIdx >= 0 ? savedIdx : 0;
    setCurrentInvoiceIndex(targetIdx);
    loadInvoiceIntoForm(updated[targetIdx], 'view');
    alert(`تم حفظ فاتورة المبيعات رقم ${newInv.invoiceNumber} بنجاح وترحيلها للحسابات.`);
  };

  // 6. تراجع (Undo / Cancel)
  const handleCancelActiveInvoice = () => {
    if (invoices.length > 0) {
      const idx = currentInvoiceIndex >= 0 && currentInvoiceIndex < invoices.length ? currentInvoiceIndex : 0;
      loadInvoiceIntoForm(invoices[idx], 'view');
    } else {
      handleAddNewInvoice();
    }
  };

  // 7. طباعة (Print)
  const handlePrintActiveInvoice = () => {
    const cust = customers.find((c) => c.id === invoiceForm.customerId);
    handlePrintInvoice({
      id: selectedInvoiceId || 'temp',
      invoiceNumber: invoiceForm.invoiceNumber,
      date: invoiceForm.date,
      customerId: invoiceForm.customerId,
      customerName: cust ? cust.name : 'عميل عام',
      items: invoiceForm.items,
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      paymentStatus: invoiceForm.paymentStatus,
      notes: invoiceForm.notes,
      financialYear: activeYear.year,
      createdBy: currentUser.username,
    });
  };

  // --- Customer Handlers ---
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerForm({
      code: `CST-0${customers.length + 1}`,
      name: '',
      phone: '',
      email: '',
      address: '',
      taxNumber: '310',
      currentBalance: 0,
      creditLimit: 50000,
    });
    setCustomerModalOpen(true);
  };

  const handleEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setCustomerForm({ ...cust });
    setCustomerModalOpen(true);
  };

  const handleDeleteCustomer = (cust: Customer) => {
    if (confirm(`هل ترغب بحذف العميل ${cust.name}؟`)) {
      db.deleteCustomer(cust.id, currentUser.username);
      reloadData();
    }
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const cust: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      code: customerForm.code || '',
      name: customerForm.name || '',
      phone: customerForm.phone || '',
      email: customerForm.email || '',
      address: customerForm.address || '',
      taxNumber: customerForm.taxNumber || '',
      currentBalance: Number(customerForm.currentBalance) || 0,
      creditLimit: Number(customerForm.creditLimit) || 0,
    };
    db.saveCustomer(cust, currentUser.username);
    reloadData();
    setCustomerModalOpen(false);
  };

  // --- Invoice Handlers ---
  const handleOpenAddInvoice = () => {
    setInvoiceSubView('entry');
    setInvoiceMode('add');
    setSelectedInvoiceId(null);
    setInvoiceForm({
      invoiceNumber: db.getNextSalesInvoiceNumber(),
      date: new Date().toISOString().slice(0, 10),
      customerId: customers[0]?.id || '',
      paymentStatus: 'paid',
      notes: '',
      items: [
        {
          itemCode: items[0]?.code || 'ITM-001',
          itemName: items[0]?.name || 'صنف',
          quantity: 1,
          unitPrice: items[0]?.salePrice || 500,
          taxRate: 0,
          taxAmount: 0,
          discount: 0,
          total: 500,
        },
      ],
    });
  };

  const handleOpenEditInvoice = (inv: SalesInvoice) => {
    setInvoiceSubView('entry');
    setInvoiceMode('edit');
    setSelectedInvoiceId(inv.id);
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      customerId: inv.customerId,
      paymentStatus: inv.paymentStatus,
      notes: inv.notes || '',
      items: inv.items.map((it) => ({ ...it })),
    });
  };

  const handleAddInvoiceItem = () => {
    const defaultItem = items[0];
    setInvoiceForm({
      ...invoiceForm,
      items: [
        ...invoiceForm.items,
        {
          itemCode: defaultItem?.code || 'ITM-001',
          itemName: defaultItem?.name || 'صنف جديد',
          quantity: 1,
          unitPrice: defaultItem?.salePrice || 100,
          taxRate: 0,
          taxAmount: 0,
          discount: 0,
          total: 100,
        },
      ],
    });
  };

  const handleRemoveInvoiceItem = (index: number) => {
    if (invoiceForm.items.length <= 1) {
      alert('يجب أن تحتوي الفاتورة على بند واحد على الأقل.');
      return;
    }
    const updated = [...invoiceForm.items];
    updated.splice(index, 1);
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    const updated = [...invoiceForm.items];
    const current = { ...updated[index], [field]: value };

    if (field === 'itemCode') {
      const found = items.find((i) => i.code === value);
      if (found) {
        current.itemName = found.name;
        current.unitPrice = found.salePrice;
      }
    }

    const qty = Number(current.quantity) || 0;
    const price = Number(current.unitPrice) || 0;
    const disc = Number(current.discount) || 0;
    const sub = Math.max(0, qty * price - disc);

    current.taxRate = 0;
    current.taxAmount = 0;
    current.total = sub;
    updated[index] = current;
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const subtotal = invoiceForm.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unitPrice), 0);
  const discountTotal = invoiceForm.items.reduce((s, it) => s + Number(it.discount), 0);
  const taxTotal = 0;
  const grandTotal = subtotal - discountTotal;

  const handleSaveInvoice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cust = customers.find((c) => c.id === invoiceForm.customerId);
    const newInv: SalesInvoice = {
      id: selectedInvoiceId || `si-${Date.now()}`,
      invoiceNumber: invoiceForm.invoiceNumber || db.getNextSalesInvoiceNumber(),
      date: invoiceForm.date,
      customerId: invoiceForm.customerId,
      customerName: cust ? cust.name : 'عميل غير محدد',
      items: invoiceForm.items,
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      paymentStatus: invoiceForm.paymentStatus,
      notes: invoiceForm.notes,
      financialYear: activeYear.year,
      createdBy: currentUser.username,
    };
    db.saveSalesInvoice(newInv, currentUser.username);
    reloadData();
    setInvoiceSubView('register');
  };

  const handlePrintInvoice = (inv: SalesInvoice) => {
    setPrintTitle('فاتورة مبيعات ضريبية مبسطة (ZATCA Compliant)');
    setPrintDocNumber(inv.invoiceNumber);
    setPrintContent(
      <div className="space-y-4">
        {/* Customer & Invoice Info */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded border text-xs">
          <div>
            <span className="text-slate-500">العميل:</span>{' '}
            <span className="font-bold text-[#1B3A5C]">{inv.customerName}</span>
          </div>
          <div>
            <span className="text-slate-500">تاريخ الفاتورة:</span>{' '}
            <span className="font-mono font-bold">{inv.date}</span>
          </div>
          <div>
            <span className="text-slate-500">طريقة السداد:</span>{' '}
            <span className="font-bold">
              {inv.paymentStatus === 'paid' ? 'مدفوعة نقداً/شبكة' : 'آجل على الحساب'}
            </span>
          </div>
        </div>

        {/* Invoice Items */}
        <table className="w-full text-xs text-right border-collapse border border-slate-300">
          <thead className="bg-[#1B3A5C] text-white">
            <tr>
              <th className="border p-2">كود الصنف</th>
              <th className="border p-2">البيان / اسم الصنف</th>
              <th className="border p-2 text-center">الكمية</th>
              <th className="border p-2 text-left">سعر البيع</th>
              <th className="border p-2 text-left">الخصم</th>
              <th className="border p-2 text-left">الضريبة (15%)</th>
              <th className="border p-2 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="border p-2 font-mono">{it.itemCode}</td>
                <td className="border p-2 font-semibold">{it.itemName}</td>
                <td className="border p-2 font-mono text-center font-bold">{it.quantity}</td>
                <td className="border p-2 font-mono text-left">{it.unitPrice.toLocaleString('ar-SA')}</td>
                <td className="border p-2 font-mono text-left">{it.discount > 0 ? it.discount.toLocaleString('ar-SA') : '-'}</td>
                <td className="border p-2 font-mono text-left">{it.taxAmount.toLocaleString('ar-SA')}</td>
                <td className="border p-2 font-mono text-left font-bold">{it.total.toLocaleString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold">
            <tr>
              <td colSpan={6} className="border p-2 text-left">المجموع قبل الضريبة:</td>
              <td className="border p-2 font-mono text-left">{inv.subtotal.toLocaleString('ar-SA')}</td>
            </tr>
            {inv.discountTotal > 0 && (
              <tr>
                <td colSpan={6} className="border p-2 text-left">إجمالي الخصم الممنوح:</td>
                <td className="border p-2 font-mono text-left text-red-700">-{inv.discountTotal.toLocaleString('ar-SA')}</td>
              </tr>
            )}
            <tr>
              <td colSpan={6} className="border p-2 text-left">ضريبة القيمة المضافة (15%):</td>
              <td className="border p-2 font-mono text-left">{inv.taxTotal.toLocaleString('ar-SA')}</td>
            </tr>
            <tr className="bg-amber-100 text-[#1B3A5C] text-sm">
              <td colSpan={6} className="border p-2 text-left font-black">المبلغ الإجمالي شامل الضريبة:</td>
              <td className="border p-2 font-mono text-left font-black text-emerald-900">
                {inv.grandTotal.toLocaleString('ar-SA')} {company.defaultCurrency}
              </td>
            </tr>
          </tfoot>
        </table>

        {inv.notes && (
          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border">
            <strong>ملاحظات وشروط الفاتورة:</strong> {inv.notes}
          </div>
        )}
      </div>
    );
    setIsPrintModalOpen(true);
  };

  // Columns
  const customerColumns: Column<Customer>[] = [
    { key: 'code', header: 'كود العميل', width: '100px', render: (c) => <span className="font-mono font-bold text-[#1B3A5C]">{c.code}</span> },
    { key: 'name', header: 'اسم العميل / الشركة', render: (c) => <span className="font-bold text-[#1B3A5C]">{c.name}</span> },
    { key: 'phone', header: 'الهاتف', width: '130px', render: (c) => <span className="font-mono">{c.phone}</span> },
    { key: 'taxNumber', header: 'الرقم الضريبي', width: '160px', render: (c) => <span className="font-mono text-slate-600">{c.taxNumber || 'غير مسجل'}</span> },
    { key: 'currentBalance', header: 'الرصيد المدين', width: '130px', align: 'left', render: (c) => <span className="font-mono font-bold text-red-800">{c.currentBalance.toLocaleString('ar-SA')}</span> },
    {
      key: 'creditLimit',
      header: 'الحد الائتماني والحالة',
      width: '180px',
      align: 'left',
      render: (c) => {
        const isExceeded = c.creditLimit > 0 && c.currentBalance > c.creditLimit;
        return (
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono font-semibold text-slate-700">{c.creditLimit.toLocaleString('ar-SA')}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isExceeded
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isExceeded ? 'تجاوز السقف!' : 'ضمن الحد'}
            </span>
          </div>
        );
      },
    },
  ];

  const invoiceColumns: Column<SalesInvoice>[] = [
    { key: 'invoiceNumber', header: 'رقم الفاتورة', width: '140px', render: (i) => <span className="font-mono font-bold text-[#1B3A5C]">{i.invoiceNumber}</span> },
    { key: 'date', header: 'التاريخ', width: '110px', render: (i) => <span className="font-mono">{i.date}</span> },
    { key: 'customerName', header: 'العميل', render: (i) => <span className="font-bold text-slate-800">{i.customerName}</span> },
    { key: 'grandTotal', header: 'الإجمالي الصافي', width: '140px', align: 'left', render: (i) => <span className="font-mono font-bold text-emerald-800">{i.grandTotal.toLocaleString('ar-SA')}</span> },
    {
      key: 'paymentStatus',
      header: 'السداد',
      width: '110px',
      render: (i) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${i.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {i.paymentStatus === 'paid' ? 'مدفوعة' : 'آجل / جزئي'}
        </span>
      ),
    },
    {
      key: 'print',
      header: 'طباعة الفاتورة',
      width: '100px',
      align: 'center',
      render: (i) => (
        <button
          onClick={() => handlePrintInvoice(i)}
          className="px-2 py-0.5 text-[11px] font-bold bg-[#1B3A5C] text-white hover:bg-[#122840] rounded"
        >
          فاتورة ضريبية
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
          <h1 className="text-base font-bold text-[#1B3A5C]">6. إدارة المبيعات والعملاء (Sales & Billing)</h1>
        </div>

        {/* 4 Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'invoices' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>فواتير المبيعات</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'customers' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>بيانات العملاء</span>
          </button>

          <button
            onClick={() => setActiveTab('quotations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'quotations' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>عروض الأسعار</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'returns' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>مردودات المبيعات</span>
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-hidden">
        {/* TAB 1: Invoices */}
        {activeTab === 'invoices' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Sub-view Switcher: Entry Screen vs Register List */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setInvoiceSubView('entry')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    invoiceSubView === 'entry'
                      ? 'bg-[#1B3A5C] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#dfb758]" />
                  <span>شاشة إدخال الفاتورة (مباشر)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceSubView('register')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    invoiceSubView === 'register'
                      ? 'bg-[#1B3A5C] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-[#dfb758]" />
                  <span>سجل وفهرس الفواتير السابقة ({invoices.length})</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {invoiceSubView === 'entry' ? (
                  <span>
                    مستند معروض: <strong className="text-[#1B3A5C] font-mono">{invoiceForm.invoiceNumber}</strong> | التسلسل يبدأ من 1 تلقائياً
                  </span>
                ) : (
                  <span>استعراض جدول كافة فواتير المبيعات المسجلة</span>
                )}
              </div>
            </div>

            {/* Sub-View A: Direct Document Entry Screen */}
            {invoiceSubView === 'entry' ? (
              <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                {/* 1. Window Header Bar */}
                <div className="bg-[#1B3A5C] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#dfb758]" />
                    <span>شاشة إدخال: فاتورة مبيعات ضريبية (ZATCA Compliant)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-300">السنة المالية: {activeYear.year}</span>
                    <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                      {invoiceMode === 'add' ? 'وضع إدخال جديد' : invoiceMode === 'edit' ? 'وضع تعديل المستند' : 'وضع استعراض الفاتورة'}
                    </span>
                  </div>
                </div>

                {/* 2. THE 7 ERP ACTION BUTTONS INSIDE THE ENTRY SCREEN */}
                <div className="p-2 border-b border-slate-300 bg-slate-50 shrink-0">
                  <ERPActionBar
                    mode={invoiceMode}
                    docNumber={invoiceForm.invoiceNumber}
                    docTitle="فاتورة مبيعات"
                    onAdd={handleAddNewInvoice}
                    onEdit={handleEditActiveInvoice}
                    onDelete={handleDeleteActiveInvoice}
                    onSearch={handleSearchClick}
                    onSave={() => handleSaveActiveInvoice()}
                    onCancel={handleCancelActiveInvoice}
                    onPrint={handlePrintActiveInvoice}
                    onFirst={handleFirstInvoice}
                    onPrev={handlePrevInvoice}
                    onNext={handleNextInvoice}
                    onLast={handleLastInvoice}
                    canNavigateFirst={currentInvoiceIndex > 0}
                    canNavigatePrev={currentInvoiceIndex > 0}
                    canNavigateNext={currentInvoiceIndex < invoices.length - 1}
                    canNavigateLast={currentInvoiceIndex < invoices.length - 1}
                    currentRecordIndex={invoices.length > 0 ? currentInvoiceIndex + 1 : 0}
                    totalRecordsCount={invoices.length}
                    canDelete={!!selectedInvoiceId && invoices.length > 0}
                  />
                </div>

                {/* 3. Document Form Body */}
                <form onSubmit={handleSaveActiveInvoice} className="flex-1 flex flex-col p-3 overflow-auto space-y-3">
                  {/* Header Fields Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-md border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم الفاتورة: <span className="text-[11px] text-emerald-700 font-semibold">(تسلسل تلقائي)</span>
                      </label>
                      <input
                        type="text"
                        value={invoiceForm.invoiceNumber}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                        disabled={invoiceMode === 'view'}
                        required
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الفاتورة:</label>
                      <input
                        type="date"
                        value={invoiceForm.date}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                        disabled={invoiceMode === 'view'}
                        required
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل:</label>
                      <select
                        value={invoiceForm.customerId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                        disabled={invoiceMode === 'view'}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-bold bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.taxNumber ? `(ض. ${c.taxNumber})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">طريقة السداد:</label>
                      <select
                        value={invoiceForm.paymentStatus}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentStatus: e.target.value as any })}
                        disabled={invoiceMode === 'view'}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-600 font-bold focus:outline-none focus:border-[#1B3A5C]"
                      >
                        <option value="paid">نقداً / شبكة بنكية (مدفوعة)</option>
                        <option value="credit">آجل على حساب العميل</option>
                        <option value="partial">دفعة جزئية مقدمة</option>
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-slate-700 mb-1">البيان والملاحظات:</label>
                      <input
                        type="text"
                        value={invoiceForm.notes}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                        disabled={invoiceMode === 'view'}
                        placeholder="أدخل أي ملاحظات أو شروط خاصة بالفاتورة..."
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-600 focus:outline-none focus:border-[#1B3A5C]"
                      />
                    </div>
                  </div>

                  {/* Invoice Line Items Table */}
                  <div className="border border-slate-300 rounded-md overflow-hidden flex-1 flex flex-col">
                    <div className="bg-[#1B3A5C] text-white px-3 py-1.5 text-xs font-bold flex justify-between items-center shrink-0">
                      <span>أصناف وبنود فاتورة المبيعات ({invoiceForm.items.length} أصناف)</span>
                      {invoiceMode !== 'view' && (
                        <button
                          type="button"
                          onClick={handleAddInvoiceItem}
                          className="px-2.5 py-1 bg-[#c49a37] hover:bg-[#dfb758] text-[#122840] font-black rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة صنف جديد للفاتورة</span>
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-auto bg-white">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead className="bg-slate-100 border-b border-slate-300 sticky top-0">
                          <tr>
                            <th className="p-2 border-l border-slate-300 w-10 text-center">#</th>
                            <th className="p-2 border-l border-slate-300">الصنف / المنتج</th>
                            <th className="p-2 border-l border-slate-300 w-24 text-center">الكمية</th>
                            <th className="p-2 border-l border-slate-300 w-28 text-left">سعر الوحدة</th>
                            <th className="p-2 border-l border-slate-300 w-24 text-left">الخصم</th>
                            <th className="p-2 border-l border-slate-300 w-28 text-left">الضريبة (15%)</th>
                            <th className="p-2 border-l border-slate-300 w-32 text-left">الإجمالي الصافي</th>
                            {invoiceMode !== 'view' && <th className="p-2 w-12 text-center">حذف</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {invoiceForm.items.map((line, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-1.5 border-l border-slate-200 text-center font-mono text-slate-500 font-bold">
                                {idx + 1}
                              </td>

                              <td className="p-1.5 border-l border-slate-200">
                                {invoiceMode === 'view' ? (
                                  <div className="font-semibold text-slate-800">
                                    <span className="font-mono text-slate-500 text-[11px] ml-1.5">[{line.itemCode}]</span>
                                    {line.itemName}
                                  </div>
                                ) : (
                                  <select
                                    value={line.itemCode}
                                    onChange={(e) => handleItemFieldChange(idx, 'itemCode', e.target.value)}
                                    className="w-full text-xs p-1 border border-slate-300 rounded font-semibold"
                                  >
                                    {items.map((it) => (
                                      <option key={it.id} value={it.code}>
                                        {it.code} - {it.name} ({it.salePrice} {company.defaultCurrency})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              <td className="p-1.5 border-l border-slate-200">
                                {invoiceMode === 'view' ? (
                                  <div className="font-mono font-bold text-center text-slate-800">{line.quantity}</div>
                                ) : (
                                  <input
                                    type="number"
                                    min="1"
                                    value={line.quantity}
                                    onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                                    className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-center font-bold"
                                  />
                                )}
                              </td>

                              <td className="p-1.5 border-l border-slate-200">
                                {invoiceMode === 'view' ? (
                                  <div className="font-mono text-left">{Number(line.unitPrice).toFixed(2)}</div>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={line.unitPrice}
                                    onChange={(e) => handleItemFieldChange(idx, 'unitPrice', Number(e.target.value))}
                                    className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-left font-bold"
                                  />
                                )}
                              </td>

                              <td className="p-1.5 border-l border-slate-200">
                                {invoiceMode === 'view' ? (
                                  <div className="font-mono text-left text-red-700">
                                    {line.discount > 0 ? Number(line.discount).toFixed(2) : '-'}
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={line.discount}
                                    onChange={(e) => handleItemFieldChange(idx, 'discount', Number(e.target.value))}
                                    className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-left"
                                  />
                                )}
                              </td>

                              <td className="p-1.5 border-l border-slate-200 font-mono text-left text-slate-700">
                                {Number(line.taxAmount).toFixed(2)}
                              </td>

                              <td className="p-1.5 border-l border-slate-200 font-mono text-left font-black text-[#1B3A5C]">
                                {Number(line.total).toFixed(2)}
                              </td>

                              {invoiceMode !== 'view' && (
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInvoiceItem(idx)}
                                    className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                                    title="حذف هذا الصنف"
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

                  {/* Totals & Arabic Tafqeet Summary */}
                  <div className="bg-slate-50 border border-slate-300 rounded-md p-3 shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs mb-2">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-500 block">الإجمالي قبل الضريبة:</span>
                        <span className="text-base font-bold font-mono text-slate-800">
                          {subtotal.toFixed(2)} {company.defaultCurrency}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-500 block">إجمالي الخصم الممنوح:</span>
                        <span className="text-base font-bold font-mono text-red-700">
                          {discountTotal.toFixed(2)} {company.defaultCurrency}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-500 block">ضريبة القيمة المضافة (15%):</span>
                        <span className="text-base font-bold font-mono text-blue-800">
                          {taxTotal.toFixed(2)} {company.defaultCurrency}
                        </span>
                      </div>

                      <div className="bg-[#1B3A5C] text-white p-2 rounded shadow-xs">
                        <span className="text-slate-200 text-[11px] block">الصافي النهائي المطلوب سداده:</span>
                        <span className="text-lg font-black font-mono text-[#dfb758]">
                          {grandTotal.toFixed(2)} {company.defaultCurrency}
                        </span>
                      </div>
                    </div>

                    {/* Tafqeet in Arabic Words */}
                    <div className="bg-emerald-50/80 border border-emerald-200 p-2 rounded text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-900">المبلغ كتابةً وتفقيطاً:</span>
                        <span className="font-semibold text-emerald-800">{tafqeet(grandTotal)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        رقم الفاتورة: {invoiceForm.invoiceNumber} | السنة: {activeYear.year}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              /* Sub-View B: Register / List Table */
              <div className="flex-1 overflow-hidden">
                <DataGrid
                  title="سجل فواتير المبيعات الضريبية"
                  subtitle="إصدار وإدارة فواتير المبيعات النقدية والآجلة وفق متطلبات هيئة الزكاة والضريبة"
                  data={invoices}
                  columns={invoiceColumns}
                  onAdd={handleAddNewInvoice}
                  onEdit={(inv) => {
                    const idx = invoices.findIndex((i) => i.id === inv.id);
                    if (idx >= 0) setCurrentInvoiceIndex(idx);
                    loadInvoiceIntoForm(inv, 'edit');
                    setInvoiceSubView('entry');
                  }}
                  onDelete={(inv) => {
                    if (confirm(`هل أنت متأكد من حذف فاتورة المبيعات ${inv.invoiceNumber}؟`)) {
                      db.deleteSalesInvoice(inv.id, currentUser.username);
                      reloadData();
                    }
                  }}
                  onPrint={() => {
                    if (invoices.length > 0) {
                      handlePrintInvoice(invoices[0]);
                    }
                  }}
                  addLabel="فتح شاشة الإدخال لإضافة فاتورة"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Customers */}
        {activeTab === 'customers' && (
          <DataGrid
            title="دليل وسجل العملاء"
            subtitle="إدارة بيانات العملاء، الحدود الائتمانية، ومتابعة الأرصدة المدينة"
            data={customers}
            columns={customerColumns}
            onAdd={handleOpenAddCustomer}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            addLabel="إضافة عميل جديد"
          />
        )}

        {/* TAB 3: Quotations */}
        {activeTab === 'quotations' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full p-8 flex flex-col items-center justify-center text-center">
            <Tag className="w-12 h-12 text-[#c49a37] mb-3" />
            <h2 className="text-base font-bold text-[#1B3A5C]">عروض الأسعار للعملاء</h2>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              إنشاء عروض أسعار للعملاء مع فترة صلاحية معتمدة مع إمكانية تحويل العرض مباشرة إلى فاتورة مبيعات بنقرة واحدة.
            </p>
            <button
              onClick={handleOpenAddInvoice}
              className="mt-4 px-4 py-2 bg-[#1B3A5C] text-white hover:bg-[#122840] text-xs font-bold rounded"
            >
              + إنشاء عرض سعر جديد
            </button>
          </div>
        )}

        {/* TAB 4: Sales Returns */}
        {activeTab === 'returns' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full p-8 flex flex-col items-center justify-center text-center">
            <RotateCcw className="w-12 h-12 text-[#1B3A5C] mb-3" />
            <h2 className="text-base font-bold text-[#1B3A5C]">مردودات المبيعات وإشعارات الدائن</h2>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              تسجيل المرتجعات من العملاء، إرجاع البضاعة لمستودع محدد، وإصدار إشعار دائن ضريبي معتمد.
            </p>
            <button
              onClick={handleOpenAddInvoice}
              className="mt-4 px-4 py-2 bg-[#1B3A5C] text-white hover:bg-[#122840] text-xs font-bold rounded"
            >
              + تحرير إشعار مردودات جديد
            </button>
          </div>
        )}
      </div>

      {/* --- Modal: Add/Edit Customer --- */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title={editingCustomer ? `تعديل بيانات العميل ${editingCustomer.name}` : 'إضافة عميل جديد'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كود العميل:</label>
              <input
                type="text"
                value={customerForm.code}
                onChange={(e) => setCustomerForm({ ...customerForm, code: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي:</label>
              <input
                type="text"
                value={customerForm.taxNumber}
                onChange={(e) => setCustomerForm({ ...customerForm, taxNumber: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل / الشركة:</label>
            <input
              type="text"
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الهاتف:</label>
              <input
                type="text"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني:</label>
              <input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الحد الائتماني المسموح به:</label>
              <input
                type="number"
                value={customerForm.creditLimit || 0}
                onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الافتتاحي:</label>
              <input
                type="number"
                value={customerForm.currentBalance || 0}
                onChange={(e) => setCustomerForm({ ...customerForm, currentBalance: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والموقع:</label>
            <input
              type="text"
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCustomerModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ بيانات العميل
            </button>
          </div>
        </form>
      </Modal>

        <form onSubmit={handleSaveInvoice} className="space-y-4">
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded border">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الفاتورة:</label>
              <input
                type="text"
                value={invoiceForm.invoiceNumber}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                required
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الفاتورة:</label>
              <input
                type="date"
                value={invoiceForm.date}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                required
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العميل:</label>
              <select
                value={invoiceForm.customerId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-bold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-[#1B3A5C] text-white p-2 text-xs font-bold flex justify-between items-center">
              <span>أصناف وبنود فاتورة المبيعات</span>
              <button
                type="button"
                onClick={handleAddInvoiceItem}
                className="px-2.5 py-1 bg-[#c49a37] hover:bg-[#dfb758] text-[#122840] font-black rounded text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صنف</span>
              </button>
            </div>

            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="p-2 border-l">الصنف</th>
                  <th className="p-2 border-l w-20 text-center">الكمية</th>
                  <th className="p-2 border-l w-24 text-left">السعر</th>
                  <th className="p-2 border-l w-20 text-left">الخصم</th>
                  <th className="p-2 border-l w-24 text-left">الضريبة (15%)</th>
                  <th className="p-2 border-l w-28 text-left">الإجمالي</th>
                  <th className="p-2 w-10 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoiceForm.items.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-1.5 border-l">
                      <select
                        value={line.itemCode}
                        onChange={(e) => handleItemFieldChange(idx, 'itemCode', e.target.value)}
                        className="w-full text-xs p-1 border border-slate-300 rounded"
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.code}>
                            {it.code} - {it.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-1.5 border-l">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-center"
                      />
                    </td>

                    <td className="p-1.5 border-l">
                      <input
                        type="number"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => handleItemFieldChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-left"
                      />
                    </td>

                    <td className="p-1.5 border-l">
                      <input
                        type="number"
                        step="0.01"
                        value={line.discount}
                        onChange={(e) => handleItemFieldChange(idx, 'discount', Number(e.target.value))}
                        className="w-full text-xs p-1 border border-slate-300 rounded font-mono text-left"
                      />
                    </td>

                    <td className="p-1.5 border-l font-mono text-left text-slate-600">
                      {line.taxAmount.toFixed(2)}
                    </td>

                    <td className="p-1.5 border-l font-mono text-left font-bold text-slate-800">
                      {line.total.toFixed(2)}
                    </td>

                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveInvoiceItem(idx)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="p-2 border-l text-left">إجمالي الفاتورة شامل الضريبة 15%:</td>
                  <td colSpan={2} className="p-2 font-mono text-left font-black text-emerald-800 text-sm">
                    {grandTotal.toFixed(2)} {company.defaultCurrency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setInvoiceSubView('register')}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] font-bold rounded"
            >
              إصدار الفاتورة الضريبية
            </button>
          </div>
        </form>

      {/* --- Quick Search & Select Invoice Modal --- */}
      <Modal
        isOpen={searchInvoiceModalOpen}
        onClose={() => setSearchInvoiceModalOpen(false)}
        title="بحث واستدعاء فاتورة مبيعات إلى شاشة الإدخال"
        width="2xl"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={invoiceSearchTerm}
              onChange={(e) => setInvoiceSearchTerm(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم العميل، التاريخ، أو المبلغ..."
              className="w-full text-xs pr-9 pl-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] text-slate-800"
            />
          </div>

          <div className="border border-slate-300 rounded overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-[#1B3A5C] text-white sticky top-0">
                <tr>
                  <th className="p-2 border-l border-slate-700">رقم الفاتورة</th>
                  <th className="p-2 border-l border-slate-700">التاريخ</th>
                  <th className="p-2 border-l border-slate-700">العميل</th>
                  <th className="p-2 border-l border-slate-700 text-left">الصافي</th>
                  <th className="p-2 text-center w-24">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices
                  .filter((inv) => {
                    if (!invoiceSearchTerm.trim()) return true;
                    const term = invoiceSearchTerm.toLowerCase();
                    return (
                      inv.invoiceNumber.toLowerCase().includes(term) ||
                      inv.customerName.toLowerCase().includes(term) ||
                      inv.date.includes(term) ||
                      inv.grandTotal.toString().includes(term)
                    );
                  })
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-blue-50/70 transition-colors">
                      <td className="p-2 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-2 font-mono border-l border-slate-200">{inv.date}</td>
                      <td className="p-2 font-bold text-slate-800 border-l border-slate-200">{inv.customerName}</td>
                      <td className="p-2 font-mono font-bold text-emerald-800 text-left border-l border-slate-200">
                        {inv.grandTotal.toLocaleString('ar-SA')} {company.defaultCurrency}
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const idx = invoices.findIndex((i) => i.id === inv.id);
                            if (idx >= 0) setCurrentInvoiceIndex(idx);
                            loadInvoiceIntoForm(inv, 'view');
                            setInvoiceSubView('entry');
                            setSearchInvoiceModalOpen(false);
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

      {/* --- Print Preview Modal --- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="معاينة الفاتورة الضريبية للطباعة"
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
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              طباعة الفاتورة الآن
            </button>
          </div>
        }
      >
        <div className="printable-area bg-white p-4">
          <PrintHeader company={company} title={printTitle} docNumber={printDocNumber} />
          {printContent}
        </div>
      </Modal>
    </div>
  );
};
