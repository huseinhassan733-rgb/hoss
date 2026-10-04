import { exportBackup } from "../db";
export function downloadBackup(){
  const blob=new Blob([exportBackup()],{type:"application/json"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download="hoss-school-backup.json"; a.click(); URL.revokeObjectURL(url);
}