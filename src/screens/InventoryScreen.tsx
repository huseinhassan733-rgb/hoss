/**
 * 4. إدارة المخزون والمستودعات (Inventory Management Screen)
 * يشمل: بيانات الأصناف، بيانات المخازن، حركات المخزون، وتقارير الجرد والأرصدة
 */

import React, { useState } from 'react';
import { InventoryItem, Warehouse, StockMovement, User, CompanyInfo } from '../types';
import { db } from '../database/db';
import { DataGrid, Column } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { PrintHeader } from '../components/PrintHeader';
import { ERPActionBar } from '../components/ERPActionBar';
import {
  Package,
  Warehouse as WarehouseIcon,
  ArrowLeftRight,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  Printer,
  Barcode,
} from 'lucide-react';

interface InventoryScreenProps {
  currentUser: User;
  onBack: () => void;
  defaultTab?: TabType;
}

type TabType = 'items' | 'warehouses' | 'movements' | 'reports' | 'alerts';

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  currentUser,
  onBack,
  defaultTab = 'items',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [items, setItems] = useState<InventoryItem[]>(() => db.getItems());
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => db.getWarehouses());
  const [company] = useState<CompanyInfo>(() => db.getCompanyInfo());

  const lowStockItems = items.filter((it) => (it.currentStock || 0) <= (it.minStock || 0));

  const handleQuickPurchaseOrder = (item: InventoryItem) => {
    const suppliers = db.getSuppliers();
    const defaultSupplier = suppliers[0] || { id: 'sup-1', name: 'المورد الرئيسي العام' };
    const suggestedQty = Math.max(10, (item.minStock || 5) * 2 - (item.currentStock || 0));
    const purchasePrice = item.purchasePrice || 100;
    const subtotal = suggestedQty * purchasePrice;
    const taxTotal = subtotal * 0.15;
    const grandTotal = subtotal + taxTotal;

    const newPO = {
      id: `po-${Date.now()}`,
      orderNumber: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().slice(0, 10),
      deliveryDate: new Date().toISOString().slice(0, 10),
      supplierId: defaultSupplier.id,
      supplierName: defaultSupplier.name,
      items: [
        {
          itemCode: item.code,
          itemName: item.name,
          quantity: suggestedQty,
          unitPrice: purchasePrice,
          taxRate: 15,
          taxAmount: taxTotal,
          discount: 0,
          total: grandTotal,
        },
      ],
      subtotal,
      taxTotal,
      grandTotal,
      status: 'pending' as const,
      notes: `أمر شراء سريع (SmartAlert) للصنف ${item.name} - الرصيد الحالي (${item.currentStock}) وصل لحد الطلب الأدنى (${item.minStock})`,
      createdBy: currentUser.username,
    };

    db.savePurchaseOrder(newPO, currentUser.username);
    alert(`تم إنشاء أمر شراء سريع بنجاح للصنف "${item.name}" برقم ${newPO.orderNumber} بقيمة ${grandTotal.toLocaleString('ar-SA')} ر.س.`);
    reloadData();
  };

  // Print Preview
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState('');
  const [printContent, setPrintContent] = useState<React.ReactNode>(null);

  // Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({
    code: '',
    name: '',
    unit: 'قطعة',
    category: 'أجهزة عامة',
    purchasePrice: 0,
    salePrice: 0,
    minStock: 5,
    currentStock: 10,
    warehouseId: 'wh-1',
    barcode: '',
  });

  // Warehouse Modal
  const [whModalOpen, setWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [whForm, setWhForm] = useState<Partial<Warehouse>>({
    code: '',
    name: '',
    keeper: '',
    phone: '',
    address: '',
    status: 'active',
  });

  // Stock Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<{
    docNumber: string;
    date: string;
    type: 'in' | 'out' | 'transfer';
    itemId: string;
    warehouseId: string;
    targetWarehouseId?: string;
    quantity: number;
    notes: string;
  }>({
    docNumber: db.getNextStockMovementNumber(),
    date: new Date().toISOString().slice(0, 10),
    type: 'in',
    itemId: items[0]?.id || '',
    warehouseId: warehouses[0]?.id || '',
    quantity: 1,
    notes: '',
  });

  const reloadData = () => {
    setItems(db.getItems());
    setWarehouses(db.getWarehouses());
  };

  // --- Items Logic ---
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemForm({
      code: `ITM-00${items.length + 1}`,
      name: '',
      unit: 'قطعة',
      category: 'عام',
      purchasePrice: 100,
      salePrice: 150,
      minStock: 5,
      currentStock: 10,
      warehouseId: warehouses[0]?.id || 'wh-1',
      barcode: `628100${Date.now().toString().slice(-6)}`,
    });
    setItemModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({ ...item });
    setItemModalOpen(true);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    if (confirm(`هل أنت متأكد من حذف الصنف ${item.name} (${item.code})؟`)) {
      db.deleteItem(item.id, currentUser.username);
      reloadData();
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: InventoryItem = {
      id: editingItem ? editingItem.id : `item-${Date.now()}`,
      code: itemForm.code || '',
      name: itemForm.name || '',
      unit: itemForm.unit || 'قطعة',
      category: itemForm.category || 'عام',
      purchasePrice: Number(itemForm.purchasePrice) || 0,
      salePrice: Number(itemForm.salePrice) || 0,
      minStock: Number(itemForm.minStock) || 0,
      currentStock: Number(itemForm.currentStock) || 0,
      warehouseId: itemForm.warehouseId || warehouses[0]?.id,
      barcode: itemForm.barcode || '',
    };
    db.saveItem(item, currentUser.username);
    reloadData();
    setItemModalOpen(false);
  };

  // --- Warehouse Logic ---
  const handleOpenAddWh = () => {
    setEditingWh(null);
    setWhForm({
      code: `WH-0${warehouses.length + 1}`,
      name: '',
      keeper: '',
      phone: '',
      address: '',
      status: 'active',
    });
    setWhModalOpen(true);
  };

  const handleEditWh = (wh: Warehouse) => {
    setEditingWh(wh);
    setWhForm({ ...wh });
    setWhModalOpen(true);
  };

  const handleDeleteWh = (wh: Warehouse) => {
    if (confirm(`هل أنت متأكد من حذف المستودع ${wh.name}؟`)) {
      db.deleteWarehouse(wh.id, currentUser.username);
      reloadData();
    }
  };

  const handleSaveWh = (e: React.FormEvent) => {
    e.preventDefault();
    const wh: Warehouse = {
      id: editingWh ? editingWh.id : `wh-${Date.now()}`,
      code: whForm.code || '',
      name: whForm.name || '',
      keeper: whForm.keeper || '',
      phone: whForm.phone || '',
      address: whForm.address || '',
      status: whForm.status || 'active',
    };
    db.saveWarehouse(wh, currentUser.username);
    reloadData();
    setWhModalOpen(false);
  };

  // --- Stock Movement Logic ---
  const handleResetMovement = () => {
    setMovementForm({
      docNumber: db.getNextStockMovementNumber(),
      date: new Date().toISOString().slice(0, 10),
      type: 'in',
      itemId: items[0]?.id || '',
      warehouseId: warehouses[0]?.id || '',
      quantity: 1,
      notes: '',
    });
  };

  const handlePrintMovement = () => {
    const targetItem = items.find((i) => i.id === movementForm.itemId);
    const targetWh = warehouses.find((w) => w.id === movementForm.warehouseId);
    setPrintTitle(`إذن حركة مخزنية رقم ${movementForm.docNumber}`);
    setPrintContent(
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border text-xs">
          <div>رقم الإذن: <span className="font-mono font-bold">{movementForm.docNumber}</span></div>
          <div>التاريخ: <span className="font-mono">{movementForm.date}</span></div>
          <div>نوع الحركة: <span className="font-bold">{movementForm.type === 'in' ? 'إدخال مخزني' : movementForm.type === 'out' ? 'صرف مخزني' : 'تحويل'}</span></div>
          <div>المستودع: <span>{targetWh?.name || '-'}</span></div>
          <div>الصنف: <span className="font-bold">{targetItem?.name || '-'}</span></div>
          <div>الكمية: <span className="font-mono font-bold">{movementForm.quantity}</span></div>
        </div>
      </div>
    );
    setIsPrintModalOpen(true);
  };

  const handleSaveMovement = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetItem = items.find((i) => i.id === movementForm.itemId);
    if (!targetItem) return;

    let updatedStock = targetItem.currentStock;
    if (movementForm.type === 'in') {
      updatedStock += Number(movementForm.quantity);
    } else if (movementForm.type === 'out') {
      if (updatedStock < Number(movementForm.quantity)) {
        alert('الكمية المطلوبة للصرف غير متوفرة في الرصيد الحالي للمستودع!');
        return;
      }
      updatedStock -= Number(movementForm.quantity);
    }

    targetItem.currentStock = updatedStock;
    db.saveItem(targetItem, currentUser.username);
    db.logAction(
      currentUser.username,
      'add',
      'حركات المخزون',
      movementForm.docNumber,
      `حركة ${movementForm.type === 'in' ? 'إدخال' : movementForm.type === 'out' ? 'صرف' : 'تحويل'} للصنف ${targetItem.name} بكمية ${movementForm.quantity}`
    );
    reloadData();
    alert(`تم حفظ وتنفيذ الحركة رقم ${movementForm.docNumber} بنجاح.`);
    handleResetMovement();
  };

  // Columns
  const itemColumns: Column<InventoryItem>[] = [
    { key: 'code', header: 'كود الصنف', width: '110px', render: (i) => <span className="font-mono font-bold text-[#1B3A5C]">{i.code}</span> },
    { key: 'name', header: 'اسم الصنف', render: (i) => <span className="font-bold text-slate-800">{i.name}</span> },
    { key: 'category', header: 'المجموعة', width: '130px' },
    { key: 'unit', header: 'الوحدة', width: '90px' },
    { key: 'purchasePrice', header: 'سعر الشراء', width: '110px', align: 'left', render: (i) => <span className="font-mono">{i.purchasePrice.toLocaleString('ar-SA')}</span> },
    { key: 'salePrice', header: 'سعر البيع', width: '110px', align: 'left', render: (i) => <span className="font-mono font-bold text-[#1B3A5C]">{i.salePrice.toLocaleString('ar-SA')}</span> },
    {
      key: 'currentStock',
      header: 'الرصيد المتاح',
      width: '110px',
      align: 'center',
      render: (i) => {
        const isLow = i.currentStock <= i.minStock;
        return (
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
              isLow ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {i.currentStock} {isLow && '⚠️'}
          </span>
        );
      },
    },
    { key: 'barcode', header: 'الباركود', width: '130px', render: (i) => <span className="font-mono text-slate-500 text-[11px]">{i.barcode || '-'}</span> },
  ];

  const whColumns: Column<Warehouse>[] = [
    { key: 'code', header: 'الكود', width: '90px', render: (w) => <span className="font-mono font-bold">{w.code}</span> },
    { key: 'name', header: 'اسم المستودع', render: (w) => <span className="font-bold text-[#1B3A5C]">{w.name}</span> },
    { key: 'keeper', header: 'أمين المستودع', width: '140px' },
    { key: 'phone', header: 'هاتف التواصل', width: '130px', render: (w) => <span className="font-mono">{w.phone}</span> },
    { key: 'address', header: 'الموقع الجغرافي' },
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
          <h1 className="text-base font-bold text-[#1B3A5C]">4. إدارة المخزون والمستودعات (Inventory Control)</h1>
        </div>

        {/* 4 Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'items' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>بيانات الأصناف</span>
          </button>

          <button
            onClick={() => setActiveTab('warehouses')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'warehouses' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <WarehouseIcon className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>بيانات المخازن</span>
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'movements' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>حركات المخزون</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'reports' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>تقارير الجرد والأرصدة</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer relative ${
              activeTab === 'alerts' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>التنبيهات الذكية للنواقص</span>
            {lowStockItems.length > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                {lowStockItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-hidden">
        {/* TAB 1: Items List */}
        {activeTab === 'items' && (
          <DataGrid
            title="سجل وبطاقات الأصناف المخزنية"
            subtitle="متابعة أسعار الشراء، أسعار البيع، وحدود الطلب، والأرصدة الحالية"
            data={items}
            columns={itemColumns}
            onAdd={handleOpenAddItem}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onPrint={() => {
              setPrintTitle('تقرير قائمة الأصناف وأسعار البيع والشراء');
              setPrintContent(
                <table className="w-full text-xs text-right border-collapse border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-2">الكود</th>
                      <th className="border p-2">اسم الصنف</th>
                      <th className="border p-2">المجموعة</th>
                      <th className="border p-2">سعر الشراء</th>
                      <th className="border p-2">سعر البيع</th>
                      <th className="border p-2">الرصيد المتاح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className="border p-2 font-mono font-bold">{it.code}</td>
                        <td className="border p-2 font-semibold">{it.name}</td>
                        <td className="border p-2">{it.category}</td>
                        <td className="border p-2 font-mono">{it.purchasePrice.toLocaleString('ar-SA')}</td>
                        <td className="border p-2 font-mono font-bold">{it.salePrice.toLocaleString('ar-SA')}</td>
                        <td className="border p-2 font-mono text-center">{it.currentStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
              setIsPrintModalOpen(true);
            }}
            addLabel="إضافة صنف جديد"
          />
        )}

        {/* TAB 2: Warehouses */}
        {activeTab === 'warehouses' && (
          <DataGrid
            title="دليل المستودعات والمخازن"
            subtitle="مواقع المستودعات وأمناء العهدة"
            data={warehouses}
            columns={whColumns}
            onAdd={handleOpenAddWh}
            onEdit={handleEditWh}
            onDelete={handleDeleteWh}
            addLabel="إضافة مستودع جديد"
          />
        )}

        {/* TAB 3: Stock Movements */}
        {activeTab === 'movements' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full p-6 max-w-3xl mx-auto overflow-y-auto">
            {/* Unified 7-Button Toolbar inside Stock Movement Screen */}
            <ERPActionBar
              mode="add"
              docNumber={movementForm.docNumber}
              docTitle="إذن حركة مخزنية"
              onAdd={handleResetMovement}
              onEdit={() => {}}
              onDelete={() => {
                if (confirm(`هل ترغب بإلغاء وتفريغ الحركة رقم ${movementForm.docNumber}؟`)) {
                  handleResetMovement();
                }
              }}
              onSave={() => handleSaveMovement()}
              onCancel={handleResetMovement}
              onPrint={handlePrintMovement}
              className="mb-4"
            />

            <div className="border-b border-slate-200 pb-3 mb-5">
              <h2 className="text-base font-bold text-[#1B3A5C]">إذن حركة مخزنية جديدة (إدخال / صرف / تحويل)</h2>
              <p className="text-xs text-slate-500">
                تسجيل حركة بضاعة داخلية وتحديث كميات الجرد والرصيد فوراً مع ترقيم تسلسلي تلقائي يبدأ من 1.
              </p>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة المخزنية:</label>
                  <select
                    value={movementForm.type}
                    onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-bold"
                  >
                    <option value="in">إذن استلام بضاعة (إدخال مخزني)</option>
                    <option value="out">إذن صرف بضاعة (إخراج مخزني)</option>
                    <option value="transfer">مناقلة بين المستودعات (تحويل)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الحركة:</label>
                  <input
                    type="date"
                    value={movementForm.date}
                    onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الصنف المطلوب:</label>
                <select
                  value={movementForm.itemId}
                  onChange={(e) => setMovementForm({ ...movementForm, itemId: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-bold"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.code} - {it.name} (الرصيد المتاح: {it.currentStock} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المستودع المصدر:</label>
                  <select
                    value={movementForm.warehouseId}
                    onChange={(e) => setMovementForm({ ...movementForm, warehouseId: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية المنقولة:</label>
                  <input
                    type="number"
                    min="1"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات وسبب الحركة:</label>
                <textarea
                  rows={2}
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  placeholder="رقم أمر التوريد أو الصرف..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1B3A5C] text-white hover:bg-[#122840] font-bold text-xs rounded transition-colors"
                >
                  تنفيذ الحركة وتحديث الأرصدة فوراً
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: Inventory Reports & Stock Valuation */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 no-print">
              <div>
                <h2 className="text-base font-bold text-[#1B3A5C]">تقرير الجرد الفعلي وتقييم المخزون السلعي</h2>
                <p className="text-xs text-slate-500">حساب القيمة الإجمالية للمخزون بسعر الشراء وسعر البيع المتوقع</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-[#1B3A5C] text-white hover:bg-[#122840] text-xs font-bold rounded flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-[#dfb758]" />
                <span>طباعة كشف الجرد</span>
              </button>
            </div>

            <div className="printable-area">
              <PrintHeader company={company} title="كشف الجرد السنوي وتقييم المخزون" />

              <table className="w-full text-xs text-right border-collapse border border-slate-300">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="border p-2">كود الصنف</th>
                    <th className="border p-2">اسم الصنف</th>
                    <th className="border p-2 text-center">الكمية الحالية</th>
                    <th className="border p-2 text-left">سعر التكلفة</th>
                    <th className="border p-2 text-left">إجمالي التكلفة</th>
                    <th className="border p-2 text-left">القيمة بسعر البيع</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const totalCost = it.currentStock * it.purchasePrice;
                    const totalSale = it.currentStock * it.salePrice;
                    return (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="border p-2 font-mono font-bold">{it.code}</td>
                        <td className="border p-2">{it.name}</td>
                        <td className="border p-2 text-center font-mono font-bold">{it.currentStock} {it.unit}</td>
                        <td className="border p-2 font-mono text-left">{it.purchasePrice.toLocaleString('ar-SA')}</td>
                        <td className="border p-2 font-mono text-left font-bold">{totalCost.toLocaleString('ar-SA')}</td>
                        <td className="border p-2 font-mono text-left font-bold text-emerald-800">{totalSale.toLocaleString('ar-SA')}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold">
                  <tr>
                    <td colSpan={4} className="border p-2 text-center">الإجمالي الكلي لقيمة المخزون</td>
                    <td className="border p-2 font-mono text-left text-slate-900">
                      {items.reduce((sum, it) => sum + it.currentStock * it.purchasePrice, 0).toLocaleString('ar-SA')} {company.defaultCurrency}
                    </td>
                    <td className="border p-2 font-mono text-left text-emerald-800">
                      {items.reduce((sum, it) => sum + it.currentStock * it.salePrice, 0).toLocaleString('ar-SA')} {company.defaultCurrency}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Official Signatures for Auditing and Archiving */}
              <div className="printable-signatures mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs font-semibold text-slate-700">
                <div>
                  <p>أمين المستودع</p>
                  <p className="mt-6 font-mono text-[11px] text-slate-500">..............................</p>
                </div>
                <div>
                  <p>مدقق الجرد الفعلي</p>
                  <p className="mt-6 font-mono text-[11px] text-slate-500">..............................</p>
                </div>
                <div>
                  <p>مدير إدارة العمليات والمخازن</p>
                  <p className="mt-6 font-mono text-[11px] text-slate-500">..............................</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Smart Alerts & Low Stock */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-[#1B3A5C] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>التنبيهات الذكية للنواقص وأصناف حد الطلب (Smart Alerts)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  الأصناف التي وصل رصيدها الحالي إلى حد الطلب الأدنى أو أقل، مع إمكانية إصدار أمر شراء سريع فوراً
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full border border-amber-300">
                عدد التنبيهات النشطة: {lowStockItems.length}
              </span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <Package className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">لا توجد نواقص مخزنية حالياً</h3>
                <p className="text-xs text-slate-500 mt-1">جميع أرصدة الأصناف فوق حدود الطلب الأدنى المقررة.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3 border-l border-slate-200">كود الصنف</th>
                      <th className="p-3 border-l border-slate-200">اسم الصنف</th>
                      <th className="p-3 border-l border-slate-200 text-center">الرصيد الحالي</th>
                      <th className="p-3 border-l border-slate-200 text-center">حد الطلب الأدنى</th>
                      <th className="p-3 border-l border-slate-200 text-center">حالة النقص</th>
                      <th className="p-3 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 border-t border-slate-200">
                        <td className="p-3 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">{item.code}</td>
                        <td className="p-3 font-semibold text-slate-800 border-l border-slate-200">{item.name}</td>
                        <td className="p-3 font-mono font-bold text-center text-red-600 border-l border-slate-200">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="p-3 font-mono text-center text-slate-600 border-l border-slate-200">
                          {item.minStock} {item.unit}
                        </td>
                        <td className="p-3 text-center border-l border-slate-200">
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                            item.currentStock === 0
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {item.currentStock === 0 ? 'نفاد تام بالمخزون' : 'وصول لحد الطلب'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleQuickPurchaseOrder(item)}
                            className="px-3 py-1.5 bg-[#1B3A5C] hover:bg-[#122840] text-white rounded text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 mx-auto"
                          >
                            <Package className="w-3.5 h-3.5 text-[#dfb758]" />
                            <span>إنشاء أمر شراء سريع</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Modal: Add/Edit Item --- */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? `تعديل الصنف ${editingItem.name}` : 'تعريف صنف جديد'}
      >
        <form onSubmit={handleSaveItem} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كود الصنف:</label>
              <input
                type="text"
                value={itemForm.code}
                onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الباركود:</label>
              <input
                type="text"
                value={itemForm.barcode || ''}
                onChange={(e) => setItemForm({ ...itemForm, barcode: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف:</label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المجموعة / الفئة:</label>
              <input
                type="text"
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وحدة القياس:</label>
              <input
                type="text"
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="قطعة، كرتون، لتر..."
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سعر الشراء (التكلفة):</label>
              <input
                type="number"
                step="0.01"
                value={itemForm.purchasePrice || 0}
                onChange={(e) => setItemForm({ ...itemForm, purchasePrice: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سعر البيع المعتمد:</label>
              <input
                type="number"
                step="0.01"
                value={itemForm.salePrice || 0}
                onChange={(e) => setItemForm({ ...itemForm, salePrice: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-emerald-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد المتاح حالياً:</label>
              <input
                type="number"
                value={itemForm.currentStock || 0}
                onChange={(e) => setItemForm({ ...itemForm, currentStock: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حد الطلب (تنبيه النواقص):</label>
              <input
                type="number"
                value={itemForm.minStock || 0}
                onChange={(e) => setItemForm({ ...itemForm, minStock: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setItemModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ بيانات الصنف
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal: Add/Edit Warehouse --- */}
      <Modal
        isOpen={whModalOpen}
        onClose={() => setWhModalOpen(false)}
        title={editingWh ? `تعديل المستودع ${editingWh.name}` : 'إضافة مستودع جديد'}
      >
        <form onSubmit={handleSaveWh} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كود المستودع:</label>
              <input
                type="text"
                value={whForm.code}
                onChange={(e) => setWhForm({ ...whForm, code: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستودع:</label>
              <input
                type="text"
                value={whForm.name}
                onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">أمين المستودع (المسؤول):</label>
            <input
              type="text"
              value={whForm.keeper}
              onChange={(e) => setWhForm({ ...whForm, keeper: e.target.value })}
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف:</label>
            <input
              type="text"
              value={whForm.phone}
              onChange={(e) => setWhForm({ ...whForm, phone: e.target.value })}
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والموقع:</label>
            <input
              type="text"
              value={whForm.address}
              onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setWhModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ المستودع
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Print Preview Modal --- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="طباعة التقرير"
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
              طباعة الآن
            </button>
          </div>
        }
      >
        <div className="printable-area bg-white p-4">
          <PrintHeader company={company} title={printTitle} />
          {printContent}
        </div>
      </Modal>
    </div>
  );
};
