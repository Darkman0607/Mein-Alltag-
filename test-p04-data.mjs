import assert from 'node:assert/strict';
// Minimal async IndexedDB harness: concurrent request/transaction semantics + atomic abort.
const stores=['lagerhaus','frauengesundheit','familienplaner','putzmanager','hausservice','belohnungswelt', 'bw-series','bw-catalog','bw-booster-types','bw-instances','bw-wallet','bw-unopened','bw-journal','meta'];
const data=new Map(stores.map(s=>[s,new Map()]));
const request=q=>{const r={result:null};queueMicrotask(()=>{r.result=q();r.onsuccess?.();});return r;};
const fakeDb={
 objectStoreNames:{contains:s=>data.has(s),*[Symbol.iterator](){yield* stores}},
 transaction(names,mode){
   const snapshot=new Map(names.map(n=>[n,new Map(data.get(n))]));
   let pending=0,done=false;
   const tx={onabort:null,oncomplete:null,onerror:null,error:null};
   function check(){if(--pending===0&&!done){done=true;queueMicrotask(()=>tx.oncomplete?.());}}
   tx.abort=()=>{for(const [s,m] of snapshot)data.set(s,new Map(m));done=true;queueMicrotask(()=>tx.onabort?.());};
   tx.objectStore=(name)=>{
    if(!names.includes(name))throw Error('Not in transaction');
    return {count(){pending++;const r={result:null};queueMicrotask(()=>{if(done)return;r.result=data.get(name).size;r.onsuccess?.();check();});return r;},
     clear(){pending++;if(globalThis.failStore===name){throw Error('Injected failure');}
      const m=data.get(name);m.clear();queueMicrotask(()=>check());return {};},
     get(){throw Error('unused');}};
   };
   return tx;
 }
};
globalThis.indexedDB={open(){const r={result:fakeDb};queueMicrotask(()=>r.onsuccess?.());return r;}};
const {resetSelectedModules, readResetCounts,storesForReset} = await import('./assets/reset-data.js');
const seed=()=>{for(const m of data.values()){m.clear();m.set('sample',{k:1});}}
assert.deepEqual(storesForReset(['lagerhaus','putzmanager']),['lagerhaus','putzmanager']);
assert.deepEqual(storesForReset(['belohnungswelt']),['belohnungswelt','bw-series','bw-catalog','bw-booster-types','bw-instances','bw-wallet','bw-unopened','bw-journal']);
for(const invalid of [[],['meta'],['not-a-module'],['lagerhaus','lagerhaus']])assert.throws(()=>storesForReset(invalid));
seed();let r=await resetSelectedModules(['lagerhaus','putzmanager']);assert.deepEqual(r,{areas:2,stores:2});
for(const s of stores)assert.equal(data.get(s).size, ['lagerhaus','putzmanager'].includes(s)?0:1,'store '+s);
console.log('PASS P04 selective data reset + unrelated stores preserved');
seed();r=await resetSelectedModules(['belohnungswelt']);assert.equal(r.stores,8);
for(const s of stores)assert.equal(data.get(s).size,['belohnungswelt','bw-series','bw-catalog','bw-booster-types','bw-instances','bw-wallet','bw-unopened','bw-journal'].includes(s)?0:1,'store '+s);
console.log('PASS P04 reward world related 8 stores reset');
seed();r=await resetSelectedModules(['lagerhaus','frauengesundheit','familienplaner','putzmanager','hausservice','belohnungswelt']);assert.equal(r.stores,13);
for(const s of stores)assert.equal(data.get(s).size,s==='meta'?1:0,'store '+s);
console.log('PASS P04 all 6 areas / all 13 stores reset; app meta retained');
seed();globalThis.failStore='putzmanager';await assert.rejects(resetSelectedModules(['lagerhaus','putzmanager']));globalThis.failStore=null;
for(const s of stores)assert.equal(data.get(s).size,1,'atomic '+s);
console.log('PASS P04 atomic rollback when clear fails');
seed();const before=await readResetCounts();assert.equal(Object.keys(before).length,13);assert.equal(before['lagerhaus'],1);
console.log('PASS P04 count preview covers all module stores');
