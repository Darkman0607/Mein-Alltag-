/** BW06 – non-destructive import of 100 original starter card records.
 * The artwork remains a separate, versioned SVG asset; user images take priority.
 * Import creates NO owned copies, coins, XP, boosters, or journal earnings.
 */
import {openDatabase} from './database.js';
import {REWARD_CATEGORIES,REWARD_SCHEMA_VERSION,validateRewardEntity} from './reward-data.js';
import {BW06_STARTER_CARDS} from './reward-series-data.js';

const categoryIds=new Set(REWARD_CATEGORIES.map(x=>x.id));
const safePath=/^\.\/assets\/card-art\/(anime-frauen|anime-tiere|maschinen|monster)\/(?:00[1-9]|0[12][0-9])\.svg$/;
const canonicalId=(categoryId,number)=>`catalog:${categoryId}:${String(number).padStart(3,'0')}`;
const keyOf=(categoryId,number)=>`${categoryId}:${number}`;
const ensure=(condition,message)=>{if(!condition)throw Error('Startserie: '+message);};

export function starterAssetPath(categoryId,number){
 if(!categoryIds.has(categoryId)||!Number.isInteger(number)||number<1||number>25)return null;
 return `./assets/card-art/${categoryId}/${String(number).padStart(3,'0')}.svg`;
}
/** Explicit exact-path comparison: no remote URLs, scriptable image URLs or data SVG. */
export function safeStarterAsset(card){
 const expected=starterAssetPath(card?.categoryId,card?.number);
 return expected&&card?.imageAsset===expected&&safePath.test(expected)?expected:null;
}
export const STARTER_CARDS=BW06_STARTER_CARDS;

/** Can be used in a permission preview without writing any data. */
export function previewStarterImport(catalog=[]){
 ensure(Array.isArray(catalog),'Ungültige Albumdaten.');
 const occupied=new Map();
 for(const card of catalog){
  if(!categoryIds.has(card?.categoryId)||!Number.isInteger(card?.number)||card.number<1||card.number>25)continue;
  const key=keyOf(card.categoryId,card.number);
  if(occupied.has(key))throw Error('Startserie: Doppelter Kartenplatz '+key+'. Import abgebrochen.');
  occupied.set(key,card);
 }
 const missing=STARTER_CARDS.filter(def=>!occupied.has(keyOf(def.categoryId,def.number)));
 return Object.freeze({available:STARTER_CARDS.length,existing:STARTER_CARDS.length-missing.length,toAdd:missing.length,missing});
}
function validateCollection(){
 ensure(STARTER_CARDS.length===100,'Die Startserie muss 100 Karten enthalten.');
 const slots=new Set(),names=new Set();
 for(const def of STARTER_CARDS){
  const key=keyOf(def.categoryId,def.number);
  ensure(!slots.has(key),'Doppelter Kartenplatz '+key);slots.add(key);
  ensure(!names.has(def.name),'Doppelter Kartenname '+def.name);names.add(def.name);
  ensure(def.imageAsset===starterAssetPath(def.categoryId,def.number)&&safeStarterAsset(def),'Ungültiger Motivpfad.');
  const testCard={...def,id:canonicalId(def.categoryId,def.number),schemaVersion:REWARD_SCHEMA_VERSION,seriesId:`series:${def.categoryId}`};
  validateRewardEntity('bw-catalog',testCard);
 }
 ensure(REWARD_CATEGORIES.every(c=>STARTER_CARDS.filter(x=>x.categoryId===c.id).length===25),'Nicht exakt 25 Karten pro Kategorie.');
}
validateCollection();

/** One IndexedDB transaction: either ALL still-empty positions are added or none.
 * Never modifies a user-authored card, even when the user renamed it or drew a picture.
 * Existing purchased booster pool snapshots and owned copies are never touched.
 */
export async function installStarterSeries(){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-catalog','bw-series'],'readwrite');
  const catalog=tx.objectStore('bw-catalog'),series=tx.objectStore('bw-series');
  const requestedCatalog=catalog.getAll(),requestedSeries=series.getAll();
  let pending=2,record=null,problem=null;
  tx.oncomplete=()=>resolve(record);
  tx.onerror=()=>{};
  tx.onabort=()=>reject(problem||tx.error||Error('Import abgebrochen – bereits gespeicherte Karten bleiben unverändert.'));
  const done=()=>{
   if(--pending!==0)return;
   try{
    const plan=previewStarterImport(requestedCatalog.result||[]);
    const existingIds=new Set((requestedCatalog.result||[]).map(c=>c?.id));
    const existingSeries=new Set((requestedSeries.result||[]).map(s=>s?.id));
    const createdAt=new Date().toISOString();
    for(const category of REWARD_CATEGORIES){
     const seriesId=`series:${category.id}`;
     if(existingSeries.has(seriesId))continue;
     const value={id:seriesId,schemaVersion:REWARD_SCHEMA_VERSION,name:category.label,categoryId:category.id,plannedCards:category.planned};
     validateRewardEntity('bw-series',value);series.add(value,seriesId);
    }
    for(const def of plan.missing){
     const id=canonicalId(def.categoryId,def.number);
     ensure(!existingIds.has(id),'Kollidierende technische Karten-ID. Der Import wurde vollständig abgebrochen.');
     const value={...def,id,schemaVersion:REWARD_SCHEMA_VERSION,seriesId:`series:${def.categoryId}`,
      imageData:null,origin:'bw06-original-vector-v1',createdAt,updatedAt:createdAt};
     validateRewardEntity('bw-catalog',value);catalog.add(value,id);
    }
    record={added:plan.toAdd,preserved:plan.existing,total:100};
   }catch(err){problem=err;tx.abort();}
  };
  requestedCatalog.onsuccess=done;requestedSeries.onsuccess=done;
 });
}
