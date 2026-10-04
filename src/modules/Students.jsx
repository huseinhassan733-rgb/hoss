import React,{useState} from "react";
import {add,getDB,remove,nextNumber} from "../db";

const empty={name:"",gender:"",dateOfBirth:"",placeOfBirth:"",className:"",section:""};

export default function Students(){
  const [db,setDb]=useState(getDB());
  const [form,setForm]=useState(empty);
  const [query,setQuery]=useState("");
  const [msg,setMsg]=useState("");

  const refresh=()=>setDb(getDB());
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const save=()=>{
    if(!form.name.trim()){setMsg("اسم الطالب مطلوب");return;}
    const item=add("students",{
      studentNo:nextNumber("STD"),
      name:form.name.trim(),
      gender:form.gender,
      dateOfBirth:form.dateOfBirth,
      placeOfBirth:form.placeOfBirth,
      className:form.className,
      section:form.section,
      status:"نشط"
    });
    add("enrollments",{studentId:item.id,academicYear:getDB().settings.academicYear,className:form.className,section:form.section,status:"active"});
    setForm(empty);setMsg("تم تسجيل الطالب وإنشاء رقم ملفه");
    refresh();
  };

  const filtered=db.students.filter(s=>
    (s.name+" "+s.studentNo+" "+s.className+" "+s.section).toLowerCase().includes(query.toLowerCase())
  );

  return <section className="module">
    <h2>إدارة الطلاب</h2>
    <div className="form-grid">
      <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="اسم الطالب الكامل"/>
      <select value={form.gender} onChange={e=>set("gender",e.target.value)}>
        <option value="">الجنس</option><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option>
      </select>
      <input type="date" value={form.dateOfBirth} onChange={e=>set("dateOfBirth",e.target.value)} />
      <input value={form.placeOfBirth} onChange={e=>set("placeOfBirth",e.target.value)} placeholder="مكان الميلاد"/>
      <input value={form.className} onChange={e=>set("className",e.target.value)} placeholder="الصف"/>
      <input value={form.section} onChange={e=>set("section",e.target.value)} placeholder="الشعبة"/>
      <button onClick={save}>تسجيل الطالب</button>
    </div>
    {msg&&<p className="success">{msg}</p>}
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث بالاسم أو رقم الملف أو الصف..."/>
    <div className="list">
      {filtered.map(s=><div className="row" key={s.id}>
        <div><b>{s.name}</b><small>ملف: {s.studentNo} · {s.className||"بدون صف"} {s.section||""}</small></div>
        <button className="danger" onClick={()=>{if(confirm("حذف سجل الطالب؟")){remove("students",s.id);refresh()}}}>حذف</button>
      </div>)}
      {!filtered.length&&<p className="muted">لا توجد نتائج.</p>}
    </div>
  </section>;
}
