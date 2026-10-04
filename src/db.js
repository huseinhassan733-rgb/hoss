const KEY = "hoss_school_db_v1";
const VERSION = 2;

const seed = {
  schemaVersion: VERSION,
  settings: { schoolName: "مدرستي الخاصة", academicYear: "2026/2027", currency: "ريال يمني" },
  students: [],
  guardians: [],
  enrollments: [],
  fees: [],
  receipts: [],
  expenses: [],
  payroll: [],
  accounts: [
    { id:"101", name:"الصندوق", type:"asset", balance:0 },
    { id:"102", name:"البنك", type:"asset", balance:0 },
    { id:"110", name:"ذمم الطلاب", type:"asset", balance:0 },
    { id:"401", name:"الرسوم الدراسية", type:"revenue", balance:0 },
    { id:"501", name:"الرواتب", type:"expense", balance:0 },
    { id:"502", name:"المصروفات التشغيلية", type:"expense", balance:0 }
  ],
  journals: [],
  employees: [],
  grades: [],
  attendance: [],
  library: [],
  inventory: [],
  audit: [],
  counters: {}
};

const cloneSeed = () => structuredClone(seed);

function normalize(d){
  const db = d && typeof d === "object" ? d : cloneSeed();
  db.schemaVersion = VERSION;
  if(!db.settings) db.settings = cloneSeed().settings;
  ["students","guardians","enrollments","fees","receipts","expenses","payroll","accounts","journals","employees","grades","attendance","library","inventory","audit"].forEach(k=>{
    if(!Array.isArray(db[k])) db[k] = [];
  });
  if(!db.counters || typeof db.counters !== "object") db.counters = {};
  if(!db.accounts.length) db.accounts = cloneSeed().accounts;
  db.students = db.students.map(s=>({
    ...s,
    studentNo:s.studentNo || s.id,
    status:s.status || "نشط",
    gender:s.gender || "",
    dateOfBirth:s.dateOfBirth || "",
    placeOfBirth:s.placeOfBirth || "",
    className:s.className || "",
    section:s.section || ""
  }));
  db.fees = db.fees.map(f=>({
    ...f,
    amount:Number(f.amount||0),
    paidAmount:Number(f.paidAmount||0),
    status:f.status || (Number(f.paidAmount||0)>=Number(f.amount||0) ? "paid" : "unpaid")
  }));
  return db;
}

function load(){
  try { return normalize(JSON.parse(localStorage.getItem(KEY))); }
  catch { return cloneSeed(); }
}

function save(db){
  const normalized = normalize(db);
  localStorage.setItem(KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event("hoss-db-change"));
  return normalized;
}

export function getDB(){ return load(); }
export function resetDB(){ return save(cloneSeed()); }
export function createId(prefix="ID"){
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

export function add(table, record){
  const db=load();
  if(!Array.isArray(db[table])) throw Error("جدول البيانات غير موجود: "+table);
  const item={id:createId(table.slice(0,3).toUpperCase()),createdAt:new Date().toISOString(),...record};
  db[table].push(item);
  db.audit.push({id:createId("AUD"),action:"CREATE",table,recordId:item.id,at:new Date().toISOString()});
  save(db);
  return item;
}

export function update(table,id,patch){
  const db=load();
  if(!Array.isArray(db[table])) throw Error("جدول البيانات غير موجود: "+table);
  const i=db[table].findIndex(x=>x.id===id);
  if(i<0) throw Error("السجل غير موجود");
  db[table][i]={...db[table][i],...patch,updatedAt:new Date().toISOString()};
  db.audit.push({id:createId("AUD"),action:"UPDATE",table,recordId:id,at:new Date().toISOString()});
  save(db);
  return db[table][i];
}

export function remove(table,id){
  const db=load();
  if(!Array.isArray(db[table])) throw Error("جدول البيانات غير موجود: "+table);
  const before=db[table].length;
  db[table]=db[table].filter(x=>x.id!==id);
  if(db[table].length===before) throw Error("السجل غير موجود");
  db.audit.push({id:createId("AUD"),action:"DELETE",table,recordId:id,at:new Date().toISOString()});
  save(db);
}

export function postJournal({date=new Date().toISOString().slice(0,10),description="",lines=[],sourceType="manual",sourceId=""}){
  if(!description.trim()) throw Error("بيان القيد مطلوب");
  if(!Array.isArray(lines) || lines.length<2) throw Error("القيد يجب أن يحتوي على سطرين على الأقل");
  const db=load();
  let debit=0, credit=0;
  const checked=lines.map(l=>{
    const d=Number(l.debit||0), c=Number(l.credit||0);
    if(!db.accounts.some(a=>a.id===l.accountId)) throw Error("الحساب غير موجود: "+l.accountId);
    if(d<0 || c<0 || (d>0 && c>0) || (d===0 && c===0)) throw Error("سطر محاسبي غير صالح");
    debit+=d; credit+=c;
    return {...l,debit:d,credit:c};
  });
  if(debit<=0 || Math.abs(debit-credit)>0.001) throw Error("القيد غير متوازن");
  const j={id:createId("JV"),date,description,lines:checked,sourceType,sourceId,status:"posted",createdAt:new Date().toISOString()};
  db.journals.push(j);
  checked.forEach(l=>{
    const a=db.accounts.find(x=>x.id===l.accountId);
    a.balance=Number(a.balance||0)+l.debit-l.credit;
  });
  db.audit.push({id:createId("AUD"),action:"POST",table:"journals",recordId:j.id,sourceType,sourceId,at:new Date().toISOString()});
  save(db);
  return j;
}

export function exportBackup(){ return JSON.stringify(load(),null,2); }

export function nextNumber(prefix){
  const db=load();
  db.counters[prefix]=(db.counters[prefix]||0)+1;
  save(db);
  return prefix+"-"+String(db.counters[prefix]).padStart(5,"0");
}

export function importBackup(text){
  const parsed=JSON.parse(text);
  if(!parsed || typeof parsed!=="object" || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.students)){
    throw Error("ملف النسخة الاحتياطية غير صالح");
  }
  return save(parsed);
}
