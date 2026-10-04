import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {Users,WalletCards,ReceiptText,GraduationCap,CalendarCheck,Briefcase,FileText,Archive,Settings,Menu,ChevronLeft} from "lucide-react";
import {getDB} from "./db";
import {dashboardTotals} from "./services/accounting";
import Students from "./modules/Students"; import Fees from "./modules/Fees"; import Reports from "./modules/Reports";
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
{id:"settings",title:"الإعدادات",icon:Settings,desc:"بيانات المدرسة والصلاحيات"}];
function App(){const [active,setActive]=useState("dashboard");const [query,setQuery]=useState("");const [db,setDb]=useState(getDB());useEffect(()=>{const f=()=>setDb(getDB());window.addEventListener("hoss-db-change",f);return()=>window.removeEventListener("hoss-db-change",f)},[]);const totals=dashboardTotals();const visible=modules.filter(m=>(m.title+m.desc).includes(query));return <div className="app"><header className="topbar"><button className="iconbtn"><Menu size={22}/></button><div><div className="brand">نظام إدارة المدرسة</div><div className="sub">الإدارة الإلكترونية المتكاملة</div></div><div className="school-badge">{db.settings.schoolName}</div></header><main>{active==="dashboard"?<section className="page"><div className="hero"><div><h1>مرحباً بك 👋</h1><p>لوحة تحكم المدرسة</p></div></div><div className="search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث في أقسام النظام..."/></div><div className="stats"><div><b>{totals.students}</b><span>طلاب</span></div><div><b>{totals.unpaidFees.toLocaleString()}</b><span>ذمم الطلاب</span></div><div><b>{totals.employees}</b><span>موظفون</span></div><div><b>{db.journals.length}</b><span>قيود مرحّلة</span></div></div><h2>الأقسام الرئيسية</h2><div className="grid">{visible.map(m=><button className="card" key={m.id} onClick={()=>setActive(m.id)}><span className="cardicon"><m.icon size={23}/></span><span className="ct"><strong>{m.title}</strong><small>{m.desc}</small></span><ChevronLeft size={18}/></button>)}</div></section>:<Module active={active} back={()=>setActive("dashboard")}/>}</main><nav className="bottomnav"><button onClick={()=>setActive("dashboard")}><ReceiptText size={20}/><span>الرئيسية</span></button><button onClick={()=>setActive("students")}><Users size={20}/><span>الطلاب</span></button><button onClick={()=>setActive("fees")}><WalletCards size={20}/><span>الرسوم</span></button><button onClick={()=>setActive("reports")}><FileText size={20}/><span>التقارير</span></button></nav></div>}
function Module({active,back}){if(active==="students")return <Wrap back={back}><Students/></Wrap>;if(active==="fees")return <Wrap back={back}><Fees/></Wrap>;if(active==="reports")return <Wrap back={back}><Reports/></Wrap>;const m=modules.find(x=>x.id===active),Icon=m.icon;return <Wrap back={back}><div className="empty"><Icon size={42}/><h2>وحدة {m.title}</h2><p>هذه المرحلة تربط الوحدة بالنواة الموحدة. سنكمل العمليات والربط حسب أولوية العمل.</p></div></Wrap>}
function Wrap({children,back}){return <section className="page"><button className="back" onClick={back}><ChevronLeft size={18}/> الرئيسية</button>{children}</section>}
createRoot(document.getElementById("root")).render(<App/>);