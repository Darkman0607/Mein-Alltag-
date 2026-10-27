/** L05/L06 – article records, templates and stable location references. */
import {normalizeProperties} from './lagerhaus-templates.js';
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
 const locationId=clean(values.locationId,100);
 if(!resolveItemLocation(locationId,rooms,areas).valid)throw new Error('Ausgewählter Lagerort existiert nicht mehr.');
 return {name,category,type,condition,unit,quantity:Math.round(amount*1000)/1000,locationId,
   brand:clean(values.brand,80),articleNumber:clean(values.articleNumber,80),note:clean(values.note,2000),
   properties:normalizeProperties(type,values.properties)};
}
export function nextArticleCode(items,sequence){
 const previous=Math.max(Number.isSafeInteger(sequence)&&sequence>=0?sequence:0,...items.map(i=>Number(/^A-(\d+)$/.exec(i.code)?.[1]||0)));
 if(previous>=9_999_999)throw new Error('Artikelnummern-Limit erreicht.');
 const next=previous+1;
 return {sequence:next,code:`A-${String(next).padStart(4,'0')}`};
}
export function upsertItem(items,values,{id=null,rooms=[],areas=[],now=new Date().toISOString(),makeId=()=>crypto.randomUUID(),sequence=0}={}){
 const data=validateItem(values,rooms,areas);
 const result=items.map(i=>({...i}));
 if(id){
  const idx=result.findIndex(x=>x.id===id);if(idx<0)throw new Error('Artikel existiert nicht mehr.');
  result[idx]={...result[idx],...data,updatedAt:now};
  return {items:result,sequence};
 }
 const identity=String(makeId());
 if(!identity||result.some(x=>x.id===identity))throw new Error('Ungültige oder doppelte Artikel-ID.');
 const next=nextArticleCode(result,sequence);
 result.push({id:identity,code:next.code,...data,createdAt:now,updatedAt:now});
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
 if(kind==='room')return [object.id,...(object.furniture||[]).flatMap(f=>locationsInNode('furniture',f))];
 return [];
}
export function assertNodeHasNoItems(items,kind,object){
 const ids=new Set(locationsInNode(kind,object));
 if(items.some(item=>ids.has(item.locationId)))throw new Error('Dort liegen noch Artikel. Bitte Artikel zuerst einem anderen Lagerort zuordnen.');
}
export function assertLocationsRetained(items,rooms){
 const present=new Set(rooms.flatMap(r=>locationsInNode('room',r)));
 if(items.some(item=>item.locationId&&!present.has(item.locationId)))throw new Error('Änderung würde einen Artikel-Lagerort löschen. Artikel zuerst verschieben.');
}
