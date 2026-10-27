/** Lagerhaus L15 – per-device service files, stored ON the existing individually tracked device.
 * Keeping them embedded avoids orphaned service files when a device is removed.
 * Pure business logic: no manufacturer schedules are assumed. */
export const SERVICE_MAX_HOURS = 10000000;
const clean=(value,max)=>String(value??'').trim().slice(0,max);
const round=(num)=>Math.round(num*10)/10;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function parseDate(value,{allowEmpty=true,until=today()}={}){
 const s=clean(value,10);
 if(!s&&allowEmpty)return '';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Bitte ein gültiges Datum angeben.');
 if(s>until)throw Error('Das Datum darf nicht in der Zukunft liegen.');
 return s;
}
function hours(value,allowEmpty=false){
 if((value===''||value===null||value===undefined)&&allowEmpty)return null;
 const n=Number(value);
 if(value===''||value===null||value===undefined||!Number.isFinite(n)||n<0||n>SERVICE_MAX_HOURS||Math.abs(n-round(n))>1e-8)throw Error('Betriebsstunden: 0 bis 10.000.000 mit höchstens einer Nachkommastelle.');
 return round(n);
}
function interval(value,label,max){
 if(value===''||value===null||value===undefined)return null;
 const n=Number(value);
 if(!Number.isInteger(n)||n<1||n>max)throw Error(label+': bitte eine positive ganze Zahl eingeben.');
 return n;
}
function extractChecklist(lines){
 if(Array.isArray(lines))return lines.map(v=>clean(v,140)).filter(Boolean).slice(0,25);
 const raw=String(lines??'');if(raw.length>5000)throw Error('Checkliste ist zu lang.');
 const entries=raw.split(/\r?\n/).map(x=>clean(x,140)).filter(Boolean);
 if(entries.length>25)throw Error('Maximal 25 Wartungspunkte pro Gerät.');
 return [...new Set(entries)];
}
export function serviceFile(device){
 const s=device?.service&&typeof device.service==='object'?device.service:{};
 return {manufacturer:clean(s.manufacturer,80),model:clean(s.model,80),purchaseDate:clean(s.purchaseDate,10),operatingHours:Number.isFinite(s.operatingHours)?s.operatingHours:0,
  intervalDays:Number.isInteger(s.intervalDays)?s.intervalDays:null,intervalHours:Number.isInteger(s.intervalHours)?s.intervalHours:null,
  checklist:Array.isArray(s.checklist)?s.checklist:[],lastService:s.lastService&&typeof s.lastService==='object'?s.lastService:null,
  note:clean(s.note,1200)};
}
export function listServiceDevices(items){
 return (items||[]).flatMap(item=>(item.devices||[]).map(device=>({itemId:item.id,itemName:item.name,itemCode:item.code,device,service:serviceFile(device)})));
}
function replaceDevice(items,itemId,deviceId,change,now){
 const idx=items.findIndex(i=>i.id===itemId);if(idx<0)throw Error('Geräteartikel existiert nicht mehr.');
 const item=items[idx],ds=item.devices||[],di=ds.findIndex(d=>d.id===deviceId);
 if(item.type!=='geraet'||di<0)throw Error('Einzelgerät wurde entfernt.');
 const updated=change(ds[di]);const next=items.slice();next[idx]={...item,updatedAt:now,devices:ds.map((d,i)=>i===di?updated:d)};
 return next;
}
export function saveServiceFile(items,itemId,deviceId,values,{now=new Date().toISOString()}={}){
 const until=now.slice(0,10);
 return replaceDevice(items,itemId,deviceId,device=>{
  const s=serviceFile(device);
  const operatingHours=hours(values.operatingHours);
  if(operatingHours < s.operatingHours)throw Error('Betriebsstunden dürfen nicht zurückgesetzt werden.');
  if(s.lastService&&operatingHours<s.lastService.atHours)throw Error('Betriebsstunden dürfen nicht vor die letzte Wartung zurückfallen.');
  const purchaseDate=parseDate(values.purchaseDate,{until});
  if(s.lastService&&purchaseDate&&purchaseDate>s.lastService.date)throw Error('Kaufdatum liegt nach der erfassten Wartung.');
  return {...device,service:{...s,manufacturer:clean(values.manufacturer,80),model:clean(values.model,80),purchaseDate,operatingHours,
   intervalDays:interval(values.intervalDays,'Serviceintervall in Tagen',36500),intervalHours:interval(values.intervalHours,'Serviceintervall in Betriebsstunden',1000000),
   checklist:extractChecklist(values.checklist),note:clean(values.note,1200)},updatedAt:now};
 },now);
}
export function completeService(items,itemId,deviceId,values,{now=new Date().toISOString()}={}){
 const until=now.slice(0,10);
 return replaceDevice(items,itemId,deviceId,device=>{
  const s=serviceFile(device),date=parseDate(values.date,{allowEmpty:false,until});
  if(s.purchaseDate&&date<s.purchaseDate)throw Error('Wartung darf nicht vor dem Kauf liegen.');
  if(s.lastService&&date<s.lastService.date)throw Error('Wartungsdatum liegt vor dem letzten Eintrag.');
  const atHours=hours(values.atHours);
  if(atHours>s.operatingHours)throw Error('Service-Betriebsstunden sind höher als der aktuelle Zähler.');
  if(s.lastService&&atHours<s.lastService.atHours)throw Error('Betriebsstunden liegen vor der letzten Wartung.');
  const done=Array.isArray(values.completed)?values.completed.map(v=>String(v)):[];
  const checked=s.checklist.filter(t=>done.includes(t));
  if(s.checklist.length&&checked.length!==s.checklist.length)throw Error('Für eine vollständige Wartung müssen alle Checklistenpunkte bestätigt sein.');
  const note=clean(values.note,1200);
  return {...device,service:{...s,lastService:{date,atHours,completed:checked,note,recordedAt:now}},updatedAt:now};
 },now);
}
function addDays(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function serviceStatus(device,atDate=today()){
 const s=serviceFile(device),last=s.lastService;
 const nextDate=s.intervalDays&&last?.date?addDays(last.date,s.intervalDays):null;
 const nextHours=s.intervalHours&&last?round(last.atHours+s.intervalHours):null;
 const daysDue=Boolean(nextDate&&atDate>=nextDate),hoursDue=Boolean(nextHours!==null&&s.operatingHours>=nextHours);
 return {nextDate,nextHours,daysDue,hoursDue,due:daysDue||hoursDue,configured:Boolean(s.intervalDays||s.intervalHours),needsReference:Boolean((s.intervalDays||s.intervalHours)&&!last),service:s};
}