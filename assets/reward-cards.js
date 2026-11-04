/** BW07 – safe card-instance management and virtual card economy.
 * No real money, no auto-rewards and no cross-device card trading.
 * Each irreversible operation commits instance, wallet and journal atomically.
 */
import {openDatabase,mutateModuleValues,getModuleValue} from './database.js';
import {REWARD_SCHEMA_VERSION,REWARD_RARITIES,validateRewardEntity,newRewardId} from './reward-data.js';

export const CARD_RULES_KEY='bw07:card-rates:v1';
// Explicitly provisional, user-editable virtual-game parameters; NOT actual market prices.
export const DEFAULT_CARD_RATES=Object.freeze({version:1,
 sellCoins:Object.freeze({gewoehnlich:1,ungewoehnlich:2,selten:4,episch:8,legendaer:16,mythisch:32,diamant:64}),
 salvageShards:Object.freeze({gewoehnlich:1,ungewoehnlich:2,selten:4,episch:8,legendaer:16,mythisch:32,diamant:64}),
 craftShards:Object.freeze({gewoehnlich:10,ungewoehnlich:20,selten:40,episch:80,legendaer:160,mythisch:320})
});
const craftable=new Set(REWARD_RARITIES.filter(x=>x!=='diamant'));
const safeId=x=>typeof x==='string'&&/^[a-z][a-z0-9:_-]{2,110}$/.test(x);
const fail=x=>{throw Error('Kartenverwaltung: '+x);};
const emptyWallet=()=>({id:'balances',schemaVersion:REWARD_SCHEMA_VERSION,xp:0,coins:0,shards:0});
const clone=x=>JSON.parse(JSON.stringify(x));

export function validateCardRates(data){
 if(!data||data.version!==1||!data.sellCoins||!data.salvageShards||!data.craftShards)fail('Preisregeln fehlen oder Version ungültig.');
 if(Object.keys(data).sort().join()!=='craftShards,salvageShards,sellCoins,version')fail('Unbekannte Preistabelle.');
 for(const [table,keys] of [['sellCoins',REWARD_RARITIES],['salvageShards',REWARD_RARITIES],['craftShards',[...craftable]]]){
  if(Object.keys(data[table]).sort().join()!==[...keys].sort().join())fail('Preistabelle unvollständig.');
  for(const key of keys){const value=data[table][key];if(!Number.isSafeInteger(value)||value<1||value>10000)fail('Preis außerhalb 1–10000: '+key);}
 }
 for(const rarity of craftable){if(data.craftShards[rarity]<=data.salvageShards[rarity])fail('Herstellung muss mehr Splitter als Verwertung kosten.');}
 return true;
}
export const normalizeCardRates=x=>{const data=x==null?clone(DEFAULT_CARD_RATES):clone(x);validateCardRates(data);return data;};
export async function loadCardRates(){return normalizeCardRates(await getModuleValue('belohnungswelt',CARD_RULES_KEY));}
export async function saveCardRateSettings(updated){
 validateCardRates(updated);
 await mutateModuleValues('belohnungswelt',[CARD_RULES_KEY],()=>[[CARD_RULES_KEY,clone(updated)]]);
 return loadCardRates();
}
export async function saveCardRates(change){
 if(!change||!['sellCoins','salvageShards','craftShards'].includes(change.table)||!REWARD_RARITIES.includes(change.rarity)||!Number.isSafeInteger(change.value))fail('Ungültige Preisänderung.');
 if(change.table==='craftShards'&&change.rarity==='diamant')fail('Diamant ist nicht herstellbar.');
 await mutateModuleValues('belohnungswelt',[CARD_RULES_KEY],values=>{
  const next=normalizeCardRates(values[CARD_RULES_KEY]);next[change.table][change.rarity]=change.value;validateCardRates(next);
  return [[CARD_RULES_KEY,next]];
 });return loadCardRates();
}


