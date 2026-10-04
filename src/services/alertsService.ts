/**
 * H2pro ERP - Intelligent Alert & Real-time Notification Engine
 * محرك التنبيهات الذكية والإشعارات الفورية للحركات الحرجية وانخفاض المخزون
 */

import { db } from '../database/db';
import { MainModuleId } from '../screens/MainMenuScreen';

export type AlertType = 'low_stock' | 'payment_due' | 'critical_movement' | 'financial_limit' | 'audit_security';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SmartAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionTarget?: {
    module: MainModuleId;
    tab?: string;
    entityId?: string;
  };
  metadata?: {
    itemCode?: string;
    itemName?: string;
    currentStock?: number;
    minStock?: number;
    shortfall?: number;
    amount?: number;
    docNumber?: string;
    customerName?: string;
    supplierName?: string;
    partyName?: string;
    dueDate?: string;
    overdueDays?: number;
  };
}

const READ_STORAGE_KEY = 'h2pro_smart_alerts_read_v1';
const DISMISSED_STORAGE_KEY = 'h2pro_smart_alerts_dismissed_v1';
const SOUND_ENABLED_KEY = 'h2pro_smart_alerts_sound_enabled';

class AlertsService {
  private alerts: SmartAlert[] = [];
  private listeners: Set<(alerts: SmartAlert[], latestNewAlert?: SmartAlert) => void> = new Set();
  private readAlertIds: Set<string> = new Set();
  private dismissedAlertIds: Set<string> = new Set();
  private knownAlertIds: Set<string> = new Set();
  private isSoundEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;
  private customEventAlerts: SmartAlert[] = [];

  constructor() {
    this.loadPersistence();
    this.refreshAlerts(false);

    // Listen to changes in the database
    db.subscribe(() => {
      this.refreshAlerts(true);
    });
  }

  private loadPersistence() {
    try {
      const readData = localStorage.getItem(READ_STORAGE_KEY);
      if (readData) {
        this.readAlertIds = new Set(JSON.parse(readData));
      }
      const dismissedData = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (dismissedData) {
        this.dismissedAlertIds = new Set(JSON.parse(dismissedData));
      }
      const soundData = localStorage.getItem(SOUND_ENABLED_KEY);
      if (soundData !== null) {
        this.isSoundEnabled = soundData === 'true';
      }
    } catch (e) {
      console.error('Error loading alerts persistence', e);
    }
  }

