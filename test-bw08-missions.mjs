import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
// IndexedDB test harness with whole-transaction staging and rollback.
const stores=new Map();
const db={objectStoreNames:{contains:name=>stores.has(name),[Symbol.iterator]:function*(){yield* stores.keys();}},
 createObjectStore(name){stores.set(name,new Map());},
 transaction(names){names=Array.isArray(names)?names:[names];const stage=new Map(names.map(name=>[name,new Map(stores.get(name))]));
  let pending=0,ended=false,timer=null;const tx={error:null,oncomplete:null,onabort:null,onerror:null};
  function done(){clearTimeout(timer);timer=setTimeout(()=>{if(ended||pending)return;ended=true;for(const [name,m] of stage)stores.set(name,m);tx.oncomplete?.();},0);}
  function req(fn){const q={result:undefined,error:null,onsuccess:null,onerror:null};pending++;
   queueMicrotask(()=>{if(ended)return;try{q.result=fn();q.onsuccess?.({target:q});}catch(e){q.error=e;tx.error=e;tx.abort();q.onerror?.({target:q});}finally{pending--;done();}});return q;}
  tx.objectStore=name=>{assert(stage.has(name),`unknown store ${name}`);const s=stage.get(name);return {
   get:key=>req(()=>structuredClone(s.get(key))),getAll:()=>req(()=>structuredClone([...s.values()])),getAllKeys:()=>req(()=>[...s.keys()]),count:()=>req(()=>s.size),
   put:(data,key)=>req(()=>s.set(key,structuredClone(data))),delete:key=>req(()=>s.delete(key)),add:(data,key)=>req(()=>{if(s.has(key))throw Error('ConstraintError');s.set(key,structuredClone(data));}),clear:()=>req(()=>s.clear())
  };};tx.abort=()=>{if(ended)return;ended=true;clearTimeout(timer);queueMicrotask(()=>tx.onabort?.());};return tx;
 }};
