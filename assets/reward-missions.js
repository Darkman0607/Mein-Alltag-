/** BW08 – durable, explicit-claim missions based solely on verifiable BW journal events.
 * No health data, no background payments, no self-declared completion or retroactive event rewards.
 * Existing stores and the v1 reward schema stay unchanged for backup compatibility.
 */
import {openDatabase,mutateModuleValues,getModuleValue} from './database.js';
import {REWARD_SCHEMA_VERSION,validateRewardEntity} from './reward-data.js';

export const MISSION_SETTINGS_KEY='bw08:missions:settings:v1';
export const MISSION_VERSION=1;
export const MISSION_DEFINITIONS=Object.freeze([
 {id:'daily-clean',period:'day',metric:'cleanings',target:1,title:'Ein Raum geschafft',description:'Schließe heute eine freigegebene Raumreinigung ab.',icon:'🧽',xp:12,coins:5},
 {id:'daily-tasks',period:'day',metric:'tasks',target:5,title:'Fünf Aufgaben erledigt',description:'Erledige heute insgesamt fünf bestätigte Putzaufgaben.',icon:'✅',xp:8,coins:4},
 {id:'daily-opening',period:'day',metric:'openings',target:1,title:'Booster-Moment',description:'Öffne heute einen gekauften Booster.',icon:'🎴',xp:8,coins:3},
 {id:'weekly-clean',period:'week',metric:'cleanings',target:3,title:'Drei Räume diese Woche',description:'Schließe drei freigegebene Raumreinigungen ab.',icon:'🏡',xp:30,coins:15},
 {id:'weekly-tasks',period:'week',metric:'tasks',target:15,title:'15 Häkchen gesetzt',description:'Erledige diese Woche 15 bestätigte Putzaufgaben.',icon:'📋',xp:25,coins:10},
 {id:'weekly-opening',period:'week',metric:'openings',target:2,title:'Zwei Booster geöffnet',description:'Öffne in dieser Woche zwei gekaufte Booster.',icon:'✨',xp:18,coins:6},
 {id:'monthly-clean',period:'month',metric:'cleanings',target:10,title:'Zehn saubere Räume',description:'Schließe in diesem Monat zehn freigegebene Raumreinigungen ab.',icon:'🌟',xp:80,coins:35},
 {id:'monthly-opening',period:'month',metric:'openings',target:5,title:'Fünf Booster-Momente',description:'Öffne in diesem Monat fünf gekaufte Booster.',icon:'🎁',xp:45,coins:20},
 {id:'collector-5',period:'all',metric:'unique',target:5,title:'Sammlerstart',description:'Besitze fünf unterschiedliche Karten.',icon:'📘',xp:15,coins:8},
 {id:'collector-20',period:'all',metric:'unique',target:20,title:'Kartenschatz',description:'Besitze 20 unterschiedliche Karten.',icon:'🏆',xp:50,coins:25},
 {id:'collector-50',period:'all',metric:'unique',target:50,title:'Großer Sammler',description:'Besitze 50 unterschiedliche Karten.',icon:'💠',xp:125,coins:60},
 {id:'collector-100',period:'all',metric:'unique',target:100,title:'Komplettalbum',description:'Besitze alle 100 unterschiedlichen Karten.',icon:'👑',xp:300,coins:150}
].map(x=>Object.freeze(x)));
const definitionById=new Map(MISSION_DEFINITIONS.map(x=>[x.id,x]));
const fail=message=>{throw Error('BW08 Missionen: '+message);};
const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
export const initialMissionSettings=()=>({version:MISSION_VERSION,enabled:false,activatedAt:null});
export function normalizeMissionSettings(value){
 const s=value==null?initialMissionSettings():structuredClone(value);
 if(s.version!==MISSION_VERSION||typeof s.enabled!=='boolean'||!(s.activatedAt===null||validTime(s.activatedAt))||s.enabled&&!validTime(s.activatedAt))fail('Missionseinstellungen beschädigt.');
 return s;
}
export async function activateMissions(){
 const time=new Date().toISOString();
 await mutateModuleValues('belohnungswelt',[MISSION_SETTINGS_KEY],data=>{
  const settings=normalizeMissionSettings(data[MISSION_SETTINGS_KEY]);
  if(!settings.enabled){settings.enabled=true;settings.activatedAt=time;}
  return [[MISSION_SETTINGS_KEY,settings]];
 });
 return normalizeMissionSettings(await getModuleValue('belohnungswelt',MISSION_SETTINGS_KEY));
}
function pad2(n){return String(n).padStart(2,'0');}
function dayKey(d){return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;}
/** Local wall-clock boundaries, including DST transitions and Monday-based ISO weeks. */
export function missionWindow(period,when=new Date()){
 const d=new Date(when);
 if(!Number.isFinite(d.getTime()))fail('Datum ungültig.');
 if(period==='all')return {key:'all',start:null,end:null,label:'Dauerhaft'};
 if(period==='day'){
  const start=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
  return {key:dayKey(start),start:start.getTime(),end:end.getTime(),label:'Heute'};
 }
 if(period==='week'){
  const start=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7));
  const end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+7);
  return {key:dayKey(start),start:start.getTime(),end:end.getTime(),label:'Diese Woche'};
 }
 if(period==='month'){
  const start=new Date(d.getFullYear(),d.getMonth(),1);
  const end=new Date(d.getFullYear(),d.getMonth()+1,1);
  return {key:`${d.getFullYear()}-${pad2(d.getMonth()+1)}`,start:start.getTime(),end:end.getTime(),label:'Dieser Monat'};
 }
 fail('Zeitraum unbekannt.');
}
export function missionClaimId(definition,periodKey){
 const def=typeof definition==='string'?definitionById.get(definition):definition;
 if(!def||!definitionById.has(def.id)||!(periodKey==='all'||/^\d{4}-\d{2}(?:-\d{2})?$/.test(periodKey)))fail('Ungültige Mission.');
 return `mission:${def.id}:${periodKey}`;
}
/** Only finished, journaled source events after user activation may count. */
export function missionProgress(def,settings,journal,instances,catalog,when=new Date()){
 const w=missionWindow(def.period,when),now=new Date(when).getTime();
 if(!settings.enabled)return 0;
 if(def.metric==='unique'){
  const validIds=new Set(catalog.filter(x=>x?.id&&x.schemaVersion===REWARD_SCHEMA_VERSION).map(x=>x.id));
  return new Set(instances.filter(x=>validIds.has(x?.cardId)&&x?.schemaVersion===REWARD_SCHEMA_VERSION).map(x=>x.cardId)).size;
 }
 const threshold=Date.parse(settings.activatedAt);
 const eligible=journal.filter(x=>{
  if(!x||typeof x.id!=='string'||!validTime(x.createdAt))return false;
  const date=Date.parse(x.createdAt);
  return date>=threshold&&date>=w.start&&date<w.end&&date<=now;
 });
 if(def.metric==='cleanings'||def.metric==='tasks'){
  const sessions=eligible.filter(x=>x.type==='cleaning-complete'&&x.source==='putzmanager'&&typeof x.sourceId==='string'&&Number.isSafeInteger(x.doneCount)&&x.doneCount>0&&Number.isSafeInteger(x.totalCount)&&x.totalCount>=x.doneCount&&x.doneCount<=60&&x.id.startsWith('reward:clean:'));
  const unique=[...new Map(sessions.map(x=>[x.id,x])).values()];
  return def.metric==='cleanings'?unique.length:unique.reduce((sum,x)=>sum+x.doneCount,0);
 }
 if(def.metric==='openings')return new Set(eligible.filter(x=>x.type==='booster-open'&&x.id.startsWith('opening:')&&Array.isArray(x.cards)&&x.cards.length===5&&typeof x.packId==='string').map(x=>x.id)).size;
 fail('Unbekannte Fortschrittsart.');
}
/** Pure board snapshot; the read path never issues a reward or writes a record. */
export function evaluateMissionBoard({settings,journal=[],instances=[],catalog=[],wallet=null},when=new Date()){
 const safe=normalizeMissionSettings(settings),claimIds=new Set(journal.filter(x=>x?.type==='mission-claim').map(x=>x.id));
 const missions=MISSION_DEFINITIONS.map(def=>{
  const window=missionWindow(def.period,when),claimId=missionClaimId(def,window.key);
  const progress=missionProgress(def,safe,journal,instances,catalog,when);
  const claimed=claimIds.has(claimId);
  return {...def,periodKey:window.key,claimId,progress:Math.min(def.target,progress),actualProgress:progress,complete:progress>=def.target,claimed,claimable:safe.enabled&&!claimed&&progress>=def.target};
 });
 const balance=wallet??{id:'balances',schemaVersion:1,xp:0,coins:0,shards:0};
 validateRewardEntity('bw-wallet',balance);
 return {settings:safe,missions,wallet:{xp:balance.xp,coins:balance.coins,shards:balance.shards},summary:{available:missions.length,ready:missions.filter(x=>x.claimable).length,claimed:missions.filter(x=>x.claimed).length}};
}
export async function loadMissionBoard(when=new Date()){
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['belohnungswelt','bw-journal','bw-instances','bw-catalog','bw-wallet'],'readonly');
  const requests={settings:tx.objectStore('belohnungswelt').get(MISSION_SETTINGS_KEY),journal:tx.objectStore('bw-journal').getAll(),instances:tx.objectStore('bw-instances').getAll(),catalog:tx.objectStore('bw-catalog').getAll(),wallet:tx.objectStore('bw-wallet').get('balances')};
  tx.oncomplete=()=>{try{resolve(evaluateMissionBoard(Object.fromEntries(Object.entries(requests).map(([key,request])=>[key,request.result])),when));}catch(e){reject(e);}};
  tx.onerror=()=>{};tx.onabort=()=>reject(tx.error||Error('Missionen konnten nicht geladen werden.'));
 });
}
/** Atomic claim: mission record and wallet are written in the SAME transaction.
 * Stable per-period claim ID prevents double payout across taps, reloads, and tabs.
 */
