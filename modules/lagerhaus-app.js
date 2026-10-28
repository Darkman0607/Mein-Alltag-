import {enhanceRoomUi,resetCompactRoomUi} from './lagerhaus-compact.js';
/** Lagerhaus L04 – stable warehouse hierarchy with compartments. */
import {getModuleValue,setModuleValues,mutateModuleValues} from '../assets/database.js';
import {ITEM_KEY,assertNodeHasNoItems,assertLocationsRetained} from './lagerhaus-items.js';
import {MOVEMENT_KEY} from './lagerhaus-stock.js';
import {fachCards,matchFach,fachBooking} from './lagerhaus-fach.js';
import {shelfLines,roomUnassigned,shelfPackagesSvg,formatAmount} from './lagerhaus-shelf.js';
import {pairEligible,pairsLabel} from './lagerhaus-consumption.js';
import {readPhotoIndex,coverPhoto} from './lagerhaus-photos.js';
import {stockPositions,bookStock} from './lagerhaus-stock.js';
import {locationChoices} from './lagerhaus-items.js';
import {FLOOR_MODELS,FLOOR_MAX,floorModel,floorFootprint,availableArticleStock,zoneLines,cleanFloorObject} from './lagerhaus-floor.js';
import {DEFAULT_AREA_NAME,COMPARTMENT_KINDS,allocateCode,ensureHierarchy,getAllCodes,relocateCompartment,locationPath,defaultCompartmentLabels} from './lagerhaus-hierarchy.js';