export function groupCardInstances(catalog,instances){
 const byId=new Map(catalog.map(c=>[c.id,c]));const groups=new Map();
 for(const copy of instances){const card=byId.get(copy.cardId);if(!card)continue;
  const group=groups.get(card.id)||{card,instances:[],total:0,locked:0};
  group.instances.push(copy);group.total++;if(copy.locked)group.locked++;groups.set(card.id,group);
 }
 return [...groups.values()].sort((a,b)=>a.card.categoryId.localeCompare(b.card.categoryId)||a.card.number-b.card.number);
}
export async function loadRewardCardManager(){
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-catalog','bw-instances','bw-wallet','bw-journal','belohnungswelt'],'readonly');
  const requests={catalog:tx.objectStore('bw-catalog').getAll(),copies:tx.objectStore('bw-instances').getAll(),wallet:tx.objectStore('bw-wallet').get('balances'),journal:tx.objectStore('bw-journal').getAll(),rules:tx.objectStore('belohnungswelt').get(CARD_RULES_KEY)};
  tx.oncomplete=()=>{try{
   const wallet=requests.wallet.result??emptyWallet();validateRewardEntity('bw-wallet',wallet);
   const rates=normalizeCardRates(requests.rules.result);const catalog=requests.catalog.result||[],instances=requests.copies.result||[];
   resolve({wallet,rates,catalog,instances,groups:groupCardInstances(catalog,instances),history:(requests.journal.result||[]).filter(x=>x?.type==='card-sell'||x?.type==='card-salvage'||x?.type==='card-craft').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,60)});
  }catch(e){reject(e);}};
  tx.onerror=()=>{};tx.onabort=()=>reject(tx.error||Error('Kartenbestand konnte nicht gelesen werden.'));
 });
}

/** BW07 protection: one copy can be locked/unlocked. A locked copy cannot be consumed. */
export async function setCardCopyLock(copyId,locked){
 if(!safeId(copyId)||typeof locked!=='boolean')fail('Ungültiger Kartenschutz.');
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction('bw-instances','readwrite'),store=tx.objectStore('bw-instances');
  let result=null,problem=null;tx.oncomplete=()=>resolve(result);tx.onerror=()=>{};
  tx.onabort=()=>reject(problem||tx.error||Error('Kartenschutz nicht gespeichert.'));
  store.get(copyId).onsuccess=e=>{try{
   const copy=e.target.result;if(!copy)fail('Exemplar nicht mehr vorhanden.');validateRewardEntity('bw-instances',copy);
   const next={...copy,locked};validateRewardEntity('bw-instances',next);store.put(next,copyId);result=next;
  }catch(err){problem=err;tx.abort();}};
 });
}
/** Operation IDs are fixed before confirmation; one ID cannot perform two different actions. */
export async function tradeCardCopy({copyId,kind,requestId=newRewardId('cardtrade'),allowLastCopy=false,allowRare=false}={}){
 if(!safeId(copyId)||!['sell','salvage'].includes(kind)||!safeId(requestId))fail('Ungültige Transaktion.');
 const txId=`card-op:${requestId}`;if(txId.length>110)fail('Transaktions-ID zu lang.');
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-instances','bw-catalog','bw-wallet','bw-journal','belohnungswelt'],'readwrite');
  const instanceStore=tx.objectStore('bw-instances'),walletStore=tx.objectStore('bw-wallet'),journalStore=tx.objectStore('bw-journal');
  const reqs={copies:instanceStore.getAll(),catalog:tx.objectStore('bw-catalog').getAll(),wallet:walletStore.get('balances'),journal:journalStore.get(txId),rates:tx.objectStore('belohnungswelt').get(CARD_RULES_KEY)};
  let pending=Object.keys(reqs).length,problem=null,result=null;
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>{};tx.onabort=()=>reject(problem||tx.error||Error('Vorgang fehlgeschlagen. Karte und Guthaben blieben erhalten.'));
  function run(){try{
   const previous=reqs.journal.result;
   if(previous){if(previous.type!==`card-${kind}`||previous.copyId!==copyId)fail('Vorgangs-ID bereits anders verwendet.');result={...previous,replayed:true};return;}
   const copies=reqs.copies.result||[],copy=copies.find(x=>x.id===copyId);if(!copy)fail('Exemplar existiert nicht mehr.');
   validateRewardEntity('bw-instances',copy);if(copy.locked)fail('Gesperrte Karten dürfen nicht abgegeben werden.');
   const same=copies.filter(c=>c.cardId===copy.cardId);if(same.length===1&&!allowLastCopy)fail('Letztes Exemplar geschützt. Eine zusätzliche Bestätigung ist erforderlich.');
   const card=(reqs.catalog.result||[]).find(c=>c.id===copy.cardId);if(!card)fail('Kartenbeschreibung nicht auffindbar.');validateRewardEntity('bw-catalog',card);
   const rarity=REWARD_RARITIES.includes(copy.rarityAtDraw)?copy.rarityAtDraw:card.rarity;
   if(['legendaer','mythisch','diamant'].includes(rarity)&&!allowRare)fail('Besonders seltene Karte benötigt eine zusätzliche Bestätigung.');
   const rules=normalizeCardRates(reqs.rates.result),wallet=reqs.wallet.result??emptyWallet();validateRewardEntity('bw-wallet',wallet);
   const coins=kind==='sell'?rules.sellCoins[rarity]:0,shards=kind==='salvage'?rules.salvageShards[rarity]:0;
   if(!Number.isSafeInteger(wallet.coins+coins)||!Number.isSafeInteger(wallet.shards+shards))fail('Konto-Obergrenze erreicht.');
   const updated={...wallet,coins:wallet.coins+coins,shards:wallet.shards+shards};
   const entry={id:txId,schemaVersion:REWARD_SCHEMA_VERSION,type:`card-${kind}`,createdAt:new Date().toISOString(),copyId,cardId:copy.cardId,cardName:card.name,rarity,coins,shards};
   validateRewardEntity('bw-wallet',updated);validateRewardEntity('bw-journal',entry);
   instanceStore.delete(copyId);walletStore.put(updated,'balances');journalStore.add(entry,txId);result={...entry,replayed:false};
  }catch(e){problem=e;tx.abort();}}
  for(const req of Object.values(reqs))req.onsuccess=()=>{if(--pending===0)run();};
 });
}
/** Minting consumes actual shards in same transaction creating the copy and journal.
 * No Diamonds are craftable, including when catalog metadata is edited afterward.
 */
