/** P05 – Putzintervalle auf Ebene der Reinigungsbereiche, ohne Datenmigration.
 * Alte Sitzungen ohne erledigte Aufgaben sind nicht beweiskräftig und werden nicht geschätzt.
 */
import {getModuleValue,mutateModuleValues} from '../assets/database.js';
export const SCHEDULE_KEY='cleaning.schedule.v1';
const validIntervals=new Set(['daily','days','weekly','monthly','off']);
export function intervalDefault(group){
 const t=group?.type||'',id=group?.id||'';
 if(id==='area:windows'||['kuehlschrank','backofen','dunstabzug'].includes(t))return {kind:'monthly',every:1};
 if(['geschirrspueler','arbeitsplatte','tisch','muelleimer','spuele'].includes(t))return {kind:'daily',every:1};
 return {kind:'weekly',every:1};
}
export function sanitizeInterval(input,group){
 const kind=validIntervals.has(input?.kind)?input.kind:intervalDefault(group).kind;
 const every=Math.max(1,Math.min(365,Math.floor(Number(input?.every)||1)));
 return {kind,every};
}
export async function loadSchedule(){const raw=await getModuleValue('putzmanager',SCHEDULE_KEY);return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};}
export async function saveSchedule(roomId,groupId,raw){
 if(typeof roomId!=='string'||!roomId||typeof groupId!=='string'||!groupId)throw Error('Reinigungsbereich fehlt.');
 const entry=sanitizeInterval(raw,{id:groupId});
 await mutateModuleValues('putzmanager',[SCHEDULE_KEY],values=>{
  const stored=values[SCHEDULE_KEY]&&typeof values[SCHEDULE_KEY]==='object'&&!Array.isArray(values[SCHEDULE_KEY])?values[SCHEDULE_KEY]:{};
  stored[roomId]={...(stored[roomId]||{}),[groupId]:entry};
  return [[SCHEDULE_KEY,stored]];
 });
 return entry;
}
const dayStart=date=>new Date(date.getFullYear(),date.getMonth(),date.getDate());
function nextDate(date,interval){const d=dayStart(date);if(interval.kind==='monthly'){const target=new Date(d.getFullYear(),d.getMonth()+interval.every,1);const max=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();target.setDate(Math.min(d.getDate(),max));return target;}else d.setDate(d.getDate()+(interval.kind==='weekly'?7:1)*interval.every);return d;}
const fmt=date=>date.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'});
export function intervalLabel(interval){const x=sanitizeInterval(interval,{});return x.kind==='off'?'Nur bei Bedarf':x.kind==='daily'?(x.every===1?'Täglich':`Alle ${x.every} Tage`):x.kind==='weekly'?(x.every===1?'Wöchentlich':`Alle ${x.every} Wochen`):x.kind==='monthly'?(x.every===1?'Monatlich':`Alle ${x.every} Monate`):`Alle ${x.every} Tage`;}
export function groupRecord(history,roomId,groupId){
 return (history||[]).filter(h=>h.roomId===roomId&&Array.isArray(h.completedGroups)&&h.completedGroups.some(g=>g.id===groupId)&&!Number.isNaN(Date.parse(h.endedAt))).sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt))[0]||null;
}
export function groupStatus(history,roomId,group,override,now=new Date()){
 const interval=sanitizeInterval(override,group);
 const latest=groupRecord(history,roomId,group.id);
 if(interval.kind==='off')return {state:'optional',label:'Bei Bedarf',interval,last:latest,next:null};
 if(!latest)return {state:'due',label:'Noch kein Einzelnachweis',interval,last:null,next:null};
 const last=new Date(latest.endedAt),next=nextDate(last,interval),today=dayStart(now);
 if(today.getTime()<next.getTime())return {state:'done',label:`Zuletzt ${fmt(last)} · wieder ${fmt(next)}`,interval,last:latest,next};
 return {state:today.getTime()>next.getTime()?'overdue':'due',label:`Fällig seit ${fmt(next)} · zuletzt ${fmt(last)}`,interval,last:latest,next};
}
export function roomScheduleSummary(room,groups,history,settings={},now=new Date()){
 const rows=groups.map(g=>({...g,status:groupStatus(history,room.id,g,settings[g.id],now)}));
 const today=dayStart(now).getTime();
 return {rows,due:rows.filter(x=>['due','overdue'].includes(x.status.state)).length,overdue:rows.filter(x=>x.status.state==='overdue').length,doneToday:rows.filter(x=>x.status.last&&dayStart(new Date(x.status.last.endedAt)).getTime()===today).length,done:rows.filter(x=>x.status.state==='done').length};
}
