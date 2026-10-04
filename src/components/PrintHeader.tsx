/**
 * Official Company Letterhead Header for Reports & Invoices
 * ترويسة الشركة الرسمية للطباعة
 */

import React from 'react';
import { CompanyInfo } from '../types';
import { Building2 } from 'lucide-react';

interface PrintHeaderProps {
  company: CompanyInfo;
  title: string;
  subtitle?: string;
  docNumber?: string;
  date?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  company,
  title,
  subtitle,
  docNumber,
  date = new Date().toLocaleDateString('ar-SA'),
}) => {
  return (
    <div className="border-b-2 border-[#1B3A5C] pb-4 mb-5">
      {/* Top Header with Logo and Company Info */}
      <div className="flex items-center justify-between gap-4">
        {/* Right side: Company Details in Arabic */}
        <div className="text-right">
          <h1 className="text-xl font-bold text-[#1B3A5C] tracking-wide mb-1">
            {company.name}
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            {company.address}
          </p>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
            <span>هاتف: {company.phone}</span>
            {company.taxNumber && <span>الرقم الضريبي: <span className="font-mono">{company.taxNumber}</span></span>}
            {company.crNumber && <span>س.ت: <span className="font-mono">{company.crNumber}</span></span>}
          </div>
        </div>

        {/* Center: System Logo / Crest */}
        <div className="flex flex-col items-center justify-center px-4">
          <div className="w-14 h-14 rounded-lg bg-[#1B3A5C] border-2 border-[#c49a37] flex items-center justify-center text-white shadow-sm">
            <Building2 className="w-8 h-8 text-[#dfb758]" />
          </div>
          <span className="text-[10px] font-bold text-[#1B3A5C] tracking-wider mt-1">H2pro ERP</span>
        </div>

        {/* Left side: Meta (Document No & Date) */}
        <div className="text-left text-xs text-slate-600 space-y-1">
          {docNumber && (
            <div className="font-mono font-bold text-[#1B3A5C] text-sm">
              رقم المستند: {docNumber}
            </div>
          )}
          <div>تاريخ الطباعة: <span className="font-mono">{date}</span></div>
          <div>العملة: {company.defaultCurrency}</div>
        </div>
      </div>

      {/* Title Box */}
      <div className="mt-4 text-center bg-[#1B3A5C] text-white py-1.5 px-4 rounded shadow-sm flex items-center justify-between">
        <span className="text-xs text-slate-200">{subtitle || 'نظام إدارة الحسابات'}</span>
        <h2 className="text-base font-bold text-[#dfb758] tracking-wide">{title}</h2>
        <span className="text-xs text-slate-200">H2pro Systems</span>
      </div>
    </div>
  );
};
