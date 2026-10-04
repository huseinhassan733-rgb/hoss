/**
 * 7. أنظمة وتقارير مساعدة (Auxiliary Systems & Tools)
 * يشمل: النسخ الاحتياطي والاستعادة، سجل العمليات Audit Log، المستخدمون المتصلون، مركز التقارير، وحول البرنامج
 */

import React, { useState } from 'react';
import { User, AuditLog, CompanyInfo, FinancialYear } from '../types';
import { db } from '../database/db';
import { DataGrid, Column } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { PrintHeader } from '../components/PrintHeader';
import {
  Wrench,
  Database,
  History,
  Users2,
  FileBarChart,
  Info,
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Building2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { ExecutiveReportCenter } from '../components/ExecutiveReportCenter';
import { EnterpriseFeaturesMatrix } from '../components/EnterpriseFeaturesMatrix';
import { MainModuleId } from './MainMenuScreen';

interface AuxiliaryScreenProps {
  currentUser: User;
  activeYear: FinancialYear;
  onBack: () => void;
  defaultTab?: TabType;
  onNavigateModule?: (moduleId: MainModuleId, tabId?: string) => void;
}

export type TabType = 'backup' | 'audit_log' | 'online_users' | 'report_center' | 'features_50' | 'about';

export const AuxiliaryScreen: React.FC<AuxiliaryScreenProps> = ({
  currentUser,
  activeYear,
  onBack,
  defaultTab = 'backup',
  onNavigateModule,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => db.getAuditLogs());
  const [company] = useState<CompanyInfo>(() => db.getCompanyInfo());

  // Backup & Restore State
  const [backupString, setBackupString] = useState('');
  const [restoreFeedback, setRestoreFeedback] = useState<{ isSuccess: boolean; text: string } | null>(null);

  // Print Preview
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Export Backup File Handler
  const handleDownloadBackup = () => {
    const backupJson = db.exportBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `H2pro_Backup_${new Date().toISOString().slice(0, 10)}.sqlite.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    db.logAction(currentUser.username, 'backup', 'النسخ الاحتياطي', 'BACKUP-EXPORT', 'تصدير نسخة احتياطية كاملة لقاعدة بيانات النظام');
    setAuditLogs(db.getAuditLogs());
  };

  // Restore Backup File Handler
  const handleRestoreBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupString.trim()) return;

    if (confirm('تحذير أمني: استعادة النسخة الاحتياطية ستستبدل كافة البيانات الحالية. هل تود المتابعة؟')) {
      const res = db.restoreBackup(backupString, currentUser.username);
      setRestoreFeedback({ isSuccess: res.success, text: res.message });
      if (res.success) {
        setAuditLogs(db.getAuditLogs());
        setBackupString('');
      }
    }
  };

  // File picker for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setBackupString(text);
      };
      reader.readAsText(file);
    }
  };

  const handleResetFactory = () => {
    if (confirm('تحذير شديد: هل ترغب حقاً بإعادة تعيين قاعدة البيانات إلى الإعدادات الافتراضية الأولية؟')) {
      db.resetToFactory(currentUser.username);
      alert('تمت إعادة تعيين قاعدة البيانات إلى وضع المصنع.');
      window.location.reload();
    }
  };

  const auditColumns: Column<AuditLog>[] = [
    { key: 'timestamp', header: 'الوقت والتاريخ', width: '160px', render: (l) => <span className="font-mono text-slate-600 text-[11px]">{l.timestamp}</span> },
    { key: 'username', header: 'المستخدم', width: '120px', render: (l) => <span className="font-mono font-bold text-[#1B3A5C]">{l.username}</span> },
    {
      key: 'action',
      header: 'نوع العملية',
      width: '100px',
      render: (l) => {
        const map = {
          add: { label: 'إضافة', cls: 'bg-emerald-100 text-emerald-800' },
          edit: { label: 'تعديل', cls: 'bg-blue-100 text-blue-800' },
          delete: { label: 'حذف', cls: 'bg-red-100 text-red-800' },
          login: { label: 'دخول', cls: 'bg-amber-100 text-amber-800' },
          logout: { label: 'خروج', cls: 'bg-slate-100 text-slate-800' },
          print: { label: 'طباعة', cls: 'bg-purple-100 text-purple-800' },
          backup: { label: 'نسخ احتياطي', cls: 'bg-indigo-100 text-indigo-800' },
          restore: { label: 'استعادة', cls: 'bg-orange-100 text-orange-800' },
        };
        const conf = map[l.action] || { label: l.action, cls: 'bg-slate-100 text-slate-800' };
        return <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${conf.cls}`}>{conf.label}</span>;
      },
    },
    { key: 'module', header: 'الشاشة / النظام', width: '140px', render: (l) => <span className="font-semibold text-slate-800">{l.module}</span> },
    { key: 'recordId', header: 'رقم المرجع', width: '130px', render: (l) => <span className="font-mono text-slate-600">{l.recordId}</span> },
    { key: 'details', header: 'تفاصيل الإجراء' },
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
          <h1 className="text-base font-bold text-[#1B3A5C]">7. أنظمة وتقارير مساعدة (Auxiliary Systems & Tools)</h1>
        </div>

        {/* 5 Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'backup' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>النسخ الاحتياطي والاستعادة</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_log')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'audit_log' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>سجل العمليات Audit Log</span>
          </button>

          <button
            onClick={() => setActiveTab('online_users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'online_users' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users2 className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>المستخدمون المتصلون</span>
          </button>

          <button
            onClick={() => setActiveTab('report_center')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'report_center' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileBarChart className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>مركز التقارير الشامل</span>
          </button>

          <button
            onClick={() => setActiveTab('features_50')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'features_50' ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xs' : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>مصفوفة الميزات الـ 50</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'about' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>حول البرنامج</span>
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-hidden">
        {/* TAB 1: Backup & Restore */}
        {activeTab === 'backup' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full p-6 max-w-4xl mx-auto overflow-y-auto space-y-6">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1B3A5C] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#c49a37]" />
                  <span>النسخ الاحتياطي واستعادة البيانات المحلية (SQLite Backup & Restore)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  حفظ نسخة احتياطية كاملة من قاعدة بيانات النظام مشفرة ومؤرخة، أو استعادة نسخة سابقة.
                </p>
              </div>

              <div className="text-[11px] font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded border">
                مسار التخزين: AppData\Local\H2pro\
              </div>
            </div>

            {restoreFeedback && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 border ${
                  restoreFeedback.isSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {restoreFeedback.isSuccess ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span>{restoreFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Create Backup */}
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-300 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded bg-[#1B3A5C] text-[#dfb758] flex items-center justify-center mb-3">
                    <Download className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1B3A5C] mb-1">تصدير وحفظ نسخة احتياطية فورية</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    يقوم بضغط وحفظ كامل القيود، دليل الحسابات، فواتير المبيعات والمشتريات، والمخزون في ملف احتياطي آمن بصيغة SQLite / JSON.
                  </p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="w-full py-2.5 bg-[#1B3A5C] hover:bg-[#122840] text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-[#dfb758]" />
                  <span>تنزيل ملف النسخة الاحتياطية الآن</span>
                </button>
              </div>

              {/* Card 2: Restore Backup */}
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-300 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded bg-[#c49a37] text-[#122840] flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1B3A5C] mb-1">استعادة قاعدة البيانات من ملف</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    اختر ملف النسخة الاحتياطية لاستعادة البيانات وتحديث السجلات فوراً.
                  </p>
                  <input
                    type="file"
                    accept=".json,.sqlite,.sql"
                    onChange={handleFileChange}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
                <button
                  onClick={handleRestoreBackup}
                  disabled={!backupString.trim()}
                  className={`mt-4 w-full py-2.5 font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    backupString.trim()
                      ? 'bg-amber-700 hover:bg-amber-800 text-white shadow-sm'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>تنفيذ الاستعادة واستبدال البيانات</span>
                </button>
              </div>
            </div>

            {/* Factory Reset */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-red-800">إعادة تعيين قاعدة البيانات لضبط المصنع</h4>
                <p className="text-[11px] text-slate-500">حذف كافة البيانات المدخلة وإعادة تحميل البيانات الافتراضية للنظام</p>
              </div>
              <button
                onClick={handleResetFactory}
                className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded transition-colors cursor-pointer"
              >
                إعادة ضبط المصنع
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Audit Log */}
        {activeTab === 'audit_log' && (
          <DataGrid
            title="سجل العمليات والأحداث الشامل (Audit Log Trail)"
            subtitle="مراقبة وتوثيق كافة حركات الإضافة والتعديل والحذف وتسجيل الدخول مع تحديد هوية المستخدم والوقت"
            data={auditLogs}
            columns={auditColumns}
            onPrint={() => {
              setIsPrintModalOpen(true);
            }}
          />
        )}

        {/* TAB 3: Online Connected Users */}
        {activeTab === 'online_users' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full p-6 max-w-3xl mx-auto overflow-y-auto">
            <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1B3A5C] flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-[#c49a37]" />
                  <span>جلسات المستخدمين المتصلين الحالية</span>
                </h2>
                <p className="text-xs text-slate-500">مراقبة الجلسات المفتوحة والنشطة حالياً على النظام</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>جلسة نشطة</span>
              </span>
            </div>

            <div className="divide-y divide-slate-200 border rounded">
              <div className="p-4 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1B3A5C] text-white flex items-center justify-center font-bold">
                    {currentUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1B3A5C]">{currentUser.name}</h3>
                    <p className="text-xs text-slate-500">
                      اسم الدخول: <span className="font-mono">{currentUser.username}</span> · الدور: {currentUser.role}
                    </p>
                  </div>
                </div>

                <div className="text-left text-xs text-slate-600">
                  <div className="text-emerald-700 font-bold">متصل الآن (الجلسة الحالية)</div>
                  <div className="text-[11px] text-slate-400 font-mono">IP: 127.0.0.1 (Local Workstation)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Reports Center */}
        {activeTab === 'report_center' && (
          <ExecutiveReportCenter
            currentUser={currentUser}
            activeYear={activeYear}
            company={company}
          />
        )}

        {/* TAB 5: 50 Enterprise Features Matrix */}
        {activeTab === 'features_50' && (
          <EnterpriseFeaturesMatrix onNavigateModule={onNavigateModule} />
        )}

        {/* TAB 5: About App */}
        {activeTab === 'about' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full p-8 max-w-2xl mx-auto overflow-y-auto text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-xl bg-[#1B3A5C] border-2 border-[#c49a37] flex items-center justify-center text-white shadow-md mb-4">
              <Building2 className="w-9 h-9 text-[#dfb758]" />
            </div>

            <h2 className="text-xl font-bold text-[#1B3A5C]">H2pro Enterprise Desktop ERP</h2>
            <p className="text-xs font-semibold text-[#c49a37] mt-0.5">نظام المحاسبة وإدارة الأعمال المتكامل</p>

            <div className="my-5 p-4 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600 text-right space-y-2 w-full max-w-md">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">رقم الإصدار:</span>
                <span className="font-mono font-bold text-[#1B3A5C]">Version 2.5.0 (Build 2026.09)</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">البيئة والتقنيات:</span>
                <span className="font-mono">Electron.js · Node.js · SQLite</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">محرك قاعدة البيانات:</span>
                <span className="font-mono">SQLite 3 (AppData Local Storage)</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">حالة الترخيص:</span>
                <span className="text-emerald-700 font-bold">نسخة مرخصة دائمة (Full Enterprise)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">التوافق الضريبي:</span>
                <span className="text-slate-800 font-medium">هيئة الزكاة والضريبة والجمارك (ZATCA)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              جميع الحقوق محفوظة © 2026 لشركة H2pro للأنظمة والحلول البرمجية.
            </p>
          </div>
        )}
      </div>

      {/* --- Print Audit Log Modal --- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="طباعة سجل العمليات (Audit Log)"
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
              طباعة السجل الآن
            </button>
          </div>
        }
      >
        <div className="printable-area bg-white p-4">
          <PrintHeader company={company} title="تقرير سجل العمليات والأحداث الشامل (Audit Log Trail)" />
          <table className="w-full text-xs text-right border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2">التاريخ والوقت</th>
                <th className="border p-2">المستخدم</th>
                <th className="border p-2">العملية</th>
                <th className="border p-2">الشاشة</th>
                <th className="border p-2">المرجع</th>
                <th className="border p-2">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((l) => (
                <tr key={l.id}>
                  <td className="border p-2 font-mono text-[11px]">{l.timestamp}</td>
                  <td className="border p-2 font-bold">{l.username}</td>
                  <td className="border p-2">{l.action}</td>
                  <td className="border p-2">{l.module}</td>
                  <td className="border p-2 font-mono">{l.recordId}</td>
                  <td className="border p-2 text-slate-600">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};
