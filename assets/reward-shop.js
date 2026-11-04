/** Mein Alltag BW04 – sealed virtual boosters with transactional purchases.
 * No real money, NO opening/drawing. BW05 must consume the immutable purchase
 * snapshot (poolSnapshot and weights) rather than changing shop definitions.
 */
import {openDatabase,mutateModuleValues} from './database.js';
import {REWARD_CATEGORIES,REWARD_RARITIES,REWARD_SCHEMA_VERSION,validateRewardEntity,newRewardId} from './reward-data.js';

export const SHOP_FAVORITES_KEY='bw04:shop:favorites:v1';
const fail=message=>{throw Error('Booster-Shop: '+message);};
const distributions=Object.freeze({
 standard:Object.freeze([60,26,10,3,1,0.2,0.04]),
 theme:Object.freeze([45,30,16,7,2.5,0.5,0.08]),
 premium:Object.freeze([18,24,28,18,9,2.8,0.4]),
 event:Object.freeze([28,28,24,13,5,1.8,0.3])
});
const make=(id,name,kind,categoryId,priceCoins,description)=>Object.freeze({id,name,kind,categoryId,priceCoins,description,slots:5,schemaVersion:REWARD_SCHEMA_VERSION});
export const BOOSTER_PRESETS=Object.freeze([
 make('booster:mixed','Entdecker-Mix','mixed',null,20,'Alle vier Kartenthemen in einem Pack.'),
 ...REWARD_CATEGORIES.map(c=>make('booster:theme:'+c.id,c.label+'-Booster','theme',c.id,25,'Nur Karten aus '+c.label+'.')),
 make('booster:premium','Premium-Booster','premium',null,60,'Höhere Gewichtung seltener Karten. Keine garantierte Seltenheit.'),
 make('booster:event','Event-Booster','event',null,40,'Nur ausdrücklich als Eventkarte markierte Karten.')
]);
const PRESETS=new Map(BOOSTER_PRESETS.map(x=>[x.id,x]));
const isInt=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const cleanId=val=>typeof val==='string'&&/^[a-z][a-z0-9:_-]{2,110}$/.test(val);
const weightFor=(type,rarity)=>{
 const index=REWARD_RARITIES.indexOf(rarity);if(index<0)return 0;
 return distributions[type.kind==='mixed'?'standard':type.kind][index];
};
function storedDefinition(preset,old=null){
 return {id:preset.id,name:preset.name,kind:preset.kind,categoryId:preset.categoryId,description:preset.description,
  schemaVersion:1,slots:5,cardPool:[],priceCoins:old?.priceCoins??preset.priceCoins,active:true};
}
/** Only user-authored catalogue rows count as eligible cards. Unconfigured placeholders do not. */
export function boosterPool(type,catalog){
 const valid=new Set(REWARD_CATEGORIES.map(x=>x.id));
 const rows=[],seen=new Set();
 for(const card of catalog){
  if(!card||!cleanId(card.id)||!valid.has(card.categoryId)||!REWARD_RARITIES.includes(card.rarity)||typeof card.name!=='string'||!card.name.trim())continue;
  if(type.categoryId&&type.categoryId!==card.categoryId)continue;
  if(type.kind==='event'&&card.eventCard!==true)continue;
  if(seen.has(card.id))continue;seen.add(card.id);
  rows.push({id:card.id,name:card.name,rarity:card.rarity,categoryId:card.categoryId,weight:weightFor(type,card.rarity)});
 }
 return rows.sort((a,b)=>a.id.localeCompare(b.id));
}
/** Independent draws with replacement, five slots. The listed percentages are
 * theoretical per-slot odds only; no booster draw occurs in BW04. */
