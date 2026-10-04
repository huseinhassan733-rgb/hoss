/**
 * 5. إدارة المشتريات والموردين (Purchases Management Screen)
 * يشمل: بيانات الموردين، فاتورة مشتريات تفصيلية مع الضريبة والخصم، مردودات المشتريات، وأوامر الشراء
 */

import React, { useState } from 'react';
import {
  Supplier,
  PurchaseInvoice,
  PurchaseItem,
  PurchaseOrder,
  PurchaseReturn,
  User,
  CompanyInfo,
  FinancialYear,
  InventoryItem,
} from '../types';
import { db } from '../database/db';
import { DataGrid, Column } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { PrintHeader } from '../components/PrintHeader';
import { ERPActionBar } from '../components/ERPActionBar';
import {
  ShoppingCart,
  Truck,
  FileText,
  RotateCcw,
  ArrowRight,
  Plus,
  Trash2,
  Printer,
  DollarSign,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';

interface PurchasesScreenProps {
  currentUser: User;
  activeYear: FinancialYear;
  onBack: () => void;
  defaultTab?: TabType;
}

type TabType = 'suppliers' | 'invoices' | 'returns' | 'orders';

export const PurchasesScreen: React.FC<PurchasesScreenProps> = ({
  currentUser,
  activeYear,
  onBack,
  defaultTab = 'invoices',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => db.getSuppliers());
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(() => db.getPurchaseInvoices());
  const [orders, setOrders] = useState<PurchaseOrder[]>(() => db.getPurchaseOrders());
  const [returns, setReturns] = useState<PurchaseReturn[]>(() => db.getPurchaseReturns());
  const [items] = useState<InventoryItem[]>(() => db.getItems());
  const [company] = useState<CompanyInfo>(() => db.getCompanyInfo());

  // Print Preview
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState('');
  const [printDocNumber, setPrintDocNumber] = useState<string | undefined>();
  const [printContent, setPrintContent] = useState<React.ReactNode>(null);

  // Supplier Modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    currentBalance: 0,
  });

  // Invoice Modal
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<'add' | 'edit'>('add');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<{
    invoiceNumber: string;
    date: string;
    supplierId: string;
    paymentStatus: 'paid' | 'partial' | 'credit';
    notes: string;
    items: PurchaseItem[];
  }>({
    invoiceNumber: db.getNextPurchaseInvoiceNumber(),
    date: new Date().toISOString().slice(0, 10),
    supplierId: suppliers[0]?.id || '',
    paymentStatus: 'paid',
    notes: '',
    items: [
      {
        itemCode: items[0]?.code || 'ITM-001',
        itemName: items[0]?.name || 'صنف افتراضي',
        quantity: 5,
        unitPrice: items[0]?.purchasePrice || 100,
        taxRate: 15,
        taxAmount: 75,
        discount: 0,
        total: 575,
      },
    ],
  });

  const reloadData = () => {
    setSuppliers(db.getSuppliers());
    setInvoices(db.getPurchaseInvoices());
    setOrders(db.getPurchaseOrders());
    setReturns(db.getPurchaseReturns());
  };

  const handleConvertPOToInvoice = (order: PurchaseOrder) => {
    const inv = db.convertPOToInvoice(order.id, currentUser.username);
    if (inv) {
      alert(`تم تحويل أمر الشراء ${order.orderNumber} إلى فاتورة مشتريات رقم ${inv.invoiceNumber} بنجاح!`);
      reloadData();
      setActiveTab('invoices');
    }
  };

  // --- Supplier Handlers ---
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      code: `SUP-0${suppliers.length + 1}`,
      name: '',
      phone: '',
      email: '',
      address: '',
      taxNumber: '300',
      currentBalance: 0,
    });
    setSupplierModalOpen(true);
  };

  const handleEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({ ...sup });
    setSupplierModalOpen(true);
  };

  const handleDeleteSupplier = (sup: Supplier) => {
    if (confirm(`هل أنت متأكد من حذف المورد ${sup.name}؟`)) {
      db.deleteSupplier(sup.id, currentUser.username);
      reloadData();
    }
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const sup: Supplier = {
      id: editingSupplier ? editingSupplier.id : `sup-${Date.now()}`,
      code: supplierForm.code || '',
      name: supplierForm.name || '',
      phone: supplierForm.phone || '',
      email: supplierForm.email || '',
      address: supplierForm.address || '',
      taxNumber: supplierForm.taxNumber || '',
      currentBalance: Number(supplierForm.currentBalance) || 0,
    };
    db.saveSupplier(sup, currentUser.username);
    reloadData();
    setSupplierModalOpen(false);
  };

  // --- Invoice Handlers ---
  const handleOpenAddInvoice = () => {
    setInvoiceMode('add');
    setSelectedInvoiceId(null);
    setInvoiceForm({
      invoiceNumber: db.getNextPurchaseInvoiceNumber(),
      date: new Date().toISOString().slice(0, 10),
      supplierId: suppliers[0]?.id || '',
      paymentStatus: 'paid',
      notes: '',
      items: [
        {
          itemCode: items[0]?.code || 'ITM-001',
          itemName: items[0]?.name || 'صنف',
          quantity: 2,
          unitPrice: items[0]?.purchasePrice || 500,
          taxRate: 15,
          taxAmount: 150,
          discount: 0,
          total: 1150,
        },
      ],
    });
    setInvoiceModalOpen(true);
  };

  const handleOpenEditInvoice = (inv: PurchaseInvoice) => {
    setInvoiceMode('edit');
    setSelectedInvoiceId(inv.id);
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      supplierId: inv.supplierId,
      paymentStatus: inv.paymentStatus,
      notes: inv.notes || '',
      items: inv.items.map((it) => ({ ...it })),
    });
    setInvoiceModalOpen(true);
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
          unitPrice: defaultItem?.purchasePrice || 100,
          taxRate: 15,
          taxAmount: 15,
          discount: 0,
          total: 115,
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
        current.unitPrice = found.purchasePrice;
      }
    }

    const qty = Number(current.quantity) || 0;
    const price = Number(current.unitPrice) || 0;
    const disc = Number(current.discount) || 0;
    const sub = Math.max(0, qty * price - disc);
    const tax = (sub * (Number(current.taxRate) || 0)) / 100;

    current.taxAmount = tax;
    current.total = sub + tax;
    updated[index] = current;
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const subtotal = invoiceForm.items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice)), 0);
  const discountTotal = invoiceForm.items.reduce((s, it) => s + Number(it.discount), 0);
  const taxTotal = invoiceForm.items.reduce((s, it) => s + Number(it.taxAmount), 0);
  const grandTotal = subtotal - discountTotal + taxTotal;

  const handleSaveInvoice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const sup = suppliers.find((s) => s.id === invoiceForm.supplierId);
    const newInv: PurchaseInvoice = {
      id: selectedInvoiceId || `pi-${Date.now()}`,
      invoiceNumber: invoiceForm.invoiceNumber || db.getNextPurchaseInvoiceNumber(),
      date: invoiceForm.date,
      supplierId: invoiceForm.supplierId,
      supplierName: sup ? sup.name : 'مورد غير محدد',
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
    db.savePurchaseInvoice(newInv, currentUser.username);
    reloadData();
    setInvoiceModalOpen(false);
  };

  const handlePrintInvoice = (inv: PurchaseInvoice) => {
    setPrintTitle('فاتورة مشتريات ضريبية رسمية');
    setPrintDocNumber(inv.invoiceNumber);
    setPrintContent(
      <div className="space-y-4">
        {/* Invoice Info Bar */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded border text-xs">
          <div>
            <span className="text-slate-500">المورد:</span>{' '}
            <span className="font-bold text-[#1B3A5C]">{inv.supplierName}</span>
          </div>
          <div>
            <span className="text-slate-500">تاريخ الفاتورة:</span>{' '}
            <span className="font-mono font-bold">{inv.date}</span>
          </div>
          <div>
            <span className="text-slate-500">حالة السداد:</span>{' '}
            <span className="font-bold">
              {inv.paymentStatus === 'paid' ? 'مدفوعة بالكامل' : inv.paymentStatus === 'partial' ? 'سداد جزئي' : 'آجل (على الحساب)'}
            </span>
          </div>
        </div>

        {/* Invoice Details Table */}
        <table className="w-full text-xs text-right border-collapse border border-slate-300">
          <thead className="bg-[#1B3A5C] text-white">
            <tr>
              <th className="border p-2">كود الصنف</th>
              <th className="border p-2">البيان / اسم الصنف</th>
              <th className="border p-2 text-center">الكمية</th>
              <th className="border p-2 text-left">سعر الوحدة</th>
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
              <td colSpan={6} className="border p-2 text-left">المجموع قبل الضريبة والخصم:</td>
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
              <td colSpan={6} className="border p-2 text-left font-black">الصافي الإجمالي المستحق:</td>
              <td className="border p-2 font-mono text-left font-black text-emerald-900">
                {inv.grandTotal.toLocaleString('ar-SA')} {company.defaultCurrency}
              </td>
            </tr>
          </tfoot>
        </table>

        {inv.notes && (
          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border">
            <strong>ملاحظات الفاتورة:</strong> {inv.notes}
          </div>
        )}
      </div>
    );
    setIsPrintModalOpen(true);
  };

  // Columns
  const supplierColumns: Column<Supplier>[] = [
    { key: 'code', header: 'كود المورد', width: '100px', render: (s) => <span className="font-mono font-bold">{s.code}</span> },
    { key: 'name', header: 'اسم المورد / الشركة', render: (s) => <span className="font-bold text-[#1B3A5C]">{s.name}</span> },
    { key: 'phone', header: 'الهاتف', width: '130px', render: (s) => <span className="font-mono">{s.phone}</span> },
    { key: 'taxNumber', header: 'الرقم الضريبي', width: '160px', render: (s) => <span className="font-mono text-slate-600">{s.taxNumber}</span> },
    { key: 'currentBalance', header: 'الرصيد الدائن', width: '130px', align: 'left', render: (s) => <span className="font-mono font-bold text-red-800">{s.currentBalance.toLocaleString('ar-SA')}</span> },
  ];

  const invoiceColumns: Column<PurchaseInvoice>[] = [
    { key: 'invoiceNumber', header: 'رقم الفاتورة', width: '140px', render: (i) => <span className="font-mono font-bold text-[#1B3A5C]">{i.invoiceNumber}</span> },
    { key: 'date', header: 'التاريخ', width: '110px', render: (i) => <span className="font-mono">{i.date}</span> },
    { key: 'supplierName', header: 'المورد', render: (i) => <span className="font-bold text-slate-800">{i.supplierName}</span> },
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
      header: 'معاينة',
      width: '80px',
      align: 'center',
      render: (i) => (
        <button
          onClick={() => handlePrintInvoice(i)}
          className="px-2 py-0.5 text-[11px] font-bold bg-[#1B3A5C] text-white hover:bg-[#122840] rounded cursor-pointer"
        >
          طباعة
        </button>
      ),
    },
  ];

  const orderColumns: Column<PurchaseOrder>[] = [
    { key: 'orderNumber', header: 'رقم أمر الشراء', width: '140px', render: (o) => <span className="font-mono font-bold text-[#1B3A5C]">{o.orderNumber}</span> },
    { key: 'date', header: 'التاريخ', width: '110px', render: (o) => <span className="font-mono">{o.date}</span> },
    { key: 'supplierName', header: 'المورد المطلوب منه', render: (o) => <span className="font-bold text-slate-800">{o.supplierName}</span> },
    { key: 'grandTotal', header: 'المبلغ الإجمالي', width: '140px', align: 'left', render: (o) => <span className="font-mono font-bold text-emerald-800">{o.grandTotal.toLocaleString('ar-SA')}</span> },
    {
      key: 'status',
      header: 'الحالة',
      width: '130px',
      render: (o) => {
        const isConverted = o.status === 'converted_to_invoice';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isConverted ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
            {isConverted ? 'تم التحويل لفاتورة' : 'أمر شراء معتمد'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'إجراءات سريعة',
      width: '150px',
      align: 'center',
      render: (o) => {
        if (o.status === 'converted_to_invoice') {
          return <span className="text-[11px] text-slate-400">مكتمل ومرحل</span>;
        }
        return (
          <button
            onClick={() => handleConvertPOToInvoice(o)}
            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1 mx-auto"
          >
            <span>تحويل لفاتورة مشتريات</span>
          </button>
        );
      },
    },
  ];

  const returnColumns: Column<PurchaseReturn>[] = [
    { key: 'returnNumber', header: 'رقم إشعار المردود', width: '150px', render: (r) => <span className="font-mono font-bold text-[#1B3A5C]">{r.returnNumber}</span> },
    { key: 'date', header: 'التاريخ', width: '110px', render: (r) => <span className="font-mono">{r.date}</span> },
    { key: 'supplierName', header: 'اسم المورد', render: (r) => <span className="font-bold text-slate-800">{r.supplierName}</span> },
    { key: 'grandTotal', header: 'القيمة المستردة', width: '140px', align: 'left', render: (r) => <span className="font-mono font-bold text-red-700">{r.grandTotal.toLocaleString('ar-SA')}</span> },
    { key: 'reason', header: 'سبب الإرجاع وملاحظات', render: (r) => <span className="text-slate-600">{r.reason || 'مردودات بضاعة تالفة أو غير مطابقة'}</span> },
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
          <h1 className="text-base font-bold text-[#1B3A5C]">5. إدارة المشتريات والموردين (Purchases Management)</h1>
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
            <span>فواتير المشتريات</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'suppliers' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>بيانات الموردين</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'returns' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>مردودات المشتريات</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'orders' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>أوامر الشراء والتوريد</span>
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-hidden">
        {/* TAB 1: Invoices */}
        {activeTab === 'invoices' && (
          <DataGrid
            title="سجل فواتير المشتريات الضريبية"
            subtitle="توثيق المشتريات من الموردين واحتساب ضريبة القيمة المضافة 15%"
            data={invoices}
            columns={invoiceColumns}
            onAdd={handleOpenAddInvoice}
            onEdit={(inv) => handleOpenEditInvoice(inv)}
            onDelete={(inv) => {
              if (confirm(`هل ترغب بحذف فاتورة المشتريات ${inv.invoiceNumber}؟`)) {
                db.deletePurchaseInvoice(inv.id, currentUser.username);
                reloadData();
              }
            }}
            onPrint={() => {
              if (invoices.length > 0) {
                handlePrintInvoice(invoices[0]);
              }
            }}
            addLabel="إنشاء فاتورة مشتريات جديدة"
          />
        )}

        {/* TAB 2: Suppliers */}
        {activeTab === 'suppliers' && (
          <DataGrid
            title="دليل وبيانات الموردين"
            subtitle="إدارة حسابات الموردين، الأرقام الضريبية، ومتابعة الأرصدة الدائنة"
            data={suppliers}
            columns={supplierColumns}
            onAdd={handleOpenAddSupplier}
            onEdit={handleEditSupplier}
            onDelete={handleDeleteSupplier}
            addLabel="إضافة مورد جديد"
          />
        )}

        {/* TAB 3: Returns */}
        {activeTab === 'returns' && (
          <DataGrid
            title="سجل مردودات المشتريات وإشعارات الخصم (Purchase Returns)"
            subtitle="إشعارات الخصم والمردودات المعتمدة وخصمها من حساب المورد والمخزون"
            data={returns}
            columns={returnColumns}
            onAdd={() => alert('لتحرير إشعار مردودات جديد، يمكنك تحديد فاتورة المشتريات واختيار إنشاء مردود.')}
            addLabel="تحرير إشعار مردودات جديد"
          />
        )}

        {/* TAB 4: Purchase Orders */}
        {activeTab === 'orders' && (
          <DataGrid
            title="أوامر الشراء وعروض الأسعار من الموردين (Purchase Orders)"
            subtitle="متابعة أوامر الشراء والتحويل المباشر إلى فاتورة مشتريات معتمدة"
            data={orders}
            columns={orderColumns}
            onAdd={() => alert('لإنشاء أمر شراء سريع، يمكنك استخدام شاشة المخزون (التنبيهات الذكية) أو تحرير أمر شراء جديد.')}
            addLabel="إنشاء أمر شراء جديد"
          />
        )}
      </div>

      {/* --- Modal: Add/Edit Supplier --- */}
      <Modal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        title={editingSupplier ? `تعديل المورد ${editingSupplier.name}` : 'إضافة مورد جديد'}
      >
        <form onSubmit={handleSaveSupplier} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كود المورد:</label>
              <input
                type="text"
                value={supplierForm.code}
                onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي:</label>
              <input
                type="text"
                value={supplierForm.taxNumber}
                onChange={(e) => setSupplierForm({ ...supplierForm, taxNumber: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد / الشركة:</label>
            <input
              type="text"
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الهاتف:</label>
              <input
                type="text"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني:</label>
              <input
                type="email"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والموقع:</label>
            <input
              type="text"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSupplierModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ بيانات المورد
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal: Add Purchase Invoice --- */}
      <Modal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title={invoiceMode === 'edit' ? `تعديل فاتورة المشتريات رقم ${invoiceForm.invoiceNumber}` : "تحرير فاتورة مشتريات ضريبية جديدة"}
        width="4xl"
      >
        {/* Unified 7-Button Toolbar inside Purchase Invoice Screen */}
        <ERPActionBar
          mode={invoiceMode}
          docNumber={invoiceForm.invoiceNumber}
          docTitle="فاتورة المشتريات"
          onAdd={handleOpenAddInvoice}
          onEdit={() => setInvoiceMode('edit')}
          onDelete={() => {
            if (selectedInvoiceId && confirm(`هل أنت متأكد من حذف فاتورة المشتريات ${invoiceForm.invoiceNumber}؟`)) {
              db.deletePurchaseInvoice(selectedInvoiceId, currentUser.username);
              reloadData();
              setInvoiceModalOpen(false);
            }
          }}
          canDelete={!!selectedInvoiceId}
          onSave={() => handleSaveInvoice()}
          onCancel={() => setInvoiceModalOpen(false)}
          onPrint={() => {
            handlePrintInvoice({
              id: selectedInvoiceId || 'temp',
              invoiceNumber: invoiceForm.invoiceNumber,
              date: invoiceForm.date,
              supplierId: invoiceForm.supplierId,
              supplierName: suppliers.find((s) => s.id === invoiceForm.supplierId)?.name || '',
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
          }}
          className="mb-3"
        />

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
              <label className="block text-xs font-bold text-slate-700 mb-1">المورد:</label>
              <select
                value={invoiceForm.supplierId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded font-bold"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-[#1B3A5C] text-white p-2 text-xs font-bold flex justify-between items-center">
              <span>تفاصيل وبنود الفاتورة</span>
              <button
                type="button"
                onClick={handleAddInvoiceItem}
                className="px-2.5 py-1 bg-[#c49a37] hover:bg-[#dfb758] text-[#122840] font-black rounded text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند جديد</span>
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
                  <td colSpan={5} className="p-2 border-l text-left">الإجمالي الصافي النهائي للفاتورة:</td>
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
              onClick={() => setInvoiceModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] font-bold rounded"
            >
              حفظ واعتماد الفاتورة
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Print Preview Modal --- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="معاينة فاتورة المشتريات للطباعة"
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
