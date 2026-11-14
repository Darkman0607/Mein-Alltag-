/** LUX06: Read-only Lagerhaus and backup preflight diagnostics.
 * Never alters module values or exports personal data over the network.
 */
import {locationChoices} from '../modules/lagerhaus-items.js';
import {stockPositions,stockTotal,stockSettings,milli,requireUnitQuantity} from '../modules/lagerhaus-stock.js';
import {validateSnapshot} from './backup.js';

const arr=value=>Array.isArray(value)?value:[];
const label=value=>String(value??'').slice(0,100);
export function auditInventory({items=[],rooms=[],areas=[],movements=[]}={}){
 const findings=[],found=new Set(),knownCodes=new Set();
 const issue=(code,message)=>{if(findings.length<100)findings.push({code,message});};
 const knownLocations=new Set(locationChoices(arr(rooms),arr(areas)).map(x=>x.id));
 const areaIds=new Set(arr(areas).map(x=>x.id));
 const roomIds=new Set();
 for(const room of arr(rooms)){
  if(roomIds.has(room.id))issue('room-duplicate',`Lagerraum mehrfach vorhanden: ${label(room.name)}`);
  roomIds.add(room.id);
  if(room.areaId&&!areaIds.has(room.areaId))issue('room-area',`Bereich fehlt für Lagerraum ${label(room.name)}`);
 }
 for(const item of arr(items)){
  const name=label(item?.name)||'Artikel ohne Namen';
  if(!item||typeof item!=='object'){issue('item-invalid','Ungültiger Artikel-Eintrag');continue;}
  if(!item.id||found.has(item.id))issue('item-id',`Artikel-ID fehlt oder doppelt: ${name}`);
  else found.add(item.id);
  if(item.code){if(knownCodes.has(item.code))issue('item-code',`Artikelnummer mehrfach vergeben: ${label(item.code)}`);knownCodes.add(item.code);}
  try{
   const locations=stockPositions(item),total=stockTotal(item);
   const legacy=Number(item.quantity??0);
   if(!Number.isFinite(legacy)||Math.abs(total-legacy)>0.0001)issue('item-total',`Gesamtbestand weicht von den Lagerorten ab: ${name}`);
   for(const pos of locations){
    requireUnitQuantity(item,milli(pos.quantity,{allowZero:true}),'Bestand');
    if(!knownLocations.has(pos.locationId))issue('item-location',`Unbekannter Lagerort bei: ${name}`);
   }
   const settings=stockSettings(item);
   requireUnitQuantity(item,milli(settings.minimumStock,{allowZero:true}),'Mindestbestand');
   requireUnitQuantity(item,milli(settings.packSize),'Packungsgröße');
   for(const record of [...arr(item.containers),...arr(item.devices)]){
    if(record.locationId&&!knownLocations.has(record.locationId))issue('item-container',`Gebinde oder Gerät ohne Lagerort: ${name}`);
   }
  }catch(err){issue('item-stock',`${name}: ${err.message}`);}
 }
 const movementsList=arr(movements);
 return {ok:findings.length===0,items:arr(items).length,rooms:arr(rooms).length,areas:arr(areas).length,
  movements:movementsList.length,findings,limited:findings.length>=100};
}
export function inspectBackupSnapshot(snapshot){
 const info=validateSnapshot(snapshot),counts=Object.fromEntries(info.sourceStores.map(key=>[key,info.decoded[key].length]));
 const warehouse=new Map(info.decoded.lagerhaus||[]);
 const audit=auditInventory({items:warehouse.get('items.v1'),rooms:warehouse.get('rooms.v1'),areas:warehouse.get('areas.v1'),movements:warehouse.get('items.movements.v1')});
 return {...info,counts,audit};
}