const KEY='rooms.v1';
const AREAS_KEY='areas.v1';
const TYPES={garage:'Garage',keller:'Kellerabteil',lager:'Lagerraum',werkstatt:'Werkstatt',sonstiges:'Sonstiger Raum'};
const SIZES={klein:[3,2.5,2.4],mittel:[5,4,2.5],gross:[8,5,2.8]};
export const FURNITURE=Object.freeze({
 regal:{name:'Metallregal',category:'regale',shape:'shelves',size:[1.2,.55,1.8],material:'stahl',tiers:4},
 holz:{name:'Holzregal',category:'regale',shape:'shelves',size:[1.2,.55,1.7],material:'holz',tiers:4},
 breitregal:{name:'Breites Lagerregal',category:'regale',shape:'shelves',size:[1.8,.6,1.8],material:'stahl',tiers:4},
 schmalregal:{name:'Schmales Steckregal',category:'regale',shape:'shelves',size:[.7,.45,1.7],material:'stahl',tiers:5},
 schwerlast:{name:'Schwerlastregal',category:'regale',shape:'heavy',size:[1.65,.75,2.0],material:'stahl',tiers:3},
 schrank:{name:'Doppeltürschrank',category:'schraenke',shape:'cabinet',size:[1.15,.7,1.9],material:'stahl'},
 hochschrank:{name:'Hochschrank',category:'schraenke',shape:'cabinet',size:[.75,.6,2.15],material:'holz'},
 haengeschrank:{name:'Hängeschrank',category:'schraenke',shape:'wallcabinet',size:[1.05,.45,.85],material:'holz'},
 schubladen:{name:'Schubladenschrank',category:'schubladen',shape:'drawers',size:[.85,.65,1.1],material:'stahl',drawers:5},
 werkzeugwagen:{name:'Werkzeugwagen',category:'schubladen',shape:'toolcart',size:[.9,.6,.85],material:'stahl',drawers:3},
 box:{name:'Kunststoffbox',category:'boxen',shape:'bin',size:[.85,.75,.7],material:'kunststoff'},
 kiste:{name:'Holzkiste',category:'boxen',shape:'crate',size:[.75,.7,.62],material:'holz'},
 stapelbox:{name:'Stapelbox-Turm',category:'boxen',shape:'stack',size:[.75,.65,1.3],material:'kunststoff'},
 werkbank:{name:'Werkbank',category:'werkbaenke',shape:'bench',size:[1.5,.7,.9],material:'holz'},
 werkbanklade:{name:'Werkbank mit Schubladen',category:'werkbaenke',shape:'benchdrawers',size:[1.65,.75,.92],material:'holz',drawers:2}
});
export const FURNITURE_CATEGORIES=Object.freeze({alle:'Alle Möbel',regale:'Regale',schraenke:'Schränke',schubladen:'Schubladen & Wagen',boxen:'Boxen & Kisten',werkbaenke:'Werkbänke'});
export const FURNITURE_SIZES=Object.freeze({kompakt:{name:'Kompakt',factor:.78},standard:{name:'Standard',factor:1},gross:{name:'Groß',factor:1.18}});
export const FURNITURE_MATERIALS=Object.freeze({stahl:{name:'Metall',colors:['#829bad','#446078','#c5d6e0']},holz:{name:'Holz',colors:['#c29255','#795738','#e2ba75']},kunststoff:{name:'Kunststoff',colors:['#3e9b94','#1d6c66','#83d0bb']}});
export const furnitureModelCount=()=>Object.keys(FURNITURE).length;
export function furnitureVariant(f){const model=FURNITURE[f?.type]||FURNITURE.regal;const size=FURNITURE_SIZES[f?.variantSize]||FURNITURE_SIZES.standard;const mat=FURNITURE_MATERIALS[f?.material]||FURNITURE_MATERIALS[model.material];return {model,size,material:f?.material&&FURNITURE_MATERIALS[f.material]?f.material:model.material,colors:mat.colors,dimensions:model.size.map(v=>Number((v*size.factor).toFixed(2)))};}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newId=()=>globalThis.crypto?.randomUUID?.()||`id-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
let operation=Promise.resolve();
let rooms=[];
let areas=[];
let itemRecords=[];
let photoRecords=[];
let inventoryFurniture=null;
let navigatorFocus=null;
let stageZoom=1.17;
let stageOffsetX=0,stageOffsetY=0;
let stageFull=false;
let selected=null;
let selectedFloor=null;
let selectedCompartment=null;
let fachQuery='';
let formVisible=false;
let editId=null;
let message='';
let gridEnabled=true;
const undoByRoom=new Map();
const GRID_STEP=0.25;
const ROOM_WIDTH=6,ROOM_DEPTH=4;

async function read(){const value=await getModuleValue('lagerhaus',KEY);return Array.isArray(value)?value.filter(r=>r&&typeof r.id==='string'&&typeof r.name==='string'):[];}
async function readAreas(){const value=await getModuleValue('lagerhaus',AREAS_KEY);return Array.isArray(value)?value:[];}
async function loadState(){
 const all=await read(),areaRecords=await readAreas();
 const changed=ensureHierarchy(all,areaRecords,newId);
 if(changed)await setModuleValues('lagerhaus',[[KEY,all],[AREAS_KEY,areaRecords]]);
 rooms=all;areas=areaRecords;
 const loadedItems=await getModuleValue('lagerhaus',ITEM_KEY);itemRecords=Array.isArray(loadedItems)?loadedItems:[];
 photoRecords=await readPhotoIndex();
 return {all,areaRecords};
}
async function mutate(fn){
 const job=operation.catch(()=>{}).then(async()=>{
  let all,areaRecords,latestItems,result;
  await mutateModuleValues('lagerhaus',[KEY,AREAS_KEY,ITEM_KEY],values=>{
   all=Array.isArray(values[KEY])?values[KEY]:[];
   areaRecords=Array.isArray(values[AREAS_KEY])?values[AREAS_KEY]:[];
   latestItems=Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[];
   ensureHierarchy(all,areaRecords,newId);
   // Validate every deletion against the newest inventory in the SAME transaction.
   itemRecords=latestItems;
   result=fn(all,areaRecords);
   ensureHierarchy(all,areaRecords,newId);
   assertLocationsRetained(latestItems,all);
   return [[KEY,all],[AREAS_KEY,areaRecords]];
  });
  rooms=all;areas=areaRecords;itemRecords=latestItems;return result;
 });
 operation=job;return job;
}
function availableFurniture(roomId,excludeId){return rooms.flatMap(r=>(r.furniture||[]).filter(f=>f.id!==excludeId).map(f=>({room:r,furniture:f})));}
function newCompartment(name,kind,data,areaRecords){
 if(!name.trim())throw new Error('Bitte eine Fachbezeichnung eingeben.');
 return {id:newId(),code:allocateCode('F',getAllCodes(data,areaRecords)),name:name.trim().slice(0,55),kind:COMPARTMENT_KINDS[kind]?kind:'fach',createdAt:new Date().toISOString()};
}

// L03: Geometry is schematic, but movement is constrained to one shared coordinate system.
export function furnitureFootprint(f){
 if(f?.kind==='article'||f?.kind==='zone')return floorFootprint(f);
 const dim=furnitureVariant(f).dimensions;
 const r=(((Number(f.rot)||0)%4)+4)%4;
 return {w:(r%2?dim[1]:dim[0])*.85,d:(r%2?dim[0]:dim[1])*.85};
}
export function placementValid(candidate,others=[]){
 const {w,d}=furnitureFootprint(candidate),x=Number(candidate.x),z=Number(candidate.z);
 if(!Number.isFinite(x)||!Number.isFinite(z)||x < -1e-7||z < -1e-7||x+w>ROOM_WIDTH+1e-7||z+d>ROOM_DEPTH+1e-7)return false;
 return !(others||[]).some(f=>{
  if(f.id===candidate.id)return false;
  const a=furnitureFootprint(f),bx=Number(f.x),bz=Number(f.z);
  return x < bx+a.w-1e-6&&x+w > bx+1e-6&&z < bz+a.d-1e-6&&z+d > bz+1e-6;
 });
}
const snap=value=>Math.round(value/GRID_STEP)*GRID_STEP;
export function constrainedPosition(item,others,x,z){
 const {w,d}=furnitureFootprint(item);
 let xx=Math.max(0,Math.min(ROOM_WIDTH-w,snap(x)));
 let zz=Math.max(0,Math.min(ROOM_DEPTH-d,snap(z)));
 // Wall magnets, active in raster mode and safe near room edges.
 if(xx<.28)xx=0;
 if(ROOM_WIDTH-w-xx<.28)xx=Number((ROOM_WIDTH-w).toFixed(3));
 if(zz<.28)zz=0;
 if(ROOM_DEPTH-d-zz<.28)zz=Number((ROOM_DEPTH-d).toFixed(3));
 xx=Number(xx.toFixed(3));zz=Number(zz.toFixed(3));
 return {x:xx,z:zz,valid:placementValid({...item,x:xx,z:zz},others)};
}
export function pointerToGridDelta(dx,dy){return {x:dx/74+dy/37,z:dy/37-dx/74};}
export function firstFreeSpot(item,others){
 const {w,d}=furnitureFootprint(item);
 for(let zi=0;zi<=Math.floor((ROOM_DEPTH-d)/GRID_STEP);zi++){
  for(let xi=0;xi<=Math.floor((ROOM_WIDTH-w)/GRID_STEP);xi++){
   const x=Number((xi*GRID_STEP).toFixed(2)),z=Number((zi*GRID_STEP).toFixed(2));
   if(placementValid({...item,x,z},others))return {x,z};
  }
 }
 return null;
}
function putUndo(roomId,before){
 const stack=undoByRoom.get(roomId)||[];
 stack.push(before);
 if(stack.length>15)stack.shift();
 undoByRoom.set(roomId,stack);
}
const roomLink=id=>`#/lagerhaus/room/${encodeURIComponent(id)}`;
function fmtSize(room){return room.dimensions?`${room.dimensions.map(n=>String(n).replace('.',',')).join(' × ')} m`:'Maße nicht hinterlegt';}
function p(x,z,h=0){return [200+(x-z)*37,68+(x+z)*18.5-h*29];}
function poly(points,fill,stroke='#ffffff35',extra=''){return `<polygon points="${points.map(a=>a.map(n=>n.toFixed(1)).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.3" ${extra}/>`;}
function cuboid(x,z,w,d,h,colors,selected=false){const a=p(x,z),b=p(x+w,z),c=p(x+w,z+d),e=p(x,z+d),ah=p(x,z,h),bh=p(x+w,z,h),ch=p(x+w,z+d,h),eh=p(x,z+d,h);return `${poly([a,b,bh,ah],colors[1])}${poly([b,c,ch,bh],colors[0])}${poly([e,c,ch,eh],colors[1])}${poly([ah,bh,ch,eh],colors[2],selected?'#ffcd65':'#ffffff50',selected?'stroke-width="3"':'')}`;}
function furnitureSvg(f,small=false){
 const {model,colors,dimensions}=furnitureVariant(f),dim=dimensions;
 const {w,d}=furnitureFootprint(f);
 const x=Math.max(0,Number(f.x)||0),z=Math.max(0,Number(f.z)||0);
 const active=selected===f.id;
 let inside='';
 const layer=(height,fill)=>poly([p(x,z,height),p(x+w,z,height),p(x+w,z+d,height),p(x,z+d,height)],fill,'#e8f4fa66');
 const face=(top,bottom,fill,stroke='#dcecf566')=>poly([p(x,z,top),p(x+w,z,top),p(x+w,z,bottom),p(x,z,bottom)],fill,stroke);
 const stroke=(aa,bb)=>`<path d="M${aa.join(' ')}L${bb.join(' ')}" stroke="#e2eaf0" stroke-width="1.7" opacity=".8"/>`;
 if(model.shape==='shelves'||model.shape==='heavy'){
  const tiers=model.tiers||4;for(let j=1;j<tiers;j++)inside+=layer(dim[2]*j/tiers,model.shape==='heavy'?'#91a3a9':colors[2]);
  if(model.shape==='heavy')for(const fx of [x+.09,x+w-.09])inside+=stroke(p(fx,z,0),p(fx,z,dim[2]));
 }else if(model.shape==='cabinet'||model.shape==='wallcabinet'){
  inside+=face(dim[2]*.92,dim[2]*.07,'#15263375');
  inside+=stroke(p(x+w*.5,z,dim[2]*.08),p(x+w*.5,z,dim[2]*.9));
  inside+=`<circle cx="${p(x+w*.44,z,dim[2]*.52)[0]}" cy="${p(x+w*.44,z,dim[2]*.52)[1]}" r="2.7" fill="#ffe5ab"/><circle cx="${p(x+w*.56,z,dim[2]*.52)[0]}" cy="${p(x+w*.56,z,dim[2]*.52)[1]}" r="2.7" fill="#ffe5ab"/>`;
  if(model.shape==='wallcabinet')inside+=face(dim[2]*.12,0,'#86a8b365');
 }else if(['drawers','toolcart','benchdrawers'].includes(model.shape)){
  const n=model.drawers||3;
  for(let j=0;j<n;j++){
   const top=dim[2]*(.84-j*(.72/n)),bottom=top-dim[2]*(.57/n);
   inside+=face(top,bottom,'#1731419c')+stroke(p(x+w*.39,z,(top+bottom)/2),p(x+w*.62,z,(top+bottom)/2));
  }
  if(model.shape==='toolcart')for(const fx of [x+w*.2,x+w*.8]){let at=p(fx,z,0);inside+=`<circle cx="${at[0]}" cy="${at[1]+2}" r="4" fill="#141d24" stroke="#c7d6df"/>`;}
  if(model.shape==='benchdrawers')inside+=layer(dim[2]*.92,'#d7a875');
 }else if(model.shape==='bin'||model.shape==='crate'){
  inside+=face(dim[2]*.69,dim[2]*.55,'#e4e8e955');
  if(model.shape==='crate')for(let j=1;j<3;j++)inside+=stroke(p(x+w*j/3,z,dim[2]*.12),p(x+w*j/3,z,dim[2]*.83));
 }else if(model.shape==='stack'){
  for(let j=1;j<4;j++)inside+=face(dim[2]*j/4+dim[2]*.035,dim[2]*j/4-dim[2]*.035,'#bfdadbaa');
 }else if(model.shape==='bench'){
  inside+=layer(dim[2]*.9,'#e9c27b');inside+=face(dim[2]*.37,dim[2]*.25,'#14273580');
 }
 // L09: touchable, keyboard-accessible markers on the same SVG furniture.
 const products=small?'':shelfPackagesSvg(f,itemRecords,p,poly,w,d,dim);
 const compMarkers=(small?[]:f.compartments||[]).slice(0,30).map((c,i,all)=>{
  const columns=Math.min(3,all.length),column=i%columns,row=Math.floor(i/columns);
  const xy=p(x+w*(column+.5)/columns,z,Math.max(.2,dim[2]-.20-row*.33));
  const active=selectedCompartment===c.id;
  return `<g data-compartment-id="${esc(c.id)}" role="button" tabindex="0" aria-label="Fach ${esc(c.code)} ${esc(c.name)} auswählen" class="lager-fach-pin ${active?'is-active':''}"><circle cx="${xy[0]}" cy="${xy[1]}" r="12" fill="${active?'#f5c469':'#154257'}" stroke="${active?'#fff0ce':'#9ad6e9'}" stroke-width="2"/><text x="${xy[0]}" y="${xy[1]+4}" text-anchor="middle" font-size="10" font-weight="800" fill="${active?'#162b31':'#fff'}">${i+1}</text></g>`;
 }).join('');
 const hit=p(x+w/2,z+d/2,dim[2]);
 const label=esc(f.name||model.name);
 return `<g data-furniture="${esc(f.id)}" data-model="${esc(f.type)}" role="button" tabindex="0" aria-label="${label} auswählen" class="room-object ${active?'room-object--selected':''}" style="cursor:pointer">${cuboid(x,z,w,d,dim[2],colors,active)}${inside}${products}${compMarkers}<text x="${hit[0]}" y="${hit[1]-9}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" stroke="#101820" stroke-width="3" paint-order="stroke">${label}</text></g>`;
}
/** L16.1: SVG silhouettes on low cuboid bases; no external 3D resources or online requests. */
function floorSvg(object,room,small=false){
 const model=floorModel(object),{w,d}=floorFootprint(object),x=Number(object.x)||0,z=Number(object.z)||0;
 const h=model.size[2],rot=((Number(object.rot)||0)%4+4)%4,center=p(x+w/2,z+d/2,h);
 const active=selectedFloor===object.id;
 const line=(x1,z1,h1,x2,z2,h2,color,width=3)=>{const a=p(x1,z1,h1),b=p(x2,z2,h2);return `<path d="M${a.join(' ')}L${b.join(' ')}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;};
 let art='';
 if(object.model==='rasenmaeher'){
  for(const zz of [.12,.86])for(const xx of [.13,.87]){const a=p(x+w*xx,z+d*zz,.1);art+=`<circle cx="${a[0]}" cy="${a[1]}" r="4.5" fill="#15222a" stroke="#d5dedc" stroke-width="1.4"/>`;}
  art+=line(x+w*.22,z+d*.84,.38,x+w*.16,z+d*1.12,.94,'#d9e6e1',3)+line(x+w*.16,z+d*1.12,.94,x+w*.69,z+d*1.12,.94,'#d9e6e1',3);
 }else if(object.model==='motorsaege'){
  const a=p(x+w*.86,z+d*.32,.28),b=p(x+w*1.35,z+d*.32,.28),c=p(x+w*1.35,z+d*.70,.28),d=p(x+w*.86,z+d*.70,.28);
  art+=poly([a,b,c,d],'#d3d9dd','#76838b')+line(x+w*.3,z+d*.18,.48,x+w*.48,z+d*.18,.62,'#1b2b2d',4);
 }else if(object.model==='heckenschere'){
  art+=line(x+w*.58,z+d*.37,.41,x+w*1.46,z+d*.37,.41,'#cbd6de',5)+line(x+w*.58,z+d*.50,.41,x+w*1.45,z+d*.50,.41,'#87989c',2);
  art+=line(x+w*.15,z+d*.15,.44,x+w*.35,z+d*.15,.65,'#1f3d35',4);
 }else if(object.model==='kuebel'){
  const a=p(x+w/2,z+d/2,.66);
  art+=`<ellipse cx="${a[0]}" cy="${a[1]}" rx="${Math.max(7,w*15)}" ry="${Math.max(4,d*7)}" fill="#e2e9eb" stroke="#6b7c86" stroke-width="2"/>`;
  art+=`<path d="M${a[0]-9} ${a[1]+3}Q${a[0]} ${a[1]-24} ${a[0]+9} ${a[1]+3}" fill="none" stroke="#dcecf4" stroke-width="2"/>`;
 }else if(object.model==='schachtel'){
  art+=line(x+w*.5,z+d*.10,h+.01,x+w*.5,z+d*.88,h+.01,'#fff0c7',2);
 }else if(object.model==='zone'){
  const a=p(x+w/2,z+d/2,.14);
  art+=`<circle cx="${a[0]}" cy="${a[1]-3}" r="10" fill="#153748" stroke="#e5c279" stroke-width="2"/><text x="${a[0]}" y="${a[1]+1}" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">+</text>`;
 }
 const anchor=p(x+w/2,z+d/2,Math.max(.12,h));
 const count=object.kind==='zone'?zoneLines(object,itemRecords).length:availableArticleStock(itemRecords.find(i=>i.id===object.itemId)||{},room.id);
 const name=esc(object.name||model.name);
 const symbol=small?'':`<text x="${center[0]}" y="${center[1]+3}" text-anchor="middle" font-size="${object.model==='zone'?13:17}" aria-hidden="true">${model.emoji}</text>`;
 return `<g data-floor="${esc(object.id)}" role="button" tabindex="0" aria-label="${name} auf dem Boden öffnen" class="room-object room-floor-object ${active?'room-object--selected':''}">${cuboid(x,z,w,d,h,model.colors,active)}${art}${symbol}<text x="${anchor[0]}" y="${anchor[1]-13}" text-anchor="middle" font-size="10" font-weight="700" stroke="#101820" stroke-width="3" paint-order="stroke" fill="#fff">${esc(String(object.name||model.name).slice(0,20))}</text>${!small?`<title>${name} · ${object.kind==='zone'?count+' Positionen':count+' '+(itemRecords.find(i=>i.id===object.itemId)?.unit||'Stück')} · Boden</title>`:''}</g>`;
}
export function roomSvg(room,small=false){const empty=!(room?.furniture?.length||room?.floorObjects?.length);const baseRoom=room||{furniture:[],floorObjects:[],type:'garage'};const a=p(0,0),b=p(6,0),c=p(6,4),d=p(0,4);const ah=p(0,0,2),bh=p(6,0,2),dh=p(0,4,2);const rear=poly([a,b,bh,ah],'#263745','#70869b');const side=poly([a,d,dh,ah],'#172733','#526777');const floor=poly([a,b,c,d],'#31424e','#8ba0ad');let lines='';for(let x=1;x<6;x++)lines+=`<path d="M${p(x,0).join(' ')}L${p(x,4).join(' ')}" stroke="#607683" stroke-width=".8" opacity=".43"/>`;for(let z=1;z<4;z++)lines+=`<path d="M${p(0,z).join(' ')}L${p(6,z).join(' ')}" stroke="#607683" stroke-width=".8" opacity=".43"/>`;
 let entries=[...(baseRoom.furniture||[]).map(f=>({record:f,kind:'furniture'})),...(baseRoom.floorObjects||[]).map(f=>({record:f,kind:'floor'}))];const itemContent=entries.sort((a,b)=>(Number(a.record.x)+Number(a.record.z))-(Number(b.record.x)+Number(b.record.z))).map(o=>o.kind==='floor'?floorSvg(o.record,baseRoom,small):furnitureSvg(o.record,small)).join('');
 return `<svg class="lager-room-svg ${small?'is-preview':''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 315" role="img" aria-label="Schematische dreidimensionale Raumansicht"><defs><linearGradient id="floorShade" x2="1" y2="1"><stop stop-color="#253b4a"/><stop offset="1" stop-color="#344958"/></linearGradient></defs>${rear}${side}${floor}${gridEnabled?lines:''}${itemContent}${empty&&!small?`<text x="214" y="254" text-anchor="middle" font-size="15" fill="#c3d1d9">Noch keine Objekte – unten hinzufügen</text>`:''}<text x="220" y="302" text-anchor="middle" font-size="11" fill="#b6c6d0">Schematische 3D-Ansicht · nicht maßstabsgetreu</text></svg>`;
}
function roomCard(room){return `<a class="lager-room-card" data-room-preview="${esc(room.id)}" href="${roomLink(room.id)}" aria-label="${esc(room.name)} öffnen"><div class="lager-room-illustration">${roomSvg(room,true)}</div><div class="lager-room-card-caption"><div><strong>${esc(room.name)}</strong><small>${esc(room.code||'')} · ${esc(TYPES[room.type]||TYPES.sonstiges)} · ${esc(fmtSize(room))}</small></div><span aria-hidden="true">›</span></div></a>`;}
function header(title,desc){return `<div class="lager-heading"><span class="eyebrow">Mein Alltag · Lagerhaus / V0.17.0</span><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>`;}
const options=(list,current)=>list.map(([v,label])=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(label)}</option>`).join('');
function createForm(room){const dims=room?.dimensions||[];const tpl=room?.preset||'ohne';return `<form id="lagerRoomForm" class="lager-form"><h2>${room?'Raum bearbeiten':'Neuen Raum erstellen'}</h2><label for="lagerName">Raumname *</label><input id="lagerName" name="name" required maxlength="55" value="${esc(room?.name||'')}" placeholder="z. B. Meine Garage" autocomplete="off"/><label for="lagerAreaSelect">Lagerbereich</label><select id="lagerAreaSelect" name="areaId">${options(areas.map(a=>[a.id,`${a.name} (${a.code})`]),room?.areaId||areas[0]?.id)}</select><label for="lagerType">Raumtyp</label><select id="lagerType" name="type">${options(Object.entries(TYPES),room?.type||'garage')}</select><label for="lagerPreset">Raumgröße</label><select id="lagerPreset" name="preset">${options([['ohne','Ohne Maße starten'],['klein','Klein – 3 × 2,5 × 2,4 m'],['mittel','Mittel – 5 × 4 × 2,5 m'],['gross','Groß – 8 × 5 × 2,8 m'],['eigen','Eigene Maße eingeben']],tpl)}</select><div id="lagerDimensions" class="lager-dims" ${tpl==='ohne'?'hidden':''}><label>Länge (m)<input name="length" type="number" min="0.1" max="1000" step="0.1" inputmode="decimal" value="${dims[0]??''}" /></label><label>Breite (m)<input name="width" type="number" min="0.1" max="1000" step="0.1" inputmode="decimal" value="${dims[1]??''}"/></label><label>Höhe (m)<input name="height" type="number" min="0.1" max="1000" step="0.1" inputmode="decimal" value="${dims[2]??''}"/></label></div><p class="lager-hint">Die 3D-Ansicht ist vorerst schematisch; Maße dienen der Dokumentation.</p><div class="lager-actions"><button type="submit" class="primary-button">${room?'Änderungen speichern':'Raum speichern'}</button><button class="secondary-button" type="button" id="lagerCancel">Abbrechen</button></div></form>`;}
export function renderLagerhaus(){return `${header('Meine Lagerbereiche','Bereiche, Räume, Möbel, Fächer und eigene Artikel – dauerhaft gekennzeichnet.')}<div class="lager-toolbar"><button id="lagerCreate" class="primary-button" type="button">+ Lagerraum erstellen</button><a href="#/lagerhaus/items" class="secondary-button lager-article-link">▣ Artikel verwalten</a><a href="#/lagerhaus/navigator" class="secondary-button lager-article-link">📍 Lager-Navigator</a><a href="#/lagerhaus/service" class="secondary-button lager-article-link">🔧 Geräte & Service</a></div><form class="lager-area-form" id="lagerAreaForm"><label for="lagerAreaName">Neuen Lagerbereich anlegen</label><div class="lager-area-add"><input id="lagerAreaName" maxlength="55" required placeholder="z. B. Werkstatt, Dachboden"/><button class="secondary-button" type="submit">+ Bereich</button></div></form><div class="lager-status" id="lagerStatus" role="status" aria-live="polite">Lagerbereiche werden geladen …</div><div id="lagerHomeContent"></div>`;}
function setStatus(str){const el=document.getElementById('lagerStatus');if(el)el.textContent=str||'';}
function drawHome(){
 const container=document.getElementById('lagerHomeContent');if(!container)return;
 const selectedRoom=rooms.find(r=>r.id===editId);
 const groups=areas.map(a=>{
  const groupRooms=rooms.filter(r=>r.areaId===a.id);
  return `<section class="lager-area-group"><div class="lager-area-heading"><div><small class="lager-identifier">${esc(a.code)}</small><h2>${esc(a.name)}</h2><p>${groupRooms.length} Räume · ${groupRooms.reduce((n,r)=>n+(r.furniture?.length||0)+(r.floorObjects?.length||0),0)} Möbel/Bodenobjekte</p></div><div class="lager-area-controls"><button type="button" data-area-rename="${esc(a.id)}" class="secondary-button">Umbenennen</button><button type="button" data-area-delete="${esc(a.id)}" class="secondary-button lager-delete" ${groupRooms.length?'disabled title="Bereich enthält Räume"':''}>Löschen</button></div></div>${groupRooms.length?`<div class="lager-rooms">${groupRooms.map(roomCard).join('')}</div>`:'<p class="lager-hint">Noch keine Räume zugeordnet. Erstelle einen Raum und wähle diesen Bereich.</p>'}</section>`;
 }).join('');
 container.innerHTML=(formVisible?createForm(selectedRoom):'')+`<div class="lager-stat-row"><div><strong>${areas.length}</strong><span>Bereiche</span></div><div><strong>${rooms.length}</strong><span>Räume</span></div><div><strong>${rooms.reduce((a,r)=>a+(r.furniture?.length||0),0)}</strong><span>Möbel</span></div></div>${groups}`;
 if(formVisible)bindForm(container,selectedRoom);
 container.querySelectorAll('[data-room-preview]').forEach(card=>{
  // In the overview a short tap on a SPECIFIC shelf opens its enlarged detail directly.
  const open=e=>{const target=e.target.closest?.('[data-furniture]');if(!target)return;
   e.preventDefault();e.stopPropagation();location.hash=`${roomLink(card.dataset.roomPreview)}/shelf/${encodeURIComponent(target.dataset.furniture)}`;};
  card.addEventListener('click',open);
  card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest?.('[data-furniture]'))open(e);});
 });
 container.querySelectorAll('[data-area-rename]').forEach(b=>b.addEventListener('click',async()=>{
  const area=areas.find(a=>a.id===b.dataset.areaRename);if(!area)return;
  const name=prompt('Neuer Name für den Lagerbereich:',area.name);
  if(name===null)return;
  if(!name.trim()){setStatus('Bitte einen Bereichsnamen eingeben.');return;}
  try{await mutate((data,ar)=>{const item=ar.find(a=>a.id===area.id);if(item)item.name=name.trim().slice(0,55);});drawHome();setStatus('Bereich umbenannt – Kennung und Zuordnungen erhalten.');}
  catch(e){setStatus('Änderung fehlgeschlagen: '+e.message);}
 }));
 container.querySelectorAll('[data-area-delete]').forEach(b=>b.addEventListener('click',async()=>{
  const a=areas.find(a=>a.id===b.dataset.areaDelete);if(!a||!confirm(`Leeren Lagerbereich „${a.name}“ entfernen?`))return;
  try{await mutate((data,ar)=>{if(data.some(r=>r.areaId===a.id))throw new Error('Bitte Räume zuerst einem anderen Bereich zuordnen.');if(ar.length<2)throw new Error('Mindestens ein Lagerbereich muss bestehen bleiben.');const idx=ar.findIndex(x=>x.id===a.id);if(idx>=0)ar.splice(idx,1);});drawHome();setStatus('Leerer Bereich entfernt.');}
  catch(e){setStatus('Entfernen fehlgeschlagen: '+e.message);}
 }));
}

function bindForm(container,room){const form=container.querySelector('#lagerRoomForm');const select=form.querySelector('#lagerPreset');const dims=form.querySelector('#lagerDimensions');const fields=['length','width','height'].map(name=>form.elements.namedItem(name));function sync(){const kind=select.value;dims.hidden=kind==='ohne';if(SIZES[kind])SIZES[kind].forEach((v,i)=>fields[i].value=v);}select.addEventListener('change',sync);form.querySelector('#lagerCancel').addEventListener('click',()=>{formVisible=false;editId=null;drawHome();});form.addEventListener('submit',async e=>{e.preventDefault();const name=form.elements.namedItem('name').value.trim();const type=form.elements.namedItem('type').value;const areaId=form.elements.namedItem('areaId').value;const preset=select.value;const dimensions=preset==='ohne'?null:fields.map(f=>Number(f.value));if(!name){setStatus('Bitte einen Raumnamen eingeben.');return;}if(dimensions&&dimensions.some(n=>!Number.isFinite(n)||n<=0||n>1000)){setStatus('Bitte gültige Maße größer als 0 m eingeben.');return;}const submit=form.querySelector('[type="submit"]');submit.disabled=true;try{await mutate(data=>{if(room){const record=data.find(x=>x.id===room.id);if(!record)throw new Error('Raum nicht gefunden.');Object.assign(record,{name,type,areaId,preset,dimensions,updatedAt:new Date().toISOString()});}else data.push({id:newId(),name,type,areaId,preset,dimensions,furniture:[],floorObjects:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});});formVisible=false;editId=null;drawHome();setStatus('Raum wurde gespeichert.');}catch(err){setStatus('Speichern fehlgeschlagen: '+err.message);submit.disabled=false;}});}
export async function mountLagerhaus(){
 document.getElementById('lagerCreate')?.addEventListener('click',()=>{editId=null;formVisible=true;drawHome();document.getElementById('lagerName')?.focus();});
 document.getElementById('lagerAreaForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const input=document.getElementById('lagerAreaName');const name=input.value.trim();if(!name)return;
  try{await mutate((data,ar)=>{ar.push({id:newId(),code:allocateCode('B',getAllCodes(data,ar)),name:name.slice(0,55),createdAt:new Date().toISOString()});});input.value='';drawHome();setStatus('Neuer Lagerbereich erstellt.');}
  catch(err){setStatus('Bereich konnte nicht erstellt werden: '+err.message);}
 });
 try{await loadState();if(!document.getElementById('lagerHomeContent'))return;drawHome();setStatus(`${areas.length} Bereiche · ${rooms.length} Räume gespeichert · offline verfügbar`);}catch(err){setStatus('Lagerdaten nicht verfügbar: '+err.message);}
}
export function renderLagerraum(){return `<div id="lagerRoomContent"><p class="lager-status">Lagerraum wird geladen …</p></div>`;}
const FURNITURE_OPTIONS=Object.entries(FURNITURE).map(([key,v])=>[key,v.name]);
const selectionOptions=(mapping,current)=>options(Object.entries(mapping).map(([key,val])=>[key,val.name]),current);
function furniturePanel(room){
 if(!selected||!room.furniture?.some(f=>f.id===selected))return '<p class="lager-hint">Tippe auf ein Möbelstück oder ziehe es mit dem Finger an einen freien Platz. Die Pfeiltasten ermöglichen die Feinausrichtung.</p>';
 const item=room.furniture.find(f=>f.id===selected);const v=furnitureVariant(item);
 return `<div class="lager-editor"><h2>Möbel bearbeiten <small class="lager-identifier">${esc(item.code)}</small></h2><label for="lagerEditFurnitureName">Bezeichnung</label><input id="lagerEditFurnitureName" maxlength="55" value="${esc(item.name||v.model.name)}"/><div class="lager-variant-grid"><label>Größe<select id="lagerEditFurnitureSize">${selectionOptions(FURNITURE_SIZES,item.variantSize||'standard')}</select></label><label>Material<select id="lagerEditFurnitureMaterial">${selectionOptions(FURNITURE_MATERIALS,v.material)}</select></label></div><p class="lager-hint">Modell: ${esc(v.model.name)} · ungefähre Möbelmaße: ${v.dimensions.join(' × ')} m (schematische Vorschau)</p><button type="button" class="secondary-button" id="lagerSaveFurniture">Änderungen speichern</button><div class="lager-nudge" aria-label="Möbel positionieren"><button type="button" data-move="left" aria-label="Nach links bewegen">←</button><button type="button" data-move="up" aria-label="Nach hinten bewegen">↑</button><button type="button" data-move="down" aria-label="Nach vorne bewegen">↓</button><button type="button" data-move="right" aria-label="Nach rechts bewegen">→</button></div><div class="lager-actions"><button type="button" class="secondary-button" id="lagerRotate">↻ 90° drehen</button><button type="button" class="secondary-button lager-delete" id="lagerDeleteFurniture">Möbel entfernen</button></div>${rooms.length>1?`<label class="lager-move-label">Möbel samt Fächern in anderen Raum verschieben<select id="lagerFurnitureMoveTarget">${options(rooms.filter(r=>r.id!==room.id).map(r=>[r.id,`${r.name} (${r.code})`]),rooms.find(r=>r.id!==room.id)?.id)}</select></label><button type="button" class="secondary-button" id="lagerMoveFurniture">↳ Möbel verschieben</button>`:''}<p class="lager-hint">Finger: Möbel ziehen und loslassen. Pfeiltasten: jeweils 25 cm im schematischen Raster. 90°-Drehung und Platzprüfung sind aktiviert.</p></div>`;
}
function compartmentPanel(room){
 if(!selected)return '';
 const item=room.furniture?.find(f=>f.id===selected);if(!item)return '';
 const compartments=item.compartments||[];
 const targets=availableFurniture(room.id,item.id);
 const path=locationPath(rooms,areas,room.id,item.id);
 const cards=compartments.map(c=>`<div class="lager-comp-card" data-comp="${esc(c.id)}"><div class="lager-comp-header"><span class="lager-identifier">${esc(c.code)}</span><strong>${esc(c.name)}</strong><span>${esc(COMPARTMENT_KINDS[c.kind]||'Fach')}</span></div><label>Fachname<input data-comp-name maxlength="55" value="${esc(c.name)}" aria-label="Name für ${esc(c.code)}" /></label><div class="lager-comp-actions"><button type="button" class="secondary-button" data-comp-save="${esc(c.id)}">Name speichern</button><button type="button" class="secondary-button lager-delete" data-comp-delete="${esc(c.id)}">Entfernen</button></div>${targets.length?`<label>Fach in anderes Möbel verschieben<select data-comp-target="${esc(c.id)}">${options(targets.map(v=>[v.furniture.id,`${v.room.name} / ${v.furniture.name} (${v.furniture.code})`]),targets[0].furniture.id)}</select></label><button type="button" class="secondary-button" data-comp-move="${esc(c.id)}">↳ Fach verschieben</button>`:''}</div>`).join('');
 return `<section class="lager-compartments"><div class="lager-comp-title"><h2>Fächer & Schubladen</h2><span class="lager-identifier">${compartments.length} Einträge</span></div><p class="lager-hint">${esc(path)} · ${esc(item.code)}. Jede Fachkennung bleibt bei Umbenennung oder Umzug erhalten.</p>${cards||'<p class="lager-hint">Noch keine Fächer angelegt. Erstelle einzelne Fächer oder übernimm die Standardaufteilung.</p>'}<form id="lagerCompartmentForm" class="lager-comp-form"><label>Bezeichnung<input id="lagerNewCompName" required maxlength="55" placeholder="z. B. Ebene 1, Werkzeuglade"/></label><label>Fachtyp<select id="lagerNewCompKind">${options(Object.entries(COMPARTMENT_KINDS),'fach')}</select></label><button class="primary-button" type="submit">+ Fach hinzufügen</button></form><button type="button" id="lagerCreateDefaults" class="secondary-button" ${compartments.length?'disabled':''}>Standardfächer für dieses Modell</button><p class="lager-hint">Artikel lassen sich jetzt in L05 dem Raum, Möbel oder Fach zuordnen. Einlagern, Entnehmen und Umlagern ist über „Meine Artikel“ verfügbar.</p></section>`;
}
function fachExplorer(room){
 const cards=fachCards([room],itemRecords);
 const current=cards.find(c=>c.id===selectedCompartment);
 const globalFaecher=fachCards(rooms,itemRecords).filter(c=>c.id!==selectedCompartment);
 const labels={fach:'Fach',schublade:'Schublade',box:'Box',platz:'Stellplatz'};
 const summary=c=>c.articles.map(a=>`${esc(a.name)} (${esc(a.code)}): ${esc(String(a.quantity).replace('.',','))} ${esc(a.unit)}${a.containers||a.devices?` · ${a.containers} Gebinde / ${a.devices} Geräte`:''}`).join('<span class="lager-fach-sep"> · </span>')||'Noch keine Artikel in diesem Fach';
 return `<section class="lager-fach-overview" aria-label="Fachliste des Raums"><div class="lager-comp-title"><h2>Fächer im 3D-Lager</h2><span class="lager-identifier">${cards.length} Fächer</span></div><p class="lager-hint">Fachmarkierung im 3D-Modell oder die Fachkarte antippen. Artikelbestände erscheinen hier und im Artikelmanager identisch.</p><label class="lager-fach-search-label" for="lagerFachSuche">Fächer und Artikel durchsuchen</label><input class="lager-fach-search" id="lagerFachSuche" type="search" placeholder="Fach, Kennung, Möbel, Artikel …" value="${esc(fachQuery)}" autocomplete="off"/><div class="lager-fach-list" id="lagerFachListe">${cards.length?cards.map(c=>`<button type="button" class="lager-fach-card ${current?.id===c.id?'is-selected':''}" data-fach-select="${esc(c.id)}" ${matchFach([c],fachQuery).length?'':'hidden'}><span class="lager-fach-card-top"><strong>${esc(c.code)} · ${esc(c.name)}</strong><small>${esc(labels[c.kind]||'Fach')}</small></span><small>${esc(c.furnitureName)} (${esc(c.furnitureCode)})</small><span class="lager-fach-articles">${summary(c)}</span></button>`).join(''):'<p class="lager-hint">Keine Fächer zum Suchbegriff gefunden.</p>'}</div>
 ${current?`<form id="lagerFachBooking" class="lager-fach-booking"><h3>Bestand buchen · ${esc(current.code)} ${esc(current.name)}</h3><p class="lager-hint">${esc(current.roomName)} / ${esc(current.furnitureName)}. Bestehende Artikel auswählen oder über „Artikel erfassen“ neu anlegen.</p><label>Artikel<select name="itemId" required>${itemRecords.map(i=>`<option value="${esc(i.id)}">${esc(i.code)} · ${esc(i.name)}</option>`).join('')}</select></label><label>Buchung<select name="operation"><option value="receive">Einlagern / zuordnen</option><option value="issue">Entnehmen</option><option value="transfer">In anderes Fach umlagern</option></select></label><label>Menge in Grundeinheiten<input type="number" name="quantity" min="0.001" max="1000000" step="0.001" inputmode="decimal" required placeholder="z. B. 1"/></label><label id="lagerFachZielLabel" hidden>Zielfach<select name="targetId">${globalFaecher.map(c=>`<option value="${esc(c.id)}">${esc(c.roomName)} / ${esc(c.furnitureName)} / ${esc(c.name)} (${esc(c.code)})</option>`).join('')}</select></label><button type="submit" class="primary-button" ${!itemRecords.length?'disabled':''}>Buchung speichern</button><p class="lager-stock-help">Separat erfasste Gebinde und Einzelgeräte werden vor normalen Entnahmen geschützt. Für deren Umlagerung bitte „Meine Artikel“ verwenden.</p></form>`:''}</section>`;
}
function inventoryThumbnail(itemId){
 const thumbnail=coverPhoto(photoRecords,'item',itemId)?.thumbnail||'';
 return /^data:image\/(png|jpeg|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(thumbnail)?`<img class="lager-shelf-photo" src="${thumbnail}" alt="Artikelfoto">`:'<span class="lager-shelf-photo lager-shelf-photo--symbol" aria-hidden="true">▣</span>';
}
function shelfInventoryPanel(room){
 const f=room.furniture?.find(x=>x.id===inventoryFurniture);
 if(!f)return '';
 const entries=shelfLines(f,itemRecords),facs=f.compartments||[];
 const groups=[{id:f.id,name:'Direkt im Möbel'},...facs.map(c=>({id:c.id,name:`${c.code} · ${c.name}`}))];
 const pairText=x=>{const record=itemRecords.find(i=>i.id===x.itemId);return pairEligible(record)?` · ${esc(pairsLabel(x.quantity))}`:'';};
 const oneLine=x=>`<article class="lager-shelf-line">${inventoryThumbnail(x.itemId)}<div><strong>${esc(x.name)}</strong><small>${esc(x.code||'')} · ${esc(formatAmount(x.quantity))} ${esc(x.unit)}${pairText(x)}</small>${x.detail.full||x.detail.open?`<small>Packungen: ${x.detail.full} voll · ${x.detail.open} angebrochen${x.detail.containers.some(c=>c.opened)?` · Angebrochener Rest: ${x.detail.containers.filter(c=>c.opened).map(c=>esc(formatAmount(c.remaining))).join(' + ')} ${esc(x.unit)}`:''}</small>`:''}<a href="#/lagerhaus/items/${encodeURIComponent(room.id)}" class="lager-shelf-link">Packungen / Verbrauch verwalten</a></div></article>`;
 const tierGroups=groups.filter(g=>g.id!==f.id);
 const visualGroups=tierGroups.length?[...tierGroups,...(entries.some(x=>x.locationId===f.id)?[groups[0]]:[])]:[{id:f.id,name:'Regalfläche'}];
 const focus=`<div class="lager-focus-3d" aria-label="Vergrößertes Regal mit Fächern und realen Artikeln"><div class="lager-focus-top">${esc(f.name||'Regal')}</div><div class="lager-focus-rack">${visualGroups.map((g,index)=>{const direct=entries.filter(x=>x.locationId===g.id||(g.id===f.id&&x.locationId===f.id));return `<div class="lager-focus-tier"><div class="lager-focus-objects">${direct.length?direct.slice(0,8).map(x=>`<div class="lager-focus-box" title="${esc(x.name)}: ${esc(formatAmount(x.quantity))} ${esc(x.unit)}"><b>▣</b><span>${esc(x.name)}</span><small>${esc(formatAmount(x.quantity))} ${esc(x.unit)}${pairText(x)}</small></div>`).join(''):'<span class="lager-focus-empty">Noch frei</span>'}</div><div class="lager-focus-plank"><span>${esc(g.name)}</span></div></div>`;}).join('')}</div></div>`;
 return `<dialog id="lagerShelfPanel" class="lager-shelf-panel lager-shelf-modal" role="dialog" aria-modal="true" aria-label="Regal vergrößert: ${esc(f.name||'Regal')}" tabindex="-1"><div class="lager-shelf-inner"><div class="lager-shelf-head"><div class="lager-shelf-title"><span class="eyebrow">3D-REGAL · DETAILANSICHT</span><h2>${esc(f.name||FURNITURE[f.type]?.name||'Lagermöbel')}</h2><small>${esc(f.code||'')} · ${entries.length} Artikelpositionen</small></div><button type="button" id="lagerCloseShelf" class="secondary-button" aria-label="Regalansicht schließen"><span aria-hidden="true">✕</span><span>Schließen</span></button></div>${focus}<h3>Artikel im Regal</h3>${entries.length?groups.map(g=>{const lines=entries.filter(x=>x.locationId===g.id);return lines.length?`<div class="lager-shelf-group"><h3>${esc(g.name)}</h3>${lines.map(oneLine).join('')}</div>`:'';}).join(''):'<p class="lager-hint">In diesem Regal ist noch kein Artikel hinterlegt. Artikel im Raum werden NICHT automatisch einem Regal zugeordnet.</p>'}${roomUnassigned(room,itemRecords).filter(x=>!(room.floorObjects||[]).some(o=>o.kind==='article'&&o.itemId===x.itemId)).length?`<p class="lager-hint">📦 ${roomUnassigned(room,itemRecords).filter(x=>!(room.floorObjects||[]).some(o=>o.kind==='article'&&o.itemId===x.itemId)).length} Artikelposition(en) liegen noch direkt im Raum. Unterhalb der 3D-Skizze kannst du sie dem gewünschten Fach zuordnen.</p>`:''}<a class="secondary-button lager-shelf-manage" href="#/lagerhaus/items/${encodeURIComponent(room.id)}">▣ Artikel und Lagerorte verwalten</a></div></dialog>`;
}
function unassignedPanel(room){
 const entries=roomUnassigned(room,itemRecords).filter(x=>!(room.floorObjects||[]).some(o=>o.kind==='article'&&o.itemId===x.itemId));
 if(!entries.length)return '';
 const targets=(room.furniture||[]).flatMap(f=>[{id:f.id,label:f.name+' · direkt'},...(f.compartments||[]).map(c=>({id:c.id,label:f.name+' / '+c.name}))]);
 return `<section class="lager-unassigned" aria-label="Noch keinem Regal zugeordnet"><h2>📦 Noch nicht eingeräumt · ${entries.length}</h2><p class="lager-hint">Diese Artikel befinden sich im Raum, sind aber noch keinem Möbel/Fach zugeordnet. Sie sind nicht verloren.</p>
 ${entries.map(x=>`<div class="lager-unassigned-line">${inventoryThumbnail(x.itemId)}<div><strong>${esc(x.name)}</strong><small>${esc(formatAmount(x.quantity))} ${esc(x.unit)} · ${esc(x.code||'')}</small></div></div>`).join('')}
 ${targets.length?`<form id="lagerQuickAssign" class="lager-quick-assign"><h3>Artikel einem Regal zuordnen</h3><label>Artikel<select name="itemId">${entries.map(x=>`<option value="${esc(x.itemId)}">${esc(x.name)} · ${esc(formatAmount(x.quantity))} ${esc(x.unit)}</option>`).join('')}</select></label><label>Regal / Fach<select name="targetId">${targets.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('')}</select></label><label>Menge (bei einzeln gekennzeichneten Packungen: über Gebindeverwaltung umlagern)<input name="quantity" type="number" required min="0.001" max="1000000" step="0.001" inputmode="decimal" placeholder="z. B. 10"></label><button class="primary-button" type="submit">In Regal einräumen</button></form>`:'<p class="lager-hint">Erstelle zuerst ein Regal, damit Artikel eingeräumt werden können.</p>'}
 <a href="#/lagerhaus/items/${encodeURIComponent(room.id)}" class="lager-shelf-link">Einzelne Packungen / Geräte umlagern</a>
 </section>`;
}
function floorPanel(room){
 const selectedObj=(room.floorObjects||[]).find(o=>o.id===selectedFloor);
 const roomItems=itemRecords.filter(i=>availableArticleStock(i,room.id)>0 && !(room.floorObjects||[]).some(o=>o.kind==='article'&&o.itemId===i.id));
 const spots=(room.floorObjects||[]);
 const current=selectedObj;
 const lines=current?.kind==='zone'?zoneLines(current,itemRecords):current?.kind==='article'?itemRecords.filter(i=>i.id===current.itemId).map(i=>({itemId:i.id,name:i.name,quantity:availableArticleStock(i,room.id),unit:i.unit,code:i.code})) : [];
 return `<section class="lager-floor-chooser" aria-label="Bodenobjekte und Stellplätze"><h2>🧰 Bodenlager & freie Stellplätze <small class="lager-identifier">${spots.length} im Raum</small></h2><p class="lager-hint">Bodenobjekte sind mit vorhandenen Raumartikeln verknüpft. Der Bestand wird nie verdoppelt. Mehrere Artikel kannst du einem eigenen Bodenstellplatz zuordnen.</p>
 <form id="lagerFloorAdd" class="lager-floor-form"><label>Art der Platzierung<select name="kind" id="lagerFloorKind"><option value="article">Einzelnes Gerät / Objekt</option><option value="zone">Bodenstellplatz für mehrere Artikel</option></select></label><label id="lagerFloorModelLabel">3D-Modell<select name="model" id="lagerFloorModel">${options(Object.entries(FLOOR_MODELS).filter(([k])=>k!=='zone').map(([k,m])=>[k,`${m.emoji} ${m.name}`]),'rasenmaeher')}</select></label><label id="lagerFloorArticleLabel">Vorhandener Artikel im Raum<select name="itemId" id="lagerFloorArticle">${roomItems.map(i=>`<option value="${esc(i.id)}">${esc(i.code)} · ${esc(i.name)} (${esc(availableArticleStock(i,room.id))} ${esc(i.unit)})</option>`).join('')}</select></label><label>Bezeichnung<input name="name" id="lagerFloorName" maxlength="70" placeholder="z. B. Rasenmäher links hinten"></label><button type="submit" class="primary-button">+ Auf dem Kellerboden platzieren</button><p id="lagerFloorHint" class="lager-hint">Wähle zuerst „Artikel erfassen“ und den Raum als Lagerort, falls dein Gerät noch nicht angelegt ist.</p></form>
 ${spots.length?`<div class="lager-floor-chips">${spots.map(o=>`<button type="button" data-floor-open="${esc(o.id)}" class="secondary-button">${floorModel(o).emoji} ${esc(o.name)} <small>${esc(o.code||'')}</small></button>`).join('')}</div>`:''}
 </section>${current?`<dialog class="lager-floor-dialog" id="lagerFloorDialog" aria-label="Bodenobjekt ${esc(current.name)}" tabindex="-1"><div class="lager-floor-dialog-head"><div><span class="eyebrow">BODEN · ${esc(current.code||'')}</span><h2>${floorModel(current).emoji} ${esc(current.name)}</h2><p>${current.kind==='zone'?'Bodenstellplatz – mehrere Artikel möglich':'Verknüpftes Einzelobjekt – Lagerbestand bleibt im Raum'}</p></div><button class="secondary-button" type="button" id="lagerFloorClose">✕ Schließen</button></div><div class="lager-floor-detail"><h3>${current.kind==='zone'?'Artikel am Stellplatz':'Artikeldetails'}</h3>${lines.length?lines.map(i=>`<div class="lager-shelf-line"><span aria-hidden="true">📦</span><div><strong>${esc(i.name)}</strong><small>${esc(i.code||'')} · ${esc(formatAmount(i.quantity))} ${esc(i.unit)}</small></div></div>`).join(''):'<p class="lager-hint">Noch keine zugeordneten Artikel am Stellplatz.</p>'}${current.kind==='zone'?`<p class="lager-hint">Neue Artikel kannst du in der Artikelverwaltung direkt diesem Bodenstellplatz zuordnen.</p><form id="lagerFloorQuickMove" class="lager-floor-form"><label>Artikel aus diesem Raum<select name="itemId">${itemRecords.filter(i=>availableArticleStock(i,room.id)>0).map(i=>`<option value="${esc(i.id)}">${esc(i.name)} (${esc(availableArticleStock(i,room.id))} ${esc(i.unit)})</option>`).join('')}</select></label><label>Menge<input name="quantity" required type="number" min="0.001" step="0.001" inputmode="decimal" placeholder="z. B. 1"></label><button class="primary-button" type="submit" ${itemRecords.some(i=>availableArticleStock(i,room.id)>0)?'':'disabled'}>Bestand an diesen Stellplatz buchen</button></form>`:''}<a class="secondary-button" href="#/lagerhaus/items/${encodeURIComponent(room.id)}">▣ Artikel und Lagerorte verwalten</a></div><div class="lager-floor-manage"><label>Objekt-/Stellplatzname<input id="lagerFloorEditName" maxlength="70" value="${esc(current.name)}"></label><button type="button" class="secondary-button" id="lagerFloorSaveName">Name speichern</button><div class="lager-nudge" aria-label="Bodenobjekt verschieben"><button type="button" data-floor-move="left">←</button><button type="button" data-floor-move="up">↑</button><button type="button" data-floor-move="down">↓</button><button type="button" data-floor-move="right">→</button></div><div class="lager-actions"><button class="secondary-button" type="button" id="lagerFloorRotate">↻ 90° drehen</button><button class="secondary-button lager-delete" type="button" id="lagerFloorDelete">${current.kind==='zone'?'Leeren Stellplatz entfernen':'3D-Symbol entfernen'}</button></div><p class="lager-hint">Finger ziehen: Bodenobjekt verschieben. Drehen: 90°. Das Löschen eines 3D-Symbols löscht niemals den Artikel.</p></div></dialog>`:''}`;
}
function roomDetails(room){
 const modelCount=furnitureModelCount();
 return `${header(room.name,`${areas.find(a=>a.id===room.areaId)?.name||DEFAULT_AREA_NAME} / ${room.code} · ${TYPES[room.type]||'Lagerraum'} · ${fmtSize(room)}`)}<div class="lager-actions"><a href="#/module/lagerhaus" class="lager-text-link">← Alle Räume</a><a href="#/lagerhaus/items/${encodeURIComponent(room.id)}" class="secondary-button lager-article-link">▣ Artikel erfassen</a><a href="#/lagerhaus/navigator" class="secondary-button lager-article-link">📍 Lager-Navigator</a><button class="secondary-button" type="button" id="lagerEditRoom">Raum bearbeiten</button></div>${navigatorFocus?`<aside class="lager-l14-focus" role="status"><div><strong>📍 Ziel im 3D-Lager markiert</strong><p>${esc(navigatorFocus.label)}</p></div>${navigatorFocus.furnitureId?`<button type="button" class="secondary-button" id="lagerL14OpenShelf">Regal groß öffnen</button>`:""}</aside>`:""}<div class="lager-stage ${stageFull?'lager-stage--fullscreen':''}" id="lagerStage" style="--lager-zoom:${stageZoom};--lager-offset-x:${stageOffsetX}px;--lager-offset-y:${stageOffsetY}px"><div class="lager-stage-viewport">${roomSvg(room)}</div></div><div class="lager-stage-tools"><span>Regal oder Bodenobjekt antippen: Details · Ziehen: verschieben · Zwei Finger: Skizze zoomen</span><div class="lager-stage-buttons"><button type="button" class="secondary-button" id="lagerZoomOut" aria-label="3D-Ansicht verkleinern">−</button><button type="button" class="secondary-button" id="lagerZoomIn" aria-label="3D-Ansicht vergrößern">+</button><button type="button" class="secondary-button" id="lagerZoomReset" aria-label="Zoom zurücksetzen">1:1</button><button type="button" class="secondary-button" id="lagerFullScreen" aria-pressed="${stageFull}">${stageFull?'✕ Schließen':'⛶ Vollbild'}</button><button type="button" class="secondary-button" id="lagerToggleGrid" aria-pressed="${gridEnabled}">${gridEnabled?'▦ Raster an':'▢ Raster aus'}</button><button type="button" class="secondary-button" id="lagerUndo" ${undoByRoom.get(room.id)?.length?'':'disabled'}>↶ Rückgängig</button></div></div><p id="lagerDragStatus" class="lager-drag-status" role="status" aria-live="polite">Positionierung im 3D-Grundriss · Kollisionen werden verhindert</p>${shelfInventoryPanel(room)}${floorPanel(room)}${unassignedPanel(room)}<div class="lager-chooser"><h2>Möbelbibliothek · ${modelCount} Modelle</h2><label for="lagerFurnitureCategory">Kategorie</label><select id="lagerFurnitureCategory">${Object.entries(FURNITURE_CATEGORIES).map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select><label for="lagerFurnitureSelect">Vorgefertigtes Modell</label><select id="lagerFurnitureSelect">${options(FURNITURE_OPTIONS,'regal')}</select><div class="lager-variant-grid"><label for="lagerFurnitureSize">Größe<select id="lagerFurnitureSize">${selectionOptions(FURNITURE_SIZES,'standard')}</select></label><label for="lagerFurnitureMaterial">Material<select id="lagerFurnitureMaterial">${selectionOptions(FURNITURE_MATERIALS,'stahl')}</select></label></div><label for="lagerFurnitureName">Name (optional)</label><input id="lagerFurnitureName" maxlength="55" placeholder="z. B. Regal für Maschinen"/><div class="lager-catalog-info" id="lagerCatalogInfo" aria-live="polite"></div><button id="lagerAddFurniture" class="primary-button" type="button">+ Möbel im Raum platzieren</button><p class="lager-hint">Jedes Möbel wird separat gespeichert. Mehrere Exemplare desselben Modells sind möglich.</p></div>${fachExplorer(room)}${furniturePanel(room)}${compartmentPanel(room)}<div class="lager-room-footer"><p>15 Möbelmodelle und Bodenlager. Eigene Möbel frei konstruieren und erweiterte 3D-Steuerung folgen erst in den letzten Updates. Artikelkarten und Bestandsbuchungen mit mehreren Lagerorten sind über „Meine Artikel“ verfügbar.</p><button type="button" id="lagerDeleteRoom" class="secondary-button lager-delete">Diesen Raum löschen</button></div><p class="lager-status" id="lagerStatus" role="status" aria-live="polite">${esc(message)}</p>`;
}

async function saveRoomItem(roomId,fn){try{await mutate(data=>{const room=data.find(x=>x.id===roomId);if(!room)throw new Error('Raum nicht gefunden.');const before=JSON.stringify({furniture:room.furniture||[],floorObjects:room.floorObjects||[]});fn(room);if(JSON.stringify({furniture:room.furniture||[],floorObjects:room.floorObjects||[]})!==before)putUndo(roomId,before);room.updatedAt=new Date().toISOString();});const room=rooms.find(x=>x.id===roomId);if(room&&document.getElementById('lagerRoomContent')){renderRoom(room);setStatus('Änderung gespeichert.');}}catch(err){setStatus('Speichern fehlgeschlagen: '+err.message);}}
function renderRoom(room){const el=document.getElementById('lagerRoomContent');if(!el)return;el.innerHTML=roomDetails(room);enhanceRoomUi(el,{selected:!!selected,selectedCompartment:!!selectedCompartment});const stage=el.querySelector('#lagerStage');
 const viewport=stage.querySelector('.lager-stage-viewport');
 const syncView=()=>{stage.style.setProperty('--lager-zoom',String(stageZoom));stage.style.setProperty('--lager-offset-x',stageOffsetX+'px');stage.style.setProperty('--lager-offset-y',stageOffsetY+'px');};
 const zoomBy=d=>{stageZoom=Math.max(1,Math.min(3.8,Math.round((stageZoom+d)*100)/100));syncView();};
 el.querySelector('#lagerL14OpenShelf')?.addEventListener('click',()=>{inventoryFurniture=navigatorFocus?.furnitureId||null;renderRoom(room);});
 el.querySelector('#lagerZoomIn')?.addEventListener('click',()=>zoomBy(.2));
 el.querySelector('#lagerZoomOut')?.addEventListener('click',()=>zoomBy(-.2));
 el.querySelector('#lagerZoomReset')?.addEventListener('click',()=>{stageZoom=1;stageOffsetX=0;stageOffsetY=0;syncView();});
 el.querySelector('#lagerFullScreen')?.addEventListener('click',()=>{stageFull=!stageFull;renderRoom(room);});
 const shelfModal=el.querySelector('#lagerShelfPanel');
 if(shelfModal){
  // A native modal dialog uses the browser top layer. It cannot be covered by
  // the app header (the previous fixed panel was trapped in main's z-index).
  // showModal() also isolates the app controls below the open shelf.
  const closeShelf=()=>{
   if(!shelfModal.open)return;
   shelfModal.close();
   inventoryFurniture=null;
   // When launched from a room preview, clear the deep-link shelf segment.
   // Otherwise refresh the room in place without changing navigation history.
   const shelfRoute=roomLink(room.id)+'/shelf/';
   if(location.hash.startsWith(shelfRoute))location.hash=roomLink(room.id);
   else renderRoom(room);
  };
  el.querySelector('#lagerCloseShelf')?.addEventListener('click',closeShelf);
  shelfModal.addEventListener('cancel',e=>{e.preventDefault();closeShelf();});
  shelfModal.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
  shelfModal.showModal();
 }
 const floorDialog=el.querySelector('#lagerFloorDialog');
 if(floorDialog){
  const close=()=>{if(floorDialog.open)floorDialog.close();selectedFloor=null;renderRoom(room);};
  el.querySelector('#lagerFloorClose')?.addEventListener('click',close);
  floorDialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  floorDialog.showModal();
  const floorId=selectedFloor;
  const editFloor=fn=>saveRoomItem(room.id,r=>{const f=(r.floorObjects||[]).find(x=>x.id===floorId);if(!f)throw Error('Bodenobjekt nicht gefunden.');fn(f,r);});
  el.querySelector('#lagerFloorSaveName')?.addEventListener('click',()=>editFloor(f=>{const name=el.querySelector('#lagerFloorEditName').value.trim();if(!name||name.length>70)throw Error('Bitte einen Namen bis 70 Zeichen eingeben.');f.name=name;}));
  el.querySelector('#lagerFloorRotate')?.addEventListener('click',()=>editFloor((f,r)=>{const rot=((f.rot||0)+1)%4;if(!placementValid({...f,rot},[...r.furniture,...r.floorObjects]))throw Error('Drehen nicht möglich: Platz belegt.');f.rot=rot;}));
  el.querySelectorAll('[data-floor-move]').forEach(b=>b.addEventListener('click',()=>editFloor((f,r)=>{const direction=b.dataset.floorMove;const dx=direction==='left'?-1:direction==='right'?1:0,dz=direction==='up'?-1:direction==='down'?1:0;const pos=constrainedPosition(f,[...r.furniture,...r.floorObjects],f.x+dx*GRID_STEP,f.z+dz*GRID_STEP);if(!pos.valid)throw Error('Zielplatz belegt oder außerhalb des Raums.');f.x=pos.x;f.z=pos.z;})));
  el.querySelector('#lagerFloorDelete')?.addEventListener('click',()=>{if(!confirm('Nur das Bodenobjekt / den leeren Stellplatz entfernen? Der Artikelbestand bleibt erhalten.'))return;editFloor((f,r)=>{if(f.kind==='zone')assertNodeHasNoItems(itemRecords,'floor',f);r.floorObjects=r.floorObjects.filter(o=>o.id!==floorId);selectedFloor=null;});});
  el.querySelector('#lagerFloorQuickMove')?.addEventListener('submit',async e=>{
   e.preventDefault();const form=e.currentTarget,fields=Object.fromEntries(new FormData(form).entries());
   const button=form.querySelector('[type="submit"]');button.disabled=true;
   try{
    await mutateModuleValues('lagerhaus',[KEY,AREAS_KEY,ITEM_KEY,MOVEMENT_KEY],values=>{
     const freshRooms=Array.isArray(values[KEY])?values[KEY]:[],all=Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[];
     const target=freshRooms.find(x=>x.id===room.id)?.floorObjects?.find(x=>x.id===floorId);
     if(!target||target.kind!=='zone')throw Error('Bodenstellplatz nicht mehr vorhanden.');
     const idx=all.findIndex(i=>i.id===fields.itemId);if(idx<0)throw Error('Artikel nicht gefunden.');
     const locations=new Set(locationChoices(freshRooms,Array.isArray(values[AREAS_KEY])?values[AREAS_KEY]:[]).map(c=>c.id));
     const out=bookStock(all[idx],{type:'transfer',fromId:room.id,toId:floorId,quantity:fields.quantity,unitMode:'units'},locations,{makeId:newId});
     const next=all.slice();next[idx]=out.item;const history=Array.isArray(values[MOVEMENT_KEY])?values[MOVEMENT_KEY]:[];
     return [[ITEM_KEY,next],[MOVEMENT_KEY,[...history,out.event].slice(-3000)]];
    });await loadState();const fresh=rooms.find(r=>r.id===room.id);if(fresh)renderRoom(fresh);setStatus('Bestand ohne Verdopplung auf den Bodenstellplatz umgebucht.');
   }catch(err){setStatus('Bodenbuchung fehlgeschlagen: '+err.message);button.disabled=false;}
  });
 }
 const floorForm=el.querySelector('#lagerFloorAdd');
 const floorKind=el.querySelector('#lagerFloorKind');
 floorKind?.addEventListener('change',()=>{const zone=floorKind.value==='zone';el.querySelector('#lagerFloorModelLabel').hidden=zone;el.querySelector('#lagerFloorArticleLabel').hidden=zone;el.querySelector('#lagerFloorHint').textContent=zone?'Lege eine Bodenfläche an und buche dort mehrere Artikel ein.':'Wähle einen bestehenden Artikel, der bereits direkt in diesem Raum liegt.';});
 floorForm?.addEventListener('submit',async e=>{
  e.preventDefault();const fields=Object.fromEntries(new FormData(floorForm).entries());
  const kind=fields.kind==='zone'?'zone':'article',model=kind==='zone'?'zone':fields.model;
  if(!Object.hasOwn(FLOOR_MODELS,model))return setStatus('Unbekanntes Bodenmodell.');
  const article=itemRecords.find(i=>i.id===fields.itemId);
  if(kind==='article'&&(!article||availableArticleStock(article,room.id)<=0))return setStatus('Bitte zuerst einen Artikel direkt in diesem Raum erfassen oder einlagern.');
  const name=(fields.name||'').trim()||(kind==='zone'?'Bodenstellplatz':article?.name||FLOOR_MODELS[model].name);
  await saveRoomItem(room.id,r=>{
   r.floorObjects ||= [];
   if(r.floorObjects.length>=FLOOR_MAX)throw Error('Maximal 100 Bodenobjekte pro Raum.');
   if(kind==='article'&&r.floorObjects.some(o=>o.kind==='article'&&o.itemId===article.id))throw Error('Dieser Artikel steht bereits als Bodenobjekt im Raum.');
   const entry={id:newId(),kind,model,itemId:kind==='article'?article.id:null,name:name.slice(0,70),x:0,z:0,rot:0,createdAt:new Date().toISOString()};
   const place=firstFreeSpot(entry,[...r.furniture,...r.floorObjects]);if(!place)throw Error('Kein freier Stellplatz im schematischen Raum.');
   Object.assign(entry,place);cleanFloorObject(entry);r.floorObjects.push(entry);selectedFloor=entry.id;selected=null;inventoryFurniture=null;
  });
 });
 el.querySelectorAll('[data-floor-open]').forEach(b=>b.addEventListener('click',()=>{selectedFloor=b.dataset.floorOpen;selected=null;inventoryFurniture=null;renderRoom(room);}));
 const trackedTouches=new Map();let pinch=null,pan=null,drag=null,pinchUsed=false;
 const distance=()=>{const [a,b]=[...trackedTouches.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
 // Native page pinch/scroll is disabled ONLY over the 3D stage, not over the app.
 stage.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
 stage.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  if(trackedTouches.size===0)pinchUsed=false;
  trackedTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(trackedTouches.size>=2){
   pinch={distance:distance(),zoom:stageZoom};drag=null;pan=null;pinchUsed=true;
  }else if(!e.target.closest?.('[data-furniture],[data-floor],[data-compartment-id]')){
   pan={pointerId:e.pointerId,x:e.clientX,y:e.clientY,offsetX:stageOffsetX,offsetY:stageOffsetY};
  }
 },true);
 stage.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch'||!trackedTouches.has(e.pointerId))return;
  trackedTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&trackedTouches.size>=2){
   e.preventDefault();stageZoom=Math.max(1,Math.min(3.8,pinch.zoom*distance()/Math.max(1,pinch.distance)));
   syncView();return;
  }
  if(pan&&pan.pointerId===e.pointerId&&!pinchUsed){
   e.preventDefault();
   const limitX=Math.max(0,stage.clientWidth*(stageZoom-1)/2+35);
   const limitY=Math.max(0,stage.clientHeight*(stageZoom-1)/2+35);
   stageOffsetX=Math.max(-limitX,Math.min(limitX,pan.offsetX+e.clientX-pan.x));
   stageOffsetY=Math.max(-limitY,Math.min(limitY,pan.offsetY+e.clientY-pan.y));syncView();
  }
 },true);
 const releaseTouch=e=>{
  if(e.pointerType!=='touch')return;
  trackedTouches.delete(e.pointerId);
  if(pan?.pointerId===e.pointerId)pan=null;
  if(trackedTouches.size<2)pinch=null;
 };
 stage.addEventListener('pointerup',releaseTouch,true);
 stage.addEventListener('pointercancel',releaseTouch,true);
 const dragMessage=el.querySelector('#lagerDragStatus');
 const chooseFach=id=>{
  const c=fachCards([room],itemRecords).find(c=>c.id===id);if(!c)return;
  selected=c.furnitureId;selectedCompartment=id;renderRoom(room);
  document.querySelector('#lagerFachBooking')?.scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 const search=el.querySelector('#lagerFachSuche');
 search?.addEventListener('input',e=>{
  fachQuery=e.target.value;
  el.querySelectorAll('[data-fach-select]').forEach(b=>{const c=fachCards([room],itemRecords).find(x=>x.id===b.dataset.fachSelect);b.hidden=!matchFach(c?[c]:[],fachQuery).length;});
  // Keep input focus stable instead of replacing the entire DOM while typing.
 });
 el.querySelectorAll('[data-fach-select]').forEach(b=>b.addEventListener('click',()=>chooseFach(b.dataset.fachSelect)));
 const fachForm=el.querySelector('#lagerFachBooking');
 fachForm?.elements.namedItem('operation')?.addEventListener('change',e=>{el.querySelector('#lagerFachZielLabel').hidden=e.target.value!=='transfer';});
 fachForm?.addEventListener('submit',async event=>{
  event.preventDefault();const btn=fachForm.querySelector('[type="submit"]');btn.disabled=true;
  const data=Object.fromEntries(new FormData(fachForm).entries());
  try{
   await mutateModuleValues('lagerhaus',[KEY,AREAS_KEY,ITEM_KEY,MOVEMENT_KEY],values=>{
    const freshRooms=Array.isArray(values[KEY])?values[KEY]:[];
    const freshAreas=Array.isArray(values[AREAS_KEY])?values[AREAS_KEY]:[];
    const existing=Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[];
    const history=Array.isArray(values[MOVEMENT_KEY])?values[MOVEMENT_KEY]:[];
    const out=fachBooking(existing,freshRooms,freshAreas,{fachId:selectedCompartment,...data},{makeId:newId});
    return [[ITEM_KEY,out.items],[MOVEMENT_KEY,[...history,out.event].slice(-3000)]];
   });
   await loadState();const fresh=rooms.find(r=>r.id===room.id);
   if(fresh){renderRoom(fresh);setStatus('Fachbuchung gespeichert – Artikelbestand aktualisiert.');}
  }catch(err){setStatus('Fachbuchung fehlgeschlagen: '+err.message);btn.disabled=false;}
 });
 el.querySelector('#lagerQuickAssign')?.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;const btn=form.querySelector('[type="submit"]');btn.disabled=true;
  const input=Object.fromEntries(new FormData(form).entries());
  try{await mutateModuleValues('lagerhaus',[KEY,AREAS_KEY,ITEM_KEY,MOVEMENT_KEY],values=>{
   const all=Array.isArray(values[KEY])?values[KEY]:[];
   const current=Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[];
   const place=new Set(locationChoices(all,Array.isArray(values[AREAS_KEY])?values[AREAS_KEY]:[]).map(c=>c.id));
   if(!place.has(input.targetId))throw new Error('Zielfach nicht mehr vorhanden.');
   const at=current.findIndex(i=>i.id===input.itemId);if(at<0)throw new Error('Artikel nicht gefunden.');
   if(!stockPositions(current[at]).some(x=>x.locationId===room.id))throw new Error('Artikel liegt nicht mehr im gewählten Raum.');
   const out=bookStock(current[at],{type:'transfer',fromId:room.id,toId:input.targetId,quantity:input.quantity,unitMode:'units'},place,{makeId:newId});
   const next=current.slice();next[at]=out.item;
   const history=Array.isArray(values[MOVEMENT_KEY])?values[MOVEMENT_KEY]:[];
   return [[ITEM_KEY,next],[MOVEMENT_KEY,[...history,out.event].slice(-3000)]];
  });await loadState();const fresh=rooms.find(r=>r.id===room.id);if(fresh)renderRoom(fresh);setStatus('Artikel wurde in das Regal eingebucht.');
  }catch(error){btn.disabled=false;setStatus('Einräumen: '+error.message);}
 });
 const identify=e=>e.target.closest?.('[data-furniture],[data-floor]');
 stage.addEventListener('click',e=>{const c=e.target.closest?.('[data-compartment-id]');if(c){e.stopImmediatePropagation();chooseFach(c.dataset.compartmentId);}},true);
 stage.addEventListener('keydown',e=>{const c=e.target.closest?.('[data-compartment-id]');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();chooseFach(c.dataset.compartmentId);}},true);
 stage.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.pointerType==='mouse')return;
  if(e.target.closest?.('[data-compartment-id]')||pinch||pinchUsed||trackedTouches.size>=2)return;
  const g=identify(e);if(!g)return;
  const floorId=g.dataset.floor;const item=floorId?(room.floorObjects||[]).find(f=>f.id===floorId):room.furniture?.find(f=>f.id===g.dataset.furniture);if(!item)return;
  if(floorId){selectedFloor=item.id;selected=null;}else{selected=item.id;selectedFloor=null;}
  const bounds=stage.querySelector('svg')?.getBoundingClientRect();
  if(!bounds?.width)return;
  drag={id:item.id,isFloor:!!floorId,pointerId:e.pointerId,fromX:e.clientX,fromY:e.clientY,
    x:Number(item.x)||0,z:Number(item.z)||0,moved:false,valid:true,
    factor:440/bounds.width,preview:null};
  stage.setPointerCapture?.(e.pointerId);
 });
 stage.addEventListener('pointermove',e=>{
  if(pinch)return;
  if(!drag||drag.pointerId!==e.pointerId)return;
  const movement=Math.hypot(e.clientX-drag.fromX,e.clientY-drag.fromY);
  if(!drag.moved&&movement<8)return;
  drag.moved=true;e.preventDefault();
  const src=drag.isFloor?(room.floorObjects||[]).find(f=>f.id===drag.id):room.furniture.find(f=>f.id===drag.id);
  if(!src)return;
  const delta=pointerToGridDelta((e.clientX-drag.fromX)*drag.factor,(e.clientY-drag.fromY)*drag.factor);
  const pos=constrainedPosition(src,[...room.furniture,...(room.floorObjects||[])],drag.x+delta.x,drag.z+delta.z);
  drag.preview=pos;drag.valid=pos.valid;
  const ghost={...room,furniture:room.furniture.map(f=>f.id===drag.id?{...f,x:pos.x,z:pos.z}:f),floorObjects:(room.floorObjects||[]).map(f=>f.id===drag.id?{...f,x:pos.x,z:pos.z}:f)};
  viewport.innerHTML=roomSvg(ghost);
  const target=stage.querySelector('[data-furniture="'+drag.id+'"],[data-floor="'+drag.id+'"]');
  target?.classList.toggle('room-object--invalid',!pos.valid);
  dragMessage.textContent=pos.valid?'Freier Platz – zum Speichern loslassen':'Platz belegt oder Objekt überschneidet ein anderes Möbel.';
 });
 const finish=async e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  const ended=drag;drag=null;
  if(!ended.moved){if(ended.isFloor){selectedFloor=ended.id;inventoryFurniture=null;}else{selected=ended.id;inventoryFurniture=ended.id;}renderRoom(room);return;}
  if(!ended.preview||!ended.valid){renderRoom(room);setStatus('Objekt nicht verschoben: Der Zielplatz ist belegt.');return;}
  if(ended.preview.x===ended.x&&ended.preview.z===ended.z){renderRoom(room);return;}
  await saveRoomItem(room.id,r=>{
   const f=ended.isFloor?(r.floorObjects||[]).find(x=>x.id===ended.id):r.furniture.find(x=>x.id===ended.id);
   if(!f)throw new Error('Möbel nicht gefunden.');
   const cand={...f,x:ended.preview.x,z:ended.preview.z};
   if(!placementValid(cand,[...r.furniture,...(r.floorObjects||[])]))throw new Error('Zielplatz inzwischen belegt.');
   f.x=cand.x;f.z=cand.z;
  });
 };
 stage.addEventListener('pointerup',finish);
 stage.addEventListener('pointercancel',e=>{if(drag&&drag.pointerId===e.pointerId){drag=null;renderRoom(room);}});
 stage.addEventListener('click',e=>{if(e.detail===0||pinch||pinchUsed)return;const g=identify(e);if(!g)return;if(g.dataset.floor){selectedFloor=g.dataset.floor;selected=null;inventoryFurniture=null;}else{selected=g.dataset.furniture;selectedFloor=null;inventoryFurniture=selected;}renderRoom(room);});
 stage.addEventListener('keydown',e=>{const g=identify(e);if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(g.dataset.floor){selectedFloor=g.dataset.floor;selected=null;inventoryFurniture=null;}else{selected=g.dataset.furniture;selectedFloor=null;inventoryFurniture=selected;}renderRoom(room);}});
 // L04 compartment controls – all edits persisted together with the rooms array.
 el.querySelector('#lagerCompartmentForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const name=el.querySelector('#lagerNewCompName').value.trim();const kind=el.querySelector('#lagerNewCompKind').value;
  if(!name){setStatus('Bitte eine Fachbezeichnung eingeben.');return;}
  await saveRoomItem(room.id,(allRoom)=>{
   const f=allRoom.furniture.find(f=>f.id===selected);if(!f)throw new Error('Möbel nicht gefunden.');
   if(f.compartments.length>=30)throw new Error('Maximal 30 Fächer pro Möbel.');
   f.compartments.push(newCompartment(name,kind,rooms,areas));
  });
 });
 el.querySelector('#lagerCreateDefaults')?.addEventListener('click',()=>saveRoomItem(room.id,r=>{
  const f=r.furniture.find(f=>f.id===selected);if(!f)throw new Error('Möbel nicht gefunden.');
  if(f.compartments.length)throw new Error('Standardaufteilung nur bei leeren Möbeln möglich.');
  // Allocate codes against the current data and newly inserted siblings.
  const used=getAllCodes(rooms,areas);
  for(const {name,kind} of defaultCompartmentLabels(f)){
   f.compartments.push({id:newId(),code:allocateCode('F',used),name,kind,createdAt:new Date().toISOString()});
  }
 }));
 el.querySelectorAll('[data-comp-save]').forEach(b=>b.addEventListener('click',()=>{
  const compId=b.dataset.compSave;const input=el.querySelector(`[data-comp="${compId}"] [data-comp-name]`);
  const value=input?.value.trim();if(!value){setStatus('Bitte einen gültigen Fachnamen eingeben.');return;}
  saveRoomItem(room.id,r=>{const f=r.furniture.find(x=>x.id===selected);const c=f?.compartments?.find(x=>x.id===compId);if(!c)throw new Error('Fach nicht gefunden.');c.name=value.slice(0,55);});
 }));
 el.querySelectorAll('[data-comp-delete]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.compDelete;
  if(!confirm('Dieses leere Fach endgültig entfernen?'))return;
  saveRoomItem(room.id,r=>{const f=r.furniture.find(x=>x.id===selected);if(!f)throw new Error('Möbel fehlt.');const comp=f.compartments.find(c=>c.id===id);if(comp)assertNodeHasNoItems(itemRecords,'compartment',comp);f.compartments=f.compartments.filter(c=>c.id!==id);});
 }));
 el.querySelectorAll('[data-comp-move]').forEach(b=>b.addEventListener('click',async()=>{
  const id=b.dataset.compMove;const selectTarget=el.querySelector(`[data-comp-target="${id}"]`);const dest=selectTarget?.value;
  if(!dest)return;
  try{await mutate(data=>{relocateCompartment(data,id,dest);});
   const refreshed=rooms.find(r=>r.id===room.id);if(refreshed)renderRoom(refreshed);
   setStatus('Fach ohne Datenverlust verschoben; Kennung bleibt erhalten.');
  }catch(err){setStatus('Verschieben fehlgeschlagen: '+err.message);}
 }));
 el.querySelector('#lagerMoveFurniture')?.addEventListener('click',async()=>{
  const target=el.querySelector('#lagerFurnitureMoveTarget')?.value;if(!target||target===room.id)return;
  try{await mutate(data=>{
   const source=data.find(r=>r.id===room.id),dest=data.find(r=>r.id===target);
   const idx=source?.furniture.findIndex(f=>f.id===selected);if(idx<0||!dest)throw new Error('Zielraum oder Möbel fehlt.');
   const furniture=source.furniture[idx];if(dest.furniture.length>=80)throw new Error('Zielraum enthält schon 80 Möbel.');
   const where=firstFreeSpot(furniture,[...dest.furniture,...(dest.floorObjects||[])]);if(!where)throw new Error('Im Zielraum ist kein freier Platz.');
   source.furniture.splice(idx,1);dest.furniture.push({...furniture,x:where.x,z:where.z});
   source.updatedAt=new Date().toISOString();dest.updatedAt=new Date().toISOString();
  });selected=null;const fresh=rooms.find(r=>r.id===room.id);if(fresh)renderRoom(fresh);setStatus('Möbel mitsamt allen Fächern in den Zielraum verschoben.');
  }catch(err){setStatus('Umzug fehlgeschlagen: '+err.message);}
 });
 el.querySelector('#lagerToggleGrid').addEventListener('click',()=>{gridEnabled=!gridEnabled;renderRoom(room);});
 el.querySelector('#lagerUndo').addEventListener('click',async()=>{
  const stack=undoByRoom.get(room.id);
  if(!stack?.length)return;
  const last=stack[stack.length-1];
  try{await mutate(all=>{const current=all.find(r=>r.id===room.id);if(!current)throw new Error('Raum fehlt.');const previous=JSON.parse(last);current.furniture=previous.furniture;current.floorObjects=previous.floorObjects;current.updatedAt=new Date().toISOString();});stack.pop();const fresh=rooms.find(r=>r.id===room.id);if(fresh){if(!fresh.furniture.some(f=>f.id===selected))selected=null;if(!(fresh.floorObjects||[]).some(o=>o.id===selectedFloor))selectedFloor=null;renderRoom(fresh);}setStatus('Letzte Möbeländerung rückgängig gemacht.');}catch(err){setStatus('Rückgängig fehlgeschlagen: '+err.message);}
 });
 const category=el.querySelector('#lagerFurnitureCategory');const model=el.querySelector('#lagerFurnitureSelect');const size=el.querySelector('#lagerFurnitureSize');const material=el.querySelector('#lagerFurnitureMaterial');const name=el.querySelector('#lagerFurnitureName');const info=el.querySelector('#lagerCatalogInfo');
 const syncModel=()=>{const proto=FURNITURE[model.value];if(!proto)return;material.value=proto.material;syncInfo();};
 const syncInfo=()=>{const v=furnitureVariant({type:model.value,variantSize:size.value,material:material.value});info.textContent=`${v.model.name} · ${v.dimensions.join(' × ')} m · ${FURNITURE_MATERIALS[v.material].name}`;};
 category.addEventListener('change',()=>{const all=Object.entries(FURNITURE).filter(([key,m])=>category.value==='alle'||m.category===category.value);model.innerHTML=options(all.map(([key,m])=>[key,m.name]),all[0]?.[0]);syncModel();});
 model.addEventListener('change',syncModel);size.addEventListener('change',syncInfo);material.addEventListener('change',syncInfo);syncInfo();
 el.querySelector('#lagerAddFurniture').addEventListener('click',()=>{const type=model.value;if(!FURNITURE[type])return;const variantSize=size.value;const itemMaterial=material.value;const itemName=name.value.trim()||FURNITURE[type].name;saveRoomItem(room.id,r=>{r.furniture ||= [];if(r.furniture.length>=80)throw new Error('Pro Raum sind maximal 80 Möbel vorgesehen.');const entry={id:newId(),type,name:itemName.slice(0,55),variantSize,material:itemMaterial,x:0,z:0,rot:0};const place=firstFreeSpot(entry,[...r.furniture,...(r.floorObjects||[])]);if(!place)throw new Error('Kein freier Platz für dieses Möbel.');entry.x=place.x;entry.z=place.z;r.furniture.push(entry);selected=entry.id;});});
 el.querySelector('#lagerSaveFurniture')?.addEventListener('click',()=>{const value=el.querySelector('#lagerEditFurnitureName').value.trim();const variantSize=el.querySelector('#lagerEditFurnitureSize').value;const itemMaterial=el.querySelector('#lagerEditFurnitureMaterial').value;if(!value){setStatus('Bitte eine Bezeichnung eingeben.');return;}saveRoomItem(room.id,r=>{const f=r.furniture.find(x=>x.id===selected);if(!f)throw new Error('Möbel nicht gefunden.');f.name=value.slice(0,55);f.variantSize=variantSize in FURNITURE_SIZES?variantSize:'standard';f.material=itemMaterial in FURNITURE_MATERIALS?itemMaterial:FURNITURE[f.type]?.material||'stahl';if(!placementValid(f,[...r.furniture,...(r.floorObjects||[])]))throw new Error('Diese Möbelgröße überschneidet ein anderes Möbel oder die Raumwand.');});});
 el.querySelector('#lagerRotate')?.addEventListener('click',()=>saveRoomItem(room.id,r=>{const a=r.furniture.find(f=>f.id===selected);if(a){a.rot=((a.rot||0)+1)%4;if(!placementValid(a,[...r.furniture,...(r.floorObjects||[])]))throw new Error('Drehen nicht möglich: Zu wenig Platz.');}}));
 el.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>saveRoomItem(room.id,r=>{const f=r.furniture.find(x=>x.id===selected);if(!f)return;const dir=b.dataset.move;const dx=dir==='left'?-1:dir==='right'?1:0;const dz=dir==='up'?-1:dir==='down'?1:0;const pos=constrainedPosition(f,[...r.furniture,...(r.floorObjects||[])],Number(f.x)+dx*GRID_STEP,Number(f.z)+dz*GRID_STEP);if(!pos.valid)throw new Error('Platz belegt oder außerhalb der Raumgrenzen.');f.x=pos.x;f.z=pos.z;})));
 el.querySelector('#lagerDeleteFurniture')?.addEventListener('click',()=>{if(!confirm('Dieses Lagermöbel aus dem Raum entfernen?'))return;saveRoomItem(room.id,r=>{const target=r.furniture.find(f=>f.id===selected);if(target)assertNodeHasNoItems(itemRecords,'furniture',target);if(target?.compartments?.length)throw new Error('Möbel enthält Fächer. Bitte zuerst die Fächer verschieben oder entfernen.');r.furniture=r.furniture.filter(f=>f.id!==selected);selected=null;});});
 el.querySelector('#lagerEditRoom').addEventListener('click',()=>{editId=room.id;formVisible=true;location.hash='#/module/lagerhaus';});
 el.querySelector('#lagerDeleteRoom').addEventListener('click',async()=>{if(!confirm(`Raum „${room.name}“ mit allen darin platzierten Möbeln endgültig löschen?`))return;try{await mutate(data=>{const idx=data.findIndex(r=>r.id===room.id);if(idx<0)throw new Error('Raum nicht gefunden.');assertNodeHasNoItems(itemRecords,'room',data[idx]);if(data[idx].furniture?.some(f=>f.compartments?.length))throw new Error('Raum enthält Fächer. Möbel und Fächer zuerst verschieben.');data.splice(idx,1);});selected=null;location.hash='#/module/lagerhaus';}catch(err){setStatus('Löschen fehlgeschlagen: '+err.message);}});
}
export async function mountLagerraum(roomId,shelfId='',focusId='',compartmentId=''){selected=null;selectedFloor=null;selectedCompartment=null;inventoryFurniture=shelfId||null;navigatorFocus=null;resetCompactRoomUi();stageFull=false;stageZoom=1.17;stageOffsetX=0;stageOffsetY=0;fachQuery='';try{await loadState();if(!document.getElementById('lagerRoomContent'))return;const room=rooms.find(r=>r.id===roomId);if(!room){document.getElementById('lagerRoomContent').innerHTML=`${header('Raum nicht gefunden','Der Lagerraum wurde möglicherweise gelöscht.')}<a class="lager-text-link" href="#/module/lagerhaus">← Zur Raumübersicht</a>`;return;}if(focusId){const f=(room.furniture||[]).find(x=>x.id===focusId);if(f){selected=f.id;const c=(f.compartments||[]).find(x=>x.id===compartmentId);selectedCompartment=c?.id||null;navigatorFocus={furnitureId:f.id,label:[room.name,f.name,...(c?[c.name]:[])].join(' / ')};}}renderRoom(room);}catch(err){const el=document.getElementById('lagerRoomContent');if(el)el.textContent='Lagerdaten nicht verfügbar: '+err.message;}}
