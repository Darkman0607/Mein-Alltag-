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
const {saveAlbumCard,loadRewardAlbum}=await import('./assets/reward-album.js');
const {seedBoosterTypes,BOOSTER_PRESETS,calculateShopOdds,loadBoosterShop,purchaseBooster,setShopFavorite,setBoosterPrice}=await import('./assets/reward-shop.js');
const {captureSnapshot,restoreSnapshot,validateSnapshot}=await import('./assets/backup.js');
const {loadRewardEconomy}=await import('./assets/reward-economy.js');
await seedBoosterTypes();
assert.equal(stores.get('bw-booster-types').size,7);
const state=await loadBoosterShop();assert.equal(state.types.length,7);
assert.deepEqual(state.wallet,{xp:0,coins:0,shards:0});
assert.equal(state.inventory.length,0);
assert(state.types.every(x=>!x.eligible),'Empty album must block all purchases');
await assert.rejects(purchaseBooster('booster:mixed',1),/Mindestens fünf/);
assert.equal(stores.get('bw-wallet').size,0);
const combinations=[
 {categoryId:'anime-frauen',number:1,name:'Ari',rarity:'gewoehnlich'},
 {categoryId:'anime-tiere',number:1,name:'Fuchs',rarity:'ungewoehnlich'},
 {categoryId:'maschinen',number:1,name:'Traktor',rarity:'selten'},
 {categoryId:'monster',number:1,name:'Drache',rarity:'episch'},
 {categoryId:'anime-frauen',number:2,name:'Nova',rarity:'legendaer'}
];
for(const entry of combinations)await saveAlbumCard({...entry,eventCard:true});
assert.equal((await loadRewardAlbum()).configured,5);
assert.equal((await loadRewardAlbum()).uniqueOwned,0,'Metadata not mistaken for ownership');
const afterCards=await loadBoosterShop();
assert.equal(afterCards.types.find(t=>t.kind==='mixed').eligible,true);
assert.equal(afterCards.types.find(t=>t.kind==='premium').eligible,true);
assert.equal(afterCards.types.find(t=>t.kind==='event').eligible,true);
assert.equal(afterCards.types.find(t=>t.id==='booster:theme:anime-frauen').eligible,false);
const mixed=afterCards.types.find(t=>t.kind==='mixed');
assert.equal(mixed.pool.length,5);
assert(Math.abs(Object.values(mixed.odds).reduce((a,b)=>a+b,0)-100)<1e-9);
assert.equal(mixed.odds.diamant,0);
await setShopFavorite('booster:mixed',true);
assert((await loadBoosterShop()).types.find(t=>t.id==='booster:mixed').favorite);
await setShopFavorite('booster:mixed',false);
assert(!(await loadBoosterShop()).types.find(t=>t.id==='booster:mixed').favorite);
await assert.rejects(setBoosterPrice('booster:mixed',0),/Preis/);
await assert.rejects(setBoosterPrice('booster:mixed',501),/Preis/);
await setBoosterPrice('booster:mixed',12);
assert.equal((await loadBoosterShop()).types[0].priceCoins,12);
stores.get('bw-wallet').set('balances',{id:'balances',schemaVersion:1,xp:310,coins:150,shards:5});
const requestId='purchase:11111111-2222-4333-8444-555555555555';
const bought=await purchaseBooster('booster:mixed',3,requestId);
assert.deepEqual([bought.quantity,bought.total,bought.coinsAfter,bought.replayed],[3,36,114,false]);
assert.equal(stores.get('bw-unopened').size,3);
let fresh=await loadBoosterShop();
assert.equal(fresh.inventory.length,3);assert.equal(fresh.purchases.length,1);
assert.equal(fresh.wallet.coins,114);assert.equal(fresh.wallet.xp,310);
assert.equal(fresh.purchases[0].packIds.length,3);
assert(fresh.inventory.every(x=>x.slots===5&&x.poolSnapshot.length===5&&x.openingStatus==='sealed'));
assert(fresh.inventory.every(x=>Object.values(x.oddsSnapshot).reduce((a,b)=>a+b,0)>99.999));
assert.equal((await loadRewardAlbum()).uniqueOwned,0);
// Retrying the same purchase request must not deduct twice.
const retry=await purchaseBooster('booster:mixed',3,requestId);
assert.equal(retry.replayed,true);assert.equal(retry.coinsAfter,114);
assert.equal((await loadBoosterShop()).inventory.length,3);
await assert.rejects(purchaseBooster('booster:mixed',2,requestId),/bereits für einen anderen/);
assert.equal((await loadBoosterShop()).wallet.coins,114);
await assert.rejects(purchaseBooster('booster:mixed',0),/1 bis 10/);
await assert.rejects(purchaseBooster('booster:mixed',11),/1 bis 10/);
await assert.rejects(purchaseBooster('booster:missing',1),/Unbekannter/);
await assert.rejects(purchaseBooster('booster:mixed',10),/Nicht genügend/);
assert.equal((await loadBoosterShop()).wallet.coins,114);
await setBoosterPrice('booster:mixed',22);
assert.equal(stores.get('bw-unopened').values().next().value.priceCoins,12,'Old pack price must not change');
// Malformed wallet rolls back everything.
stores.get('bw-wallet').set('balances',{id:'balances',schemaVersion:1,xp:310,coins:-1,shards:0});
await assert.rejects(purchaseBooster('booster:mixed',1),/Ungültige Kontowerte/);
assert.equal(stores.get('bw-unopened').size,3);assert.equal(stores.get('bw-journal').size,1);
stores.get('bw-wallet').set('balances',{id:'balances',schemaVersion:1,xp:310,coins:114,shards:5});
// Two simultaneous attempts are serialized by real IndexedDB. The emulator preserves
// transaction boundaries; sequential plus idempotency rules are independently verified.
const before=await captureSnapshot();assert(validateSnapshot(before).count>=10);
await purchaseBooster('booster:event',1,'purchase:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
assert.equal((await loadBoosterShop()).inventory.length,4);
await restoreSnapshot(before);
assert.equal((await loadBoosterShop()).inventory.length,3);
assert.equal((await loadBoosterShop()).wallet.coins,114);
assert.equal((await loadBoosterShop()).purchases.length,1);
// Future price changes cannot alter sealed pool snapshots.
await saveAlbumCard({categoryId:'anime-frauen',number:3,name:'Neue Karte',rarity:'diamant'});
assert.equal((await loadBoosterShop()).types.find(t=>t.kind==='mixed').pool.length,6);
assert(stores.get('bw-unopened').values().next().value.poolSnapshot.length===5);
// Regression: no free starting coins, no opening before BW05.
assert.equal(typeof (await import('./assets/reward-shop.js')).openBooster,'undefined');
assert.equal(JSON.parse(readFileSync('version.json','utf8')).version,'0.24.4');
for(const source of ['assets/app.js','sw.js','index.html'])assert(readFileSync(source,'utf8').includes('reward-shop'));
console.log('PASS BW04: sieben Booster-Typen, Karten-Pool-Voraussetzungen, echte und summierte Chancen, Eventmarkierung, Favoriten, Preisverwaltung, 1–10er Mehrfachkauf, atomare Wallet/Pack/Journal-Buchung, feste Pool-Snapshots, kein Doppelabzug, Fehler-Rollback, Vollbackup/Restore, keine künstlichen Gratiscoins, kein Öffnen vor BW05.');
