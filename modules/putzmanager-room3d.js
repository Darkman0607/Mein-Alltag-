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
const defaults=Object.freeze({wc:[.62,.76,.72],waschbecken:[.65,.46,.83],dusche:[.9,.9,1.82],wanne:[1.6,.75,.65],spiegel:[.65,.1,1.45],schrank:[.9,.47,1.58],waschmaschine:[.65,.65,.9],spuele:[.75,.61,.9],herd:[.65,.65,.86],kuehlschrank:[.7,.7,1.85],arbeitsplatte:[1.4,.65,.89],tisch:[1.1,.7,.75],sofa:[1.65,.85,.83],bett:[1.8,2,.52],regal:[.8,.42,1.75],sonst:[.8,.6,.84]});
const colors={wc:'#e5f9fa',waschbecken:'#92d9f0',dusche:'#75e2d9',wanne:'#96c3f2',spiegel:'#8dd8ee',schrank:'#bf926b',waschmaschine:'#b5cbd0',spuele:'#83c1cf',herd:'#74818a',kuehlschrank:'#c9dadd',arbeitsplatte:'#c68e61',tisch:'#b98261',sofa:'#6dbf96',bett:'#9da7ef',regal:'#b38f6d',sonst:'#e9b970'};
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
  if(!finite(o.x,0,room.width)||!finite(o.z,0,room.depth)||!finite(o.width,.1,5)||!finite(o.depth,.1,5)||!finite(o.height,.1,room.height)||![0,90,180,270].includes(o.rotation??0))throw Error(`Objekt ${i+1}: Position, Größe oder Drehung ungültig.`);
  const swap=(o.rotation===90||o.rotation===270);
  if(o.x-(swap?o.depth:o.width)/2<-.001||o.x+(swap?o.depth:o.width)/2>room.width+.001||o.z-(swap?o.width:o.depth)/2<-.001||o.z+(swap?o.width:o.depth)/2>room.depth+.001)throw Error(`Objekt „${name}“ liegt außerhalb des Raums.`);
  return {type:o.type,name,x:o.x,z:o.z,width:o.width,depth:o.depth,height:o.height,rotation:o.rotation??0};
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
/** Project actual 3D coordinates to 2D SVG at a camera orbit angle; painter sort by camera depth. */
export function render3DSVG(scene,{angle=36,elevation=53,zoom=1}={}){
 const {width:w,depth:d,height:h}=scene.room,rad=Math.PI/180,a=angle*rad,el=elevation*rad;
 const sc=Math.min(88,260/Math.max(w,d))*zoom;
 const cx=200,cy=197;
 const project=p=>{const dx=p[0]-w/2,dz=p[2]-d/2,X=dx*Math.cos(a)+dz*Math.sin(a),Z=-dx*Math.sin(a)+dz*Math.cos(a);return [cx+sc*X,cy+sc*(Z*Math.sin(el)-p[1]*Math.cos(el))+28, Z*Math.cos(el)+p[1]*Math.sin(el)];};
 const polygons=[];
 function add(points,fill,stroke='#ffffff28',opacity=1,extra=''){
  const pts=points.map(project);polygons.push({points:pts.map(p=>p.slice(0,2).map(n=>n.toFixed(2)).join(',')).join(' '),depth:pts.reduce((sum,p)=>sum+p[2],0)/pts.length,fill,stroke,opacity,extra});
 }
 const floor=[[0,0,0],[w,0,0],[w,0,d],[0,0,d]];
 add(floor,'#244b48','#6baf9c',1);
 for(let i=.5;i<w;i+=.5)add([[i,.006,0],[i,.006,d]],'none','#90d4bd2e',1,'data-floor-grid="true"');
 for(let i=.5;i<d;i+=.5)add([[0,.006,i],[w,.006,i]],'none','#90d4bd2e',1,'data-floor-grid="true"');
 // All four translucent wall surfaces allow seeing inside from every orbit angle.
 const walls={north:[[0,0,0],[w,0,0],[w,h,0],[0,h,0]],south:[[0,0,d],[w,0,d],[w,h,d],[0,h,d]],west:[[0,0,0],[0,0,d],[0,h,d],[0,h,0]],east:[[w,0,0],[w,0,d],[w,h,d],[w,h,0]]};
 Object.entries(walls).forEach(([wall,p])=>add(p,wall==='north'||wall==='west'?'#74b3ae':'#609e9b','#9ee6d3',.24,'data-wall="'+wall+'"'));
 function face(wall,offset,size,y0,y1){
  const eps=wall==='north'?-.018:wall==='south'?.018:wall==='west'?-.018:.018;
  if(wall==='north'||wall==='south'){let z=(wall==='north'?0:d)+eps;return [[offset,y0,z],[offset+size,y0,z],[offset+size,y1,z],[offset,y1,z]];}
  let x=(wall==='west'?0:w)+eps;return [[x,y0,offset],[x,y0,offset+size],[x,y1,offset+size],[x,y1,offset]];
 }
 (scene.doors||[]).forEach(door=>add(face(door.wall,door.offset,door.width,0,Math.min(2.05,h)),'#70523d','#e4bb7c',.9,'data-door="true"'));
 (scene.windows||[]).forEach(win=>add(face(win.wall,win.offset,win.width,win.sill,win.sill+win.height),'#4fbbdf','#c5f8ff',.85,'data-window="true"'));
 const labelPositions=[];
 for(const [index,o] of (scene.objects||[]).entries()){
  const swap=o.rotation===90||o.rotation===270,wx=(swap?o.depth:o.width),dz=(swap?o.width:o.depth);
  const x1=o.x-wx/2,x2=o.x+wx/2,z1=o.z-dz/2,z2=o.z+dz/2,y2=o.height;
  const v=[[x1,0,z1],[x2,0,z1],[x2,0,z2],[x1,0,z2],[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]];
  const c=colors[o.type]||colors.sonst;
  for(const [indices,amount] of [[[0,1,5,4],.66],[[1,2,6,5],.8],[[2,3,7,6],.7],[[3,0,4,7],.9],[[4,5,6,7],1.14]])add(indices.map(i=>v[i]),shade(c,amount),'#092c2a',1,`data-object="${index}"`);
  const p=project([o.x,Math.min(y2+.18,h+.3),o.z]);labelPositions.push({x:p[0],y:p[1]-7,name:o.name});
 }
 polygons.sort((a,b)=>a.depth-b.depth);
 let body=polygons.map(p=>`<polygon points="${p.points}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.2" opacity="${p.opacity}" ${p.extra}/>`).join('');
 body+=labelPositions.map(v=>`<text x="${v.x.toFixed(1)}" y="${v.y.toFixed(1)}" font-size="10" font-weight="700" fill="#f8fff9" text-anchor="middle" stroke="#102621" stroke-width="2.7" paint-order="stroke">${esc(v.name)}</text>`).join('');
 return `<svg class="pm-3d-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" role="img" aria-label="Drehbare dreidimensionale Raumansicht mit ${(scene.objects||[]).length} Möbeln"><defs><radialGradient id="pmFloorGlow"><stop stop-color="#275950"/><stop offset="1" stop-color="#102321"/></radialGradient></defs><rect width="400" height="380" fill="url(#pmFloorGlow)"/>${body}</svg>`;
}
export function downloadJSON(scene,filename){
 const body=JSON.stringify(validate3DScene(scene),null,2)+'\n';const u=URL.createObjectURL(new Blob([body],{type:'application/json'}));
 const a=document.createElement('a');a.href=u;a.download=filename;a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6000);
}
export function install3DViewer(container,scene){
 const host=container.querySelector('.pm-3d-viewport'),rotation=container.querySelector('#pmAngle'),elevation=container.querySelector('#pmElevation');
 if(!host)return;
 let angle=36,pitch=53,drag=null;
 const draw=()=>{host.innerHTML=render3DSVG(scene,{angle,elevation:pitch});host.setAttribute('aria-label',`3D-Raum, ${Math.round(angle)} Grad Drehung`);};
 rotation?.addEventListener('input',()=>{angle=Number(rotation.value);draw();});
 elevation?.addEventListener('input',()=>{pitch=Number(elevation.value);draw();});
 container.querySelectorAll('[data-3d-turn]').forEach(btn=>btn.addEventListener('click',()=>{angle=(angle+Number(btn.dataset['3dTurn'])+360)%360;if(rotation)rotation.value=angle;draw();}));
 host.addEventListener('pointerdown',e=>{drag={x:e.clientX,base:angle,id:e.pointerId};host.setPointerCapture?.(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;angle=(drag.base+(e.clientX-drag.x)*.8+3600)%360;if(rotation)rotation.value=Math.round(angle);draw();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,()=>{drag=null;});
 draw();
}
