import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Mock IndexedDB v1 -> v2: starts with the exact five historic module stores.
const oldStores=['lagerhaus','frauengesundheit','familienplaner','putzmanager','hausservice','meta'];
const data=new Map(oldStores.map(name=>[name,new Map()]));
data.get('lagerhaus').set('items-v1',{name:'Handschuhe',stock:26});
data.get('frauengesundheit').set('private-diary',{sensitive:'Gespeicherter Altbestand'});
data.get('putzmanager').set('room-kitchen',{name:'Küche'});
let version=1;
const db={objectStoreNames:{contains:name=>data.has(name),[Symbol.iterator]:function*(){yield* data.keys();}},
 version,createObjectStore(name){if(data.has(name))throw Error('Store already exists');data.set(name,new Map());},close(){},
 transaction(names,mode){
  const snapshot=new Map([...data].map(([k,v])=>[k,new Map(v)]));
  let finished=false;
  const tx={error:null,oncomplete:null,onerror:null,onabort:null,
   abort(){if(finished)return;finished=true;for(const [name,copy] of snapshot)data.set(name,copy);queueMicrotask(()=>tx.onabort?.());},
   objectStore(name){assert(names.includes(name),`Transaction doesn't include ${name}`);const store=data.get(name);assert(store);
    const req=work=>{const r={result:undefined,error:null,onsuccess:null,onerror:null};queueMicrotask(()=>{
     if(finished)return;
     try{r.result=work();r.onsuccess?.({target:r});}catch(err){r.error=err;tx.error=err;r.onerror?.({target:r});tx.abort();}
    });return r;};
    return {get:key=>req(()=>store.get(key)),getAllKeys:()=>req(()=>[...store.keys()]),getAll:()=>req(()=>[...store.values()]),count:()=>req(()=>store.size),
     add:(val,key)=>req(()=>{if(store.has(key))throw Error('ConstraintError');store.set(key,val);}),
     put:(val,key)=>req(()=>{store.set(key,val);}),
     clear:()=>req(()=>{store.clear();}),delete:key=>req(()=>{store.delete(key);})};
   }
  };
  setTimeout(()=>{if(!finished){finished=true;tx.oncomplete?.();}},2);return tx;
 }
};
globalThis.indexedDB={open(name,requested){assert.equal(name,'mein-alltag-v0');const r={result:db,error:null};queueMicrotask(()=>{
 if(requested>version){r.oldVersion=version;version=requested;db.version=requested;r.onupgradeneeded?.();}
 r.onsuccess?.();});return r;
}};

