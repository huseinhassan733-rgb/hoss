import { db } from '../database/db';
import { Account, Customer, JournalEntry, Supplier } from '../types';

export type ReportId =
  | 'customer_movement' | 'customer_inactive' | 'customer_statement'
  | 'supplier_movement' | 'account_movement' | 'trial_balance'
  | 'expenses_revenues' | 'income_statement' | 'balance_sheet'
  | 'cash_bank' | 'sales' | 'purchases';

export interface ReportFilters {
  from: string;
  to: string;
  currency: string;
  account: string;
  customer: string;
  supplier: string;
  search: string;
  nonZero: boolean;
  inactive: boolean;
}

export interface ReportColumn { key: string; title: string; numeric?: boolean; }
export interface ReportResult {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals: Record<string, number>;
  currencyTotals: Record<string, Record<string, number>>;
  note?: string;
}

const n = (v: unknown) => Number(v) || 0;
const inRange = (date: string, f: ReportFilters) => (!f.from || date >= f.from) && (!f.to || date <= f.to);
const activeJournals = () => db.getJournalEntries().filter(j => j.status !== 'cancelled' && j.status !== 'reversed' && !j.isReversed);

function accountRows(filters: ReportFilters) {
  const accounts = db.getAccounts().filter(a => a.isSub && (!filters.account || a.code === filters.account) && (!filters.currency || a.currency === filters.currency));
  const journals = activeJournals();
  return accounts.map(acc => {
    let opening = 0, debit = 0, credit = 0;
    journals.forEach(j => j.lines.forEach(l => {
      if (l.accountCode !== acc.code) return;
      const d=n(l.debit), c=n(l.credit);
      if (j.date < filters.from) opening += acc.nature === 'debit' ? d-c : c-d;
      else if (inRange(j.date, filters)) { debit += d; credit += c; }
    }));
    const final = opening + (acc.nature === 'debit' ? debit-credit : credit-debit);
    const od=acc.nature==='debit' ? Math.max(opening,0):0, oc=acc.nature==='credit'?Math.max(opening,0):0;
    const fd=acc.nature==='debit' ? Math.max(final,0):0, fc=acc.nature==='credit'?Math.max(final,0):0;
    return { code:acc.code, name:acc.name, currency:acc.currency, openingDebit:od, openingCredit:oc, debit, credit, finalDebit:fd, finalCredit:fc, category:acc.category, level:acc.level };
  });
}

function totals(rows: Record<string,unknown>[]) {
  const keys=['openingDebit','openingCredit','debit','credit','finalDebit','finalCredit','amount','balance'];
  return Object.fromEntries(keys.map(k=>[k,rows.reduce((s,r)=>s+n(r[k]),0)]));
}

function currencyTotals(rows: Record<string,unknown>[]) {
  const out: Record<string,Record<string,number>> = {};
  for(const row of rows){
    const currency=String(row.currency||'');
    if(!currency) continue;
    if(!out[currency]) out[currency]={};
    for(const key of ['openingDebit','openingCredit','debit','credit','finalDebit','finalCredit','amount','balance']){
      out[currency][key]=(out[currency][key]||0)+n(row[key]);
    }
  }
  return out;
}

