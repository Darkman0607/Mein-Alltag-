/** L08 – Individuelle Gebinde und Einzelgeräte als Teil des bestehenden Artikelbestands.
 * Keine separate Datenbank und keine zusätzliche Gesamtmenge durch Kennzeichnung.
 * Alle Operationen sind rein; persistiert wird mit mutateModuleValues aus L07. */
import {milli,unmilli,stockPositions,stockTotal,bookStock} from './lagerhaus-stock.js';
const text=(v,max=120)=>String(v??'').trim().slice(0,max);
const nowIso=()=>new Date().toISOString();
const makeUUID=()=>globalThis.crypto.randomUUID();
export const CONTAINER_STATES=Object.freeze({full:'Voll',open:'Angebrochen',empty:'Leer'});
export const DEVICE_STATES=Object.freeze({neu:'Neu',gut:'Gut',gebraucht:'Gebraucht',defekt:'Defekt'});
export function containerState(c){return milli(c.remaining,{allowZero:true})===0?'empty':c.openedAt?'open':'full';}
export function trackedAt(item,locationId,except=null){
 const containers=(item.containers||[]).filter(c=>c.id!==except).reduce((a,c)=>a+(c.locationId===locationId?milli(c.remaining,{allowZero:true}):0),0);
 const devices=(item.devices||[]).filter(d=>d.id!==except&&d.locationId===locationId).length*1000;
 return containers+devices;
}
export function untrackedAt(item,locationId){
 const available=milli(stockPositions(item).find(p=>p.locationId===locationId)?.quantity||0,{allowZero:true});
 const tracked=trackedAt(item,locationId);
 if(tracked>available)throw new Error('Gebinde-/Gerätedaten und Bestand widersprechen sich. Bitte zuerst prüfen.');
 return unmilli(available-tracked);
}
export function assertTrackedBalances(item){
 for(const c of item.containers||[]){
  if(!c.id||!c.locationId&&c.locationId!=='')throw new Error('Gebinde ohne gültigen Lagerort oder Kennung.');
  const cap=milli(c.capacity),remaining=milli(c.remaining,{allowZero:true});
  if(remaining>cap)throw new Error('Gebinde-Restmenge über Gebindegröße.');
  if(!c.openedAt&&remaining!==cap&&remaining!==0)throw new Error('Angebrochenes Gebinde ohne Öffnungsdatum.');
 }
 const seenSerial=new Set();
 for(const d of item.devices||[]){
  const s=text(d.serialNumber,100).toLocaleLowerCase('de-AT');
  if(!s||seenSerial.has(s))throw new Error('Doppelte oder fehlende Geräte-Seriennummer.');
  seenSerial.add(s);
 }
 const locations=new Set([...stockPositions(item).map(p=>p.locationId),...(item.containers||[]).map(c=>c.locationId),...(item.devices||[]).map(d=>d.locationId)]);
 for(const id of locations)untrackedAt(item,id);
 return true;
}
function findItem(items,itemId){const index=items.findIndex(i=>i.id===itemId);if(index<0)throw new Error('Artikel existiert nicht mehr.');return index;}
function replace(items,index,item){const result=items.slice();result[index]=item;return result;}
function validateLocation(validIds,id){if(!(validIds instanceof Set?validIds.has(id):validIds.includes(id)))throw new Error('Lagerort existiert nicht mehr.');}
function nextCode(item,prefix,records){
 const field=prefix==='B'?'containerSequence':'deviceSequence';
 const last=Math.max(item[field]||0,...records.map(r=>Number(new RegExp(`-${prefix}(\\d+)$`).exec(r.code)?.[1]||0)),0);
 if(last>=999999)throw new Error('Einzelkennungen-Limit erreicht.');
 const sequence=last+1;
 return {code:`${item.code}-${prefix}${String(sequence).padStart(3,'0')}`,field,sequence};
}
function duplicateId(items,id){return items.some(i=>[...(i.containers||[]),...(i.devices||[])].some(r=>r.id===id));}
function booking(item,type,quantity,fromId,toId,validIds,opts={}){
 return bookStock(item,{type,quantity,unitMode:'units',fromId,toId},validIds,opts);
}
/** Neue Gebinde immer in ARTIKEL-GRUNDEINHEITEN erfassen (z.B. 0,75 l). */
export function addContainer(items,itemId,{capacity,remaining,locationId,source='new',label=''},validIds,{now=nowIso(),makeId=makeUUID,makeEventId=makeUUID}={}){
 const idx=findItem(items,itemId),item=items[idx];
 if(item.type!=='verbrauch')throw new Error('Gebindeverwaltung nur für Verbrauchsmaterial.');
 const amount=unmilli(milli(capacity));const rest=remaining===''||remaining===null||remaining===undefined?amount:unmilli(milli(remaining));if(rest>amount)throw new Error('Die Restmenge darf die Packungsgröße nicht überschreiten.');const place=String(locationId??'');validateLocation(validIds,place);
 if(!['new','existing'].includes(source))throw new Error('Ungültige Erfassungsart.');
 if(source==='existing'&&milli(untrackedAt(item,place))<milli(rest))throw new Error('Nicht genügend frei verfügbarer Bestand für dieses Gebinde.');
 const id=String(makeId());if(!id||duplicateId(items,id))throw new Error('Ungültige Gebinde-ID.');
 let next=item,event;
 if(source==='new'){const booked=booking(item,'receive',rest,'',place,validIds,{now,makeId:makeEventId});next=booked.item;event=booked.event;}
 const identity=nextCode(item,'B',item.containers||[]);
 const c={id,code:identity.code,locationId:place,label:text(label,80),capacity:amount,remaining:rest,openedAt:rest<amount?now:null,createdAt:now,updatedAt:now};
 next={...next,[identity.field]:identity.sequence,containers:[...(next.containers||[]),c],updatedAt:now};assertTrackedBalances(next);
 return {items:replace(items,idx,next),event};
}
export function updateContainer(items,itemId,containerId,action,args,validIds,{now=nowIso(),makeEventId=makeUUID}={}){
 const idx=findItem(items,itemId),item=items[idx];
 const old=(item.containers||[]).find(c=>c.id===containerId);if(!old)throw new Error('Gebinde existiert nicht mehr.');
 let result=item,event,updated=old;
 if(action==='open'){
  if(containerState(old)!=='full')throw new Error('Gebinde ist bereits geöffnet oder leer.');
  updated={...old,openedAt:now,updatedAt:now};
 }else if(action==='consume'){
  const amount=unmilli(milli(args.quantity));if(milli(amount)>milli(old.remaining,{allowZero:true}))throw new Error('Mehr als die verfügbare Restmenge.');
  const booked=booking(item,'issue',amount,old.locationId,'',validIds,{now,makeId:makeEventId,releaseRecordId:old.id});
  result=booked.item;event=booked.event;
  updated={...old,remaining:unmilli(milli(old.remaining,{allowZero:true})-milli(amount)),openedAt:old.openedAt||now,updatedAt:now};
 }else if(action==='move'){
  const destination=String(args.locationId??'');validateLocation(validIds,destination);
  if(destination===old.locationId)throw new Error('Anderen Lagerort wählen.');
  if(milli(old.remaining,{allowZero:true})>0){
   const booked=booking(item,'transfer',old.remaining,old.locationId,destination,validIds,{now,makeId:makeEventId,releaseRecordId:old.id});result=booked.item;event=booked.event;
  }
  updated={...old,locationId:destination,updatedAt:now};
 }else if(action==='untrack'){
  // Keine Bestandänderung; die vorhandene Restmenge wird wieder freier Bestand.
  result={...result,containers:result.containers.filter(c=>c.id!==old.id),updatedAt:now};assertTrackedBalances(result);
  return {items:replace(items,idx,result)};
 }else throw new Error('Unbekannte Gebindeaktion.');
 result={...result,containers:(result.containers||[]).map(c=>c.id===old.id?updated:c),updatedAt:now};
 assertTrackedBalances(result);return {items:replace(items,idx,result),event};
}
export function addDevice(items,itemId,{serialNumber,locationId,source='new',label='',condition='gut'},validIds,{now=nowIso(),makeId=makeUUID,makeEventId=makeUUID}={}){
 const idx=findItem(items,itemId),item=items[idx];
 if(item.type!=='geraet'||item.unit!=='stk')throw new Error('Einzelgeräte benötigen Artikeltyp „Gerät“ mit Einheit „Stück“.');
 const serial=text(serialNumber,100);if(!serial)throw new Error('Seriennummer erforderlich.');
 if(items.some(i=>(i.devices||[]).some(d=>d.serialNumber.toLocaleLowerCase('de-AT')===serial.toLocaleLowerCase('de-AT'))))throw new Error('Seriennummer bereits bei einem Gerät vergeben.');
 if(!Object.hasOwn(DEVICE_STATES,condition))throw new Error('Ungültiger Gerätezustand.');
 if(!['new','existing'].includes(source))throw new Error('Ungültige Erfassungsart.');
 const place=String(locationId??'');validateLocation(validIds,place);
 if(source==='existing'&&untrackedAt(item,place)<1)throw new Error('An diesem Lagerort ist kein freies Gerät verfügbar.');
 const id=String(makeId());if(!id||duplicateId(items,id))throw new Error('Ungültige Geräte-ID.');
 let result=item,event;
 if(source==='new'){const booked=booking(item,'receive',1,'',place,validIds,{now,makeId:makeEventId});result=booked.item;event=booked.event;}
 const identity=nextCode(item,'G',item.devices||[]);
 const device={id,code:identity.code,serialNumber:serial,label:text(label,80),condition,locationId:place,createdAt:now,updatedAt:now};
 result={...result,[identity.field]:identity.sequence,devices:[...(result.devices||[]),device],updatedAt:now};assertTrackedBalances(result);
 return {items:replace(items,idx,result),event};
}
export function updateDevice(items,itemId,deviceId,action,args,validIds,{now=nowIso(),makeEventId=makeUUID}={}){
 const idx=findItem(items,itemId),item=items[idx];
 const old=(item.devices||[]).find(d=>d.id===deviceId);if(!old)throw new Error('Gerät existiert nicht mehr.');
 let result=item,event,updated=old;
 if(action==='move'){
  const target=String(args.locationId??'');validateLocation(validIds,target);
  if(target===old.locationId)throw new Error('Anderen Lagerort wählen.');
  const booked=booking(item,'transfer',1,old.locationId,target,validIds,{now,makeId:makeEventId,releaseRecordId:old.id});
  result=booked.item;event=booked.event;updated={...old,locationId:target,updatedAt:now};
 }else if(action==='condition'){
  const condition=String(args.condition||'');if(!Object.hasOwn(DEVICE_STATES,condition))throw new Error('Ungültiger Gerätezustand.');
  updated={...old,condition,updatedAt:now};
 }else if(action==='issue'){
  const booked=booking(item,'issue',1,old.locationId,'',validIds,{now,makeId:makeEventId,releaseRecordId:old.id});
  result=booked.item;event=booked.event;
  result={...result,devices:result.devices.filter(d=>d.id!==old.id),updatedAt:now};assertTrackedBalances(result);
  return {items:replace(items,idx,result),event};
 }else if(action==='untrack'){
  result={...item,devices:item.devices.filter(d=>d.id!==old.id),updatedAt:now};assertTrackedBalances(result);
  return {items:replace(items,idx,result)};
 }else throw new Error('Unbekannte Geräteaktion.');
 result={...result,devices:result.devices.map(d=>d.id===old.id?updated:d),updatedAt:now};assertTrackedBalances(result);
 return {items:replace(items,idx,result),event};
}
export function trackedSummary(item){
 const containers=item.containers||[],devices=item.devices||[];
 return {full:containers.filter(c=>containerState(c)==='full').length,open:containers.filter(c=>containerState(c)==='open').length,empty:containers.filter(c=>containerState(c)==='empty').length,devices:devices.length,untracked:unmilli(milli(stockTotal(item),{allowZero:true})-containers.reduce((s,c)=>s+milli(c.remaining,{allowZero:true}),0)-devices.length*1000)};
}