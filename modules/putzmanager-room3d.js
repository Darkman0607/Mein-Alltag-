import {renderArchitectural3DSVG} from './putzmanager-architecture.js';
/** W01.1 – Private, offline-capable isometric 3D room renderer and safe scene importer.
 * File format: mein-alltag-raum3d/v1 (declarative JSON, NO executable content).
 * Room models are stored in the existing per-module IndexedDB store, never bundled with app code.
 */
import {OBJECT_TYPES} from './putzmanager-data.js';
const FORMAT='mein-alltag-raum3d';
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const text=(value,len=60)=>typeof value==='string'?value.trim().slice(0,len):'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wallNames=['north','south','west','east'];
const defaults=Object.freeze({wc:[.62,.76,.72],waschbecken:[.65,.46,.83],dusche:[.9,.9,1.82],wanne:[1.6,.75,.65],spiegel:[.65,.1,1.45],schrank:[.9,.47,1.58],waschmaschine:[.65,.65,.9],spuele:[.75,.61,.9],herd:[.65,.65,.86],kuehlschrank:[.7,.7,1.85],arbeitsplatte:[1.4,.65,.89],tisch:[1.1,.7,.75],sofa:[1.65,.85,.83],bett:[1.8,2,.52],regal:[.8,.42,1.75],unterschrank:[.6,.6,.9],oberschrank:[.45,.65,.65],geschirrspueler:[.6,.6,.86],backofen:[.6,.6,.86],stuhl:[.55,.55,.9],heizkoerper:[.15,1,.7],muelleimer:[.38,.38,.52],dunstabzug:[.5,.6,.5],sonst:[.8,.6,.84]});
const colors={wc:'#e5f9fa',waschbecken:'#92d9f0',dusche:'#75e2d9',wanne:'#96c3f2',spiegel:'#8dd8ee',schrank:'#bf926b',waschmaschine:'#b5cbd0',spuele:'#83c1cf',herd:'#74818a',kuehlschrank:'#c9dadd',arbeitsplatte:'#c68e61',tisch:'#b98261',sofa:'#6dbf96',bett:'#9da7ef',regal:'#b38f6d',sonst:'#e9b970'};
/** W02: generic narrow-kitchen layout reflecting user's verbal arrangement (not the actual private photos or precise room data).
 * Copy ONLY after a local confirmation; do not silently overwrite a previously saved sketch.
 */
