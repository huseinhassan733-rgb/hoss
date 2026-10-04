/**
 * H2pro ERP - Floating Real-time Toast Notification
 * إشعار فوري منبثق عند حدوث حركات حرجية أو انخفاض المخزون
 */

import React, { useEffect, useState } from 'react';
import { SmartAlert } from '../services/alertsService';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  ArrowLeft,
  Package,
  TrendingUp,
  ShieldAlert,
  BellRing,
} from 'lucide-react';
import { MainModuleId } from '../screens/MainMenuScreen';

interface ToastNotificationProps {
  alert: SmartAlert | null;
  onDismiss: () => void;
  onNavigate?: (moduleId: MainModuleId) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  alert,
  onDismiss,
  onNavigate,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!alert) return;

    setProgress(100);
    const duration = 6500;
    const intervalTime = 50;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const isCritical = alert.severity === 'critical';
  const isWarning = alert.severity === 'warning';

  const getIcon = () => {
    switch (alert.type) {
      case 'low_stock':
        return <Package className="w-5 h-5 text-amber-400 animate-pulse" />;
      case 'critical_movement':
        return isCritical ? (
          <AlertOctagon className="w-5 h-5 text-red-400 animate-bounce" />
        ) : (
          <TrendingUp className="w-5 h-5 text-blue-400" />
        );
      case 'financial_limit':
        return <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />;
      case 'audit_security':
        return <ShieldAlert className="w-5 h-5 text-purple-400" />;
      default:
        return <Info className="w-5 h-5 text-[#dfb758]" />;
    }
  };

  const handleActionClick = () => {
    if (alert.actionTarget?.module && onNavigate) {
      onNavigate(alert.actionTarget.module);
    }
    onDismiss();
  };

  return (
    <div
      dir="rtl"
      className="fixed top-14 left-4 z-[9999] max-w-md w-full bg-[#122840] text-white border-2 shadow-2xl rounded-lg overflow-hidden transition-all duration-300 transform translate-y-0"
      style={{
        borderColor: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#c49a37',
        boxShadow: isCritical
          ? '0 10px 25px -5px rgba(239, 68, 68, 0.4)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Top Header & Tag */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#1B3A5C] border-b border-slate-700/80">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-[#dfb758]" />
          <span className="text-xs font-bold text-[#dfb758]">إشعار ذكي فوري</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              isCritical
                ? 'bg-red-950 text-red-300 border border-red-700'
                : isWarning
                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                : 'bg-blue-950 text-blue-300 border border-blue-700'
            }`}
          >
            {isCritical ? 'حرج وعاجل' : isWarning ? 'تحذير هام' : 'تنبيه'}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50 cursor-pointer"
          title="إغلاق الإشعار"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Body */}
      <div className="p-3.5 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#1B3A5C]/80 border border-slate-700 flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-white leading-tight mb-1">{alert.title}</h4>
          <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">{alert.message}</p>

          {/* Quick Action Button */}
          {alert.actionTarget?.module && (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <button
                onClick={handleActionClick}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#c49a37] hover:bg-[#dfb758] text-[#122840] hover:text-black text-[11px] font-bold transition-all shadow cursor-pointer"
              >
                <span>الانتقال للشاشة فوراً</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
              <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
            </div>
          )}
        </div>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="h-1 w-full bg-slate-800">
        <div
          className={`h-full transition-all duration-75 ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-[#dfb758]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
