const KEY = "hoss_school_db_v1";

const seed = {
  settings: { schoolName: "مدرستي الخاصة", academicYear: "2026/2027", currency: "ريال يمني" },
  students: [],
  guardians: [],
  fees: [],
  receipts: [],
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
  audit: []
};

function load(){ try { const d=JSON.parse(localStorage.getItem(KEY))||structuredClone(seed); ["enrollments","expenses","payroll","library","inventory"].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]}); if(!d.counters)d.counters={}; return d; } catch { return structuredClone(seed); } }
function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); window.dispatchEvent(new Event("hoss-db-change")); return db; }
export function getDB(){ return load(); }
export function resetDB(){ return save(structuredClone(seed)); }
export function createId(prefix="ID"){ return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
export function add(table, record){
  const db=load(); const item={id:createId(table.slice(0,3).toUpperCase()), createdAt:new Date().toISOString(), ...record};
  db[table].push(item); db.audit.push({id:createId("AUD"), action:"CREATE", table, recordId:item.id, at:new Date().toISOString()}); save(db); return item;
}
export function update(table,id,patch){
  const db=load(); const i=db[table].findIndex(x=>x.id===id); if(i<0) throw Error("السجل غير موجود");
  db[table][i]={...db[table][i],...patch,updatedAt:new Date().toISOString()};
  db.audit.push({id:createId("AUD"), action:"UPDATE", table, recordId:id, at:new Date().toISOString()}); save(db); return db[table][i];
}
export function remove(table,id){
  const db=load(); db[table]=db[table].filter(x=>x.id!==id); db.audit.push({id:createId("AUD"), action:"DELETE", table, recordId:id, at:new Date().toISOString()}); save(db);
}
export function postJournal({date,description,lines,sourceType,sourceId}){
  const totalDebit=lines.reduce((s,l)=>s+Number(l.debit||0),0), totalCredit=lines.reduce((s,l)=>s+Number(l.credit||0),0);
  if(Math.abs(totalDebit-totalCredit)>0.001) throw Error("القيد غير متوازن");
  const db=load(); const j={id:createId("JV"),date,description,lines,sourceType,sourceId,status:"posted",createdAt:new Date().toISOString()};
  db.journals.push(j); db.audit.push({id:createId("AUD"),action:"POST",table:"journals",recordId:j.id,at:new Date().toISOString()});
  lines.forEach(l=>{const a=db.accounts.find(x=>x.id===l.accountId); if(a) a.balance += Number(l.debit||0)-Number(l.credit||0);});
  save(db); return j;
}
export function exportBackup(){ return JSON.stringify(load(),null,2); }

export function nextNumber(prefix){const d=load();d.counters[prefix]=(d.counters[prefix]||0)+1;save(d);return prefix+"-"+String(d.counters[prefix]).padStart(5,"0")}
export function importBackup(text){const d=JSON.parse(text);return save(d)}
