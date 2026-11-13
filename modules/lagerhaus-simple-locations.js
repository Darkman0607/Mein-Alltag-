/** LUX03: Plain text storage places using the EXISTING areas.v1 / rooms.v1 schema.
 * Locations are normal stock position IDs; no fake 3D shelves and no inventory migration.
 */
import {normalizeSearch} from './lagerhaus-search.js';
export function addSimpleLocation(rooms,areas,{areaName,placeName},makeId,now=new Date().toISOString()){
 const area=String(areaName||'').trim().replace(/\s+/g,' '),place=String(placeName||'').trim().replace(/\s+/g,' ');
 if(!area||!place)throw new Error('Bereich und Lagerplatz müssen ausgefüllt sein.');
 if(area.length>55||place.length>55)throw new Error('Bezeichnungen dürfen höchstens 55 Zeichen haben.');
 let currentArea=areas.find(a=>normalizeSearch(a.name)===normalizeSearch(area));
 if(!currentArea){currentArea={id:makeId(),name:area,createdAt:now};areas.push(currentArea);}
 if(rooms.some(r=>r.areaId===currentArea.id&&normalizeSearch(r.name)===normalizeSearch(place)))throw new Error('Dieser Lagerplatz existiert in diesem Bereich bereits.');
 const room={id:makeId(),name:place,areaId:currentArea.id,locationMode:'simple',type:'sonstiges',preset:'ohne',dimensions:null,furniture:[],floorObjects:[],createdAt:now,updatedAt:now};
 if(room.id===currentArea.id||rooms.some(r=>r.id===room.id)||areas.some(a=>a.id===room.id))throw new Error('Ungültige Lagerplatz-ID. Bitte erneut versuchen.');
 rooms.push(room);
 return room;
}