export function calculateShopOdds(type,catalog){
 const pool=boosterPool(type,catalog),total=pool.reduce((sum,card)=>sum+card.weight,0);
 const odds=Object.fromEntries(REWARD_RARITIES.map(rarity=>[rarity,total>0?100*pool.filter(c=>c.rarity===rarity).reduce((sum,c)=>sum+c.weight,0)/total:0]));
 return {pool,odds,eligible:pool.length>=5&&total>0,reason:pool.length>=5?'':'Mindestens fünf passende selbst angelegte Karten erforderlich ('+pool.length+'/5).'};
}
export async function seedBoosterTypes(){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('bw-booster-types','readwrite'),store=tx.objectStore('bw-booster-types');let err=null;
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(err||tx.error||Error('Booster-Definitionen konnten nicht geladen werden.'));tx.onerror=()=>{};
  for(const preset of BOOSTER_PRESETS){
   const req=store.get(preset.id);req.onsuccess=()=>{try{
    if(req.result){validateRewardEntity('bw-booster-types',req.result);if(!isInt(req.result.priceCoins,1,500))fail('Ungültiger gespeicherter Boosterpreis.');}
    else{const definition=storedDefinition(preset);validateRewardEntity('bw-booster-types',definition);store.add(definition,definition.id);}
   }catch(e){err=e;tx.abort();}};
  }
 });
}
export async function setBoosterPrice(id,price){
 if(!PRESETS.has(id)||!isInt(price,1,500))fail('Preis muss zwischen 1 und 500 Münzen liegen.');
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('bw-booster-types','readwrite'),store=tx.objectStore('bw-booster-types');let err;
  tx.oncomplete=()=>resolve(price);tx.onerror=()=>{};tx.onabort=()=>reject(err||tx.error||Error('Preis konnte nicht gespeichert werden.'));
  store.get(id).onsuccess=e=>{try{const old=e.target.result||storedDefinition(PRESETS.get(id));validateRewardEntity('bw-booster-types',old);store.put({...old,priceCoins:price},id);}catch(ex){err=ex;tx.abort();}};
 });
}
export async function setShopFavorite(id,wanted){
 if(!PRESETS.has(id)||typeof wanted!=='boolean')fail('Unbekannter Booster oder Favoritenstatus.');
 await mutateModuleValues('belohnungswelt',[SHOP_FAVORITES_KEY],values=>{
  const old=values[SHOP_FAVORITES_KEY];const current=new Set(Array.isArray(old)?old.filter(x=>PRESETS.has(x)):[]);
  if(wanted)current.add(id);else current.delete(id);
  return [[SHOP_FAVORITES_KEY,[...current].sort()]];
 });
}
/** One consistent readonly snapshot for UI and inventory. */
export async function loadBoosterShop(){
 await seedBoosterTypes();
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-booster-types','bw-catalog','bw-wallet','bw-unopened','bw-journal','belohnungswelt'],'readonly');
  const requests={types:tx.objectStore('bw-booster-types').getAll(),catalog:tx.objectStore('bw-catalog').getAll(),wallet:tx.objectStore('bw-wallet').get('balances'),unopened:tx.objectStore('bw-unopened').getAll(),journal:tx.objectStore('bw-journal').getAll(),favorites:tx.objectStore('belohnungswelt').get(SHOP_FAVORITES_KEY)};
  tx.oncomplete=()=>{
   try{
    const wallet=requests.wallet.result??{id:'balances',schemaVersion:1,xp:0,coins:0,shards:0};validateRewardEntity('bw-wallet',wallet);
    const definitions=new Map((requests.types.result||[]).map(t=>[t.id,t]));
    const favorites=new Set(Array.isArray(requests.favorites.result)?requests.favorites.result:[]);
    const types=BOOSTER_PRESETS.map(preset=>{
     const stored=definitions.get(preset.id)||storedDefinition(preset);validateRewardEntity('bw-booster-types',stored);
     const pool=calculateShopOdds(preset,requests.catalog.result||[]);
     return {...preset,priceCoins:stored.priceCoins,favorite:favorites.has(preset.id),...pool};
    });
    const inventory=(requests.unopened.result||[]).map(p=>{validateRewardEntity('bw-unopened',p);return p;}).sort((a,b)=>String(b.purchasedAt).localeCompare(String(a.purchasedAt)));
    const purchases=(requests.journal.result||[]).filter(x=>x?.type==='booster-purchase').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100);
    resolve({wallet:{xp:wallet.xp,coins:wallet.coins,shards:wallet.shards},types,inventory,purchases});
   }catch(e){reject(e);}
  };
  tx.onerror=()=>{};tx.onabort=()=>reject(tx.error||Error('Booster-Shop konnte nicht geladen werden.'));
 });
}
/** Atomically deduct coins + add EACH unopened pack + journal entry.
 * Same requestId is idempotent across taps/tabs/crashes. Requests queued in
 * different tabs are serialized by the shared IndexedDB readwrite stores.
 */
