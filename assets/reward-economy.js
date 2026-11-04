/** BW03 – private, opt-in rewards for verified future Putzmanager completions.
 * No retroactive payouts, no rewards for health entries, no real money.
 * The caller must commit the returned writes in the same transaction as the
 * cleaning completion, its warehouse movements and the journal idempotency key.
 */
import {getModuleValue,mutateModuleValues,openDatabase} from './database.js';
import {REWARD_SCHEMA_VERSION,validateRewardEntity} from './reward-data.js';

export const REWARD_RULES_KEY='bw03:rewards:settings:v1';
export const REWARD_WALLET_KEY='balances';
export const REWARD_SOURCES=Object.freeze([
 {id:'putzmanager',label:'Putzmanager',action:'Raumreinigung abschließen',available:true},
 {id:'lagerhaus',label:'Lagerhaus',action:'Verifizierte Aufgaben',available:false},
 {id:'familienplaner',label:'Familienplaner',action:'Verifizierte Aufgaben',available:false},
 {id:'hausservice',label:'M.R Hausservice',action:'Verifizierte Aufträge',available:false},
 {id:'frauengesundheit',label:'Frauengesundheit',action:'Gesundheitsdaten',available:false}
]);
export const DEFAULT_CLEANING_RULE=Object.freeze({xpPerTask:2,coinsPerFinish:5,bonusCoinsPer10Min:1,minMinutes:1,minTasks:1,requireAll:true});
const parameterLimits={xpPerTask:[0,50],coinsPerFinish:[0,100],bonusCoinsPer10Min:[0,20],minMinutes:[0,60],minTasks:[1,60]};
const fail=message=>{throw Error('Belohnungswelt: '+message);};
const cloneDefault=()=>({version:1,sources:Object.fromEntries(REWARD_SOURCES.map(s=>[s.id,{enabled:false,enabledAt:null}])),cleaningRule:{...DEFAULT_CLEANING_RULE}});
const checkedDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function validateRewardRules(value){
 if(!value||value.version!==1||!value.sources||typeof value.sources!=='object'||!value.cleaningRule||typeof value.cleaningRule!=='object')fail('Einstellungen ungültig.');
 for(const src of REWARD_SOURCES){const permission=value.sources[src.id];
  if(!permission||typeof permission.enabled!=='boolean'||!(permission.enabledAt===null||checkedDate(permission.enabledAt)))fail('Quellfreigabe beschädigt.');
  if(!src.available&&permission.enabled)fail('Eine noch nicht unterstützte Quelle ist freigegeben.');
  if(permission.enabled&&!checkedDate(permission.enabledAt))fail('Einwilligungszeitpunkt fehlt.');
 }
 for(const [key,[min,max]] of Object.entries(parameterLimits)){
  const val=value.cleaningRule[key];if(!Number.isSafeInteger(val)||val<min||val>max)fail('Ungültiger Regelwert: '+key);
 }
 if(typeof value.cleaningRule.requireAll!=='boolean')fail('Die Vollständigkeitsregel ist ungültig.');
 return true;
}
export function normalizeRewardRules(value){
 if(value===null||value===undefined)return cloneDefault();
 validateRewardRules(value);
 return structuredClone(value);
}
export async function loadRewardRules(){return normalizeRewardRules(await getModuleValue('belohnungswelt',REWARD_RULES_KEY));}
/** Atomic consent mutation, including the moment of activation. Re-enabling never backpays old sessions. */
export async function setRewardConsent(source,enabled){
 if(source!=='putzmanager'||typeof enabled!=='boolean')fail('Nur abgeschlossene Raumreinigungen können aktuell freigegeben werden.');
 const now=new Date().toISOString();
 await mutateModuleValues('belohnungswelt',[REWARD_RULES_KEY],values=>{
  const settings=normalizeRewardRules(values[REWARD_RULES_KEY]),prior=settings.sources[source];
  if(prior.enabled!==enabled){settings.sources[source]={enabled,enabledAt:enabled?now:null};}
  validateRewardRules(settings);
  return [[REWARD_RULES_KEY,settings]];
 });
 return loadRewardRules();
}
export async function saveRewardCleaningRule(changes){
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).some(k=>!(k in DEFAULT_CLEANING_RULE)))fail('Unbekannter Regelparameter.');
 await mutateModuleValues('belohnungswelt',[REWARD_RULES_KEY],values=>{
  const settings=normalizeRewardRules(values[REWARD_RULES_KEY]);
  settings.cleaningRule={...settings.cleaningRule,...changes};
  validateRewardRules(settings);
  return [[REWARD_RULES_KEY,settings]];
 });
 return loadRewardRules();
}
export function cleaningRewardId(cleaningId){
 if(typeof cleaningId!=='string'||!(/^[a-zA-Z0-9:_-]{4,120}$/).test(cleaningId))fail('Ungültige Reinigungs-ID.');
 return `reward:clean:${cleaningId.toLowerCase()}`;
}
export function calculateCleaningReward(session,settings){
 validateRewardRules(settings);
 const permission=settings.sources.putzmanager;
 if(!permission.enabled)return {eligible:false,reason:'Freigabe ausgeschaltet'};
 if(!session||!checkedDate(session.startedAt)||!checkedDate(session.endedAt))return {eligible:false,reason:'Ungültiger Sitzungszeitpunkt'};
 const start=Date.parse(session.startedAt),end=Date.parse(session.endedAt),enabledAt=Date.parse(permission.enabledAt);
 if(start<enabledAt)return {eligible:false,reason:'Sitzung vor Einwilligung begonnen'};
 if(end<start||end> Date.now()+5*60*1000)return {eligible:false,reason:'Ungültiger Abschlusszeitpunkt'};
 const {doneCount,totalCount,durationMs}=session,rule=settings.cleaningRule;
 if(!Number.isSafeInteger(doneCount)||!Number.isSafeInteger(totalCount)||totalCount<1||doneCount<0||doneCount>totalCount)return {eligible:false,reason:'Aufgabenzahl ungültig'};
 if(!Number.isFinite(durationMs)||durationMs<0||durationMs>48*3600000)return {eligible:false,reason:'Zeitmessung ungültig'};
 if(doneCount<rule.minTasks)return {eligible:false,reason:'Zu wenige Aufgaben erledigt'};
 if(rule.requireAll&&doneCount!==totalCount)return {eligible:false,reason:'Nicht alle Aufgaben erledigt'};
 if(durationMs<rule.minMinutes*60000)return {eligible:false,reason:'Mindestzeit nicht erreicht'};
 const xp=Math.min(1000,doneCount*rule.xpPerTask);
 const coins=Math.min(250,rule.coinsPerFinish+Math.floor(durationMs/600000)*rule.bonusCoinsPer10Min);
 if(!xp&&!coins)return {eligible:false,reason:'Belohnungswerte sind 0'};
 return {eligible:true,xp,coins,shards:0,rule:{...rule}};
}
/** Called INSIDE the cleaning/warehouse IndexedDB transaction – zero await/side effects. */
export function planCleaningReward(session,{settings,wallet,journal}){
 const rule=normalizeRewardRules(settings),calculated=calculateCleaningReward(session,rule);
 if(!calculated.eligible)return {writes:[],result:{awarded:false,reason:calculated.reason}};
 const id=cleaningRewardId(session.id);
 if(journal!==null&&journal!==undefined)return {writes:[],result:{awarded:false,reason:'Ereignis bereits belohnt'}};
 const current=wallet??{id:REWARD_WALLET_KEY,schemaVersion:REWARD_SCHEMA_VERSION,xp:0,coins:0,shards:0};
 validateRewardEntity('bw-wallet',current);
 if(current.id!=='balances'||current.xp>Number.MAX_SAFE_INTEGER-calculated.xp||current.coins>Number.MAX_SAFE_INTEGER-calculated.coins)fail('Guthaben konnte nicht sicher erhöht werden.');
 const updated={...current,xp:current.xp+calculated.xp,coins:current.coins+calculated.coins};
 const entry={id,schemaVersion:REWARD_SCHEMA_VERSION,type:'cleaning-complete',source:'putzmanager',sourceId:session.id,createdAt:session.endedAt,
  xp:calculated.xp,coins:calculated.coins,shards:0,doneCount:session.doneCount,totalCount:session.totalCount,durationMs:session.durationMs,rule:calculated.rule};
 validateRewardEntity('bw-wallet',updated);validateRewardEntity('bw-journal',entry);
 return {writes:[['bw-wallet',REWARD_WALLET_KEY,updated],['bw-journal',id,entry]],result:{awarded:true,xp:calculated.xp,coins:calculated.coins,shards:0}};
}
export async function loadRewardEconomy(){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['belohnungswelt','bw-wallet','bw-journal'],'readonly');
  const settings=tx.objectStore('belohnungswelt').get(REWARD_RULES_KEY);
  const wallet=tx.objectStore('bw-wallet').get(REWARD_WALLET_KEY);
  const journal=tx.objectStore('bw-journal').getAll();
  tx.oncomplete=()=>{
   try{const config=normalizeRewardRules(settings.result),balance=wallet.result??{xp:0,coins:0,shards:0};
    if(wallet.result)validateRewardEntity('bw-wallet',wallet.result);
    resolve({settings:config,wallet:{xp:balance.xp,coins:balance.coins,shards:balance.shards},journal:(journal.result||[]).filter(x=>x?.type==='cleaning-complete').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100)});
   }catch(err){reject(err);}
  };
  tx.onerror=()=>{};tx.onabort=()=>reject(tx.error||Error('Belohnungsübersicht konnte nicht geladen werden.'));
 });
}
