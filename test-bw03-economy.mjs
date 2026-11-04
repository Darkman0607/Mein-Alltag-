import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Transactional IndexedDB emulator: read, put and rollback across multiple stores.
const stores=new Map();
const db={objectStoreNames:{contains:name=>stores.has(name),[Symbol.iterator]:function*(){yield* stores.keys();}},
 createObjectStore(name){stores.set(name,new Map());},
 transaction(names){
  names=Array.isArray(names)?names:[names];const stage=new Map(names.map(n=>[n,new Map(stores.get(n))]));
  let pending=0,ended=false,timer=null;
  const tx={error:null,oncomplete:null,onabort:null,onerror:null};
  function done(){clearTimeout(timer);timer=setTimeout(()=>{
   if(ended||pending)return;ended=true;for(const [n,map] of stage)stores.set(n,map);tx.oncomplete?.();
  },0);}
  function req(fn){const q={result:undefined,error:null,onsuccess:null,onerror:null};pending++;
   queueMicrotask(()=>{if(ended)return;try{q.result=fn();q.onsuccess?.({target:q});}
    catch(e){q.error=e;tx.error=e;tx.abort();q.onerror?.({target:q});}
    finally{pending--;done();}});return q;}
  tx.objectStore=name=>{if(!stage.has(name))throw Error('Store not in transaction: '+name);
   const s=stage.get(name);return {get:key=>req(()=>structuredClone(s.get(key))),getAll:()=>req(()=>structuredClone([...s.values()])),getAllKeys:()=>req(()=>[...s.keys()]),count:()=>req(()=>s.size),
    put:(data,key)=>req(()=>s.set(key,structuredClone(data))),add:(data,key)=>req(()=>{if(s.has(key))throw Error('ConstraintError');s.set(key,structuredClone(data));}),clear:()=>req(()=>s.clear())};};
  tx.abort=()=>{if(ended)return;ended=true;clearTimeout(timer);queueMicrotask(()=>tx.onabort?.());};
  return tx;
 }};