const dbmod=await import('./assets/database.js');
const rw=await import('./assets/reward-data.js');
const backup=await import('./assets/backup.js');
assert.equal(dbmod.DB_VERSION,2);
assert.equal(dbmod.MODULE_STORES.length,6);
assert.equal(dbmod.REWARD_STORES.length,7);
await dbmod.openDatabase();
assert.equal(data.size,14);
assert.equal(data.get('lagerhaus').get('items-v1').stock,26);
assert.equal(data.get('frauengesundheit').get('private-diary').sensitive,'Gespeicherter Altbestand');
assert.equal(data.get('putzmanager').get('room-kitchen').name,'Küche');
assert.deepEqual(await rw.readRewardOverview(),{schemaVersion:1,series:0,catalogCards:0,ownedCopies:0,boosterTypes:0,unopenedBoosters:0,wallet:{xp:0,coins:0,shards:0}});
assert.equal(rw.REWARD_CATEGORIES.reduce((total,x)=>total+x.planned,0),100);
assert.equal(rw.REWARD_RARITIES.length,7);
assert.throws(()=>rw.validateRewardEntity('bw-catalog',{id:'illegal',schemaVersion:1}),/Karte benötigt Serie/);
assert.throws(()=>rw.validateRewardEntity('bw-wallet',{id:'balances',schemaVersion:1,xp:-1,coins:0,shards:0}),/Kontowerte/);
assert.throws(()=>rw.validateRewardEntity('bw-booster-types',{id:'booster:test',schemaVersion:1,name:'Test',priceCoins:20,slots:4,cardPool:[]}),/fünf Karten/);
const series={id:rw.newRewardId('series'),schemaVersion:1,name:'Monster Serie 1',categoryId:'monster',plannedCards:25};
const card={id:rw.newRewardId('card'),schemaVersion:1,seriesId:series.id,number:1,name:'Testmonster',rarity:'selten',categoryId:'monster',templateId:null};
const instance={id:rw.newRewardId('copy'),schemaVersion:1,cardId:card.id,obtainedAt:'2026-11-04T10:00:00Z',locked:false};
await rw.addRewardEntity('bw-series',series);
await rw.addRewardEntity('bw-catalog',card);
await rw.addRewardEntity('bw-instances',instance);
await rw.addRewardEntity('bw-wallet',{id:'balances',schemaVersion:1,xp:123,coins:456,shards:78});
await rw.addRewardEntity('bw-unopened',{id:rw.newRewardId('pack'),schemaVersion:1,boosterTypeId:'booster:test',purchasedAt:'2026-11-04T10:00:00Z'});
await assert.rejects(rw.addRewardEntity('bw-series',series),/ConstraintError/);
assert.equal(data.get('bw-series').size,1);
assert.equal((await rw.readRewardEntity('bw-catalog',card.id)).name,'Testmonster');
const overview=await rw.readRewardOverview();
assert.deepEqual([overview.series,overview.catalogCards,overview.ownedCopies,overview.unopenedBoosters,overview.wallet.coins],[1,1,1,1,456]);
const full=await backup.captureSnapshot();
assert.equal(Object.keys(full.stores).length,14);
assert.equal(backup.validateSnapshot(full).legacy,false);
const encrypted=await backup.encryptSnapshot(full,'StarkesBackup-Passwort2026!');
assert(!JSON.stringify(encrypted).includes('Gespeicherter Altbestand'));
await dbmod.setModuleValue('lagerhaus','items-v1',{stock:555});
const decrypted=await backup.decryptBackup(encrypted,'StarkesBackup-Passwort2026!');
await backup.restoreSnapshot(decrypted);
assert.equal((await dbmod.getModuleValue('lagerhaus','items-v1')).stock,26);
assert.equal((await rw.readRewardOverview()).wallet.coins,456);
const old={...full,stores:Object.fromEntries(oldStores.map(name=>[name,full.stores[name]]))};
assert.equal(backup.validateSnapshot(old).legacy,true);
const oldEncrypted=await backup.encryptSnapshot(old,'StarkesBackup-Passwort2026!');
assert.equal(backup.validateSnapshot(await backup.decryptBackup(oldEncrypted,'StarkesBackup-Passwort2026!')).legacy,true);
await dbmod.setModuleValue('lagerhaus','items-v1',{stock:0});
await backup.restoreSnapshot(old);
assert.equal((await dbmod.getModuleValue('lagerhaus','items-v1')).stock,26);
assert.equal((await rw.readRewardOverview()).wallet.coins,456,'legacy backup must preserve new reward data');
assert.equal((await rw.readRewardOverview()).unopenedBoosters,1);
const partial={...full,stores:{...full.stores}};delete partial.stores['bw-wallet'];
assert.throws(()=>backup.validateSnapshot(partial),/Unvollständige/);
const unexpected={...full,stores:{...full.stores,'unexpected-store':[]}};
await assert.rejects(backup.restoreSnapshot(unexpected),/Unvollständige/);
assert.equal((await rw.readRewardOverview()).wallet.coins,456,'bad snapshot may not touch live data');
const app=readFileSync('assets/app.js','utf8'),sw=readFileSync('sw.js','utf8'),v=JSON.parse(readFileSync('version.json'));
assert.match(app,/APP_VERSION='0\.24\.6'/);assert.equal(v.version,'0.24.6');assert.match(sw,/mein-alltag-v0-24-6/);
assert.match(sw,/assets\/reward-data.js/);assert.match(app,/bwStorageStatus/);
assert.equal(dbmod.ALL_DATA_STORES.length,14);

