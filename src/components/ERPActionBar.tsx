/**
 * ERP Action Bar / Document Toolbar
 * شريط الأزرار الموحد لشاشات الإدخال والمستندات في نظام H2Pro
 * يحتوي على الأزرار السبعة المعتمدة:
 * [ إضافة | تعديل | حذف | بحث | حفظ | تراجع | طباعة ]
 */

import React, { useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  RotateCcw,
  Printer,
  FileText,
  CheckCircle,
} from 'lucide-react';

export type ERPMode = 'view' | 'add' | 'edit';

export interface ERPActionBarProps {
  mode?: ERPMode;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSearch?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;

  // Navigation between documents inside entry screen
  onFirst?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onLast?: () => void;
  canNavigateFirst?: boolean;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
  canNavigateLast?: boolean;
  currentRecordIndex?: number;
  totalRecordsCount?: number;

  // Disabled flags
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canSearch?: boolean;
  canSave?: boolean;
  canCancel?: boolean;
  canPrint?: boolean;

  // Document Info
  docNumber?: string | number;
  docTitle?: string;
  isAutoSeq?: boolean;

  // Search input inline support
  showSearchInput?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;

  className?: string;
  compact?: boolean;
}

export const ERPActionBar: React.FC<ERPActionBarProps> = ({
  mode = 'view',
  onAdd,
  onEdit,
  onDelete,
  onSearch,
  onSave,
  onCancel,
  onPrint,

  onFirst,
  onPrev,
  onNext,
  onLast,
  canNavigateFirst = false,
  canNavigatePrev = false,
  canNavigateNext = false,
  canNavigateLast = false,
  currentRecordIndex,
  totalRecordsCount,

  canAdd = true,
  canEdit = true,
  canDelete = true,
  canSearch = true,
  canSave = true,
  canCancel = true,
  canPrint = true,

  docNumber,
  docTitle,
  isAutoSeq = true,

  showSearchInput = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'بحث في المستندات...',

  className = '',
  compact = false,
}) => {
  const isEditingOrAdding = mode === 'add' || mode === 'edit';

  // Keyboard shortcuts for professional users (F2, F4, F5, F8, F10, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (e.key === 'F2') {
        e.preventDefault();
        if (isEditingOrAdding && onSave && canSave) {
          onSave();
        } else if (!isEditingOrAdding && onAdd && canAdd) {
          onAdd();
        }
      } else if (e.key === 'F5' || e.key === 'F3') {
        e.preventDefault();
        if (onSearch && canSearch) {
          onSearch();
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (onDelete && canDelete && !isEditingOrAdding) {
          onDelete();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (onEdit && canEdit && !isEditingOrAdding) {
          onEdit();
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (onSave && canSave && isEditingOrAdding) {
          onSave();
        }
      } else if (e.key === 'Escape') {
        if (isEditingOrAdding && onCancel && canCancel) {
          e.preventDefault();
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingOrAdding, onSave, onAdd, onSearch, onDelete, onEdit, onCancel, canSave, canAdd, canSearch, canDelete, canEdit, canCancel]);

  return (
    <div
      className={`bg-gradient-to-b from-[#f1f5f9] to-[#e2e8f0] border-2 border-[#1B3A5C]/40 rounded-lg p-2 shadow-xs flex flex-wrap items-center justify-between gap-2.5 select-none no-print ${className}`}
    >
      {/* Group 1: The 7 Core ERP Buttons + Navigation inside the Entry Screen */}
      <div className="flex items-center flex-wrap gap-1.5">
        {/* 1. إضافة (Add) */}
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd || !onAdd}
          title="إضافة مستند جديد (توليد رقم تسلسلي تلقائي يبدأ من 1) [F2]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
            !canAdd || !onAdd
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
              : 'bg-[#1B3A5C] hover:bg-[#122840] text-white border border-[#122840] active:scale-95'
          }`}
        >
          <Plus className="w-4 h-4 text-[#dfb758]" />
          <span>إضافة</span>
          {!compact && <span className="text-[10px] bg-black/20 px-1 py-0.2 rounded text-amber-200 font-mono">(F2)</span>}
        </button>

        {/* 2. تعديل (Edit) */}
        <button
          type="button"
          onClick={onEdit}
          disabled={!canEdit || !onEdit || isEditingOrAdding}
          title="تعديل بيانات المستند المعروض حالياً [F4]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
            !canEdit || !onEdit || isEditingOrAdding
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 active:scale-95'
          }`}
        >
          <Pencil className="w-4 h-4 text-blue-600" />
          <span>تعديل</span>
          {!compact && <span className="text-[10px] bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono border border-slate-200">(F4)</span>}
        </button>

        {/* 3. حذف (Delete) */}
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete || !onDelete || isEditingOrAdding}
          title="حذف هذا المستند نهائياً [F8]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
            !canDelete || !onDelete || isEditingOrAdding
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-red-50 text-red-700 border border-red-300 hover:border-red-400 active:scale-95'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
          <span>حذف</span>
          {!compact && <span className="text-[10px] bg-red-50 px-1 py-0.2 rounded text-red-600 font-mono border border-red-200">(F8)</span>}
        </button>

        {/* 4. بحث (Search) */}
        <button
          type="button"
          onClick={onSearch}
          disabled={!canSearch || !onSearch}
          title="البحث عن مستند واستدعائه لشاشة الإدخال [F5]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
            !canSearch || !onSearch
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 active:scale-95'
          }`}
        >
          <Search className="w-4 h-4 text-indigo-600" />
          <span>بحث</span>
          {!compact && <span className="text-[10px] bg-indigo-50 px-1 py-0.2 rounded text-indigo-700 font-mono border border-indigo-200">(F5)</span>}
        </button>

        <div className="h-6 w-[1.5px] bg-slate-300 mx-1 hidden sm:block"></div>

        {/* 5. حفظ (Save) */}
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || !onSave || !isEditingOrAdding}
          title="حفظ المستند وترحيله إلى قاعدة البيانات [F2 / F10]"
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
            !canSave || !onSave || !isEditingOrAdding
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800 shadow-md ring-2 ring-emerald-400 active:scale-95'
          }`}
        >
          <Save className="w-4 h-4 text-emerald-100" />
          <span>حفظ</span>
          {!compact && <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded text-emerald-100 font-mono">(F2 للحفظ)</span>}
        </button>

        {/* 6. تراجع (Undo / Cancel) */}
        <button
          type="button"
          onClick={onCancel}
          disabled={!canCancel || !onCancel || !isEditingOrAdding}
          title="تراجع عن التعديل وإلغاء العملية والعودة للمستند المحفوظ [Esc]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
            !canCancel || !onCancel || !isEditingOrAdding
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
              : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 active:scale-95'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-amber-700" />
          <span>تراجع</span>
          {!compact && <span className="text-[10px] bg-amber-200/80 px-1 py-0.2 rounded text-amber-900 font-mono">(Esc)</span>}
        </button>

        <div className="h-6 w-[1.5px] bg-slate-300 mx-1 hidden sm:block"></div>

        {/* 7. طباعة (Print) */}
        <button
          type="button"
          onClick={onPrint}
          disabled={!canPrint || !onPrint}
          title="طباعة المستند المعروض حالياً بالفورمات الرسمية [P]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
            !canPrint || !onPrint
              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 active:scale-95'
          }`}
        >
          <Printer className="w-4 h-4 text-slate-700" />
          <span>طباعة</span>
          {!compact && <span className="text-[10px] bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono border border-slate-200">(P)</span>}
        </button>

        {/* Document Browsing / Navigation Buttons (|<, <, >, >|) */}
        {(onFirst || onPrev || onNext || onLast) && (
          <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded p-0.5 mr-1 shadow-2xs">
            {onFirst && (
              <button
                type="button"
                onClick={onFirst}
                disabled={!canNavigateFirst || isEditingOrAdding}
                title="المستند الأول (|<<)"
                className="px-1.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded"
              >
                |◀
              </button>
            )}
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                disabled={!canNavigatePrev || isEditingOrAdding}
                title="المستند السابق (◀)"
                className="px-1.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded"
              >
                ◀
              </button>
            )}
            {currentRecordIndex !== undefined && totalRecordsCount !== undefined && (
              <span className="text-[11px] font-mono px-2 py-0.5 text-slate-600 bg-slate-50 rounded border border-slate-200">
                {currentRecordIndex} / {totalRecordsCount}
              </span>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={!canNavigateNext || isEditingOrAdding}
                title="المستند التالي (▶)"
                className="px-1.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded"
              >
                ▶
              </button>
            )}
            {onLast && (
              <button
                type="button"
                onClick={onLast}
                disabled={!canNavigateLast || isEditingOrAdding}
                title="المستند الأخير (>>|)"
                className="px-1.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded"
              >
                ▶|
              </button>
            )}
          </div>
        )}
      </div>

      {/* Group 2: Document Auto Serial Indicator & Mode Status inside Input Screen */}
      <div className="flex items-center gap-2">
        {/* Search Input (if enabled inline) */}
        {showSearchInput && onSearchChange && (
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-xs pr-8 pl-2 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] text-slate-800"
            />
          </div>
        )}

        {/* Auto Sequential Number Badge */}
        {docNumber !== undefined && (
          <div className="flex items-center gap-1.5 bg-[#1B3A5C]/10 border border-[#1B3A5C]/30 px-2.5 py-1 rounded-md text-xs">
            <FileText className="w-4 h-4 text-[#1B3A5C]" />
            <span className="text-slate-700 font-bold text-xs">
              {docTitle ? `${docTitle} رقم:` : 'رقم المستند:'}
            </span>
            <span className="font-mono font-black text-[#1B3A5C] px-2 py-0.5 bg-white rounded border border-[#1B3A5C]/30 shadow-2xs text-sm">
              {docNumber}
            </span>
            {isAutoSeq && (
              <span className="text-[11px] text-emerald-800 font-black bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                تسلسل تلقائي (يبدأ من 1)
              </span>
            )}
          </div>
        )}

        {/* Active Mode Status Badge */}
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-md border shadow-2xs ${
            mode === 'add'
              ? 'bg-blue-100 text-blue-900 border-blue-300'
              : mode === 'edit'
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}
        >
          {mode === 'add' ? '● وضع الإدخال (جديد)' : mode === 'edit' ? '● وضع التعديل' : '● وضع الاستعراض'}
        </span>
      </div>
    </div>
  );
};

