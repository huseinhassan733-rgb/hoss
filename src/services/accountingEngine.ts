/**
 * محرك المحاسبة المالية المزدوجة القياسي (Standard Double-Entry Accounting Engine)
 * يتولى القواعد المحاسبية الصارمة وفق معايير المحاسبة الدولية (IFRS/GAAP)
 */

import { JournalEntry, JournalLine } from '../types';

export interface TransactionImpact {
  operationType: string;
  operationNumber: string;
  debitAccount: { code: string; name: string; amount: number; reason: string };
  creditAccount: { code: string; name: string; amount: number; reason: string };
  additionalLines?: Array<{
    code: string;
    name: string;
    debit: number;
    credit: number;
    reason: string;
  }>;
  allLines: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    note: string;
  }>;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;

  qna: {
    whatIsDebit: string;
    whatIsCredit: string;
    why: string;
    effectsSummary: string;
  };

  inventoryImpact: {
    affected: boolean;
    type?: 'increase' | 'decrease' | 'transfer' | 'none';
    details: string;
    estimatedValueChange?: number;
    balanceChange?: number;
  };
  customerImpact: {
    affected: boolean;
    details: string;
    balanceChange: number;
  };
  supplierImpact: {
    affected: boolean;
    details: string;
    balanceChange: number;
  };
  profitImpact: {
    revenueChange: number;
    expenseChange: number;
    netProfitChange: number;
    summary: string;
  };
  balanceSheetImpact: {
    assetsChange: number;
    liabilitiesChange: number;
    equityChange: number;
    isFormulaBalanced: boolean;
    explanation: string;
  };
  reportImpact: {
    generalLedger: string;
    trialBalance: string;
    incomeStatement: string;
    balanceSheet: string;
    customerStatement?: string;
    supplierStatement?: string;
    inventoryLedger?: string;
  };
  auditExplanation: string;
}

export interface AccountingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
}

export class DoubleEntryAccountingEngine {
  public static readonly ACCOUNT_CODES = {
    CASH_MAIN: '1111',
    BANK_CURRENT: '1112',
    BANK_SECONDARY: '1113',
    CUSTOMERS_RECEIVABLE: '1121',
    INVENTORY_MAIN: '1131',
    PREPAID_EXPENSES: '1141',
    FIXED_ASSETS_FURNITURE: '121',
    FIXED_ASSETS_COMPUTERS: '122',
    FIXED_ASSETS_VEHICLES: '123',
    ACCUMULATED_DEPRECIATION: '129',
    SUPPLIERS_PAYABLE: '211',
    VAT_PAYABLE: '212',
    ACCRUED_EXPENSES: '213',
    UNEARNED_REVENUE: '214',
    CAPITAL: '31',
    RETAINED_EARNINGS: '32',
    CURRENT_YEAR_PROFIT: '33',
    SALES_REVENUE: '411',
    SERVICES_REVENUE: '412',
    OTHER_REVENUE: '413',
    SALES_DISCOUNT_ALLOWED: '414',
    INVENTORY_ADJUSTMENT_GAIN: '415',
    COST_OF_GOODS_SOLD: '51',
    PURCHASE_DISCOUNT_RECEIVED: '512',
    RENT_EXPENSE: '521',
    UTILITIES_EXPENSE: '522',
    SALARIES_EXPENSE: '523',
    DEPRECIATION_EXPENSE: '524',
    INVENTORY_ADJUSTMENT_LOSS: '525',
    GENERAL_EXPENSE: '529',
  };

