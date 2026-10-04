/**
 * Source Document Modal (معاينة المستند الأصلي والتتبع المحاسبي)
 * يتيح تتبع وعرض أي فاتورة مبيعات، مشتريات، سند صرف/قبض، أو قيد محاسبي مباشرة من أي تقرير
 */

import React, { useState } from 'react';
import { db } from '../database/db';
import { User, JournalEntry } from '../types';
import { Modal } from './Modal';
import { PrintHeader } from './PrintHeader';
import { tafqeet } from '../utils/tafqeet';
import { hasPermission } from '../utils/permissionUtils';
import {
  FileText,
  Printer,
  Ban,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Receipt,
  RotateCcw,
} from 'lucide-react';

interface SourceDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentRef?: string;
  currentUser?: User;
  onDocumentCancelled?: () => void;
}

export const SourceDocumentModal: React.FC<SourceDocumentModalProps> = ({
  isOpen,
  onClose,
  documentRef,
  currentUser,
  onDocumentCancelled,
}) => {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen || !documentRef) return null;

  const company = db.getCompanyInfo();
  const searchResult = db.findDocumentByRef(documentRef);
  const { found, type, doc, linkedJournal } = searchResult;

  const handleCancelDocument = () => {
    if (!cancelReason.trim()) {
      setStatusMessage({ text: 'يرجى كتابة سبب الإلغاء والعكس المحاسبي.', isError: true });
      return;
    }
    const actor = currentUser?.name || currentUser?.username || 'admin';
    let res: { success: boolean; message: string; reversalEntryNumber?: string } = {
      success: false,
      message: 'نوع المستند غير معروف للإلغاء',
    };

    if (type === 'sales_invoice') {
      res = db.cancelSalesInvoice(doc.id, cancelReason, actor);
    } else if (type === 'purchase_invoice') {
      res = db.cancelPurchaseInvoice(doc.id, cancelReason, actor);
    } else if (type === 'voucher') {
      res = db.cancelCashVoucher(doc.id, cancelReason, actor);
    } else if (type === 'journal') {
      res = db.reverseJournalEntry(doc.id, cancelReason, actor);
    }

    if (res.success) {
      setStatusMessage({ text: res.message, isError: false });
      setCancelModalOpen(false);
      setCancelReason('');
      if (onDocumentCancelled) onDocumentCancelled();
    } else {
      setStatusMessage({ text: res.message, isError: true });
    }
  };

  const getDocTitle = () => {
    switch (type) {
      case 'sales_invoice':
        return `فاتورة مبيعات ضريبية رقم #${doc.invoiceNumber}`;
      case 'purchase_invoice':
        return `فاتورة مشتريات ضريبية رقم #${doc.invoiceNumber}`;
      case 'voucher':
        return doc.type === 'payment'
          ? `سند صرف نقدي رقم #${doc.voucherNumber}`
          : `سند قبض نقدي رقم #${doc.voucherNumber}`;
      case 'journal':
        return `قيد يومية محاسبي رقم #${doc.entryNumber}`;
      case 'sales_return':
        return `إشعار دائن مردودات مبيعات رقم #${doc.returnNumber}`;
      case 'purchase_return':
        return `إشعار مدين مردودات مشتريات رقم #${doc.returnNumber}`;
      default:
        return `مستند مالي مرجعي: ${documentRef}`;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getDocTitle()} maxWidth="max-w-4xl">
      <div className="space-y-5 text-xs text-slate-800">
        {!found ? (
          <div className="bg-amber-50 border border-amber-300 p-6 rounded-lg text-center space-y-2">
            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">لم يتم العثور على المستند الأصلي</h4>
            <p className="text-slate-600">
              المرجع المطلوب <span className="font-mono font-bold text-slate-900">{documentRef}</span> غير مسجل أو يتبع سنة مالية مؤرشفة.
            </p>
          </div>
        ) : (
          <div>
            {/* Status Message Notification */}
            {statusMessage && (
              <div
                className={`p-3 rounded-md mb-3 flex items-center gap-2 font-bold ${
                  statusMessage.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {statusMessage.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Official Letterhead */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 mb-4 shadow-2xs">
              <PrintHeader company={company} title={getDocTitle()} docNumber={doc.invoiceNumber || doc.voucherNumber || doc.entryNumber || doc.returnNumber} />
            </div>

            {/* Document Header & Status Pills */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">حالة المستند:</span>
                  {doc.status === 'cancelled' || doc.isReversed ? (
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded font-bold flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5" />
                      <span>ملغى بقيد عكسي رقم: {doc.reversalEntryNumber || 'REV'}</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>مرحّل ومعتمد محاسبياً للأستاذ العام</span>
                    </span>
                  )}
                </div>

                <div className="text-slate-500 font-mono">
                  <span>تاريخ المستند: </span>
                  <strong className="text-slate-800">{doc.date}</strong>
                </div>
              </div>

              {/* Master Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-md">
                {(type === 'sales_invoice' || type === 'sales_return') && (
                  <>
                    <div>
                      <span className="text-slate-500 block text-[11px]">اسم العميل:</span>
                      <strong className="text-[#1B3A5C] text-sm">{doc.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">طريقة الدفع:</span>
                      <span className="font-bold">{doc.paymentStatus === 'paid' ? 'نقداً (الصندوق)' : doc.paymentStatus === 'credit' ? 'آجل (حساب عميل)' : 'جزئي'}</span>
                    </div>
                  </>
                )}

                {(type === 'purchase_invoice' || type === 'purchase_return') && (
                  <>
                    <div>
                      <span className="text-slate-500 block text-[11px]">اسم المورد:</span>
                      <strong className="text-[#1B3A5C] text-sm">{doc.supplierName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">طريقة السداد:</span>
                      <span className="font-bold">{doc.paymentStatus === 'paid' ? 'نقداً (الصندوق)' : 'آجل (حساب مورد)'}</span>
                    </div>
                  </>
                )}

                {type === 'voucher' && (
                  <>
                    <div>
                      <span className="text-slate-500 block text-[11px]">{doc.type === 'payment' ? 'المستفيد:' : 'المستلم منه:'}</span>
                      <strong className="text-[#1B3A5C] text-sm">{doc.partyName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">طريقة القبض/الصرف:</span>
                      <span className="font-bold">{doc.paymentMethod === 'cash' ? 'نقدي (خزينة)' : 'شيك بنكي'}</span>
                    </div>
                  </>
                )}

                <div>
                  <span className="text-slate-500 block text-[11px]">السنة المالية:</span>
                  <span className="font-mono font-bold">{doc.financialYear || 2026}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">تم الإنشاء بواسطة:</span>
                  <span className="font-semibold">{doc.createdBy || 'النظام'}</span>
                </div>
              </div>

              {/* Items Table for Invoices & Returns */}
              {doc.items && doc.items.length > 0 && (
                <div className="border border-slate-200 rounded overflow-hidden mt-3">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-[#1B3A5C] text-white">
                      <tr>
                        <th className="p-2 border-l border-slate-700 w-10 text-center">#</th>
                        <th className="p-2 border-l border-slate-700 w-24">رمز الصنف</th>
                        <th className="p-2 border-l border-slate-700">بيان الصنف</th>
                        <th className="p-2 border-l border-slate-700 w-20 text-center">الكمية</th>
                        <th className="p-2 border-l border-slate-700 w-24 text-left">السعر</th>
                        <th className="p-2 border-l border-slate-700 w-24 text-left">الضريبة</th>
                        <th className="p-2 w-28 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {doc.items.map((it: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 border-l border-slate-200 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2 border-l border-slate-200 font-mono font-bold text-[#1B3A5C]">{it.itemCode}</td>
                          <td className="p-2 border-l border-slate-200 font-medium">{it.itemName}</td>
                          <td className="p-2 border-l border-slate-200 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="p-2 border-l border-slate-200 text-left font-mono">{Number(it.unitPrice).toLocaleString('ar-SA')}</td>
                          <td className="p-2 border-l border-slate-200 text-left font-mono text-slate-600">{Number(it.taxAmount || 0).toLocaleString('ar-SA')}</td>
                          <td className="p-2 text-left font-mono font-bold text-slate-900">{Number(it.total).toLocaleString('ar-SA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financial Totals Breakdown & Tafqeet */}
              {(doc.grandTotal !== undefined || doc.amount !== undefined) && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3">
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      المبلغ كتابة: <strong className="text-[#1B3A5C]">{tafqeet(doc.grandTotal || doc.amount)} {company.defaultCurrency} فقط لا غير</strong>
                    </div>
                    {doc.notes && <div className="text-slate-500">ملاحظات: {doc.notes}</div>}
                  </div>

                  <div className="text-left font-mono space-y-1 border-t md:border-t-0 md:border-r border-slate-300 md:pr-4">
                    {doc.subtotal !== undefined && (
                      <div className="flex justify-between gap-6 text-slate-600">
                        <span>المبلغ الخاضع للضريبة:</span>
                        <span>{Number(doc.subtotal).toLocaleString('ar-SA')} {company.defaultCurrency}</span>
                      </div>
                    )}
                    {doc.taxTotal !== undefined && doc.taxTotal > 0 && (
                      <div className="flex justify-between gap-6 text-slate-600">
                        <span>ضريبة القيمة المضافة (15%):</span>
                        <span>{Number(doc.taxTotal).toLocaleString('ar-SA')} {company.defaultCurrency}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-6 text-sm font-bold text-emerald-800 border-t border-slate-300 pt-1">
                      <span>الإجمالي النهائي المستحق:</span>
                      <span>{Number(doc.grandTotal || doc.amount).toLocaleString('ar-SA')} {company.defaultCurrency}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Linked Journal Entry (التتبع المحاسبي المزدوج) */}
            {linkedJournal && (
              <div className="border border-slate-300 rounded-lg overflow-hidden bg-white mt-4">
                <div className="bg-[#122840] text-white p-2.5 flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#dfb758]" />
                    <span>القيد المحاسبي المولد آلياً (الأستاذ العام) - رقم #{linkedJournal.entryNumber}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-300">{linkedJournal.date}</span>
                </div>
                <div className="p-3 bg-slate-50 text-[11px] text-slate-600 border-b border-slate-200">
                  <span>البيان المحاسبي: </span>
                  <strong className="text-slate-900">{linkedJournal.description}</strong>
                </div>
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
                    <tr>
                      <th className="p-2 border-l border-slate-200 w-24 font-mono">رقم الحساب</th>
                      <th className="p-2 border-l border-slate-200">اسم الحساب المالي</th>
                      <th className="p-2 border-l border-slate-200 w-28 text-left text-emerald-800">مدين (Debit)</th>
                      <th className="p-2 border-l border-slate-200 w-28 text-left text-blue-800">دائن (Credit)</th>
                      <th className="p-2 text-slate-500">البيان التحليلي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {linkedJournal.lines.map((l: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 border-l border-slate-200 font-mono font-bold text-[#1B3A5C]">{l.accountCode}</td>
                        <td className="p-2 border-l border-slate-200 font-semibold">{l.accountName}</td>
                        <td className="p-2 border-l border-slate-200 text-left font-mono font-bold text-emerald-800">
                          {Number(l.debit) > 0 ? Number(l.debit).toLocaleString('ar-SA') : '-'}
                        </td>
                        <td className="p-2 border-l border-slate-200 text-left font-mono font-bold text-blue-800">
                          {Number(l.credit) > 0 ? Number(l.credit).toLocaleString('ar-SA') : '-'}
                        </td>
                        <td className="p-2 text-slate-500 text-[11px]">{l.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                    <tr>
                      <td colSpan={2} className="p-2 border-l border-slate-200 text-center">المجموع المتوازن للقيد</td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono text-emerald-800">
                        {Number(linkedJournal.debitTotal).toLocaleString('ar-SA')}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-left font-mono text-blue-800">
                        {Number(linkedJournal.creditTotal).toLocaleString('ar-SA')}
                      </td>
                      <td className="p-2 text-emerald-700 text-center font-bold">متوازن (0.00)</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Cancellation Details if Document was Cancelled */}
            {(doc.status === 'cancelled' || doc.isReversed) && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-red-900 mt-4 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sm text-red-800">
                  <Ban className="w-4 h-4" />
                  <span>تفاصيل الإلغاء والعكس المحاسبي:</span>
                </div>
                <div className="text-xs">
                  <span>سبب الإلغاء: </span>
                  <strong>{doc.cancelReason || doc.reverseReason || 'إلغاء إداري موثق'}</strong>
                </div>
                <div className="text-xs text-slate-600 flex justify-between font-mono pt-1">
                  <span>القيد العكسي المنفذ: #{doc.reversalEntryNumber}</span>
                  <span>تاريخ الإلغاء: {doc.cancelledAt || doc.reversedAt}</span>
                  <span>المنفذ: {doc.cancelledBy || doc.reversedBy}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            {found && doc.status !== 'cancelled' && !doc.isReversed && hasPermission(currentUser, 'general_ledger', 'cancel') && (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إجراء إلغاء وعكس محاسبي (Reversal)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-[#1B3A5C] hover:bg-[#122840] text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#dfb758]" />
              <span>طباعة المستند</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* Cancellation Reason Modal */}
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-300">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>تأكيد الإلغاء والعكس المحاسبي للمستند</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                وفقاً للقواعد المحاسبية الصارمة وضوابط الرقابة (قاعدة 6 و 7)، لا يتم حذف المستند نهائياً بل يتم توليد <strong>قيد محاسبي عكسي</strong> لتصفير الأثر المالي واستعادة كميات المخزون وتصحيح رصيد الحساب مع توثيق العملية في سجل الرقابة.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب الإلغاء والعكس (إلزامي للتدقيق):</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="اكتب سبب إلغاء المستند بالتفصيل..."
                  rows={3}
                  className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleCancelDocument}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold cursor-pointer shadow-xs"
                >
                  تأكيد العكس المحاسبي الآن
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
