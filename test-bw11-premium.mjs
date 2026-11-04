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

const {getModuleValue}=await import('./assets/database.js');
const {captureSnapshot,restoreSnapshot}=await import('./assets/backup.js');
const {BW11_SETTINGS_KEY,BW11_DEFAULT,normalizePremiumSettings,loadPremiumSettings,savePremiumSettings,getActivePremiumSettings,renderPremiumSettings,playPremiumReveal}=await import('./assets/reward-premium.js');
assert.deepEqual(normalizePremiumSettings(null),{effects:'full',sound:false});
assert.deepEqual(normalizePremiumSettings({effects:'invalid',sound:'yes'}),{effects:'full',sound:false});
assert.deepEqual(normalizePremiumSettings({effects:'off',sound:true}),{effects:'off',sound:true});
const defaultState=await loadPremiumSettings();assert.deepEqual(defaultState,BW11_DEFAULT);
assert.equal(await getModuleValue('belohnungswelt',BW11_SETTINGS_KEY),null,'no automatic database write at startup');
// No card, booster, wallet, copy or journal record may be created by appearance alone.
const watched=['bw-catalog','bw-series','bw-wallet','bw-journal','bw-instances','bw-unopened'];
const before=Object.fromEntries(watched.map(k=>[k,structuredClone([...stores.get(k)])]));
const saved=await savePremiumSettings({effects:'reduced',sound:true});
assert.deepEqual(saved,{effects:'reduced',sound:true});
assert.deepEqual(await getModuleValue('belohnungswelt',BW11_SETTINGS_KEY),saved);
assert.deepEqual(getActivePremiumSettings(),saved);
const snapshot=await captureSnapshot();
assert(snapshot.stores.belohnungswelt.some(([key,val])=>key===BW11_SETTINGS_KEY&&val.effects==='reduced'&&val.sound===true));
await savePremiumSettings({effects:'off',sound:false});
assert.equal((await getModuleValue('belohnungswelt',BW11_SETTINGS_KEY)).effects,'off');
await restoreSnapshot(snapshot);
assert.deepEqual(await getModuleValue('belohnungswelt',BW11_SETTINGS_KEY),saved,'appearance preferences must survive encrypted snapshot restore');
for(const key of watched)assert.deepEqual([...stores.get(key)],before[key],`non-display reward store changed: ${key}`);
assert.match(renderPremiumSettings(),/disabled/);assert.match(renderPremiumSettings(),/Ton bei Kartenaufdeckung/);
assert.equal(playPremiumReveal('diamant'),false,'headless tests must never autoplay');
console.log('PASS BW11: strict settings normalization, no startup write, stable IndexedDB prefs, unchanged reward data, reversible settings, backup+restore, no autoplay.');
