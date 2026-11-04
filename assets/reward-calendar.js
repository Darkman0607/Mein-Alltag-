/** BW09 – opt-in reward calendar; all payouts are explicit and atomic.
 * Only verified post-activation cleaning journal events contribute to the task bonus.
 * Never reads health, school or other personal module data. No network dependencies.
 */
import {openDatabase,mutateModuleValues,getModuleValue} from './database.js';
import {REWARD_SCHEMA_VERSION,validateRewardEntity} from './reward-data.js';
import {missionWindow} from './reward-missions.js';

export const CALENDAR_SETTINGS_KEY='bw09:calendar:settings:v1';
export const CALENDAR_VERSION=1;
export const CALENDAR_REWARDS=Object.freeze({
 daily:Object.freeze({xp:6,coins:5}),
 tasks:Object.freeze({xp:10,coins:6,target:5})
});
export const CALENDAR_MILESTONES=Object.freeze([
 Object.freeze({days:3,xp:15,coins:10,label:'Drei Geschenktage'}),
 Object.freeze({days:7,xp:35,coins:25,label:'Sieben Geschenktage'}),
 Object.freeze({days:14,xp:75,coins:50,label:'Vierzehn Geschenktage'}),
 Object.freeze({days:30,xp:150,coins:100,label:'Dreißig Geschenktage'})
]);
const fail=m=>{throw Error('BW09 Belohnungskalender: '+m);};
const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export const initialCalendarSettings=()=>({version:CALENDAR_VERSION,enabled:false,activatedAt:null});
export function normalizeCalendarSettings(raw){
 const v=raw==null?initialCalendarSettings():structuredClone(raw);
 if(v.version!==CALENDAR_VERSION||typeof v.enabled!=='boolean'||!(v.activatedAt===null||validDate(v.activatedAt))||v.enabled&&!validDate(v.activatedAt))fail('Ungültige Kalenderfreigabe.');
 return v;
}
export async function activateRewardCalendar(){
 const now=new Date().toISOString();
 await mutateModuleValues('belohnungswelt',[CALENDAR_SETTINGS_KEY],data=>{
  const current=normalizeCalendarSettings(data[CALENDAR_SETTINGS_KEY]);
  if(!current.enabled){current.enabled=true;current.activatedAt=now;}
  return [[CALENDAR_SETTINGS_KEY,current]];
 });
 return normalizeCalendarSettings(await getModuleValue('belohnungswelt',CALENDAR_SETTINGS_KEY));
}
export function calendarClaimId(type,dateOrDays){
 if(type==='daily'||type==='tasks'){
  if(typeof dateOrDays!=='string'||!/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(dateOrDays))fail('Ungültiger Kalendertag.');
  const [year,month,day]=dateOrDays.split('-').map(Number);
  const d=new Date(year,month-1,day);
  if(d.getFullYear()!==year||d.getMonth()+1!==month||d.getDate()!==day)fail('Kalenderdatum existiert nicht.');
  return `calendar:${type}:${dateOrDays}`;
 }
 if(type==='milestone'&&CALENDAR_MILESTONES.some(m=>m.days===dateOrDays))return `calendar:milestone:${dateOrDays}`;
 fail('Unbekannte Kalenderprämie.');
}
function eligibleCleanings(journal,settings,window,now){
 const after=Date.parse(settings.activatedAt);const unique=new Map();
 for(const event of journal){
  if(!event||event.type!=='cleaning-complete'||event.source!=='putzmanager'||typeof event.id!=='string'||!event.id.startsWith('reward:clean:')||!validDate(event.createdAt)||typeof event.sourceId!=='string'||!event.sourceId||!Number.isSafeInteger(event.doneCount)||event.doneCount<1||event.doneCount>60||!Number.isSafeInteger(event.totalCount)||event.totalCount<event.doneCount)continue;
  const stamp=Date.parse(event.createdAt);
  if(stamp<after||stamp<window.start||stamp>=window.end||stamp>now)continue;
  unique.set(event.id,event.doneCount);
 }
 return [...unique.values()].reduce((sum,n)=>sum+n,0);
}
function dailyHistory(journal,settings,now){
 const after=Date.parse(settings.activatedAt),days=new Set();
 for(const entry of journal){
  if(entry?.type!=='calendar-gift'||!validDate(entry.createdAt)||typeof entry.periodKey!=='string')continue;
  const stamp=Date.parse(entry.createdAt);
  if(stamp<after||stamp>now)continue;
  try{if(entry.id===calendarClaimId('daily',entry.periodKey)&&missionWindow('day',new Date(entry.createdAt)).key===entry.periodKey)days.add(entry.periodKey);}catch{}
 }
 return days;
}
/** Pure read: never creates money, XP, journal entries or mission progress. */
export function evaluateRewardCalendar({settings,journal=[],wallet=null},when=new Date()){
 const safe=normalizeCalendarSettings(settings),stamp=new Date(when).getTime();
 if(!Number.isFinite(stamp))fail('Ungültiger Zeitpunkt.');
 if(!Array.isArray(journal))fail('Journal ungültig.');
 const window=missionWindow('day',when),today=window.key;
 const history=safe.enabled?dailyHistory(journal,safe,stamp):new Set();
 const claims=new Set(journal.filter(e=>e&&['calendar-gift','calendar-task-bonus','calendar-milestone'].includes(e.type)).map(e=>e.id));
 const tasks=safe.enabled?eligibleCleanings(journal,safe,window,stamp):0;
 const gifts=history.size;
 const claimedGift=claims.has(calendarClaimId('daily',today));
 const claimedBonus=claims.has(calendarClaimId('tasks',today));
 const milestones=CALENDAR_MILESTONES.map(m=>({...m,claimed:claims.has(calendarClaimId('milestone',m.days)),ready:safe.enabled&&gifts>=m.days&&!claims.has(calendarClaimId('milestone',m.days)),progress:Math.min(gifts,m.days)}));
 const account=wallet??{id:'balances',schemaVersion:REWARD_SCHEMA_VERSION,xp:0,coins:0,shards:0};
 validateRewardEntity('bw-wallet',account);
 return {settings:safe,today,claimedDays:[...history].sort(),gift:{...CALENDAR_REWARDS.daily,claimed:claimedGift,ready:safe.enabled&&!claimedGift},taskBonus:{...CALENDAR_REWARDS.tasks,progress:Math.min(tasks,CALENDAR_REWARDS.tasks.target),actualProgress:tasks,claimed:claimedBonus,ready:safe.enabled&&!claimedBonus&&tasks>=CALENDAR_REWARDS.tasks.target},milestones,totalGiftDays:gifts,readyCount:Number(safe.enabled&&!claimedGift)+Number(safe.enabled&&!claimedBonus&&tasks>=CALENDAR_REWARDS.tasks.target)+milestones.filter(m=>m.ready).length,wallet:{xp:account.xp,coins:account.coins,shards:account.shards}};
}
export async function loadRewardCalendar(when=new Date()){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['belohnungswelt','bw-journal','bw-wallet'],'readonly');
  const req={settings:tx.objectStore('belohnungswelt').get(CALENDAR_SETTINGS_KEY),journal:tx.objectStore('bw-journal').getAll(),wallet:tx.objectStore('bw-wallet').get('balances')};
  tx.oncomplete=()=>{try{resolve(evaluateRewardCalendar(Object.fromEntries(Object.entries(req).map(([k,r])=>[k,r.result])),when));}catch(e){reject(e);}};
  tx.onerror=()=>{};tx.onabort=()=>reject(tx.error||Error('Kalender konnte nicht geladen werden.'));
 });
}
/** Exactly one wallet + journal transaction. The unique calendar ID is the idempotency key. */
export async function claimRewardCalendar(type,milestoneDays=null){
 if(!['daily','tasks','milestone'].includes(type))fail('Ungültige Aktion.');
 if(type==='milestone'&&!CALENDAR_MILESTONES.some(m=>m.days===milestoneDays))fail('Unbekannter Meilenstein.');
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['belohnungswelt','bw-journal','bw-wallet'],'readwrite');
  const journalStore=tx.objectStore('bw-journal'),walletStore=tx.objectStore('bw-wallet');
  const req={settings:tx.objectStore('belohnungswelt').get(CALENDAR_SETTINGS_KEY),journal:journalStore.getAll(),wallet:walletStore.get('balances')};
  let remaining=Object.keys(req).length,error=null,outcome=null;
  tx.oncomplete=()=>resolve(outcome);tx.onerror=()=>{};tx.onabort=()=>reject(error||tx.error||Error('Buchung fehlgeschlagen. Guthaben wurde nicht verändert.'));
  function commit(){try{
   const now=new Date(),data=Object.fromEntries(Object.entries(req).map(([k,r])=>[k,r.result]));
   const board=evaluateRewardCalendar(data,now);
   if(!board.settings.enabled)fail('Belohnungskalender zuerst aktivieren.');
   const period=board.today,id=calendarClaimId(type,type==='milestone'?milestoneDays:period);
   const expectedType={daily:'calendar-gift',tasks:'calendar-task-bonus',milestone:'calendar-milestone'}[type];
   const previous=data.journal.find(e=>e?.id===id);
   if(previous){if(previous.type!==expectedType||previous.id!==id)fail('Widersprüchliche Buchungs-ID.');outcome={...previous,replayed:true};return;}
   const reward=type==='daily'?board.gift:type==='tasks'?board.taskBonus:board.milestones.find(m=>m.days===milestoneDays);
   if(!reward?.ready)fail(type==='tasks'?'Aufgabenbonus noch nicht erreicht.':'Belohnung noch nicht verfügbar.');
   const current=data.wallet??{id:'balances',schemaVersion:REWARD_SCHEMA_VERSION,xp:0,coins:0,shards:0};
   validateRewardEntity('bw-wallet',current);
   if(!Number.isSafeInteger(current.coins+reward.coins)||!Number.isSafeInteger(current.xp+reward.xp))fail('Kontolimit erreicht.');
   const updated={...current,xp:current.xp+reward.xp,coins:current.coins+reward.coins};
   const entry={id,schemaVersion:REWARD_SCHEMA_VERSION,type:expectedType,createdAt:now.toISOString(),periodKey:type==='milestone'?'all':period,xp:reward.xp,coins:reward.coins,shards:0};
   if(type==='milestone')entry.milestoneDays=milestoneDays;
   if(type==='tasks')entry.verifiedTasks=board.taskBonus.actualProgress;
   validateRewardEntity('bw-wallet',updated);validateRewardEntity('bw-journal',entry);
   walletStore.put(updated,'balances');journalStore.add(entry,id);
   outcome={...entry,replayed:false};
  }catch(e){error=e;tx.abort();}}
  for(const r of Object.values(req))r.onsuccess=()=>{if(--remaining===0)commit();};
 });
}
