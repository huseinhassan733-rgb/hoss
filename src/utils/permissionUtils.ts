/**
 * Permission Utilities for H2pro ERP
 * التحقق من صلاحيات المستخدمين للشاشات والعمليات الحساسة
 */

import { User } from '../types';

export type ERPAction = 'view' | 'add' | 'edit' | 'delete' | 'print' | 'cancel' | 'reverse';

export function hasPermission(
  user: User | null | undefined,
  screenId: string,
  action: ERPAction = 'view'
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  // Check custom permissions matrix if set
  if (user.permissions && user.permissions[screenId]) {
    const p = user.permissions[screenId];
    if (action === 'view') return p.canView;
    if (action === 'add') return p.canAdd;
    if (action === 'edit') return p.canEdit;
    if (action === 'delete') return p.canDelete;
    if (action === 'print') return p.canPrint;
    if (action === 'cancel' || action === 'reverse') return p.canDelete; // Cancellation requires delete/reversal permission
  }

  // Role based defaults
  if (user.role === 'accountant') {
    // Accountant has full accounting permissions except deleting system masters
    if (screenId === 'system_admin') return false;
    return true;
  }

  if (user.role === 'data_entry') {
    // Data entry can view, add, and print, but cannot delete or cancel/reverse documents
    if (action === 'view' || action === 'add' || action === 'print') return true;
    return false;
  }

  return false;
}
