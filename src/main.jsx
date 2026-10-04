import React,{useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {Users,WalletCards,ReceiptText,GraduationCap,CalendarCheck,Briefcase,FileText,Archive,Settings,Search,Plus,Menu,ChevronLeft} from "lucide-react";
import "./styles.css";

const modules=[
 {id:"students",title:"الطلاب",icon:Users,desc:"التسجيل والملفات والنقل"},
 {id:"fees",title:"الرسوم",icon:WalletCards,desc:"الاستحقاقات والتحصيل والمتأخرات"},
 {id:"cash",title:"الصندوق",icon:ReceiptText,desc:"القبض والصرف والحركة المالية"},
 {id:"grades",title:"الدرجات",icon:GraduationCap,desc:"الاختبارات والنتائج والأوائل"},
 {id:"attendance",title:"الحضور",icon:CalendarCheck,desc:"حضور وغياب الطلاب والموظفين"},
 {id:"employees",title:"الموظفون",icon:Briefcase,desc:"الرواتب والحضور والإجازات"},
 {id:"reports",title:"التقارير",icon:FileText,desc:"تقارير إدارية ومالية وتعليمية"},
 {id:"archive",title:"الأرشيف",icon:Archive,desc:"المستندات والنسخ الاحتياطية"},
 {id:"settings",title:"الإعدادات",icon:Settings,desc:"بيانات المدرسة والصلاحيات"}
];

function App(){
 const [active,setActive]=useState("dashboard");
 const [query,setQuery]=useState("");
 const visible=useMemo(()=>modules.filter(m=>(m.title+m.desc).includes(query)),[query]);
 return <div className="app">
  <header className="topbar">
   <button className="iconbtn" aria-label="القائمة"><Menu size={22}/></button>
   <div><div className="brand">نظام إدارة المدرسة</div><div className="sub">الإدارة الإلكترونية المتكاملة</div></div>
   <div className="school-badge">مدرستي</div>
  </header>
  <main>
   {active==="dashboard" ? <Dashboard visible={visible} query={query} setQuery={setQuery} open={setActive}/> :
    <ModulePage module={modules.find(m=>m.id===active)} back={()=>setActive("dashboard")}/>}
  </main>
  <nav className="bottomnav">
   <button className={active==="dashboard"?"active":""} onClick={()=>setActive("dashboard")}><ReceiptText size={20}/><span>الرئيسية</span></button>
   <button onClick={()=>setActive("students")}><Users size={20}/><span>الطلاب</span></button>
   <button onClick={()=>setActive("fees")}><WalletCards size={20}/><span>الرسوم</span></button>
   <button onClick={()=>setActive("reports")}><FileText size={20}/><span>التقارير</span></button>
  </nav>
 </div>
}
function Dashboard({visible,query,setQuery,open}){
 return <section className="page">
  <div className="hero"><div><h1>مرحباً بك 👋</h1><p>لوحة تحكم المدرسة</p></div><button className="primary"><Plus size={18}/> عملية جديدة</button></div>
  <div className="search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث في أقسام النظام..."/></div>
  <div className="stats">
   <div><b>0</b><span>طلاب نشطون</span></div><div><b>0</b><span>متأخرات الرسوم</span></div><div><b>0</b><span>موظفون</span></div><div><b>0</b><span>غياب اليوم</span></div>
  </div>
  <h2>الأقسام الرئيسية</h2>
  <div className="grid">{visible.map(m=><button className="card" key={m.id} onClick={()=>open(m.id)}><span className="cardicon"><m.icon size={23}/></span><span className="ct"><strong>{m.title}</strong><small>{m.desc}</small></span><ChevronLeft size={18}/></button>)}</div>
 </section>
}
function ModulePage({module,back}){
 if(!module)return null; const Icon=module.icon;
 return <section className="page"><button className="back" onClick={back}><ChevronLeft size={18}/> الرئيسية</button><div className="modulehead"><span className="bigicon"><Icon size={28}/></span><div><h1>{module.title}</h1><p>{module.desc}</p></div></div><div className="empty"><Icon size={42}/><h2>وحدة {module.title}</h2><p>تم تجهيز الهيكل الأساسي. سيتم ربط العمليات وقاعدة البيانات والتقارير داخل هذه الوحدة.</p><button className="primary"><Plus size={18}/> إضافة جديد</button></div></section>
}
createRoot(document.getElementById("root")).render(<App/>);