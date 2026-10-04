/**
 * Module Ribbon Navigation Bar
 * شريط التنقل السريع الكلاسيكي بين الأنظمة السبعة بدون الحاجة للرجوع أو التمرير بالأسهم
 */

import React from 'react';
import { MainModuleId } from '../screens/MainMenuScreen';
import { User } from '../types';
import {
  LayoutGrid,
  SlidersHorizontal,
  ShieldCheck,
  BookOpen,
  Package,
  ShoppingCart,
  ShoppingBag,
  Wrench,
  Lock,
} from 'lucide-react';

interface ModuleRibbonProps {
  currentModule: MainModuleId | null;
  onSelectModule: (moduleId: MainModuleId | null) => void;
  currentUser: User;
}

export const ModuleRibbon: React.FC<ModuleRibbonProps> = ({
  currentModule,
  onSelectModule,
  currentUser,
}) => {
  const modules = [
    {
      id: null,
      label: 'الرئيسية',
      shortcut: 'Esc',
      icon: LayoutGrid,
      allowed: true,
    },
    {
      id: 'system_setup' as MainModuleId,
      label: '1. تهيئة النظام',
      shortcut: 'Alt+1',
      icon: SlidersHorizontal,
      allowed: ['admin', 'accountant'].includes(currentUser.role),
    },
    {
      id: 'system_admin' as MainModuleId,
      label: '2. إدارة النظام',
      shortcut: 'Alt+2',
      icon: ShieldCheck,
      allowed: currentUser.role === 'admin',
    },
    {
      id: 'general_ledger' as MainModuleId,
      label: '3. الأستاذ العام',
      shortcut: 'Alt+3',
      icon: BookOpen,
      allowed: ['admin', 'accountant'].includes(currentUser.role),
    },
    {
      id: 'inventory' as MainModuleId,
      label: '4. المخزون',
      shortcut: 'Alt+4',
      icon: Package,
      allowed: true,
    },
    {
      id: 'purchases' as MainModuleId,
      label: '5. المشتريات',
      shortcut: 'Alt+5',
      icon: ShoppingCart,
      allowed: true,
    },
    {
      id: 'sales' as MainModuleId,
      label: '6. المبيعات',
      shortcut: 'Alt+6',
      icon: ShoppingBag,
      allowed: true,
    },
    {
      id: 'auxiliary_reports' as MainModuleId,
      label: '7. أنظمة مساعدة',
      shortcut: 'Alt+7',
      icon: Wrench,
      allowed: true,
    },
  ];

  return (
    <nav className="bg-[#122840] border-b border-[#1B3A5C] px-2.5 py-1 flex items-center justify-between select-none shadow-xs shrink-0 no-print">
      <div className="flex items-center gap-1 overflow-x-hidden flex-wrap sm:flex-nowrap">
        {modules.map((m, idx) => {
          const Icon = m.icon;
          const isActive = currentModule === m.id;

          return (
            <button
              key={idx}
              onClick={() => m.allowed && onSelectModule(m.id)}
              disabled={!m.allowed}
              title={`الانتقال السريع (${m.shortcut})`}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#1B3A5C] text-[#dfb758] border border-[#c49a37] shadow-inner'
                  : m.allowed
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  : 'text-slate-500 cursor-not-allowed border border-transparent opacity-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                isActive ? 'bg-[#122840] text-[#dfb758]' : 'bg-slate-700/60 text-slate-300'
              }`}>
                {m.shortcut}
              </span>
              {!m.allowed && <Lock className="w-2.5 h-2.5 text-slate-500 mr-0.5" />}
            </button>
          );
        })}
      </div>

      <div className="hidden xl:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
        <span className="text-[#dfb758] font-bold">100% متطابق مع الشاشة</span>
        <span>·</span>
        <span>تنقل مباشر بدون أسهم</span>
      </div>
    </nav>
  );
};
