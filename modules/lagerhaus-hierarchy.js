/** L04 – pure hierarchy operations: stable codes, legacy migration, lossless moves. */
export const DEFAULT_AREA_NAME='Allgemeiner Lagerbereich';
export const COMPARTMENT_KINDS=Object.freeze({fach:'Fach',schublade:'Schublade',box:'Box',platz:'Stellplatz'});
export const codePattern=/^(B|R|M|F|P)-\d{4,}$/;
export function allocateCode(prefix,used){
 let n=1; while(used.has(`${prefix}-${String(n).padStart(4,'0')}`))n++;
 const value=`${prefix}-${String(n).padStart(4,'0')}`;used.add(value);return value;
}
function allNodes(rooms,areas){return [...areas,...rooms,...rooms.flatMap(r=>r.furniture||[]),...rooms.flatMap(r=>(r.furniture||[]).flatMap(f=>f.compartments||[])),...rooms.flatMap(r=>r.floorObjects||[])];}
export function ensureHierarchy(rooms,areas,makeId){
 let changed=false;
 if(!areas.length){areas.push({id:makeId(),name:DEFAULT_AREA_NAME,createdAt:new Date().toISOString()});changed=true;}
 const used=new Set(),seenIds=new Set();
 for(const node of allNodes(rooms,areas)){
  if(typeof node.id!=='string'||!node.id||seenIds.has(node.id))throw new Error('Doppelte oder ungültige Lager-ID');
  seenIds.add(node.id);
  // Historical records cannot have L04 codes; handle those below.
  if(typeof node.code==='string'&&codePattern.test(node.code)){
   if(used.has(node.code))throw new Error('Doppelte Lagerkennung: '+node.code);
   used.add(node.code);
  }
 }
 const label=(node,prefix)=>{
  if(typeof node.code!=='string'||!codePattern.test(node.code)){
   node.code=allocateCode(prefix,used);changed=true;
  }else if(!node.code.startsWith(prefix+'-')){
   throw new Error('Ungültige Kennung am Lagerobjekt.');
  }
 };
 for(const a of areas)label(a,'B');
 const firstArea=areas[0].id;
 for(const r of rooms){
  if(!areas.some(a=>a.id===r.areaId)){r.areaId=firstArea;changed=true;}
  label(r,'R');
  if(!Array.isArray(r.furniture)){r.furniture=[];changed=true;}
  if(!Array.isArray(r.floorObjects)){r.floorObjects=[];changed=true;}
  for(const o of r.floorObjects)label(o,'P');
  for(const f of r.furniture){
   label(f,'M');
   if(!Array.isArray(f.compartments)){f.compartments=[];changed=true;}
   for(const c of f.compartments)label(c,'F');
  }
 }
 return changed;
}
export function getAllCodes(rooms,areas){return new Set(allNodes(rooms,areas).map(n=>n.code).filter(Boolean));}
export function findCompartment(rooms,id){
 for(const room of rooms)for(const furniture of room.furniture||[]){const index=(furniture.compartments||[]).findIndex(c=>c.id===id);if(index>=0)return {room,furniture,index,compartment:furniture.compartments[index]};}
 return null;
}
export function relocateCompartment(rooms,id,targetFurnitureId){
 const from=findCompartment(rooms,id);
 if(!from)throw new Error('Fach existiert nicht mehr.');
 const to=rooms.flatMap(r=>r.furniture||[]).find(f=>f.id===targetFurnitureId);
 if(!to)throw new Error('Zielmöbel existiert nicht.');
 if(to.id===from.furniture.id)throw new Error('Bitte ein anderes Zielmöbel wählen.');
 if((to.compartments||[]).length>=30)throw new Error('Zielmöbel hat bereits 30 Fächer.');
 // Move the exact record instead of reconstructing it (IDs, codes, notes stay intact).
 from.furniture.compartments.splice(from.index,1);
 to.compartments ||= [];
 to.compartments.push(from.compartment);
 return from.compartment;
}
export function locationPath(rooms,areas,roomId,furnitureId,compartmentId){
 const room=rooms.find(r=>r.id===roomId);if(!room)return '';
 const parts=[areas.find(a=>a.id===room.areaId)?.name||DEFAULT_AREA_NAME,room.name];
 const f=room.furniture?.find(v=>v.id===furnitureId);
 if(f){parts.push(f.name);const c=f.compartments?.find(v=>v.id===compartmentId);if(c)parts.push(c.name);}
 return parts.join(' / ');
}
export function defaultCompartmentLabels(f){
 const shape=f?.type||'regal';
 if(['regal','holz','breitregal','schmalregal','schwerlast'].includes(shape)){
  const n=shape==='schwerlast'?3:shape==='schmalregal'?5:4;
  return Array.from({length:n},(_,i)=>({kind:'fach',name:`Ebene ${i+1}`}));
 }
 if(['schubladen','werkzeugwagen','werkbanklade'].includes(shape)){
  const n=shape==='schubladen'?5:shape==='werkzeugwagen'?3:2;
  return Array.from({length:n},(_,i)=>({kind:'schublade',name:`Schublade ${i+1}`}));
 }
 if(['box','kiste','stapelbox'].includes(shape))return [{kind:'box',name:'Box 1'}];
 return [{kind:'fach',name:'Fach 1'}];
}