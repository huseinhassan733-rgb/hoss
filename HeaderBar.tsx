/**
 * Top Application Header Bar
 * الشريط العلوي للنظام: اسم الشركة، السنة المالية، المستخدم، نظام التنبيهات الذكية، التاريخ
 */

import React, { useState, useEffect } from 'react';
import { CompanyInfo, FinancialYear, User } from '../types';
import {
  Calendar,
  UserCheck,
  LogOut,
  Clock,
  ShieldCheck,
  Database,
  FileDown,
  Bell,
  BellRing,
  AlertTriangle,
  Calculator as CalcIcon,
} from 'lucide-react';
import { alertsService, SmartAlert } from '../services/alertsService';
import { SmartAlertsPopover } from './SmartAlertsPopover';
import { MainModuleId } from '../screens/MainMenuScreen';

interface HeaderBarProps {
  company: CompanyInfo;
  activeYear: FinancialYear;
  currentUser: User;
  onLogout: () => void;
  onOpenAuditLog: () => void;
  onExportPDF: () => void;
  onToggleCalculator: () => void;
  onNavigateModule?: (moduleId: MainModuleId) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  company,
  activeYear,
  currentUser,
  onLogout,
  onOpenAuditLog,
  onExportPDF,
  onToggleCalculator,
  onNavigateModule,
}) => {
  const [alerts, setAlerts] = useState<SmartAlert[]>(() => alertsService.getAlerts());
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = alertsService.subscribe((updatedAlerts) => {
      setAlerts([...updatedAlerts]);
    });
    return unsubscribe;
  }, []);

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const criticalCount = alerts.filter((a) => !a.isRead && a.severity === 'critical').length;
  const lowStockCount = alerts.filter((a) => !a.isRead && a.type === 'low_stock').length;

  const currentDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const roleLabels = {
    admin: 'مدير عام',
    accountant: 'محاسب مالي',
    data_entry: 'مدخل بيانات',
  };

  return (
    <header className="relative bg-[#1B3A5C] border-b-2 border-[#c49a37] text-white shadow-md select-none px-4 py-2 flex items-center justify-between gap-4 z-40">
      {/* Right Zone: System Brand & Company Name */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-[#122840] border border-[#c49a37] flex items-center justify-center font-bold text-lg text-[#dfb758] shadow-inner">
          H2
        </div>
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>{company.name}</span>
          </div>
          <div className="text-[11px] text-slate-300 flex items-center gap-2">
            <span className="text-[#dfb758] font-semibold">نظام H2pro المحاسبي</span>
            <span>·</span>
            <span className="font-mono text-slate-300">الرقم الضريبي: {company.taxNumber}</span>
          </div>
        </div>
      </div>

      {/* Center Zone: Active Financial Year & Current Date */}
      <div className="hidden md:flex items-center gap-4 bg-[#122840] px-4 py-1.5 rounded-md border border-slate-700/60 shadow-inner">
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#dfb758]" />
          <span className="text-slate-300">السنة المالية:</span>
          <span className="font-bold font-mono text-white bg-[#1B3A5C] px-2 py-0.5 rounded text-[11px] border border-slate-600">
            {activeYear.year} ({activeYear.status === 'open' ? 'مفتوحة' : 'مغلقة'})
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700" />

        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDate}</span>
        </div>
      </div>

      {/* Left Zone: Alerts Center, PDF Export, Current User, Role, Quick Action & Logout */}
      <div className="flex items-center gap-2.5">
        {/* SMART ALERTS BUTTON IN HEADERBAR */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen((prev) => !prev)}
            title={`نظام التنبيهات الذكية: ${unreadCount} تنبيه غير مقروء (${criticalCount} حرج)`}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-all shadow-sm cursor-pointer ${
              criticalCount > 0
                ? 'bg-red-950/80 hover:bg-red-900 border-red-500 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : unreadCount > 0
                ? 'bg-[#122840] hover:bg-[#1a385c] border-[#dfb758] text-[#dfb758]'
                : 'bg-[#122840] hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {criticalCount > 0 ? (
              <BellRing className="w-4 h-4 text-red-400 animate-bounce" />
            ) : (
              <Bell className="w-4 h-4 text-[#dfb758]" />
            )}

            <span className="text-xs font-bold hidden sm:inline">التنبيهات</span>

            {/* Notification Count Badge */}
            {unreadCount > 0 && (
              <span
                className={`font-mono text-[10px] font-black px-1.5 py-0.2 rounded-full leading-none flex items-center justify-center ${
                  criticalCount > 0
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-[#c49a37] text-[#122840]'
                }`}
              >
                {unreadCount}
              </span>
            )}

            {/* Critical Pulsing Ring */}
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* Global PDF Export Button */}
        <button
          onClick={onExportPDF}
          title="تصدير بيانات وتقارير الشاشة إلى مستند PDF معتمد (jsPDF + autoTable)"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c49a37] hover:bg-[#dfb758] text-[#122840] hover:text-black font-black text-xs rounded border border-[#dfb758] transition-all shadow-sm cursor-pointer hover:shadow-md"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">تصدير PDF</span>
        </button>

        {/* Floating Calculator Toggle */}
        <button
          onClick={onToggleCalculator}
          title="فتح الآلة الحاسبة العائمة السريعة"
          className="p-1.5 rounded bg-[#122840] text-[#dfb758] hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 cursor-pointer flex items-center gap-1 px-2.5"
        >
          <CalcIcon className="w-4 h-4 text-[#dfb758]" />
          <span className="text-xs font-bold hidden md:inline">حاسبة</span>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-2 bg-[#122840] px-3 py-1 rounded border border-slate-700">
          <div className="w-6 h-6 rounded-full bg-[#1B3A5C] border border-[#c49a37] flex items-center justify-center text-xs text-[#dfb758] font-bold">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-white leading-tight">{currentUser.name}</div>
            <div className="text-[10px] text-[#dfb758] leading-tight flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>{roleLabels[currentUser.role]}</span>
            </div>
          </div>
        </div>

        {/* Audit Log Quick Trigger */}
        <button
          onClick={onOpenAuditLog}
          title="سجل العمليات والرقابة (Audit Log)"
          className="p-1.5 rounded bg-[#122840] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 cursor-pointer"
        >
          <Database className="w-4 h-4 text-[#dfb758]" />
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/80 text-red-200 hover:text-white text-xs font-semibold rounded border border-red-700/50 transition-colors shadow-sm cursor-pointer"
          title="تسجيل الخروج من النظام"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">خروج</span>
        </button>
      </div>

      {/* Smart Alerts Popover Dropdown */}
      <SmartAlertsPopover
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onNavigate={onNavigateModule}
      />
    </header>
  );
};
