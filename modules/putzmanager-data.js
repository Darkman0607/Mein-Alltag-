/** W01 | Wohnungsräume. Stored only in the existing putzmanager IndexedDB object store.
 * Keep stable IDs so future cleaning tasks and photo-based sketch layouts can reference them. */
import {getModuleValue,mutateModuleValues,mutateModuleValuesWithDeletes} from '../assets/database.js';
export const ROOMS_KEY='wohnung.rooms.v1';
export const ROOM_TYPES=Object.freeze({bad:'Badezimmer',kueche:'Küche',wc:'WC',wohnen:'Wohnzimmer',schlafen:'Schlafzimmer',kind:'Kinderzimmer',flur:'Flur',abstell:'Abstellraum',arbeiten:'Arbeitszimmer',sonst:'Sonstiges'});
export const OBJECT_TYPES=Object.freeze({wc:'WC',waschbecken:'Waschbecken',dusche:'Dusche',wanne:'Badewanne',spiegel:'Spiegel',schrank:'Schrank',waschmaschine:'Waschmaschine',spuele:'Spüle',herd:'Herd',kuehlschrank:'Kühlschrank',arbeitsplatte:'Arbeitsplatte',tisch:'Tisch',sofa:'Sofa',bett:'Bett',regal:'Regal',sonst:'Anderes Objekt'});
const MAX_ROOMS=70,MAX_OBJECTS=70,MAX_PHOTOS=24;
const id=()=>globalThis.crypto?.randomUUID?.()||`pm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function safeText(v,max){return String(v??'').trim().slice(0,max);}
function length(v){if(v===''||v===null||v===undefined)return null;const n=Number(v);if(!Number.isFinite(n)||n<0.5||n>100)throw Error('Raummaße müssen zwischen 0,5 und 100 Metern liegen.');return Math.round(n*100)/100;}
function ensureList(value){return Array.isArray(value)?value.filter(v=>v&&typeof v.id==='string'&&typeof v.name==='string'):[];}
export const photoKey=id=>`wohnung.photo.${id}`;
export async function listRooms(){return ensureList(await getModuleValue('putzmanager',ROOMS_KEY));}
export function roomDraft(form){
 const name=safeText(form.name,60),type=form.type;
 if(!name)throw Error('Bitte einen Raumnamen eingeben.');
 if(!Object.hasOwn(ROOM_TYPES,type))throw Error('Ungültiger Raumtyp.');
 return {name,type,width:length(form.width),depth:length(form.depth),notes:safeText(form.notes,2500)};
}
export async function saveRoom(draft,roomId=null){
 const validated=roomDraft(draft),now=new Date().toISOString(),newRoomId=id();
 await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);
  const pos=rooms.findIndex(r=>r.id===roomId);
  if(roomId&&pos<0)throw Error('Raum wurde inzwischen gelöscht.');
  if(pos>=0)rooms[pos]={...rooms[pos],...validated,updatedAt:now};
  else{if(rooms.length>=MAX_ROOMS)throw Error('Maximal 70 Räume möglich.');rooms.push({id:newRoomId,...validated,createdAt:now,updatedAt:now,photos:[],objects:[],sketch:{kind:'schematic-2d',walls:[],doors:[],windows:[],status:'offen'}});}
  return [[ROOMS_KEY,rooms]];
 });
 return roomId||newRoomId;
}
export async function deleteRoom(roomId){
 await mutateModuleValuesWithDeletes('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const found=rooms.find(r=>r.id===roomId);
  if(!found)throw Error('Raum nicht gefunden.');
  return {write:[[ROOMS_KEY,rooms.filter(r=>r.id!==roomId)]],remove:(found.photos||[]).map(p=>photoKey(p.id))};
 });
}
export async function saveObject(roomId,{name,type,position}){
 const label=safeText(name,60);
 if(!label)throw Error('Objektname fehlt.');
 if(!Object.hasOwn(OBJECT_TYPES,type))throw Error('Ungültiger Objekttyp.');
 if(!/^[1-9]$/.test(String(position)))throw Error('Ungültige Position.');
 const x=(((Number(position)-1)%3)+.5)/3,y=(Math.floor((Number(position)-1)/3)+.5)/3;
 const oid=id();
 await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const room=rooms.find(r=>r.id===roomId);
  if(!room)throw Error('Raum nicht gefunden.');
  const objects=Array.isArray(room.objects)?room.objects:[];
  if(objects.length>=MAX_OBJECTS)throw Error('Maximal 70 Objekte je Raum.');
  room.objects=[...objects,{id:oid,name:label,type,x,y}];room.updatedAt=new Date().toISOString();
  return [[ROOMS_KEY,rooms]];
 });
 return oid;
}
export async function deleteObject(roomId,objectId){
 await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const room=rooms.find(r=>r.id===roomId);
  if(!room)throw Error('Raum nicht gefunden.');
  room.objects=(room.objects||[]).filter(o=>o.id!==objectId);room.updatedAt=new Date().toISOString();
  return [[ROOMS_KEY,rooms]];
 });
}
export async function addRoomPhoto(roomId,blob,originalName){
 if(!(blob instanceof Blob)||blob.size<100||blob.size>6*1024*1024||!/^image\/(jpeg|png|webp)$/.test(blob.type))throw Error('Nur gültige JPG-, PNG- oder WebP-Fotos bis 6 MB.');
 const pid=id();
 await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const room=rooms.find(r=>r.id===roomId);
  if(!room)throw Error('Raum nicht gefunden.');
  if((room.photos||[]).length>=MAX_PHOTOS)throw Error('Maximal 24 Fotos pro Raum.');
  room.photos=[...(room.photos||[]),{id:pid,name:safeText(originalName,120),createdAt:new Date().toISOString(),type:blob.type,size:blob.size}];
  room.updatedAt=new Date().toISOString();
  return [[ROOMS_KEY,rooms],[photoKey(pid),blob]];
 });
 return pid;
}
export async function deleteRoomPhoto(roomId,pid){
 await mutateModuleValuesWithDeletes('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const room=rooms.find(r=>r.id===roomId);
  if(!room||(room.photos||[]).every(p=>p.id!==pid))throw Error('Foto nicht gefunden.');
  room.photos=room.photos.filter(p=>p.id!==pid);room.updatedAt=new Date().toISOString();
  return {write:[[ROOMS_KEY,rooms]],remove:[photoKey(pid)]};
 });
}
export async function readRoomPhoto(pid){return getModuleValue('putzmanager',photoKey(pid));}

/** W01.1: Only serializable, already validated room geometry goes into this user's local IndexedDB. */
export async function savePrivate3DScene(roomId,scene){
 if(!scene||scene.format!=='mein-alltag-raum3d'||scene.schemaVersion!==1||!scene.room||!Array.isArray(scene.objects))throw Error('Ungültige 3D-Raumdatei.');
 await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const room=rooms.find(r=>r.id===roomId);
  if(!room)throw Error('Zielraum wurde gelöscht.');
  room.sketch3d=structuredClone(scene);room.width=scene.room.width;room.depth=scene.room.depth;
  room.updatedAt=new Date().toISOString();
  return [[ROOMS_KEY,rooms]];
 });
}
export async function removePrivate3DScene(roomId){
 await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const room=rooms.find(r=>r.id===roomId);
  if(!room)throw Error('Zielraum nicht vorhanden.');
  delete room.sketch3d;room.updatedAt=new Date().toISOString();
  return [[ROOMS_KEY,rooms]];
 });
}
