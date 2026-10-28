/** L15–L16 – isolated, per-device service, repair and warranty records.
 * No manufacturer estimates, invented purchase data or remote transmission.
 * Receipts are stored as separate IndexedDB Blobs in the lagerhaus object store. */
export const SERVICE_MAX_HOURS = 10000000;
export const SERVICE_MAX_EVENTS = 500;
export const SERVICE_RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
export const SERVICE_RECEIPT_PREFIX = 'service.receipt.';
const clean=(value,max)=>String(value??'').trim().slice(0,max);
const round=(num)=>Math.round(num*10)/10;
const localDate=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>localDate(new Date());
const dateAtNow=(timestamp)=>localDate(new Date(timestamp));
function parseDate(value,{allowEmpty=true,until=today(),allowFuture=false}={}){
 const s=clean(value,10);
 if(!s&&allowEmpty)return '';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Bitte ein gültiges Datum angeben.');
 if(!allowFuture&&s>until)throw Error('Das Datum darf nicht in der Zukunft liegen.');
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
 if(!Number.isInteger(n)||n<0||n>max||(!['Erinnerungstage vor Garantieablauf'].includes(label)&&n===0))throw Error(label+': bitte eine gültige ganze Zahl eingeben.');
 return n;
}
function extractChecklist(lines){
 if(Array.isArray(lines))return lines.map(v=>clean(v,140)).filter(Boolean).slice(0,25);
 const raw=String(lines??'');if(raw.length>5000)throw Error('Checkliste ist zu lang.');
 const entries=raw.split(/\r?\n/).map(x=>clean(x,140)).filter(Boolean);
 if(entries.length>25)throw Error('Maximal 25 Wartungspunkte pro Gerät.');
 return [...new Set(entries)];
}
function euros(value){
 if(value===''||value===null||value===undefined)return null;
 const raw=String(value).trim().replace(',','.');
 if(!/^(?:\d{1,7})(?:\.\d{1,2})?$/.test(raw))throw Error('Kosten müssen 0 bis 9.999.999,99 € mit maximal zwei Nachkommastellen sein.');
 const cents=Math.round(Number(raw)*100);
 if(!Number.isSafeInteger(cents)||cents>999999999)throw Error('Ungültige Kosten.');
 return cents;
}
function receiptMeta(values){
 const id=clean(values.receiptId,90),name=clean(values.receiptName,150),mime=clean(values.receiptMime,70);
 if(!id&&!name&&!mime)return null;
 if(!/^[a-zA-Z0-9_-]{6,90}$/.test(id)||!name||!['application/pdf','image/jpeg','image/png','image/webp'].includes(mime))throw Error('Ungültiger Belegverweis.');
 return {id,name,mime};
}
export const receiptKey=id=>{
 if(!/^[a-zA-Z0-9_-]{6,90}$/.test(String(id)))throw Error('Ungültige Belegkennung.');
 return SERVICE_RECEIPT_PREFIX+id;
};
export async function prepareServiceReceipt(file){
 if(!file||!file.size)return null;
 if(file.size>SERVICE_RECEIPT_MAX_BYTES)throw Error('Beleg darf höchstens 10 MB groß sein.');
 const types={'application/pdf':[37,80,68,70,45],'image/jpeg':[255,216,255],'image/png':[137,80,78,71,13,10,26,10],'image/webp':[82,73,70,70]};
 const fileName=String(file.name||'').toLowerCase();
 const fallbackMime=fileName.endsWith('.pdf')?'application/pdf':fileName.endsWith('.jpg')||fileName.endsWith('.jpeg')?'image/jpeg':fileName.endsWith('.png')?'image/png':fileName.endsWith('.webp')?'image/webp':'';
 const mime=file.type||fallbackMime;
 if(!Object.hasOwn(types,mime))throw Error('Beleg nur als PDF, JPG, PNG oder WebP erlaubt.');
 const magic=new Uint8Array(await file.slice(0,16).arrayBuffer());
 if(!types[mime].every((b,i)=>magic[i]===b)||(mime==='image/webp'&&String.fromCharCode(...magic.slice(8,12))!=='WEBP'))throw Error('Dateiinhalt passt nicht zum Belegformat.');
 const id=(globalThis.crypto?.randomUUID?.()||`r${Date.now()}_${Math.random().toString(36).slice(2)}`).replaceAll('-','_');
 return {id,name:clean(file.name,150)||'Beleg',mime,blob:file};
}
export function serviceFile(device){
 const s=device?.service&&typeof device.service==='object'?device.service:{};
 return {manufacturer:clean(s.manufacturer,80),model:clean(s.model,80),purchaseDate:clean(s.purchaseDate,10),operatingHours:Number.isFinite(s.operatingHours)?s.operatingHours:0,
  intervalDays:Number.isInteger(s.intervalDays)?s.intervalDays:null,intervalHours:Number.isInteger(s.intervalHours)?s.intervalHours:null,
  checklist:Array.isArray(s.checklist)?s.checklist:[],lastService:s.lastService&&typeof s.lastService==='object'?s.lastService:null,
  note:clean(s.note,1200),history:Array.isArray(s.history)?s.history:[],availability:s.availability==='gesperrt'?'gesperrt':'einsatzbereit',
  blockedReason:clean(s.blockedReason,400),warrantyUntil:clean(s.warrantyUntil,10),remindDays:Number.isInteger(s.remindDays)&&s.remindDays>=0&&s.remindDays<=365?s.remindDays:30};
}
export function listServiceDevices(items){return (items||[]).flatMap(item=>(item.devices||[]).map(device=>({itemId:item.id,itemName:item.name,itemCode:item.code,device,service:serviceFile(device)})));}
function replaceDevice(items,itemId,deviceId,change,now){
 const idx=items.findIndex(i=>i.id===itemId);if(idx<0)throw Error('Geräteartikel existiert nicht mehr.');
 const item=items[idx],ds=item.devices||[],di=ds.findIndex(d=>d.id===deviceId);
 if(item.type!=='geraet'||di<0)throw Error('Einzelgerät wurde entfernt.');
 const updated=change(ds[di]);const next=items.slice();next[idx]={...item,updatedAt:now,devices:ds.map((d,i)=>i===di?updated:d)};
 return next;
}
export function saveServiceFile(items,itemId,deviceId,values,{now=new Date().toISOString()}={}){
 const until=dateAtNow(now);
 return replaceDevice(items,itemId,deviceId,device=>{
  const s=serviceFile(device),operatingHours=hours(values.operatingHours);
  if(operatingHours<s.operatingHours)throw Error('Betriebsstunden dürfen nicht zurückgesetzt werden.');
  if(s.lastService&&operatingHours<s.lastService.atHours)throw Error('Betriebsstunden dürfen nicht vor die letzte Wartung zurückfallen.');
  const purchaseDate=parseDate(values.purchaseDate,{until});
  if(s.lastService&&purchaseDate&&purchaseDate>s.lastService.date)throw Error('Kaufdatum liegt nach der erfassten Wartung.');
  if(s.warrantyUntil&&purchaseDate&&purchaseDate>s.warrantyUntil)throw Error('Kaufdatum liegt nach dem Garantieende.');
  if(purchaseDate&&serviceHistory(device).some(e=>e.date&&purchaseDate>e.date))throw Error('Kaufdatum liegt nach einem dokumentierten Service oder einer Reparatur.');
  return {...device,service:{...s,manufacturer:clean(values.manufacturer,80),model:clean(values.model,80),purchaseDate,operatingHours,
   intervalDays:interval(values.intervalDays,'Serviceintervall in Tagen',36500),intervalHours:interval(values.intervalHours,'Serviceintervall in Betriebsstunden',1000000),
   checklist:extractChecklist(values.checklist),note:clean(values.note,1200)},updatedAt:now};
 },now);
}
function legacyHistory(s){
 if(!s.lastService||!s.lastService.date)return [];
 const old=s.lastService;
 if(s.history.some(h=>h.kind==='wartung'&&h.date===old.date&&h.atHours===old.atHours&&h.recordedAt===old.recordedAt))return [];
 return [{id:'l15_'+old.date.replaceAll('-','')+'_'+String(old.atHours).replace('.','_'),kind:'wartung',date:old.date,atHours:old.atHours,completed:Array.isArray(old.completed)?old.completed:[],note:clean(old.note,1200),costCents:null,receipt:null,recordedAt:old.recordedAt||'',migrated:true}];
}
function addEvent(s,entry){
 const history=[...s.history,...(s.history.length?[]:legacyHistory(s)),entry];
 if(history.length>SERVICE_MAX_EVENTS)throw Error('Zu viele Einträge (max. 500). Bitte zunächst einen Export vornehmen.');
 return history;
}
export function serviceHistory(device){
 const s=serviceFile(device);
 const history=[...s.history,...(s.history.length?[]:legacyHistory(s))];
 return history.map((entry,index)=>({entry,index})).sort((a,b)=>String(b.entry.date).localeCompare(String(a.entry.date))||String(b.entry.recordedAt||'').localeCompare(String(a.entry.recordedAt||''))||b.index-a.index).map(x=>x.entry);
}
export function completeService(items,itemId,deviceId,values,{now=new Date().toISOString(),id='w_'+now.replace(/\W/g,'')+'_'+Math.random().toString(36).slice(2)}={}){
 const until=dateAtNow(now);
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
  const note=clean(values.note,1200),costCents=euros(values.cost),receipt=receiptMeta(values);
  const entry={id,kind:'wartung',date,atHours,completed:checked,note,costCents,receipt,recordedAt:now};
  return {...device,service:{...s,history:addEvent(s,entry),lastService:{date,atHours,completed:checked,note,recordedAt:now}},updatedAt:now};
 },now);
}
export function addRepair(items,itemId,deviceId,values,{now=new Date().toISOString(),id='rep_'+now.replace(/\W/g,'')+'_'+Math.random().toString(36).slice(2)}={}){
 const until=dateAtNow(now);
 return replaceDevice(items,itemId,deviceId,device=>{
  const s=serviceFile(device),date=parseDate(values.date,{allowEmpty:false,until});
  if(s.purchaseDate&&date<s.purchaseDate)throw Error('Reparaturdatum darf nicht vor dem Kauf liegen.');
  const description=clean(values.description,1200);if(!description)throw Error('Bitte die Reparatur beschreiben.');
  const workshop=clean(values.workshop,120),costCents=euros(values.cost),receipt=receiptMeta(values);
  const entry={id,kind:'reparatur',date,description,workshop,costCents,receipt,recordedAt:now};
  const availability=values.blockAfter==='on'||values.blockAfter===true?'gesperrt':s.availability;
  return {...device,service:{...s,history:addEvent(s,entry),availability,blockedReason:availability==='gesperrt'&&values.blockAfter?clean(values.blockReason,400)||'Reparatur erforderlich':s.blockedReason},updatedAt:now};
 },now);
}
export function saveWarrantyAndAvailability(items,itemId,deviceId,values,{now=new Date().toISOString()}={}){
 return replaceDevice(items,itemId,deviceId,device=>{
  const s=serviceFile(device),warrantyUntil=parseDate(values.warrantyUntil,{allowFuture:true});
  if(warrantyUntil&&s.purchaseDate&&warrantyUntil<s.purchaseDate)throw Error('Garantieende liegt vor dem Kaufdatum.');
  const remindDays=interval(values.remindDays,'Erinnerungstage vor Garantieablauf',365)??30;
  if(!['einsatzbereit','gesperrt'].includes(values.availability))throw Error('Ungültige Einsatzfreigabe.');
  if(values.availability==='einsatzbereit'&&device.condition==='defekt')throw Error('Gerätezustand ist „Defekt“. Bitte zuerst den Zustand in „Einzelgeräte verwalten“ korrigieren.');
  const blockedReason=values.availability==='gesperrt'?clean(values.blockedReason,400):'';
  return {...device,service:{...s,warrantyUntil,remindDays,availability:values.availability,blockedReason},updatedAt:now};
 },now);
}
function addDays(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function serviceStatus(device,atDate=today()){
 const s=serviceFile(device),last=s.lastService;
 const nextDate=s.intervalDays&&last?.date?addDays(last.date,s.intervalDays):null;
 const nextHours=s.intervalHours&&last?round(last.atHours+s.intervalHours):null;
 const daysDue=Boolean(nextDate&&atDate>=nextDate),hoursDue=Boolean(nextHours!==null&&s.operatingHours>=nextHours);
 const blocked=device?.condition==='defekt'||s.availability==='gesperrt';
 const warrantyExpired=Boolean(s.warrantyUntil&&atDate>s.warrantyUntil);
 const warrantySoon=Boolean(s.warrantyUntil&&!warrantyExpired&&addDays(atDate,s.remindDays)>=s.warrantyUntil);
 return {nextDate,nextHours,daysDue,hoursDue,due:daysDue||hoursDue,configured:Boolean(s.intervalDays||s.intervalHours),needsReference:Boolean((s.intervalDays||s.intervalHours)&&!last),service:s,blocked,available:!blocked,blockReason:device?.condition==='defekt'?'Gerätezustand: defekt':s.blockedReason,warrantyExpired,warrantySoon};
}
/** IDs for orphaned receipts, e.g. when an entire device/article is removed. */
export function serviceReceiptKeys(items){
 const keys=new Set();
 for(const item of items||[])for(const device of item.devices||[])for(const entry of serviceHistory(device))if(entry.receipt?.id)keys.add(receiptKey(entry.receipt.id));
 return keys;
}