const albumApi=await import('./assets/reward-album.js');
assert.equal(albumApi.ALBUM_SLOTS.length,100);
assert.equal(new Set(albumApi.ALBUM_SLOTS.map(s=>s.id)).size,100);
const empty=albumApi.projectAlbum();
assert.equal(empty.uniqueOwned,0);assert.equal(empty.configured,0);assert.equal(empty.percent,0);
assert.equal(empty.byCategory.length,4);assert(empty.byCategory.every(c=>c.total===25));
const projected=albumApi.projectAlbum([card],[instance,{id:'copy:test2',cardId:card.id,obtainedAt:'2026-11-04',locked:true}]);
assert.equal(projected.uniqueOwned,1);assert.equal(projected.copies,2);assert.equal(projected.percent,1);
assert.equal(albumApi.filterAlbum(projected,{status:'owned'}).length,1);
assert.equal(albumApi.filterAlbum(projected,{status:'missing'}).length,99);
assert.equal(albumApi.filterAlbum(projected,{category:'monster'}).length,25);
assert.equal(albumApi.filterAlbum(projected,{query:'Testmonster'}).length,1);
await albumApi.setAlbumFavorite('monster:1',true);
assert.equal((await albumApi.loadRewardAlbum()).favorites,1);
assert.equal(albumApi.filterAlbum(await albumApi.loadRewardAlbum(),{status:'favorites'}).length,1);
await albumApi.setAlbumFavorite('monster:1',false);
assert.equal((await albumApi.loadRewardAlbum()).favorites,0);
await assert.rejects(albumApi.setAlbumFavorite('monster:26',true),/Ungültiger/);
await assert.rejects(albumApi.saveAlbumCard({categoryId:'monster',number:26,name:'Zu viel',rarity:'selten'}),/Unbekannte/);
await assert.rejects(albumApi.saveAlbumCard({categoryId:'monster',number:1,name:'',rarity:'selten'}),/Kartenname/);
await assert.rejects(albumApi.saveAlbumCard({categoryId:'monster',number:1,name:'OK',rarity:'ungültig'}),/Seltenheit/);
const created=await albumApi.saveAlbumCard({categoryId:'monster',number:2,name:'Blaue Kreatur',rarity:'episch',description:'Kartenmuster ohne Bild',details:{element:'Wasser',faehigkeit:'Wächter'}});
assert.equal(created.details.element,'Wasser');
await assert.rejects(albumApi.saveAlbumCard({categoryId:'monster',number:2,name:'Ungültig',rarity:'selten',details:{element:'x'.repeat(121)}}),/Detailfeld/);
assert.equal(created.id,'catalog:monster:002');
assert.equal((await albumApi.loadRewardAlbum()).configured,2);
assert.equal((await albumApi.loadRewardAlbum()).uniqueOwned,1,'Gestaltung darf kein Exemplar erschaffen');
assert.equal((await rw.readRewardEntity('bw-series','series:monster')).plannedCards,25);
const altered=await albumApi.saveAlbumCard({categoryId:'monster',number:2,name:'Bearbeitet',rarity:'selten',description:'Keine Belohnung'});
assert.equal(altered.id,created.id,'Stable ID');
assert.equal(altered.details.element,'Wasser','Vorhandene Kategorie-Details bleiben bei Änderungen erhalten');
assert.equal(data.get('bw-catalog').size,2,'Kein Duplikat bei Bearbeitung');
assert.equal((await albumApi.loadRewardAlbum()).uniqueOwned,1);
const fullWithAlbum=await backup.captureSnapshot();
assert.equal(fullWithAlbum.stores.belohnungswelt.length,1,'Favoriten sind im vollständigen Backup enthalten');
assert.equal(fullWithAlbum.stores['bw-catalog'].length,2,'Kartenkatalog wird mitgesichert');
assert.match(readFileSync('assets/reward-album-ui.js','utf8'),/bwAlbumSearch/);
assert.match(readFileSync('assets/reward-album-ui.js','utf8'),/bwCardModal/);
assert.match(sw,/assets\/reward-album-ui.js/);

