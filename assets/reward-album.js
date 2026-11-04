/** BW02 - Album domain logic. The 100 planned slots are NOT 100 owned or finished cards. */
import {openDatabase,mutateModuleValues} from './database.js';
import {REWARD_CATEGORIES,REWARD_RARITIES,REWARD_SCHEMA_VERSION,validateRewardEntity} from './reward-data.js';

const FAVORITE_KEY='bw02:album-favorites';
const categoryIds=new Set(REWARD_CATEGORIES.map(c=>c.id));
const raritySet=new Set(REWARD_RARITIES);
export const ALBUM_SLOTS=Object.freeze(REWARD_CATEGORIES.flatMap(category=>
 Array.from({length:category.planned},(_,n)=>Object.freeze({id:`${category.id}:${n+1}`,categoryId:category.id,number:n+1}))
));
const slotIds=new Set(ALBUM_SLOTS.map(s=>s.id));
export const CATEGORY_APPEARANCE=Object.freeze({
 'anime-frauen':Object.freeze({icon:'✧',label:'Anime-Frauen',theme:'violet'}),
 'anime-tiere':Object.freeze({icon:'✿',label:'Anime-Tiere',theme:'mint'}),
 maschinen:Object.freeze({icon:'⚙',label:'Traktoren & Maschinen',theme:'gold'}),
 monster:Object.freeze({icon:'✦',label:'Monster',theme:'blue'})
});
export const CATEGORY_FIELDS=Object.freeze({
 'anime-frauen':Object.freeze([{key:'figur',label:'Figur / Rolle'},{key:'welt',label:'Welt / Herkunft'}]),
 'anime-tiere':Object.freeze([{key:'tierart',label:'Tierart'},{key:'lebensraum',label:'Lebensraum'}]),
 maschinen:Object.freeze([{key:'marke',label:'Marke / Hersteller'},{key:'modell',label:'Modell / Typ'},{key:'leistung',label:'Leistung / PS'}]),
 monster:Object.freeze([{key:'element',label:'Element'},{key:'faehigkeit',label:'Besondere Fähigkeit'}])
});
const getSlot=(categoryId,number)=>ALBUM_SLOTS.find(s=>s.categoryId===categoryId&&s.number===number);

export function projectAlbum(catalog=[],instances=[],favorites=[]){
 const favoriteSet=new Set(Array.isArray(favorites)?favorites.filter(x=>slotIds.has(x)):[]);
 const bySlot=new Map(),byCardId=new Map();
 for(const card of catalog){
  const slot=getSlot(card?.categoryId,card?.number);
  if(!slot||!card?.id||bySlot.has(slot.id))continue;
  bySlot.set(slot.id,card);byCardId.set(card.id,slot.id);
 }
 const counts=new Map(),obtained=new Map();
 for(const instance of instances){
  const slotId=byCardId.get(instance?.cardId);
  if(!slotId)continue;
  counts.set(slotId,(counts.get(slotId)||0)+1);
  const list=obtained.get(slotId)||[];
  list.push({id:instance.id,obtainedAt:instance.obtainedAt,locked:instance.locked===true});
  obtained.set(slotId,list);
 }
 const slots=ALBUM_SLOTS.map(slot=>Object.freeze({...slot,card:bySlot.get(slot.id)||null,owned:counts.get(slot.id)||0,favorite:favoriteSet.has(slot.id),copies:obtained.get(slot.id)||[]}));
 const uniqueOwned=slots.filter(s=>s.owned>0).length;
 return {slots,total:ALBUM_SLOTS.length,uniqueOwned,copies:slots.reduce((n,s)=>n+s.owned,0),configured:slots.filter(s=>s.card).length,favorites:slots.filter(s=>s.favorite).length,percent:Math.round(uniqueOwned*100/ALBUM_SLOTS.length),byCategory:REWARD_CATEGORIES.map(c=>({id:c.id,label:c.label,total:c.planned,owned:slots.filter(s=>s.categoryId===c.id&&s.owned>0).length,configured:slots.filter(s=>s.categoryId===c.id&&s.card).length}))};
}

export function filterAlbum(album,{category='all',status='all',query=''}={}){
 const search=String(query).trim().toLocaleLowerCase('de-AT');
 return album.slots.filter(slot=>{
  if(category!=='all'&&category!==slot.categoryId)return false;
  if(status==='owned'&&!slot.owned)return false;
  if(status==='missing'&&slot.owned)return false;
  if(status==='favorites'&&!slot.favorite)return false;
  if(search){
   const cat=CATEGORY_APPEARANCE[slot.categoryId]?.label||'';
   const haystack=`${cat} ${slot.card?.name||''} ${slot.number} ${String(slot.number).padStart(3,'0')} ${slot.card?.rarity||''}`.toLocaleLowerCase('de-AT');
   if(!haystack.includes(search))return false;
  }
  return true;
 });
}

export async function loadRewardAlbum(){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-catalog','bw-instances','belohnungswelt'],'readonly');
  const catalog=tx.objectStore('bw-catalog').getAll();
  const copies=tx.objectStore('bw-instances').getAll();
  const favorites=tx.objectStore('belohnungswelt').get(FAVORITE_KEY);
  tx.oncomplete=()=>resolve(projectAlbum(catalog.result,copies.result,favorites.result));
  tx.onerror=()=>{};
  tx.onabort=()=>reject(tx.error||Error('Album konnte nicht geladen werden.'));
 });
}

