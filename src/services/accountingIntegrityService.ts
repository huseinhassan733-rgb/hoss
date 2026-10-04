import { JournalEntry } from '../types';

export interface IntegrityIssue {
  severity: 'error'|'warning';
  code: string;
  message: string;
  reference?: string;
}

export interface IntegrityReport {
  ok: boolean;
  issues: IntegrityIssue[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
}

export class AccountingIntegrityService {
  static validateJournalEntries(entries: JournalEntry[]): IntegrityReport {
    const issues: IntegrityIssue[]=[];
    let totalDebit=0,totalCredit=0;
    const references=new Set<string>();
    for(const entry of entries.filter(e=>e.status==='posted')){
      if(entry.reference && references.has(entry.reference)) issues.push({severity:'error',code:'DUPLICATE_SOURCE_REFERENCE',message:`تكرار مرجع مصدر الترحيل: ${entry.reference}`,reference:entry.reference});
      if(entry.reference) references.add(entry.reference);
      const d=entry.lines.reduce((s,l)=>s+(Number(l.debit)||0),0);
      const c=entry.lines.reduce((s,l)=>s+(Number(l.credit)||0),0);
      totalDebit+=d; totalCredit+=c;
      if(Math.abs(d-c)>0.01) issues.push({severity:'error',code:'UNBALANCED_ENTRY',message:`القيد ${entry.entryNumber} غير متزن: مدين ${d} / دائن ${c}`,reference:entry.reference});
      for(const line of entry.lines){
        if((line.debit>0 && line.credit>0) || (line.debit===0 && line.credit===0)) issues.push({severity:'error',code:'INVALID_LINE',message:`السطر ${line.id} في القيد ${entry.entryNumber} يجب أن يحتوي مديناً أو دائناً واحداً فقط.`,reference:entry.reference});
      }
    }
    const difference=Math.abs(totalDebit-totalCredit);
    if(difference>0.01) issues.push({severity:'error',code:'LEDGER_NOT_BALANCED',message:`إجمالي الأستاذ غير متزن: مدين ${totalDebit} / دائن ${totalCredit}`});
    return {ok:issues.every(i=>i.severity!=='error'),issues,totalDebit, totalCredit, difference};
  }

  static customerBalance(entries: JournalEntry[], customerId: string): number {
    return entries.filter(e=>e.status==='posted').reduce((sum,e)=>sum+e.lines.filter(l=>l.customerId===customerId).reduce((s,l)=>s+(Number(l.debit)||0)-(Number(l.credit)||0),0),0);
  }

  static supplierBalance(entries: JournalEntry[], supplierId: string): number {
    return entries.filter(e=>e.status==='posted').reduce((sum,e)=>sum+e.lines.filter(l=>l.supplierId===supplierId).reduce((s,l)=>s+(Number(l.credit)||0)-(Number(l.debit)||0),0),0);
  }
}
