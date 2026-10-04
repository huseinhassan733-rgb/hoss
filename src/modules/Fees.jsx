import React,{useState} from "react";
import {getDB,nextNumber} from "../db";
import {issueStudentFee,receiveStudentPayment} from "../services/accounting";

export default function Fees(){
  const [db,setDb]=useState(getDB());
  const [studentId,setStudentId]=useState("");
  const [amount,setAmount]=useState("");
  const [description,setDescription]=useState("رسوم دراسية");
  const [method,setMethod]=useState("cash");
  const [msg,setMsg]=useState("");

  const refresh=()=>setDb(getDB());
  const run=(fn)=>{
    try{fn();setAmount("");setMsg("تمت العملية وترحيلها محاسبيًا");refresh();}
    catch(e){setMsg(e.message||"تعذر تنفيذ العملية");}
  };

  const issue=()=>run(()=>{
    const n=Number(amount);
    const fee=issueStudentFee({studentId,amount:n,description});
    const d=getDB();
    const i=d.fees.findIndex(x=>x.id===fee.id);
    if(i>=0){
      d.fees[i].number=nextNumber("FEE");
      localStorage.setItem("hoss_school_db_v1",JSON.stringify(d));
    }
  });

  const pay=()=>run(()=>receiveStudentPayment({studentId,amount,method}));

  const outstandingFor=s=>db.fees.filter(f=>f.studentId===s.id&&f.status!=="cancelled")
    .reduce((sum,f)=>sum+Math.max(0,Number(f.amount||0)-Number(f.paidAmount||0)),0);

  return <section className="module">
    <h2>الرسوم والتحصيل</h2>
    <div className="form-grid">
      <select value={studentId} onChange={e=>setStudentId(e.target.value)}>
        <option value="">اختر الطالب</option>
        {db.students.map(s=><option value={s.id} key={s.id}>{s.studentNo} - {s.name}</option>)}
      </select>
      <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="نوع الرسوم"/>
      <input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="المبلغ"/>
      <select value={method} onChange={e=>setMethod(e.target.value)}>
        <option value="cash">نقدي - الصندوق</option><option value="bank">تحويل/بنك</option>
      </select>
      <div className="actions"><button onClick={issue}>إصدار مطالبة</button><button onClick={pay}>تحصيل</button></div>
    </div>
    {studentId&&<p className="muted">المتبقي على الطالب: {outstandingFor({id:studentId}).toLocaleString()} ريال</p>}
    {msg&&<p className="success">{msg}</p>}
    <div className="list">
      {db.fees.slice().reverse().map(f=>{
        const student=db.students.find(s=>s.id===f.studentId);
        const remain=Math.max(0,Number(f.amount||0)-Number(f.paidAmount||0));
        return <div className="row" key={f.id}>
          <div><b>{f.number||f.id}</b><small>{student?.name||"طالب غير معروف"} · {f.description}</small></div>
          <span>{Number(f.amount).toLocaleString()} / متبقي {remain.toLocaleString()} ريال</span>
        </div>
      })}
      {!db.fees.length&&<p className="muted">لا توجد مطالبات رسوم.</p>}
    </div>
  </section>;
}