export function createKitchenTemplate(){
 const objects=[];
 const add=(type,name,x,z,width,depth,height,baseY=0)=>objects.push({type,name,x,z,width,depth,height,baseY,rotation:0});
 // View from the entrance (south): complete kitchenette RIGHT, fridge at the rear window.
 add('kuehlschrank','Kühl-Gefrierkombi hinten beim Fenster',2.47,.41,.65,.68,2.19);
 add('unterschrank','Unterschrank Kaffeeecke',2.50,1.20,.58,.61,.87);
 add('herd','Herd und Backofen',2.50,1.91,.58,.66,.88);
 add('geschirrspueler','Geschirrspüler – Mitte der Küchenzeile',2.50,2.64,.58,.62,.87);
 add('spuele','Abwasch links vom Geschirrspüler',2.50,3.33,.58,.65,.88);
 add('unterschrank','Schubladenschrank am Eingang',2.50,4.10,.58,.59,.87);
 add('oberschrank','Heller Oberschrank vorne',2.59,3.86,.43,.84,.63,1.67);
 add('oberschrank','Heller Oberschrank Mitte',2.59,2.62,.43,.83,.63,1.67);
 add('oberschrank','Heller Oberschrank hinten',2.59,1.51,.43,.72,.63,1.67);
 // Opposite side: fixed dining table and chair(s). Left of entrance: shelving.
 add('tisch','Fixer Esstisch gegenüber',.74,2.28,1.25,1.05,.77);
 add('stuhl','Stuhl beim Esstisch',.72,1.44,.54,.54,.91);
 add('stuhl','Stuhl am Eingang',.65,3.07,.54,.54,.91);
 add('regal','Regal links beim Eingang',.30,4.12,.50,.66,1.82);
 add('muelleimer','Abfalleimer beim Fenster',.31,.46,.38,.41,.57);
 add('heizkoerper','Heizkörper unter dem Fenster',1.42,.15,.18,.26,.69);
 return validate3DScene({format:FORMAT,schemaVersion:1,name:'Küche – optische Vorlage',unit:'m',room:{width:2.85,depth:4.5,height:2.58},doors:[{wall:'south',offset:.93,width:.85}],windows:[{wall:'north',offset:.67,width:1.4,sill:.94,height:1.2}],objects,note:'Unpersönliche unvermessene Küchenvorlage: Zeile rechts, Kühlschrank hinten, Spüler mittig, Spüle links davon, Tisch und Regal gegenüber. Nach Bedarf verschieben.'});
}
export const SAMPLE_3D_ROOM=Object.freeze({format:FORMAT,schemaVersion:1,name:'BEISPIEL – frei erfundener Raum',unit:'m',room:{width:3.8,depth:3.1,height:2.45},doors:[{wall:'south',offset:.35,width:.9}],windows:[{wall:'north',offset:1.15,width:1.3,sill:1.05,height:1.05}],objects:[{type:'waschbecken',name:'Beispiel-Waschbecken',x:.52,z:.7,width:.65,depth:.46,height:.83,rotation:0},{type:'dusche',name:'Beispiel-Dusche',x:3.05,z:.62,width:.9,depth:.9,height:1.82,rotation:0},{type:'wc',name:'Beispiel-WC',x:1.95,z:2.45,width:.62,depth:.76,height:.72,rotation:0}],note:'Dieses Beispiel zeigt keine echte Wohnung. Später durch deine private Skizze ersetzen.'});
/** Validate all imported numbers and strings, with bounded geometry and NO SVG/HTML/URLs/scripts. */
export function validate3DScene(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.format!==FORMAT||data.schemaVersion!==1||data.unit!=='m')throw Error('Unbekanntes Format. Benötigt: mein-alltag-raum3d, Version 1, Einheit m.');
 const r=data.room;
 if(!r||!finite(r.width,.8,30)||!finite(r.depth,.8,30)||!finite(r.height,1.8,5))throw Error('Raummaße ungültig (Breite/Länge 0,8–30 m; Höhe 1,8–5 m).');
 const room={width:r.width,depth:r.depth,height:r.height};
 const boundary={north:room.width,south:room.width,west:room.depth,east:room.depth};
 const validateOpening=(v,kind)=>{
  if(!v||!wallNames.includes(v.wall)||!finite(v.offset,0,30)||!finite(v.width,.35,5)||v.offset+v.width>boundary[v.wall]+.001)throw Error('Tür/Fenster liegt außerhalb einer Wand.');
  if(kind==='window'&&(!finite(v.sill,.2,3)||!finite(v.height,.3,2.6)||v.sill+v.height>room.height+.001))throw Error('Fensterhöhe ungültig.');
  return kind==='window'?{wall:v.wall,offset:v.offset,width:v.width,sill:v.sill,height:v.height}:{wall:v.wall,offset:v.offset,width:v.width};
 };
 const ds=data.doors??[],ws=data.windows??[],objs=data.objects??[];
 if(!Array.isArray(ds)||ds.length>12||!Array.isArray(ws)||ws.length>16||!Array.isArray(objs)||objs.length>60)throw Error('Zu viele Türen, Fenster oder Möbel.');
 const doors=ds.map(v=>validateOpening(v,'door')),windows=ws.map(v=>validateOpening(v,'window'));
 const objects=objs.map((o,i)=>{
  if(!o||typeof o!=='object'||!Object.hasOwn(OBJECT_TYPES,o.type))throw Error(`Objekt ${i+1}: ungültiger Typ.`);
  const name=text(o.name);if(!name)throw Error(`Objekt ${i+1}: Name fehlt.`);
  if(!finite(o.x,0,room.width)||!finite(o.z,0,room.depth)||!finite(o.width,.1,5)||!finite(o.depth,.1,5)||!finite(o.height,.1,room.height)||!finite(o.baseY??0,0,room.height)||o.height+(o.baseY??0)>room.height+.001||![0,90,180,270].includes(o.rotation??0))throw Error(`Objekt ${i+1}: Position, Größe oder Drehung ungültig.`);
  const swap=(o.rotation===90||o.rotation===270);
  if(o.x-(swap?o.depth:o.width)/2<-.001||o.x+(swap?o.depth:o.width)/2>room.width+.001||o.z-(swap?o.width:o.depth)/2<-.001||o.z+(swap?o.width:o.depth)/2>room.depth+.001)throw Error(`Objekt „${name}“ liegt außerhalb des Raums.`);
  return {type:o.type,name,x:o.x,z:o.z,width:o.width,depth:o.depth,height:o.height,baseY:o.baseY??0,rotation:o.rotation??0};
 });
 return {format:FORMAT,schemaVersion:1,name:text(data.name,85)||'Raumskizze',unit:'m',room,doors,windows,objects,note:text(data.note,300)};
}
export function fallback3DScene(room){
 const w=room.width??3.8,d=room.depth??3.1;
 const objects=(room.objects||[]).slice(0,60).map(o=>{
  const [a,b,h]=defaults[o.type]||defaults.sonst;const width=Math.min(a,w*.5),depth=Math.min(b,d*.5);
  return {type:Object.hasOwn(OBJECT_TYPES,o.type)?o.type:'sonst',name:text(o.name)||'Objekt',x:Math.min(w-width/2,Math.max(width/2,(Number(o.x)||.5)*w)),z:Math.min(d-depth/2,Math.max(depth/2,(Number(o.y)||.5)*d)),width,depth,height:h,rotation:0};
 });
 return {format:FORMAT,schemaVersion:1,name:room.name||'Raum',unit:'m',room:{width:w,depth:d,height:2.45},doors:[],windows:[],objects,note:''};
}
const rgb=c=>{const n=c.replace('#','');return [0,2,4].map(i=>parseInt(n.slice(i,i+2),16));};
function shade(c,f){const s=rgb(c).map(n=>Math.min(255,Math.max(0,Math.round(n*f))));return `rgb(${s.join(' ')})`;}
/** Quiet isometric scene: only rear walls, no overlapping furniture names. */
/** W02: richer room view, furniture details are generated from the editable geometry. */
export function render3DSVG(scene,{angle=36,elevation=53,zoom=1}={}){
 return renderArchitectural3DSVG(scene,{angle,elevation,zoom});
}
/** Metric 2D floor plan. Dataset hit areas on openings support finger dragging. */
export function renderPlanSVG(scene,selected=null){
 const {width:w,depth:d}=scene.room,scale=Math.min(360/w,295/d),left=(480-w*scale)/2,top=(385-d*scale)/2;
 const x=v=>(left+v*scale),y=v=>(top+v*scale),right=x(w),bottom=y(d);
 const round=n=>n.toFixed(1);
 const L=(x1,y1,x2,y2,c,sw=2,extra='')=>`<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`;
 let b=`<svg class="pm-plan-svg" viewBox="0 0 480 390" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Grundriss: Türen und Fenster mit dem Finger entlang der Wand verschiebbar"><rect width="480" height="390" fill="#10201f"/><rect x="${round(left)}" y="${round(top)}" width="${round(w*scale)}" height="${round(d*scale)}" fill="#223e39" stroke="#dcece3" stroke-width="8" rx="1"/>`;
 for(let k=.5;k<w;k+=.5)b+=L(x(k),top+5,x(k),bottom-5,'#b5fbd012',1);
 for(let k=.5;k<d;k+=.5)b+=L(left+5,y(k),right-5,y(k),'#b5fbd012',1);
 const objectSizes={};
 (scene.objects||[]).forEach((o,i)=>{
  const swap=o.rotation===90||o.rotation===270,ww=(swap?o.depth:o.width),dd=(swap?o.width:o.depth);
  const tx=x(o.x-ww/2),ty=y(o.z-dd/2),key=`object:${i}`,active=selected===key;
  b+=`<g data-pm-furniture="${key}" role="button" aria-label="Möbel ${i+1}: ${esc(o.name)} verschieben"><rect data-pm-furniture="${key}" x="${round(tx)}" y="${round(ty)}" width="${round(ww*scale)}" height="${round(dd*scale)}" rx="4" fill="${colors[o.type]||colors.sonst}" fill-opacity=".83" stroke="${active?'#baffd1':'#102a24'}" stroke-width="${active?4:1.7}"/><text x="${round(x(o.x))}" y="${round(y(o.z)+4)}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="13" pointer-events="none" fill="#062d23">${i+1}</text></g>`;
 });
 const bounds=(opening)=>{const t1=opening.offset,t2=opening.offset+opening.width;
  if(opening.wall==='north')return [x(t1),top,x(t2),top];
  if(opening.wall==='south')return [x(t1),bottom,x(t2),bottom];
  if(opening.wall==='west')return [left,y(t1),left,y(t2)];
  return [right,y(t1),right,y(t2)];
 };
 for(const [kind,items] of [['door',scene.doors||[]],['window',scene.windows||[]]])for(const [i,o] of items.entries()){
  const [x1,y1,x2,y2]=bounds(o),key=`${kind}:${i}`,active=key===selected,c=kind==='door'?'#f4c886':'#6ee1ff';
  b+=L(x1,y1,x2,y2,c,active?11:8,`data-pm-opening="${key}"`);
  b+=L(x1,y1,x2,y2,'transparent',30,`data-pm-opening="${key}" class="pm-opening-touch"`);
  if(kind==='door'){
   const radius=Math.min(o.width*scale,66),horizontal=o.wall==='north'||o.wall==='south';
   let path='';
   if(o.wall==='north')path=`M ${round(x1+radius)} ${round(y1)} A ${round(radius)} ${round(radius)} 0 0 1 ${round(x1)} ${round(y1+radius)} M ${round(x1)} ${round(y1)} L ${round(x1)} ${round(y1+radius)}`;
   if(o.wall==='south')path=`M ${round(x1+radius)} ${round(y1)} A ${round(radius)} ${round(radius)} 0 0 0 ${round(x1)} ${round(y1-radius)} M ${round(x1)} ${round(y1)} L ${round(x1)} ${round(y1-radius)}`;
   if(o.wall==='west')path=`M ${round(x1)} ${round(y1+radius)} A ${round(radius)} ${round(radius)} 0 0 0 ${round(x1+radius)} ${round(y1)} M ${round(x1)} ${round(y1)} L ${round(x1+radius)} ${round(y1)}`;
   if(o.wall==='east')path=`M ${round(x1)} ${round(y1+radius)} A ${round(radius)} ${round(radius)} 0 0 1 ${round(x1-radius)} ${round(y1)} M ${round(x1)} ${round(y1)} L ${round(x1-radius)} ${round(y1)}`;
   b+=`<path d="${path}" fill="none" stroke="#e4c891" stroke-width="1.5" stroke-dasharray="4 4" opacity=".78" pointer-events="none"/>`;
  }
  const mx=(x1+x2)/2,my=(y1+y2)/2;
  b+=`<circle cx="${round(mx)}" cy="${round(my)}" r="${active?12:9}" fill="#12322c" stroke="${c}" stroke-width="2.5" data-pm-opening="${key}"/><text x="${round(mx)}" y="${round(my+3.5)}" fill="#fff" font-size="11" font-family="system-ui,sans-serif" font-weight="700" text-anchor="middle" pointer-events="none">${kind==='door'?'D':'F'}</text>`;
 }
 b+=`<text x="240" y="${round(Math.max(15,top-13))}" fill="#c0eee0" font-size="13" font-family="system-ui,sans-serif" font-weight="650" text-anchor="middle">${w.toFixed(2)} m</text><text transform="translate(${round(Math.max(18,left-17))} 196) rotate(-90)" text-anchor="middle" fill="#c0eee0" font-size="13" font-family="system-ui,sans-serif">${d.toFixed(2)} m</text></svg>`;
 return b;
}
const wallSize=(scene,wall)=>wall==='north'||wall==='south'?scene.room.width:scene.room.depth;
const openingList=(scene,kind)=>kind==='door'?scene.doors:scene.windows;
const clamp=(n,min,max)=>Math.min(Math.max(min,n),max);
/** Used by both the editor and regression tests. Works on a copy, no IndexedDB writes. */
export function editOpening(scene,kind,index,patch){
 const base=validate3DScene(scene),arr=openingList(base,kind);
 if(!['door','window'].includes(kind)||!arr[index])throw Error('Tür oder Fenster nicht gefunden.');
 const old=arr[index],wall=patch.wall??old.wall;
 if(!wallNames.includes(wall))throw Error('Unbekannte Wand.');
 const max=wallSize(base,wall),width=Number(patch.width??old.width),offset=Number(patch.offset??old.offset);
 if(!Number.isFinite(width)||width<.35||width>Math.min(5,max)||!Number.isFinite(offset))throw Error('Breite oder Abstand ist ungültig.');
 const result={...old,wall,width:Math.round(width*100)/100,offset:Math.round(clamp(offset,0,Math.max(0,max-width))*100)/100};
 if(kind==='window'){
  const sill=Number(patch.sill??old.sill),height=Number(patch.height??old.height);
  if(!Number.isFinite(sill)||!Number.isFinite(height)||sill<.2||height<.3||height>2.6||sill+height>base.room.height)throw Error('Fensterhöhe passt nicht zur Raumhöhe.');
  result.sill=sill;result.height=height;
 }
 arr[index]=result;return validate3DScene(base);
}
export function addOpening(scene,kind){
 const base=validate3DScene(scene),arr=openingList(base,kind),wall='north',max=wallSize(base,wall);
 if(!['door','window'].includes(kind))throw Error('Ungültiger Öffnungstyp.');
 if(arr.length>=(kind==='door'?12:16))throw Error('Maximale Anzahl für diesen Raum erreicht.');
 const width=Math.min(kind==='door'?.85:1.15,max);
 const offset=Math.round(Math.max(0,(max-width)/2)*100)/100;
 const item=kind==='door'?{wall,offset,width}:{wall,offset,width,sill:.85,height:Math.min(1.1,Math.round((base.room.height-.85)*100)/100)};
 arr.push(item);return validate3DScene(base);
}
/** A piece of furniture is a rectangular 3D footprint. Keep all imported rooms schema v1 compatible. */
const furnitureFootprint=o=>({width:([90,270].includes(o.rotation)?o.depth:o.width),depth:([90,270].includes(o.rotation)?o.width:o.depth)});
export function editFurniture(scene,index,patch){
 const base=validate3DScene(scene),old=base.objects[index];
 if(!old)throw Error('Möbel nicht gefunden.');
 const next={...old,...patch};
 if(typeof next.name!=='string'||!next.name.trim())throw Error('Möbelname fehlt.');
 next.name=text(next.name);
 if(!Object.hasOwn(OBJECT_TYPES,next.type))throw Error('Möbeltyp nicht vorhanden.');
 if(![0,90,180,270].includes(next.rotation))throw Error('Drehung muss 0°, 90°, 180° oder 270° sein.');
 for(const key of ['width','depth','height','baseY','x','z'])next[key]=Number(next[key]);
 const size=furnitureFootprint(next);
 // A resize/rotation near a wall moves only as far as necessary to stay inside the room.
 if(!finite(next.width,.1,5)||!finite(next.depth,.1,5)||!finite(next.height,.1,base.room.height)||!finite(next.baseY,0,base.room.height)||next.baseY+next.height>base.room.height+.001||size.width>base.room.width||size.depth>base.room.depth)throw Error('Die Möbelmaße passen nicht in den Raum.');
 if(!Number.isFinite(next.x)||!Number.isFinite(next.z))throw Error('Position ungültig.');
 next.x=Math.round(clamp(next.x,size.width/2,base.room.width-size.width/2)*100)/100;
 next.z=Math.round(clamp(next.z,size.depth/2,base.room.depth-size.depth/2)*100)/100;
 base.objects[index]=next;return validate3DScene(base);
}
export function addFurniture(scene,type='schrank'){
 const base=validate3DScene(scene);
 if(!Object.hasOwn(OBJECT_TYPES,type))throw Error('Objekttyp nicht vorhanden.');
 if(base.objects.length>=60)throw Error('Maximal 60 Möbel in einem Raum.');
 const [dw,dd,dh]=defaults[type]||defaults.sonst;
 const width=Math.min(dw,base.room.width),depth=Math.min(dd,base.room.depth),height=Math.min(dh,base.room.height);
 // Prefer free positions in a 5 × 5 grid to prevent stacking newly added furniture.
 const clear=(x,z)=>base.objects.every(o=>{
  const a=furnitureFootprint(o);
  return Math.abs(x-o.x)>=(width+a.width)/2+.06||Math.abs(z-o.z)>=(depth+a.depth)/2+.06;
 });
 const locations=[];
 for(let iy=0;iy<5;iy++)for(let ix=0;ix<5;ix++)locations.push({x:width/2+(base.room.width-width)*ix/4,z:depth/2+(base.room.depth-depth)*iy/4});
 const target=locations.find(p=>clear(p.x,p.z))||locations[12];
 base.objects.push({type,name:OBJECT_TYPES[type],x:Math.round(target.x*100)/100,z:Math.round(target.z*100)/100,width,depth,height,baseY:0,rotation:0});
 return validate3DScene(base);
}
export function removeFurniture(scene,index){
 const base=validate3DScene(scene);
 if(!Number.isInteger(index)||index<0||index>=base.objects.length)throw Error('Möbel nicht gefunden.');
 base.objects.splice(index,1);return validate3DScene(base);
}
export function countFurnitureOverlaps(scene,index){
 const a=scene.objects[index];if(!a)return 0;
 const d=furnitureFootprint(a);
 return scene.objects.filter((b,j)=>j!==index&&(a.baseY??0)<(b.baseY??0)+b.height-.001&&(b.baseY??0)<(a.baseY??0)+a.height-.001&&Math.abs(a.x-b.x)<(d.width+furnitureFootprint(b).width)/2-.001&&Math.abs(a.z-b.z)<(d.depth+furnitureFootprint(b).depth)/2-.001).length;
}
/** Full designer with save-on-confirm, explicit selection, metric slider and touch plan dragging. */
export function installRoomDesigner(container,source,{save,onMessage}={}){
 const host=container.querySelector('.pm-3d-viewport'),tools=container.querySelector('.pm-3d-tools'),pitchBox=container.querySelector('.pm-3d-pitch');
 const rotation=container.querySelector('#pmAngle'),elevation=container.querySelector('#pmElevation'),zoomSlider=container.querySelector('#pmZoom');
 const editor=container.querySelector('#pmOpeningEditor'),legend=container.querySelector('#pmObjectLegend');
 if(!host||!editor)return;
 let committed=structuredClone(validate3DScene(source));
 let scene=structuredClone(committed),angle=36,pitch=53,zoom=1.15,mode=source.name==='Küche – optische Vorlage'?'3d':'plan',selected=null,dirty=false,drag=null,saving=false;
 const wallLabels={north:'Nordwand (oben)',south:'Südwand (unten)',west:'Westwand (links)',east:'Ostwand (rechts)'};
 const showStatus=(text,error=false)=>onMessage?.(text,error);
 const selectedOpening=()=>{if(!selected)return null;const [kind,i]=selected.split(':');if(!['door','window'].includes(kind))return null;return openingList(scene,kind)[Number(i)]?{kind,index:Number(i),value:openingList(scene,kind)[Number(i)]}:null;};
 const selectedFurniture=()=>{if(!selected?.startsWith('object:'))return null;const index=Number(selected.split(':')[1]);return scene.objects[index]?{index,value:scene.objects[index]}:null;};
 function paint(){
  host.innerHTML=mode==='plan'?renderPlanSVG(scene,selected):render3DSVG(scene,{angle,elevation:pitch,zoom});
  host.classList.toggle('pm-plan-mode',mode==='plan');
  container.querySelectorAll('[data-pm-mode]').forEach(b=>{b.classList.toggle('pm-mode-active',b.dataset.pmMode===mode);b.setAttribute('aria-pressed',String(b.dataset.pmMode===mode));});
  if(tools)tools.hidden=mode==='plan';if(pitchBox)pitchBox.hidden=mode==='plan';
  const zoomBox=container.querySelector('.pm-3d-zoom');if(zoomBox)zoomBox.hidden=mode==='plan';
  const zoomValue=container.querySelector('#pmZoomVal');if(zoomValue)zoomValue.textContent=Math.round(zoom*100)+' %';
  const hint=container.querySelector('#pmViewHint');if(hint)hint.textContent=mode==='plan'?'Tür, Fenster oder Möbel antippen und verschieben. Genaue Maße darunter einstellen.':'3D mit dem Finger drehen. Möbelnummern stehen in der Legende; die Positionen bearbeitest du im Grundriss.';
  if(legend){const list=scene.objects||[];legend.innerHTML=list.length?list.map((o,i)=>`<button type="button" data-pm-legend="object:${i}" class="${selected===`object:${i}`?'pm-selected':''}"><b>${i+1}</b> ${esc(o.name)}</button>`).join(''):'<span>Noch keine Möbel in dieser Skizze</span>';}
  renderControls();
 }
 function renderControls(){
  const sel=selectedOpening(),obj=selectedFurniture();
  editor.innerHTML=`<div class="pm-editor-heading"><strong>🚪 Türen <em>${scene.doors.length}</em> · 🪟 Fenster <em>${scene.windows.length}</em></strong><div class="pm-opening-add"><button type="button" data-pm-add="door">＋ Tür</button><button type="button" data-pm-add="window">＋ Fenster</button></div></div>
  <div class="pm-opening-list">${[['door',scene.doors],['window',scene.windows]].flatMap(([kind,items])=>items.map((o,i)=>`<button type="button" data-pm-select="${kind}:${i}" class="${selected===`${kind}:${i}`?'pm-selected':''}">${kind==='door'?'🚪 Tür':'🪟 Fenster'} ${i+1}<small>${wallLabels[o.wall].split(' ')[0]} · ${o.offset.toFixed(2)} m</small></button>`)).join('')||'<p class="pm-hint">Noch keine Türen oder Fenster eingezeichnet. Über + hinzufügen.</p>'}</div>
  ${sel?`<div class="pm-editor-fields"><div class="pm-editor-title"><strong>${sel.kind==='door'?'🚪 Tür':'🪟 Fenster'} ${sel.index+1} bearbeiten</strong><button type="button" class="pm-editor-remove" data-pm-remove="1">Entfernen</button></div><label>Wand<select id="pmOpeningWall">${Object.entries(wallLabels).map(([k,v])=>`<option value="${k}" ${sel.value.wall===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Position ab Wandecke <strong id="pmOpeningPositionLabel">${sel.value.offset.toFixed(2)} m</strong><input id="pmOpeningOffset" type="range" step="0.01" min="0" max="${Math.max(0,wallSize(scene,sel.value.wall)-sel.value.width).toFixed(2)}" value="${sel.value.offset}"/></label><div class="pm-editor-dims"><label>Abstand (m)<input id="pmOpeningOffsetNumber" type="number" inputmode="decimal" min="0" step="0.01" max="${Math.max(0,wallSize(scene,sel.value.wall)-sel.value.width).toFixed(2)}" value="${sel.value.offset.toFixed(2)}"/></label><label>Breite (m)<input id="pmOpeningWidth" type="number" inputmode="decimal" min="0.35" max="${Math.min(5,wallSize(scene,sel.value.wall)).toFixed(2)}" step="0.01" value="${sel.value.width.toFixed(2)}"/></label></div>${sel.kind==='window'?`<div class="pm-editor-dims"><label>Brüstung (m)<input id="pmOpeningSill" type="number" min="0.2" max="3" step="0.01" value="${sel.value.sill.toFixed(2)}"/></label><label>Fensterhöhe (m)<input id="pmOpeningHeight" type="number" min="0.3" max="2.6" step="0.01" value="${sel.value.height.toFixed(2)}"/></label></div>`:''}</div>`:'<p class="pm-hint">Wähle oben eine Tür oder ein Fenster aus, um Maße und Position zu ändern.</p>'}
  <div class="pm-furniture-section"><div class="pm-editor-heading"><strong>🛋 Möbel <em>${scene.objects.length}</em></strong><div class="pm-furniture-add"><select id="pmFurnitureType" aria-label="Möbelart auswählen">${Object.entries(OBJECT_TYPES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select><button type="button" data-pm-add-furniture="1">＋ Möbel hinzufügen</button></div></div>
  <div class="pm-opening-list pm-furniture-list">${scene.objects.map((o,i)=>`<button type="button" data-pm-select="object:${i}" class="${selected===`object:${i}`?'pm-selected':''}"><b>${i+1}</b> ${esc(o.name)}<small>${o.width.toFixed(2)} × ${o.depth.toFixed(2)} m</small></button>`).join('')||'<p class="pm-hint">Noch keine Möbel vorhanden. Wähle eine Möbelart und füge sie hinzu.</p>'}</div>
  ${obj?`<div class="pm-editor-fields pm-furniture-fields"><div class="pm-editor-title"><strong>🛋 Möbel ${obj.index+1} bearbeiten</strong><button type="button" class="pm-editor-remove" data-pm-remove-furniture="1">Entfernen</button></div>
  <label>Name<input id="pmFurnitureName" type="text" maxlength="60" value="${esc(obj.value.name)}"/></label>
  <label>Art<select id="pmFurnitureKind">${Object.entries(OBJECT_TYPES).map(([k,v])=>`<option value="${k}" ${obj.value.type===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
  <div class="pm-editor-dims"><label>X-Position (m)<input id="pmFurnitureX" type="number" inputmode="decimal" step="0.01" min="0" max="${scene.room.width}" value="${obj.value.x.toFixed(2)}"/></label><label>Y-Position (m)<input id="pmFurnitureZ" type="number" inputmode="decimal" step="0.01" min="0" max="${scene.room.depth}" value="${obj.value.z.toFixed(2)}"/></label></div>
  <div class="pm-editor-dims"><label>Breite (m)<input id="pmFurnitureWidth" type="number" inputmode="decimal" step="0.01" min="0.1" max="5" value="${obj.value.width.toFixed(2)}"/></label><label>Tiefe (m)<input id="pmFurnitureDepth" type="number" inputmode="decimal" step="0.01" min="0.1" max="5" value="${obj.value.depth.toFixed(2)}"/></label></div>
  <div class="pm-editor-dims"><label>Höhe (m)<input id="pmFurnitureHeight" type="number" inputmode="decimal" step="0.01" min="0.1" max="${scene.room.height}" value="${obj.value.height.toFixed(2)}"/></label><label>Drehung<select id="pmFurnitureRotation">${[0,90,180,270].map(a=>`<option value="${a}" ${obj.value.rotation===a?'selected':''}>${a}°</option>`).join('')}</select></label></div><label>Höhe über dem Boden (m) – z. B. Hängeschrank<input id="pmFurnitureBaseY" type="number" inputmode="decimal" min="0" max="${scene.room.height}" step="0.01" value="${(obj.value.baseY??0).toFixed(2)}"/></label>
  ${countFurnitureOverlaps(scene,obj.index)?`<p class="pm-editor-warning">⚠️ Achtung: Möbel überschneiden sich (${countFurnitureOverlaps(scene,obj.index)}). Bitte Position prüfen.</p>`:''}
  <p class="pm-editor-tip">Am einfachsten oben im Grundriss mit dem Finger verschieben. Maßänderungen werden auf den Raum begrenzt.</p></div>`:'<p class="pm-hint">Ein Möbel aus dem Grundriss oder aus der Liste auswählen und bearbeiten.</p>'}</div>
  <div class="pm-editor-save"><button type="button" data-pm-save="1" class="primary-button pm-accent" ${dirty?'':'disabled'}>${saving?'Speichere …':dirty?'✓ Änderungen speichern':'✓ Alles gespeichert'}</button><button type="button" data-pm-reset="1" ${dirty?'':'disabled'}>Verwerfen</button></div><p class="pm-editor-footnote">Speicherung nur auf diesem Gerät. Änderungen erst nach „Speichern“ dauerhaft.</p>`;
 }
 function apply(patch,quiet=false){
  const sel=selectedOpening();if(!sel)return;
  try{scene=editOpening(scene,sel.kind,sel.index,patch);dirty=true;paint();if(!quiet)showStatus('Noch nicht gespeichert – „Änderungen speichern“ antippen.');}
  catch(err){showStatus(err.message,true);renderControls();}
 }
 function applyFurniture(patch,quiet=false){
  const obj=selectedFurniture();if(!obj)return;
  try{scene=editFurniture(scene,obj.index,patch);dirty=true;paint();if(!quiet)showStatus('Möbel geändert – noch nicht gespeichert.');}
  catch(err){showStatus(err.message,true);renderControls();}
 }
 legend?.addEventListener('click',e=>{const button=e.target.closest('[data-pm-legend]');if(button){selected=button.dataset.pmLegend;mode='plan';paint();}});
 container.querySelectorAll('[data-pm-mode]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.pmMode;drag=null;paint();}));
 rotation?.addEventListener('input',()=>{angle=Number(rotation.value);if(mode==='3d')paint();});
 elevation?.addEventListener('input',()=>{pitch=Number(elevation.value);if(mode==='3d')paint();});
 zoomSlider?.addEventListener('input',()=>{zoom=Number(zoomSlider.value)/100;if(mode==='3d')paint();});
 container.querySelectorAll('[data-3d-turn]').forEach(btn=>btn.addEventListener('click',()=>{angle=(angle+Number(btn.dataset['3dTurn'])+360)%360;if(rotation)rotation.value=angle;if(mode==='3d')paint();}));
 host.addEventListener('pointerdown',e=>{
  if(mode==='3d'){drag={kind:'orbit',x:e.clientX,base:angle,id:e.pointerId};host.setPointerCapture?.(e.pointerId);return;}
  const hit=e.target.closest('[data-pm-opening], [data-pm-furniture]');if(!hit)return;
  const furniture=hit.getAttribute('data-pm-furniture'),opening=hit.getAttribute('data-pm-opening');
  selected=furniture||opening;
  if(furniture){
   const index=Number(furniture.split(':')[1]),svg=host.querySelector('svg'),ctm=svg?.getScreenCTM();
   const p=ctm?new DOMPoint(e.clientX,e.clientY).matrixTransform(ctm.inverse()):null;
   const {width:w,depth:d}=scene.room,sc=Math.min(360/w,295/d),left=(480-w*sc)/2,top=(385-d*sc)/2;
   drag={kind:'object',id:e.pointerId,index,dx:p?(p.x-left)/sc-scene.objects[index].x:0,dz:p?(p.y-top)/sc-scene.objects[index].z:0};
  }else drag={kind:'opening',id:e.pointerId};
  host.setPointerCapture?.(e.pointerId);paint();
 });
 host.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.kind==='orbit'){angle=(drag.base+(e.clientX-drag.x)*.8+3600)%360;if(rotation)rotation.value=Math.round(angle);paint();return;}
  const svg=host.querySelector('svg');if(!svg)return;
  const ctm=svg.getScreenCTM();if(!ctm)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(ctm.inverse());
  const {width:w,depth:d}=scene.room,sc=Math.min(360/w,295/d),left=(480-w*sc)/2,top=(385-d*sc)/2;
  if(drag.kind==='object'){
   const x=Math.round(((p.x-left)/sc-drag.dx)*100)/100,z=Math.round(((p.y-top)/sc-drag.dz)*100)/100;
   const old=scene.objects[drag.index];if(!old||old.x===x&&old.z===z)return;
   applyFurniture({x,z},true);return;
  }
  const sel=selectedOpening();if(!sel)return;
  const dist=sel.value.wall==='north'||sel.value.wall==='south'?(p.x-left)/sc:(p.y-top)/sc;
  const next=Math.round(clamp(dist-sel.value.width/2,0,wallSize(scene,sel.value.wall)-sel.value.width)*100)/100;
  if(next!==sel.value.offset)apply({offset:next},true);
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,()=>{if(['opening','object'].includes(drag?.kind)&&dirty)showStatus('Position geändert – jetzt speichern.');drag=null;});
 editor.addEventListener('click',async e=>{
  const btn=e.target.closest('button');if(!btn||saving)return;
  if(btn.dataset.pmSelect){selected=btn.dataset.pmSelect;paint();}
  if(btn.dataset.pmAddFurniture){try{const type=editor.querySelector('#pmFurnitureType')?.value||'schrank';scene=addFurniture(scene,type);selected=`object:${scene.objects.length-1}`;dirty=true;mode='plan';paint();showStatus('Möbel hinzugefügt – bitte platzieren und speichern.');}catch(err){showStatus(err.message,true);}}
  if(btn.dataset.pmRemoveFurniture){const obj=selectedFurniture();if(!obj)return;scene=removeFurniture(scene,obj.index);selected=null;dirty=true;paint();showStatus('Möbel entfernt – noch nicht gespeichert.');}
  if(btn.dataset.pmAdd){try{scene=addOpening(scene,btn.dataset.pmAdd);selected=`${btn.dataset.pmAdd}:${openingList(scene,btn.dataset.pmAdd).length-1}`;dirty=true;mode='plan';paint();showStatus('Neue Öffnung hinzugefügt. Position auswählen und speichern.');}catch(err){showStatus(err.message,true);}}
  if(btn.dataset.pmRemove){const sel=selectedOpening();if(!sel)return;openingList(scene,sel.kind).splice(sel.index,1);selected=null;dirty=true;paint();showStatus('Öffnung entfernt – noch nicht gespeichert.');}
  if(btn.dataset.pmReset){scene=structuredClone(committed);selected=null;dirty=false;paint();showStatus('Nicht gespeicherte Änderungen verworfen.');}
  if(btn.dataset.pmSave&&dirty){saving=true;renderControls();try{const validated=validate3DScene(scene);await save?.(validated);committed=structuredClone(validated);scene=structuredClone(validated);dirty=false;showStatus('✓ Wohnungsplan mit Möbeln, Türen und Fenstern gespeichert.');paint();}catch(err){showStatus('Speichern fehlgeschlagen: '+err.message,true);}finally{saving=false;renderControls();}}
 });
 editor.addEventListener('input',e=>{
  const sel=selectedOpening();if(!sel)return;
  if(e.target.id==='pmOpeningOffset'){
   try{
    scene=editOpening(scene,sel.kind,sel.index,{offset:Number(e.target.value)});dirty=true;
    host.innerHTML=mode==='plan'?renderPlanSVG(scene,selected):render3DSVG(scene,{angle,elevation:pitch,zoom});
    const val=scene[sel.kind==='door'?'doors':'windows'][sel.index].offset.toFixed(2);
    const lbl=editor.querySelector('#pmOpeningPositionLabel'),num=editor.querySelector('#pmOpeningOffsetNumber'),saveBtn=editor.querySelector('[data-pm-save]'),resetBtn=editor.querySelector('[data-pm-reset]');
    if(lbl)lbl.textContent=val+' m';if(num)num.value=val;if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='✓ Änderungen speichern';}if(resetBtn)resetBtn.disabled=false;
   }catch(err){showStatus(err.message,true);}
   return;
  }
 });
 editor.addEventListener('change',e=>{
  const names={pmOpeningWall:'wall',pmOpeningOffset:'offset',pmOpeningOffsetNumber:'offset',pmOpeningWidth:'width',pmOpeningSill:'sill',pmOpeningHeight:'height'};
  const prop=names[e.target.id];if(!prop)return;
  apply({[prop]:prop==='wall'?e.target.value:Number(e.target.value)});
 });
 editor.addEventListener('change',e=>{
  const fields={pmFurnitureName:'name',pmFurnitureKind:'type',pmFurnitureX:'x',pmFurnitureZ:'z',pmFurnitureWidth:'width',pmFurnitureDepth:'depth',pmFurnitureHeight:'height',pmFurnitureBaseY:'baseY',pmFurnitureRotation:'rotation'};
  const key=fields[e.target.id];if(!key)return;
  applyFurniture({[key]:['name','type'].includes(key)?e.target.value:Number(e.target.value)});
 });
 paint();
}
export function downloadJSON(scene,filename){
 const body=JSON.stringify(validate3DScene(scene),null,2)+'\n';const u=URL.createObjectURL(new Blob([body],{type:'application/json'}));
 const a=document.createElement('a');a.href=u;a.download=filename;a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6000);
}
export function install3DViewer(container,scene){
 const host=container.querySelector('.pm-3d-viewport');if(host)host.innerHTML=render3DSVG(scene);
}
