/** Lagerhaus L07: inventory positions in milliunits, atomic-safe pure booking rules. */
export const MOVEMENT_KEY='items.movements.v1';
export const STOCK_ACTIONS=Object.freeze({receive:'Einlagerung',issue:'Entnahme',transfer:'Umlagerung'});
const MAX=1_000_000;
export function milli(value,{allowZero=false,label='Menge'}={}){
 if(value===''||value===null||value===undefined||typeof value==='boolean')throw new Error(`${label}: Zahl erforderlich.`);
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||(!allowZero&&n===0)||n>MAX||Math.abs(n*1000-Math.round(n*1000))>1e-6)throw new Error(`${label}: ${allowZero?'0 bis':'mehr als 0 bis'} 1.000.000, höchstens 3 Nachkommastellen.`);
 return Math.round(n*1000);
}
export const unmilli=n=>n/1000;
/** Legacy items from L05/L06 retain their locationId and quantity until edited/booked. */
export function stockPositions(item){
 if(Array.isArray(item.stockLocations)){
  const seen=new Set();
  return item.stockLocations.map(pos=>{
   const locationId=String(pos.locationId??'');
   const units=milli(pos.quantity,{allowZero:true,label:'Bestand'});
   if(seen.has(locationId))throw new Error('Doppelter Standort im Artikelbestand.');
   seen.add(locationId);return {locationId,quantity:unmilli(units)};
  }).filter(p=>p.quantity>0);
 }
 const amount=milli(item.quantity??0,{allowZero:true,label:'Altbestand'});
 return amount?[{locationId:String(item.locationId??''),quantity:unmilli(amount)}]:[];
}
export function stockTotal(item){
 const amount=stockPositions(item).reduce((a,p)=>a+milli(p.quantity,{allowZero:true}),0);
 if(amount>MAX*1000)throw new Error('Gesamtbestand überschreitet die Obergrenze.');
 return unmilli(amount);
}
export function stockSettings(values){
 const minimumStock=unmilli(milli(values.minimumStock??0,{allowZero:true,label:'Mindestbestand'}));
 const packSize=unmilli(milli(values.packSize??1,{label:'Packungsgröße'}));
 return {minimumStock,packSize};
}
export function stockAlert(item){
 const limit=stockSettings(item).minimumStock;
 const total=stockTotal(item);
 return {total,minimumStock:limit,low:limit>0&&total<=limit,empty:total===0};
}
/** A transfer is conservation: sources shrink by exactly what destinations gain. */
export function bookStock(item,booking,validLocationIds,{now=new Date().toISOString(),makeId=()=>globalThis.crypto.randomUUID(),releaseRecordId=null}={}){
 const kind=String(booking.type||'');
 if(!Object.hasOwn(STOCK_ACTIONS,kind))throw new Error('Unbekannte Buchungsart.');
 const entered=milli(booking.quantity);
 const packUnits=milli(stockSettings(item).packSize);
 const units=booking.unitMode==='packs' ? entered*packUnits/1000 : entered;
 if(!Number.isSafeInteger(units)||units>MAX*1000)throw new Error('Packungsmenge ergibt mehr als drei Nachkommastellen oder überschreitet das Limit.');
 if(booking.unitMode&&booking.unitMode!=='units'&&booking.unitMode!=='packs')throw new Error('Ungültiger Mengenmodus.');
 const fromId=String(booking.fromId??'');
 const toId=String(booking.toId??'');
 const valid=id=>validLocationIds instanceof Set?validLocationIds.has(id):Array.isArray(validLocationIds)?validLocationIds.includes(id):false;
 if(kind!=='receive'&&!valid(fromId))throw new Error('Quelllagerort ist nicht mehr vorhanden.');
 if(kind!=='issue'&&!valid(toId))throw new Error('Ziellagerort ist nicht mehr vorhanden.');
 if(kind==='transfer'&&fromId===toId)throw new Error('Quelle und Ziel müssen unterschiedlich sein.');
 const positions=new Map(stockPositions(item).map(x=>[x.locationId,milli(x.quantity,{allowZero:true})]));
 if(kind!=='receive'){
  const containers=item.containers||[],devices=item.devices||[];
  const reserved=containers.filter(c=>c.locationId===fromId).reduce((n,c)=>n+milli(c.remaining,{allowZero:true}),0)+devices.filter(d=>d.locationId===fromId).length*1000;
  const own=releaseRecordId?[...containers,...devices].find(r=>r.id===releaseRecordId):null;
  if(releaseRecordId&&(!own||own.locationId!==fromId))throw new Error('Gebinde/Gerät wurde verschoben oder existiert nicht mehr.');
  const reservedOwn=own?(Object.hasOwn(own,'remaining')?milli(own.remaining,{allowZero:true}):1000):0;
  if(own&&units>reservedOwn)throw new Error('Buchung übersteigt das ausgewählte Gebinde/Gerät.');
  const free=(positions.get(fromId)||0)-reserved;
  if(free<0)throw new Error('Inkonsistente Bestände und Einzelkennungen.');
  if(units>free+reservedOwn)throw new Error('Nicht genügend frei verfügbarer Bestand: Gebinde oder Einzelgeräte sind separat reserviert.');
 }
 if(kind!=='receive'){
  const available=positions.get(fromId)||0;
  if(available<units)throw new Error(`Nicht genügend Bestand am gewählten Lagerort (verfügbar: ${unmilli(available)}).`);
  positions.set(fromId,available-units);
 }
 if(kind!=='issue'){
  const next=(positions.get(toId)||0)+units;
  if(next>MAX*1000)throw new Error('Maximaler Standortbestand überschritten.');
  positions.set(toId,next);
 }
 const stockLocations=[...positions.entries()].filter(([,qty])=>qty>0).map(([locationId,qty])=>({locationId,quantity:unmilli(qty)}));
 const quantity=unmilli(stockLocations.reduce((a,x)=>a+milli(x.quantity),0));
 if(quantity>MAX)throw new Error('Gesamtbestand überschreitet 1.000.000.');
 const result={...item,stockLocations,quantity,locationId:stockLocations[0]?.locationId||'',updatedAt:now};
 const event={id:makeId(),itemId:item.id,itemCode:item.code,type:kind,quantity:unmilli(units),enteredQuantity:unmilli(entered),unitMode:booking.unitMode||'units',fromId:kind==='receive'?null:fromId,toId:kind==='issue'?null:toId,createdAt:now,balanceAfter:quantity};
 return {item:result,event};
}
