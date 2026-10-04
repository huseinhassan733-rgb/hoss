import { add, getDB, postJournal, update } from "../db";

function positiveAmount(value){
  const n=Number(value);
  if(!Number.isFinite(n) || n<=0) throw Error("المبلغ يجب أن يكون أكبر من صفر");
  return n;
}

function requireStudent(studentId){
  const student=getDB().students.find(s=>s.id===studentId);
  if(!student) throw Error("الطالب غير موجود");
  return student;
}

export function issueStudentFee({studentId,amount,description="رسوم دراسية",date=new Date().toISOString().slice(0,10)}){
  requireStudent(studentId);
  const n=positiveAmount(amount);
  const fee=add("fees",{studentId,amount:n,paidAmount:0,description,date,status:"unpaid"});
  postJournal({date,description,sourceType:"student_fee",sourceId:fee.id,lines:[
    {accountId:"110",debit:n,credit:0},
    {accountId:"401",debit:0,credit:n}
  ]});
  return fee;
}

export function receiveStudentPayment({studentId,amount,method="cash",description="سداد رسوم",date=new Date().toISOString().slice(0,10)}){
  requireStudent(studentId);
  const n=positiveAmount(amount);
  if(!["cash","bank"].includes(method)) throw Error("طريقة التحصيل غير صحيحة");
  const db=getDB();
  const outstanding=db.fees
    .filter(f=>f.studentId===studentId && f.status!=="cancelled")
    .reduce((s,f)=>s+Math.max(0,Number(f.amount||0)-Number(f.paidAmount||0)),0);
  if(outstanding<=0) throw Error("لا توجد رسوم مستحقة على الطالب");
  if(n>outstanding) throw Error("المبلغ أكبر من إجمالي الرسوم المستحقة");

  const accountId=method==="bank"?"102":"101";
  const receipt=add("receipts",{receiptNo:"",studentId,amount:n,method,date,description});
  let remaining=n;
  for(const fee of db.fees.filter(f=>f.studentId===studentId && f.status!=="cancelled" && Number(f.amount||0)>Number(f.paidAmount||0))){
    if(remaining<=0) break;
    const open=Math.max(0,Number(fee.amount||0)-Number(fee.paidAmount||0));
    const allocated=Math.min(open,remaining);
    const paid=Number(fee.paidAmount||0)+allocated;
    update("fees",fee.id,{paidAmount:paid,status:paid>=Number(fee.amount||0)?"paid":"partial"});
    remaining-=allocated;
  }
  postJournal({date,description,sourceType:"student_receipt",sourceId:receipt.id,lines:[
    {accountId,debit:n,credit:0},
    {accountId:"110",debit:0,credit:n}
  ]});
  return receipt;
}

export function dashboardTotals(){
  const db=getDB();
  return {
    students:db.students.length,
    employees:db.employees.length,
    unpaidFees:db.fees.reduce((s,x)=>s+Math.max(0,Number(x.amount||0)-Number(x.paidAmount||0)),0),
    cash:db.accounts.find(x=>x.id==="101")?.balance||0,
    journals:db.journals.length
  };
}
