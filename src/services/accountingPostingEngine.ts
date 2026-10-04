import { Account, JournalEntry, JournalLine, PurchaseInvoice, SalesInvoice, CashVoucher } from '../types';

export interface PostingAccountMap {
  cash: string;
  bank: string;
  customer: string;
  supplier: string;
  inventory: string;
  sales: string;
  cogs: string;
  inputVat: string;
  outputVat: string;
  capital: string;
  salesDiscount: string;
  purchaseDiscount: string;
  rentExpense: string;
  fixedAssetFurniture: string;
  fixedAssetComputers: string;
  fixedAssetVehicles: string;
  accumulatedDepreciation: string;
  depreciationExpense: string;
  loanLiability: string;
}

export interface PostingBuildResult {
  entry: JournalEntry;
  paidAmount: number;
  customerAmount: number;
  supplierAmount: number;
  cogsAmount: number;
}

const round = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

export class AccountingPostingEngine {
  static resolveAccounts(accounts: Account[], mode: 'trade' | 'full' = 'full'): PostingAccountMap {
    const byName = (...names: string[]) => accounts.find(a => a.isSub && names.some(n => a.name.includes(n)));
    const byCode = (code: string) => accounts.find(a => a.isSub && a.code === code);
    const required = (account: Account | undefined, label: string) => {
      if (!account) throw new Error(`الحساب المحاسبي المطلوب غير موجود أو غير قابل للترحيل: ${label}`);
      return account.code;
    };
    const trade = mode === 'trade';
    return {
      cash: required(byName('الصندوق الرئيسي', 'الخزينة'), 'الصندوق'),
      bank: trade ? (byName('بنك اليمن والكويت', 'البنك التجاري', 'البنك')?.code || '') : required(byName('بنك اليمن والكويت', 'البنك التجاري', 'البنك'), 'البنك'),
      customer: required(byName('حسابات العملاء', 'العملاء التجاريين'), 'العملاء'),
      supplier: required(byName('الموردون', 'الموردين'), 'الموردون'),
      inventory: required(byName('مخزون بضاعة', 'المخزون السلعي'), 'المخزون'),
      sales: required(byName('مبيعات المنتجات', 'المبيعات'), 'المبيعات'),
      cogs: required(byName('تكلفة المبيعات'), 'تكلفة المبيعات'),
      inputVat: byName('ضريبة المدخلات', 'الضرائب المستحقة')?.code || '',
      outputVat: byName('ضريبة المخرجات', 'ضريبة المبيعات')?.code || '',
      capital: trade ? (byName('رأس المال')?.code || '') : required(byName('رأس المال'), 'رأس المال'),
      salesDiscount: byName('خصم المبيعات')?.code || '',
      purchaseDiscount: byName('خصم المشتريات', 'خصم مكتسب')?.code || '',
      rentExpense: trade ? (byName('إيجار')?.code || '') : required(byName('إيجار'), 'الإيجار'),
      fixedAssetFurniture: trade ? (byCode('121')?.code || '') : required(byCode('121'), 'الأثاث والمعدات المكتبية'),
      fixedAssetComputers: trade ? (byCode('122')?.code || '') : required(byCode('122'), 'أجهزة الحاسب والشبكات'),
      fixedAssetVehicles: trade ? (byCode('123')?.code || '') : required(byCode('123'), 'المركبات ووسائل النقل'),
      accumulatedDepreciation: trade ? (byCode('129')?.code || '') : required(byCode('129'), 'مجمع الإهلاك'),
      depreciationExpense: trade ? (byCode('524')?.code || '') : required(byCode('524'), 'مصروف الإهلاك'),
      loanLiability: trade ? (byName('قروض', 'قرض')?.code || '') : required(byName('قروض', 'قرض'), 'القروض'),
    };
  }

  private static line(account: Account, debit: number, credit: number, note: string, extra: Partial<JournalLine> = {}): JournalLine {
    return { id: `jl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, accountCode: account.code, accountName: account.name, debit: round(debit), credit: round(credit), note, ...extra };
  }

  private static entry(ref: string, date: string, description: string, financialYear: number, actor: string, lines: JournalLine[]): JournalEntry {
    const debitTotal = round(lines.reduce((s,l)=>s+l.debit,0));
    const creditTotal = round(lines.reduce((s,l)=>s+l.credit,0));
    if (Math.abs(debitTotal-creditTotal) > 0.01) throw new Error(`فشل توازن القيد ${ref}: المدين ${debitTotal} والدائن ${creditTotal}`);
    return { id:`je-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, entryNumber:'', date, reference:ref, description, debitTotal, creditTotal, financialYear, createdBy:actor, createdAt:new Date().toISOString().replace('T',' ').slice(0,19), status:'posted', sourceType: lines.find(l=>l.sourceType)?.sourceType, sourceId: lines.find(l=>l.sourceId)?.sourceId, currency: lines.find(l=>l.currency)?.currency, lines };
  }

