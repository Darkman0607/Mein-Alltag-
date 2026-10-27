/** L09 – readable compartment inventory, shared by 3D markers and the text list. */
import {stockPositions,bookStock} from './lagerhaus-stock.js';
import {ITEM_KEY,locationChoices} from './lagerhaus-items.js';
export {ITEM_KEY};

export function fachCards(rooms=[],items=[],roomId=''){
 const cards=[];
 for(const room of rooms){
  if(roomId&&room.id!==roomId)continue;
  for(const furniture of room.furniture||[])for(const compartment of furniture.compartments||[]){
   const lines=[];
   for(const item of items){
    const pos=stockPositions(item).find(p=>p.locationId===compartment.id);
    const containers=(item.containers||[]).filter(c=>c.locationId===compartment.id);
    const devices=(item.devices||[]).filter(d=>d.locationId===compartment.id);
    if(pos?.quantity||containers.length||devices.length)lines.push({itemId:item.id,code:item.code,name:item.name,quantity:pos?.quantity||0,unit:item.unit,containers:containers.length,devices:devices.length});
   }
   cards.push({id:compartment.id,code:compartment.code,name:compartment.name,kind:compartment.kind,roomId:room.id,roomName:room.name,furnitureId:furniture.id,furnitureCode:furniture.code,furnitureName:furniture.name,articles:lines});
  }
 }
 return cards;
}
export function matchFach(cards,query=''){
 const q=String(query||'').trim().toLocaleLowerCase('de-AT');
 if(!q)return cards;
 return cards.filter(c=>[c.code,c.name,c.kind,c.roomName,c.furnitureName,c.furnitureCode,...c.articles.flatMap(a=>[a.name,a.code])].join(' ').toLocaleLowerCase('de-AT').includes(q));
}
/** Same stock ledger and reserved-quantity checks as "Meine Artikel". */
export function fachBooking(items,rooms,areas,{fachId,itemId,operation,quantity,targetId},{now=new Date().toISOString(),makeId=()=>globalThis.crypto.randomUUID()}={}){
 const all=fachCards(rooms,items),fach=all.find(c=>c.id===fachId);
 if(!fach)throw new Error('Das ausgewählte Fach existiert nicht mehr.');
 if(!['receive','issue','transfer'].includes(operation))throw new Error('Ungültige Buchungsart.');
 const at=items.findIndex(i=>i.id===itemId);
 if(at<0)throw new Error('Artikel ist nicht mehr vorhanden.');
 if(operation==='transfer'&&(!all.some(c=>c.id===targetId)||targetId===fachId))throw new Error('Bitte ein anderes gültiges Zielfach auswählen.');
 const booking={type:operation,quantity,unitMode:'units',fromId:operation==='receive'?'':fachId,toId:operation==='transfer'?targetId:operation==='receive'?fachId:''};
 const valid=new Set(locationChoices(rooms,areas).map(c=>c.id));
 const result=bookStock(items[at],booking,valid,{now,makeId});
 const next=items.slice();next[at]=result.item;
 return {items:next,event:result.event};
}
