/**
 * H2pro ERP - Smart Alerts Popover & Notification Center
 * مركز التنبيهات الذكية المنبثق من الشريط العلوي (HeaderBar)
 */

import React, { useState } from 'react';
import { SmartAlert, AlertType, AlertSeverity, alertsService } from '../services/alertsService';
import { MainModuleId } from '../screens/MainMenuScreen';
import {
  Bell,
  BellRing,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  Search,
  Package,
  TrendingUp,
  ShieldAlert,
  ArrowLeft,
  X,
  Sparkles,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface SmartAlertsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SmartAlert[];
  onNavigate?: (moduleId: MainModuleId) => void;
}

type FilterTab = 'all' | 'critical' | 'low_stock' | 'financial' | 'audit';

export const SmartAlertsPopover: React.FC<SmartAlertsPopoverProps> = ({
  isOpen,
  onClose,
  alerts,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => alertsService.getSoundEnabled());
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    alertsService.setSoundEnabled(next);
    if (next) {
      alertsService.playSound('info');
    }
  };

  const handleAlertClick = (alert: SmartAlert) => {
    alertsService.markAsRead(alert.id);
    if (alert.actionTarget?.module && onNavigate) {
      onNavigate(alert.actionTarget.module);
      onClose();
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    // Tab filter
    if (activeTab === 'critical' && alert.severity !== 'critical') return false;
    if (activeTab === 'low_stock' && alert.type !== 'low_stock') return false;
    if (
      activeTab === 'financial' &&
      alert.type !== 'critical_movement' &&
      alert.type !== 'financial_limit'
    )
      return false;
    if (activeTab === 'audit' && alert.type !== 'audit_security') return false;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = alert.title.toLowerCase().includes(q);
      const matchMsg = alert.message.toLowerCase().includes(q);
      const matchItem = alert.metadata?.itemName?.toLowerCase().includes(q);
      const matchCode = alert.metadata?.itemCode?.toLowerCase().includes(q);
      const matchDoc = alert.metadata?.docNumber?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchItem || matchCode || matchDoc;
    }

    return true;
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const lowStockCount = alerts.filter((a) => a.type === 'low_stock').length;

  const getAlertIcon = (alert: SmartAlert) => {
    if (alert.type === 'low_stock') {
      return alert.severity === 'critical' ? (
        <AlertOctagon className="w-4 h-4 text-red-400" />
      ) : (
        <Package className="w-4 h-4 text-amber-400" />
      );
    }
    if (alert.type === 'critical_movement') {
      return alert.severity === 'critical' ? (
        <AlertOctagon className="w-4 h-4 text-red-400" />
      ) : (
        <TrendingUp className="w-4 h-4 text-blue-400" />
      );
    }
    if (alert.type === 'financial_limit') {
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
    if (alert.type === 'audit_security') {
      return <ShieldAlert className="w-4 h-4 text-purple-400" />;
    }
    return <Info className="w-4 h-4 text-[#dfb758]" />;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Popover Card */}
      <div
        dir="rtl"
        className="fixed top-12 left-4 z-50 w-[460px] max-w-[96vw] max-h-[82vh] bg-[#122840] border-2 border-[#c49a37] rounded-lg shadow-2xl flex flex-col overflow-hidden text-white select-none animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Bar */}
        <div className="bg-[#1B3A5C] px-3.5 py-2.5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#122840] border border-[#c49a37] flex items-center justify-center text-[#dfb758]">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>مركز التنبيهات الذكية</span>
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-300">
                مراقبة فورية للمخزون والحركات المالية والأمنية
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? 'كتم التنبيهات الصوتية' : 'تفعيل التنبيهات الصوتية'}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer border ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions & Search Bar */}
        <div className="p-2.5 bg-[#0f1f33] border-b border-slate-700/60 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في التنبيهات (صنف، فاتورة، عميل...)"
                className="w-full bg-[#1B3A5C] text-xs text-white pr-8 pl-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-[#c49a37]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Test Simulation Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowSimulateMenu((prev) => !prev)}
                title="توليد إشعار فوري تجريبي لاختبار النظام"
                className="flex items-center gap-1 px-2 py-1.5 bg-[#1B3A5C] hover:bg-[#254d79] text-[#dfb758] border border-[#c49a37]/50 rounded text-[11px] font-bold cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#dfb758]" />
                <span>اختبار</span>
              </button>

              {showSimulateMenu && (
                <div className="absolute left-0 mt-1 w-48 bg-[#122840] border border-[#c49a37] rounded-md shadow-xl p-1 z-50 text-[11px]">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-700">
                    محاكاة حركة فورية:
                  </div>
                  <button
                    onClick={() => {
                      alertsService.simulateInstantAlert('stock');
                      setShowSimulateMenu(false);
                    }}
                    className="w-full text-right px-2 py-1.5 hover:bg-[#1B3A5C] text-amber-300 rounded cursor-pointer flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>هبوط مخزون حرج (شاشة)</span>
                  </button>
                  <button
                    onClick={() => {
                      alertsService.simulateInstantAlert('sales');
                      setShowSimulateMenu(false);
                    }}
                    className="w-full text-right px-2 py-1.5 hover:bg-[#1B3A5C] text-blue-300 rounded cursor-pointer flex items-center gap-1.5"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>فاتورة مبيعات كبرى</span>
                  </button>
                  <button
                    onClick={() => {
                      alertsService.simulateInstantAlert('credit');
                      setShowSimulateMenu(false);
                    }}
                    className="w-full text-right px-2 py-1.5 hover:bg-[#1B3A5C] text-red-300 rounded cursor-pointer flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>تجاوز سقف ائتماني</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'all'
                  ? 'bg-[#c49a37] text-[#122840] font-black'
                  : 'bg-[#1B3A5C] text-slate-300 hover:text-white'
              }`}
            >
              <span>الكل</span>
              <span className="font-mono text-[10px] opacity-80">({alerts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('critical')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'critical'
                  ? 'bg-red-600 text-white font-black'
                  : 'bg-[#1B3A5C] text-red-300 hover:bg-red-950/40'
              }`}
            >
              <AlertOctagon className="w-3 h-3 text-red-400" />
              <span>حرجة</span>
              <span className="font-mono text-[10px]">({criticalCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('low_stock')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'low_stock'
                  ? 'bg-amber-600 text-white font-black'
                  : 'bg-[#1B3A5C] text-amber-300 hover:bg-amber-950/40'
              }`}
            >
              <Package className="w-3 h-3 text-amber-400" />
              <span>المخزون</span>
              <span className="font-mono text-[10px]">({lowStockCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('financial')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'financial'
                  ? 'bg-blue-600 text-white font-black'
                  : 'bg-[#1B3A5C] text-blue-300 hover:bg-blue-950/40'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-blue-400" />
              <span>مالية</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'audit'
                  ? 'bg-purple-600 text-white font-black'
                  : 'bg-[#1B3A5C] text-purple-300 hover:bg-purple-950/40'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-purple-400" />
              <span>الأمان</span>
            </button>
          </div>
        </div>

        {/* Alerts List Zone */}
        <div className="flex-1 overflow-y-auto max-h-[380px] p-2 space-y-2">
          {filteredAlerts.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <CheckCheck className="w-10 h-10 mx-auto mb-2 text-emerald-400/60" />
              <div className="text-xs font-bold text-slate-200">لا توجد تنبيهات نشطة حالياً</div>
              <div className="text-[11px] text-slate-400 mt-1">
                جميع مستويات المخزون والحركات المالية ضمن الحدود الطبيعية
              </div>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isCrit = alert.severity === 'critical';
              const isWarn = alert.severity === 'warning';

              return (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded border transition-all ${
                    alert.isRead
                      ? 'bg-[#162e49]/60 border-slate-700/60 opacity-80'
                      : isCrit
                      ? 'bg-red-950/20 border-red-700/80 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                      : isWarn
                      ? 'bg-amber-950/20 border-amber-600/70'
                      : 'bg-[#1B3A5C]/80 border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {/* Icon */}
                      <div
                        className={`p-1.5 rounded mt-0.5 border ${
                          isCrit
                            ? 'bg-red-900/40 border-red-700 text-red-300'
                            : isWarn
                            ? 'bg-amber-900/40 border-amber-600 text-amber-300'
                            : 'bg-blue-900/40 border-blue-700 text-blue-300'
                        }`}
                      >
                        {getAlertIcon(alert)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">{alert.title}</span>
                          {!alert.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#dfb758] animate-pulse" />
                          )}
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                              isCrit
                                ? 'bg-red-800/80 text-red-100'
                                : isWarn
                                ? 'bg-amber-800/80 text-amber-100'
                                : 'bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isCrit ? 'حرج' : isWarn ? 'تحذير' : 'معلومة'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {alert.message}
                        </p>

                        {/* Metadata Tag */}
                        {alert.metadata && (
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[10px]">
                            {alert.metadata.currentStock !== undefined && (
                              <span className="bg-[#122840] border border-amber-500/50 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                                الرصيد: {alert.metadata.currentStock} / الحد: {alert.metadata.minStock}
                              </span>
                            )}
                            {alert.metadata.amount !== undefined && (
                              <span className="bg-[#122840] border border-emerald-500/50 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                                القيمة: {alert.metadata.amount.toLocaleString()} ر.س
                              </span>
                            )}
                            {alert.metadata.docNumber && (
                              <span className="bg-[#122840] border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                المستند: {alert.metadata.docNumber}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      onClick={() => alertsService.dismissAlert(alert.id)}
                      title="إخفاء التنبيه"
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800/60 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-mono">{alert.timestamp}</span>

                    <div className="flex items-center gap-1.5">
                      {!alert.isRead && (
                        <button
                          onClick={() => alertsService.markAsRead(alert.id)}
                          className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded cursor-pointer"
                        >
                          تحديد كمقروء
                        </button>
                      )}

                      {alert.actionTarget?.module && (
                        <button
                          onClick={() => handleAlertClick(alert)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#c49a37] hover:bg-[#dfb758] text-[#122840] font-bold hover:text-black cursor-pointer shadow-sm transition-all"
                        >
                          <span>معاينة ومعالجة</span>
                          <ArrowLeft className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Zone */}
        <div className="p-2.5 bg-[#1B3A5C] border-t border-slate-700/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => alertsService.markAllAsRead()}
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-slate-700/50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>تحديد الكل كمقروء</span>
            </button>

            <button
              onClick={() => alertsService.clearReadAlerts()}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-300 cursor-pointer px-2 py-1 rounded hover:bg-slate-700/50"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>مسح المقروء</span>
            </button>
          </div>

          <button
            onClick={() => alertsService.refreshAlerts(true)}
            title="إعادة فحص المخزون والعمليات الآن"
            className="flex items-center gap-1 text-[11px] text-[#dfb758] hover:text-white cursor-pointer px-2 py-1 rounded bg-[#122840] border border-[#c49a37]/60 hover:bg-[#1f4266]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>فحص فوري</span>
          </button>
        </div>
      </div>
    </>
  );
};