  static salesInvoice(inv: SalesInvoice, accounts: Account[], actor: string, cogsAmount = 0): PostingBuildResult {
    const m=this.resolveAccounts(accounts, 'trade');
    const paid=round(inv.paymentType === 'credit' || inv.paymentStatus === 'credit' ? 0 : (inv.paymentStatus==='paid' ? inv.grandTotal : inv.paidAmount || 0));
    const customer=round(inv.grandTotal-paid);
    const lines:JournalLine[]=[];
    const cashAcc=accounts.find(a=>a.code===m.cash)!;
    const customerAcc=accounts.find(a=>a.code===m.customer)!;
    const salesAcc=accounts.find(a=>a.code===m.sales)!;
    const cogsAcc=accounts.find(a=>a.code===m.cogs)!;
    const inventoryAcc=accounts.find(a=>a.code===m.inventory)!;
    if(paid>0) lines.push(this.line(inv.cashAccountCode ? (accounts.find(a=>a.code===inv.cashAccountCode) || cashAcc) : cashAcc,paid,0,`التحصيل المرتبط بفاتورة ${inv.invoiceNumber}`,{sourceType:'sales_invoice',sourceId:inv.id,currency:inv.currency}));
    if(customer>0) lines.push(this.line(customerAcc,customer,0,`رصيد مستحق على العميل ${inv.customerName}`,{customerId:inv.customerId,sourceType:'sales_invoice',sourceId:inv.id,currency:inv.currency}));
    const grossSales=round(inv.subtotal);
    const netSales=round(inv.subtotal-inv.discountTotal);
    const discountAcc=inv.discountTotal>0 && m.salesDiscount ? accounts.find(a=>a.code===m.salesDiscount) : undefined;
    if(grossSales>0) lines.push(this.line(salesAcc,0,discountAcc ? grossSales : netSales,`إيراد المبيعات للفاتورة ${inv.invoiceNumber}`,{sourceType:'sales_invoice',sourceId:inv.id,currency:inv.currency}));
    if(inv.taxTotal>0) {
      const vatAcc=accounts.find(a=>a.code===m.outputVat);
      if(vatAcc) lines.push(this.line(vatAcc,0,inv.taxTotal,`ضريبة مخرجات الفاتورة ${inv.invoiceNumber}`,{sourceType:'sales_invoice',sourceId:inv.id}));
    }
    if(inv.discountTotal>0 && discountAcc) lines.push(this.line(discountAcc,inv.discountTotal,0,`خصم مبيعات الفاتورة ${inv.invoiceNumber}`,{customerId:inv.customerId,sourceType:'sales_invoice',sourceId:inv.id,currency:inv.currency}));
    cogsAmount=round(cogsAmount);
    if(cogsAmount>0) {
      lines.push(this.line(cogsAcc,cogsAmount,0,`تكلفة المبيعات للفاتورة ${inv.invoiceNumber}`,{sourceType:'sales_invoice',sourceId:inv.id}));
      lines.push(this.line(inventoryAcc,0,cogsAmount,`خروج المخزون للفاتورة ${inv.invoiceNumber}`,{itemCode:inv.items[0]?.itemCode,sourceType:'sales_invoice',sourceId:inv.id}));
    }
    return {entry:this.entry(`SINV-${inv.invoiceNumber}`,inv.date,`ترحيل فاتورة مبيعات ${inv.invoiceNumber}`,inv.financialYear||new Date(inv.date).getFullYear(),actor,lines),paidAmount:paid,customerAmount:customer,supplierAmount:0,cogsAmount};
  }

