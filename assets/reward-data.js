/** Mein Alltag BW01 – isolated, versioned data contract for the Belohnungswelt.
 * No rewards are granted here. Shop, drawing, and XP rules are deliberately inactive.
 * All IDs remain stable across backups, exports, and future UI changes.
 */
import {openDatabase,REWARD_STORES} from './database.js';

export const REWARD_SCHEMA_VERSION=1;
export const REWARD_CATEGORIES=Object.freeze([
 Object.freeze({id:'anime-frauen',label:'Anime-Frauen',planned:25}),
 Object.freeze({id:'anime-tiere',label:'Anime-Tiere',planned:25}),
 Object.freeze({id:'maschinen',label:'Traktoren & Maschinen',planned:25}),
 Object.freeze({id:'monster',label:'Monster',planned:25})
]);
export const REWARD_RARITIES=Object.freeze(['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant']);
const REWARD_ENTITY_STORES=new Set(REWARD_STORES);
const ID_PATTERN=/^[a-z][a-z0-9_:-]{2,110}$/;
const text=(value,max=180)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const id=value=>typeof value==='string'&&ID_PATTERN.test(value);
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
function check(condition,message){if(!condition)throw Error('Belohnungswelt: '+message);}

/** Unique client-side IDs, never derived from names or array positions. */
export function newRewardId(prefix){
 check(id(prefix),'Ungültiger ID-Präfix.');
 check(typeof globalThis.crypto?.randomUUID==='function','Sichere UUID-Erzeugung nicht verfügbar.');
 return `${prefix}:${crypto.randomUUID()}`;
}

export function validateRewardEntity(store,entity){
 check(REWARD_ENTITY_STORES.has(store),'Unbekannter Datenspeicher.');
 check(entity&&typeof entity==='object'&&!Array.isArray(entity),'Datensatz muss ein Objekt sein.');
 check(id(entity.id),'Ungültige stabile ID.');
 check(entity.schemaVersion===REWARD_SCHEMA_VERSION,'Nicht unterstützte Datensatzversion.');
 switch(store){
  case 'bw-series':
   check(text(entity.name)&&id(entity.categoryId),'Serie benötigt Name und Kategorie-ID.');
   check(nonnegative(entity.plannedCards),'Ungültige geplante Kartenanzahl.');break;
  case 'bw-catalog':
   check(id(entity.seriesId)&&nonnegative(entity.number)&&entity.number>0,'Karte benötigt Serie und Kartennummer.');
   check(text(entity.name)&&REWARD_RARITIES.includes(entity.rarity),'Name oder Seltenheit ungültig.');
   check(id(entity.categoryId),'Kategorie fehlt.');
   check(entity.templateId===null||id(entity.templateId),'Ungültiger Vorlagenverweis.');break;
  case 'bw-booster-types':
   check(text(entity.name)&&nonnegative(entity.priceCoins),'Booster benötigt Name und Münzpreis.');
   check(Array.isArray(entity.cardPool)&&entity.cardPool.every(id),'Kartenpool ungültig.');
   check(entity.slots===5,'Ein Booster enthält genau fünf Karten.');break;
  case 'bw-instances':
   check(id(entity.cardId)&&text(entity.obtainedAt,50),'Kartenexemplar benötigt Karten-ID und Erwerbsdatum.');
   check(entity.locked===true||entity.locked===false,'Ungültiger Sperrstatus.');break;
  case 'bw-wallet':
   check(entity.id==='balances','Es existiert nur ein Währungskonto.');
   check(nonnegative(entity.xp)&&nonnegative(entity.coins)&&nonnegative(entity.shards),'Ungültige Kontowerte.');break;
  case 'bw-unopened':
   check(id(entity.boosterTypeId)&&text(entity.purchasedAt,50),'Ungeöffnetes Booster benötigt Typ und Kaufdatum.');break;
  case 'bw-journal':
   check(text(entity.type,100)&&text(entity.createdAt,50),'Journal benötigt Buchungsart und Datum.');break;
 }
 return true;
}

/** Add, never overwrite: repeated taps cannot silently replace an existing ID.
 * Atomic purchases/openings need their own cross-store transactions in BW04/BW05. */
export async function addRewardEntity(store,entity){
 validateRewardEntity(store,entity);
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,'readwrite');
  tx.objectStore(store).add(entity,entity.id);
  tx.oncomplete=()=>resolve(entity.id);
  tx.onerror=()=>{};
  tx.onabort=()=>reject(tx.error||Error('Belohnungswelt: Datensatz bereits vorhanden oder Speichern fehlgeschlagen.'));
 });
}

export async function readRewardEntity(store,key){
 check(REWARD_ENTITY_STORES.has(store)&&id(key),'Ungültiger Leseschlüssel.');
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const req=db.transaction(store,'readonly').objectStore(store).get(key);
  req.onsuccess=()=>resolve(req.result??null);
  req.onerror=()=>reject(req.error||Error('Belohnungswelt konnte nicht gelesen werden.'));
 });
}

/** A consistent snapshot for the overview; no demo rewards are injected. */
export async function readRewardOverview(){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const stores=['bw-series','bw-catalog','bw-instances','bw-booster-types','bw-unopened','bw-wallet'];
  const tx=db.transaction(stores,'readonly'),stats={schemaVersion:REWARD_SCHEMA_VERSION};
  tx.oncomplete=()=>resolve({schemaVersion:stats.schemaVersion,series:stats.series||0,catalogCards:stats.catalogCards||0,ownedCopies:stats.ownedCopies||0,boosterTypes:stats.boosterTypes||0,unopenedBoosters:stats.unopenedBoosters||0,wallet:stats.wallet||{xp:0,coins:0,shards:0}});
  tx.onerror=()=>{};
  tx.onabort=()=>reject(tx.error||Error('Belohnungswelt-Daten konnten nicht geladen werden.'));
  for(const [store,key] of [['bw-series','series'],['bw-catalog','catalogCards'],['bw-instances','ownedCopies'],['bw-booster-types','boosterTypes'],['bw-unopened','unopenedBoosters']]){
   tx.objectStore(store).count().onsuccess=event=>{stats[key]=event.target.result;};
  }
  tx.objectStore('bw-wallet').get('balances').onsuccess=event=>{stats.wallet=event.target.result??null;};
 });
}
