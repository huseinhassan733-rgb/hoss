import { add, getDB, postJournal, update, nextNumber } from "../db";

const n=(v)=>{const x=Number(v);if(!Number.isFinite(x)||x<=0)throw Error("المبلغ يجب أن يكون أكبر من صفر");return x};
const student=(id)=>{const s=getDB().students.find(x=>x.id===id);if(!s)throw Error("الطالب غير موجود");return s};

export function issueStudentFee({studentId,amount,description="رسوم دراسية",date=new Date().toISOString().slice(0,10)}){
  student(studentId); const amountN=n(amount);
  const fee=add("fees",{number:nextNumber("FEE"),studentId,amount:amountN,paidAmount:0,description,date,status:"unpaid"});
  postJournal({date,description,sourceType:"student_fee",sourceId:fee.id,lines:[{accountId:"110",debit:amountN},{accountId:"401",credit:amountN}]});
  return fee;
}
export function receiveStudentPayment({studentId,amount,method="cash",description="سداد رسوم",date=new Date().toISOString().slice(0,10)}){
  student(studentId); const amountN=n(amount);
  if(!["cash","bank"].includes(method))throw Error("طريقة التحصيل غير صحيحة");
  const db=getDB(); const open=db.fees.filter(f=>f.studentId===studentId&&f.status!=="cancelled").reduce((s,f)=>s+Math.max(0,Number(f.amount)-Number(f.paidAmount||0)),0);
  if(open<=0)throw Error("لا توجد رسوم مستحقة على الطالب"); if(amountN>open)throw Error("المبلغ أكبر من إجمالي المستحق");
  const receipt=add("receipts",{receiptNo:nextNumber("RCT"),studentId,amount:amountN,method,date,description});
  let remaining=amountN;
  for(const fee of db.fees.filter(f=>f.studentId===studentId&&f.status!=="cancelled"&&Number(f.amount)>Number(f.paidAmount||0))){
    if(remaining<=0)break; const due=Number(fee.amount)-Number(fee.paidAmount||0), applied=Math.min(due,remaining), paid=Number(fee.paidAmount||0)+applied;
    update("fees",fee.id,{paidAmount:paid,status:paid>=Number(fee.amount)?"paid":"partial"}); remaining-=applied;
  }
  postJournal({date,description,sourceType:"student_receipt",sourceId:receipt.id,lines:[{accountId:method==="bank"?"102":"101",debit:amountN},{accountId:"110",credit:amountN}]});
  return receipt;
}
export function recordExpense({amount,description="مصروف نقدي",date=new Date().toISOString().slice(0,10)}){
  const amountN=n(amount); const expense=add("expenses",{number:nextNumber("EXP"),amount:amountN,description,date,status:"posted"});
  postJournal({date,description,sourceType:"expense",sourceId:expense.id,lines:[{accountId:"502",debit:amountN},{accountId:"101",credit:amountN}]}); return expense;
}
export function dashboardTotals(){const db=getDB();return{students:db.students.length,employees:db.employees.length,unpaidFees:db.fees.reduce((s,x)=>s+Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0)),0),cash:Number(db.accounts.find(x=>x.id==="101")?.balance||0),journals:db.journals.length};}
export function trialBalance(){return getDB().accounts.map(a=>{const b=Number(a.balance||0);return{...a,debit:b>0?b:0,credit:b<0?-b:0};});}
export function accountStatement(accountId){return getDB().journals.flatMap(j=>j.lines.filter(l=>l.accountId===accountId).map(l=>({...l,date:j.date,description:j.description,journalId:j.id})));}