export async function purchaseBooster(typeId,quantity=1,requestId=newRewardId('purchase')){
 if(!PRESETS.has(typeId))fail('Unbekannter Booster.');
 if(!isInt(quantity,1,10))fail('Es können 1 bis 10 Booster auf einmal gekauft werden.');
 if(!/^purchase:[a-f0-9-]{36}$/.test(requestId))fail('Ungültige Kauf-ID.');
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const stores=['bw-wallet','bw-unopened','bw-journal','bw-catalog','bw-booster-types'];
  const tx=db.transaction(stores,'readwrite');const walletStore=tx.objectStore('bw-wallet'),packsStore=tx.objectStore('bw-unopened'),journalStore=tx.objectStore('bw-journal');
  let pending=5,error=null,result=null;
  const reads={
   wallet:walletStore.get('balances'),
   existing:journalStore.get(requestId),
   catalog:tx.objectStore('bw-catalog').getAll(),
   definition:tx.objectStore('bw-booster-types').get(typeId),
   inventory:packsStore.count()
  };
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>{};tx.onabort=()=>reject(error||tx.error||Error('Kauf wurde vollständig abgebrochen. Keine Münzen abgezogen.'));
  for(const [key,req] of Object.entries(reads))req.onsuccess=()=>{
   if(--pending!==0)return;
   try{
    const prior=reads.existing.result;
    if(prior){
     if(prior.type!=='booster-purchase'||prior.boosterTypeId!==typeId||prior.quantity!==quantity)fail('Kauf-ID bereits für einen anderen Auftrag verwendet.');
     result={id:requestId,typeId,quantity,total:prior.coinsSpent,coinsAfter:prior.coinsAfter,replayed:true};return;
    }
    const type=reads.definition.result;if(!type||type.id!==typeId)fail('Booster-Art nicht vorhanden. Shop neu laden.');
    validateRewardEntity('bw-booster-types',type);
    if(!isInt(type.priceCoins,1,500))fail('Boosterpreis ist ungültig.');
    const preset=PRESETS.get(typeId),{pool,eligible,reason,odds}=calculateShopOdds(preset,reads.catalog.result||[]);
    if(!eligible)fail(reason);
    if(!isInt(reads.inventory.result,0,100000)||reads.inventory.result+quantity>200)fail('Inventargrenze: maximal 200 ungeöffnete Booster.');
    const wallet=reads.wallet.result??{id:'balances',schemaVersion:1,xp:0,coins:0,shards:0};validateRewardEntity('bw-wallet',wallet);
    const spent=type.priceCoins*quantity;
    if(!Number.isSafeInteger(spent)||wallet.coins<spent)fail('Nicht genügend Münzen. Benötigt: '+spent+', vorhanden: '+wallet.coins+'.');
    const now=new Date().toISOString(),after={...wallet,coins:wallet.coins-spent};validateRewardEntity('bw-wallet',after);
    walletStore.put(after,'balances');
    const snapshot=pool.map(({id,rarity,weight})=>({id,rarity,weight}));
    for(let i=0;i<quantity;i++){
     const pack={id:`pack:${requestId.slice(9)}:${i+1}`,schemaVersion:REWARD_SCHEMA_VERSION,boosterTypeId:typeId,purchasedAt:now,
      purchaseId:requestId,priceCoins:type.priceCoins,slots:5,poolSnapshot:snapshot,oddsSnapshot:odds,openingStatus:'sealed'};
     validateRewardEntity('bw-unopened',pack);packsStore.add(pack,pack.id);
    }
    const journal={id:requestId,schemaVersion:REWARD_SCHEMA_VERSION,type:'booster-purchase',createdAt:now,boosterTypeId:typeId,quantity,
      unitPrice:type.priceCoins,coinsSpent:spent,coinsBefore:wallet.coins,coinsAfter:after.coins,packIds:Array.from({length:quantity},(_,i)=>`pack:${requestId.slice(9)}:${i+1}`)};
    validateRewardEntity('bw-journal',journal);journalStore.add(journal,requestId);
    result={id:requestId,typeId,quantity,total:spent,coinsAfter:after.coins,replayed:false};
   }catch(e){error=e;tx.abort();}
  };
 });
}
