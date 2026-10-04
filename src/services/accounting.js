import { add, getDB, postJournal } from "../db";

export function issueStudentFee({studentId,amount,description="رسوم دراسية",date=new Date().toISOString().slice(0,10)}){
  const fee=add("fees",{studentId,amount:Number(amount),description,date,status:"unpaid"});
  postJournal({date,description,sourceType:"student_fee",sourceId:fee.id,lines:[
    {accountId:"110",debit:Number(amount),credit:0},
    {accountId:"401",debit:0,credit:Number(amount)}
  ]});
  return fee;
}
export function receiveStudentPayment({studentId,amount,method="cash",description="سداد رسوم",date=new Date().toISOString().slice(0,10)}){
  const accountId=method==="bank"?"102":"101";
  const receipt=add("receipts",{studentId,amount:Number(amount),method,date,description});
  postJournal({date,description,sourceType:"student_receipt",sourceId:receipt.id,lines:[
    {accountId,debit:Number(amount),credit:0},
    {accountId:"110",debit:0,credit:Number(amount)}
  ]});
  return receipt;
}
export function dashboardTotals(){
  const db=getDB();
  return {
    students:db.students.length,
    employees:db.employees.length,
    unpaidFees:db.fees.filter(x=>x.status==="unpaid").reduce((s,x)=>s+Number(x.amount||0),0),
    cash:db.accounts.find(x=>x.id==="101")?.balance||0,
    journals:db.journals.length
  };
}
