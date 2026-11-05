/** BW06 – non-destructive starter collection; artwork is a separate versioned asset. */
import {openDatabase} from './database.js';
import {REWARD_CATEGORIES,REWARD_SCHEMA_VERSION,validateRewardEntity} from './reward-data.js';
import {BW06_STARTER_CARDS} from './reward-series-data.js';
const ids=new Set(REWARD_CATEGORIES.map(x=>x.id));
const ensure=(condition,message)=>{if(!condition)throw Error('Startserie: '+message);};
const canonicalId=(category,number)=>`catalog:${category}:${String(number).padStart(3,'0')}`;
const key=(category,number)=>`${category}:${number}`;
export const STARTER_CARDS=BW06_STARTER_CARDS;
export function starterAssetPath(category,number){return ids.has(category)&&Number.isInteger(number)&&number>=1&&number<=25?`./assets/card-art/${category}/${String(number).padStart(3,'0')}.svg`:null;}
/** BW12: 20 premium original anime portraits. Existing stable catalogue IDs, names,
 * user-supplied pictures and card ownership are never modified. This resolves an
 * external, bundled image only for the unchanged, verified BW06 factory-art path.
 */
export function safeStarterAsset(card){
 const expected=starterAssetPath(card?.categoryId,card?.number);
 if(!expected||card.imageAsset!==expected||!/^\.\/assets\/card-art\/(anime-frauen|anime-tiere|maschinen|monster)\/(?:00[1-9]|0[12][0-9])\.svg$/.test(expected))return null;
 if(card.categoryId==='anime-frauen'&&card.number<=20)return `./assets/card-art/anime-frauen/${String(card.number).padStart(3,'0')}.webp`;
 return expected;
}

export function previewStarterImport(catalog=[]){
 ensure(Array.isArray(catalog),'Ungültige Albumdaten.');
 const occupied=new Set();for(const card of catalog){if(!ids.has(card?.categoryId)||!Number.isInteger(card?.number)||card.number<1||card.number>25)continue;
  const position=key(card.categoryId,card.number);ensure(!occupied.has(position),'Doppelter Kartenplatz '+position);occupied.add(position);}
 const missing=STARTER_CARDS.filter(c=>!occupied.has(key(c.categoryId,c.number)));
 return {available:100,existing:100-missing.length,toAdd:missing.length,missing};
}
function validateCollection(){ensure(STARTER_CARDS.length===100,'Startserie benötigt 100 Motive.');
 const names=new Set(),slots=new Set();for(const c of STARTER_CARDS){const slot=key(c.categoryId,c.number);
  ensure(!slots.has(slot)&&!names.has(c.name),'Doppelter Name oder Kartenplatz.');slots.add(slot);names.add(c.name);
  ensure(starterAssetPath(c.categoryId,c.number)===c.imageAsset,'Ungültiger Original-Motivpfad.');validateRewardEntity('bw-catalog',{...c,id:canonicalId(c.categoryId,c.number),seriesId:`series:${c.categoryId}`,schemaVersion:REWARD_SCHEMA_VERSION});
 }}
validateCollection();
export async function installStarterSeries(){
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-catalog','bw-series'],'readwrite');const cards=tx.objectStore('bw-catalog'),series=tx.objectStore('bw-series');
  const previous=cards.getAll(),previousSeries=series.getAll();let remaining=2,problem=null,result=null;
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>{};tx.onabort=()=>reject(problem||tx.error||Error('Import abgebrochen – Kartenbestand unverändert.'));
  function run(){if(--remaining!==0)return;try{
   const plan=previewStarterImport(previous.result||[]),knownIds=new Set((previous.result||[]).map(x=>x.id)),knownSeries=new Set((previousSeries.result||[]).map(x=>x.id)),now=new Date().toISOString();
   for(const category of REWARD_CATEGORIES){const id=`series:${category.id}`;if(knownSeries.has(id))continue;
    const value={id,schemaVersion:REWARD_SCHEMA_VERSION,name:category.label,categoryId:category.id,plannedCards:category.planned};validateRewardEntity('bw-series',value);series.add(value,id);}
   for(const def of plan.missing){const id=canonicalId(def.categoryId,def.number);ensure(!knownIds.has(id),'Kollidierende technische ID.');
    const value={...def,id,seriesId:`series:${def.categoryId}`,schemaVersion:REWARD_SCHEMA_VERSION,imageData:null,origin:'bw06-original-vector-v1',createdAt:now,updatedAt:now};
    validateRewardEntity('bw-catalog',value);cards.add(value,id);
   }
   result={added:plan.toAdd,preserved:plan.existing,total:100};
  }catch(e){problem=e;tx.abort();}}
  previous.onsuccess=run;previousSeries.onsuccess=run;
 });
}