  static purchaseInvoice(inv: PurchaseInvoice, accounts: Account[], actor: string): PostingBuildResult {
    const m=this.resolveAccounts(accounts, 'trade');
    const paid=round(inv.paymentType === 'credit' || inv.paymentStatus === 'credit' ? 0 : (inv.paymentStatus==='paid' ? inv.grandTotal : inv.paidAmount || 0));
    const supplier=round(inv.grandTotal-paid);
    const netInventory=round(inv.subtotal-inv.discountTotal);
    const lines:JournalLine[]=[];
    const invAcc=accounts.find(a=>a.code===m.inventory)!;
    const supplierAcc=accounts.find(a=>a.code===m.supplier)!;
    const cashAcc=accounts.find(a=>a.code===m.cash)!;
    lines.push(this.line(invAcc,netInventory,0,`إثبات تكلفة المخزون الصافية لفاتورة ${inv.invoiceNumber}`,{sourceType:'purchase_invoice',sourceId:inv.id}));
    if(inv.taxTotal>0) {
      const vatAcc=accounts.find(a=>a.code===m.inputVat);
      if(vatAcc) lines.push(this.line(vatAcc,inv.taxTotal,0,`ضريبة مدخلات الفاتورة ${inv.invoiceNumber}`,{sourceType:'purchase_invoice',sourceId:inv.id}));
    }
    if(paid>0) lines.push(this.line(inv.cashAccountCode ? (accounts.find(a=>a.code===inv.cashAccountCode) || cashAcc) : cashAcc,0,paid,`السداد النقدي لفاتورة ${inv.invoiceNumber}`,{sourceType:'purchase_invoice',sourceId:inv.id,currency:inv.currency}));
    if(supplier>0) lines.push(this.line(supplierAcc,0,supplier,`الرصيد المستحق للمورد ${inv.supplierName}`,{supplierId:inv.supplierId,sourceType:'purchase_invoice',sourceId:inv.id}));
    return {entry:this.entry(`PINV-${inv.invoiceNumber}`,inv.date,`ترحيل فاتورة مشتريات ${inv.invoiceNumber}`,inv.financialYear||new Date(inv.date).getFullYear(),actor,lines),paidAmount:paid,customerAmount:0,supplierAmount:supplier,cogsAmount:0};
  }

