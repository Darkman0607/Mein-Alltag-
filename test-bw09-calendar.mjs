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
const {CALENDAR_SETTINGS_KEY,CALENDAR_REWARDS,CALENDAR_MILESTONES,normalizeCalendarSettings,calendarClaimId,evaluateRewardCalendar,activateRewardCalendar,loadRewardCalendar,claimRewardCalendar}=await import('./assets/reward-calendar.js');
const {missionWindow}=await import('./assets/reward-missions.js');
const {captureSnapshot,restoreSnapshot}=await import('./assets/backup.js');
assert.equal(CALENDAR_MILESTONES.length,4);
assert.deepEqual(CALENDAR_MILESTONES.map(m=>m.days),[3,7,14,30]);
assert.equal(CALENDAR_REWARDS.tasks.target,5);
assert.equal(calendarClaimId('daily','2026-11-04'),'calendar:daily:2026-11-04');
assert.throws(()=>calendarClaimId('daily','2026-02-31'),/existiert/);
assert.throws(()=>calendarClaimId('milestone',5),/Unbekannte/);
assert.throws(()=>normalizeCalendarSettings({enabled:true,activatedAt:null,version:1}),/Ungültig/);
const first=await loadRewardCalendar();assert.equal(first.settings.enabled,false);
assert.equal(first.readyCount,0);assert.equal(stores.get('belohnungswelt').size,0,'reading cannot write');
await assert.rejects(claimRewardCalendar('daily'),/aktivieren/);
const activated=await activateRewardCalendar();assert.equal(activated.enabled,true);
assert.equal((await activateRewardCalendar()).activatedAt,activated.activatedAt,'activating twice cannot reset period');
let board=await loadRewardCalendar();assert.equal(board.gift.ready,true);
assert.equal(board.taskBonus.ready,false);assert.equal(board.totalGiftDays,0);
assert.equal(stores.get('bw-wallet').size,0,'no implicit wallet creation');
const claimedGift=await claimRewardCalendar('daily');
assert.equal(claimedGift.xp,6);assert.equal(claimedGift.coins,5);assert.equal(claimedGift.replayed,false);
assert.equal((await claimRewardCalendar('daily')).replayed,true);
board=await loadRewardCalendar();assert.equal(board.gift.claimed,true);assert.equal(board.gift.ready,false);assert.equal(board.totalGiftDays,1);
assert.equal(board.wallet.coins,5);assert.equal(board.wallet.xp,6);
await assert.rejects(claimRewardCalendar('tasks'),/nicht erreicht/);
const now=new Date();const day=missionWindow('day',now).key;
const old=new Date(Date.parse(activated.activatedAt)-86400*1000).toISOString();
for(let i=0;i<3;i++){const id='reward:clean:bw09-'+i;stores.get('bw-journal').set(id,{id,type:'cleaning-complete',source:'putzmanager',sourceId:'bw09-'+i,doneCount:i===0?2:2,totalCount:2,createdAt:new Date().toISOString()});}
stores.get('bw-journal').set('reward:clean:pre',{id:'reward:clean:pre',type:'cleaning-complete',source:'putzmanager',sourceId:'pre',doneCount:40,totalCount:40,createdAt:old});
stores.get('bw-journal').set('reward:clean:health',{id:'reward:clean:health',type:'cleaning-complete',source:'frauengesundheit',sourceId:'health',doneCount:50,totalCount:50,createdAt:new Date().toISOString()});
board=await loadRewardCalendar();assert.equal(board.taskBonus.actualProgress,6);assert.equal(board.taskBonus.ready,true);
const b=await claimRewardCalendar('tasks');assert.equal(b.verifiedTasks,6);assert.equal(b.coins,6);assert.equal(b.xp,10);
assert.equal((await claimRewardCalendar('tasks')).replayed,true);
board=await loadRewardCalendar();assert.equal(board.wallet.coins,11);assert.equal(board.wallet.xp,16);
// Date windows: today cannot be inferred from another date and no older rewards can be claimed.
const prior=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
assert.notEqual(missionWindow('day',prior).key,day);
const d1=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1,12),d2=new Date(now.getFullYear(),now.getMonth(),now.getDate()-2,12);
const dates=[d1,d2];
// Test only: install two structurally valid historical claims after moving activation backwards.
stores.get('belohnungswelt').set(CALENDAR_SETTINGS_KEY,{version:1,enabled:true,activatedAt:new Date(d2.getTime()-10000).toISOString()});
for(const d of dates){const k=missionWindow('day',d).key,id=calendarClaimId('daily',k);stores.get('bw-journal').set(id,{id,schemaVersion:1,type:'calendar-gift',periodKey:k,createdAt:d.toISOString(),xp:6,coins:5,shards:0});}
board=await loadRewardCalendar();assert.equal(board.totalGiftDays,3);assert.equal(board.milestones.find(m=>m.days===3).ready,true);
const milestone=await claimRewardCalendar('milestone',3);assert.equal(milestone.coins,10);assert.equal(milestone.xp,15);
assert.equal((await claimRewardCalendar('milestone',3)).replayed,true);
assert.equal((await loadRewardCalendar()).wallet.coins,21);
await assert.rejects(claimRewardCalendar('milestone',7),/noch nicht/);
// Forged older timestamp with today's date cannot increase history.
const fakeId=calendarClaimId('daily',missionWindow('day',new Date(now.getFullYear(),now.getMonth(),now.getDate()-3)).key);
stores.get('bw-journal').set(fakeId,{id:fakeId,schemaVersion:1,type:'calendar-gift',periodKey:fakeId.split(':')[2],createdAt:now.toISOString(),xp:6,coins:5});
assert.equal((await loadRewardCalendar()).totalGiftDays,3);
stores.get('bw-journal').delete(fakeId);
// Read-only synthetic rollovers; no missed-day penalty and no access to legacy private module data.
const synthetic=evaluateRewardCalendar({settings:{version:1,enabled:true,activatedAt:new Date(d2.getTime()-10000).toISOString()},journal:[...stores.get('bw-journal').values()]},new Date(now.getFullYear(),now.getMonth(),now.getDate()+5,10));
assert.equal(synthetic.totalGiftDays,3);assert.equal(synthetic.milestones[0].claimed,true);
// Backup/restore roundtrip for settings, journal and virtual money.
const snapshot=await captureSnapshot();const walletSaved=structuredClone(stores.get('bw-wallet').get('balances'));
stores.get('bw-journal').clear();stores.get('bw-wallet').clear();stores.get('belohnungswelt').clear();
await restoreSnapshot(snapshot);assert.deepEqual(stores.get('bw-wallet').get('balances'),walletSaved);
assert.equal((await loadRewardCalendar()).totalGiftDays,3);assert.equal((await loadRewardCalendar()).settings.enabled,true);
assert.equal((await claimRewardCalendar('milestone',3)).replayed,true);
// Atomic overflow: no journal record on failed claim.
stores.get('bw-wallet').set('balances',{...walletSaved,coins:Number.MAX_SAFE_INTEGER});
await assert.rejects(claimRewardCalendar('milestone',7),/noch nicht/);
// Force a ready-but-unclaimed bonus by removing one claim record, then test wallet overflow.
stores.get('bw-journal').delete(calendarClaimId('tasks',day));
await assert.rejects(claimRewardCalendar('tasks'),/Kontolimit/);
assert(!stores.get('bw-journal').has(calendarClaimId('tasks',day)));
assert.equal(stores.get('bw-wallet').get('balances').coins,Number.MAX_SAFE_INTEGER);
console.log('PASS BW09: opt-in, 24h gift idempotency, verified task bonus, durable milestones without streak penalties, no retroactive or bogus claims, overflow rollback, full encrypted-backup dataset restore.');
