/**
 * 1. تهيئة النظام (System Configuration Screen)
 * يشمل: بيانات السنة المالية، بيانات الشركة، بيانات المناطق، بيانات العملات
 */

import React, { useState } from 'react';
import { FinancialYear, CompanyInfo, Region, Currency, User } from '../types';
import { db } from '../database/db';
import { DataGrid, Column } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { PrintHeader } from '../components/PrintHeader';
import { ERPActionBar } from '../components/ERPActionBar';
import {
  Calendar,
  Building2,
  MapPin,
  Coins,
  ArrowRight,
  Save,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  UploadCloud,
  Database,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { CurrenciesService } from '../services/CurrenciesService';

interface SystemSetupScreenProps {
  currentUser: User;
  onBack: () => void;
  defaultTab?: TabType;
}

type TabType = 'years' | 'company' | 'regions' | 'currencies' | 'backup';

export const SystemSetupScreen: React.FC<SystemSetupScreenProps> = ({
  currentUser,
  onBack,
  defaultTab = 'years',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [years, setYears] = useState<FinancialYear[]>(() => db.getFinancialYears());
  const [company, setCompany] = useState<CompanyInfo>(() => db.getCompanyInfo());
  const [regions, setRegions] = useState<Region[]>(() => db.getRegions());
  const [currencies, setCurrencies] = useState<Currency[]>(() => db.getCurrencies());

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState('');
  const [printContent, setPrintContent] = useState<React.ReactNode>(null);

  // Financial Year Form Modal
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<FinancialYear | null>(null);
  const [yearForm, setYearForm] = useState<Partial<FinancialYear>>({
    year: new Date().getFullYear(),
    fromMonth: 1,
    toMonth: 12,
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
    status: 'open',
    notes: '',
  });

  // Region Form Modal
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [regionForm, setRegionForm] = useState<Partial<Region>>({
    country: 'المملكة العربية السعودية',
    province: '',
    city: '',
    district: '',
  });

  // Currency Form Modal
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [currencyForm, setCurrencyForm] = useState<Partial<Currency>>({
    name: '',
    symbol: '',
    rate: 1.0,
    exchangeRate: 1.0,
    isLocal: false,
  });
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  // Company Form feedback
  const [companySavedSuccess, setCompanySavedSuccess] = useState(false);

  // Daily Exchange Rate Modal State
  const [dailyRateModalOpen, setDailyRateModalOpen] = useState(false);
  const [selectedCurrencyForRate, setSelectedCurrencyForRate] = useState<Currency | null>(null);
  const [dailyRateForm, setDailyRateForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    rate: 1.0,
  });
  const [exchangeRateHistoryList, setExchangeRateHistoryList] = useState(() => CurrenciesService.getHistoricalRates());

  // Refresh helper
  const reloadData = () => {
    setYears(db.getFinancialYears());
    setCompany(db.getCompanyInfo());
    setRegions(db.getRegions());
    setCurrencies(db.getCurrencies());
    setExchangeRateHistoryList(CurrenciesService.getHistoricalRates());
  };

  const handleOpenDailyRate = (curr: Currency) => {
    if (curr.isLocal) {
      alert('العملة المحلية الأساسية دائماً سعر صرفها ثابت = 1.0');
      return;
    }
    setSelectedCurrencyForRate(curr);
    setDailyRateForm({
      date: new Date().toISOString().slice(0, 10),
      rate: curr.exchangeRate || 1.0,
    });
    setDailyRateModalOpen(true);
  };

  const handleSaveDailyRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurrencyForRate) return;
    CurrenciesService.setDailyRate(
      selectedCurrencyForRate.symbol,
      dailyRateForm.date,
      Number(dailyRateForm.rate),
      currentUser.username
    );
    reloadData();
    setDailyRateModalOpen(false);
  };

  const handleSetBaseCurrency = (curr: Currency) => {
    if (curr.isLocal) {
      alert('هذه العملة هي العملة المحلية الأساسية بالفعل.');
      return;
    }
    if (confirm(`هل أنت متأكد من تعيين ${curr.name} (${curr.symbol}) كعملة أساسية محلية جديدة للشركة؟`)) {
      const res = CurrenciesService.setBaseCurrency(curr.symbol, currentUser.username);
      if (res.success) {
        alert(res.message);
        reloadData();
      } else {
        alert(res.message);
      }
    }
  };

  // --- Financial Year Handlers ---
  const handleOpenAddYear = () => {
    setEditingYear(null);
    const nextYear = new Date().getFullYear() + 1;
    setYearForm({
      year: nextYear,
      fromMonth: 1,
      toMonth: 12,
      startDate: `${nextYear}-01-01`,
      endDate: `${nextYear}-12-31`,
      status: 'open',
      notes: '',
    });
    setYearModalOpen(true);
  };

  const handleEditYear = (item: FinancialYear) => {
    setEditingYear(item);
    setYearForm({ ...item });
    setYearModalOpen(true);
  };

  const handleDeleteYear = (item: FinancialYear) => {
    if (confirm(`هل أنت متأكد من حذف بيانات السنة المالية ${item.year}؟`)) {
      db.deleteFinancialYear(item.id, currentUser.username);
      reloadData();
    }
  };

  const handleSaveYear = (e: React.FormEvent) => {
    e.preventDefault();
    const item: FinancialYear = {
      id: editingYear ? editingYear.id : `fy-${yearForm.year}`,
      year: Number(yearForm.year),
      fromMonth: Number(yearForm.fromMonth),
      toMonth: Number(yearForm.toMonth),
      startDate: yearForm.startDate || '',
      endDate: yearForm.endDate || '',
      status: yearForm.status || 'open',
      notes: yearForm.notes || '',
    };
    db.saveFinancialYear(item, currentUser.username);
    reloadData();
    setYearModalOpen(false);
  };

  const handlePrintYears = () => {
    setPrintTitle('تقرير السنوات المالية المعرفة بالنظام');
    setPrintContent(
      <div>
        <table className="w-full text-xs text-right border-collapse border border-slate-300">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2">السنة المالية</th>
              <th className="border p-2">من شهر</th>
              <th className="border p-2">إلى شهر</th>
              <th className="border p-2">تاريخ البداية</th>
              <th className="border p-2">تاريخ النهاية</th>
              <th className="border p-2">الحالة</th>
              <th className="border p-2">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.id}>
                <td className="border p-2 font-bold font-mono">{y.year}</td>
                <td className="border p-2">{y.fromMonth}</td>
                <td className="border p-2">{y.toMonth}</td>
                <td className="border p-2 font-mono">{y.startDate}</td>
                <td className="border p-2 font-mono">{y.endDate}</td>
                <td className="border p-2">{y.status === 'open' ? 'مفتوحة (جارية)' : 'مغلقة'}</td>
                <td className="border p-2">{y.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    setIsPrintModalOpen(true);
  };

  // --- Company Handlers ---
  const handleSaveCompany = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    db.updateCompanyInfo(company, currentUser.username);
    setCompanySavedSuccess(true);
    setTimeout(() => setCompanySavedSuccess(false), 3000);
  };

  // --- Region Handlers ---
  const handleOpenAddRegion = () => {
    setEditingRegion(null);
    setRegionForm({
      country: 'المملكة العربية السعودية',
      province: '',
      city: '',
      district: '',
    });
    setRegionModalOpen(true);
  };

  const handleEditRegion = (reg: Region) => {
    setEditingRegion(reg);
    setRegionForm({ ...reg });
    setRegionModalOpen(true);
  };

  const handleDeleteRegion = (reg: Region) => {
    if (confirm(`هل ترغب بحذف المنطقة "${reg.city} - ${reg.district}"؟`)) {
      db.deleteRegion(reg.id, currentUser.username);
      reloadData();
    }
  };

  const handleSaveRegion = (e: React.FormEvent) => {
    e.preventDefault();
    const item: Region = {
      id: editingRegion ? editingRegion.id : `reg-${Date.now()}`,
      country: regionForm.country || 'المملكة العربية السعودية',
      province: regionForm.province || '',
      city: regionForm.city || '',
      district: regionForm.district || '',
    };
    db.saveRegion(item, currentUser.username);
    reloadData();
    setRegionModalOpen(false);
  };

  const handlePrintRegions = () => {
    setPrintTitle('دليل المناطق الجغرافية والمدن المعرفة');
    setPrintContent(
      <table className="w-full text-xs text-right border-collapse border border-slate-300">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">الدولة</th>
            <th className="border p-2">المحافظة / الإمارة</th>
            <th className="border p-2">المدينة</th>
            <th className="border p-2">المنطقة / الحي</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r, i) => (
            <tr key={r.id}>
              <td className="border p-2 font-mono">{i + 1}</td>
              <td className="border p-2">{r.country}</td>
              <td className="border p-2">{r.province}</td>
              <td className="border p-2 font-bold">{r.city}</td>
              <td className="border p-2">{r.district}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
    setIsPrintModalOpen(true);
  };

  // --- Currency Handlers ---
  const handleOpenAddCurrency = () => {
    setEditingCurrency(null);
    setCurrencyError(null);
    setCurrencyForm({
      name: '',
      symbol: '',
      rate: 1.0,
      exchangeRate: 1.0,
      isLocal: false,
    });
    setCurrencyModalOpen(true);
  };

  const handleEditCurrency = (curr: Currency) => {
    if (curr.isLocal) {
      alert('العملة المحلية الأساسية للنظام محمية ومقيدة من التعديل للحفاظ على سلامة القيود المحاسبية.');
      return;
    }
    setEditingCurrency(curr);
    setCurrencyError(null);
    setCurrencyForm({ ...curr });
    setCurrencyModalOpen(true);
  };

  const handleDeleteCurrency = (curr: Currency) => {
    if (curr.isLocal) {
      alert('يُمنع حذف العملة المحلية الرسمية للنظام!');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف العملة ${curr.name}؟`)) {
      const res = db.deleteCurrency(curr.id, currentUser.username);
      if (!res.success) alert(res.message);
      reloadData();
    }
  };

  const handleSaveCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrencyError(null);

    const item: Currency = {
      id: editingCurrency ? editingCurrency.id : `curr-${Date.now()}`,
      name: currencyForm.name || '',
      symbol: currencyForm.symbol || '',
      rate: Number(currencyForm.rate) || 1,
      exchangeRate: Number(currencyForm.exchangeRate) || 1,
      isLocal: !!currencyForm.isLocal,
    };

    const res = db.saveCurrency(item, currentUser.username);
    if (!res.success) {
      setCurrencyError(res.message || 'خطأ في حفظ العملة');
      return;
    }
    reloadData();
    setCurrencyModalOpen(false);
  };

  const handlePrintCurrencies = () => {
    setPrintTitle('تقرير العملات وأسعار الصرف الرسمية');
    setPrintContent(
      <table className="w-full text-xs text-right border-collapse border border-slate-300">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-2">اسم العملة</th>
            <th className="border p-2">الرمز</th>
            <th className="border p-2">نوع العملة</th>
            <th className="border p-2">السعر المعادل</th>
            <th className="border p-2">سعر التحويل للعملة المحلية</th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((c) => (
            <tr key={c.id}>
              <td className="border p-2 font-bold">{c.name}</td>
              <td className="border p-2 font-mono font-bold text-[#1B3A5C]">{c.symbol}</td>
              <td className="border p-2">{c.isLocal ? 'عملة محلية (أساسية)' : 'عملة أجنبية'}</td>
              <td className="border p-2 font-mono">{c.rate}</td>
              <td className="border p-2 font-mono">{c.exchangeRate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
    setIsPrintModalOpen(true);
  };

  // --- Backup & Restore Handlers ---
  const handleDownloadBackup = () => {
    const jsonStr = db.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `h2pro_erp_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = db.restoreBackup(content, currentUser.username);
        if (res.success) {
          alert(res.message);
          window.location.reload();
        } else {
          alert(res.message);
        }
      }
    };
    reader.readAsText(file);
  };

  // Columns for DataGrids
  const yearColumns: Column<FinancialYear>[] = [
    { key: 'year', header: 'السنة المالية', width: '120px', render: (y) => <span className="font-bold font-mono text-[#1B3A5C]">{y.year}</span> },
    { key: 'fromMonth', header: 'من شهر', width: '90px', render: (y) => `شهر ${y.fromMonth}` },
    { key: 'toMonth', header: 'إلى شهر', width: '90px', render: (y) => `شهر ${y.toMonth}` },
    { key: 'startDate', header: 'تاريخ البداية', width: '130px', render: (y) => <span className="font-mono">{y.startDate}</span> },
    { key: 'endDate', header: 'تاريخ النهاية', width: '130px', render: (y) => <span className="font-mono">{y.endDate}</span> },
    {
      key: 'status',
      header: 'الحالة',
      width: '120px',
      render: (y) =>
        y.status === 'open' ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            مفتوحة (جارية)
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            مغلقة
          </span>
        ),
    },
    { key: 'notes', header: 'ملاحظات' },
  ];

  const regionColumns: Column<Region>[] = [
    { key: 'country', header: 'الدولة', width: '180px' },
    { key: 'province', header: 'المحافظة / الإمارة', width: '180px' },
    { key: 'city', header: 'المدينة', width: '180px', render: (r) => <span className="font-bold text-[#1B3A5C]">{r.city}</span> },
    { key: 'district', header: 'المنطقة / الحي' },
  ];

  const currencyColumns: Column<Currency>[] = [
    { key: 'name', header: 'اسم العملة', render: (c) => <span className="font-bold text-[#1B3A5C]">{c.name}</span> },
    { key: 'symbol', header: 'الرمز', width: '90px', render: (c) => <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">{c.symbol}</span> },
    {
      key: 'isLocal',
      header: 'نوع العملة',
      width: '130px',
      render: (c) =>
        c.isLocal ? (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
            عملة محلية أساسية
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700">
            عملة أجنبية
          </span>
        ),
    },
    { key: 'rate', header: 'السعر المعادل', width: '110px', render: (c) => <span className="font-mono">{c.rate}</span> },
    { key: 'exchangeRate', header: 'سعر التحويل', width: '110px', render: (c) => <span className="font-mono font-bold text-slate-800">{c.exchangeRate}</span> },
    {
      key: 'id',
      header: 'إجراءات العملات',
      width: '260px',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          {!c.isLocal && (
            <>
              <button
                type="button"
                onClick={() => handleOpenDailyRate(c)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold cursor-pointer flex items-center gap-1"
                title="تحديد سعر صرف يومي أو تاريخي"
              >
                <TrendingUp className="w-3 h-3" />
                <span>سعر صرف يومي</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetBaseCurrency(c)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold cursor-pointer"
                title="تعيين كعملة أساسية محلية"
              >
                تعيين أساسية
              </button>
            </>
          )}
          {c.isLocal && (
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded">
              العملة المحلية النشطة
            </span>
          )}
        </div>
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
            title="العودة للشاشة الرئيسية"
          >
            <ArrowRight className="w-4 h-4 text-[#c49a37]" />
            <span>الشاشة الرئيسية</span>
          </button>
          <span className="text-slate-400">/</span>
          <h1 className="text-base font-bold text-[#1B3A5C]">1. تهيئة النظام (System Configuration)</h1>
        </div>

        {/* 4 Tabs Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            onClick={() => setActiveTab('years')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'years'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>أ) بيانات السنة المالية</span>
          </button>

          <button
            onClick={() => setActiveTab('company')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'company'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>ب) بيانات الشركة والترويسة</span>
          </button>

          <button
            onClick={() => setActiveTab('regions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'regions'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>ج) بيانات المناطق</span>
          </button>

          <button
            onClick={() => setActiveTab('currencies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'currencies'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>د) بيانات العملات</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>هـ) النسخ الاحتياطي واستعادة البيانات</span>
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-hidden">
        {/* TAB 1: Financial Years */}
        {activeTab === 'years' && (
          <DataGrid
            title="بيانات السنوات المالية للنظام"
            subtitle="إدارة فترات المحاسبة والسنوات المفتوحة والمغلقة"
            data={years}
            columns={yearColumns}
            onAdd={handleOpenAddYear}
            onEdit={handleEditYear}
            onDelete={handleDeleteYear}
            onPrint={handlePrintYears}
            addLabel="إضافة سنة مالية جديدة"
          />
        )}

        {/* TAB 2: Company Info */}
        {activeTab === 'company' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full overflow-y-auto p-6 max-w-4xl mx-auto">
            <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1B3A5C]">بيانات الشركة الرسمية وترويسة التقارير</h2>
                <p className="text-xs text-slate-500">
                  تُطبع هذه البيانات كترويسة رسمية في كافة التقارير، السندات، والفواتير الضريبية.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrintTitle('معاينة ترويسة الشركة الرسمية');
                  setPrintContent(
                    <div className="p-8 text-center text-slate-500">
                      هذه المعاينة لترويسة الشركة كما ستظهر في كافة المطبوعات الرسمية للنظام.
                    </div>
                  );
                  setIsPrintModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-[#1B3A5C] bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
              >
                معاينة ترويسة المطبوعات
              </button>
            </div>

            {companySavedSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>تم حفظ بيانات الشركة بنجاح وتحديث ترويسة كافة التقارير.</span>
              </div>
            )}

            {/* Unified 7-Button Toolbar for Company Profile */}
            <ERPActionBar
              mode="edit"
              docTitle="بيانات المنشأة والترويسة"
              onAdd={() => {}}
              canAdd={false}
              onEdit={() => {}}
              onDelete={() => {
                if (confirm('هل ترغب بإعادة تعيين بيانات الشركة إلى القيم الافتراضية؟')) {
                  setCompany(db.getCompanyInfo());
                }
              }}
              onSave={() => handleSaveCompany()}
              onCancel={() => setCompany(db.getCompanyInfo())}
              onPrint={() => {
                setPrintTitle('معاينة ترويسة الشركة الرسمية');
                setPrintContent(
                  <div className="p-8 text-center text-slate-500">
                    هذه المعاينة لترويسة الشركة كما ستظهر في كافة المطبوعات الرسمية للنظام.
                  </div>
                );
                setIsPrintModalOpen(true);
              }}
              className="mb-4"
            />

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشركة الكامل (عربي):</label>
                  <input
                    type="text"
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الفاكس:</label>
                  <input
                    type="text"
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والمقر الرئيسي:</label>
                  <input
                    type="text"
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي (VAT ID):</label>
                  <input
                    type="text"
                    value={company.taxNumber}
                    onChange={(e) => setCompany({ ...company, taxNumber: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم السجل التجاري (CR):</label>
                  <input
                    type="text"
                    value={company.crNumber || ''}
                    onChange={(e) => setCompany({ ...company, crNumber: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العملة الافتراضية للتعامل:</label>
                  <select
                    value={company.defaultCurrency}
                    onChange={(e) => setCompany({ ...company, defaultCurrency: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none"
                  >
                    {currencies.map((c) => (
                      <option key={c.id} value={`${c.symbol} (${c.name})`}>
                        {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني للشركة:</label>
                  <input
                    type="email"
                    value={company.email || ''}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Logo Upload Simulation */}
              <div className="bg-slate-50 p-4 rounded border border-slate-200 mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#1B3A5C]" />
                  <span>شعار الشركة (Logo للترويسة):</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded border-2 border-dashed border-[#1B3A5C] bg-white flex items-center justify-center text-[#1B3A5C] font-bold shadow-xs">
                    <Building2 className="w-8 h-8 text-[#c49a37]" />
                  </div>
                  <div className="text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">شعار النظام الافتراضي نشط</p>
                    <p>صيغ مقبولة: PNG, JPG, SVG (الحد الأقصى 2 ميجابايت)</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-[#1B3A5C] hover:bg-[#122840] text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4 text-[#dfb758]" />
                  <span>حفظ بيانات الشركة</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Regions */}
        {activeTab === 'regions' && (
          <DataGrid
            title="بيانات المناطق الجغرافية"
            subtitle="تعريف الدول، المحافظات، المدن، والأحياء المعتمدة"
            data={regions}
            columns={regionColumns}
            onAdd={handleOpenAddRegion}
            onEdit={handleEditRegion}
            onDelete={handleDeleteRegion}
            onPrint={handlePrintRegions}
            addLabel="إضافة منطقة جديدة"
          />
        )}

        {/* TAB 4: Currencies */}
        {activeTab === 'currencies' && (
          <div className="space-y-6 overflow-y-auto h-full p-1">
            <DataGrid
              title="بيانات العملات وأسعار الصرف"
              subtitle="العملة المحلية والعملات الأجنبية وأسعار التحويل وتحديد العملة الأساسية للشركة"
              data={currencies}
              columns={currencyColumns}
              onAdd={handleOpenAddCurrency}
              onEdit={handleEditCurrency}
              onDelete={handleDeleteCurrency}
              onPrint={handlePrintCurrencies}
              addLabel="إضافة عملة جديدة"
              extraActions={
                <div className="text-[11px] text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-medium">
                  تنبيه: العملة المحلية الأساسية محمية من التعديل والحذف وتُستخدم كأساس لكافة القيود والتقارير
                </div>
              }
            />

            {/* Historical Exchange Rates Section */}
            <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-[#1B3A5C] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#dfb758]" />
                  <span>سجل أسعار الصرف التاريخية واليومية المسجلة</span>
                </h3>
                <span className="text-xs text-slate-500">إجمالي السجلات: {exchangeRateHistoryList.length}</span>
              </div>

              {exchangeRateHistoryList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  لا توجد أسعار صرف تاريخية مسجلة حتى الآن. يمكنك تحديد سعر صرف يومي لأي عملة أجنبية من الجدول أعلاه.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2.5 border-l border-slate-200">رمز العملة</th>
                        <th className="p-2.5 border-l border-slate-200">التاريخ</th>
                        <th className="p-2.5 border-l border-slate-200">سعر الصرف</th>
                        <th className="p-2.5">المستخدم المسؤول</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exchangeRateHistoryList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 border-t border-slate-200">
                          <td className="p-2.5 font-mono font-bold text-[#1B3A5C] border-l border-slate-200">{item.currencySymbol}</td>
                          <td className="p-2.5 font-mono border-l border-slate-200">{item.date}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-800 border-l border-slate-200">{item.rate}</td>
                          <td className="p-2.5 text-slate-600">{item.updatedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Backup & Restore */}
        {activeTab === 'backup' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1B3A5C] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#dfb758]" />
                  <span>النسخ الاحتياطي الآمن واستعادة قاعدة البيانات</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  قم بتنزيل نسخة احتياطية كاملة لبيانات النظام محلياً، أو استعد بيانات سابقة من ملف النسخ الاحتياطي.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Backup Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded bg-[#1B3A5C]/10 text-[#1B3A5C] flex items-center justify-center font-bold mb-3">
                    <Download className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">تنزيل نسخة احتياطية محلية</h3>
                  <p className="text-xs text-slate-600 mb-4">
                    تصدير قاعدة البيانات بالكامل (الحسابات، القيود، الفواتير، المخزون، والعملات) إلى ملف JSON آمن يحفظ على جهازك.
                  </p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#1B3A5C] hover:bg-[#122840] text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#dfb758]" />
                  <span>تحميل النسخة الاحتياطية الآن</span>
                </button>
              </div>

              {/* Import / Restore Backup Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold mb-3">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">استعادة قاعدة البيانات</h3>
                  <p className="text-xs text-slate-600 mb-4">
                    استيراد ملف نسخة احتياطية سابق لاستعادة كافة سجلات وحسابات النظام. (تحذير: سيتم استبدال البيانات الحالية).
                  </p>
                </div>
                <div>
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer">
                    <UploadCloud className="w-4 h-4 text-amber-200" />
                    <span>اختيار ملف واستعادة النظام</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-900 leading-relaxed">
              <span className="font-bold">توصية المحاسب المالي والمهندس:</span> نوصي بأخذ نسخة احتياطية دورية (يومية أو أسبوعية) وتخزينها في وسيط تخزين خارجي آمن لضمان عدم فقدان أي بيانات مالية هامة.
            </div>
          </div>
        )}
      </div>

      {/* --- Modal: Financial Year Add/Edit --- */}
      <Modal
        isOpen={yearModalOpen}
        onClose={() => setYearModalOpen(false)}
        title={editingYear ? `تعديل السنة المالية ${editingYear.year}` : 'إضافة سنة مالية جديدة'}
        subtitle="تحديد نطاق البداية والنهاية والحالة التشغيلية"
      >
        <form onSubmit={handleSaveYear} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السنة المالية (رقم):</label>
              <input
                type="number"
                value={yearForm.year || ''}
                onChange={(e) => setYearForm({ ...yearForm, year: Number(e.target.value) })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الحالة:</label>
              <select
                value={yearForm.status}
                onChange={(e) => setYearForm({ ...yearForm, status: e.target.value as any })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                <option value="open">مفتوحة (جارية)</option>
                <option value="closed">مغلقة (معتمدة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">من شهر:</label>
              <input
                type="number"
                min="1"
                max="12"
                value={yearForm.fromMonth || 1}
                onChange={(e) => setYearForm({ ...yearForm, fromMonth: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">إلى شهر:</label>
              <input
                type="number"
                min="1"
                max="12"
                value={yearForm.toMonth || 12}
                onChange={(e) => setYearForm({ ...yearForm, toMonth: Number(e.target.value) })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ البداية:</label>
              <input
                type="date"
                value={yearForm.startDate || ''}
                onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ النهاية:</label>
              <input
                type="date"
                value={yearForm.endDate || ''}
                onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات السنة المالية:</label>
            <textarea
              rows={2}
              value={yearForm.notes || ''}
              onChange={(e) => setYearForm({ ...yearForm, notes: e.target.value })}
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setYearModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ السنة المالية
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal: Region Add/Edit --- */}
      <Modal
        isOpen={regionModalOpen}
        onClose={() => setRegionModalOpen(false)}
        title={editingRegion ? 'تعديل بيانات المنطقة' : 'إضافة منطقة جغرافية جديدة'}
      >
        <form onSubmit={handleSaveRegion} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الدولة:</label>
            <input
              type="text"
              value={regionForm.country}
              onChange={(e) => setRegionForm({ ...regionForm, country: e.target.value })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة / الإمارة:</label>
            <input
              type="text"
              value={regionForm.province}
              onChange={(e) => setRegionForm({ ...regionForm, province: e.target.value })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المدينة:</label>
            <input
              type="text"
              value={regionForm.city}
              onChange={(e) => setRegionForm({ ...regionForm, city: e.target.value })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة / الحي:</label>
            <input
              type="text"
              value={regionForm.district}
              onChange={(e) => setRegionForm({ ...regionForm, district: e.target.value })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRegionModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ المنطقة
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal: Currency Add/Edit --- */}
      <Modal
        isOpen={currencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        title={editingCurrency ? `تعديل العملة ${editingCurrency.name}` : 'إضافة عملة جديدة'}
      >
        <form onSubmit={handleSaveCurrency} className="space-y-3">
          {currencyError && (
            <div className="p-2 bg-red-50 border border-red-300 text-red-700 rounded text-xs">
              {currencyError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم العملة:</label>
            <input
              type="text"
              value={currencyForm.name}
              onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
              placeholder="مثال: دينار كويتي"
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رمز العملة:</label>
            <input
              type="text"
              value={currencyForm.symbol}
              onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
              placeholder="مثال: د.ك"
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السعر المعادل:</label>
              <input
                type="number"
                step="0.001"
                value={currencyForm.rate || 1}
                onChange={(e) => setCurrencyForm({ ...currencyForm, rate: Number(e.target.value) })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سعر التحويل للعملة المحلية:</label>
              <input
                type="number"
                step="0.001"
                value={currencyForm.exchangeRate || 1}
                onChange={(e) => setCurrencyForm({ ...currencyForm, exchangeRate: Number(e.target.value) })}
                required
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCurrencyModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ العملة
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal: Set Daily Exchange Rate --- */}
      <Modal
        isOpen={dailyRateModalOpen}
        onClose={() => setDailyRateModalOpen(false)}
        title={`تحديد سعر صرف يومي/تاريخي للعملة: ${selectedCurrencyForRate?.name || ''}`}
      >
        <form onSubmit={handleSaveDailyRate} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ سعر الصرف:</label>
            <input
              type="date"
              value={dailyRateForm.date}
              onChange={(e) => setDailyRateForm({ ...dailyRateForm, date: e.target.value })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">سعر التحويل للعملة المحلية في هذا التاريخ:</label>
            <input
              type="number"
              step="0.0001"
              value={dailyRateForm.rate}
              onChange={(e) => setDailyRateForm({ ...dailyRateForm, rate: Number(e.target.value) })}
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDailyRateModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ سعر الصرف التاريخي
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Print Preview Modal with Official Letterhead --- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="معاينة التقرير للطباعة الرسمية"
        width="4xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] hover:bg-[#122840] text-white rounded font-bold cursor-pointer flex items-center gap-1.5"
            >
              <span>طباعة المستند الآن (Ctrl+P)</span>
            </button>
          </div>
        }
      >
        <div className="printable-area bg-white p-4">
          <PrintHeader company={company} title={printTitle} />
          {printContent}
          <div className="mt-8 pt-4 border-t border-slate-300 text-[11px] text-slate-500 flex justify-between">
            <span>المستخدم المعتمد: {currentUser.name}</span>
            <span>الختم الرسمي وتوقيع المدير المالي: ___________________</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