  static salesReturn(ret: any, accounts: Account[], actor: string, cogsAmount: number): JournalEntry {
    const m=this.resolveAccounts(accounts, 'trade');
    const customer=accounts.find(a=>a.code===m.customer)!;
    const sales=accounts.find(a=>a.code===m.sales)!;
    const cogs=accounts.find(a=>a.code===m.cogs)!;
    const inventory=accounts.find(a=>a.code===m.inventory)!;
    const cash=accounts.find(a=>a.code===ret.cashAccountCode)||accounts.find(a=>a.code===m.cash)!;
    const refund=round(ret.grandTotal);
    const cashRefund=ret.paymentType==='cash' || ret.paymentStatus==='paid' ? round(ret.paidAmount ?? refund) : 0;
    const creditRefund=round(refund-cashRefund);
    const returnDiscountAcc=ret.discountTotal>0 && m.salesDiscount ? accounts.find(a=>a.code===m.salesDiscount) : undefined;
    const returnSalesValue=returnDiscountAcc ? round(ret.subtotal) : refund;
    const lines:JournalLine[]=[this.line(sales,returnSalesValue,0,`مردود مبيعات ${ret.returnNumber}`,{customerId:ret.customerId,sourceType:'sales_return',sourceId:ret.id,currency:ret.currency})];
    if(creditRefund>0) lines.push(this.line(customer,0,creditRefund,`تخفيض رصيد العميل ${ret.customerName}`,{customerId:ret.customerId,sourceType:'sales_return',sourceId:ret.id,currency:ret.currency}));
    if(cashRefund>0) lines.push(this.line(cash,0,cashRefund,`رد نقدي للعميل ${ret.customerName}`,{customerId:ret.customerId,sourceType:'sales_return',sourceId:ret.id,currency:ret.currency}));
    if(ret.taxTotal>0){ const vat=accounts.find(a=>a.code===m.outputVat); if(vat) lines.push(this.line(vat,ret.taxTotal,0,`عكس ضريبة مخرجات مردود ${ret.returnNumber}`,{customerId:ret.customerId,sourceType:'sales_return',sourceId:ret.id,currency:ret.currency})); }
    if(ret.discountTotal>0 && returnDiscountAcc) { const discAcc=returnDiscountAcc; lines.push(this.line(discAcc,0,ret.discountTotal,`عكس خصم مبيعات المرتجع ${ret.returnNumber}`,{customerId:ret.customerId,sourceType:'sales_return',sourceId:ret.id,currency:ret.currency})); }
    if(cogsAmount>0){ lines.push(this.line(inventory,cogsAmount,0,`إعادة تكلفة المرتجع إلى المخزون ${ret.returnNumber}`,{sourceType:'sales_return',sourceId:ret.id,currency:ret.currency})); lines.push(this.line(cogs,0,cogsAmount,`عكس تكلفة المبيعات للمرتجع ${ret.returnNumber}`,{sourceType:'sales_return',sourceId:ret.id,currency:ret.currency})); }
    return this.entry(`SRET-${ret.returnNumber}`,ret.date,`ترحيل مردود مبيعات ${ret.returnNumber}`,ret.financialYear||new Date(ret.date).getFullYear(),actor,lines);
  }
  static purchaseReturn(ret: any, accounts: Account[], actor: string): JournalEntry {
    const m=this.resolveAccounts(accounts, 'trade');
    const supplier=accounts.find(a=>a.code===m.supplier)!;
    const inventory=accounts.find(a=>a.code===m.inventory)!;
    const cash=accounts.find(a=>a.code===ret.cashAccountCode)||accounts.find(a=>a.code===m.cash)!;
    const refund=round(ret.grandTotal);
    const cashRefund=ret.paymentType==='cash' || ret.paymentStatus==='paid' ? round(ret.paidAmount ?? refund) : 0;
    const supplierRefund=round(refund-cashRefund);
    const lines:JournalLine[]=[];
    if(supplierRefund>0) lines.push(this.line(supplier,supplierRefund,0,`تخفيض رصيد المورد ${ret.supplierName}`,{supplierId:ret.supplierId,sourceType:'purchase_return',sourceId:ret.id,currency:ret.currency}));
    if(cashRefund>0) lines.push(this.line(cash,cashRefund,0,`استرداد نقدي من المورد ${ret.supplierName}`,{supplierId:ret.supplierId,sourceType:'purchase_return',sourceId:ret.id,currency:ret.currency}));
    const net=Number(ret.subtotal)||0;
    if(net>0) lines.push(this.line(inventory,0,net,`إخراج مخزون مردود المشتريات ${ret.returnNumber}`,{itemCode:ret.items?.[0]?.itemCode,sourceType:'purchase_return',sourceId:ret.id,currency:ret.currency}));
    if(ret.taxTotal>0){ const vat=accounts.find(a=>a.code===m.inputVat); if(vat) lines.push(this.line(vat,0,ret.taxTotal,`عكس ضريبة مدخلات مردود ${ret.returnNumber}`,{supplierId:ret.supplierId,sourceType:'purchase_return',sourceId:ret.id,currency:ret.currency})); }
    return this.entry(`PRET-${ret.returnNumber}`,ret.date,`ترحيل مردود مشتريات ${ret.returnNumber}`,ret.financialYear||new Date(ret.date).getFullYear(),actor,lines);
  }
  static transfer(params:{date:string,amount:number,fromAccountCode:string,toAccountCode:string,reference:string,financialYear:number,actor:string,description?:string},accounts:Account[]): JournalEntry {
    if(params.amount<=0) throw new Error('مبلغ التحويل يجب أن يكون أكبر من صفر.');
    const from=accounts.find(a=>a.code===params.fromAccountCode&&a.isSub);
    const to=accounts.find(a=>a.code===params.toAccountCode&&a.isSub);
    if(!from||!to) throw new Error('حساب التحويل المصدر أو المستلم غير صالح.');
    return this.entry(params.reference,params.date,params.description||'تحويل داخلي بين الحسابات',params.financialYear,params.actor,[
      this.line(to,params.amount,0,'الحساب المستلم',{sourceType:'account_transfer',sourceId:params.reference}),
      this.line(from,0,params.amount,'الحساب المرسل',{sourceType:'account_transfer',sourceId:params.reference})
    ]);
  }

