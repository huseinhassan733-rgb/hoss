import React, { useState } from 'react';
import { db } from '../database/db';
import { User } from '../types';
import { ShieldCheck, UserPlus, AlertCircle } from 'lucide-react';

interface FirstRunSetupProps {
  onComplete: (user: User) => void;
}

export const FirstRunSetup: React.FC<FirstRunSetupProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('كلمة المرور يجب أن تحتوي على 8 أحرف/أرقام على الأقل.');
    if (password !== confirm) return setError('تأكيد كلمة المرور غير مطابق.');
    setBusy(true);
    try {
      const result = await db.createFirstAdmin(name, username, password);
      if (!result.success) setError(result.message);
      else if (result.user) onComplete(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء المدير الأول.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1420]/90">
    <form onSubmit={submit} className="w-full max-w-[440px] bg-white rounded-lg border-2 border-[#1B3A5C] shadow-2xl p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-3 border-b pb-3">
        <div className="w-11 h-11 rounded-lg bg-[#122840] flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[#dfb758]" /></div>
        <div><h1 className="text-lg font-bold text-[#1B3A5C]">تهيئة H2برو لأول تشغيل</h1><p className="text-xs text-slate-500">أنشئ حساب المدير الأول. لن تُخزّن كلمة المرور كنص صريح.</p></div>
      </div>
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      <input required value={name} onChange={e=>setName(e.target.value)} placeholder="اسم المدير" className="w-full p-2.5 border rounded text-sm" />
      <input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="اسم المستخدم" autoComplete="username" className="w-full p-2.5 border rounded text-sm" />
      <input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور (8 أحرف على الأقل)" autoComplete="new-password" className="w-full p-2.5 border rounded text-sm" />
      <input required minLength={8} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="تأكيد كلمة المرور" autoComplete="new-password" className="w-full p-2.5 border rounded text-sm" />
      <button disabled={busy} className="w-full py-2.5 bg-[#1B3A5C] text-white rounded font-bold flex items-center justify-center gap-2">{busy ? 'جاري التهيئة...' : <><UserPlus className="w-4 h-4" />إنشاء المدير الأول</>}</button>
    </form>
  </div>;
};
