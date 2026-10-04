/**
 * Classic Desktop Login Window
 * شاشة تسجيل الدخول المركزية الكلاسيكية للنظام
 */

import React, { useState } from 'react';
import { FinancialYear, User } from '../types';
import { db } from '../database/db';
import { Lock, UserCheck, Calendar, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  financialYears: FinancialYear[];
  onLoginSuccess: (user: User, year: FinancialYear) => void;
  onCancel?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  financialYears,
  onLoginSuccess,
  onCancel,
}) => {
  const [selectedYearId, setSelectedYearId] = useState<string>(() => {
    const openYear = financialYears.find((y) => y.status === 'open');
    return openYear ? openYear.id : financialYears[0]?.id || '';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const yearObj = financialYears.find((y) => y.id === selectedYearId);
    if (!yearObj) {
      setErrorMessage('يرجى تحديد السنة المالية للمتابعة.');
      return;
    }

    setIsLoading(true);

    // Simulate real authentication check
    setTimeout(() => {
      const result = db.authenticate(yearObj.year, username, password);
      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user, yearObj);
      } else {
        setErrorMessage(result.error || 'فشل تسجيل الدخول. تحقق من اسم المستخدم وكلمة السر.');
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1420]/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-[440px] bg-[#f8fafc] rounded-lg shadow-2xl border-2 border-[#1B3A5C] overflow-hidden flex flex-col">
        {/* Classic Window Titlebar */}
        <div className="bg-[#122840] text-slate-200 px-4 py-2 border-b border-[#1B3A5C] flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-[#c49a37] flex items-center justify-center text-[9px] font-black text-[#122840]">
              H
            </div>
            <span>H2pro Enterprise - تسجيل الدخول للنظام</span>
          </div>
          <div className="text-[10px] text-[#dfb758] font-mono">v2.5 Security</div>
        </div>

        {/* Header Branding with Gold Accent */}
        <div className="bg-[#1B3A5C] px-6 py-4 text-white border-b-2 border-[#c49a37] flex items-center gap-4">
          <div className="w-13 h-13 rounded-lg bg-[#122840] border-2 border-[#c49a37] flex items-center justify-center shadow-md">
            <Building2 className="w-7 h-7 text-[#dfb758]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#dfb758] leading-tight">
              H2pro المحاسبي
            </h1>
            <p className="text-xs text-slate-200 font-medium mt-0.5">
              نظام المحاسبة وإدارة الأعمال المتكامل
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 rounded text-red-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Financial Year Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1B3A5C]" />
              <span>السنة المالية:</span>
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
            >
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  السنة المالية {fy.year} {fy.status === 'open' ? '(مفتوحة - جارية)' : '(مغلقة)'}
                </option>
              ))}
            </select>
          </div>

          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#1B3A5C]" />
              <span>اسم المستخدم:</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم (مثلاً: admin)"
              required
              autoFocus
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] text-slate-800"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#1B3A5C]" />
              <span>كلمة المرور:</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] text-slate-800"
            />
          </div>

          {/* Action Buttons: تسجيل الدخول و إلغاء */}
          <div className="pt-2 flex flex-col gap-2.5 border-t border-slate-200">
            <div className="flex items-center gap-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded border border-slate-300 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-5 py-2.5 bg-[#1B3A5C] hover:bg-[#122840] text-white text-xs font-bold rounded border border-[#122840] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#dfb758]" />
                <span>{isLoading ? 'جاري التحقق...' : 'تسجيل الدخول للنظام'}</span>
              </button>
            </div>

            {/* Quick Demo Fill Buttons for Easy Access */}
            <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-center justify-between text-[11px]">
              <span className="text-amber-800 font-bold">دخول سريع:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('admin');
                  }}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold transition-colors cursor-pointer text-[10px]"
                >
                  مدير عام (admin)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('accountant');
                    setPassword('123');
                  }}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded font-bold transition-colors cursor-pointer text-[10px]"
                >
                  محاسب (accountant)
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Note */}
        <div className="bg-slate-200 px-4 py-2 text-[10px] text-slate-500 text-center border-t border-slate-300 font-mono">
          SQLite Local Storage · AppData Encrypted · H2pro v2.5.0
        </div>
      </div>
    </div>
  );
};