  static loan(params:{date:string,amount:number,loanAccountCode:string,cashAccountCode:string,reference:string,financialYear:number,actor:string,repayment?:boolean},accounts:Account[]): JournalEntry {
    if(params.amount<=0) throw new Error('مبلغ القرض يجب أن يكون أكبر من صفر.');
    const loan=accounts.find(a=>a.code===params.loanAccountCode&&a.isSub);
    const cash=accounts.find(a=>a.code===params.cashAccountCode&&a.isSub);
    if(!loan||!cash) throw new Error('حساب القرض أو الحساب النقدي غير صالح.');
    return params.repayment
      ? this.entry(params.reference,params.date,'سداد أصل قرض',params.financialYear,params.actor,[this.line(loan,params.amount,0,'تخفيض أصل القرض',{sourceType:'loan_repayment',sourceId:params.reference}),this.line(cash,0,params.amount,'سداد أصل القرض',{sourceType:'loan_repayment',sourceId:params.reference})])
      : this.entry(params.reference,params.date,'استلام قرض',params.financialYear,params.actor,[this.line(cash,params.amount,0,'استلام أصل القرض',{sourceType:'loan',sourceId:params.reference}),this.line(loan,0,params.amount,'إثبات التزام القرض',{sourceType:'loan',sourceId:params.reference})]);
  }

  static depreciation(params:{date:string,amount:number,assetAccountCode:string,reference:string,financialYear:number,actor:string},accounts:Account[]): JournalEntry {
    if(params.amount<=0) throw new Error('قيمة الإهلاك يجب أن تكون أكبر من صفر.');
    const expense=accounts.find(a=>a.code==='524'&&a.isSub);
    const accum=accounts.find(a=>a.code==='129'&&a.isSub);
    if(!expense||!accum) throw new Error('حسابا مصروف الإهلاك ومجمع الإهلاك غير موجودين.');
    const asset=accounts.find(a=>a.code===params.assetAccountCode&&a.isSub);
    if(!asset) throw new Error('حساب الأصل الثابت غير صالح.');
    return this.entry(params.reference,params.date,'إثبات مصروف إهلاك أصل ثابت',params.financialYear,params.actor,[this.line(expense,params.amount,0,'مصروف الإهلاك',{sourceType:'depreciation',sourceId:params.reference}),this.line(accum,0,params.amount,'مجمع الإهلاك',{sourceType:'depreciation',sourceId:params.reference})]);
  }

  static fixedAssetPurchase(params:{date:string,amount:number,assetAccountCode:string,paymentAccountCode:string,reference:string,financialYear:number,actor:string},accounts:Account[]): JournalEntry {
    if(params.amount<=0) throw new Error('قيمة الأصل يجب أن تكون أكبر من صفر.');
    const asset=accounts.find(a=>a.code===params.assetAccountCode&&a.isSub);
    const payment=accounts.find(a=>a.code===params.paymentAccountCode&&a.isSub);
    if(!asset||!payment) throw new Error('حساب الأصل أو حساب الدفع غير صالح.');
    return this.entry(params.reference,params.date,'شراء أصل ثابت',params.financialYear,params.actor,[this.line(asset,params.amount,0,'إثبات الأصل الثابت',{sourceType:'fixed_asset_purchase',sourceId:params.reference}),this.line(payment,0,params.amount,'دفع قيمة الأصل',{sourceType:'fixed_asset_purchase',sourceId:params.reference})]);
  }

  static voucher(v: CashVoucher, accounts: Account[], actor: string, cashAccountCode?: string): JournalEntry {
    const m=this.resolveAccounts(accounts);
    const cash=accounts.find(a=>a.code===(cashAccountCode || m.cash))!;
    const party=accounts.find(a=>a.code===v.accountCode);
    if(!party) throw new Error('الحساب المقابل للسند غير موجود في دليل الحسابات.');
    const lines=v.type==='receipt'
      ? [this.line(cash,v.amount,0,`قبض ${v.voucherNumber}`,{sourceType:'cash_voucher',sourceId:v.id}),this.line(party,0,v.amount,`تسوية حساب مقابِل للسند ${v.voucherNumber}`,{sourceType:'cash_voucher',sourceId:v.id})]
      : [this.line(party,v.amount,0,`سداد ${v.voucherNumber}`,{sourceType:'cash_voucher',sourceId:v.id}),this.line(cash,0,v.amount,`صرف ${v.voucherNumber}`,{sourceType:'cash_voucher',sourceId:v.id})];
    return this.entry(`VCH-${v.voucherNumber}`,v.date,`ترحيل ${v.type==='receipt'?'سند قبض':'سند صرف'} ${v.voucherNumber}`,v.financialYear||new Date(v.date).getFullYear(),actor,lines);
  }
}
