/** L14 – deterministic, read-only navigator. Location links never change stock. */
import {stockPositions} from './lagerhaus-stock.js';
import {searchKey} from './lagerhaus-categories.js';

const lc=searchKey;
const safeId=id=>encodeURIComponent(String(id));
export function findLocation(locationId,rooms=[],areas=[]){
 const id=String(locationId??'');
 if(!id)return {id:'',kind:'none',label:'Ohne Lagerort',path:'Ohne Lagerort',roomId:'',furnitureId:'',compartmentId:'',valid:true};
 for(const room of rooms){
  const area=areas.find(a=>a.id===room.areaId);
  const root=[area?.name||'Lagerbereich',room.name];
  if(room.id===id)return {id,kind:'room',roomId:room.id,furnitureId:'',compartmentId:'',valid:true,label:room.name,path:root.join(' / '),code:room.code||''};
  for(const spot of room.floorObjects||[]){if(spot.kind==='zone'&&spot.id===id)return {id,kind:'floor',roomId:room.id,furnitureId:'',compartmentId:'',valid:true,label:spot.name,path:[...root,'Boden: '+spot.name].join(' / '),code:spot.code||''};}
  for(const furniture of room.furniture||[]){
   const shelf=[...root,furniture.name];
   if(furniture.id===id)return {id,kind:'furniture',roomId:room.id,furnitureId:furniture.id,compartmentId:'',valid:true,label:furniture.name,path:shelf.join(' / '),code:furniture.code||''};
   for(const compartment of furniture.compartments||[]){
    if(compartment.id===id)return {id,kind:'compartment',roomId:room.id,furnitureId:furniture.id,compartmentId:id,valid:true,label:compartment.name,path:[...shelf,compartment.name].join(' / '),code:compartment.code||''};
   }
  }
 }
 return {id,kind:'missing',roomId:'',furnitureId:'',compartmentId:'',valid:false,label:'Lagerort nicht vorhanden',path:'Lagerort nicht vorhanden',code:''};
}
export function navigationHref(locationId,rooms=[],areas=[]){
 const p=findLocation(locationId,rooms,areas);
 if(!p.valid||p.kind==='none')return '';
 const room=`#/lagerhaus/room/${safeId(p.roomId)}`;
 return p.furnitureId?`${room}/focus/${safeId(p.furnitureId)}${p.compartmentId?`/fach/${safeId(p.compartmentId)}`:''}`:room;
}
export function itemLocations(items=[],rooms=[],areas=[]){
 const result=[];
 for(const item of items){
  // Use the canonical stock ledger: do not count tracked packages/devices a second time.
  for(const position of stockPositions(item)){
   const location=findLocation(position.locationId,rooms,areas);
   result.push({itemId:item.id,itemCode:item.code||'',itemName:item.name||'',itemType:item.type||'',category:item.category||'',tags:item.tags||[],brand:item.brand||'',quantity:position.quantity,unit:item.unit||'stk',locationId:position.locationId,location,href:navigationHref(position.locationId,rooms,areas)});
  }
 }
 return result;
}
export function filterLocations(rows,search='',roomId=''){
 const q=lc(search.trim());
 return rows.filter(row=>(!roomId||row.location.roomId===roomId) && (!q||lc([row.itemCode,row.itemName,row.itemType,row.category,row.brand,...row.tags,row.location.path,row.location.code].join(' ')).includes(q)));
}
export function roomTree(rooms=[],areas=[],items=[]){
 const rows=itemLocations(items,rooms,areas);
 return rooms.map(room=>({id:room.id,name:room.name,code:room.code||'',areaName:areas.find(a=>a.id===room.areaId)?.name||'Lagerbereich',href:navigationHref(room.id,rooms,areas),count:rows.filter(r=>r.location.roomId===room.id).length,furniture:(room.furniture||[]).map(f=>({id:f.id,name:f.name,code:f.code||'',href:navigationHref(f.id,rooms,areas),count:rows.filter(r=>r.location.furnitureId===f.id).length,compartments:(f.compartments||[]).map(c=>({id:c.id,name:c.name,code:c.code||'',href:navigationHref(c.id,rooms,areas),count:rows.filter(r=>r.location.compartmentId===c.id).length}))}))}));
}