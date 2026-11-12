/** P01 – per-room tasks, persistent timer, and committed warehouse consumptions.
 * Consumables are selected explicitly, then deducted exactly once on completion.
 * Readable details stay in the private Putzmanager store; stock changes and journal
 * entries stay in the Lagerhaus store, committed together in one IndexedDB transaction.
 */
import {getModuleValue,mutateModuleValues} from '../assets/database.js';
import {atomicModuleChange} from '../assets/cross-module.js';
import {REWARD_RULES_KEY,REWARD_WALLET_KEY,cleaningRewardId,planCleaningReward} from '../assets/reward-economy.js';
import {ITEM_KEY,locationChoices} from './lagerhaus-items.js';
import {MOVEMENT_KEY,bookStock,stockTotal,stockPositions} from './lagerhaus-stock.js';
import {consumptionQuantity,pairEligible} from './lagerhaus-consumption.js';
import {updateContainer,untrackedAt} from './lagerhaus-tracking.js';
export const CLEAN_KEY='cleaning.sessions.v1';
export const PRESET_KEY='cleaning.material-presets.v1';
const uid=()=>globalThis.crypto?.randomUUID?.()||`pc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const iso=()=>new Date().toISOString();
const LIMIT=100, MAX_LINES=30;
const STEPS={
 wc:['WC-Reiniger auftragen','WC innen bürsten und spülen','Sitz, Deckel und Außenseiten abwischen'],
 waschbecken:['Armatur und Becken reinigen','Ablauf und Rand abwischen','Trocken nachwischen'],
 dusche:['Armatur und Wände reinigen','Duschwanne und Ablauf reinigen','Glasflächen abziehen'],
 wanne:['Badewanne reinigen','Armatur und Ablauf abwischen'],
 spiegel:['Spiegel streifenfrei reinigen'],
 schrank:['Griffe abwischen','Außenflächen reinigen'],
 waschmaschine:['Außenseiten abwischen','Türdichtung kontrollieren'],
 spuele:['Geschirr und Gegenstände wegräumen','Spüle und Wasserhahn reinigen','Ablauf und Rand abwischen'],
 herd:['Kochfeld reinigen','Bedienelemente abwischen'],
 kuehlschrank:['Griffe und Außenseite abwischen','Innenraum bei Bedarf reinigen','Türdichtung kontrollieren'],
 arbeitsplatte:['Freiräumen','Fläche und Kanten reinigen','Trocken nachwischen'],
 tisch:['Tisch freiräumen','Tischplatte reinigen'],
 sofa:['Polster absaugen','Oberflächen kontrollieren'],
 bett:['Bett machen','Staub unter dem Bett entfernen'],
 regal:['Staub entfernen','Oberflächen abwischen'],
 unterschrank:['Front und Griffe abwischen','Sockel und Kanten reinigen'],
 oberschrank:['Front und Griffe abwischen','Oberflächen abstauben'],
 geschirrspueler:['Geschirr einräumen oder ausräumen','Front und Griff reinigen','Sieb bei Bedarf prüfen'],
 backofen:['Front und Griff abwischen','Innenraum bei Bedarf reinigen'],
 stuhl:['Sitzfläche abwischen','Lehne und Beine reinigen'],
 heizkoerper:['Staub entfernen','Oberfläche abwischen'],
 muelleimer:['Müllbeutel wechseln','Behälter innen und außen reinigen'],
 dunstabzug:['Außenseite abwischen','Fettfilter prüfen'],
 sonst:['Oberflächen abwischen','Sauberkeit kontrollieren']
};
/** P02 – room-specific quick lists. User choices are private, per-room and optional. */
export const QUICK_KEY='cleaning.quick-types.v1';
export const QUICK_OPTIONS=Object.freeze({
 bad:[['waschbecken','Waschbecken'],['spiegel','Spiegel'],['dusche','Dusche'],['wanne','Badewanne'],['wc','WC'],['schrank','Schränke'],['muelleimer','Mistkübel']],
 wc:[['wc','WC-Schüssel'],['waschbecken','Handwaschbecken'],['spiegel','Spiegel'],['muelleimer','Mistkübel']],
 kueche:[['arbeitsplatte','Arbeitsplatte'],['spuele','Spüle'],['herd','Herd'],['kuehlschrank','Kühlschrank'],['geschirrspueler','Geschirrspüler'],['muelleimer','Mistkübel'],['tisch','Tisch'],['dunstabzug','Dunstabzug']]
});
const QUICK_DEFAULTS=Object.freeze({
 bad:['waschbecken','spiegel','dusche','wc','muelleimer'],
 wc:['wc','waschbecken','spiegel','muelleimer'],
 kueche:['arbeitsplatte','spuele','herd','kuehlschrank','geschirrspueler','muelleimer','tisch']
});
export function defaultQuickTypes(type){return [...(QUICK_DEFAULTS[type]||[])];}
export async function loadQuickTypes(){const v=await getModuleValue('putzmanager',QUICK_KEY);return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
export async function saveQuickTypes(roomId,roomType,types){
 const allowed=new Set((QUICK_OPTIONS[roomType]||[]).map(x=>x[0]));
 if(!allowed.size)throw Error('Für diesen Raum gibt es keine Schnellliste.');
 const selected=[...new Set(types)].filter(x=>allowed.has(x));
 await mutateModuleValues('putzmanager',[QUICK_KEY],values=>{
  const raw=values[QUICK_KEY],stored=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  stored[roomId]=selected;return [[QUICK_KEY,stored]];
 });
}
export function roomTaskGroups(room,quickTypes=defaultQuickTypes(room?.type)){
 const objects=room?.sketch3d?.objects||room?.objects||[];
 const groups=[{id:'area:floor',name:'Boden',type:'boden',steps:['Boden freiräumen','Boden saugen oder kehren','Boden feucht wischen']}];
 if(room?.sketch3d?.windows?.length)groups.push({id:'area:windows',name:'Fenster',type:'fenster',steps:['Fensterbank abwischen','Glas und Rahmen bei Bedarf reinigen']});
 if(room?.sketch3d?.doors?.length)groups.push({id:'area:doors',name:'Türen und Türgriffe',type:'tuer',steps:['Türgriffe reinigen','Türblatt bei Bedarf abwischen']});
 // Respect real room objects: never create a second task group for the same fixture type.
 const present=new Set(objects.map(o=>o.type));
 const allowed=new Map(QUICK_OPTIONS[room?.type]||[]);
 for(const type of new Set(quickTypes)){
  if(!allowed.has(type)||present.has(type))continue;
  groups.push({id:`quick:${type}`,name:allowed.get(type),type,steps:STEPS[type]||STEPS.sonst});
 }
 objects.forEach((o,i)=>groups.push({id:'object:'+(o.id||`legacy-${i}`),name:o.name,type:o.type,steps:STEPS[o.type]||STEPS.sonst}));
 return groups.map(g=>({...g,steps:g.steps.map((title,i)=>({id:g.id+':'+i,title}))}));
}
export const taskCount=groups=>groups.reduce((total,g)=>total+g.steps.length,0);
const initial=()=>({active:{},history:[]});
const normalize=v=>({active:v?.active&&typeof v.active==='object'?v.active:{},history:Array.isArray(v?.history)?v.history:[]});
export async function loadCleaningState(){return normalize(await getModuleValue('putzmanager',CLEAN_KEY));}
export async function loadMaterialPresets(){const raw=await getModuleValue('putzmanager',PRESET_KEY);return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};}
export function sessionElapsed(s,now=Date.now()){
 if(!s)return 0;
 const extra=s.status==='running'?Math.max(0,now-Date.parse(s.runningSince||s.startedAt)):0;
 return Math.max(0,Math.floor((s.elapsedMs||0)+extra));
}
export function duration(ms){let seconds=Math.floor(Math.max(0,ms)/1000);const h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=seconds%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function mutateSession(roomId,apply){
 return mutateModuleValues('putzmanager',[CLEAN_KEY],values=>{
  const state=normalize(values[CLEAN_KEY]);apply(state,state.active[roomId]);return [[CLEAN_KEY,state]];
 });
}
export async function startCleaning(room){
 const now=iso();
 await mutateModuleValues('putzmanager',[CLEAN_KEY,PRESET_KEY,QUICK_KEY],values=>{
  const state=normalize(values[CLEAN_KEY]),presets=values[PRESET_KEY]||{};
  if(state.active[room.id])throw Error('Für diesen Raum gibt es bereits eine offene Reinigung.');
  if(Object.values(state.active).some(s=>s.status==='running'))throw Error('In einem anderen Raum läuft bereits eine Stoppuhr. Bitte dort zuerst pausieren.');
  const material=Array.isArray(presets[room.id])?presets[room.id]:[];
  const pref=values[QUICK_KEY]?.[room.id],selected=Array.isArray(pref)?pref:defaultQuickTypes(room.type);
  const sessionGroups=roomTaskGroups(room,selected);
  state.active[room.id]={id:uid(),roomId:room.id,roomName:room.name,startedAt:now,runningSince:now,status:'running',elapsedMs:0,groups:sessionGroups,doneTaskIds:[],materials:material.slice(0,MAX_LINES).map(line=>({...line,id:uid()}))};
  return [[CLEAN_KEY,state]];
 });
}
export async function saveMaterialPreset(roomId){
 await mutateModuleValues('putzmanager',[CLEAN_KEY,PRESET_KEY],values=>{
  const state=normalize(values[CLEAN_KEY]),active=state.active[roomId];
  if(!active)throw Error('Reinigung zuerst starten, um Material festzulegen.');
  const raw=values[PRESET_KEY],presets=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  presets[roomId]=active.materials.map(x=>({...x}));
  return [[PRESET_KEY,presets]];
 });
}
export async function clearMaterialPreset(roomId){
 await mutateModuleValues('putzmanager',[PRESET_KEY],values=>{
  const raw=values[PRESET_KEY],presets=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  delete presets[roomId];return [[PRESET_KEY,presets]];
 });
}
export async function setTimer(roomId,mode){
 const now=Date.now(),nowIso=new Date(now).toISOString();
 await mutateSession(roomId,(state,s)=>{
  if(!s)throw Error('Keine Reinigung für diesen Raum gestartet.');
  if(mode==='pause'&&s.status==='running'){s.elapsedMs=sessionElapsed(s,now);s.runningSince=null;s.status='paused';}
  else if(mode==='resume'&&s.status==='paused'){
   if(Object.values(state.active).some(other=>other.id!==s.id&&other.status==='running'))throw Error('Bitte andere Stoppuhr zuerst pausieren.');
   s.status='running';s.runningSince=nowIso;
  }else throw Error('Stoppuhr wurde bereits umgeschaltet.');
 });
}
export async function setTaskDone(roomId,taskId,done){
 await mutateSession(roomId,(_,s)=>{
  if(!s)throw Error('Bitte zuerst Reinigung starten.');
  const ids=new Set(s.groups.flatMap(g=>g.steps.map(step=>step.id)));
  if(!ids.has(taskId))throw Error('Aufgabe nicht mehr vorhanden.');
  const next=new Set(s.doneTaskIds||[]);if(done)next.add(taskId);else next.delete(taskId);s.doneTaskIds=[...next];
 });
}
/** P03 – Ein ganzes Reinigungsobjekt mit nur einem Häkchen erledigen. */
export async function setGroupDone(roomId,groupId,done){
 await mutateSession(roomId,(_,session)=>{
  if(!session)throw Error('Bitte zuerst Reinigung starten.');
  const group=session.groups.find(g=>g.id===groupId);
  if(!group)throw Error('Reinigungsbereich nicht mehr vorhanden.');
  const next=new Set(session.doneTaskIds||[]);
  for(const step of group.steps){if(done)next.add(step.id);else next.delete(step.id);}
  session.doneTaskIds=[...next];
 });
}
export function materialSources(items,rooms,areas){
 const choices=locationChoices(rooms,areas),locName=id=>choices.find(c=>c.id===id)?.label||'Unbekannter Ort',useLabel=item=>item.useArea?' · für '+item.useArea:'';
 const result=[];
 for(const item of items){
  if(item.type!=='verbrauch'||stockTotal(item)<=0)continue;
  for(const pos of stockPositions(item)){
   const free=untrackedAt(item,pos.locationId);
   if(free>0)result.push({itemId:item.id,fromId:pos.locationId,containerId:null,name:item.name,unit:item.unit,available:free,pairs:pairEligible(item),label:`${item.name}${useLabel(item)} · ${locName(pos.locationId)} · frei ${free} ${item.unit}`});
  }
  for(const c of item.containers||[]){
   if(c.remaining>0)result.push({itemId:item.id,fromId:c.locationId,containerId:c.id,name:item.name,unit:item.unit,available:c.remaining,pairs:pairEligible(item),label:`${item.name}${useLabel(item)} · ${c.label||c.code||'Flasche'} · ${locName(c.locationId)} · Rest ${c.remaining} ${item.unit}`});
  }
 }
 return result;
}
/** Common consumables offered in one tap, respecting amounts already reserved. */
export function remainingMaterial(source,materials=[]){
 const held=materials.filter(m=>m.itemId===source.itemId&&m.fromId===source.fromId&&(m.containerId||null)===(source.containerId||null)).reduce((v,m)=>v+Number(m.quantity||0),0);
 return Math.max(0,Math.round((Number(source.available)-held)*1000)/1000);
}
export function quickMaterialChoices(sources,materials=[]){
 const categories=[
  {test:/handschuh|gloves|nitril|latex/i,qty:s=>s.pairs?{quantity:1,mode:'pairs',display:'1 Paar'}:{quantity:1,mode:'units',display:`1 ${s.unit}`}},
  {test:/müllsack|muellsack|müllbeutel|mistk[üu]belbeutel|abfallsack/i,qty:s=>({quantity:1,mode:'units',display:`1 ${s.unit}`})},
  {test:/putztuch|reinigungstuch|wischtuch|mikrofasertuch/i,qty:s=>({quantity:1,mode:'units',display:`1 ${s.unit}`})},
  {test:/reiniger|putzmittel|spülmittel|desinfektion|spray/i,qty:s=>s.unit==='ml'?{quantity:50,mode:'units',display:'50 ml'}:s.unit==='l'?{quantity:0.05,mode:'units',display:'0,05 l'}:{quantity:1,mode:'units',display:`1 ${s.unit}`}}
 ];
 const results=[];
 for(const category of categories){
  const options=sources.map((source,index)=>({source,index,amount:category.qty(source)})).filter(x=>category.test.test(x.source.name)&&remainingMaterial(x.source,materials)>=x.amount.quantity*(x.amount.mode==='pairs'?2:1));
  if(!options.length)continue;
  const selected=options[0];results.push({sourceIndex:selected.index,quantity:selected.amount.quantity,mode:selected.amount.mode,display:selected.amount.display,name:selected.source.name,remaining:remainingMaterial(selected.source,materials),unit:selected.source.unit});
 }
 return results;
}
export async function addMaterial(roomId,source,quantity,mode='units'){
 if(!source||typeof source.itemId!=='string'||!Number.isFinite(Number(source.available)))throw Error('Bitte Material aus dem Lagerhaus auswählen.');
 const units=consumptionQuantity({unit:source.unit,type:'verbrauch',name:source.name,pairCounting:source.pairs?'yes':'no'},quantity,mode);
 if(units>Number(source.available)+1e-8)throw Error('Mehr Material als verfügbar ausgewählt.');
 const line={id:uid(),itemId:source.itemId,fromId:source.fromId,containerId:source.containerId||null,quantity:units,unit:source.unit,itemName:source.name};
 await mutateSession(roomId,(_,s)=>{
  if(!s)throw Error('Bitte zuerst Reinigung starten.');
  if(s.materials.length>=MAX_LINES)throw Error('Maximal 30 Materialpositionen je Reinigung.');
  const duplicate=s.materials.find(l=>l.itemId===line.itemId&&l.fromId===line.fromId&&l.containerId===line.containerId);
  if(remainingMaterial(source,s.materials)+1e-8<line.quantity)throw Error('Diese Menge ist durch die Vormerkliste bereits ausgeschöpft. Bitte Menge reduzieren.');
  if(duplicate){duplicate.quantity=Math.round((duplicate.quantity+line.quantity)*1000)/1000;}
  else s.materials.push(line);
 });
}
export async function removeMaterial(roomId,lineId){
 await mutateSession(roomId,(_,s)=>{if(!s)throw Error('Keine Reinigung aktiv.');s.materials=s.materials.filter(line=>line.id!==lineId);});
}
export async function cancelCleaning(roomId){
 await mutateSession(roomId,(state,s)=>{if(!s)throw Error('Keine Reinigung aktiv.');delete state.active[roomId];});
}
const keysBase=[['putzmanager',CLEAN_KEY],['lagerhaus',ITEM_KEY],['lagerhaus',MOVEMENT_KEY],['lagerhaus','rooms.v1'],['lagerhaus','areas.v1'],['belohnungswelt',REWARD_RULES_KEY],['bw-wallet',REWARD_WALLET_KEY]];
export async function finishCleaning(roomId){
 // Session ID read first, but all business checks and writes are repeated in ONE transaction.
 // A concurrent finish changes the active session and the transaction aborts harmlessly.
 const before=await loadCleaningState();
 const session=before.active[roomId];
 if(!session)throw Error('Reinigung ist bereits abgeschlossen oder wurde abgebrochen.');
 const journalId=cleaningRewardId(session.id);
 return atomicModuleChange([...keysBase,['bw-journal',journalId]],values=>{
  const state=normalize(values.putzmanager[CLEAN_KEY]),s=state.active[roomId];
  if(!s)throw Error('Reinigung ist bereits abgeschlossen oder wurde abgebrochen.');
  const items=Array.isArray(values.lagerhaus[ITEM_KEY])?values.lagerhaus[ITEM_KEY]:[];
  const warehouseRooms=values.lagerhaus['rooms.v1']||[],areas=values.lagerhaus['areas.v1']||[];
  const validIds=new Set(locationChoices(warehouseRooms,areas).map(x=>x.id));
  const stockEvents=Array.isArray(values.lagerhaus[MOVEMENT_KEY])?values.lagerhaus[MOVEMENT_KEY]:[];
  const nextItems=items.slice(),newEvents=[],confirmed=[];
  const doneAt=iso();
  for(const line of s.materials){
   const index=nextItems.findIndex(i=>i.id===line.itemId);if(index<0)throw Error(`Material „${line.itemName}“ wurde im Lagerhaus gelöscht.`);
   const original=nextItems[index];if(original.type!=='verbrauch')throw Error('Nur Verbrauchsmaterial wird abgezogen.');
   const qty=consumptionQuantity(original,line.quantity,'units');
   let result;
   if(line.containerId){
    const tracked=updateContainer(nextItems,line.itemId,line.containerId,'consume',{quantity:qty},validIds,{now:doneAt,makeEventId:uid});
    nextItems.splice(0,nextItems.length,...tracked.items);
    result={event:tracked.event};
   }else{
    result=bookStock(original,{type:'issue',quantity:qty,fromId:line.fromId,unitMode:'units'},validIds,{now:doneAt,makeId:uid});
    nextItems[index]=result.item;
   }
   const event={...result.event,context:'putzmanager',cleaningId:s.id,roomId:s.roomId};
   newEvents.push(event);
   confirmed.push({itemId:line.itemId,itemName:original.name,quantity:qty,unit:original.unit,fromId:line.fromId,containerId:line.containerId||null,eventId:event.id});
  }
  const finished={id:s.id,roomId:s.roomId,roomName:s.roomName,startedAt:s.startedAt,endedAt:doneAt,durationMs:sessionElapsed(s),doneCount:s.doneTaskIds.length,totalCount:taskCount(s.groups),materials:confirmed};
  const reward=planCleaningReward(finished,{settings:values.belohnungswelt[REWARD_RULES_KEY],wallet:values['bw-wallet'][REWARD_WALLET_KEY],journal:values['bw-journal'][journalId]});
  finished.reward=reward.result;
  delete state.active[roomId];state.history=[finished,...state.history].slice(0,LIMIT);
  return {writes:[['putzmanager',CLEAN_KEY,state],['lagerhaus',ITEM_KEY,nextItems],['lagerhaus',MOVEMENT_KEY,[...stockEvents,...newEvents].slice(-3000)],...reward.writes],result:finished};
 });
}
