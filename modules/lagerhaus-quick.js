/** LUX02 – single-source quick UX choices; the actual booking stays in bookStock(). */
import {pairEligible} from './lagerhaus-consumption.js';
export const QUICK_TEMPLATES=Object.freeze([
 {id:'gloves',title:'🧤 Einweghandschuhe',name:'Nitrilhandschuhe M',unit:'stk',type:'verbrauch',quantity:1,unitMode:'packs',packSize:100,useArea:'Badezimmer'},
 {id:'cleaner',title:'🧴 Reiniger',name:'Badreiniger',unit:'ml',type:'verbrauch',quantity:500,unitMode:'units',packSize:1,useArea:'Badezimmer'},
 {id:'cloth',title:'🧽 Putztücher',name:'Putztücher',unit:'stk',type:'verbrauch',quantity:5,unitMode:'units',packSize:1,useArea:'Küche'},
 {id:'bags',title:'🗑 Müllbeutel',name:'Müllbeutel',unit:'stk',type:'verbrauch',quantity:1,unitMode:'packs',packSize:20,useArea:'Allgemein'},
 {id:'screws',title:'🔩 Schrauben',name:'Schrauben M6 × 30',unit:'stk',type:'verbrauch',quantity:50,unitMode:'units',packSize:1,useArea:'Garage'},
 {id:'cables',title:'🔌 Kabel',name:'Elektrokabel',unit:'m',type:'verbrauch',quantity:5,unitMode:'units',packSize:1,useArea:'Garage'}
]);
export function normalizeArticleName(name){return String(name||'').normalize('NFKC').toLocaleLowerCase('de-AT').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();}
export function exactNameMatches(items,name){const n=normalizeArticleName(name);return n?items.filter(i=>normalizeArticleName(i.name)===n):[];}
export function compatibleMatches(items,name,unit,type){return exactNameMatches(items,name).filter(i=>i.unit===unit&&i.type===type);}
export function similarMatches(items,name){const n=normalizeArticleName(name);if(n.length<5)return [];return items.filter(i=>{const v=normalizeArticleName(i.name);return v!==n&&(v.startsWith(n+' ')||n.startsWith(v+' '));}).slice(0,4);}
export function recentlyUsedItems(items,limit=5){return [...items].sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))||String(a.id).localeCompare(String(b.id))).slice(0,limit);}
export function quickBookingDefaults(item,kind){
 const type=kind==='issue'?'issue':'receive';
 const mode=type==='issue'&&pairEligible(item)?'pairs':type==='receive'&&Number(item.packSize)>1?'packs':'units';
 const chips=type==='issue'?(pairEligible(item)?[[1,'pairs','1 Paar'],[2,'pairs','2 Paar']]:item.unit==='ml'?[[50,'units','50 ml'],[100,'units','100 ml']]:item.unit==='l'?[[.1,'units','0,1 l'],[.25,'units','0,25 l']]:[[1,'units','1 '+(item.unit==='stk'?'Stück':item.unit||'Einheit')],[2,'units','2 '+(item.unit==='stk'?'Stück':item.unit||'Einheiten')]]):mode==='packs'?[[1,'packs','1 Packung'],[2,'packs','2 Packungen']]:[[1,'units','1 Einheit'],[2,'units','2 Einheiten']];
 return {mode,quantity:1,chips};
}
