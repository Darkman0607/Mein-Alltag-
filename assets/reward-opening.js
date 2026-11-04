/** BW05 – irreversible only after a successful atomic five-card draw.
 * The bought pack's poolSnapshot controls odds even if the shop changes later.
 * Draws are independent (with replacement), without any rarity guarantee.
 */
import {openDatabase} from './database.js';
import {REWARD_SCHEMA_VERSION,REWARD_RARITIES,validateRewardEntity,newRewardId} from './reward-data.js';

const safeId=value=>typeof value==='string'&&/^[a-z][a-z0-9:_-]{2,110}$/.test(value);
const fail=message=>{throw Error('Booster-Öffnung: '+message);};
const OPENING_PREFIX='opening:';
const UINT32_RANGE=4294967296;

/** Validate the PURCHASED pool; never recalculate from the current shop. */
export function validateOpeningPool(pool){
 if(!Array.isArray(pool)||pool.length<5||pool.length>1000)fail('Ungültiger gespeicherter Kartenpool. Booster bleibt versiegelt.');
 const ids=new Set();let total=0;
 for(const card of pool){
  if(!card||!safeId(card.id)||!REWARD_RARITIES.includes(card.rarity)||typeof card.weight!=='number'||!Number.isFinite(card.weight)||card.weight<=0||card.weight>1000000||ids.has(card.id))fail('Beschädigter Kartenpool. Booster bleibt versiegelt.');
  ids.add(card.id);total+=card.weight;
 }
 if(!Number.isFinite(total)||total<=0||total>100000000)fail('Ungültige Kartengewichte. Booster bleibt versiegelt.');
 return total;
}
/** Pure selector: input in [0,1); per-card weights drive the exact probabilities. */
export function selectWeightedCard(pool,unit){
 if(typeof unit!=='number'||!Number.isFinite(unit)||unit<0||unit>=1)fail('Zufallswert außerhalb des gültigen Bereichs.');
 const total=validateOpeningPool(pool);
 const limit=unit*total;let running=0;
 for(const card of pool){running+=card.weight;if(limit<running)return card;}
 return pool[pool.length-1]; // Floating-point boundary guard.
}
function cryptographicDrawUnits(){
 if(!globalThis.crypto||typeof globalThis.crypto.getRandomValues!=='function')fail('Sichere Zufallsquelle fehlt. Booster bleibt versiegelt.');
 const words=new Uint32Array(5);globalThis.crypto.getRandomValues(words);
 return Array.from(words,n=>n/UINT32_RANGE);
}
function validPackId(id){return typeof id==='string'&&/^pack:[a-f0-9-]{36}:(?:[1-9]|10)$/.test(id);}
function openingIdFor(packId){return OPENING_PREFIX+packId.slice(5);}
/** Five copies, deletion of sealed pack and result journal are one IndexedDB transaction.
 * Repeated requests for the same pack return the existing result, never extra copies.
 * Missing/deleted catalogue rows abort before touching the pack, avoiding ghost cards.
 */
export async function openOwnedBooster(packId){
 if(!validPackId(packId))fail('Booster-ID ist ungültig.');
 const randomUnits=cryptographicDrawUnits(),createdIds=Array.from({length:5},()=>newRewardId('copy'));
 const openId=openingIdFor(packId);
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-unopened','bw-instances','bw-journal','bw-catalog'],'readwrite');
  const packStore=tx.objectStore('bw-unopened'),instanceStore=tx.objectStore('bw-instances'),journalStore=tx.objectStore('bw-journal');
  const requests={journal:journalStore.get(openId),pack:packStore.get(packId),catalog:tx.objectStore('bw-catalog').getAll(),copies:instanceStore.getAll()};
  let pending=4,result=null,error=null;
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>{};
  tx.onabort=()=>reject(error||tx.error||Error('Öffnung wurde zurückgerollt. Dein Booster bleibt erhalten.'));
  for(const req of Object.values(requests))req.onsuccess=()=>{
   if(--pending!==0)return;
   try{
    const previous=requests.journal.result;
    if(previous){
     validateRewardEntity('bw-journal',previous);
     if(previous.type!=='booster-open'||previous.packId!==packId||!Array.isArray(previous.cards)||previous.cards.length!==5)fail('Widersprüchlicher Öffnungsverlauf. Daten bitte prüfen.');
     result={packId,openingId:openId,openedAt:previous.createdAt,cards:previous.cards,replayed:true};return;
    }
    const pack=requests.pack.result;
    if(!pack)fail('Booster ist nicht mehr im Inventar. Öffnungsverlauf prüfen.');
    validateRewardEntity('bw-unopened',pack);
    if(pack.id!==packId||pack.openingStatus!=='sealed'||pack.slots!==5)fail('Booster ist nicht ordnungsgemäß versiegelt.');
    const pool=pack.poolSnapshot;validateOpeningPool(pool);
    const available=new Map((requests.catalog.result||[]).map(card=>[card.id,card]));
    for(const row of pool){
     const item=available.get(row.id);
     if(!item){fail('Eine ehemals verfügbare Karte wurde aus dem Album gelöscht. Bitte erst den Katalog aus einer Sicherung wiederherstellen; dein Booster bleibt erhalten.');}
     validateRewardEntity('bw-catalog',item);
    }
    const counts=new Map();
    for(const copy of requests.copies.result||[]){if(copy?.cardId)counts.set(copy.cardId,(counts.get(copy.cardId)||0)+1);}
    const openedAt=new Date().toISOString(),cards=[];
    for(let i=0;i<5;i++){
     const pick=selectWeightedCard(pool,randomUnits[i]),catalogCard=available.get(pick.id);
     const duplicate=(counts.get(pick.id)||0)>0;
     counts.set(pick.id,(counts.get(pick.id)||0)+1);
     const copy={id:createdIds[i],schemaVersion:REWARD_SCHEMA_VERSION,cardId:pick.id,obtainedAt:openedAt,locked:false,
      sourcePackId:packId,openingId:openId,rarityAtDraw:pick.rarity};
     validateRewardEntity('bw-instances',copy);instanceStore.add(copy,copy.id);
     cards.push({cardId:pick.id,copyId:copy.id,name:catalogCard.name,rarity:pick.rarity,categoryId:catalogCard.categoryId,number:catalogCard.number,duplicate});
    }
    const record={id:openId,schemaVersion:REWARD_SCHEMA_VERSION,type:'booster-open',createdAt:openedAt,
     packId,boosterTypeId:pack.boosterTypeId,purchaseId:pack.purchaseId||null,cards,slots:5};
    validateRewardEntity('bw-journal',record);
    journalStore.add(record,openId);
    packStore.delete(packId);
    result={packId,openingId:openId,openedAt,cards,replayed:false};
   }catch(e){error=e;tx.abort();}
  };
 });
}
/** Show previous openings after a restart; no history is manufactured. */
export async function loadBoosterOpeningHistory(limit=25){
 if(!Number.isInteger(limit)||limit<1||limit>100)fail('Ungültiges Verlaufslimit.');
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('bw-journal','readonly'),request=tx.objectStore('bw-journal').getAll();
  tx.oncomplete=()=>resolve((request.result||[]).filter(x=>x?.type==='booster-open'&&Array.isArray(x.cards)&&x.cards.length===5)
   .sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,limit));
  tx.onabort=()=>reject(tx.error||Error('Öffnungsverlauf nicht lesbar.'));tx.onerror=()=>{};
 });
}
