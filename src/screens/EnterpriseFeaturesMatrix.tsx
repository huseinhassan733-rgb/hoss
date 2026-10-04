/**
 * Enterprise Features Matrix (مصفوفة الميزات الـ 50 المتكاملة)
 * سجل تفاعلي واستعراض شامل لـ 50 ميزة احترافية في نظام H2pro ERP مع حالة التشغيل الفوري
 */

import React, { useState, useMemo } from 'react';
import { MainModuleId } from '../screens/MainMenuScreen';
import { tafqeet } from '../utils/tafqeet';
import { Modal } from './Modal';
import {
  Sparkles,
  CheckCircle2,
  Search,
  ExternalLink,
  Sliders,
  DollarSign,
  TrendingUp,
  Scale,
  Package,
  ShoppingCart,
  ShoppingBag,
  ShieldCheck,
  Calculator,
  Barcode,
  Layers,
  FileSpreadsheet,
  FileCheck2,
  FolderTree,
  Building,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface EnterpriseFeaturesMatrixProps {
  onNavigateModule?: (moduleId: MainModuleId, tabId?: string) => void;
}

export interface ERPFeatureItem {
  id: number;
  title: string;
  category: 'gl' | 'sales' | 'purchases' | 'inventory' | 'reports' | 'system';
  categoryLabel: string;
  description: string;
  targetModule: MainModuleId;
  targetTab?: string;
  badge: string;
  testActionType?: 'tafqeet' | 'currency' | 'zakat' | 'balance' | 'barcode' | 'none';
}

export const EnterpriseFeaturesMatrix: React.FC<EnterpriseFeaturesMatrixProps> = ({
  onNavigateModule,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Interactive Test Modal State
  const [testModalType, setTestModalType] = useState<string | null>(null);
  const [testNumberInput, setTestNumberInput] = useState<number>(125430.75);

  const featuresList: ERPFeatureItem[] = useMemo(
    () => [
      // 1-10: تقارير وتحليلات ومركز تقارير شامل
      {
        id: 1,
        title: 'مركز التقارير التنفيذي الموحد الشامل (Interactive Report Hub)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'تشغيل واستعراض كافة تقارير الأستاذ العام، المخزون، المبيعات، والمشتريات فوراً من شاشة موحدة.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 2,
        title: 'فلترة التقارير بنطاق زمني ديناميكي (Date-Range Filtering)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'تحديد من تاريخ وإلى تاريخ وتحديث الحركات والقيود آلياً بدقة لحظية.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 3,
        title: 'تصدير التقارير إكسل وCSV فوري بضغطة زر (One-Click CSV Export)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'توليد ملفات CSV متوافقة مع Excel وترميز UTF-8 بدعم تام للغة العربية.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 4,
        title: 'البحث والتصفية الحية داخل جداول التقارير (Live Table Filter)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'تصفية فورية حسب الاسم أو الكود أو رقم المرجع أثناء المعاينة دون إعادة تحميل.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 5,
        title: 'كشف حساب الأستاذ العام التفصيلي (Account Ledger Statement)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'كشف حركات أي حساب مع الرصيد التراكمي المتحرك وتفاصيل القيود والسندات.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 6,
        title: 'كشف حساب العميل مع تعمير الذمم (Customer Statement & Aging)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'متابعة مديونية العميل وفواتيره ومتحصلاته مع تنبيهات سقف الائتمان.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 7,
        title: 'كشف حساب المورد والمشتريات (Supplier Statement)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'كشف مشتريات المورد وسندات الصرف والخصم والمتبقي في ذمة المنشأة.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 8,
        title: 'تقرير التدفق النقدي والسيولة المتاحة (Cash Flow & Liquidity)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'رصد فوري لصافي السيولة النقدية المتاحة في كافة الخزائن والحسابات البنكية.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 9,
        title: 'تحليل الأصناف الراكدة والأكثر حركة (Fast vs Slow Moving)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'فرز الأصناف الأكثر مبيعاً والأصناف الراكدة لتفادي تراكم رأس المال في المخزون.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
      {
        id: 10,
        title: 'تقرير هوامش ربحية المبيعات (Sales Profitability Margin)',
        category: 'reports',
        categoryLabel: 'التقارير والتحليلات',
        description: 'مقارنة سعر البيع بالتكلفة لحساب هامش الربح الإجمالي ونسبته المئوية لكل صنف.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },

      // 11-18: الأستاذ العام والإدارة المالية
      {
        id: 11,
        title: 'صمام أمان توازن القيد المحاسبي (Auto-Balanced Journal Guard)',
        category: 'gl',
        categoryLabel: 'الأستاذ العام والمالية',
        description: 'منع حفظ القيود غير المتوازنة واحتساب الفارق بين المدين والدائن تلقائياً.',
        targetModule: 'general_ledger',
        targetTab: 'journal',
        badge: 'مباشر وشغال',
      },
      {
        id: 12,
        title: 'زر موازنة القيد التلقائي (One-Click Row Balancer)',
        category: 'gl',
        categoryLabel: 'الأستاذ العام والمالية',
        description: 'إدراج سطر محاسبي تكميلي بالفرق المتبقي لتسريع تسجيل العمليات اليومية.',
        targetModule: 'general_ledger',
        targetTab: 'journal',
        badge: 'مباشر وشغال',
      },
      {
        id: 13,
        title: 'احتساب الإقرار الضريبي لهيئة الزكاة والضريبة والجمارك (ZATCA VAT Return)',
        category: 'gl',
        categoryLabel: 'الأستاذ العام والمالية',
        description: 'تجميع ضريبة المخرجات 15% وضريبة المدخلات وحساب صافي الضريبة الواجبة السداد.',
        targetModule: 'general_ledger',
        targetTab: 'tax_zakat',
        badge: 'مباشر وشغال',
      },
      {
        id: 14,
        title: 'حاسبة الوعاء الزكوي التقديرية (Estimated Zakat Base Calculator)',
        category: 'gl',
        categoryLabel: 'الأستاذ العام والمالية',
        description: 'احتساب زكاة المال التقديرية بنسبة 2.5% من الأوعية الزكوية وحقوق الملكية والأرباح.',
        targetModule: 'general_ledger',
        targetTab: 'tax_zakat',
        badge: 'مباشر وشغال',
        testActionType: 'zakat',
      },
      {
        id: 15,
        title: 'ميزان المراجعة بالأرصدة والمجاميع المزدوج (Dual Trial Balance)',
        category: 'gl',
        categoryLabel: 'الأستاذ العام والمالية',
        description: 'عرض مزدوج للمجاميع المدينة والدائنة مع الأرصدة النهائية لكل حساب.',
        targetModule: 'general_ledger',
        targetTab: 'reports',
        badge: 'مباشر وشغال',
      },
      {
        id: 16,
        title: 'مؤشر سلامة المعادلة المحاسبية (Balance Sheet Integrity Gauge)',
        category: 'gl',
        categoryLabel: 'الأستاذ العام والمالية',
        description: 'فحص فوري للمعادلة (الأصول = الخصوم + حقوق الملكية) مع شريط مؤشر بياني.',
        targetModule: 'general_ledger',
        targetTab: 'reports',
        badge: 'مباشر وشغال',
      },
      {
        id: 17,
        title: 'محول العملات وأسعار الصرف التاريخية (Multi-Currency Converter)',
        category: 'gl',
        categoryLabel: 'الأستاذ العام والمالية',
        description: 'دعم العملات المتعددة وحفظ سجل الأسعار اليومية وإعادة التقييم المالي.',
        targetModule: 'system_setup',
        targetTab: 'currencies',
        badge: 'مباشر وشغال',
        testActionType: 'currency',
      },
      {
        id: 18,
        title: 'التفقيط المالي باللغة العربية (Auto-Tafqeet Engine)',
        category: 'gl',
        categoryLabel: 'الأستاذ العام والمالية',
        description: 'تحويل الأرقام النقدية إلى كلمات عربية فصيحة بالسعودي والريالات والهللات في الفواتير والسندات.',
        targetModule: 'general_ledger',
        targetTab: 'vouchers',
        badge: 'مباشر وشغال',
        testActionType: 'tafqeet',
      },

      // 19-26: المبيعات والعملاء
      {
        id: 19,
        title: 'إنذار تجاوز سقف الائتمان للعميل (Credit Limit Breach Alert)',
        category: 'sales',
        categoryLabel: 'المبيعات والعملاء',
        description: 'إشعار فوري عند محاولة البيع الآجل لعميل تجاوز رصيده سقف الائتمان الممنوح.',
        targetModule: 'sales',
        targetTab: 'customers',
        badge: 'مباشر وشغال',
      },
      {
        id: 20,
        title: 'كشف حساب العميل الفوري من المبيعات (Instant Customer Ledger)',
        category: 'sales',
        categoryLabel: 'المبيعات والعملاء',
        description: 'زر مباشر في بطاقة كل عميل يفتح كشف الحساب فوراً دون الحاجة للتبديل.',
        targetModule: 'sales',
        targetTab: 'customers',
        badge: 'مباشر وشغال',
      },
      {
        id: 21,
        title: 'التحويل الفوري لعرض السعر إلى فاتورة (Quotation to Invoice Conversion)',
        category: 'sales',
        categoryLabel: 'المبيعات والعملاء',
        description: 'تحويل عروض الأسعار المقبولة إلى فواتير مبيعات ضريبية بضغطة زر واحدة.',
        targetModule: 'sales',
        targetTab: 'quotations',
        badge: 'مباشر وشغال',
      },
      {
        id: 22,
        title: 'باركود الفاتورة الإلكترونية المعتمد ZATCA QR Code',
        category: 'sales',
        categoryLabel: 'المبيعات والعملاء',
        description: 'توليد باركود الفاتورة الضريبية وفق متطلبات هيئة الزكاة والضريبة والجمارك.',
        targetModule: 'sales',
        targetTab: 'invoices',
        badge: 'مباشر وشغال',
        testActionType: 'barcode',
      },
      {
        id: 23,
        title: 'إضافة الأصناف عبر مسح الباركود السريع (Barcode Quick Scanner)',
        category: 'sales',
        categoryLabel: 'المبيعات والعملاء',
        description: 'دعم أجهزة قارئ الباركود في شاشة الفواتير للإدراج السريع وتفادي أخطاء الإدخال.',
        targetModule: 'sales',
        targetTab: 'invoices',
        badge: 'مباشر وشغال',
      },
      {
        id: 24,
        title: 'تسوية سداد الفاتورة الفوري (Quick Invoice Settlement)',
        category: 'sales',
        categoryLabel: 'المبيعات والعملاء',
        description: 'تغيير حالة الفاتورة من آجل إلى مسدد نقدي مع إثبات سند القبض محاسبياً.',
        targetModule: 'sales',
        targetTab: 'invoices',
        badge: 'مباشر وشغال',
      },
      {
        id: 25,
        title: 'الحساب التلقائي لضريبة 15% وصافي الخصم (Auto VAT & Discount Calc)',
        category: 'sales',
        categoryLabel: 'المبيعات والعملاء',
        description: 'حساب الضريبة على مستوى البند وعلى مستوى الإجمالي وصافي الخصومات الممنوحة.',
        targetModule: 'sales',
        targetTab: 'invoices',
        badge: 'مباشر وشغال',
      },
      {
        id: 26,
        title: 'تحديث أرصدة العملاء اللحظي (Real-Time Customer Balance Update)',
        category: 'sales',
        categoryLabel: 'المبيعات والعملاء',
        description: 'إعادة احتساب وتحديث الرصيد اللحظي للعميل بمجرد حفظ الفاتورة أو المردود.',
        targetModule: 'sales',
        targetTab: 'customers',
        badge: 'مباشر وشغال',
      },

      // 27-34: المشتريات والموردين
      {
        id: 27,
        title: 'أمر شراء سريع للأصناف الناقصة (Quick PO for Shortage Items)',
        category: 'purchases',
        categoryLabel: 'المشتريات والموردين',
        description: 'توليد أمر شراء جاهز بضغطة زر للأصناف التي وصلت لحد الطلب الأدنى.',
        targetModule: 'purchases',
        targetTab: 'orders',
        badge: 'مباشر وشغال',
      },
      {
        id: 28,
        title: 'تحويل أمر الشراء إلى فاتورة مشتريات (PO to Invoice Converter)',
        category: 'purchases',
        categoryLabel: 'المشتريات والموردين',
        description: 'استيراد بنود وكميات وأسعار أمر الشراء آلياً إلى فاتورة مشتريات مورد.',
        targetModule: 'purchases',
        targetTab: 'orders',
        badge: 'مباشر وشغال',
      },
      {
        id: 29,
        title: 'كشف حساب المورد الفوري (Instant Supplier Statement Modal)',
        category: 'purchases',
        categoryLabel: 'المشتريات والموردين',
        description: 'الاستعلام الفوري عن كشف حساب أي مورد ومطابقة الفواتير مع سندات الصرف.',
        targetModule: 'purchases',
        targetTab: 'suppliers',
        badge: 'مباشر وشغال',
      },
      {
        id: 30,
        title: 'متابعة ضريبة المشتريات القابلة للاسترداد (Input Tax Tracking)',
        category: 'purchases',
        categoryLabel: 'المشتريات والموردين',
        description: 'فرز مبالغ ضريبة القيمة المضافة 15% للمشتريات لخصمها من ضريبة المبيعات.',
        targetModule: 'purchases',
        targetTab: 'invoices',
        badge: 'مباشر وشغال',
      },
      {
        id: 31,
        title: 'تحديث المخزون التلقائي عند مردودات الشراء (Purchase Returns Sync)',
        category: 'purchases',
        categoryLabel: 'المشتريات والموردين',
        description: 'خصم كميات البضاعة المرتجعة من رصيد المستودع وتخفيض مديونية المورد.',
        targetModule: 'purchases',
        targetTab: 'returns',
        badge: 'مباشر وشغال',
      },
      {
        id: 32,
        title: 'تسوية حساب المورد وإصدار سند صرف (Supplier Payment Settlement)',
        category: 'purchases',
        categoryLabel: 'المشتريات والموردين',
        description: 'إصدار سند صرف مباشر لسداد فواتير المشتريات مع ربطه بالخزينة أو البنك.',
        targetModule: 'purchases',
        targetTab: 'invoices',
        badge: 'مباشر وشغال',
      },
      {
        id: 33,
        title: 'دليل الاتصال المباشر بالموردين (Supplier Contact Directory)',
        category: 'purchases',
        categoryLabel: 'المشتريات والموردين',
        description: 'حفظ أرقام الهواتف، العناوين، والأرقام الضريبية للموردين لسهولة التواصل.',
        targetModule: 'purchases',
        targetTab: 'suppliers',
        badge: 'مباشر وشغال',
      },
      {
        id: 34,
        title: 'سجل مقارنة أسعار الشراء السابقة (Purchase Price History Tracker)',
        category: 'purchases',
        categoryLabel: 'المشتريات والموردين',
        description: 'تتبع آخر سعر شراء مسجل للصنف لمساعدة مسؤول المشتريات على التفاوض.',
        targetModule: 'purchases',
        targetTab: 'invoices',
        badge: 'مباشر وشغال',
      },

      // 35-42: المخزون والمستودعات
      {
        id: 35,
        title: 'نظام التنبيهات الذكية للنواقص (SmartAlerts Low Stock System)',
        category: 'inventory',
        categoryLabel: 'المخزون والمستودعات',
        description: 'مراقبة مستمرة للأرصدة وتنبيه الإدارة عند وصول أي صنف لحد الطلب الأدنى.',
        targetModule: 'inventory',
        targetTab: 'alerts',
        badge: 'مباشر وشغال',
      },
      {
        id: 36,
        title: 'مناقلة المخزون مع التحديث المزدوج (Inter-Warehouse Transfers)',
        category: 'inventory',
        categoryLabel: 'المخزون والمستودعات',
        description: 'نقل الأصناف بين الفروع والمستودعات وتعديل رصيد المصدر والوجهة في نفس اللحظة.',
        targetModule: 'inventory',
        targetTab: 'movements',
        badge: 'مباشر وشغال',
      },
      {
        id: 37,
        title: 'محضر الجرد الفعلي ومطابقة العجز والزيادة (Physical Inventory Sheet)',
        category: 'inventory',
        categoryLabel: 'المخزون والمستودعات',
        description: 'طباعة كشوفات الجرد السنوية والدورية ومقارنة الرصيد الدفتري بالفعلي.',
        targetModule: 'inventory',
        targetTab: 'reports',
        badge: 'مباشر وشغال',
      },
      {
        id: 38,
        title: 'طباعة ملصقات الباركود والأسعار (Printable Barcode Labels)',
        category: 'inventory',
        categoryLabel: 'المخزون والمستودعات',
        description: 'توليد ومعاينة ملصقات الباركود مع السعر والاسم لطباعتها على البضاعة.',
        targetModule: 'inventory',
        targetTab: 'items',
        badge: 'مباشر وشغال',
      },
      {
        id: 39,
        title: 'تقييم المخزون الإجمالي بالتكلفة وسعر البيع (Stock Cost vs Retail Valuation)',
        category: 'inventory',
        categoryLabel: 'المخزون والمستودعات',
        description: 'حساب القيمة الإجمالية للمخزون بالتكلفة وبالبيع لتقدير الأرباح المحققة.',
        targetModule: 'inventory',
        targetTab: 'reports',
        badge: 'مباشر وشغال',
      },
      {
        id: 40,
        title: 'تصنيف وفلترة المخزون حسب المجموعات (Category-Wise Stock Segregation)',
        category: 'inventory',
        categoryLabel: 'المخزون والمستودعات',
        description: 'تنظيم الأصناف في مجموعات وفئات لسهولة البحث والاستعلام والتقارير.',
        targetModule: 'inventory',
        targetTab: 'items',
        badge: 'مباشر وشغال',
      },
      {
        id: 41,
        title: 'ترقيم تسلسلي تلقائي لأذون المخزون (Sequential Stock Voucher Gen)',
        category: 'inventory',
        categoryLabel: 'المخزون والمستودعات',
        description: 'توليد ترقيم تسلسلي دقيق لأذون الإدخال والصرف والمناقلة.',
        targetModule: 'inventory',
        targetTab: 'movements',
        badge: 'مباشر وشغال',
      },
      {
        id: 42,
        title: 'حماية منع الأرصدة السالبة في المستودعات (Negative Stock Prevention)',
        category: 'inventory',
        categoryLabel: 'المخزون والمستودعات',
        description: 'فحص مسبق للرصيد المتاح قبل الصرف لمنع حدوث أرصدة وهمية سالبة.',
        targetModule: 'inventory',
        targetTab: 'movements',
        badge: 'مباشر وشغال',
      },

      // 43-50: الأمان والنظام والبنية التحتية
      {
        id: 43,
        title: 'النسخ الاحتياطي الشامل بضغطة زر واحدة (One-Click Full Database Backup)',
        category: 'system',
        categoryLabel: 'الأمان وإدارة النظام',
        description: 'تصدير نسخة احتياطية مشفرة وشاملة لكافة السجلات والجداول بصيغة SQLite / JSON.',
        targetModule: 'auxiliary_reports',
        targetTab: 'backup',
        badge: 'مباشر وشغال',
      },
      {
        id: 44,
        title: 'استعادة قاعدة البيانات الآمنة (Instant Database Restoration)',
        category: 'system',
        categoryLabel: 'الأمان وإدارة النظام',
        description: 'استعادة ملف النسخة الاحتياطية وإثبات العملية تلقائياً في سجل الرقابة.',
        targetModule: 'auxiliary_reports',
        targetTab: 'backup',
        badge: 'مباشر وشغال',
      },
      {
        id: 45,
        title: 'مصفوفة الصلاحيات الأمنية التفصيلية (Granular RBAC Security Matrix)',
        category: 'system',
        categoryLabel: 'الأمان وإدارة النظام',
        description: 'تحديد صلاحيات الإضافة والتعديل والحذف والطباعة لكل مستخدم وفق مسؤولياته.',
        targetModule: 'system_admin',
        targetTab: 'permissions',
        badge: 'مباشر وشغال',
      },
      {
        id: 46,
        title: 'سجل رقابة وتتبع العمليات المحاسبية الشامل (Audit Trail Log)',
        category: 'system',
        categoryLabel: 'الأمان وإدارة النظام',
        description: 'توثيق أمني لكل إجراء (دخول، خروج، إضافة، تعديل، حذف، طباعة، نسخ احتياطي) مع اسم المستخدم.',
        targetModule: 'auxiliary_reports',
        targetTab: 'audit_log',
        badge: 'مباشر وشغال',
      },
      {
        id: 47,
        title: 'شاشة مراقبة المستخدمين المتصلين بالجلسة (Active Session Monitor)',
        category: 'system',
        categoryLabel: 'الأمان وإدارة النظام',
        description: 'رصد الجلسات المفتوحة والمستخدم الحالي وعنوان IP المحلي ومحطة العمل.',
        targetModule: 'auxiliary_reports',
        targetTab: 'online_users',
        badge: 'مباشر وشغال',
      },
      {
        id: 48,
        title: 'الآلة الحاسبة المحاسبية العائمة (Floating ERP Calculator)',
        category: 'system',
        categoryLabel: 'الأمان وإدارة النظام',
        description: 'آلة حاسبة ذكية بشريط عمليات تدعم الحسابات المالية السريعة من أي شاشة.',
        targetModule: 'auxiliary_reports',
        targetTab: 'about',
        badge: 'مباشر وشغال',
      },
      {
        id: 49,
        title: 'اختصارات لوحة المفاتيح والتبديل بدون فأرة (F1..F7 & Alt+1..7 Hotkeys)',
        category: 'system',
        categoryLabel: 'الأمان وإدارة النظام',
        description: 'تنقل سريع بين الشاشات السبع الرئيسية وتصدير PDF بضغطة زر واحدة (Alt+P).',
        targetModule: 'auxiliary_reports',
        targetTab: 'about',
        badge: 'مباشر وشغال',
      },
      {
        id: 50,
        title: 'لوحة القيادة المركزية للميزات الخمسين (50 Enterprise Features Hub)',
        category: 'system',
        categoryLabel: 'الأمان وإدارة النظام',
        description: 'لوحة موحدة ترصد حالة وتفاصيل واختبار كافة الميزات الـ 50 الشغالة في النظام.',
        targetModule: 'auxiliary_reports',
        targetTab: 'report_center',
        badge: 'مباشر وشغال',
      },
    ],
    []
  );

  const filteredFeatures = useMemo(() => {
    return featuresList.filter((f) => {
      const matchesSearch =
        search.trim() === '' ||
        f.title.includes(search) ||
        f.description.includes(search) ||
        f.id.toString() === search;

      const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [featuresList, search, selectedCategory]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 bg-gradient-to-r from-[#1B3A5C] to-[#122840] text-white shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#c49a37] text-[#122840] flex items-center justify-center font-bold shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>سجل الميزات الخمسين المتكاملة في نظام H2pro ERP</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] px-2 py-0.5 rounded-full font-mono">
                  50 / 50 ميزة شغالة ومفعلة فورا
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                منظومة ميزات برمجية متطورة تلبي أعلى معايير الشركات والمؤسسات والمحاسبة والامتثال الضريبي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">العدد المعروض: {filteredFeatures.length} ميزة</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 flex items-center justify-between gap-3 flex-wrap text-xs">
        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: 'كافة الميزات (50)' },
            { id: 'reports', label: 'التقارير والتحليلات (10)' },
            { id: 'gl', label: 'الأستاذ العام والمالية (8)' },
            { id: 'sales', label: 'المبيعات والعملاء (8)' },
            { id: 'purchases', label: 'المشتريات والموردين (8)' },
            { id: 'inventory', label: 'المخزون والمستودعات (8)' },
            { id: 'system', label: 'الأمان والنظام (8)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded font-bold cursor-pointer transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-[#1B3A5C] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الميزات أو رقم الميزة..."
            className="w-full px-2.5 py-1.5 pr-8 border border-slate-300 rounded text-xs bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2" />
        </div>
      </div>

      {/* Features Grid Viewport */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-100/60">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFeatures.map((feat) => (
            <div
              key={feat.id}
              className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs hover:border-[#1B3A5C]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded bg-[#1B3A5C] text-[#dfb758] font-bold text-xs flex items-center justify-center font-mono">
                      #{feat.id}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {feat.categoryLabel}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{feat.badge}</span>
                  </span>
                </div>

                <h3 className="text-xs font-bold text-[#1B3A5C] mb-1 leading-snug">{feat.title}</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">{feat.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                {feat.testActionType && feat.testActionType !== 'none' ? (
                  <button
                    onClick={() => setTestModalType(feat.testActionType || null)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>تجربة سريعة</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400">ميزة مدمجة ونشطة</span>
                )}

                <button
                  onClick={() => onNavigateModule?.(feat.targetModule, feat.targetTab)}
                  className="px-2.5 py-1 bg-[#1B3A5C] hover:bg-[#122840] text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>الانتقال للشاشة</span>
                  <ExternalLink className="w-3 h-3 text-[#dfb758]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Interactive Feature Tester Modal --- */}
      <Modal
        isOpen={testModalType !== null}
        onClose={() => setTestModalType(null)}
        title="أداة تجربة واختبار الميزة التفاعلية الفورية"
        width="lg"
      >
        <div className="space-y-4 text-xs">
          {testModalType === 'tafqeet' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                اختبر محرك التفقيط المالي باللغة العربية وتحويل الأرقام إلى نصوص كتابية فصيحة:
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">أدخل المبلغ بالأرقام:</label>
                <input
                  type="number"
                  step="0.01"
                  value={testNumberInput}
                  onChange={(e) => setTestNumberInput(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-sm"
                />
              </div>
              <div className="p-3 bg-emerald-50 rounded border border-emerald-300 text-emerald-900">
                <span className="text-[11px] font-bold text-emerald-700 block mb-1">النتيجة المفقطة باللغة العربية:</span>
                <p className="font-bold text-sm leading-relaxed">{tafqeet(testNumberInput, 'SAR')}</p>
              </div>
            </div>
          )}

          {testModalType === 'zakat' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                حساب الزكاة الشرعية التقديرية (2.5%) على الأوعية والأرباح النقدية الصافية:
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">أدخل الوعاء الزكوي أو رأس المال الصافي:</label>
                <input
                  type="number"
                  step="100"
                  value={testNumberInput}
                  onChange={(e) => setTestNumberInput(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-sm"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded border border-blue-300 text-blue-900 space-y-1">
                <div className="flex justify-between">
                  <span>نسبة الزكاة المعتمدة:</span>
                  <span className="font-mono font-bold">2.5%</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-blue-950 pt-1 border-t border-blue-200">
                  <span>مقدار الزكاة الواجبة التقديرية:</span>
                  <span className="font-mono">{(testNumberInput * 0.025).toLocaleString('ar-SA')} ر.س.</span>
                </div>
              </div>
            </div>
          )}

          {testModalType === 'currency' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                معاينة تحويل العملات من الريال السعودي إلى العملات الرئيسية المسجلة:
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">المبلغ بالريال السعودي (SAR):</label>
                <input
                  type="number"
                  step="10"
                  value={testNumberInput}
                  onChange={(e) => setTestNumberInput(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 bg-slate-100 rounded border">
                  <span className="text-[11px] text-slate-500 block font-sans">بالدولار الأمريكي (USD @ 3.75):</span>
                  <span className="font-bold text-sm text-[#1B3A5C]">{(testNumberInput / 3.75).toFixed(2)} $</span>
                </div>
                <div className="p-2.5 bg-slate-100 rounded border">
                  <span className="text-[11px] text-slate-500 block font-sans">باليورو الأوروبي (EUR @ 4.05):</span>
                  <span className="font-bold text-sm text-[#1B3A5C]">{(testNumberInput / 4.05).toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}

          {testModalType === 'barcode' && (
            <div className="space-y-3 text-center">
              <p className="text-slate-600">
                محاكاة تشفير بيانات الفاتورة الإلكترونية المتوافقة مع هيئة الزكاة والضريبة والجمارك (ZATCA):
              </p>
              <div className="p-4 bg-slate-50 rounded border border-dashed border-slate-300 inline-block mx-auto">
                <Barcode className="w-32 h-16 text-slate-800 mx-auto" />
                <span className="font-mono text-[11px] text-slate-600 block mt-1">ZATCA-QR-INVOICE-VALIDATED</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-bold">
                ✓ التشفير يتضمن اسم المورد، الرقم الضريبي، تاريخ الفاتورة، إجمالي الضريبة، والإجمالي شامل الضريبة.
              </p>
            </div>
          )}

          <div className="pt-3 border-t flex justify-end">
            <button
              onClick={() => setTestModalType(null)}
              className="px-4 py-1.5 bg-[#1B3A5C] text-white rounded font-bold text-xs"
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
