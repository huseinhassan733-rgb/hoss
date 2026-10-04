/**
 * Classic Enterprise DataGrid Component with 7-Button Standard ERP Toolbar
 * جدول بيانات مكتبي عالي الدقة مع شريط الأدوات الموحد:
 * [ إضافة | تعديل | حذف | بحث | حفظ | تراجع | طباعة ]
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Save,
  RotateCcw,
  Printer,
  Download,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileDown,
  CheckCircle,
} from 'lucide-react';
import { downloadPDF } from '../utils/pdfExport';
import { db } from '../database/db';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'right' | 'center' | 'left';
  sortable?: boolean;
}

interface DataGridProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onSave?: (item?: T) => void;
  onCancel?: () => void;
  onPrint?: () => void;
  onSearch?: () => void;
  addLabel?: string;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canSave?: boolean;
  canCancel?: boolean;
  canPrint?: boolean;
  canSearch?: boolean;
  filterPredicate?: (item: T, term: string) => boolean;
  extraActions?: React.ReactNode;
  docTitle?: string;
}

export function DataGrid<T extends { id: string | number }>({
  title,
  subtitle,
  data,
  columns,
  searchPlaceholder = 'بحث سريع في السجلات...',
  onAdd,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  onPrint,
  onSearch,
  addLabel = 'إضافة جديد',
  canAdd = true,
  canEdit = true,
  canDelete = true,
  canSave = true,
  canCancel = true,
  canPrint = true,
  canSearch = true,
  filterPredicate,
  extraActions,
  docTitle,
}: DataGridProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number | 'all'>(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected item object
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return data.find((d) => d.id === selectedItemId) || null;
  }, [data, selectedItemId]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      if (filterPredicate) {
        result = result.filter((item) => filterPredicate(item, term));
      } else {
        result = result.filter((item) =>
          JSON.stringify(item).toLowerCase().includes(term)
        );
      }
    }

    if (sortKey) {
      result.sort((a: any, b: any) => {
        const valA = a[sortKey] ?? '';
        const valB = b[sortKey] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB), 'ar')
          : String(valB).localeCompare(String(valA), 'ar');
      });
    }

    return result;
  }, [data, searchTerm, sortKey, sortDirection, filterPredicate]);

  // Reset current page when search, sort, or data length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortKey, sortDirection, data.length]);

  // Total pages calculation
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredData.length / pageSize));

  // Paginated slice to fit screen perfectly without scroll arrows
  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return filteredData;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Keyboard navigation for pages (PageUp / PageDown) and action shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input, ignore global shortcuts
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // F2: Add
      if (e.key === 'F2') {
        e.preventDefault();
        if (canAdd && onAdd) onAdd();
        return;
      }

      // F3: Search
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // F4: Edit
      if (e.key === 'F4') {
        e.preventDefault();
        if (canEdit && onEdit && selectedItem) {
          onEdit(selectedItem);
        }
        return;
      }

      // Delete: Delete
      if (e.key === 'Delete' && selectedItem) {
        e.preventDefault();
        if (canDelete && onDelete) {
          onDelete(selectedItem);
        }
        return;
      }

      // Esc: Cancel / Clear
      if (e.key === 'Escape') {
        setSelectedItemId(null);
        setSearchTerm('');
        if (onCancel) onCancel();
        return;
      }

      // Pagination
      if (e.key === 'PageDown' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if (e.key === 'PageUp' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, canAdd, onAdd, canEdit, onEdit, canDelete, onDelete, onCancel, selectedItem]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch();
    }
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleEditClick = () => {
    if (!onEdit) return;
    if (selectedItem) {
      onEdit(selectedItem);
    } else if (filteredData.length > 0) {
      setSelectedItemId(filteredData[0].id);
      onEdit(filteredData[0]);
    }
  };

  const handleDeleteClick = () => {
    if (!onDelete) return;
    if (selectedItem) {
      onDelete(selectedItem);
    } else if (filteredData.length > 0) {
      setSelectedItemId(filteredData[0].id);
      onDelete(filteredData[0]);
    }
  };

  const handleSaveClick = () => {
    if (onSave) {
      onSave(selectedItem || undefined);
    }
  };

  const handleCancelClick = () => {
    setSelectedItemId(null);
    setSearchTerm('');
    if (onCancel) {
      onCancel();
    }
  };

  const handlePrintClick = () => {
    if (onPrint) {
      onPrint();
    } else {
      exportPDF();
    }
  };

  const exportCSV = () => {
    const headers = columns.map((c) => c.header).join(',');
    const rows = filteredData.map((item: any) =>
      columns
        .map((c) => {
          const val = item[c.key] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const pdfColumns = columns.map((col) => ({
      header: col.header,
      dataKey: col.key,
      align: col.align || 'right',
    }));

    downloadPDF({
      title,
      subtitle: subtitle || 'تقرير نظام H2pro المحاسبي المعتمد',
      columns: pdfColumns,
      data: filteredData as Record<string, any>[],
      company: db.getCompanyInfo(),
      orientation: columns.length > 5 ? 'landscape' : 'portrait',
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
      {/* Table / Register Header Toolbar */}
      <div className="bg-gradient-to-b from-[#f8fafc] to-[#eef2f6] border-b border-slate-300 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 no-print select-none">
        {/* Left Side: Actions to switch or open in Entry Screen + Search Box */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Add / Open Entry Screen Button */}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              disabled={!canAdd}
              title="فتح شاشة الإدخال لإضافة مستند جديد [F2]"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[#1B3A5C] hover:bg-[#122840] text-white border border-[#122840] shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-[#dfb758]" />
              <span>{addLabel || 'إضافة جديد (شاشة الإدخال)'}</span>
            </button>
          )}

          {/* Quick Edit of Selected Row */}
          {selectedItem && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(selectedItem)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 shadow-2xs transition-all cursor-pointer"
              title="عرض وتعديل المستند المحدد في شاشة الإدخال"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>فتح في شاشة الإدخال</span>
            </button>
          )}

          {/* Delete Selected Row */}
          {selectedItem && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(selectedItem)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-bold bg-white hover:bg-red-50 text-red-700 border border-red-300 shadow-2xs transition-all cursor-pointer"
              title="حذف المستند المحدد"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>حذف</span>
            </button>
          )}

          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-xs pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Exports & Records Count */}
        <div className="flex items-center flex-wrap gap-2">
          {extraActions}

          <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200">
            عدد السجلات: <span className="font-mono text-[#1B3A5C] font-black">{filteredData.length}</span>
          </span>

          {/* Quick Exports: PDF / CSV */}
          <button
            type="button"
            onClick={exportPDF}
            className="p-1.5 bg-white hover:bg-slate-50 text-red-700 border border-red-200 hover:border-red-300 rounded shadow-2xs transition-colors cursor-pointer"
            title="تصدير جدول البيانات إلى PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="p-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded shadow-2xs transition-colors cursor-pointer"
            title="تصدير جدول البيانات إلى Excel (CSV)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handlePrintClick}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded shadow-2xs cursor-pointer"
            title="طباعة السجل الرسمي"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة السجل</span>
          </button>
        </div>
      </div>

      {/* Selected Document Notification Banner */}
      {selectedItem && (
        <div className="bg-blue-50/90 border-b border-blue-200 px-3 py-1 text-xs text-blue-900 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>
              تم تحديد السجل: <span className="font-bold font-mono">{(selectedItem as any).entryNumber || (selectedItem as any).invoiceNumber || (selectedItem as any).voucherNumber || (selectedItem as any).docNumber || (selectedItem as any).code || (selectedItem as any).name || selectedItem.id}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500">جاهز للتعديل أو الحذف عبر شريط الأزرار</span>
            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
              className="text-blue-700 hover:underline font-bold cursor-pointer"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full border-collapse text-xs text-right">
          <thead className="bg-[#e2e8f0] text-slate-800 sticky top-0 border-b border-slate-300 shadow-xs z-10 select-none">
            <tr>
              <th className="py-2.5 px-3 font-bold text-slate-700 w-12 text-center border-l border-slate-300">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={{ width: col.width }}
                  className={`py-2.5 px-3 font-bold text-slate-800 border-l border-slate-300 ${
                    col.sortable !== false ? 'cursor-pointer hover:bg-slate-300/80 transition-colors' : ''
                  } ${col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <span className="text-slate-500">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3 text-[#1B3A5C]" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-[#1B3A5C]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="py-2.5 px-3 font-bold text-slate-700 w-28 text-center border-l border-slate-300 no-print">
                  إجراءات
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + ((onEdit || onDelete) ? 2 : 1)}
                  className="py-10 text-center text-slate-400"
                >
                  {searchTerm ? 'لا توجد نتائج مطابقة لمعايير البحث' : 'لا توجد بيانات مسجلة حالياً'}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const rowNumber = pageSize === 'all' ? index + 1 : (currentPage - 1) * pageSize + index + 1;
                const isSelected = selectedItemId === item.id;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                    className={`transition-colors cursor-pointer select-none group ${
                      isSelected
                        ? 'bg-blue-100/90 text-blue-900 border-b-2 border-blue-400 font-medium'
                        : 'hover:bg-amber-50/60 odd:bg-white even:bg-slate-50/60 border-b border-slate-200'
                    }`}
                  >
                    <td className={`py-2 px-3 text-center font-mono border-l border-slate-200 text-[11px] ${isSelected ? 'font-bold text-blue-900 bg-blue-200/60' : 'text-slate-500'}`}>
                      {isSelected ? '✓ ' : ''}{rowNumber}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-2 px-3 text-slate-700 border-l border-slate-200 ${
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'left'
                            ? 'text-left'
                            : 'text-right'
                        }`}
                      >
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="py-1.5 px-2 text-center space-x-1 space-x-reverse no-print"
                      >
                        {canEdit && onEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemId(item.id);
                              onEdit(item);
                            }}
                            className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded border border-blue-200 transition-colors cursor-pointer"
                            title="تعديل السجل"
                          >
                            تعديل
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemId(item.id);
                              onDelete(item);
                            }}
                            className="px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded border border-red-200 transition-colors cursor-pointer"
                            title="حذف السجل"
                          >
                            حذف
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DataGrid Footer: Pagination & Summary */}
      <div className="bg-slate-100 border-t border-slate-300 px-3 py-2 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none no-print">
        {/* Left: Records summary & Page size selector */}
        <div className="flex items-center gap-3 text-[11px]">
          <div>
            عرض السجلات <span className="font-bold text-[#1B3A5C]">
              {filteredData.length === 0 ? 0 : pageSize === 'all' ? 1 : (currentPage - 1) * pageSize + 1}
            </span> إلى{' '}
            <span className="font-bold text-[#1B3A5C]">
              {pageSize === 'all' ? filteredData.length : Math.min(currentPage * pageSize, filteredData.length)}
            </span>{' '}
            من إجمالي <span className="font-bold text-[#1B3A5C]">{filteredData.length}</span> سجل
          </div>

          <div className="flex items-center gap-1.5 border-r border-slate-300 pr-3">
            <span className="text-slate-500">سجلات لكل صفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-[#1B3A5C] cursor-pointer font-medium"
            >
              <option value={5}>5 سجلات</option>
              <option value={8}>8 (مقاس الشاشة المثالي)</option>
              <option value={10}>10 سجلات</option>
              <option value={15}>15 سجل</option>
              <option value="all">عرض الكل</option>
            </select>
          </div>
        </div>

        {/* Right: Direct Page Numbers */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                currentPage === 1
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
              title="الصفحة السابقة (PageUp)"
            >
              السابق
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[26px] h-6 px-1.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-[#1B3A5C] text-[#dfb758] border-[#1B3A5C] shadow-inner'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
                title={`الانتقال إلى صفحة ${pageNum}`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                currentPage === totalPages
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
              title="الصفحة التالية (PageDown)"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
