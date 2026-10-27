/** L10–L11 – private offline photo archive. Binary payloads live in individual IndexedDB keys,
 * metadata and small thumbnails in a separate key. No uploads and no network requests. */
import {getModuleValue,mutateModuleValuesWithDeletes} from '../assets/database.js';
export const PHOTO_INDEX_KEY='photos.index.v1';
export const PHOTO_PREFIX='photos.binary.';
export const PHOTO_CATEGORIES=Object.freeze({allgemein:'Allgemein',artikel:'Artikel',lagerort:'Lagerort',verpackung:'Verpackung',zustand:'Zustand',sonstiges:'Sonstiges'});
export const PHOTO_STAGES=Object.freeze({bestand:'Bestandsaufnahme',vorher:'Vorher',nachher:'Nachher',verlauf:'Zwischenstand'});
export const MAX_SOURCE_BYTES=25*1024*1024;
export const MAX_EDGE=2048;
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp','image/avif']);
const clean=(v,max)=>String(v??'').trim().slice(0,max);
const randomId=()=>globalThis.crypto?.randomUUID?.()||`foto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const photoKey=id=>`${PHOTO_PREFIX}${id}`;
// History uses the actual optional capture date, falling back to the *import date* of legacy L10 photos.
// Import dates must never be presented as a verified capture date.
export const photoDate=p=>p.takenOn||String(p.createdAt||'').slice(0,10);
export const ownerPhotos=(index,type,id)=>(Array.isArray(index)?index:[]).filter(p=>p.ownerType===type&&p.ownerId===id).sort((a,b)=>Number(Boolean(b.cover))-Number(Boolean(a.cover))||String(b.createdAt).localeCompare(String(a.createdAt)));
export function photoHistory(index,type,id,{category='',stage='',search='',sort='newest'}={}){
 const needle=String(search||'').trim().toLocaleLowerCase('de');
 const filtered=ownerPhotos(index,type,id).filter(p=>
  (!category||p.category===category)&&(!stage||(p.stage||'bestand')===stage)&&
  (!needle||[p.description,p.series,PHOTO_CATEGORIES[p.category],PHOTO_STAGES[p.stage||'bestand']].some(x=>String(x||'').toLocaleLowerCase('de').includes(needle))));
 return filtered.sort((a,b)=>((sort==='oldest'?1:-1)*(photoDate(a).localeCompare(photoDate(b))||String(a.createdAt).localeCompare(String(b.createdAt))||String(a.id).localeCompare(String(b.id)))));
}
export function comparisonPhotos(index,type,id,beforeId,afterId){
 if(!beforeId||!afterId||beforeId===afterId)throw new Error('Bitte zwei unterschiedliche Fotos auswählen.');
 const group=ownerPhotos(index,type,id),a=group.find(p=>p.id===beforeId),b=group.find(p=>p.id===afterId);
 if(!a||!b)throw new Error('Vergleich nur innerhalb desselben Artikels oder Lagerortes möglich.');
 return [a,b];
}
export function suggestedComparison(index,type,id){
 const sorted=photoHistory(index,type,id,{sort:'newest'});
 const after=sorted.find(p=>p.stage==='nachher');
 const before=after&&sorted.find(p=>p.stage==='vorher'&&(p.series||'')===(after.series||''));
 return before&&after?[before.id,after.id]:['',''];
}
function normalizeTakenOn(input){
 const str=clean(input,10);if(!str)return '';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(str))throw new Error('Aufnahmedatum muss ein gültiges Datum sein.');
 const d=new Date(`${str}T12:00:00Z`);
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==str)throw new Error('Aufnahmedatum ist ungültig.');
 return str;
}
export function photoDetails(values){
 return {category:PHOTO_CATEGORIES[values.category]?values.category:'allgemein',description:clean(values.description,140),
  stage:PHOTO_STAGES[values.stage]?values.stage:'bestand',series:clean(values.series,64),takenOn:normalizeTakenOn(values.takenOn)};
}
export function sanitizePhotoInfo(values){
 const ownerType=values.ownerType,ownerId=clean(values.ownerId,100);
 if(!['item','location'].includes(ownerType)||!ownerId)throw new Error('Bitte einen gültigen Foto-Lagerort oder Artikel auswählen.');
 return {ownerType,ownerId,...photoDetails(values)};
}
export function coverPhoto(index,type,id){return ownerPhotos(index,type,id).find(p=>p.cover)||ownerPhotos(index,type,id)[0]||null;}
export function insertPhoto(index,info,{id=randomId(),now=new Date().toISOString()}={}){
 const safe=sanitizePhotoInfo(info);
 if(!id||!Array.isArray(index)||index.some(p=>p.id===id))throw new Error('Foto-ID ungültig oder bereits vorhanden.');
 const prior=ownerPhotos(index,safe.ownerType,safe.ownerId);
 const next={...safe,id,createdAt:now,cover:prior.length===0,
  thumbnail:info.thumbnail,mime:info.mime,width:info.width,height:info.height,bytes:info.bytes,sourceBytes:info.sourceBytes,optimized:Boolean(info.optimized)};
 if(!next.thumbnail||!ALLOWED_TYPES.has(next.mime)||!Number.isFinite(next.bytes)||next.bytes<=0)throw new Error('Foto konnte nicht vorbereitet werden.');
 return [...index,next];
}
export function markCover(index,id){
 const target=index.find(p=>p.id===id);if(!target)throw new Error('Foto nicht mehr vorhanden.');
 return index.map(p=>p.ownerType===target.ownerType&&p.ownerId===target.ownerId?{...p,cover:p.id===id}:p);
}
export function updatePhoto(index,id,values){
 const target=index.find(p=>p.id===id);if(!target)throw new Error('Foto nicht mehr vorhanden.');
 // Preserve pre-L11 values when older callers only pass category and description.
 const detail=photoDetails({...target,...values});
 return index.map(p=>p.id===id?{...p,...detail}:p);
}
export function dropPhoto(index,id){
 const target=index.find(p=>p.id===id);if(!target)throw new Error('Foto nicht mehr vorhanden.');
 const next=index.filter(p=>p.id!==id);
 if(target.cover){const newCover=ownerPhotos(next,target.ownerType,target.ownerId)[0];if(newCover)return markCover(next,newCover.id);}
 return next;
}
function canvasBlob(canvas,mime,quality){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Bildkodierung fehlgeschlagen.')),mime,quality));}
async function bitmapFrom(file){
 if(typeof createImageBitmap==='function'){
  try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch {try{return await createImageBitmap(file);}catch{}}
 }
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.decoding='async';await new Promise((res,rej)=>{image.onload=res;image.onerror=()=>rej(new Error('Bildformat wird von diesem Gerät nicht unterstützt.'));image.src=url;});
  return {width:image.naturalWidth,height:image.naturalHeight,source:image,close(){}};
 }finally{URL.revokeObjectURL(url);}
}
/** Original mode is bit-for-bit unchanged; optimized mode is explicit and never silent. */
export async function preparePhoto(file,{keepOriginal=false}={}){
 if(!file||!ALLOWED_TYPES.has(file.type))throw new Error('Nur JPG, PNG, WebP oder AVIF sind erlaubt.');
 if(file.size===0||file.size>MAX_SOURCE_BYTES)throw new Error('Ein Foto muss zwischen 1 Byte und 25 MB groß sein.');
 const bitmap=await bitmapFrom(file);
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>80_000_000)throw new Error('Bildabmessungen sind zu groß.');
  const edge=Math.min(1,MAX_EDGE/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*edge));const height=Math.max(1,Math.round(bitmap.height*edge));
  const thumbEdge=Math.min(1,280/Math.max(bitmap.width,bitmap.height));
  const tw=Math.max(1,Math.round(bitmap.width*thumbEdge)),th=Math.max(1,Math.round(bitmap.height*thumbEdge));
  const thumb=document.createElement('canvas');thumb.width=tw;thumb.height=th;
  thumb.getContext('2d').drawImage(bitmap.source||bitmap,0,0,tw,th);
  const thumbnail=thumb.toDataURL('image/webp',.75);
  let blob=file,optimized=false;
  if(!keepOriginal){
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   canvas.getContext('2d').drawImage(bitmap.source||bitmap,0,0,width,height);
   const candidate=await canvasBlob(canvas,'image/webp',.90);
   // If compression cannot offer smaller storage, keep the exact original.
   if(candidate.type==='image/webp' && candidate.size<file.size){blob=candidate;optimized=true;}
   canvas.width=0;canvas.height=0;
  }
  thumb.width=0;thumb.height=0;
  return {blob,thumbnail,mime:blob.type,width:optimized?width:bitmap.width,height:optimized?height:bitmap.height,bytes:blob.size,sourceBytes:file.size,optimized};
 }finally{bitmap.close?.();}
}
export async function readPhotoIndex(){const result=await getModuleValue('lagerhaus',PHOTO_INDEX_KEY);return Array.isArray(result)?result:[];}
export async function readPhotoBlob(id){const blob=await getModuleValue('lagerhaus',photoKey(id));if(!(blob instanceof Blob))throw new Error('Originalfoto fehlt in der lokalen Datenbank.');return blob;}
/** Every mutation verifies the current owner in the SAME transaction as saving. */
export async function savePhoto(info,payload,{id=randomId()}={}){
 const safe=sanitizePhotoInfo(info);const binary=payload?.blob;
 if(!(binary instanceof Blob))throw new Error('Kein gültiges Foto.');
 await mutateModuleValuesWithDeletes('lagerhaus',[PHOTO_INDEX_KEY,'items.v1','rooms.v1'],values=>{
  const items=Array.isArray(values['items.v1'])?values['items.v1']:[];
  const rooms=Array.isArray(values['rooms.v1'])?values['rooms.v1']:[];
  const ids=safe.ownerType==='item'?items.map(x=>x.id):rooms.flatMap(r=>[r.id,...(r.furniture||[]).flatMap(f=>[f.id,...(f.compartments||[]).map(c=>c.id)])]);
  if(!ids.includes(safe.ownerId))throw new Error('Artikel oder Lagerort wurde inzwischen entfernt.');
  const index=Array.isArray(values[PHOTO_INDEX_KEY])?values[PHOTO_INDEX_KEY]:[];
  const added=insertPhoto(index,{...safe,...payload},{id});
  return {write:[[PHOTO_INDEX_KEY,added],[photoKey(id),binary]]};
 });
 return id;
}
export async function changePhoto(id,values,{cover=false}={}){
 await mutateModuleValuesWithDeletes('lagerhaus',[PHOTO_INDEX_KEY],old=>{
  const index=Array.isArray(old[PHOTO_INDEX_KEY])?old[PHOTO_INDEX_KEY]:[];
  const updated=updatePhoto(index,id,values);
  return {write:[[PHOTO_INDEX_KEY,cover?markCover(updated,id):updated]]};
 });
}
export async function removePhoto(id){
 await mutateModuleValuesWithDeletes('lagerhaus',[PHOTO_INDEX_KEY],old=>{
  const index=Array.isArray(old[PHOTO_INDEX_KEY])?old[PHOTO_INDEX_KEY]:[];
  return {write:[[PHOTO_INDEX_KEY,dropPhoto(index,id)]],remove:[photoKey(id)]};
 });
}