export async function claimMission(missionId,when=new Date()){
 const def=definitionById.get(missionId);if(!def)fail('Unbekannte Mission.');
 const window=missionWindow(def.period,when),claimId=missionClaimId(def,window.key);
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['belohnungswelt','bw-journal','bw-instances','bw-catalog','bw-wallet'],'readwrite');
  const journalStore=tx.objectStore('bw-journal'),walletStore=tx.objectStore('bw-wallet');
  const requests={settings:tx.objectStore('belohnungswelt').get(MISSION_SETTINGS_KEY),journal:journalStore.getAll(),instances:tx.objectStore('bw-instances').getAll(),catalog:tx.objectStore('bw-catalog').getAll(),wallet:walletStore.get('balances')};
  let remaining=Object.keys(requests).length,error=null,result=null;
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>{};tx.onabort=()=>reject(error||tx.error||Error('Mission nicht ausgezahlt. Guthaben bleibt erhalten.'));
  function run(){try{
   const data=Object.fromEntries(Object.entries(requests).map(([key,request])=>[key,request.result]));
   const settings=normalizeMissionSettings(data.settings);
   if(!settings.enabled)fail('Missionen zuerst aktivieren.');
   const previous=(data.journal||[]).find(x=>x.id===claimId);
   if(previous){if(previous.type!=='mission-claim'||previous.missionId!==def.id||previous.periodKey!==window.key)fail('Widersprüchliche Missions-ID.');result={...previous,replayed:true};return;}
   const now=new Date();
   // Reject a stale period from a delayed request after midnight/week/month rollover.
   if(missionWindow(def.period,now).key!==window.key)fail('Der Missionszeitraum ist abgelaufen. Missionen neu laden.');
   const progress=missionProgress(def,settings,data.journal||[],data.instances||[],data.catalog||[],now);
   if(progress<def.target)fail(`Mission noch nicht abgeschlossen (${Math.min(progress,def.target)}/${def.target}).`);
   const wallet=data.wallet??{id:'balances',schemaVersion:REWARD_SCHEMA_VERSION,xp:0,coins:0,shards:0};
   validateRewardEntity('bw-wallet',wallet);
   if(!Number.isSafeInteger(wallet.xp+def.xp)||!Number.isSafeInteger(wallet.coins+def.coins))fail('Kontolimit erreicht.');
   const newWallet={...wallet,xp:wallet.xp+def.xp,coins:wallet.coins+def.coins},createdAt=now.toISOString();
   const entry={id:claimId,schemaVersion:REWARD_SCHEMA_VERSION,type:'mission-claim',createdAt,missionId:def.id,periodKey:window.key,progressAtClaim:progress,xp:def.xp,coins:def.coins,shards:0};
   validateRewardEntity('bw-wallet',newWallet);validateRewardEntity('bw-journal',entry);
   walletStore.put(newWallet,'balances');journalStore.add(entry,claimId);
   result={...entry,replayed:false};
  }catch(e){error=e;tx.abort();}}
  for(const req of Object.values(requests))req.onsuccess=()=>{if(--remaining===0)run();};
 });
}
