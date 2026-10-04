/**
 * 2. إدارة النظام (System Administration Screen)
 * يشمل: بيانات المستخدمين، صلاحيات الشاشات والعمليات، تغيير كلمة السر
 */

import React, { useState } from 'react';
import { User, UserRole, CompanyInfo } from '../types';
import { db } from '../database/db';
import { DataGrid, Column } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { PrintHeader } from '../components/PrintHeader';
import { ERPActionBar } from '../components/ERPActionBar';
import {
  Users,
  ShieldCheck,
  Key,
  ArrowRight,
  UserPlus,
  Lock,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

interface SystemAdminScreenProps {
  currentUser: User;
  onBack: () => void;
  onUserUpdated: (user: User) => void;
  defaultTab?: TabType;
}

type TabType = 'users' | 'permissions' | 'change_password';

export const SystemAdminScreen: React.FC<SystemAdminScreenProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  defaultTab = 'users',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [company] = useState<CompanyInfo>(() => db.getCompanyInfo());

  // User Add/Edit Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    role: 'accountant',
    status: 'active',
  });
  const [userFormError, setUserFormError] = useState<string | null>(null);

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ isSuccess: boolean; text: string } | null>(null);

  // Print Preview
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const reloadUsers = () => {
    setUsers(db.getUsers());
  };

  // --- User Handlers ---
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormError(null);
    setUserForm({
      name: '',
      username: '',
      password: '',
      role: 'accountant',
      status: 'active',
    });
    setUserModalOpen(true);
  };

  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setUserFormError(null);
    setUserForm({ ...u, password: '' });
    setUserModalOpen(true);
  };

  const handleDeleteUser = (u: User) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم ${u.name} (${u.username})؟`)) {
      const res = db.deleteUser(u.id, currentUser.username);
      if (!res.success) {
        alert(res.message);
      } else {
        reloadUsers();
      }
    }
  };

  const handleSaveUser = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUserFormError(null);

    if (!editingUser && !userForm.password) {
      setUserFormError('كلمة المرور مطلوبة لإنشاء مستخدم جديد.');
      return;
    }

    const item: User = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      name: userForm.name || '',
      username: userForm.username || '',
      password: userForm.password ? userForm.password : (editingUser?.password || '1234'),
      role: userForm.role || 'data_entry',
      status: userForm.status || 'active',
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    db.saveUser(item, currentUser.username);
    reloadUsers();
    setUserModalOpen(false);

    if (currentUser.id === item.id) {
      onUserUpdated(item);
    }
  };

  // --- Change Password Handler ---
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ isSuccess: false, text: 'كلمة السر الجديدة وتأكيدها غير متطابقين.' });
      return;
    }

    if (newPassword.length < 3) {
      setPasswordFeedback({ isSuccess: false, text: 'يجب أن لا تقل كلمة السر عن 3 أحرف أو أرقام.' });
      return;
    }

    const res = db.changePassword(currentUser.username, oldPassword, newPassword);
    setPasswordFeedback({ isSuccess: res.success, text: res.message });
    if (res.success) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const updatedUser = db.getUsers().find((u) => u.username === currentUser.username);
      if (updatedUser) onUserUpdated(updatedUser);
    }
  };

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">مدير عام للنظام</span>;
      case 'accountant':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-100 text-blue-900 border border-blue-300">محاسب مالي</span>;
      case 'data_entry':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-slate-100 text-slate-800 border border-slate-300">مدخل بيانات</span>;
    }
  };

  const userColumns: Column<User>[] = [
    { key: 'name', header: 'الاسم الكامل', render: (u) => <span className="font-bold text-[#1B3A5C]">{u.name}</span> },
    { key: 'username', header: 'اسم الدخول', width: '130px', render: (u) => <span className="font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded">{u.username}</span> },
    { key: 'role', header: 'الدور الوظيفي', width: '150px', render: (u) => roleBadge(u.role) },
    {
      key: 'status',
      header: 'الحالة',
      width: '100px',
      render: (u) =>
        u.status === 'active' ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">نشط</span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">معطل</span>
        ),
    },
    { key: 'createdAt', header: 'تاريخ الإنشاء', width: '150px', render: (u) => <span className="font-mono text-slate-500 text-[11px]">{u.createdAt}</span> },
  ];

  // Screen permission matrix simulation
  const modulesList = [
    { id: 'm1', name: '1. تهيئة النظام (السنوات، الشركة، العملات)', admin: 'كامل (عرض/إضافة/تعديل/حذف)', accountant: 'عرض فقط', dataEntry: 'محجوب' },
    { id: 'm2', name: '2. إدارة النظام (المستخدمين والصلاحيات)', admin: 'كامل (عرض/إضافة/تعديل/حذف)', accountant: 'محجوب', dataEntry: 'محجوب' },
    { id: 'm3', name: '3. إدارة الأستاذ العام (الشجرة، القيود، السندات)', admin: 'كامل (عرض/إضافة/تعديل/حذف/طباعة)', accountant: 'كامل (عرض/إضافة/تعديل/طباعة)', dataEntry: 'محجوب' },
    { id: 'm4', name: '4. إدارة المخزون (الأصناف، الحركات، الجرد)', admin: 'كامل', accountant: 'عرض وتقارير', dataEntry: 'إدخال حركات فقط' },
    { id: 'm5', name: '5. إدارة المشتريات (الموردين، الفواتير)', admin: 'كامل', accountant: 'كامل', dataEntry: 'إدخال فواتير' },
    { id: 'm6', name: '6. إدارة المبيعات (العملاء، فواتير المبيعات)', admin: 'كامل', accountant: 'كامل', dataEntry: 'إدخال فواتير' },
    { id: 'm7', name: '7. أنظمة وتقارير مساعدة (النسخ، السجل)', admin: 'كامل (نسخ، استعادة، سجل كامل)', accountant: 'تقارير عامة', dataEntry: 'عرض التقارير المصرحة' },
  ];

  return (
    <div className="flex-1 flex flex-col p-2.5 overflow-hidden">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between mb-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded hover:bg-slate-100 text-[#1B3A5C] border border-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <ArrowRight className="w-4 h-4 text-[#c49a37]" />
            <span>الشاشة الرئيسية</span>
          </button>
          <span className="text-slate-400">/</span>
          <h1 className="text-base font-bold text-[#1B3A5C]">2. إدارة النظام وحسابات المستخدمين</h1>
        </div>

        {/* 3 Tabs Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>بيانات المستخدمين</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'permissions'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>مصفوفة الصلاحيات</span>
          </button>

          <button
            onClick={() => setActiveTab('change_password')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'change_password'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-[#dfb758]" />
            <span>تغيير كلمة السر</span>
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-hidden">
        {/* TAB 1: Users List */}
        {activeTab === 'users' && (
          <DataGrid
            title="سجل مستخدمي نظام H2pro"
            subtitle="إدارة حسابات الدخول، الأدوار الأمنية، وتعيين الصلاحيات"
            data={users}
            columns={userColumns}
            onAdd={handleOpenAddUser}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onPrint={() => setIsPrintModalOpen(true)}
            addLabel="إضافة مستخدم جديد"
          />
        )}

        {/* TAB 2: Permissions Matrix */}
        {activeTab === 'permissions' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full overflow-y-auto p-6 max-w-5xl mx-auto">
            <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1B3A5C] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#c49a37]" />
                  <span>جدول مصفوفة الصلاحيات للأدوار الأمنية</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  يحدد لكل دور وظيفي إمكانية الدخول للشاشات وتنفيذ عمليات الإضافة والتعديل والحذف والطباعة.
                </p>
              </div>
              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded font-semibold">
                صلاحيات أمنية مشددة (RBAC)
              </span>
            </div>

            <table className="w-full text-xs text-right border-collapse border border-slate-300">
              <thead className="bg-[#1B3A5C] text-white">
                <tr>
                  <th className="p-2.5 border border-slate-700 w-1/3">الشاشة / النظام الفرعي</th>
                  <th className="p-2.5 border border-slate-700 text-center bg-[#122840]">المدير العام (Admin)</th>
                  <th className="p-2.5 border border-slate-700 text-center">المحاسب (Accountant)</th>
                  <th className="p-2.5 border border-slate-700 text-center">مدخل البيانات (Data Entry)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {modulesList.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 border border-slate-300 font-bold text-[#1B3A5C]">
                      {m.name}
                    </td>
                    <td className="p-3 border border-slate-300 text-center font-semibold text-emerald-700 bg-emerald-50/50">
                      {m.admin}
                    </td>
                    <td className="p-3 border border-slate-300 text-center text-blue-800 font-medium">
                      {m.accountant}
                    </td>
                    <td className="p-3 border border-slate-300 text-center text-slate-600">
                      {m.dataEntry}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 p-4 rounded bg-slate-50 border border-slate-300 text-xs text-slate-600 leading-relaxed">
              <div className="font-bold text-[#1B3A5C] mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#c49a37]" />
                <span>ملاحظة الحماية والأمان المحاسبي:</span>
              </div>
              يقوم نظام H2pro بمنع مدخلي البيانات والمحاسبين غير المخولين من فتح شاشات التهيئة أو حذف السجلات المعتمدة، كما يتم تسجيل هوية أي مستخدم يقوم بإجراء تعديل في سجل العمليات العام (Audit Log) فوراً.
            </div>
          </div>
        )}

        {/* TAB 3: Change Password */}
        {activeTab === 'change_password' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm h-full overflow-y-auto p-6 max-w-md mx-auto">
            <div className="border-b border-slate-200 pb-3 mb-5">
              <h2 className="text-base font-bold text-[#1B3A5C] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#c49a37]" />
                <span>تغيير كلمة المرور للمستخدم الحالي</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                أنت مسجل الدخول حالياً بحساب: <strong className="text-[#1B3A5C]">{currentUser.name} ({currentUser.username})</strong>
              </p>
            </div>

            {passwordFeedback && (
              <div
                className={`mb-4 p-3 rounded text-xs flex items-center gap-2 border ${
                  passwordFeedback.isSuccess
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {passwordFeedback.isSuccess ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الحالية:</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور للتأكيد"
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#1B3A5C] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#1B3A5C] hover:bg-[#122840] text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-[#dfb758]" />
                  <span>تحديث كلمة المرور الآن</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* --- Modal: Add/Edit User --- */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? `تعديل بيانات المستخدم ${editingUser.name}` : 'إضافة مستخدم جديد للنظام'}
        subtitle="تعيين بيانات الدخول والدور الوظيفي والحالة"
      >
        {/* Unified 7-Button Toolbar inside User Modal */}
        <ERPActionBar
          mode={editingUser ? 'edit' : 'add'}
          docTitle="بطاقة المستخدم"
          onAdd={() => handleOpenAddUser()}
          onEdit={() => {}}
          onDelete={() => {
            if (editingUser) {
              handleDeleteUser(editingUser);
              setUserModalOpen(false);
            }
          }}
          canDelete={!!editingUser && editingUser.username !== 'admin'}
          onSave={() => handleSaveUser()}
          onCancel={() => setUserModalOpen(false)}
          onPrint={() => setIsPrintModalOpen(true)}
          className="mb-3"
        />

        <form onSubmit={handleSaveUser} className="space-y-3">
          {userFormError && (
            <div className="p-2 bg-red-50 border border-red-300 text-red-700 rounded text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{userFormError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للمستخدم:</label>
            <input
              type="text"
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              placeholder="مثال: محمد عبد الله السعيد"
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم الدخول (Username بالإنجليزية):</label>
            <input
              type="text"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              placeholder="مثال: mohammed"
              required
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              كلمة المرور {editingUser && '(اتركها فارغة للإبقاء على الحالية)'}:
            </label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              placeholder={editingUser ? '••••••••' : 'أدخل كلمة المرور'}
              className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الدور الوظيفي:</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                <option value="admin">مدير عام للنظام (Admin)</option>
                <option value="accountant">محاسب مالي (Accountant)</option>
                <option value="data_entry">مدخل بيانات (Data Entry)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حالة الحساب:</label>
              <select
                value={userForm.status}
                onChange={(e) => setUserForm({ ...userForm, status: e.target.value as any })}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded"
              >
                <option value="active">نشط (Active)</option>
                <option value="inactive">معطل (Inactive)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              حفظ بيانات المستخدم
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Print Users List Modal --- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="طباعة كشف مستخدمي النظام"
        width="4xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 rounded font-bold"
            >
              إغلاق
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 text-xs bg-[#1B3A5C] text-white hover:bg-[#122840] rounded font-bold"
            >
              طباعة الكشف الآن
            </button>
          </div>
        }
      >
        <div className="printable-area bg-white p-4">
          <PrintHeader company={company} title="كشف المستخدمين والصلاحيات المعتمدة للنظام" />
          <table className="w-full text-xs text-right border-collapse border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2">#</th>
                <th className="border p-2">الاسم الكامل</th>
                <th className="border p-2">اسم الدخول</th>
                <th className="border p-2">الدور الوظيفي</th>
                <th className="border p-2">الحالة</th>
                <th className="border p-2">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td className="border p-2 font-mono">{i + 1}</td>
                  <td className="border p-2 font-bold">{u.name}</td>
                  <td className="border p-2 font-mono">{u.username}</td>
                  <td className="border p-2">{u.role === 'admin' ? 'مدير عام' : u.role === 'accountant' ? 'محاسب' : 'مدخل بيانات'}</td>
                  <td className="border p-2">{u.status === 'active' ? 'نشط' : 'معطل'}</td>
                  <td className="border p-2 font-mono">{u.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};