export async function setAlbumFavorite(slotId,wanted){
 if(!slotIds.has(slotId)||typeof wanted!=='boolean')throw Error('Ungültiger Kartenplatz oder Favoritenstatus.');
 // Atomic read-modify-write avoids lost updates when two views are open.
 await mutateModuleValues('belohnungswelt',[FAVORITE_KEY],values=>{
  const value=values[FAVORITE_KEY];
  const current=new Set(Array.isArray(value)?value.filter(id=>slotIds.has(id)):[]);
  if(wanted)current.add(slotId);else current.delete(slotId);
  return [[FAVORITE_KEY,[...current].sort()]];
 });
 return true;
}

/** Save catalog metadata and a (user supplied) image. No owned instance is created. */
export async function saveAlbumCard({categoryId,number,name,rarity,description='',imageData=null,details={}}){
 const slot=getSlot(categoryId,Number(number));
 if(!slot)throw Error('Unbekannte Album-Kategorie oder Kartennummer.');
 if(typeof name!=='string'||!name.trim()||name.trim().length>90)throw Error('Kartenname muss 1–90 Zeichen enthalten.');
 if(!raritySet.has(rarity))throw Error('Ungültige Seltenheit.');
 if(typeof description!=='string'||description.length>600)throw Error('Die Beschreibung darf höchstens 600 Zeichen enthalten.');
 if(!details||typeof details!=='object'||Array.isArray(details))throw Error('Ungültige Kartendetails.');
 const cleanDetails={};for(const field of CATEGORY_FIELDS[categoryId]){const value=details[field.key];if(value===undefined)continue;
  if(typeof value!=='string'||value.length>120)throw Error('Detailfeld ist zu lang oder ungültig.');cleanDetails[field.key]=value.trim();}
 if(imageData!==null&&(typeof imageData!=='string'||imageData.length>1150000||!/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(imageData)))throw Error('Kartenbild ist nicht unterstützt oder zu groß.');
 const seriesId=`series:${categoryId}`,category=REWARD_CATEGORIES.find(c=>c.id===categoryId);
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['bw-series','bw-catalog'],'readwrite');
  const seriesStore=tx.objectStore('bw-series'),cardStore=tx.objectStore('bw-catalog');
  const existing=cardStore.getAll();let finalCard=null,problem=null;
  tx.oncomplete=()=>resolve(finalCard);
  tx.onerror=()=>{};
  tx.onabort=()=>reject(problem||tx.error||Error('Karte konnte nicht gespeichert werden.'));
  existing.onsuccess=()=>{
   try{
    const matches=(existing.result||[]).filter(card=>card?.categoryId===categoryId&&card?.number===slot.number);
    if(matches.length>1)throw Error('Dieser Kartenplatz ist mehrfach belegt. Bitte den Datenbestand prüfen.');
    const prior=matches[0];
    const card={...(prior||{}),id:prior?.id||`catalog:${categoryId}:${String(slot.number).padStart(3,'0')}`,schemaVersion:REWARD_SCHEMA_VERSION,
     seriesId:prior?.seriesId||seriesId,categoryId,number:slot.number,name:name.trim(),rarity,description:description.trim(),
     templateId:prior?.templateId??null,details:{...(prior?.details||{}),...cleanDetails},imageData:imageData===null?(prior?.imageData||null):imageData,updatedAt:new Date().toISOString()};
    validateRewardEntity('bw-catalog',card);
    const s={id:seriesId,schemaVersion:REWARD_SCHEMA_VERSION,name:category.label,categoryId,plannedCards:category.planned};
    validateRewardEntity('bw-series',s);
    // Idempotent series definition, preserve existing user-edited series metadata.
    const seriesReq=seriesStore.get(seriesId);
    seriesReq.onsuccess=()=>{if(!seriesReq.result)seriesStore.add(s,seriesId);cardStore.put(card,card.id);};
    finalCard=card;
   }catch(e){problem=e;tx.abort();}
  };
 });
}

export async function prepareAlbumImage(file){
 if(!(file instanceof Blob))throw Error('Bitte zuerst eine Bilddatei auswählen.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Nur PNG, JPEG und WebP sind erlaubt.');
 if(file.size>8*1024*1024)throw Error('Das Bild ist größer als 8 MB. Bitte verkleinern.');
 // Modern Android Chrome supports createImageBitmap. Canvas re-encodes to strip metadata.
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width<1||bitmap.height<1||bitmap.width*bitmap.height>40000000)throw Error('Bildauflösung nicht unterstützt.');
  const scale=Math.min(1,1024/bitmap.width,1400/bitmap.height);
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  let encoded=canvas.toDataURL('image/webp',.77);
  if(!encoded.startsWith('data:image/webp;'))encoded=canvas.toDataURL('image/jpeg',.75);
  if(encoded.length>1150000)throw Error('Das optimierte Bild ist noch zu groß. Bitte ein kleineres Motiv verwenden.');
  return encoded;
 }finally{bitmap.close?.();}
}
