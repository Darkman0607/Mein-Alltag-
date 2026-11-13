/** LUX05: read-only movement history and local restock projections.
 * Historical events are never edited or replayed. No network and no stock writes. */
import {stockAlert,stockSettings} from './lagerhaus-stock.js';
import {quantityLabel} from './lagerhaus-consumption.js';
export const MOVEMENT_TITLES=Object.freeze({receive:'Eingelagert',issue:'Entnommen',transfer:'Umgelagert'});
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const safeDate=value=>Number.isFinite(Date.parse(value||''))?new Date(value).toLocaleString('de-AT',{dateStyle:'short',timeStyle:'short'}):'Datum unbekannt';
export function recentStockActivity(events=[],items=[],locations=[],limit=15){
 const itemsById=new Map(items.map(i=>[i.id,i])),locById=new Map(locations.map(x=>[x.id,x.label]));
 return [...(Array.isArray(events)?events:[])].reverse().slice(0,Math.max(0,Math.min(100,limit))).map(e=>{
  const item=itemsById.get(e.itemId),from=locById.get(e.fromId)||'Ohne Lagerort',to=locById.get(e.toId)||'Ohne Lagerort';
  const kind=MOVEMENT_TITLES[e.type]||'Bestandsbuchung',name=item?.name||e.itemCode||'Gelöschter Artikel';
  const type=e.type==='receive'?'+':e.type==='issue'?'−':'↔';
  const context=e.context==='putzmanager'?`Putzmanager${e.roomName?' · '+e.roomName:''}`:'Lagerhaus';
  const place=e.type==='transfer'?`${from} → ${to}`:e.type==='issue'?from:to;
  return {id:e.id||'',name,code:e.itemCode||item?.code||'',type:e.type,kind,sign:type,context,place,date:safeDate(e.createdAt),quantity:quantityLabel(item||{unit:'stk',type:'sonstiges'},number(e.quantity)),balanceAfter:Number.isFinite(Number(e.balanceAfter))?quantityLabel(item||{unit:'stk',type:'sonstiges'},e.balanceAfter):'',isCleaning:e.context==='putzmanager'};
 });
}
export function restockWarnings(items=[]){
 return items.flatMap(item=>{
  // Warnings are opt-in: minimumStock=0 means the user does not track this item.
  const alert=stockAlert(item);if(!alert.low)return [];
  const pack=stockSettings(item).packSize;
  const deficit=Math.max(0,alert.minimumStock-alert.total);
  // Recommendation puts stock at least one replenishment unit above the threshold.
  const suggested=pack>1?Math.max(1,Math.ceil(deficit/pack))*pack:Math.max(deficit+1,1);
  return [{itemId:item.id,code:item.code||'',name:item.name,item,available:alert.total,minimum:alert.minimumStock,empty:alert.empty,packSize:pack,suggested,availableLabel:quantityLabel(item,alert.total),minimumLabel:quantityLabel(item,alert.minimumStock),suggestedLabel:quantityLabel(item,suggested)}];
 }).sort((a,b)=>Number(b.empty)-Number(a.empty)||a.name.localeCompare(b.name,'de'));
}
export function shoppingListText(rows=[]){
 if(!rows.length)return 'Keine Nachkäufe vorgemerkt.';
 return 'MEIN ALLTAG – EINKAUFSZETTEL\n'+rows.map(x=>`☐ ${x.name} – Vorschlag: ${x.suggestedLabel} (Bestand ${x.availableLabel}; Mindestbestand ${x.minimumLabel})`).join('\n');
}