// BW06: original starter set, non-destructive import and absolutely no free rewards.
const {readFileSync:readBytes,statSync,existsSync}=await import('node:fs');
const {createHash}=await import('node:crypto');
const seriesApi=await import('./assets/reward-series.js');
const master=seriesApi.STARTER_CARDS;
assert.equal(master.length,100);
assert.equal(new Set(master.map(x=>x.categoryId+':'+x.number)).size,100);
assert.equal(new Set(master.map(x=>x.name)).size,100);
const expectedRarities=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
for(const cat of rw.REWARD_CATEGORIES){
 const group=master.filter(x=>x.categoryId===cat.id);
 assert.equal(group.length,25);
 assert.equal(group.filter(x=>x.rarity==='diamant').length,1);
 assert.equal(group.filter(x=>x.rarity==='mythisch').length,1);
 assert.equal(group.filter(x=>x.rarity==='legendaer').length,1);
 for(let i=1;i<=25;i++)assert(group.some(x=>x.number===i));
}
const artHashes=new Set();let artBytes=0;
for(const card of master){
 assert(expectedRarities.includes(card.rarity));
 assert.equal(seriesApi.safeStarterAsset(card),card.imageAsset);
 const p=card.imageAsset.replace(/^\.\//,'');assert(existsSync(p));
 const art=readBytes(p);artBytes+=art.length;
 const body=art.toString('utf8');assert(body.startsWith('<svg')&&body.endsWith('</svg>'));
 assert.match(body,/<linearGradient/);assert(!/<script/i.test(body));assert(!/<foreignObject/i.test(body));
 artHashes.add(createHash('sha256').update(art).digest('hex'));
}
assert.equal(artHashes.size,100);
assert(artBytes<1200000,'SVG art must remain compact for offline use');
assert.equal(seriesApi.starterAssetPath('monster',1),'./assets/card-art/monster/001.svg');
assert.equal(seriesApi.starterAssetPath('monster',26),null);
assert.equal(seriesApi.safeStarterAsset({...master[0],imageAsset:'https://example.org/unsafe.svg'}),null);
const preAlbum=await albumApi.loadRewardAlbum();
assert.equal(preAlbum.configured,2);
const existingName=preAlbum.slots.find(x=>x.id==='monster:2').card.name;
const originalWallet=await rw.readRewardEntity('bw-wallet','balances');
const sealedBefore=data.get('bw-unopened').size,instancesBefore=data.get('bw-instances').size;
const preview=seriesApi.previewStarterImport(data.get('bw-catalog')?[...data.get('bw-catalog').values()]:[]);
assert.equal(preview.toAdd,98);assert.equal(preview.existing,2);
const installed=await seriesApi.installStarterSeries();
assert.deepEqual(installed,{added:98,preserved:2,total:100});
const after=await albumApi.loadRewardAlbum();
assert.equal(after.configured,100);
assert.equal(after.uniqueOwned,1,'Artwork import may not mint owned copies');
assert.equal(after.copies,instancesBefore);
assert.equal(data.get('bw-instances').size,instancesBefore);
assert.equal(data.get('bw-unopened').size,sealedBefore,'Sealed boosters survive import');
assert.deepEqual(await rw.readRewardEntity('bw-wallet','balances'),originalWallet);
assert.equal(after.slots.find(x=>x.id==='monster:2').card.name,existingName,'user customization preserved');
assert.equal(after.slots.find(x=>x.id==='monster:1').card.id,card.id,'historic card ID preserved');
assert(after.slots.find(x=>x.id==='anime-frauen:5').card.imageAsset.endsWith('/005.svg'));
assert.equal((await seriesApi.installStarterSeries()).added,0,'idempotency after restart');
const edited=await albumApi.saveAlbumCard({categoryId:'anime-frauen',number:5,name:'Meine umbenannte Karte',rarity:'selten'});
assert(edited.imageAsset.endsWith('/005.svg'),'editing may not delete original art');
assert.equal((await seriesApi.installStarterSeries()).added,0);
assert.equal((await albumApi.loadRewardAlbum()).slots.find(x=>x.id==='anime-frauen:5').card.name,'Meine umbenannte Karte');
const backupBW06=await backup.captureSnapshot();
assert.equal(backupBW06.stores['bw-catalog'].length,100);
assert.equal(backupBW06.stores['bw-instances'].length,instancesBefore);
const sealedSnapshot=await backup.encryptSnapshot(backupBW06,'BW06-Backup-geheim-123456');
for(const key of data.get('bw-catalog').keys())data.get('bw-catalog').delete(key);
assert.equal((await albumApi.loadRewardAlbum()).configured,0);
await backup.restoreSnapshot(await backup.decryptBackup(sealedSnapshot,'BW06-Backup-geheim-123456'));
assert.equal((await albumApi.loadRewardAlbum()).configured,100);
assert.equal((await albumApi.loadRewardAlbum()).uniqueOwned,1);
// If the catalog contains duplicate placements, do not partially import.
data.get('bw-catalog').set('catalog:monster:dupe',{
 ...data.get('bw-catalog').get(card.id),id:'catalog:monster:dupe'});
assert.throws(()=>seriesApi.previewStarterImport([...data.get('bw-catalog').values()]),/Doppelter/);
await assert.rejects(seriesApi.installStarterSeries(),/Doppelter/);
assert.equal(data.get('bw-catalog').size,101,'Invalid catalog untouched after reject');
const swAssets=readFileSync('sw.js','utf8');
assert.equal((swAssets.match(/card-art\/[^']+\.svg/g)||[]).length,100);
assert.match(readFileSync('assets/reward-album-ui.js','utf8'),/bwStarterInstall/);
assert.match(readFileSync('assets/reward-album-ui.js','utf8'),/safeStarterAsset/);
assert.match(readFileSync('assets/app.js','utf8'),/APP_VERSION='0\.24\.6'/);
console.log('PASS BW06: 100 unique compact original SVG artworks, catalog metadata and rarity distributions, explicit atomic import, preserves user cards, stable IDs, no free coins/copies, idempotence, encrypted backup/restore, corrupt input rollback and full offline cache.');
