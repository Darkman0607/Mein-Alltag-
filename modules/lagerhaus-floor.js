/** L16.1 – floor visualisation is metadata, never a second stock ledger.
 * Room articles remain booked to their room; zones are normal location IDs. */
import {stockPositions} from './lagerhaus-stock.js';
export const FLOOR_MODELS=Object.freeze({
  rasenmaeher:{name:'Rasenmäher',emoji:'🚜',size:[1.05,.65,.65],colors:['#4a9c74','#234c3c','#9bdfad']},
  motorsaege:{name:'Motorsäge',emoji:'🪚',size:[.82,.48,.38],colors:['#d18b3f','#6c3d20','#ffc57a']},
  heckenschere:{name:'Heckenschere',emoji:'🌿',size:[1,.34,.32],colors:['#6ca972','#325f43','#b4dfa1']},
  kuebel:{name:'Farb-/Maler-Kübel',emoji:'🪣',size:[.46,.46,.57],colors:['#7699bb','#35536d','#bad5f0']},
  schachtel:{name:'Schachtel / Kiste',emoji:'📦',size:[.72,.62,.67],colors:['#ba915a','#745234','#efd09b']},
  sonstiges:{name:'Sonstiges Bodenobjekt',emoji:'🧰',size:[.75,.6,.62],colors:['#8e92b9','#464d73','#c3c7eb']},
  zone:{name:'Bodenstellplatz',emoji:'📍',size:[1.2,.9,.08],colors:['#547c91','#284758','#89bed1']}
});
export const FLOOR_MAX=100;
export const FLOOR_STEP=.25;
export const FLOOR_WIDTH=6;
export const FLOOR_DEPTH=4;
export function floorModel(record){return FLOOR_MODELS[record?.model]||FLOOR_MODELS.sonstiges;}
export function floorFootprint(record){const dimensions=floorModel(record).size;const rotated=Math.abs(Number(record?.rot)||0)%2===1;return {w:(rotated?dimensions[1]:dimensions[0])*.85,d:(rotated?dimensions[0]:dimensions[1])*.85};}
export function availableArticleStock(item,roomId){return stockPositions(item).find(p=>p.locationId===roomId)?.quantity||0;}
export function zoneLines(zone,items){return items.flatMap(item=>stockPositions(item).filter(pos=>pos.locationId===zone.id&&pos.quantity>0).map(pos=>({itemId:item.id,name:item.name,code:item.code,unit:item.unit,quantity:pos.quantity})));}
export function cleanFloorObject(record){
 if(!record||typeof record!=='object'||!['article','zone'].includes(record.kind)||!FLOOR_MODELS[record.model])throw Error('Ungültiger Bodenobjekttyp.');
 if(!record.id||typeof record.id!=='string')throw Error('Bodenobjekt ohne eindeutige ID.');
 const name=String(record.name||'').trim();if(!name||name.length>70)throw Error('Bitte eine Bezeichnung mit maximal 70 Zeichen eingeben.');
 if(record.kind==='article'&&(!record.itemId||typeof record.itemId!=='string'))throw Error('Bodenobjekt muss mit einem vorhandenen Artikel verbunden sein.');
 if(record.kind==='zone'&&record.model!=='zone')throw Error('Stellplatz muss als Stellplatz gespeichert werden.');
 const x=Number(record.x),z=Number(record.z),rot=Number(record.rot);
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isInteger(rot)||rot<0||rot>3)throw Error('Ungültige Bodenkoordinaten.');
 return {...record,name,x,z,rot};
}
export function floorSummary(room,items){return (room.floorObjects||[]).map(f=>({id:f.id,kind:f.kind,name:f.name,count:f.kind==='zone'?zoneLines(f,items).length:items.some(i=>i.id===f.itemId&&availableArticleStock(i,room.id)>0)?1:0}));}