  private savePersistence() {
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(this.readAlertIds)));
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(this.dismissedAlertIds)));
      localStorage.setItem(SOUND_ENABLED_KEY, String(this.isSoundEnabled));
    } catch (e) {
      console.error('Error saving alerts persistence', e);
    }
  }

  public getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
    this.savePersistence();
    this.notify();
  }

  public playSound(severity: AlertSeverity = 'warning') {
    if (!this.isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (severity === 'critical') {
        // High urgency two-tone alert
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(587.33, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Soft positive chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(987.77, now + 0.08); // B5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // Audio playback restrictions fallback
    }
  }

  public refreshAlerts(isLiveUpdate: boolean = false) {
    const rawAlerts: SmartAlert[] = [];

    // 1. INVENTORY MONITORING: انخفاض مستويات المخزون تحت الحد الأدنى ونفاد المخزون
    const items = db.getItems();
    items.forEach((item) => {
      const current = Number(item.currentStock) || 0;
      const min = Number(item.minStock) || 0;

      if (current === 0) {
        const id = `alert-stock-zero-${item.id}`;
        rawAlerts.push({
          id,
          type: 'low_stock',
          severity: 'critical',
          title: `نفاد تام في المخزون (رصيد صفري)!`,
          message: `الصنف [${item.name}] (رمز: ${item.code}) نفد رصيده بالكامل من المستودع! حد الأمان الأدنى المطلوب: ${min} ${item.unit}.`,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'inventory', tab: 'items', entityId: item.id },
          metadata: {
            itemCode: item.code,
            itemName: item.name,
            currentStock: 0,
            minStock: min,
            shortfall: min,
          },
        });
      } else if (current <= min) {
        const shortfall = min - current;
        const id = `alert-stock-low-${item.id}`;
        const isVeryLow = current <= Math.max(1, Math.floor(min / 2));
        rawAlerts.push({
          id,
          type: 'low_stock',
          severity: isVeryLow ? 'critical' : 'warning',
          title: `انخفاض المخزون تحت الحد الأدنى`,
          message: `الرصيد المتاح للصنف [${item.name}] هو ${current} ${item.unit} فقط، وهو أقل من حد الأمان المطلوب (${min} ${item.unit}). يرجى إصدار أمر شراء لعجز قدره ${shortfall} ${item.unit}.`,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'inventory', tab: 'items', entityId: item.id },
          metadata: {
            itemCode: item.code,
            itemName: item.name,
            currentStock: current,
            minStock: min,
            shortfall,
          },
        });
      }
    });

    // 2. FINANCIAL TRANSACTIONS: حركات مالية كبرى وحرجية
    // A) Large Sales Invoices
    const salesInvoices = db.getSalesInvoices();
    salesInvoices.slice(0, 5).forEach((inv) => {
      if (inv.grandTotal >= 15000) {
        const id = `alert-sales-high-${inv.id}`;
        rawAlerts.push({
          id,
          type: 'critical_movement',
          severity: inv.grandTotal >= 35000 ? 'critical' : 'warning',
          title: `حركة مبيعات كبرى معتمدة`,
          message: `فاتورة مبيعات رقم [${inv.invoiceNumber}] بقيمة ${inv.grandTotal.toLocaleString()} ر.س لصالح العميل [${inv.customerName}]. السداد: ${inv.paymentStatus === 'paid' ? 'نقدي/فوري' : 'آجل على الحساب'}.`,
          timestamp: inv.date,
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'sales', tab: 'invoices', entityId: inv.id },
          metadata: {
            docNumber: inv.invoiceNumber,
            amount: inv.grandTotal,
            customerName: inv.customerName,
          },
        });
      }
    });

    // B) Large Purchase Invoices
    const purchaseInvoices = db.getPurchaseInvoices();
    purchaseInvoices.slice(0, 5).forEach((inv) => {
      if (inv.grandTotal >= 20000) {
        const id = `alert-purch-high-${inv.id}`;
        rawAlerts.push({
          id,
          type: 'critical_movement',
          severity: 'warning',
          title: `حركة مشتريات ذات قيمة مرتفعة`,
          message: `تم اعتماد فاتورة مشتريات رقم [${inv.invoiceNumber}] بقيمة ${inv.grandTotal.toLocaleString()} ر.س من المورد [${inv.supplierName}].`,
          timestamp: inv.date,
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'purchases', tab: 'invoices', entityId: inv.id },
          metadata: {
            docNumber: inv.invoiceNumber,
            amount: inv.grandTotal,
            partyName: inv.supplierName,
          },
        });
      }
    });

    // C) Large Cash Payment Vouchers (سندات صرف)
    const vouchers = db.getVouchers();
    vouchers.slice(0, 5).forEach((vch) => {
      if (vch.type === 'payment' && vch.amount >= 15000) {
        const id = `alert-vch-high-${vch.id}`;
        rawAlerts.push({
          id,
          type: 'critical_movement',
          severity: 'critical',
          title: `سند صرف مالي عالي القيمة`,
          message: `إصدار سند صرف رقم [${vch.voucherNumber}] بمبلغ ${vch.amount.toLocaleString()} ر.س لصالح [${vch.partyName}]. طريقة الدفع: ${vch.paymentMethod === 'bank' ? 'حوالة بنكية' : 'نقداً'}.`,
          timestamp: vch.date,
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'general_ledger', tab: 'vouchers', entityId: vch.id },
          metadata: {
            docNumber: vch.voucherNumber,
            amount: vch.amount,
            partyName: vch.partyName,
          },
        });
      }
    });

    // D) Large Journal Entries (قيود تسوية كبرى)
    const journalEntries = db.getJournalEntries();
    journalEntries.slice(0, 5).forEach((je) => {
      if (je.debitTotal >= 50000) {
        const id = `alert-je-high-${je.id}`;
        rawAlerts.push({
          id,
          type: 'critical_movement',
          severity: 'info',
          title: `قيد تسوية ومحاسبة بقيمة كبرى`,
          message: `قيد اليومية رقم [${je.entryNumber}] بإجمالي ${je.debitTotal.toLocaleString()} ر.س - البيان: ${je.description}.`,
          timestamp: je.date,
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'general_ledger', tab: 'journal', entityId: je.id },
          metadata: {
            docNumber: je.entryNumber,
            amount: je.debitTotal,
          },
        });
      }
    });

    // 3. PAYMENT DUES & OVERDUE RECEIVABLES / PAYABLES (استحقاقات الدفع والتحصيل)
    const today = new Date();

    // A) Credit Sales Invoices Due for Collection (فواتير مبيعات آجلة مستحقة التحصيل)
    salesInvoices.forEach((inv) => {
      if (inv.paymentStatus === 'credit' || inv.paymentStatus === 'partial') {
        const invDate = new Date(inv.date);
        const validDate = !isNaN(invDate.getTime());
        const diffDays = validDate ? Math.max(1, Math.floor((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24))) : 15;
        const isOverdue = diffDays >= 20;

        const id = `alert-due-sales-${inv.id}`;
        rawAlerts.push({
          id,
          type: 'payment_due',
          severity: isOverdue ? 'critical' : 'warning',
          title: isOverdue ? `استحقاق سداد متأخر (فاتورة مبيعات)` : `موعد استحقاق تحصيل فاتورة مبيعات`,
          message: `فاتورة مبيعات رقم [${inv.invoiceNumber}] للعميل [${inv.customerName}] بقيمة ${inv.grandTotal.toLocaleString()} ر.س مستحقة التحصيل (مضى عليها ${diffDays} يوماً). يرجى تحرير سند قبض.`,
          timestamp: inv.date,
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'sales', tab: 'invoices', entityId: inv.id },
          metadata: {
            docNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            amount: inv.grandTotal,
            overdueDays: diffDays,
          },
        });
      }
    });

    // B) Credit Purchase Invoices Due for Payment (فواتير مشتريات مستحقة السداد للموردين)
    purchaseInvoices.forEach((inv) => {
      if (inv.paymentStatus === 'credit' || inv.paymentStatus === 'partial') {
        const invDate = new Date(inv.date);
        const validDate = !isNaN(invDate.getTime());
        const diffDays = validDate ? Math.max(1, Math.floor((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24))) : 12;
        const isOverdue = diffDays >= 25;

        const id = `alert-due-purch-${inv.id}`;
        rawAlerts.push({
          id,
          type: 'payment_due',
          severity: isOverdue ? 'critical' : 'warning',
          title: isOverdue ? `استحقاق سداد متأخر لمورد` : `موعد استحقاق سداد فاتورة مشتريات`,
          message: `فاتورة مشتريات رقم [${inv.invoiceNumber}] من المورد [${inv.supplierName}] بقيمة ${inv.grandTotal.toLocaleString()} ر.س مستحقة السداد (مضى عليها ${diffDays} يوماً). يرجى إصدار سند صرف.`,
          timestamp: inv.date,
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'purchases', tab: 'invoices', entityId: inv.id },
          metadata: {
            docNumber: inv.invoiceNumber,
            supplierName: inv.supplierName,
            amount: inv.grandTotal,
            overdueDays: diffDays,
          },
        });
      }
    });

    // C) Suppliers with Outstanding Credit Balances (أرصدة موردين مستحقة الدفع)
    const suppliers = db.getSuppliers();
    suppliers.forEach((sup) => {
      const balance = Number(sup.currentBalance) || 0;
      if (balance >= 10000) {
        const id = `alert-sup-balance-${sup.id}`;
        rawAlerts.push({
          id,
          type: 'payment_due',
          severity: balance >= 25000 ? 'critical' : 'warning',
          title: `رصيد دائن مستحق السداد للمورد`,
          message: `المورد [${sup.name}] له رصيد مستحق بقيمة ${balance.toLocaleString()} ر.س. يُنصح بجدولة الدفعات لتفادي إيقاف التوريد.`,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'purchases', tab: 'suppliers', entityId: sup.id },
          metadata: {
            supplierName: sup.name,
            amount: balance,
          },
        });
      }
    });

    // 4. CREDIT LIMIT MONITORING: تجاوز السقف الائتماني للعملاء
    const customers = db.getCustomers();
    customers.forEach((cust) => {
      const balance = Number(cust.currentBalance) || 0;
      const limit = Number(cust.creditLimit) || 0;
      if (limit > 0 && balance >= limit) {
        const id = `alert-credit-over-${cust.id}`;
        rawAlerts.push({
          id,
          type: 'financial_limit',
          severity: 'critical',
          title: `تجاوز السقف الائتماني للعميل!`,
          message: `العميل [${cust.name}] تجاوز الحد الائتماني المسموح به (${limit.toLocaleString()} ر.س). الرصيد المستحق حالياً: ${balance.toLocaleString()} ر.س. يُنصح بإيقاف البيع الآجل له.`,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'sales', tab: 'customers', entityId: cust.id },
          metadata: {
            customerName: cust.name,
            amount: balance,
          },
        });
      } else if (limit > 0 && balance >= limit * 0.9) {
        const id = `alert-credit-near-${cust.id}`;
        rawAlerts.push({
          id,
          type: 'financial_limit',
          severity: 'warning',
          title: `اقتراب رصيد العميل من سقف الائتمان`,
          message: `العميل [${cust.name}] استهلك أكثر من 90% من السقف الائتماني المعتمد (${balance.toLocaleString()} من أصل ${limit.toLocaleString()} ر.س).`,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'sales', tab: 'customers', entityId: cust.id },
          metadata: {
            customerName: cust.name,
            amount: balance,
          },
        });
      }
    });

    // 4. AUDIT & SYSTEM ACTIONS: حركات تدقيق أمنية حرجة
    const auditLogs = db.getAuditLogs();
    auditLogs.slice(0, 8).forEach((log) => {
      if (log.action === 'delete' || log.module === 'بيانات المستخدمين' || log.details.includes('حذف')) {
        const id = `alert-audit-${log.id}`;
        rawAlerts.push({
          id,
          type: 'audit_security',
          severity: 'critical',
          title: `عملية أمنية حرجة في النظام`,
          message: `قام المستخدم [${log.username}] بـ (${log.details}) في قسم [${log.module}].`,
          timestamp: log.timestamp.split(' ')[1] || log.timestamp,
          isRead: this.readAlertIds.has(id),
          actionTarget: { module: 'auxiliary_reports', tab: 'audit_log' },
          metadata: {
            docNumber: log.recordId,
          },
        });
      }
    });

    // 5. Append Custom/Simulated/Event alerts
    this.customEventAlerts.forEach((customAlert) => {
      rawAlerts.unshift(customAlert);
    });

    // Filter out dismissed alerts
    const activeAlerts = rawAlerts.filter((a) => !this.dismissedAlertIds.has(a.id));

    // Detect if there are brand new alerts during live updates
    let newlyFoundAlert: SmartAlert | undefined;
    if (isLiveUpdate) {
      for (const alert of activeAlerts) {
        if (!this.knownAlertIds.has(alert.id)) {
          newlyFoundAlert = alert;
          break;
        }
      }
    }

    // Cache known IDs
    activeAlerts.forEach((a) => this.knownAlertIds.add(a.id));

    // Sort by severity (critical first, then warning, then info)
    const severityWeight: Record<AlertSeverity, number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };
    activeAlerts.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return severityWeight[b.severity] - severityWeight[a.severity];
    });

    this.alerts = activeAlerts;

    if (newlyFoundAlert && isLiveUpdate) {
      this.playSound(newlyFoundAlert.severity);
    }

    this.notify(newlyFoundAlert);
  }

  public getAlerts(): SmartAlert[] {
    return this.alerts;
  }

  public getUnreadCount(): number {
    return this.alerts.filter((a) => !a.isRead).length;
  }

  public getCriticalCount(): number {
    return this.alerts.filter((a) => !a.isRead && a.severity === 'critical').length;
  }

  public markAsRead(id: string) {
    this.readAlertIds.add(id);
    this.alerts = this.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a));
    this.savePersistence();
    this.notify();
  }

  public markAllAsRead() {
    this.alerts.forEach((a) => this.readAlertIds.add(a.id));
    this.alerts = this.alerts.map((a) => ({ ...a, isRead: true }));
    this.savePersistence();
    this.notify();
  }

  public dismissAlert(id: string) {
    this.dismissedAlertIds.add(id);
    this.alerts = this.alerts.filter((a) => a.id !== id);
    this.savePersistence();
    this.notify();
  }

  public clearReadAlerts() {
    this.alerts.forEach((a) => {
      if (a.isRead) {
        this.dismissedAlertIds.add(a.id);
      }
    });
    this.alerts = this.alerts.filter((a) => !a.isRead);
    this.savePersistence();
    this.notify();
  }

  public emitCustomAlert(alert: Omit<SmartAlert, 'id' | 'timestamp' | 'isRead'>) {
    const id = `custom-alert-${Date.now()}`;
    const newAlert: SmartAlert = {
      ...alert,
      id,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };
    this.customEventAlerts.unshift(newAlert);
    this.knownAlertIds.add(id);
    this.refreshAlerts(true);
    this.playSound(newAlert.severity);
  }

  public simulateInstantAlert(variant: 'stock' | 'sales' | 'credit') {
    if (variant === 'stock') {
      this.emitCustomAlert({
        type: 'low_stock',
        severity: 'critical',
        title: 'تنبيه فوري: هبوط مخزون حرج!',
        message: 'تم سحب كمية مفاجئة من صنف [شاشة سامسونج 27 بوصة IPS 4K]، الرصيد المتبقي قطعة واحدة فقط (الحد الأدنى 8 قطع).',
        actionTarget: { module: 'inventory', tab: 'items' },
        metadata: {
          itemCode: 'ITM-002',
          currentStock: 1,
          minStock: 8,
          shortfall: 7,
        },
      });
    } else if (variant === 'sales') {
      this.emitCustomAlert({
        type: 'critical_movement',
        severity: 'critical',
        title: 'إشعار فوري: صفقة مبيعات كبرى بقيمة 64,500 ر.س',
        message: 'تم إصدار فاتورة مبيعات رقم [SINV-2026-VIP] بقيمة 64,500 ر.س للعميل [شركة مسار المستقبل للاستشارات].',
        actionTarget: { module: 'sales', tab: 'invoices' },
        metadata: {
          docNumber: 'SINV-2026-VIP',
          amount: 64500,
        },
      });
    } else {
      this.emitCustomAlert({
        type: 'financial_limit',
        severity: 'critical',
        title: 'إشعار أمان: تجاوز فوري للسقف الائتماني',
        message: 'تجاوز العميل [مجموعة الرؤية الطبية الحديثة] السقف الائتماني (75,000 ر.س) بعد العملية الأخيرة.',
        actionTarget: { module: 'sales', tab: 'customers' },
        metadata: {
          amount: 82000,
        },
      });
    }
  }

  public subscribe(listener: (alerts: SmartAlert[], latestNewAlert?: SmartAlert) => void): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.alerts);
    return () => this.listeners.delete(listener);
  }

  private notify(latestNewAlert?: SmartAlert) {
    this.listeners.forEach((l) => l(this.alerts, latestNewAlert));
  }
}

export const alertsService = new AlertsService();