globalThis.indexedDB={open(){const q={result:db,error:null};queueMicrotask(()=>{if(!stores.size)q.onupgradeneeded?.();q.onsuccess?.();});return q;}};
const {MISSION_DEFINITIONS,missionWindow,missionClaimId,missionProgress,loadMissionBoard,activateMissions,claimMission,normalizeMissionSettings}=await import('./assets/reward-missions.js');
const {captureSnapshot,restoreSnapshot}=await import('./assets/backup.js');
const {REWARD_SCHEMA_VERSION}=await import('./assets/reward-data.js');
assert.equal(MISSION_DEFINITIONS.length,12);
assert.equal(new Set(MISSION_DEFINITIONS.map(m=>m.id)).size,12);
assert.deepEqual([...new Set(MISSION_DEFINITIONS.map(m=>m.period))].sort(),['all','day','month','week']);
assert.equal(missionWindow('week',new Date(2026,10,4)).key,'2026-11-02'); // Wed -> Mon
assert.equal(missionWindow('week',new Date(2026,10,8)).key,'2026-11-02'); // Sun
assert.equal(missionWindow('week',new Date(2026,10,9)).key,'2026-11-09'); // next Mon
assert.notEqual(missionWindow('day',new Date(2026,10,4,23,59)).key,missionWindow('day',new Date(2026,10,5)).key);
assert.equal(missionWindow('month',new Date(2026,11,1)).key,'2026-12');
assert.equal(missionClaimId('collector-5','all'),'mission:collector-5:all');
assert.throws(()=>missionClaimId('fake','all'),/Ungültige/);
assert.throws(()=>normalizeMissionSettings({version:1,enabled:true,activatedAt:null}),/beschädigt/);
const before=await loadMissionBoard();
assert.equal(before.settings.enabled,false);
assert.equal(before.summary.ready,0);
assert.equal(stores.get('belohnungswelt')?.size||0,0,'read must not write');
await assert.rejects(claimMission('daily-clean'),/aktivieren/);
const rules=await activateMissions();assert.equal(rules.enabled,true);
const repeated=await activateMissions();assert.equal(repeated.activatedAt,rules.activatedAt,'repeated activation is idempotent');
const started=Date.parse(rules.activatedAt);
// Earlier / forged records do not count, including health and manually written non-reward records.
const earlier=new Date(started-60000).toISOString();
stores.get('bw-journal').set('reward:clean:old',{id:'reward:clean:old',type:'cleaning-complete',source:'putzmanager',sourceId:'old',doneCount:10,totalCount:10,createdAt:earlier});
stores.get('bw-journal').set('health:x',{id:'health:x',type:'cleaning-complete',source:'frauengesundheit',sourceId:'health',doneCount:100,totalCount:100,createdAt:new Date().toISOString()});
assert.equal((await loadMissionBoard()).missions.find(m=>m.id==='daily-clean').progress,0);
const fresh=new Date().toISOString();
for(let i=0;i<3;i++){
 const id=`reward:clean:session${i}`;
 stores.get('bw-journal').set(id,{id,type:'cleaning-complete',source:'putzmanager',sourceId:`session${i}`,doneCount:i===0?5:5,totalCount:5,createdAt:fresh});
}
for(let i=0;i<2;i++){
 const id=`opening:pack-${i}`;
 stores.get('bw-journal').set(id,{id,type:'booster-open',createdAt:fresh,packId:`pack:example-${i}`,cards:Array.from({length:5},()=>({cardId:'catalog:monster:001'}))});
}
let board=await loadMissionBoard();
for(const key of ['daily-clean','daily-tasks','weekly-clean','weekly-tasks','daily-opening','weekly-opening'])assert(board.missions.find(x=>x.id===key).claimable,key+' should be claimable');
for(const key of ['monthly-clean','monthly-opening'])assert(!board.missions.find(x=>x.id===key).claimable,key+' should not be claimable');
assert.equal(board.missions.find(x=>x.id==='daily-tasks').actualProgress,15);
// No fake collection payouts when the catalogue exists but no copies have been drawn.
assert.equal(board.missions.find(x=>x.id==='collector-5').progress,0);
const walletBefore=board.wallet;
const first=await claimMission('daily-clean');assert.equal(first.replayed,false);assert.equal(first.xp,12);assert.equal(first.coins,5);
assert.equal((await claimMission('daily-clean')).replayed,true,'no double payout for repeated claim');
let after=await loadMissionBoard();
assert.equal(after.wallet.xp,walletBefore.xp+12);assert.equal(after.wallet.coins,walletBefore.coins+5);
assert.equal(after.missions.find(x=>x.id==='daily-clean').claimed,true);
await claimMission('weekly-clean');await claimMission('daily-opening');
const journal=stores.get('bw-journal');
assert.equal([...journal.values()].filter(e=>e.type==='mission-claim').length,3);
// 5 distinct owned, existing copies may count without fabricating ownership.
for(let i=0;i<5;i++){
 const id=`catalog:monster:${String(i+1).padStart(3,'0')}`,copyId=`copy:test-${i}`;
 stores.get('bw-catalog').set(id,{id,number:i+1,categoryId:'monster',seriesId:'series:monster',templateId:null,name:'Test '+i,rarity:'gewoehnlich',schemaVersion:REWARD_SCHEMA_VERSION});
 stores.get('bw-instances').set(copyId,{id:copyId,cardId:id,obtainedAt:fresh,locked:false,schemaVersion:REWARD_SCHEMA_VERSION});
}
const prepared=await loadMissionBoard();assert(prepared.missions.find(m=>m.id==='collector-5').claimable);
await claimMission('collector-5');
assert.equal((await claimMission('collector-5')).replayed,true);
// Verify payout journal, ownership and settings survive full backup / restore.
const snapshot=await captureSnapshot();const counted=stores.get('bw-journal').size;
const walletSnapshot=structuredClone(stores.get('bw-wallet').get('balances'));
stores.get('bw-journal').clear();stores.get('bw-instances').clear();stores.get('bw-wallet').clear();
await restoreSnapshot(snapshot);
assert.equal(stores.get('bw-journal').size,counted);
assert.deepEqual(stores.get('bw-wallet').get('balances'),walletSnapshot);
assert.equal((await loadMissionBoard()).settings.enabled,true);
assert((await loadMissionBoard()).missions.find(m=>m.id==='collector-5').claimed);
// Invalid wallet overflows cause a full rollback: journal not written.
stores.get('bw-wallet').set('balances',{...walletSnapshot,coins:Number.MAX_SAFE_INTEGER});
await assert.rejects(claimMission('weekly-opening'),/Kontolimit/);
assert(!stores.get('bw-journal').has(missionClaimId('weekly-opening',missionWindow('week').key)));
assert.equal(stores.get('bw-wallet').get('balances').coins,Number.MAX_SAFE_INTEGER);
// Future-dated or unsupported source records never earn progress.
const future=new Date(Date.now()+86400000).toISOString();
const fake={id:'reward:clean:future',type:'cleaning-complete',source:'putzmanager',sourceId:'future',doneCount:10,totalCount:10,createdAt:future};
assert.equal(missionProgress(MISSION_DEFINITIONS.find(x=>x.id==='daily-clean'),rules,[fake],[],[],new Date()),0);
console.log('PASS BW08: opt-in, 12 stable missions, daily/weekly/monthly/local period rollover, source filtering, no retroactive rewards, real ownership, atomic claims, replay safety, overflow rollback and full backup/restore.');
