/**
 * H2pro ERP - Period Closure Service
 * خدمة إدارة الإقفال المحاسبي والتحقق من الفترات المالية والمستندات غير المرحلة
 */

import { db } from '../database/db';

export interface UnpostedCheckResult {
  isReady: boolean;
  unpostedJournals: string[];
  unpostedVouchers: string[];
  unpostedSales: string[];
  unpostedPurchases: string[];
  totalUnpostedCount: number;
}

export class PeriodClosureService {
  /**
   * Check if a specific date falls within a closed monthly or annual period.
   */
  public static isDateInClosedPeriod(dateStr: string): { isClosed: boolean; reason?: string } {
    if (!dateStr) return { isClosed: false };
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { isClosed: false };

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthlyKey = `${year}-${month}`;

    const closedYears = db.getClosedYears();
    if (closedYears.includes(year)) {
      return { isClosed: true, reason: `السنة المالية ${year} مقفلة بالكامل.` };
    }

    const closedMonths = db.getClosedMonths();
    if (closedMonths.includes(monthlyKey)) {
      return { isClosed: true, reason: `الشهر المحاسبي ${monthlyKey} مقفل رسمياً.` };
    }

    return { isClosed: false };
  }

  /**
   * Validate whether a monthly or annual period has any unposted/draft documents.
   */
  public static validatePeriodClosure(periodKey: string, isAnnual: boolean = false): UnpostedCheckResult {
    const unpostedJournals: string[] = [];
    const unpostedVouchers: string[] = [];
    const unpostedSales: string[] = [];
    const unpostedPurchases: string[] = [];

    const state = (db as any).state || {};
    const journals = state.journalEntries || [];
    const vouchers = state.vouchers || [];
    const sales = state.salesInvoices || [];
    const purchases = state.purchaseInvoices || [];

    const matchesPeriod = (dateField: string) => {
      if (!dateField) return false;
      if (isAnnual) {
        return dateField.startsWith(periodKey); // e.g. "2026"
      } else {
        return dateField.startsWith(periodKey); // e.g. "2026-05"
      }
    };

    // 1. Check Journal Entries (unposted or status === 'draft')
    journals.forEach((j: any) => {
      if (matchesPeriod(j.date)) {
        if (j.status === 'draft' || j.status === 'unposted' || !j.isPosted) {
          unpostedJournals.push(j.referenceNumber || j.id);
        }
      }
    });

    // 2. Check Vouchers
    vouchers.forEach((v: any) => {
      if (matchesPeriod(v.date)) {
        if (v.status === 'draft' || v.status === 'unposted' || !v.isPosted) {
          unpostedVouchers.push(v.voucherNumber || v.id);
        }
      }
    });

    // 3. Check Sales Invoices
    sales.forEach((s: any) => {
      if (matchesPeriod(s.date)) {
        if (s.status === 'draft' || !s.isPosted) {
          unpostedSales.push(s.invoiceNumber || s.id);
        }
      }
    });

    // 4. Check Purchase Invoices
    purchases.forEach((p: any) => {
      if (matchesPeriod(p.date)) {
        if (p.status === 'draft' || !p.isPosted) {
          unpostedPurchases.push(p.invoiceNumber || p.id);
        }
      }
    });

    const totalUnpostedCount =
      unpostedJournals.length +
      unpostedVouchers.length +
      unpostedSales.length +
      unpostedPurchases.length;

    return {
      isReady: totalUnpostedCount === 0,
      unpostedJournals,
      unpostedVouchers,
      unpostedSales,
      unpostedPurchases,
      totalUnpostedCount,
    };
  }
}
