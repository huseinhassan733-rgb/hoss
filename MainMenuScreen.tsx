/**
 * Main ERP Menu & Dashboard Screen - Tree View Navigation & H2Pro Logo
 * لوحة التحكم بالنظام: واجهة مختصرة بنظام الشجرة (+ تهيئة النظام) مع تقسيم الشاشة مناصفة بين البنود وشعار اتش تو برو
 */

import React, { useState, useMemo } from 'react';
import { User } from '../types';
import {
  SlidersHorizontal,
  ShieldCheck,
  BookOpen,
  Package,
  ShoppingCart,
  ShoppingBag,
  Wrench,
  Lock,
  Search,
  ChevronLeft,
  Folder,
  FolderOpen,
  FileText,
  Sparkles,
  Shield,
  Layers,
  CheckCircle2,
  Cpu,
  Database,
  Calendar,
  Building2,
  ArrowUpRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type MainModuleId =
  | 'system_setup' // 1. تهيئة النظام
  | 'system_admin' // 2. إدارة النظام
  | 'general_ledger' // 3. إدارة الأستاذ العام
  | 'inventory' // 4. إدارة المخزون
  | 'purchases' // 5. إدارة المشتريات
  | 'sales' // 6. إدارة المبيعات
  | 'auxiliary_reports'; // 7. أنظمة وتقارير مساعدة

interface MainMenuScreenProps {
  currentUser: User;
  onSelectModule: (moduleId: MainModuleId, tabId?: string) => void;
}

interface TreeSubItem {
  id: string;
  title: string;
}

interface TreeModuleNode {
  id: MainModuleId;
  index: number;
  title: string;
  icon: React.ElementType;
  shortcut: string;
  allowedRoles: ('admin' | 'accountant' | 'data_entry')[];
  subItems: TreeSubItem[];
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  currentUser,
  onSelectModule,
}) => {
  // Tree modules data - concise, zero screen counts or verbose descriptions
  const treeNodes: TreeModuleNode[] = useMemo(
    () => [
      {
        id: 'system_setup',
        index: 1,
        title: 'تهيئة النظام',
        icon: SlidersHorizontal,
        shortcut: 'Alt+1',
        allowedRoles: ['admin', 'accountant'],
        subItems: [
          { id: 'years', title: 'السنوات المالية' },
          { id: 'company', title: 'بيانات المنشأة والترويسة' },
          { id: 'regions', title: 'دليل المناطق والمدن' },
          { id: 'currencies', title: 'دليل العملات وأسعار الصرف' },
        ],
      },
      {
        id: 'system_admin',
        index: 2,
        title: 'إدارة النظام',
        icon: ShieldCheck,
        shortcut: 'Alt+2',
        allowedRoles: ['admin'],
        subItems: [
          { id: 'users', title: 'إدارة المستخدمين والحسابات' },
          { id: 'permissions', title: 'مصفوفة الصلاحيات الأمنية (RBAC)' },
          { id: 'change_password', title: 'تغيير كلمة المرور وتأمين الجلسة' },
        ],
      },
      {
        id: 'general_ledger',
        index: 3,
        title: 'إدارة الأستاذ العام',
        icon: BookOpen,
        shortcut: 'Alt+3',
        allowedRoles: ['admin', 'accountant'],
        subItems: [
          { id: 'accounts', title: 'دليل وشجرة الحسابات' },
          { id: 'banks', title: 'البنوك والصناديق النقدية' },
          { id: 'journal', title: 'قيود اليومية المحاسبية' },
          { id: 'vouchers', title: 'سندات القبض والصرف' },
          { id: 'reports', title: 'القوائم المالية والختامية' },
        ],
      },
      {
        id: 'inventory',
        index: 4,
        title: 'إدارة المخزون',
        icon: Package,
        shortcut: 'Alt+4',
        allowedRoles: ['admin', 'accountant', 'data_entry'],
        subItems: [
          { id: 'items', title: 'بطاقات الأصناف والباركود' },
          { id: 'warehouses', title: 'دليل المستودعات والمواقع' },
          { id: 'movements', title: 'حركات المخزون (صرف وتوريد)' },
          { id: 'reports', title: 'كشوفات الجرد وتقييم المخزون' },
        ],
      },
      {
        id: 'purchases',
        index: 5,
        title: 'إدارة المشتريات',
        icon: ShoppingCart,
        shortcut: 'Alt+5',
        allowedRoles: ['admin', 'accountant', 'data_entry'],
        subItems: [
          { id: 'suppliers', title: 'دليل وسجل الموردين' },
          { id: 'invoices', title: 'فواتير المشتريات الضريبية' },
          { id: 'returns', title: 'مردودات المشتريات' },
          { id: 'orders', title: 'أوامر الشراء وسندات التوريد' },
        ],
      },
      {
        id: 'sales',
        index: 6,
        title: 'إدارة المبيعات',
        icon: ShoppingBag,
        shortcut: 'Alt+6',
        allowedRoles: ['admin', 'accountant', 'data_entry'],
        subItems: [
          { id: 'customers', title: 'دليل وسجل العملاء' },
          { id: 'invoices', title: 'فواتير المبيعات الضريبية' },
          { id: 'quotations', title: 'عروض الأسعار والطلبيات' },
          { id: 'returns', title: 'مردودات المبيعات' },
          { id: 'reports', title: 'تقارير وحركة المبيعات' },
        ],
      },
      {
        id: 'auxiliary_reports',
        index: 7,
        title: 'أنظمة وتقارير مساعدة',
        icon: Wrench,
        shortcut: 'Alt+7',
        allowedRoles: ['admin', 'accountant', 'data_entry'],
        subItems: [
          { id: 'backup', title: 'النسخ الاحتياطي واستعادة البيانات' },
          { id: 'audit_log', title: 'سجل رقابة العمليات (Audit Log)' },
          { id: 'online_users', title: 'شاشة المستخدمين المتصلين' },
          { id: 'report_center', title: 'مركز التقارير والإحصائيات الشاملة' },
          { id: 'features_50', title: 'مصفوفة الميزات الـ 50 الشغالة فورا' },
        ],
      },
    ],
    []
  );

  // Expanded nodes state: default first one or active ones expanded
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    system_setup: true,
    general_ledger: true,
  });

  // Search filter inside tree
  const [searchQuery, setSearchQuery] = useState('');

  const toggleNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const handleExpandAll = () => {
    const all: Record<string, boolean> = {};
    treeNodes.forEach((node) => {
      all[node.id] = true;
    });
    setExpandedNodes(all);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Filtered nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return treeNodes;
    const query = searchQuery.trim().toLowerCase();
    return treeNodes.filter((node) => {
      const matchParent = node.title.toLowerCase().includes(query);
      const matchChild = node.subItems.some((sub) =>
        sub.title.toLowerCase().includes(query)
      );
      return matchParent || matchChild;
    });
  }, [treeNodes, searchQuery]);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col p-2.5 sm:p-3 select-none bg-[#f1f4f8]">
      {/* Top Concise Bar */}
      <div className="bg-[#122840] text-white px-3.5 py-2 rounded-t-lg border-b-2 border-[#c49a37] shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#1B3A5C] border border-[#c49a37] flex items-center justify-center font-black text-xs text-[#dfb758]">
            H2
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 leading-none">
              <span className="text-[#dfb758]">لوحة التحكم بالنظام</span>
              <span className="text-slate-400 text-[11px] font-normal hidden sm:inline">
                | تنقل شجري مباشر
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B3A5C] border border-slate-700 text-slate-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>جلسة نشطة:</span>
            <span className="font-bold text-[#dfb758]">{currentUser.name}</span>
          </div>
          <span className="text-[10px] font-mono text-[#dfb758] bg-[#0c1b2c] px-2 py-0.5 rounded border border-[#c49a37]/50 hidden sm:inline">
            v2.5 PRO
          </span>
        </div>
      </div>

      {/* Main Split Body: Exactly 50% Tree Items, 50% H2Pro Logo */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded-b-lg border border-slate-300 border-t-0 shadow-sm overflow-hidden min-h-0">
        {/* HALF 1 (50%): Concise Tree Navigation Panel (لوحة التنقل الشجري) */}
        <div className="flex flex-col h-full bg-[#f8fafc] border border-slate-300 rounded-lg overflow-hidden shadow-xs min-h-0">
          {/* Tree Control Header */}
          <div className="bg-[#1B3A5C] text-white p-2.5 flex items-center justify-between gap-2 border-b border-[#c49a37]/60 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#dfb758]" />
              <span className="text-xs font-bold text-white tracking-wide">
                شجرة بنود النظام
              </span>
            </div>

            {/* Tree Actions: Expand / Collapse All */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExpandAll}
                title="توسيع كل الفروع (+)"
                className="text-[10px] font-bold px-2 py-1 bg-[#122840] hover:bg-[#0c1b2c] text-[#dfb758] rounded border border-[#c49a37]/50 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>+ توسيع الكل</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                title="طي كل الفروع (-)"
                className="text-[10px] font-bold px-2 py-1 bg-[#122840] hover:bg-[#0c1b2c] text-slate-300 rounded border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>- طي الكل</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Search in Tree */}
          <div className="p-2 bg-slate-100/90 border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث سريع في بنود الشجرة..."
                className="w-full text-xs pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Tree Items Container */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1 font-sans text-xs">
            {filteredNodes.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                لا توجد بنود مطابقة لبحثك "{searchQuery}"
              </div>
            ) : (
              filteredNodes.map((node) => {
                const isExpanded = !!expandedNodes[node.id] || searchQuery.trim().length > 0;
                const isAllowed = node.allowedRoles.includes(currentUser.role);
                const IconComponent = node.icon;

                return (
                  <div
                    key={node.id}
                    className={`rounded border transition-all ${
                      isAllowed
                        ? isExpanded
                          ? 'bg-white border-[#1B3A5C]/40 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                        : 'bg-slate-100/70 border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Node Header Row: With [+] and [-] beside item name */}
                    <div
                      onClick={() => {
                        if (isAllowed) {
                          toggleNode(node.id);
                        }
                      }}
                      className={`flex items-center justify-between p-2 cursor-pointer transition-colors group ${
                        isExpanded ? 'bg-slate-50/80 border-b border-slate-200' : ''
                      }`}
                    >
                      {/* Right Side: Toggle button (+ / -) and Item Name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* The classic [+] / [-] toggle button */}
                        <button
                          type="button"
                          onClick={(e) => isAllowed && toggleNode(node.id, e)}
                          disabled={!isAllowed}
                          aria-label={isExpanded ? 'طي البند' : 'توسيع البند'}
                          className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors border shadow-2xs ${
                            isExpanded
                              ? 'bg-[#1B3A5C] text-[#dfb758] border-[#1B3A5C]'
                              : 'bg-white text-slate-700 border-slate-300 group-hover:border-[#1B3A5C] group-hover:text-[#1B3A5C]'
                          }`}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>

                        {/* Node Icon */}
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                            isAllowed
                              ? 'bg-slate-100 text-[#1B3A5C] group-hover:bg-[#1B3A5C] group-hover:text-[#dfb758]'
                              : 'bg-slate-200 text-slate-400'
                          } transition-colors`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>

                        {/* Item Name: e.g. "+ تهيئة النظام" */}
                        <span
                          className={`font-bold text-xs truncate transition-colors ${
                            isAllowed
                              ? 'text-slate-800 group-hover:text-[#1B3A5C]'
                              : 'text-slate-500'
                          }`}
                        >
                          {isExpanded ? '−' : '+'} {node.title}
                        </span>
                      </div>

                      {/* Left Side: Shortcut & Enter Button */}
                      <div className="flex items-center gap-1.5 shrink-0 pr-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {node.shortcut}
                        </span>

                        {isAllowed ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectModule(node.id);
                            }}
                            title={`دخول مباشر إلى ${node.title}`}
                            className="text-[11px] font-bold px-2.5 py-1 bg-[#1B3A5C] hover:bg-[#122840] text-[#dfb758] rounded transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>دخول</span>
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>محجوب</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Children Tree Branches (Sub-screens): Displayed when expanded */}
                    {isExpanded && isAllowed && (
                      <div className="p-1.5 pr-6 bg-slate-50/50 space-y-1 border-r-2 border-dashed border-[#1B3A5C]/40 mr-3">
                        {node.subItems.map((sub, sIdx) => {
                          const isLast = sIdx === node.subItems.length - 1;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => onSelectModule(node.id, sub.id)}
                              className="w-full text-right flex items-center justify-between p-1.5 px-2 rounded hover:bg-white hover:text-[#1B3A5C] text-slate-700 transition-colors group/sub border border-transparent hover:border-slate-200 hover:shadow-2xs cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-400 group-hover/sub:text-[#c49a37]">
                                  {isLast ? '└─' : '├─'}
                                </span>
                                <FileText className="w-3 h-3 text-slate-400 group-hover/sub:text-[#1B3A5C]" />
                                <span className="text-xs group-hover/sub:font-bold">
                                  {sub.title}
                                </span>
                              </div>

                              <span className="text-[10px] text-[#1B3A5C] opacity-0 group-hover/sub:opacity-100 transition-opacity flex items-center gap-0.5 font-semibold">
                                <span>فتح الشاشة</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Tree Footer Notes */}
          <div className="p-2 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B3A5C]"></span>
              انقر على (+) أو (-) لتوسيع البند، أو (دخول) لفتح النظام
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              Esc للرئيسية
            </span>
          </div>
        </div>

        {/* HALF 2 (50%): Elegant H2Pro Logo Presentation (شعار اتش تو برو) */}
        <div className="flex flex-col h-full bg-gradient-to-b from-[#122840] via-[#162f4b] to-[#0c1b2c] border-2 border-[#c49a37] rounded-lg shadow-md p-4 sm:p-6 text-white justify-between overflow-hidden relative">
          {/* Subtle Ambient Decorative Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#c49a37]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1B3A5C]/40 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16"></div>

          {/* Header of Logo Card */}
          <div className="relative z-10 flex items-center justify-between border-b border-slate-700/60 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#dfb758]" />
              <span className="text-xs font-bold text-slate-200 tracking-wider">
                نظام إدارة المنشآت والحسابات المتكامل
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#1B3A5C] text-[#dfb758] border border-[#c49a37]/60 px-2 py-0.5 rounded shadow-2xs">
              H2PRO ENTERPRISE
            </span>
          </div>

          {/* Central Showcase: The Official H2Pro Vector Logo */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center py-4">
            {/* High-Fidelity Vector Brand Crest for H2Pro */}
            <div className="relative mb-4 group cursor-default">
              {/* Outer Golden Geometric Aura */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-tr from-[#c49a37] via-[#dfb758] to-[#996515] p-1 shadow-2xl transition-transform duration-300 group-hover:scale-105">
                {/* Inner Deep Navy Crest Shield */}
                <div className="w-full h-full bg-gradient-to-b from-[#122840] via-[#0f2136] to-[#091524] rounded-xl flex flex-col items-center justify-center border border-[#dfb758]/50 relative overflow-hidden">
                  {/* Subtle Grid Accent */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#dfb7580a_1px,transparent_1px),linear-gradient(to_bottom,#dfb7580a_1px,transparent_1px)] bg-[size:12px_12px] opacity-40"></div>

                  {/* SVG Monogram H2 */}
                  <div className="relative z-10 flex items-baseline justify-center">
                    <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] via-[#dfb758] to-[#c49a37] tracking-tight drop-shadow-md font-sans">
                      H
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#dfb758] via-[#e5c158] to-[#b38628] drop-shadow-md font-sans">
                      2
                    </span>
                  </div>

                  {/* PRO Ribbon Badge */}
                  <div className="relative z-10 mt-1 px-3 py-0.5 rounded bg-gradient-to-r from-[#c49a37] via-[#dfb758] to-[#c49a37] text-[#0c1b2c] font-black text-[10px] sm:text-xs tracking-widest uppercase shadow-md border border-[#ffffff]/40">
                    PRO
                  </div>
                </div>
              </div>

              {/* Corner Star/Sparkle accents */}
              <Sparkles className="w-4 h-4 text-[#dfb758] absolute -top-2 -right-2 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-[#dfb758] absolute -bottom-1 -left-1 animate-pulse delay-150" />
            </div>

            {/* Arabic and English Titles */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#dfb758] tracking-normal mb-1 drop-shadow-sm font-sans">
              اتش تو برو
            </h2>
            <div className="text-sm font-bold text-white tracking-widest uppercase mb-1">
              H2PRO ERP SYSTEM
            </div>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              الحل المحاسبي الشامل لإدارة الحسابات العامة، المخزون، المبيعات، والمشتريات
            </p>

            {/* Direct Quick Launch Banners */}
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <button
                onClick={() => onSelectModule('auxiliary_reports', 'features_50')}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#c49a37] to-[#dfb758] text-[#122840] font-extrabold text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#122840]" />
                <span>مصفوفة الميزات الـ 50 الشغالة</span>
              </button>
              <button
                onClick={() => onSelectModule('auxiliary_reports', 'report_center')}
                className="px-3 py-1.5 rounded-lg bg-[#1B3A5C] text-white border border-[#dfb758]/50 font-bold text-xs shadow-md hover:bg-[#162f4b] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#dfb758]" />
                <span>مركز التقارير الشامل المباشر</span>
              </button>
            </div>
          </div>

          {/* Bottom Specifications & Status Grid */}
          <div className="relative z-10 border-t border-slate-700/60 pt-3 grid grid-cols-2 gap-2 text-[11px] shrink-0">
            <div className="bg-[#122840]/90 border border-slate-700 p-2 rounded flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#dfb758] shrink-0" />
              <div className="truncate">
                <div className="text-[10px] text-slate-400">قاعدة البيانات:</div>
                <div className="font-bold text-slate-200">محلية ومؤمنة (Local)</div>
              </div>
            </div>

            <div className="bg-[#122840]/90 border border-slate-700 p-2 rounded flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <div className="text-[10px] text-slate-400">حالة الترخيص:</div>
                <div className="font-bold text-emerald-300">نسخة معتمدة v2.5</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Shortcuts Quick Bar */}
      <div className="mt-2 bg-[#122840] text-slate-300 py-1.5 px-3 rounded-b-lg border border-[#1B3A5C] flex flex-wrap items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-[#dfb758] font-bold">مفاتيح الدخول السريع:</span>
          <span>[Alt + 1] تهيئة</span>
          <span>·</span>
          <span>[Alt + 2] إدارة</span>
          <span>·</span>
          <span>[Alt + 3] الأستاذ العام</span>
          <span>·</span>
          <span>[Alt + 4] المخزون</span>
          <span>·</span>
          <span>[Alt + 5] المشتريات</span>
          <span>·</span>
          <span>[Alt + 6] المبيعات</span>
          <span>·</span>
          <span>[Alt + 7] مساعدة</span>
        </div>
        <div className="text-slate-400 text-[10px]">
          [Esc] العودة للشاشة الرئيسية · [Alt + P] تصدير PDF
        </div>
      </div>
    </div>
  );
};