export async function craftCardCopy({cardId,requestId=newRewardId('cardcraft')}={}){
 if(!safeId(cardId)||!safeId(requestId))fail('Ungültige Herstellungs-ID.');
 const journalId=`card-op:${requestId}`;if(journalId.length>110)fail('Transaktions-ID zu lang.');
 const copyId=newRewardId('copy'),db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-instances','bw-catalog','bw-wallet','bw-journal','belohnungswelt'],'readwrite');
  const copies=tx.objectStore('bw-instances'),walletStore=tx.objectStore('bw-wallet'),journalStore=tx.objectStore('bw-journal');
  const reqs={card:tx.objectStore('bw-catalog').get(cardId),wallet:walletStore.get('balances'),journal:journalStore.get(journalId),rates:tx.objectStore('belohnungswelt').get(CARD_RULES_KEY)};
  let remaining=Object.keys(reqs).length,problem=null,result=null;
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>{};tx.onabort=()=>reject(problem||tx.error||Error('Herstellung fehlgeschlagen. Splitter wurden nicht abgezogen.'));
  function run(){try{
   const previous=reqs.journal.result;if(previous){if(previous.type!=='card-craft'||previous.cardId!==cardId)fail('Vorgangs-ID ist bereits anders verwendet.');result={...previous,replayed:true};return;}
   const card=reqs.card.result;if(!card)fail('Karte nicht im Katalog vorhanden.');validateRewardEntity('bw-catalog',card);
   if(!craftable.has(card.rarity))fail('Diamant-Karten dürfen nicht hergestellt werden.');
   const rules=normalizeCardRates(reqs.rates.result),price=rules.craftShards[card.rarity];
   const wallet=reqs.wallet.result??emptyWallet();validateRewardEntity('bw-wallet',wallet);
   if(wallet.shards<price)fail(`Nicht genügend Splitter (${wallet.shards} von ${price}).`);
   const at=new Date().toISOString(),next={...wallet,shards:wallet.shards-price};
   const copy={id:copyId,schemaVersion:REWARD_SCHEMA_VERSION,cardId,obtainedAt:at,locked:false,rarityAtDraw:card.rarity,source:'craft',sourceCraftId:journalId};
   const entry={id:journalId,schemaVersion:REWARD_SCHEMA_VERSION,type:'card-craft',createdAt:at,copyId,cardId,cardName:card.name,rarity:card.rarity,shardsSpent:price};
   validateRewardEntity('bw-wallet',next);validateRewardEntity('bw-instances',copy);validateRewardEntity('bw-journal',entry);
   copies.add(copy,copyId);walletStore.put(next,'balances');journalStore.add(entry,journalId);result={...entry,replayed:false};
  }catch(e){problem=e;tx.abort();}}
  for(const req of Object.values(reqs))req.onsuccess=()=>{if(--remaining===0)run();};
 });
}