export function buildReport(id: ReportId, f: ReportFilters): ReportResult {
  if (id==='trial_balance' || id==='account_movement' || id==='expenses_revenues') {
    let rows=accountRows(f);
    if (id==='expenses_revenues') rows=rows.filter(r=>r.category==='expense'||r.category==='revenue');
    if (f.search) rows=rows.filter(r=>String(r.code).includes(f.search)||String(r.name).includes(f.search));
    if (f.nonZero) rows=rows.filter(r=>n(r.openingDebit)+n(r.openingCredit)+n(r.debit)+n(r.credit)+n(r.finalDebit)+n(r.finalCredit)!==0);
    return {
      title:id==='trial_balance'?'ميزان المراجعة':id==='expenses_revenues'?'المصروفات والإيرادات':'حركة وأرصدة الحسابات',
      columns:[
        {key:'code',title:'رقم الحساب'},{key:'name',title:'اسم الحساب'},
        {key:'currency',title:'العملة'},{key:'openingDebit',title:'الرصيد الافتتاحي مدين',numeric:true},
        {key:'openingCredit',title:'الرصيد الافتتاحي دائن',numeric:true},{key:'debit',title:'إجمالي الحركة مدين',numeric:true},
        {key:'credit',title:'إجمالي الحركة دائن',numeric:true},{key:'finalDebit',title:'الرصيد النهائي مدين',numeric:true},
        {key:'finalCredit',title:'الرصيد النهائي دائن',numeric:true}
      ], rows, totals:totals(rows), currencyTotals:currencyTotals(rows)
    };
  }

  if (id==='income_statement') {
    const rows=accountRows(f).filter(r=>r.category==='revenue'||r.category==='expense');
    const revenue=rows.filter(r=>r.category==='revenue').reduce((s,r)=>s+n(r.credit)-n(r.debit),0);
    const expense=rows.filter(r=>r.category==='expense').reduce((s,r)=>s+n(r.debit)-n(r.credit),0);
    return {title:'قائمة الدخل — الأرباح والخسائر',columns:[{key:'code',title:'رقم الحساب'},{key:'name',title:'اسم الحساب'},{key:'category',title:'التصنيف'},{key:'debit',title:'مدين',numeric:true},{key:'credit',title:'دائن',numeric:true}],rows,totals:{...totals(rows),revenue,expense,netProfit:revenue-expense},currencyTotals:currencyTotals(rows)};
  }

  if (id==='balance_sheet') {
    const rows=accountRows(f).filter(r=>['asset','liability','equity'].includes(String(r.category)));
    const incomeRows=accountRows(f).filter(r=>r.category==='revenue'||r.category==='expense');
    const currentProfit=incomeRows.filter(r=>r.category==='revenue').reduce((s,r)=>s+n(r.credit)-n(r.debit),0)-incomeRows.filter(r=>r.category==='expense').reduce((s,r)=>s+n(r.debit)-n(r.credit),0);
    if(Math.abs(currentProfit)>0.0001){
      rows.push({code:'33-CURRENT',name:'ربح/خسارة السنة الحالية',currency:db.getCompanyInfo().defaultCurrency||'YER',openingDebit:0,openingCredit:0,debit:currentProfit<0?-currentProfit:0,credit:currentProfit>0?currentProfit:0,finalDebit:currentProfit<0?-currentProfit:0,finalCredit:currentProfit>0?currentProfit:0,category:'equity',level:2});
    }
    return {title:'قائمة المركز المالي',columns:[{key:'code',title:'رقم الحساب'},{key:'name',title:'اسم الحساب'},{key:'category',title:'التصنيف'},{key:'finalDebit',title:'مدين',numeric:true},{key:'finalCredit',title:'دائن',numeric:true}],rows,totals:totals(rows),currencyTotals:currencyTotals(rows)};
  }

  if (id==='customer_movement' || id==='customer_inactive' || id==='customer_statement') {
    const customers=db.getCustomers();
    const journals=activeJournals();
    let rows=customers.map(customer=>{
      let opening=0, debit=0, credit=0;
      journals.forEach(j=>j.lines.forEach(l=>{
        if(l.customerId!==customer.id) return;
        const d=n(l.debit), cr=n(l.credit);
        if(j.date < f.from) opening += d-cr;
        else if(inRange(j.date,f)){ debit += d; credit += cr; }
      }));
      const final=opening+debit-credit;
      return {
        code:customer.code,name:customer.name,currency:db.getCompanyInfo().defaultCurrency||'',
        openingDebit:Math.max(opening,0),openingCredit:Math.max(-opening,0),
        debit,credit,finalDebit:Math.max(final,0),finalCredit:Math.max(-final,0),balance:final
      };
    });
    if(id==='customer_inactive') rows=rows.filter(r=>n(r.debit)===0&&n(r.credit)===0);
    if(f.customer) rows=rows.filter(r=>String(r.code)===f.customer);
    if(f.search) rows=rows.filter(r=>String(r.code).includes(f.search)||String(r.name).includes(f.search));
    if(f.supplier) rows=rows.filter(r=>String(r.code)===f.supplier);
    if(f.nonZero) rows=rows.filter(r=>n(r.balance)!==0||n(r.debit)!==0||n(r.credit)!==0);
    return {title:id==='customer_inactive'?'أرصدة وحركة العملاء غير المتحركين':id==='customer_statement'?'كشف حساب العملاء':'أرصدة وحركة العملاء المتحركين',columns:[
      {key:'code',title:'رقم العميل'},{key:'name',title:'اسم العميل'},{key:'currency',title:'العملة'},
      {key:'openingDebit',title:'الرصيد الافتتاحي مدين',numeric:true},{key:'openingCredit',title:'الرصيد الافتتاحي دائن',numeric:true},
      {key:'debit',title:'إجمالي الحركة مدين',numeric:true},{key:'credit',title:'إجمالي الحركة دائن',numeric:true},
      {key:'finalDebit',title:'الرصيد النهائي مدين',numeric:true},{key:'finalCredit',title:'الرصيد النهائي دائن',numeric:true}
    ],rows,totals:totals(rows),currencyTotals:currencyTotals(rows)};
  }

  if (id==='supplier_movement') {
    const suppliers=db.getSuppliers();
    const journals=activeJournals();
    let rows=suppliers.map(supplier=>{
      let opening=0, debit=0, credit=0;
      journals.forEach(j=>j.lines.forEach(l=>{
        if(l.supplierId!==supplier.id) return;
        const d=n(l.debit), cr=n(l.credit);
        if(j.date < f.from) opening += cr-d;
        else if(inRange(j.date,f)){ debit += d; credit += cr; }
      }));
      const final=opening+credit-debit;
      return {
        code:supplier.code,name:supplier.name,currency:db.getCompanyInfo().defaultCurrency||'',
        openingDebit:Math.max(-opening,0),openingCredit:Math.max(opening,0),
        debit,credit,finalDebit:Math.max(-final,0),finalCredit:Math.max(final,0),balance:final
      };
    });
    if(f.search) rows=rows.filter(r=>String(r.code).includes(f.search)||String(r.name).includes(f.search));
    if(f.nonZero) rows=rows.filter(r=>n(r.balance)!==0||n(r.debit)!==0||n(r.credit)!==0);
    return {title:'أرصدة وحركة الموردين',columns:[
      {key:'code',title:'رقم المورد'},{key:'name',title:'اسم المورد'},{key:'currency',title:'العملة'},
      {key:'openingDebit',title:'الرصيد الافتتاحي مدين',numeric:true},{key:'openingCredit',title:'الرصيد الافتتاحي دائن',numeric:true},
      {key:'debit',title:'إجمالي الحركة مدين',numeric:true},{key:'credit',title:'إجمالي الحركة دائن',numeric:true},
      {key:'finalDebit',title:'الرصيد النهائي مدين',numeric:true},{key:'finalCredit',title:'الرصيد النهائي دائن',numeric:true}
    ],rows,totals:totals(rows),currencyTotals:{}};
  }

  const journals=activeJournals().filter(j=>inRange(j.date,f));
  if(id==='cash_bank'){
    const codes=new Set(db.getBanksCash().map(x=>x.accountCode));
    const rows=accountRows(f).filter(r=>codes.has(String(r.code)));
    return {title:'حركة وأرصدة الصندوق والبنوك',columns:[
      {key:'code',title:'رقم الحساب'},{key:'name',title:'اسم الحساب'},{key:'currency',title:'العملة'},
      {key:'openingDebit',title:'افتتاحي مدين',numeric:true},{key:'openingCredit',title:'افتتاحي دائن',numeric:true},
      {key:'debit',title:'الحركة مدين',numeric:true},{key:'credit',title:'الحركة دائن',numeric:true},
      {key:'finalDebit',title:'نهائي مدين',numeric:true},{key:'finalCredit',title:'نهائي دائن',numeric:true}
    ],rows,totals:totals(rows),currencyTotals:{}};
  }

  if(id==='sales' || id==='purchases'){
    const relational = db.getSQLiteDocumentReport(id==='sales' ? 'sales_invoice' : 'purchase_invoice', f.from, f.to);
    const rows = relational.length
      ? relational.filter(x=>x.status!=='cancelled').map(x=>({number:String(x.number||''),date:String(x.date||''),party:String(x.party||x.partyId||''),subtotal:n(x.subtotal),tax:n(x.tax),total:n(x.total),status:String(x.status||'')}))
      : (id==='sales'
        ? db.getSalesInvoices().filter(x=>inRange(x.date,f)&&x.status!=='cancelled').map(x=>({number:x.invoiceNumber,date:x.date,party:x.customerName,subtotal:n(x.subtotal),tax:n(x.taxTotal),total:n(x.grandTotal),status:x.paymentStatus}))
        : db.getPurchaseInvoices().filter(x=>inRange(x.date,f)&&x.status!=='cancelled').map(x=>({number:x.invoiceNumber,date:x.date,party:x.supplierName,subtotal:n(x.subtotal),tax:n(x.taxTotal),total:n(x.grandTotal),status:x.paymentStatus})));
    return {title:id==='sales'?'تقرير المبيعات':'تقرير المشتريات',columns:[
      {key:'number',title:'رقم الفاتورة'},{key:'date',title:'التاريخ'},{key:'party',title:id==='sales'?'العميل':'المورد'},
      {key:'subtotal',title:'قبل الضريبة',numeric:true},{key:'tax',title:'الضريبة',numeric:true},{key:'total',title:'الإجمالي',numeric:true},{key:'status',title:'الحالة'}
    ],rows,totals:totals(rows),currencyTotals:{}};
  }

  return {title:'تقرير محاسبي',columns:[],rows:[],totals:{},currencyTotals:{}};
}
