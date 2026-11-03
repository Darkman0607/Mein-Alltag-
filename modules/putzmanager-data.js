/** W01 | Wohnungsräume. Stored only in the existing putzmanager IndexedDB object store.
 * Keep stable IDs so future cleaning tasks and photo-based sketch layouts can reference them. */
import {getModuleValue,mutateModuleValues,mutateModuleValuesWithDeletes} from '../assets/database.js';
import {addFurniture,editFurniture,removeFurniture,validate3DScene,fallback3DScene} from './putzmanager-room3d.js';
export const ROOMS_KEY='wohnung.rooms.v1';
export const ROOM_TYPES=Object.freeze({bad:'Badezimmer',kueche:'Küche',wc:'WC',wohnen:'Wohnzimmer',schlafen:'Schlafzimmer',kind:'Kinderzimmer',flur:'Flur',abstell:'Abstellraum',arbeiten:'Arbeitszimmer',sonst:'Sonstiges'});
export const OBJECT_TYPES=Object.freeze({wc:'WC',waschbecken:'Waschbecken',dusche:'Dusche',wanne:'Badewanne',spiegel:'Spiegel',schrank:'Schrank',waschmaschine:'Waschmaschine',spuele:'Spüle',herd:'Herd',kuehlschrank:'Kühlschrank',arbeitsplatte:'Arbeitsplatte',tisch:'Tisch',sofa:'Sofa',bett:'Bett',regal:'Regal',unterschrank:'Küchen-Unterschrank',oberschrank:'Küchen-Oberschrank',geschirrspueler:'Geschirrspüler',backofen:'Backofen',stuhl:'Stuhl',heizkoerper:'Heizkörper',muelleimer:'Abfalleimer',dunstabzug:'Dunstabzug',sonst:'Anderes Objekt'});
const MAX_ROOMS=70,MAX_OBJECTS=60,MAX_PHOTOS=24;
const id=()=>globalThis.crypto?.randomUUID?.()||`pm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function safeText(v,max){return String(v??'').trim().slice(0,max);}
function length(v){if(v===''||v===null||v===undefined)return null;const n=Number(v);if(!Number.isFinite(n)||n<0.8||n>30)throw Error('Raummaße müssen zwischen 0,8 und 30 Metern liegen.');return Math.round(n*100)/100;}
function ensureList(value){return Array.isArray(value)?value.filter(v=>v&&typeof v.id==='string'&&typeof v.name==='string'):[];}
export const photoKey=id=>`wohnung.photo.${id}`;
/** Single object source: sketch3d.objects. The old room.objects array is only a one-time migration source.
 * Conversion is atomic in the same module store; names, types, and existing room photos are retained.
 * Only identical stable IDs are deduplicated; identical names may represent different objects.
 */
function mergeLegacyObjects(room, incoming=null){
 let scene=validate3DScene(incoming||room.sketch3d||fallback3DScene({...room,objects:[]}));
 const legacy=Array.isArray(room.objects)?room.objects:[];
 const existingIds=new Set(scene.objects.map(o=>o.id).filter(Boolean));
 for(const item of legacy){
  if(!item||!Object.hasOwn(OBJECT_TYPES,item.type)||!safeText(item.name,60))throw Error('Altes Raumobjekt hat ungültige Daten. Sicherung prüfen.');
  if(item.id&&existingIds.has(item.id))continue;
  if(scene.objects.length>=MAX_OBJECTS)throw Error(`Raum „${room.name}“ hat mehr als ${MAX_OBJECTS} unterschiedliche Möbel. Alte Daten bleiben unverändert.`);
  scene=addFurniture(scene,item.type);
  const n=scene.objects.length-1;
  const x=Number.isFinite(Number(item.x))?Math.max(0,Math.min(1,Number(item.x)))*scene.room.width:scene.objects[n].x;
  const z=Number.isFinite(Number(item.y))?Math.max(0,Math.min(1,Number(item.y)))*scene.room.depth:scene.objects[n].z;
  scene=editFurniture(scene,n,{name:item.name,x,z,...(/^[a-zA-Z0-9_-]{1,128}$/.test(item.id||'')?{id:item.id}:{})});
 }
 const ids=new Set();
 scene.objects=scene.objects.map(o=>{
  const item={...o};
  if(!item.id||ids.has(item.id))item.id=id();
  ids.add(item.id);return item;
 });
 return scene;
}
export async function listRooms(){
 let rooms=ensureList(await getModuleValue('putzmanager',ROOMS_KEY));
 // Keep the original database record untouched if any migration validation fails.
 if(rooms.some(r=>(r.objects||[]).length||r.sketch3d?.objects?.some(o=>!o.id))){
  await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
   const all=ensureList(values[ROOMS_KEY]);
   for(const r of all){
    if((r.objects||[]).length||r.sketch3d?.objects?.some(o=>!o.id)){
     r.sketch3d=mergeLegacyObjects(r);r.objects=[];r.updatedAt=new Date().toISOString();
    }
   }
   return [[ROOMS_KEY,all]];
  });
  rooms=ensureList(await getModuleValue('putzmanager',ROOMS_KEY));
 }
 return rooms;
}
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
 let createdId='';
 await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const room=rooms.find(r=>r.id===roomId);
  if(!room)throw Error('Raum nicht gefunden.');
  let scene=mergeLegacyObjects(room);
  if(scene.objects.length>=MAX_OBJECTS)throw Error('Maximal 60 Objekte je Raum.');
  scene=addFurniture(scene,type);
  const index=scene.objects.length-1;
  scene=editFurniture(scene,index,{name:label,x:scene.room.width*x,z:scene.room.depth*y});
  createdId=scene.objects[index].id;
  room.sketch3d=scene;room.objects=[];room.updatedAt=new Date().toISOString();
  return [[ROOMS_KEY,rooms]];
 });
 return createdId;
}
export async function deleteObject(roomId,objectId){
 await mutateModuleValues('putzmanager',[ROOMS_KEY],values=>{
  const rooms=ensureList(values[ROOMS_KEY]);const room=rooms.find(r=>r.id===roomId);
  if(!room)throw Error('Raum nicht gefunden.');
  let scene=mergeLegacyObjects(room);
  const index=scene.objects.findIndex(o=>o.id===objectId);
  if(index<0)throw Error('Objekt nicht gefunden. Bitte Raum erneut öffnen.');
  scene=removeFurniture(scene,index);
  room.sketch3d=scene;room.objects=[];room.updatedAt=new Date().toISOString();
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
  room.sketch3d=mergeLegacyObjects(room,scene);room.objects=[];room.width=scene.room.width;room.depth=scene.room.depth;
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
