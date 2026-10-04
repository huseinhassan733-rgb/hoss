import React,{useState} from "react";
import {add,getDB,remove} from "../db";
export default function Students(){
 const [db,setDb]=useState(getDB()); const [name,setName]=useState(""); const [className,setClassName]=useState("");
 const refresh=()=>setDb(getDB());
 const save=()=>{if(!name.trim())return; add("students",{name:name.trim(),className,gender:""});setName("");setClassName("");refresh();};
 return <section className="module"><h2>إدارة الطلاب</h2><div className="form-grid"><input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الطالب الكامل"/><input value={className} onChange={e=>setClassName(e.target.value)} placeholder="الصف والشعبة"/><button onClick={save}>تسجيل الطالب</button></div><div className="list">{db.students.map(s=><div className="row" key={s.id}><div><b>{s.name}</b><small>{s.className||"بدون صف"}</small></div><button className="danger" onClick={()=>{remove("students",s.id);refresh()}}>حذف</button></div>)}{!db.students.length&&<p className="muted">لا يوجد طلاب بعد.</p>}</div></section>
}