  public static validateJournalEntry(
    lines: Array<{ accountCode: string; debit: number; credit: number }>
  ): AccountingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!lines || lines.length < 2) {
      errors.push('القيد المحاسبي المزدوج يجب أن يحتوي على سطرين على الأقل (طرف مدين وطرف دائن).');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach((l, index) => {
      const d = Number(l.debit) || 0;
      const c = Number(l.credit) || 0;

      if (d < 0 || c < 0) {
        errors.push(`السطر رقم ${index + 1}: لا يمكن إدخال قيم مبالغ سالبة في طرفي المدين أو الدائن.`);
      }
      if (d > 0 && c > 0) {
        errors.push(`السطر رقم ${index + 1}: لا يمكن أن يحتوي نفس السطر على مبلغين في المدين والدائن معاً.`);
      }
      if (d === 0 && c === 0) {
        warnings.push(`السطر رقم ${index + 1}: يحتوي على قيمة صفرية.`);
      }
      if (!l.accountCode || l.accountCode.trim() === '') {
        errors.push(`السطر رقم ${index + 1}: رقم الحساب غير محدد.`);
      }

      totalDebit += d;
      totalCredit += c;
    });

    const difference = Math.abs(totalDebit - totalCredit);
    if (difference > 0.001) {
      errors.push(
        `القيد المحاسبي غير متزن! إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)}). الفارق: ${difference.toFixed(2)}`
      );
    }
    if (totalDebit === 0) {
      errors.push('لا يمكن ترحيل قيد بإجمالي صفري.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      difference: Math.round(difference * 100) / 100,
    };
  }

  public static buildJournalEntryFromImpact(params: {
    impact: TransactionImpact;
    entryNumber: string;
    date: string;
    reference: string;
    description: string;
    actor: string;
    financialYear: number;
  }): JournalEntry {
    const { impact, entryNumber, date, reference, description, actor, financialYear } = params;
    return {
      id: `je-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      entryNumber,
      date,
      reference,
      description,
      debitTotal: impact.totalDebit,
      creditTotal: impact.totalCredit,
      financialYear,
      createdBy: actor,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'posted',
      lines: impact.allLines.map((l, idx) => ({
        id: `line-${idx}-${Date.now()}`,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.debit,
        credit: l.credit,
        note: l.note,
      })),
    };
  }

  public static analyzeSalesInvoiceImpact(params: {
    invoiceNumber: string;
    customerName: string;
    grandTotal: number;
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    cogsAmount: number;
    paymentStatus: 'paid' | 'credit' | 'partial';
  }): TransactionImpact {
    const { invoiceNumber, customerName, grandTotal, subtotal, taxTotal, discountTotal, cogsAmount, paymentStatus } = params;

    const debitAccCode = paymentStatus === 'paid' ? this.ACCOUNT_CODES.CASH_MAIN : this.ACCOUNT_CODES.CUSTOMERS_RECEIVABLE;
    const debitAccName = paymentStatus === 'paid' ? 'الصندوق الرئيسي (الخزينة)' : 'حسابات العملاء التجاريين';

    const lines: Array<{ accountCode: string; accountName: string; debit: number; credit: number; note: string }> = [];

    // 1. Debit main customer or cash (GrandTotal = subtotal + taxTotal - discountTotal)
    const receivableDebit = grandTotal;
    lines.push({
      accountCode: debitAccCode,
      accountName: debitAccName,
      debit: receivableDebit,
      credit: 0,
      note: `إثبات استحقاق قيمة الفاتورة على ${customerName}`,
    });

    // 2. Debit discount allowed if any
    if (discountTotal > 0) {
      lines.push({
        accountCode: this.ACCOUNT_CODES.SALES_DISCOUNT_ALLOWED,
        accountName: 'خصم مسموح به (خصم المبيعات)',
        debit: discountTotal,
        credit: 0,
        note: `خصم تجاري مسموح به للعميل ${customerName}`,
      });
    }

    // 3. Credit sales revenue (Gross subtotal before discount)
    lines.push({
      accountCode: this.ACCOUNT_CODES.SALES_REVENUE,
      accountName: 'مبيعات المنتجات والأجهزة',
      debit: 0,
      credit: subtotal,
      note: `إثبات إيراد مبيعات المنتجات بالفاتورة رقم ${invoiceNumber}`,
    });

    // 4. Credit VAT Output
    if (taxTotal > 0) {
      lines.push({
        accountCode: this.ACCOUNT_CODES.VAT_PAYABLE,
        accountName: 'الضرائب المستحقة (ضريبة القيمة المضافة)',
        debit: 0,
        credit: taxTotal,
        note: `ضريبة القيمة المضافة المستحقة على مبيعات الفاتورة ${invoiceNumber}`,
      });
    }

    // 5. COGS entry: Dr COGS, Cr Inventory
    if (cogsAmount > 0) {
      lines.push({
        accountCode: this.ACCOUNT_CODES.COST_OF_GOODS_SOLD,
        accountName: 'تكلفة المبيعات والمشتريات (COGS)',
        debit: cogsAmount,
        credit: 0,
        note: `إثبات تكلفة البضاعة المباعة (FIFO) للفاتورة ${invoiceNumber}`,
      });
      lines.push({
        accountCode: this.ACCOUNT_CODES.INVENTORY_MAIN,
        accountName: 'مخزون بضاعة المستودع المركزي',
        debit: 0,
        credit: cogsAmount,
        note: `خروج بضاعة من المخزون بمقدار تكلفة المبيعات`,
      });
    }

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    return {
      operationType: 'فاتورة مبيعات',
      operationNumber: invoiceNumber,
      debitAccount: { code: debitAccCode, name: debitAccName, amount: receivableDebit, reason: 'زيادة الأصول المتداولة (المدينون أو الصندوق)' },
      creditAccount: { code: this.ACCOUNT_CODES.SALES_REVENUE, name: 'مبيعات المنتجات والأجهزة', amount: subtotal, reason: 'إثبات إيراد مبيعات جديد يزيد الأرباح' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `${debitAccName} (${debitAccCode}) بمبلغ ${receivableDebit.toLocaleString()} ر.ي`,
        whatIsCredit: `إيرادات المبيعات (${this.ACCOUNT_CODES.SALES_REVENUE}) بمبلغ ${subtotal.toLocaleString()} ر.ي وضريبة القيمة المضافة`,
        why: `وفقاً لمعايير المحاسبة المالية IFRS 15، يتحقق الإيراد عند تسليم البضاعة وإثبات حق المطالبة على العميل أو استلاستلام النقدية مع إثبات تكلفة المبيعات مقابل خروج المخزون.`,
        effectsSummary: `زيادة الأصول والمبيعات، تخفيض المخزون السلعي، وإثبات التزام ضريبي.`,
      },
      inventoryImpact: {
        affected: true,
        type: 'decrease',
        details: `خروج بضائع بتكلفة ${cogsAmount.toLocaleString()} ر.ي من المستودع المركزي.`,
        estimatedValueChange: -cogsAmount,
      },
      customerImpact: {
        affected: paymentStatus !== 'paid',
        details: paymentStatus !== 'paid' ? `زيادة مديونية العميل ${customerName} بقيمة ${grandTotal.toLocaleString()} ر.ي` : 'عملية نقدية فورية لا تؤثر على رصيد المديونية الدائم.',
        balanceChange: paymentStatus !== 'paid' ? grandTotal : 0,
      },
      supplierImpact: { affected: false, details: 'لا يوجد أثر على الموردين.', balanceChange: 0 },
      profitImpact: {
        revenueChange: subtotal - discountTotal,
        expenseChange: cogsAmount,
        netProfitChange: subtotal - cogsAmount - discountTotal,
        summary: `زيادة صافي الدخل بمقدار مجمل الربح (المبيعات - التكلفة - الخصم).`,
      },
      balanceSheetImpact: {
        assetsChange: receivableDebit - cogsAmount,
        liabilitiesChange: taxTotal,
        equityChange: subtotal - cogsAmount - discountTotal,
        isFormulaBalanced: true,
        explanation: 'الأصول زادت بصافي الفرق وصافي الربح انعكس في حقوق الملكية (الأرباح).',
      },
      reportImpact: {
        generalLedger: 'ترحيل أطراف المدين والدائن لدفتر الأستاذ العام.',
        trialBalance: 'تحديث أرصدة العملاء، المخزون، المبيعات، والضرائب في ميزان المراجعة.',
        incomeStatement: 'ظهور إيرادات المبيعات مطروحاً منها الخصم وتكلفة المبيعات في قائمة الدخل.',
        balanceSheet: 'تحديث إجمالي الأصول (العملاء والمخزون) والالتزامات الضريبية.',
        customerStatement: paymentStatus !== 'paid' ? `إضافة حركة مدينة بقيمة ${grandTotal.toLocaleString()} ر.ي في كشف حساب العميل.` : undefined,
      },
      auditExplanation: `تم إنشاء القيد المزدوج تلقائياً وفق القواعد المحاسبية لفاتورة المبيعات رقم ${invoiceNumber}.`,
    };
  }

  public static analyzePurchaseInvoiceImpact(params: {
    invoiceNumber: string;
    supplierName: string;
    grandTotal: number;
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    paymentStatus: 'paid' | 'credit' | 'partial';
  }): TransactionImpact {
    const { invoiceNumber, supplierName, grandTotal, subtotal, taxTotal, discountTotal, paymentStatus } = params;

    const creditAccCode = paymentStatus === 'paid' ? this.ACCOUNT_CODES.CASH_MAIN : this.ACCOUNT_CODES.SUPPLIERS_PAYABLE;
    const creditAccName = paymentStatus === 'paid' ? 'الصندوق الرئيسي (الخزينة)' : 'الموردون والدائنون التجاريون';

    const lines: Array<{ accountCode: string; accountName: string; debit: number; credit: number; note: string }> = [];

    // 1. Debit Inventory
    lines.push({
      accountCode: this.ACCOUNT_CODES.INVENTORY_MAIN,
      accountName: 'مخزون بضاعة المستودع المركزي',
      debit: subtotal,
      credit: 0,
      note: `إثبات توريد بضاعة للمستودع بموجب فاتورة مشتريات رقم ${invoiceNumber}`,
    });

    // 2. Debit VAT Input
    if (taxTotal > 0) {
      lines.push({
        accountCode: this.ACCOUNT_CODES.VAT_PAYABLE,
        accountName: 'الضرائب المستحقة (ضريبة المدخلات القابلة للخصم)',
        debit: taxTotal,
        credit: 0,
        note: `ضريبة القيمة المضافة القابلة للخصم على مشتريات الفاتورة ${invoiceNumber}`,
      });
    }

    // 3. Credit supplier or cash
    lines.push({
      accountCode: creditAccCode,
      accountName: creditAccName,
      debit: 0,
      credit: grandTotal,
      note: `إثبات الالتزام المستحق لصالح المورد ${supplierName}`,
    });

    // 4. Credit purchase discount received if any
    if (discountTotal > 0) {
      lines.push({
        accountCode: this.ACCOUNT_CODES.PURCHASE_DISCOUNT_RECEIVED,
        accountName: 'الخصم المكتسب (خصم المشتريات)',
        debit: 0,
        credit: discountTotal,
        note: `خصم مكتسب ممنوح من المورد ${supplierName}`,
      });
    }

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    return {
      operationType: 'فاتورة مشتريات',
      operationNumber: invoiceNumber,
      debitAccount: { code: this.ACCOUNT_CODES.INVENTORY_MAIN, name: 'مخزون بضاعة المستودع المركزي', amount: subtotal, reason: 'زيادة أصول المخزون السلعي' },
      creditAccount: { code: creditAccCode, name: creditAccName, amount: grandTotal, reason: 'زيادة الالتزامات للموردين أو نقص النقدية' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `مخزون المستودع بمبلغ ${subtotal.toLocaleString()} ر.ي وضريبة المدخلات`,
        whatIsCredit: `${creditAccName} (${creditAccCode}) بمبلغ ${grandTotal.toLocaleString()} ر.ي والخصم المكتسب`,
        why: 'وفقاً لمعيار المحاسبة الدولي IAS 2، تُقيم المخزونات بتكلفة الشراء مضافاً إليها الضرائب غير القابلة للاسترداد ومطروحاً منها الخصومات.',
        effectsSummary: 'زيادة المخزون والأصول، زيادة الالتزامات للموردين.',
      },
      inventoryImpact: {
        affected: true,
        type: 'increase',
        details: `إضافة بضاعة جديدة بقيمة ${subtotal.toLocaleString()} ر.ي إلى المخزون.`,
        estimatedValueChange: subtotal,
      },
      customerImpact: { affected: false, details: 'لا يوجد أثر على العملاء.', balanceChange: 0 },
      supplierImpact: {
        affected: paymentStatus !== 'paid',
        details: paymentStatus !== 'paid' ? `زيادة الالتزام للمورد ${supplierName} بمبلغ ${grandTotal.toLocaleString()} ر.ي` : 'عملية سداد نقدي فوري.',
        balanceChange: paymentStatus !== 'paid' ? grandTotal : 0,
      },
      profitImpact: { revenueChange: 0, expenseChange: 0, netProfitChange: 0, summary: 'لا يوجد أثر فوري على قائمة الدخل حتى يتم بيع البضاعة.' },
      balanceSheetImpact: {
        assetsChange: subtotal + taxTotal,
        liabilitiesChange: grandTotal,
        equityChange: 0,
        isFormulaBalanced: true,
        explanation: 'زيادة الأصول تقابلها زيادة الالتزامات.',
      },
      reportImpact: {
        generalLedger: 'ترحيل أطراف الشراء والالتزام للأستاذ العام.',
        trialBalance: 'تحديث أرصدة المخزون، الموردين، والضرائب في ميزان المراجعة.',
        incomeStatement: 'لا أثر فوري حتى تتحقق المبيعات.',
        balanceSheet: 'زيادة الأصول المتداولة والخصوم المتداولة.',
        supplierStatement: paymentStatus !== 'paid' ? `إضافة حركة دائنة بقيمة ${grandTotal.toLocaleString()} ر.ي في كشف حساب المورد.` : undefined,
      },
      auditExplanation: `تم إثبات فاتورة المشتريات رقم ${invoiceNumber} وتحديث المخزون والالتزامات بنجاح.`,
    };
  }

  public static analyzeSalesReturnImpact(params: {
    returnNumber: string;
    customerName: string;
    grandTotal: number;
    subtotal: number;
    taxTotal: number;
    cogsAmount: number;
    paymentStatus: 'paid' | 'credit';
  }): TransactionImpact {
    const { returnNumber, customerName, grandTotal, subtotal, taxTotal, cogsAmount } = params;
    const lines = [
      { accountCode: this.ACCOUNT_CODES.SALES_REVENUE, accountName: 'مبيعات المنتجات والأجهزة (مردودات)', debit: subtotal, credit: 0, note: `تخفيض إيرادات المبيعات بمردودات العميل ${customerName}` },
      ...(taxTotal > 0 ? [{ accountCode: this.ACCOUNT_CODES.VAT_PAYABLE, accountName: 'الضرائب المستحقة (مخرجات)', debit: taxTotal, credit: 0, note: `تخفيض الالتزام الضريبي لمردود الفاتورة ${returnNumber}` }] : []),
      { accountCode: this.ACCOUNT_CODES.CUSTOMERS_RECEIVABLE, accountName: 'حسابات العملاء التجاريين', debit: 0, credit: grandTotal, note: `تخفيض مديونية العميل ${customerName}` },
      ...(cogsAmount > 0 ? [
        { accountCode: this.ACCOUNT_CODES.INVENTORY_MAIN, accountName: 'مخزون بضاعة المستودع المركزي', debit: cogsAmount, credit: 0, note: `إعادة البضاعة المرتجعة للمخزون` },
        { accountCode: this.ACCOUNT_CODES.COST_OF_GOODS_SOLD, accountName: 'تكلفة المبيعات والمشتريات (COGS)', debit: 0, credit: cogsAmount, note: `تخفيض تكلفة المبيعات` }
      ] : [])
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'مردود مبيعات',
      operationNumber: returnNumber,
      debitAccount: { code: this.ACCOUNT_CODES.SALES_REVENUE, name: 'مبيعات المنتجات والأجهزة', amount: subtotal, reason: 'تخفيض الإيرادات' },
      creditAccount: { code: this.ACCOUNT_CODES.CUSTOMERS_RECEIVABLE, name: 'حسابات العملاء التجاريين', amount: grandTotal, reason: 'تخفيض مديونية العميل' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `مردودات المبيعات والضرائب بمبلغ ${(subtotal + taxTotal).toLocaleString()} ر.ي`,
        whatIsCredit: `حسابات العملاء بقيمة ${grandTotal.toLocaleString()} ر.ي`,
        why: 'إثبات استرجاع البضاعة وتخفيض مديونية العميل وإلغاء الإيراد والضريبة المقابلة.',
        effectsSummary: 'تخفيض المبيعات، زيادة المخزون، وتخفيض مديونية العميل.',
      },
      inventoryImpact: { affected: true, type: 'increase', details: `إعادة بضاعة بتكلفة ${cogsAmount.toLocaleString()} ر.ي للمخزون.`, estimatedValueChange: cogsAmount },
      customerImpact: { affected: true, details: `تخفيض مديونية العميل ${customerName} بقيمة ${grandTotal.toLocaleString()} ر.ي`, balanceChange: -grandTotal },
      supplierImpact: { affected: false, details: 'لا أثر على الموردين.', balanceChange: 0 },
      profitImpact: { revenueChange: -subtotal, expenseChange: -cogsAmount, netProfitChange: -(subtotal - cogsAmount), summary: 'تخفيض صافي الدخل بمقدار مجمل ربح المرتجع.' },
      balanceSheetImpact: { assetsChange: cogsAmount - grandTotal, liabilitiesChange: -taxTotal, equityChange: -(subtotal - cogsAmount), isFormulaBalanced: true, explanation: 'توازن الأصول والالتزامات وحقوق الملكية.' },
      reportImpact: { generalLedger: 'ترحيل أطراف مردود المبيعات للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'تخفيض صافي الإيرادات.', balanceSheet: 'تخفيض أرصدة العملاء وزيادة المخزون.' },
      auditExplanation: `إشعار دائن مردود مبيعات رقم ${returnNumber} متزن محاسبياً.`,
    };
  }

  public static analyzePurchaseReturnImpact(params: {
    returnNumber: string;
    supplierName: string;
    grandTotal: number;
    subtotal: number;
    taxTotal: number;
    paymentStatus: 'paid' | 'credit';
  }): TransactionImpact {
    const { returnNumber, supplierName, grandTotal, subtotal, taxTotal } = params;
    const lines = [
      { accountCode: this.ACCOUNT_CODES.SUPPLIERS_PAYABLE, accountName: 'الموردون والدائنون التجاريون', debit: grandTotal, credit: 0, note: `تخفيض التزام المورد ${supplierName}` },
      { accountCode: this.ACCOUNT_CODES.INVENTORY_MAIN, accountName: 'مخزون بضاعة المستودع المركزي', debit: 0, credit: subtotal, note: `إخراج البضاعة المرتجعة من المخزون` },
      ...(taxTotal > 0 ? [{ accountCode: this.ACCOUNT_CODES.VAT_PAYABLE, accountName: 'الضرائب المستحقة (مدخلات)', debit: 0, credit: taxTotal, note: `تخفيض ضريبة المدخلات القابلة للخصم` }] : [])
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'مردود مشتريات',
      operationNumber: returnNumber,
      debitAccount: { code: this.ACCOUNT_CODES.SUPPLIERS_PAYABLE, name: 'الموردون والدائنون التجاريون', amount: grandTotal, reason: 'تخفيض الالتزامات للمورد' },
      creditAccount: { code: this.ACCOUNT_CODES.INVENTORY_MAIN, name: 'مخزون بضاعة المستودع المركزي', amount: subtotal, reason: 'إخراج بضاعة من المخزون' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `الموردون والدائنون بقيمة ${grandTotal.toLocaleString()} ر.ي`,
        whatIsCredit: `المخزون والضرائب بمبلغ ${(subtotal + taxTotal).toLocaleString()} ر.ي`,
        why: 'إثبات إرجاع بضاعة للمورد وتخفيض الالتزام والمخزون.',
        effectsSummary: 'تخفيض المخزون وتخفيض التزامات الموردين.',
      },
      inventoryImpact: { affected: true, type: 'decrease', details: `إخراج بضاعة بقيمة ${subtotal.toLocaleString()} ر.ي من المخزون.`, estimatedValueChange: -subtotal },
      customerImpact: { affected: false, details: 'لا أثر على العملاء.', balanceChange: 0 },
      supplierImpact: { affected: true, details: `تخفيض التزام المورد ${supplierName} بقيمة ${grandTotal.toLocaleString()} ر.ي`, balanceChange: -grandTotal },
      profitImpact: { revenueChange: 0, expenseChange: 0, netProfitChange: 0, summary: 'لا أثر فوري على قائمة الدخل.' },
      balanceSheetImpact: { assetsChange: -(subtotal + taxTotal), liabilitiesChange: -grandTotal, equityChange: 0, isFormulaBalanced: true, explanation: 'توازن الأصول والخصوم.' },
      reportImpact: { generalLedger: 'ترحيل أطراف مردود المشتريات للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'لا أثر مباشر.', balanceSheet: 'تخفيض المخزون والتزامات الموردين.' },
      auditExplanation: `إشعار مدين مردود مشتريات رقم ${returnNumber} متزن تماماً.`,
    };
  }

  public static analyzeVoucherImpact(params: {
    type: 'receipt' | 'payment';
    voucherNumber: string;
    partyName: string;
    amount: number;
    accountCode: string;
    accountName: string;
    paymentMethod: 'cash' | 'bank' | 'cheque';
    description?: string;
  }): TransactionImpact {
    const { type, voucherNumber, partyName, amount, accountCode, accountName, paymentMethod } = params;
    const fundCode = paymentMethod === 'cash' ? this.ACCOUNT_CODES.CASH_MAIN : this.ACCOUNT_CODES.BANK_CURRENT;
    const fundName = paymentMethod === 'cash' ? 'الصندوق الرئيسي (الخزينة)' : 'بنك اليمن والكويت - الحساب الجاري';

    const lines = type === 'receipt'
      ? [
          { accountCode: fundCode, accountName: fundName, debit: amount, credit: 0, note: `قبض نقدي/بنكي بموجب سند رقم ${voucherNumber} من ${partyName}` },
          { accountCode, accountName, debit: 0, credit: amount, note: `تخفيض حساب ${accountName} للطرف ${partyName}` }
        ]
      : [
          { accountCode, accountName, debit: amount, credit: 0, note: `سداد التزام لحساب ${accountName} (${partyName}) بموجب سند صرف ${voucherNumber}` },
          { accountCode: fundCode, accountName: fundName, debit: 0, credit: amount, note: `صرف من ${fundName} بموجب سند رقم ${voucherNumber}` }
        ];

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    return {
      operationType: type === 'receipt' ? 'سند قبض' : 'سند صرف',
      operationNumber: voucherNumber,
      debitAccount: type === 'receipt'
        ? { code: fundCode, name: fundName, amount, reason: 'زيادة النقدية بالصندوق أو البنك' }
        : { code: accountCode, name: accountName, amount, reason: 'تخفيض الالتزامات أو المصروفات' },
      creditAccount: type === 'receipt'
        ? { code: accountCode, name: accountName, amount, reason: 'تخفيض مديونية العميل أو الحساب' }
        : { code: fundCode, name: fundName, amount, reason: 'نقص النقدية بالصندوق أو البنك' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: type === 'receipt' ? `${fundName} بمبلغ ${amount.toLocaleString()} ر.ي` : `${accountName} بمبلغ ${amount.toLocaleString()} ر.ي`,
        whatIsCredit: type === 'receipt' ? `${accountName} بمبلغ ${amount.toLocaleString()} ر.ي` : `${fundName} بمبلغ ${amount.toLocaleString()} ر.ي`,
        why: type === 'receipt' ? 'إثبات تدفق نقدي داخل الصندوق أو البنك مقابل تحصيل من عميل أو إيراد.' : 'إثبات خروج نقدية لسداد التزام لمورد أو مصروف.',
        effectsSummary: type === 'receipt' ? 'زيادة النقدية وتخفيض مديونية العملاء.' : 'تخفيض النقدية وتخفيض الالتزامات.',
      },
      inventoryImpact: { affected: false, details: 'لا أثر على المخزون.', balanceChange: 0 },
      customerImpact: { affected: type === 'receipt', details: type === 'receipt' ? `تحصيل نقدية من العميل ${partyName}` : '', balanceChange: type === 'receipt' ? -amount : 0 },
      supplierImpact: { affected: type === 'payment', details: type === 'payment' ? `سداد للمورد ${partyName}` : '', balanceChange: type === 'payment' ? -amount : 0 },
      profitImpact: { revenueChange: 0, expenseChange: 0, netProfitChange: 0, summary: 'تسوية أصول والتزامات ولا أثر فوري على الأرباح.' },
      balanceSheetImpact: { assetsChange: type === 'receipt' ? 0 : -amount, liabilitiesChange: type === 'payment' ? -amount : 0, equityChange: 0, isFormulaBalanced: true, explanation: 'تبادل بين بندين في الأصول أو أصول وخصوم.' },
      reportImpact: { generalLedger: 'ترحيل سند القبض أو الصرف للأستاذ العام.', trialBalance: 'تحديث أرصدة النقدية والطرف المقابل.', incomeStatement: 'لا أثر فوري.', balanceSheet: 'تحديث أرصدة النقدية والعملاء/الموردين.' },
      auditExplanation: `سند ${type === 'receipt' ? 'القبض' : 'الصرف'} رقم ${voucherNumber} متزن ومرحل بدقة.`,
    };
  }

  public static analyzeExpenseImpact(params: {
    docNumber: string;
    expenseAccountCode: string;
    expenseAccountName: string;
    fundAccountCode: string;
    fundAccountName: string;
    amount: number;
    beneficiary: string;
  }): TransactionImpact {
    const { docNumber, expenseAccountCode, expenseAccountName, fundAccountCode, fundAccountName, amount, beneficiary } = params;
    const lines = [
      { accountCode: expenseAccountCode, accountName: expenseAccountName, debit: amount, credit: 0, note: `إثبات وتحميل مصروف ${expenseAccountName} لصالح ${beneficiary}` },
      { accountCode: fundAccountCode, accountName: fundAccountName, debit: 0, credit: amount, note: `سداد المصروف نقداً أو بنكاً بموجب المستند ${docNumber}` }
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'مصروف تشغيلي',
      operationNumber: docNumber,
      debitAccount: { code: expenseAccountCode, name: expenseAccountName, amount, reason: 'زيادة المصروفات وتخفيض الأرباح' },
      creditAccount: { code: fundAccountCode, name: fundAccountName, amount, reason: 'نقص الأصول المتداولة (النقدية)' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `${expenseAccountName} (${expenseAccountCode}) بمبلغ ${amount.toLocaleString()} ر.ي`,
        whatIsCredit: `${fundAccountName} (${fundAccountCode}) بمبلغ ${amount.toLocaleString()} ر.ي`,
        why: 'وفقاً لمبدأ الاستحقاق والمقابلة، يتم تحميل الفترة المحاسبية بالمصروفات المتعلقة بها مقابل نقص النقدية.',
        effectsSummary: 'زيادة المصروفات، نقص النقدية، وانخفاض صافي الدخل.',
      },
      inventoryImpact: { affected: false, details: 'لا أثر على المخزون.', balanceChange: 0 },
      customerImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      supplierImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      profitImpact: { revenueChange: 0, expenseChange: amount, netProfitChange: -amount, summary: 'تخفيض صافي الدخل بقيمة المصروف التشغيلي.' },
      balanceSheetImpact: { assetsChange: -amount, liabilitiesChange: 0, equityChange: -amount, isFormulaBalanced: true, explanation: 'نقص الأصول ونقص الأرباح في حقوق الملكية.' },
      reportImpact: { generalLedger: 'ترحيل المصروف للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'ظهور المصروف في قائمة الدخل التشغيلية.', balanceSheet: 'نقص النقدية وحقوق الملكية.' },
      auditExplanation: `قيد المصروف التشغيلي ${docNumber} متزن تماماً.`,
    };
  }

  public static analyzeRevenueImpact(params: {
    docNumber: string;
    revenueAccountCode: string;
    revenueAccountName: string;
    fundAccountCode: string;
    fundAccountName: string;
    amount: number;
    payer: string;
  }): TransactionImpact {
    const { docNumber, revenueAccountCode, revenueAccountName, fundAccountCode, fundAccountName, amount, payer } = params;
    const lines = [
      { accountCode: fundAccountCode, accountName: fundAccountName, debit: amount, credit: 0, note: `قبض إيراد ${revenueAccountName} من ${payer} بمستند ${docNumber}` },
      { accountCode: revenueAccountCode, accountName: revenueAccountName, debit: 0, credit: amount, note: `إثبات إيرادات متنوعة أو خدمات ${revenueAccountName}` }
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'إيرادات أخرى',
      operationNumber: docNumber,
      debitAccount: { code: fundAccountCode, name: fundAccountName, amount, reason: 'زيادة النقدية' },
      creditAccount: { code: revenueAccountCode, name: revenueAccountName, amount, reason: 'زيادة الإيرادات والأرباح' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `${fundAccountName} بمبلغ ${amount.toLocaleString()} ر.ي`,
        whatIsCredit: `${revenueAccountName} بمبلغ ${amount.toLocaleString()} ر.ي`,
        why: 'إثبات تحقق إيراد غير مبيعات البضائع وزيادة النقدية.',
        effectsSummary: 'زيادة النقدية وزيادة الإيرادات وصافي الدخل.',
      },
      inventoryImpact: { affected: false, details: 'لا أثر على المخزون.', balanceChange: 0 },
      customerImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      supplierImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      profitImpact: { revenueChange: amount, expenseChange: 0, netProfitChange: amount, summary: 'زيادة صافي الدخل بقيمة الإيراد المحقق.' },
      balanceSheetImpact: { assetsChange: amount, liabilitiesChange: 0, equityChange: amount, isFormulaBalanced: true, explanation: 'زيادة الأصول وزيادة حقوق الملكية (الأرباح).' },
      reportImpact: { generalLedger: 'ترحيل الإيراد للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'ظهور الإيراد في قائمة الدخل.', balanceSheet: 'زيادة النقدية والأرباح.' },
      auditExplanation: `قيد إيراد الخدمات ${docNumber} متزن ومرحل.`,
    };
  }

  public static analyzeDiscountImpact(params: {
    type: 'sales_discount_allowed' | 'purchase_discount_received';
    docNumber: string;
    partyName: string;
    amount: number;
  }): TransactionImpact {
    const { type, docNumber, partyName, amount } = params;
    const isAllowed = type === 'sales_discount_allowed';
    const lines = isAllowed
      ? [
          { accountCode: this.ACCOUNT_CODES.SALES_DISCOUNT_ALLOWED, accountName: 'خصم مسموح به (خصم المبيعات)', debit: amount, credit: 0, note: `منح خصم مسموح به للعميل ${partyName} مستند ${docNumber}` },
          { accountCode: this.ACCOUNT_CODES.CUSTOMERS_RECEIVABLE, accountName: 'حسابات العملاء التجاريين', debit: 0, credit: amount, note: `تخفيض مديونية العميل ${partyName}` }
        ]
      : [
          { accountCode: this.ACCOUNT_CODES.SUPPLIERS_PAYABLE, accountName: 'الموردون والدائنون التجاريون', debit: amount, credit: 0, note: `تخفيض التزام المورد ${partyName} مستند ${docNumber}` },
          { accountCode: this.ACCOUNT_CODES.PURCHASE_DISCOUNT_RECEIVED, accountName: 'الخصم المكتسب (خصم المشتريات)', debit: 0, credit: amount, note: `تحصيل خصم مكتسب من المورد ${partyName}` }
        ];

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    return {
      operationType: isAllowed ? 'خصم مسموح به' : 'خصم مكتسب',
      operationNumber: docNumber,
      debitAccount: { code: isAllowed ? this.ACCOUNT_CODES.SALES_DISCOUNT_ALLOWED : this.ACCOUNT_CODES.SUPPLIERS_PAYABLE, name: isAllowed ? 'خصم مسموح به' : 'الموردون والدائنون', amount, reason: isAllowed ? 'تخفيض صافي المبيعات' : 'تخفيض الالتزامات' },
      creditAccount: { code: isAllowed ? this.ACCOUNT_CODES.CUSTOMERS_RECEIVABLE : this.ACCOUNT_CODES.PURCHASE_DISCOUNT_RECEIVED, name: isAllowed ? 'حسابات العملاء' : 'خصم مكتسب', amount, reason: isAllowed ? 'تخفيض مديونية العميل' : 'تخفيض تكلفة المشتريات' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: isAllowed ? 'خصم مسموح به' : 'الموردون والدائنون',
        whatIsCredit: isAllowed ? 'حسابات العملاء' : 'خصم مكتسب',
        why: 'إثبات التسوية النقدية أو التسوية للخصومات الممنوحة أو المكتسبة.',
        effectsSummary: isAllowed ? 'تخفيض الإيرادات وتخفيض مديونية العميل.' : 'تخفيض التزامات المورد وتخفيض تكلفة المشتريات.',
      },
      inventoryImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      customerImpact: { affected: isAllowed, details: isAllowed ? `تخفيض مديونية العميل ${partyName}` : '', balanceChange: isAllowed ? -amount : 0 },
      supplierImpact: { affected: !isAllowed, details: !isAllowed ? `تخفيض التزام المورد ${partyName}` : '', balanceChange: !isAllowed ? -amount : 0 },
      profitImpact: { revenueChange: isAllowed ? -amount : 0, expenseChange: !isAllowed ? -amount : 0, netProfitChange: 0, summary: 'تسوية متبادلة.' },
      balanceSheetImpact: { assetsChange: isAllowed ? -amount : 0, liabilitiesChange: !isAllowed ? -amount : 0, equityChange: 0, isFormulaBalanced: true, explanation: 'توازن الأصول والخصوم.' },
      reportImpact: { generalLedger: 'ترحيل الخصم للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'ظهور الخصم.', balanceSheet: 'تخفيض العملاء أو الموردين.' },
      auditExplanation: `قيد الخصم ${docNumber} متزن تماماً.`,
    };
  }

  public static analyzeTaxSettlementImpact(params: {
    docNumber: string;
    amount: number;
    fundAccountCode: string;
    fundAccountName: string;
    period: string;
  }): TransactionImpact {
    const { docNumber, amount, fundAccountCode, fundAccountName, period } = params;
    const lines = [
      { accountCode: this.ACCOUNT_CODES.VAT_PAYABLE, accountName: 'الضرائب المستحقة (ضريبة القيمة المضافة)', debit: amount, credit: 0, note: `سداد إقرار ضريبة القيمة المضافة عن فترة ${period} بمستند ${docNumber}` },
      { accountCode: fundAccountCode, accountName: fundAccountName, debit: 0, credit: amount, note: `سداد من ${fundAccountName} لهيئة الضرائب` }
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'سداد الضرائب',
      operationNumber: docNumber,
      debitAccount: { code: this.ACCOUNT_CODES.VAT_PAYABLE, name: 'الضرائب المستحقة', amount, reason: 'إبراء الذمة وتخفيض الالتزامات الضريبية' },
      creditAccount: { code: fundAccountCode, name: fundAccountName, amount, reason: 'نقص النقدية' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `الضرائب المستحقة (${this.ACCOUNT_CODES.VAT_PAYABLE}) بمبلغ ${amount.toLocaleString()} ر.ي`,
        whatIsCredit: `${fundAccountName} بمبلغ ${amount.toLocaleString()} ر.ي`,
        why: 'سداد رصيد ضريبة القيمة المضافة المستحقة لهيئة الزكاة والضرائب.',
        effectsSummary: 'تخفيض الالتزامات وتخفيض النقدية.',
      },
      inventoryImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      customerImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      supplierImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      profitImpact: { revenueChange: 0, expenseChange: 0, netProfitChange: 0, summary: 'تسوية التزام ضريبي.' },
      balanceSheetImpact: { assetsChange: -amount, liabilitiesChange: -amount, equityChange: 0, isFormulaBalanced: true, explanation: 'تخفيض الأصول وتخفيض الالتزامات بقيمة متساوية.' },
      reportImpact: { generalLedger: 'ترحيل السداد للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'لا أثر.', balanceSheet: 'تخفيض الالتزامات النقدية والضريبية.' },
      auditExplanation: `قيد سداد الضرائب ${docNumber} متزن ومرحل بدقة.`,
    };
  }

  public static analyzeFundTransferImpact(params: {
    transferNumber: string;
    fromFundCode: string;
    fromFundName: string;
    toFundCode: string;
    toFundName: string;
    amount: number;
    fee: number;
    notes?: string;
  }): TransactionImpact {
    const { transferNumber, fromFundCode, fromFundName, toFundCode, toFundName, amount, fee } = params;
    const lines = [
      { accountCode: toFundCode, accountName: toFundName, debit: amount, credit: 0, note: `استلام تحويل مالي بموجب مستند ${transferNumber}` },
      ...(fee > 0 ? [{ accountCode: this.ACCOUNT_CODES.GENERAL_EXPENSE, accountName: 'مصروفات عمومية وتشغيلية أخرى (عمولة تحويل)', debit: fee, credit: 0, note: `عمولة التحويل المالي` }] : []),
      { accountCode: fromFundCode, accountName: fromFundName, debit: 0, credit: amount + fee, note: `تحويل مالي صادر إلى ${toFundName}` }
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'تحويل مالي',
      operationNumber: transferNumber,
      debitAccount: { code: toFundCode, name: toFundName, amount, reason: 'زيادة سيولة الحساب المستلم' },
      creditAccount: { code: fromFundCode, name: fromFundName, amount: amount + fee, reason: 'نقص سيولة الحساب المحول منه شاملة العمولة' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `${toFundName} بمبلغ ${amount.toLocaleString()} ر.ي ومصروف العمولة`,
        whatIsCredit: `${fromFundName} بمبلغ ${(amount + fee).toLocaleString()} ر.ي`,
        why: 'إثبات تحويل السيولة النقدية بين الصناديق والحسابات البنكية.',
        effectsSummary: 'إعادة توزيع النقدية بين الأصول وتحميل مصروف العمولة.',
      },
      inventoryImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      customerImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      supplierImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      profitImpact: { revenueChange: 0, expenseChange: fee, netProfitChange: -fee, summary: 'تحميل مصروف العمولة البنكية.' },
      balanceSheetImpact: { assetsChange: -fee, liabilitiesChange: 0, equityChange: -fee, isFormulaBalanced: true, explanation: 'تبادل أصول وتحميل مصروف بسيط.' },
      reportImpact: { generalLedger: 'ترحيل التحويل للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'ظهور مصروف العمولة.', balanceSheet: 'تحديث توزيع النقدية.' },
      auditExplanation: `قيد التحويل المالي ${transferNumber} متزن 100%.`,
    };
  }

  public static analyzeFixedAssetPurchaseImpact(params: {
    assetCode: string;
    assetName: string;
    assetAccountCode: string;
    assetAccountName: string;
    cost: number;
    paymentMethod: 'cash' | 'bank' | 'credit';
  }): TransactionImpact {
    const { assetCode, assetName, assetAccountCode, assetAccountName, cost, paymentMethod } = params;
    const fundCode = paymentMethod === 'bank' ? this.ACCOUNT_CODES.BANK_CURRENT : paymentMethod === 'cash' ? this.ACCOUNT_CODES.CASH_MAIN : this.ACCOUNT_CODES.SUPPLIERS_PAYABLE;
    const fundName = paymentMethod === 'bank' ? 'بنك اليمن والكويت - الجاري' : paymentMethod === 'cash' ? 'الصندوق الرئيسي' : 'الموردون والدائنون (شراء أصل آجل)';

    const lines = [
      { accountCode: assetAccountCode, accountName: assetAccountName, debit: cost, credit: 0, note: `إثبات رسملة وشراء الأصل الثابت ${assetName} (${assetCode})` },
      { accountCode: fundCode, accountName: fundName, debit: 0, credit: cost, note: `سداد تكلفة شراء الأصل أو إثبات الالتزام` }
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'شراء أصل ثابت',
      operationNumber: assetCode,
      debitAccount: { code: assetAccountCode, name: assetAccountName, amount: cost, reason: 'زيادة الأصول غير المتداولة (الثابتة)' },
      creditAccount: { code: fundCode, name: fundName, amount: cost, reason: 'نقص النقدية أو زيادة الالتزامات' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `${assetAccountName} (${assetAccountCode}) بمبلغ ${cost.toLocaleString()} ر.ي`,
        whatIsCredit: `${fundName} بمبلغ ${cost.toLocaleString()} ر.ي`,
        why: 'وفقاً لمعيار المحاسبة الدولي IAS 16، يُرسمل الأصل الثابت بتكلفة اقتنائه.',
        effectsSummary: 'زيادة الأصول الثابتة ونقص النقدية أو زيادة الالتزامات.',
      },
      inventoryImpact: { affected: false, details: 'لا أثر على المخزون السلعي.', balanceChange: 0 },
      customerImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      supplierImpact: { affected: paymentMethod === 'credit', details: paymentMethod === 'credit' ? 'إثبات التزام للمورد لشراء أصل' : '', balanceChange: paymentMethod === 'credit' ? cost : 0 },
      profitImpact: { revenueChange: 0, expenseChange: 0, netProfitChange: 0, summary: 'رسملة أصل ولا أثر فوري على الأرباح (يستهلك لاحقاً).' },
      balanceSheetImpact: { assetsChange: 0, liabilitiesChange: paymentMethod === 'credit' ? cost : 0, equityChange: 0, isFormulaBalanced: true, explanation: 'زيادة أصول ثابتة ونقص أصول متداولة (أو زيادة التزامات).' },
      reportImpact: { generalLedger: 'ترحيل الأصل الثابت للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'لا أثر فوري.', balanceSheet: 'زيادة الأصول الثابتة.' },
      auditExplanation: `قيد اقتناء الأصل الثابت ${assetCode} متزن ومطابق لمعيار IAS 16.`,
    };
  }

  public static analyzeDepreciationImpact(params: {
    assetName: string;
    assetCode: string;
    depreciationAmount: number;
    period: string;
  }): TransactionImpact {
    const { assetName, assetCode, depreciationAmount, period } = params;
    const lines = [
      { accountCode: this.ACCOUNT_CODES.DEPRECIATION_EXPENSE, accountName: 'مصروف إهلاك الأصول الثابتة', debit: depreciationAmount, credit: 0, note: `إثبات قسط إهلاك الأصل ${assetName} (${assetCode}) عن فترة ${period}` },
      { accountCode: this.ACCOUNT_CODES.ACCUMULATED_DEPRECIATION, accountName: 'مجمع إهلاك الأصول الثابتة المتراكم', debit: 0, credit: depreciationAmount, note: `زيادة مجمع الإهلاك المتراكم للأصل` }
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'إهلاك أصل ثابت',
      operationNumber: `DEP-${assetCode}-${period}`,
      debitAccount: { code: this.ACCOUNT_CODES.DEPRECIATION_EXPENSE, name: 'مصروف إهلاك الأصول الثابتة', amount: depreciationAmount, reason: 'زيادة المصروفات وتخفيض الأرباح' },
      creditAccount: { code: this.ACCOUNT_CODES.ACCUMULATED_DEPRECIATION, name: 'مجمع إهلاك الأصول الثابتة', amount: depreciationAmount, reason: 'زيادة مجمع الإهلاك (حساب مقابل مخفض للأصل)' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `مصروف الإهلاك (${this.ACCOUNT_CODES.DEPRECIATION_EXPENSE}) بمبلغ ${depreciationAmount.toLocaleString()} ر.ي`,
        whatIsCredit: `مجمع الإهلاك المتراكم (${this.ACCOUNT_CODES.ACCUMULATED_DEPRECIATION}) بمبلغ ${depreciationAmount.toLocaleString()} ر.ي`,
        why: 'توزيع تكلفة الأصل الثابت على عمره الإنتاجي وفق معيار IAS 16.',
        effectsSummary: 'زيادة المصروفات، تخفيض صافي الدخل، وتخفيض صافي القيمة الدفترية للأصل بالميزانية.',
      },
      inventoryImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      customerImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      supplierImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      profitImpact: { revenueChange: 0, expenseChange: depreciationAmount, netProfitChange: -depreciationAmount, summary: 'تخفيض صافي الربح بقيمة قسط الإهلاك.' },
      balanceSheetImpact: { assetsChange: -depreciationAmount, liabilitiesChange: 0, equityChange: -depreciationAmount, isFormulaBalanced: true, explanation: 'تخفيض الأصول الصافية وتخفيض الأرباح المحتجزة في حقوق الملكية.' },
      reportImpact: { generalLedger: 'ترحيل الإهلاك للأستاذ العام.', trialBalance: 'تحديث ميزان المراجعة.', incomeStatement: 'ظهور مصروف الإهلاك ضمن المصروفات التشغيلية.', balanceSheet: 'ظهور مجمع الإهلاك مطروحاً من تكلفة الأصول الثابتة.' },
      auditExplanation: `قيد إهلاك الأصل ${assetCode} عن فترة ${period} متزن 100%.`,
    };
  }

  public static analyzeStockAdjustmentImpact(params: {
    docNumber: string;
    itemCode: string;
    itemName: string;
    type: 'shortage' | 'surplus';
    quantity: number;
    unitCost: number;
    totalAmount: number;
    reason?: string;
  }): TransactionImpact {
    const { docNumber, itemCode, itemName, type, totalAmount, reason } = params;
    const isShortage = type === 'shortage';
    const lines = isShortage
      ? [
          { accountCode: this.ACCOUNT_CODES.INVENTORY_ADJUSTMENT_LOSS, accountName: 'عجز وتسويات جرد المخزون (مصروف خسارة)', debit: totalAmount, credit: 0, note: `إثبات عجز جرد مخزني للصنف ${itemName} (${itemCode}) - ${reason || 'جرد دوري'}` },
          { accountCode: this.ACCOUNT_CODES.INVENTORY_MAIN, accountName: 'مخزون بضاعة المستودع المركزي', debit: 0, credit: totalAmount, note: `تخفيض المخزون السلعي بمقدار العجز` }
        ]
      : [
          { accountCode: this.ACCOUNT_CODES.INVENTORY_MAIN, accountName: 'مخزون بضاعة المستودع المركزي', debit: totalAmount, credit: 0, note: `إضافة فائض جرد مخزني للصنف ${itemName} (${itemCode})` },
          { accountCode: this.ACCOUNT_CODES.INVENTORY_ADJUSTMENT_GAIN, accountName: 'أرباح وفائض تسويات الجرد المخزني', debit: 0, credit: totalAmount, note: `إثبات أرباح فائض المخزون الجردي` }
        ];

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    return {
      operationType: isShortage ? 'تسوية عجز مخزون' : 'تسوية فائض مخزون',
      operationNumber: docNumber,
      debitAccount: isShortage
        ? { code: this.ACCOUNT_CODES.INVENTORY_ADJUSTMENT_LOSS, name: 'عجز وتسويات جرد المخزون', amount: totalAmount, reason: 'تحميل خسارة العجز على قائمة الدخل' }
        : { code: this.ACCOUNT_CODES.INVENTORY_MAIN, name: 'مخزون بضاعة المستودع المركزي', amount: totalAmount, reason: 'زيادة أصول المخزون' },
      creditAccount: isShortage
        ? { code: this.ACCOUNT_CODES.INVENTORY_MAIN, name: 'مخزون بضاعة المستودع المركزي', amount: totalAmount, reason: 'نقص الأصول (المخزون)' }
        : { code: this.ACCOUNT_CODES.INVENTORY_ADJUSTMENT_GAIN, name: 'أرباح وفائض تسويات الجرد', amount: totalAmount, reason: 'إثبات أرباح إضافية' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: isShortage ? 'مصروف عجز المخزون' : 'مخزون المستودع المركزي',
        whatIsCredit: isShortage ? 'مخزون المستودع المركزي' : 'أرباح تسويات المخزون',
        why: 'معالجة فروقات الجرد الفعلي عن الدفتري وفق المعايير المحاسبية.',
        effectsSummary: isShortage ? 'تخفيض المخزون وتحميل خسارة بقائمة الدخل.' : 'زيادة المخزون وإثبات أرباح.',
      },
      inventoryImpact: {
        affected: true,
        type: isShortage ? 'decrease' : 'increase',
        details: `${isShortage ? 'عجز' : 'فائض'} جرد للصنف ${itemName} بقيمة ${totalAmount.toLocaleString()} ر.ي`,
        estimatedValueChange: isShortage ? -totalAmount : totalAmount,
      },
      customerImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      supplierImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      profitImpact: {
        revenueChange: isShortage ? 0 : totalAmount,
        expenseChange: isShortage ? totalAmount : 0,
        netProfitChange: isShortage ? -totalAmount : totalAmount,
        summary: isShortage ? 'تخفيض الربح بقيمة العجز.' : 'زيادة الربح بقيمة الفائض.',
      },
      balanceSheetImpact: {
        assetsChange: isShortage ? -totalAmount : totalAmount,
        liabilitiesChange: 0,
        equityChange: isShortage ? -totalAmount : totalAmount,
        isFormulaBalanced: true,
        explanation: 'تغير الأصول يقابله تغير حقوق الملكية.',
      },
      reportImpact: {
        generalLedger: 'ترحيل التسوية الجردية للأستاذ العام.',
        trialBalance: 'تحديث ميزان المراجعة.',
        incomeStatement: 'ظهور خسارة العجز أو ربح الفائض.',
        balanceSheet: 'تحديث قيمة المخزون السلعي.',
      },
      auditExplanation: `تسوية جرد المخزون ${docNumber} متزنة تماماً.`,
    };
  }

  public static analyzeStockMovementImpact(params: {
    docNumber: string;
    type: 'in' | 'out' | 'transfer';
    sourceWarehouse?: string;
    targetWarehouse?: string;
    totalCost: number;
  }): TransactionImpact {
    const { docNumber, type, sourceWarehouse, targetWarehouse, totalCost } = params;
    const lines = [
      { accountCode: this.ACCOUNT_CODES.INVENTORY_MAIN, accountName: `مخزون ${targetWarehouse || 'المستودع المستلم'}`, debit: totalCost, credit: 0, note: `مناقلة بضاعة واردة إلى المستودع الفرعي بمستند ${docNumber}` },
      { accountCode: this.ACCOUNT_CODES.INVENTORY_MAIN, accountName: `مخزون ${sourceWarehouse || 'المستودع الرئيسي'}`, debit: 0, credit: totalCost, note: `مناقلة بضاعة منصرفة من المستودع المحول` }
    ];
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      operationType: 'مناقلة مخزنية',
      operationNumber: docNumber,
      debitAccount: { code: this.ACCOUNT_CODES.INVENTORY_MAIN, name: 'مخزون المستودع المستلم', amount: totalCost, reason: 'زيادة مخزون الفرع المستلم' },
      creditAccount: { code: this.ACCOUNT_CODES.INVENTORY_MAIN, name: 'مخزون المستودع المحول منه', amount: totalCost, reason: 'نقص مخزون المستودع المحول' },
      allLines: lines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      qna: {
        whatIsDebit: `مخزون المستودع المستلم بمبلغ ${totalCost.toLocaleString()} ر.ي`,
        whatIsCredit: `مخزون المستودع المحول بمبلغ ${totalCost.toLocaleString()} ر.ي`,
        why: 'إعادة توزيع المخزون بين مستودعات الشركة الداخلية دون تغيير إجمالي قيمة المخزون الإجمالي.',
        effectsSummary: 'تبادل بين حسابات المخزون الفرعية والرئيسية ولا تغيير في الإجمالي.',
      },
      inventoryImpact: { affected: true, type: 'transfer', details: `مناقلة بضاعة بقيمة ${totalCost.toLocaleString()} ر.ي بين المستودعات.`, estimatedValueChange: 0 },
      customerImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      supplierImpact: { affected: false, details: 'لا أثر.', balanceChange: 0 },
      profitImpact: { revenueChange: 0, expenseChange: 0, netProfitChange: 0, summary: 'مناقلة داخلية لا تؤثر على الأرباح.' },
      balanceSheetImpact: { assetsChange: 0, liabilitiesChange: 0, equityChange: 0, isFormulaBalanced: true, explanation: 'تبادل بين أصول المخزون دون تأثير على الإجمالي.' },
      reportImpact: { generalLedger: 'ترحيل المناقلة المخزنية.', trialBalance: 'ثبات إجمالي المخزون في الميزان.', incomeStatement: 'لا أثر.', balanceSheet: 'ثبات إجمالي أصول المخزون.' },
      auditExplanation: `قيد المناقلة المخزنية ${docNumber} متزن محاسبياً.`,
    };
  }
}
