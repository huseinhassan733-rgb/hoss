/**
 * Desktop Window Container
 * محاكي نافذة سطح المكتب الكلاسيكية مع شريط العنوان وشريط الحالة
 */

import React from 'react';
import { Minus, Square, X, HardDrive, Shield, Wifi } from 'lucide-react';

interface DesktopWindowProps {
  children: React.ReactNode;
  title?: string;
  isMaximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export const DesktopWindow: React.FC<DesktopWindowProps> = ({
  children,
  title = 'H2pro - نظام المحاسبة وإدارة الأعمال المتكامل v2.5 [النسخة المعتمدة]',
}) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f1d2e] select-none text-slate-800">
      {/* Windows Title Bar */}
      <div className="bg-[#122840] h-8 text-slate-300 text-xs flex items-center justify-between px-3 border-b border-[#1B3A5C] no-print">
        {/* Left: Window Controls (Close, Maximize, Minimize) */}
        <div className="flex items-center gap-1.5 order-2">
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
            title="تصغير"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
            title="تكبير / استعادة"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
            title="إغلاق البرنامج"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Window Icon & Title */}
        <div className="flex items-center gap-2 order-1 font-medium tracking-wide text-slate-200">
          <div className="w-4 h-4 rounded bg-[#c49a37] flex items-center justify-center text-[10px] font-black text-[#122840]">
            H
          </div>
          <span>{title}</span>
        </div>
      </div>

      {/* Main App Work Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f6f9]">
        {children}
      </div>

      {/* Windows Status Bar */}
      <footer className="bg-[#e2e8f0] h-6 text-slate-600 text-[11px] flex items-center justify-between px-3 border-t border-slate-300 no-print select-none shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-[#1B3A5C]" />
            <span>قاعدة البيانات: SQLite (AppData\Local\H2pro\h2pro_erp.sqlite)</span>
          </div>
          <div className="h-3 w-px bg-slate-400" />
          <div className="flex items-center gap-1 text-emerald-700 font-semibold">
            <Wifi className="w-3 h-3 text-emerald-600" />
            <span>متصل محلياً (Active Session)</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[#1B3A5C] font-semibold border-r border-slate-300 pr-3">
            <span>التنقل الفوري:</span>
            <span className="font-mono text-[#c49a37]">[Alt+1..7] الأنظمة | [Esc] الرئيسية | [Alt+P] PDF</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-600">
            <Shield className="w-3 h-3 text-[#c49a37]" />
            <span>تشفير قاعدة البيانات AES-256</span>
          </div>
          <div className="h-3 w-px bg-slate-400" />
          <span className="font-mono text-slate-500">H2pro Enterprise v2.5.0 - Ready</span>
        </div>
      </footer>
    </div>
  );
};
