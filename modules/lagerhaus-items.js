/** L05–L07 – article records, templates and stable location references. */
import {normalizeProperties} from './lagerhaus-templates.js';
import {stockPositions,stockTotal,stockSettings} from './lagerhaus-stock.js';
import {cleanTags} from './lagerhaus-categories.js';
export const ITEM_KEY='items.v1';
export const ITEM_SEQ_KEY='items.sequence.v1';
export const ITEM_TYPES=Object.freeze({geraet:'Gerät',verbrauch:'Verbrauchsmaterial',einzel:'Einzelstück',sonstiges:'Sonstiges'});
export const ITEM_CONDITIONS=Object.freeze({neu:'Neu',gut:'Gut',gebraucht:'Gebraucht',defekt:'Defekt'});
export const ITEM_UNITS=Object.freeze({stk:'Stück',pack:'Packung',kg:'kg',g:'g',l:'Liter',ml:'ml',m:'Meter',set:'Set'});
const clean=(v,max)=>String(v??'').trim().slice(0,max);
export function locationChoices(rooms=[],areas=[]){
 const choices=[{id:'',label:'Ohne Lagerort',kind:'none'}];
 for(const r of rooms){
  const area=areas.find(a=>a.id===r.areaId);
  const path=[area?.name||'Lagerbereich',r.name];
  choices.push({id:r.id,kind:'room',label:path.join(' / ')});
  for(const spot of r.floorObjects||[]){if(spot.kind==='zone')choices.push({id:spot.id,kind:'floor',label:[...path,'Boden: '+spot.name].join(' / ')});}
  for(const f of r.furniture||[]){
   choices.push({id:f.id,kind:'furniture',label:[...path,f.name].join(' / ')});
   for(const c of f.compartments||[])choices.push({id:c.id,kind:'compartment',label:[...path,f.name,c.name].join(' / ')});
  }
 }
 return choices;
}
export function resolveItemLocation(locationId,rooms=[],areas=[]){
 const id=String(locationId||'');
 if(!id)return {valid:true,label:'Ohne Lagerort',kind:'none'};
 const target=locationChoices(rooms,areas).find(c=>c.id===id);
 return target ? {valid:true,...target}:{valid:false,label:'Lagerort nicht mehr vorhanden',kind:'missing',id};
}
export function validateItem(values,rooms,areas){
 const name=clean(values.name,100);
 if(!name)throw new Error('Bitte einen Artikelnamen eingeben.');
 const category=clean(values.category,55)||'Allgemein';
 const type=ITEM_TYPES[values.type]?values.type:'sonstiges';
 const condition=ITEM_CONDITIONS[values.condition]?values.condition:'gut';
 const unit=ITEM_UNITS[values.unit]?values.unit:'stk';
 const amount=Number(values.quantity);
 if(values.quantity===''||values.quantity===null||!Number.isFinite(amount)||amount<0||amount>1_000_000)throw new Error('Menge muss zwischen 0 und 1.000.000 liegen.');
 if(Math.abs(amount-Math.round(amount*1000)/1000)>1e-7)throw new Error('Maximal drei Nachkommastellen erlaubt.');
 const {minimumStock,packSize}=stockSettings(values);
 const locationId=clean(values.locationId,100);
 if(!resolveItemLocation(locationId,rooms,areas).valid)throw new Error('Ausgewählter Lagerort existiert nicht mehr.');
 return {name,category,type,condition,unit,quantity:Math.round(amount*1000)/1000,locationId,minimumStock,packSize,
   pairCounting:['auto','yes','no'].includes(values.pairCounting)?values.pairCounting:'auto',
   brand:clean(values.brand,80),articleNumber:clean(values.articleNumber,80),note:clean(values.note,2000),
   properties:normalizeProperties(type,values.properties),
   categoryId:clean(values.categoryId,100),tags:cleanTags(values.tags),favorite:values.favorite===true||values.favorite==='on'};
}
export function nextArticleCode(items,sequence){
 const previous=Math.max(Number.isSafeInteger(sequence)&&sequence>=0?sequence:0,...items.map(i=>Number(/^A-(\d+)$/.exec(i.code)?.[1]||0)));
 if(previous>=9_999_999)throw new Error('Artikelnummern-Limit erreicht.');
 const next=previous+1;
 return {sequence:next,code:`A-${String(next).padStart(4,'0')}`};
}
export function upsertItem(items,values,{id=null,rooms=[],areas=[],now=new Date().toISOString(),makeId=()=>crypto.randomUUID(),sequence=0,categories=null}={}){
 const data=validateItem(values,rooms,areas);
 if(Array.isArray(categories)){
  if(data.categoryId){const cat=categories.find(c=>c.id===data.categoryId);if(!cat)throw Error('Ausgewählte Kategorie existiert nicht mehr.');data.category=cat.name;}
  else data.category='Allgemein';
 }
 const result=items.map(i=>({...i}));
 if(id){
  const idx=result.findIndex(x=>x.id===id);if(idx<0)throw new Error('Artikel existiert nicht mehr.');
  const prior=result[idx];
  if(((prior.containers||[]).length||(prior.devices||[]).length)&&prior.type!==data.type)throw new Error('Artikeltyp mit erfassten Gebinden/Geräten nicht ändern.');
  if(stockTotal(prior)>0&&prior.unit!==data.unit)throw new Error('Bei vorhandenem Bestand kann die Einheit nicht geändert werden.');
  // Article metadata edits never change multi-location stock. Use bookings instead.
  if(Array.isArray(prior.stockLocations)){
   const positions=stockPositions(prior);
   result[idx]={...prior,...data,stockLocations:positions,quantity:stockTotal(prior),locationId:positions[0]?.locationId||'',updatedAt:now};
  } else result[idx]={...prior,...data,updatedAt:now};
  return {items:result,sequence};
 }
 const identity=String(makeId());
 if(!identity||result.some(x=>x.id===identity))throw new Error('Ungültige oder doppelte Artikel-ID.');
 const next=nextArticleCode(result,sequence);
 result.push({id:identity,code:next.code,...data,stockLocations:data.quantity>0?[{locationId:data.locationId,quantity:data.quantity}]:[],createdAt:now,updatedAt:now});
 return {items:result,sequence:next.sequence};
}
export function deleteItem(items,id){
 if(!items.some(i=>i.id===id))throw new Error('Artikel nicht mehr vorhanden.');
 return items.filter(i=>i.id!==id);
}
/** Prevent emptying a hierarchy node while a dependent article is stored inside it. */
export function locationsInNode(kind,object){
 if(kind==='compartment')return [object.id];
 if(kind==='furniture')return [object.id,...(object.compartments||[]).map(c=>c.id)];
 if(kind==='floor')return [object.id];
 if(kind==='room')return [object.id,...(object.furniture||[]).flatMap(f=>locationsInNode('furniture',f)),...(object.floorObjects||[]).filter(p=>p.kind==='zone').map(p=>p.id)];
 return [];
}
export function assertNodeHasNoItems(items,kind,object){
 const ids=new Set(locationsInNode(kind,object));
 if(items.some(item=>stockPositions(item).some(pos=>ids.has(pos.locationId))||[...(item.containers||[]),...(item.devices||[])].some(r=>ids.has(r.locationId))))throw new Error('Dort liegen noch Artikel. Bitte Artikel zuerst einem anderen Lagerort zuordnen.');
}
export function assertLocationsRetained(items,rooms){
 const present=new Set(rooms.flatMap(r=>locationsInNode('room',r)));
 if(items.some(item=>stockPositions(item).some(pos=>pos.locationId&&!present.has(pos.locationId))||[...(item.containers||[]),...(item.devices||[])].some(r=>r.locationId&&!present.has(r.locationId))))throw new Error('Änderung würde einen Artikel-Lagerort löschen. Artikel zuerst verschieben.');
}