globalThis.indexedDB={open(name,version){const req={result:db,error:null};queueMicrotask(()=>{if(!stores.size)req.onupgradeneeded?.();req.onsuccess?.();});return req;}};
const {getModuleValue,setModuleValue,setModuleValues,mutateModuleValues}=await import('./assets/database.js');
const {REWARD_RULES_KEY,loadRewardEconomy,loadRewardRules,setRewardConsent,saveRewardCleaningRule,cleaningRewardId,calculateCleaningReward,planCleaningReward}=await import('./assets/reward-economy.js');
const {startCleaning,setTaskDone,finishCleaning,loadCleaningState,roomTaskGroups,addMaterial,materialSources}=await import('./modules/putzmanager-cleaning.js');
const {ITEM_KEY}=await import('./modules/lagerhaus-items.js');
const {MOVEMENT_KEY}=await import('./modules/lagerhaus-stock.js');
const {captureSnapshot,restoreSnapshot,validateSnapshot}=await import('./assets/backup.js');
await setModuleValues('lagerhaus',[[ITEM_KEY,[{id:'gloves',code:'A-0001',name:'Handschuhe',type:'verbrauch',unit:'stk',quantity:10,stockLocations:[{locationId:'',quantity:10}],locationId:'',minimumStock:1,packSize:10}]],['rooms.v1',[]],['areas.v1',[]],[MOVEMENT_KEY,[]]]);
const room={id:'room-test',name:'Testküche',sketch3d:{objects:[],doors:[],windows:[]}};
const tasks=roomTaskGroups(room).flatMap(g=>g.steps);
assert.equal(tasks.length,3);
const initial=await loadRewardEconomy();
assert.deepEqual(initial.wallet,{xp:0,coins:0,shards:0});assert.equal(initial.journal.length,0);
assert.equal(initial.settings.sources.putzmanager.enabled,false);
assert(initial.settings.sources.frauengesundheit.enabled===false);
await assert.rejects(setRewardConsent('frauengesundheit',true),/Nur abgeschlossene/);
await assert.rejects(saveRewardCleaningRule({xpPerTask:-1}),/Ungültiger Regelwert/);
await assert.rejects(saveRewardCleaningRule({nonexistent:1}),/Unbekannter/);
await startCleaning(room);
for(const task of tasks)await setTaskDone(room.id,task.id,true);
let noConsent=await finishCleaning(room.id);
assert.equal(noConsent.reward.awarded,false);
assert.equal((await loadRewardEconomy()).journal.length,0);
// Off -> on consent: prior completed sessions must stay uncredited.
const allowed=await setRewardConsent('putzmanager',true);
assert(allowed.sources.putzmanager.enabledAt);
await saveRewardCleaningRule({xpPerTask:3,coinsPerFinish:6,bonusCoinsPer10Min:2,minMinutes:1,minTasks:2,requireAll:true});
await startCleaning(room);
for(const task of tasks)await setTaskDone(room.id,task.id,true);
await mutateModuleValues('putzmanager',['cleaning.sessions.v1'],v=>{const raw=v['cleaning.sessions.v1'];raw.active[room.id].elapsedMs=11*60000;return [['cleaning.sessions.v1',raw]];});
const earned=await finishCleaning(room.id);
assert.deepEqual(earned.reward,{awarded:true,xp:9,coins:8,shards:0});
let economy=await loadRewardEconomy();assert.equal(economy.wallet.xp,9);assert.equal(economy.wallet.coins,8);assert.equal(economy.journal.length,1);
assert.equal(economy.journal[0].sourceId,earned.id);assert.equal(economy.journal[0].id,cleaningRewardId(earned.id));
await assert.rejects(finishCleaning(room.id),/bereits abgeschlossen/);
assert.equal((await loadRewardEconomy()).wallet.coins,8);
// A duplicate source event may never credit twice, even if a corrupt import reintroduced an active session.
const plan=planCleaningReward(earned,{settings:economy.settings,wallet:{id:'balances',schemaVersion:1,xp:9,coins:8,shards:0},journal:economy.journal[0]});
assert.equal(plan.result.awarded,false);assert.equal(plan.writes.length,0);
// Partial completion cannot earn if 'requireAll' is enabled.
await startCleaning(room);await setTaskDone(room.id,tasks[0].id,true);
await mutateModuleValues('putzmanager',['cleaning.sessions.v1'],v=>{const raw=v['cleaning.sessions.v1'];raw.active[room.id].elapsedMs=11*60000;return [['cleaning.sessions.v1',raw]];});
const partial=await finishCleaning(room.id);assert.equal(partial.reward.awarded,false);
assert.equal((await loadRewardEconomy()).wallet.coins,8);
// Disabling prevents new credit; balances and journal persist.
await setRewardConsent('putzmanager',false);await startCleaning(room);
for(const task of tasks)await setTaskDone(room.id,task.id,true);
const off=await finishCleaning(room.id);assert.equal(off.reward.awarded,false);
assert.equal((await loadRewardEconomy()).journal.length,1);
// Enabling after a session has started does not award that already started session.
await startCleaning(room);await setRewardConsent('putzmanager',true);
for(const task of tasks)await setTaskDone(room.id,task.id,true);
const preConsent=await finishCleaning(room.id);assert.equal(preConsent.reward.awarded,false);
// Malformed wallet must roll back the cleaning rather than give silently incorrect balances.
await startCleaning(room);for(const task of tasks)await setTaskDone(room.id,task.id,true);
await addMaterial(room.id,materialSources(await getModuleValue('lagerhaus',ITEM_KEY),[],[]).find(item=>item.itemId==='gloves'),2,'units');
await mutateModuleValues('putzmanager',['cleaning.sessions.v1'],v=>{const raw=v['cleaning.sessions.v1'];raw.active[room.id].elapsedMs=120000;return [['cleaning.sessions.v1',raw]];});
stores.get('bw-wallet').set('balances',{id:'balances',schemaVersion:1,xp:-20,coins:8,shards:0});
await assert.rejects(finishCleaning(room.id),/Ungültige Kontowerte/);
assert((await loadCleaningState()).active[room.id],'cleaning remains active after wallet rollback');
assert.equal((await getModuleValue('lagerhaus',MOVEMENT_KEY)).length,0);
assert.equal((await getModuleValue('lagerhaus',ITEM_KEY))[0].quantity,10,'stock untouched after reward rollback');
stores.get('bw-wallet').set('balances',{id:'balances',schemaVersion:1,xp:9,coins:8,shards:0});
const recovered=await finishCleaning(room.id);assert.equal(recovered.reward.awarded,true);
assert.equal((await getModuleValue('lagerhaus',ITEM_KEY))[0].quantity,8,'stock and XP should book together');
assert.equal((await getModuleValue('lagerhaus',MOVEMENT_KEY)).length,1);
assert.equal((await loadRewardEconomy()).journal.length,2);
assert.equal((await loadRewardEconomy()).wallet.xp,18);
const snapshot=await captureSnapshot();assert.equal(validateSnapshot(snapshot).count>=3,true);
await setRewardConsent('putzmanager',false);await restoreSnapshot(snapshot);
assert.equal((await loadRewardEconomy()).settings.sources.putzmanager.enabled,true);
assert.equal((await loadRewardEconomy()).journal.length,2);
assert(readFileSync('assets/app.js','utf8').includes('reward-missions-ui'), 'mission page no longer imported');
for(const f of ['sw.js','index.html']){
 const src=readFileSync(f,'utf8');assert(src.includes('reward-economy'),`offline/stylesheet missing: ${f}`);
}
assert(readFileSync('assets/reward-missions-ui.js','utf8').includes('reward-economy-ui'), 'existing BW03 controls must remain available');
assert.equal(JSON.parse(readFileSync('version.json')).version,'0.24.9');
console.log('PASS BW03: explicit opt-in, user-editable rules, verified completion reward, wallet+immutable journal atomically, duplicate prevention, no retroactive/partial payout, disabled privacy sources, rollback on wallet error, backup+restore, offline shell.');
