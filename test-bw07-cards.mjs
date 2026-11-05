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
const {saveAlbumCard,loadRewardAlbum,setAlbumFavorite}=await import('./assets/reward-album.js');
const {installStarterSeries,previewStarterImport,safeStarterAsset}=await import('./assets/reward-series.js');
const {REWARD_RARITIES}=await import('./assets/reward-data.js');
const {loadRewardCardManager,setCardCopyLock,tradeCardCopy,craftCardCopy,loadCardRates,saveCardRateSettings,validateCardRates}=await import('./assets/reward-cards.js');
const {captureSnapshot,restoreSnapshot}=await import('./assets/backup.js');
const {loadRewardEconomy}=await import('./assets/reward-economy.js');
const before=await loadRewardCardManager();
assert.deepEqual([before.instances.length,before.wallet.coins,before.wallet.shards],[0,0,0]);
assert.equal(before.catalog.length,0);
await assert.rejects(craftCardCopy({cardId:'catalog:monster:001'}),/nicht im Katalog/);
const starter=await installStarterSeries();
assert.equal(starter.added,100);assert.equal((await loadRewardCardManager()).catalog.length,100);
assert.equal((await loadRewardAlbum()).uniqueOwned,0,'catalog entries must not grant ownership');
assert.equal((await loadRewardEconomy()).wallet.coins,0,'no free wallet');
assert.equal((await installStarterSeries()).added,0,'import must be idempotent');
const defs=(await loadRewardCardManager()).catalog;
for(const card of defs){const expected=card.categoryId==='anime-frauen'&&card.number<=25?`./assets/card-art/anime-frauen/${String(card.number).padStart(3,'0')}.webp`:card.imageAsset;assert.equal(safeStarterAsset(card),expected);assert(existsSync(expected.slice(2)),'asset missing '+expected);}
assert.deepEqual(Object.fromEntries(REWARD_RARITIES.map(r=>[r,defs.filter(c=>c.rarity===r).length])),{gewoehnlich:36,ungewoehnlich:24,selten:16,episch:12,legendaer:4,mythisch:4,diamant:4});
assert.equal(previewStarterImport(defs).toAdd,0);
// Seed one naturally obtained card plus a duplicate (simulation of a booster result).
const card=defs.find(c=>c.rarity==='selten'),diamond=defs.find(c=>c.rarity==='diamant'),common=defs.find(c=>c.rarity==='gewoehnlich'),mythic=defs.find(c=>c.rarity==='mythisch');
const dt=new Date().toISOString();
const a={id:'copy:example-one',cardId:card.id,obtainedAt:dt,locked:false,rarityAtDraw:card.rarity,schemaVersion:1};
const b={...a,id:'copy:example-two'};
stores.get('bw-instances').set(a.id,a);stores.get('bw-instances').set(b.id,b);
stores.get('bw-wallet').set('balances',{id:'balances',schemaVersion:1,xp:250,coins:85,shards:41});
await setCardCopyLock(a.id,true);assert.equal((await loadRewardCardManager()).groups.find(g=>g.card.id===card.id).locked,1);
await assert.rejects(tradeCardCopy({copyId:a.id,kind:'salvage',allowLastCopy:true}),/Gesperrte/);
assert.equal(stores.get('bw-instances').size,2);assert.equal(stores.get('bw-wallet').get('balances').shards,41);
await setCardCopyLock(a.id,false);
const id='cardtrade:00000000-0000-4000-8000-000000000001';
const sold=await tradeCardCopy({copyId:a.id,kind:'sell',requestId:id});
assert.equal(sold.replayed,false);assert.equal(sold.coins,4);assert.equal(stores.get('bw-instances').size,1);
assert.equal(stores.get('bw-wallet').get('balances').coins,89);
const replay=await tradeCardCopy({copyId:a.id,kind:'sell',requestId:id});assert.equal(replay.replayed,true);
assert.equal(stores.get('bw-wallet').get('balances').coins,89);
await assert.rejects(tradeCardCopy({copyId:b.id,kind:'salvage'}),/Letztes Exemplar/);
await assert.rejects(tradeCardCopy({copyId:b.id,kind:'sell',requestId:id,allowLastCopy:true}),/bereits anders/);
const salvaged=await tradeCardCopy({copyId:b.id,kind:'salvage',allowLastCopy:true});
assert.equal(salvaged.shards,4);assert.equal(stores.get('bw-instances').size,0);assert.equal(stores.get('bw-wallet').get('balances').shards,45);
const craftedId='cardcraft:00000000-0000-4000-8000-000000000002';
const crafted=await craftCardCopy({cardId:common.id,requestId:craftedId});
assert.equal(crafted.shardsSpent,10);assert.equal(stores.get('bw-instances').size,1);
assert.equal(stores.get('bw-wallet').get('balances').shards,35);
assert.equal((await loadRewardAlbum()).uniqueOwned,1);
assert.equal((await craftCardCopy({cardId:common.id,requestId:craftedId})).replayed,true);
assert.equal(stores.get('bw-instances').size,1);assert.equal(stores.get('bw-wallet').get('balances').shards,35);
await assert.rejects(craftCardCopy({cardId:diamond.id}),/Diamant/);
await assert.rejects(craftCardCopy({cardId:mythic.id}),/Nicht genügend/);
assert.equal(stores.get('bw-wallet').get('balances').shards,35);
// Legendary+ copy requires a separate explicit confirmation, irrespective of quantity.
const rareCopy={...a,id:'copy:legendary-one',cardId:mythic.id,rarityAtDraw:'mythisch'};
stores.get('bw-instances').set(rareCopy.id,rareCopy);
await assert.rejects(tradeCardCopy({copyId:rareCopy.id,kind:'sell',allowLastCopy:true}),/zusätzliche Bestätigung/);
await tradeCardCopy({copyId:rareCopy.id,kind:'sell',allowLastCopy:true,allowRare:true});
assert(!stores.get('bw-instances').has(rareCopy.id));
const rates=await loadCardRates();assert.equal(rates.craftShards.diamant,undefined);
const adjusted=structuredClone(rates);adjusted.salvageShards.selten=9;adjusted.craftShards.selten=11;
validateCardRates(adjusted);await saveCardRateSettings(adjusted);
assert.equal((await loadCardRates()).craftShards.selten,11);
const invalid=structuredClone(adjusted);invalid.craftShards.selten=9;
await assert.rejects(saveCardRateSettings(invalid),/mehr Splitter/);
assert.equal((await loadCardRates()).craftShards.selten,11,'invalid rates should preserve original');
// Crafted instance is protected by lock and survives an AES snapshot roundtrip.
await setCardCopyLock(crafted.copyId,true);
const snapshot=await captureSnapshot();
assert(snapshot.stores['bw-instances'].some(e=>e?.[1]?.id===crafted.copyId&&e[1].locked));
const copyCount=stores.get('bw-instances').size,coins=stores.get('bw-wallet').get('balances').coins,shards=stores.get('bw-wallet').get('balances').shards;
await restoreSnapshot(snapshot);
assert.equal(stores.get('bw-instances').size,copyCount);
assert.equal(stores.get('bw-wallet').get('balances').coins,coins);
assert.equal(stores.get('bw-wallet').get('balances').shards,shards);
assert.equal((await loadRewardCardManager()).history.length,4);
assert.equal((await loadCardRates()).craftShards.selten,11);
console.log('PASS BW07: 100 starter cards, locked-copy protection, last copy + rare confirmation, atomically journaled sell/salvage/craft, exact balances, replay idempotency, Diamond exclusion, editable rates, failure rollback, safe backup+restore.');
