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
/** Quiet isometric scene: only rear walls, no overlapping furniture names. */
export function render3DSVG(scene,{angle=36,elevation=53,zoom=1}={}){
 const {width:w,depth:d,height:h}=scene.room,rad=Math.PI/180,a=angle*rad,el=elevation*rad;
 const sc=Math.min(99,315/Math.max(w,d))*zoom, cx=240,cy=238;
 const project=p=>{const dx=p[0]-w/2,dz=p[2]-d/2,X=dx*Math.cos(a)+dz*Math.sin(a),Z=-dx*Math.sin(a)+dz*Math.cos(a);return [cx+sc*X,cy+sc*(Z*Math.sin(el)-p[1]*Math.cos(el))+22,Z*Math.cos(el)+p[1]*Math.sin(el)];};
 const polys=[];
 function add(points,fill,stroke='#ffffff28',opacity=1,extra=''){
  const pts=points.map(project);polys.push({points:pts.map(p=>p.slice(0,2).map(n=>n.toFixed(2)).join(',')).join(' '),depth:pts.reduce((sum,p)=>sum+p[2],0)/pts.length,fill,stroke,opacity,extra});
 }
 const surface=[[0,0,0],[w,0,0],[w,0,d],[0,0,d]];
 add(surface,'#365a51','#88c9ab',1,'data-floor="true"');
 const walls={north:[[0,0,0],[w,0,0],[w,h,0],[0,h,0]],south:[[0,0,d],[w,0,d],[w,h,d],[0,h,d]],west:[[0,0,0],[0,0,d],[0,h,d],[0,h,0]],east:[[w,0,0],[w,0,d],[w,h,d],[w,h,0]]};
 // Hide nearer walls to keep furniture visible; rotate to inspect other sides.
 const rearWalls=new Set([Math.cos(a)>=0?'north':'south',Math.sin(a)>=0?'east':'west']);
 Object.entries(walls).forEach(([wall,pts])=>{
  if(rearWalls.has(wall))add(pts,'#75a79e','#a4d9c9',.22,`data-wall="${wall}"`);
 });
 function openingFace(wall,offset,size,y0,y1){
  const eps=wall==='north'?-.022:wall==='south'?.022:wall==='west'?-.022:.022;
  if(wall==='north'||wall==='south'){const z=(wall==='north'?0:d)+eps;return [[offset,y0,z],[offset+size,y0,z],[offset+size,y1,z],[offset,y1,z]];}
  const x=(wall==='west'?0:w)+eps;return [[x,y0,offset],[x,y0,offset+size],[x,y1,offset+size],[x,y1,offset]];
 }
 (scene.doors||[]).forEach((o,i)=>{
  const face=openingFace(o.wall,o.offset,o.width,0,Math.min(2.08,h));
  // Door frame: visible as a frame with translucent centre, not a solid brown block.
  add(face,'#b3d7c0','#f2c68a',.24,`data-door="${i}"`);
 });
 (scene.windows||[]).forEach((o,i)=>{
  const face=openingFace(o.wall,o.offset,o.width,o.sill,o.sill+o.height);
  add(face,'#72d5fa','#e4fcff',.79,`data-window="${i}"`);
 });
 const badges=[];
 for(const [index,o] of (scene.objects||[]).entries()){
  const swap=o.rotation===90||o.rotation===270,wx=(swap?o.depth:o.width),dz=(swap?o.width:o.depth);
  const x1=o.x-wx/2,x2=o.x+wx/2,z1=o.z-dz/2,z2=o.z+dz/2,y2=o.height;
  const v=[[x1,0,z1],[x2,0,z1],[x2,0,z2],[x1,0,z2],[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]];
  const c=colors[o.type]||colors.sonst;
  for(const [face,k] of [[[0,1,5,4],.68],[[1,2,6,5],.82],[[2,3,7,6],.7],[[3,0,4,7],.9],[[4,5,6,7],1.13]])add(face.map(i=>v[i]),shade(c,k),'#193c39',1,`data-object="${index}"`);
  if(index<16){const at=project([o.x,Math.min(h+.2,y2+.12),o.z]);badges.push({x:at[0],y:at[1]-6,index});}
 }
 polys.sort((a,b)=>a.depth-b.depth);
 let body=polys.map(p=>`<polygon points="${p.points}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.4" stroke-linejoin="round" opacity="${p.opacity}" ${p.extra}/>`).join('');
 // Short numeric markers keep the picture legible; full object names are in the legend below.
 body+=badges.map(b=>`<g><circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="10" fill="#0d302c" stroke="#b8f4d2" stroke-width="1.2"/><text x="${b.x.toFixed(1)}" y="${(b.y+3.7).toFixed(1)}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="10" fill="#eafff3">${b.index+1}</text></g>`).join('');
 return `<svg class="pm-3d-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 400" role="img" aria-label="Drehbare 3D-Raumskizze, ${scene.objects.length} Möbel und nummerierte Legende"><defs><radialGradient id="pmFloorGlow"><stop stop-color="#254c45"/><stop offset="1" stop-color="#0a1b1b"/></radialGradient></defs><rect width="480" height="400" fill="url(#pmFloorGlow)"/>${body}</svg>`;
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
  const tx=x(o.x-ww/2),ty=y(o.z-dd/2);
  b+=`<rect x="${round(tx)}" y="${round(ty)}" width="${round(ww*scale)}" height="${round(dd*scale)}" rx="3" fill="${colors[o.type]||colors.sonst}" fill-opacity=".70" stroke="#091f1a" stroke-width="1.6"/><text x="${round(x(o.x))}" y="${round(y(o.z)+3)}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="750" font-size="10" fill="#073429">${i+1}</text>`;
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
/** Full designer with save-on-confirm, explicit selection, metric slider and touch plan dragging. */
export function installRoomDesigner(container,source,{save,onMessage}={}){
 const host=container.querySelector('.pm-3d-viewport'),tools=container.querySelector('.pm-3d-tools'),pitchBox=container.querySelector('.pm-3d-pitch');
 const rotation=container.querySelector('#pmAngle'),elevation=container.querySelector('#pmElevation');
 const editor=container.querySelector('#pmOpeningEditor'),legend=container.querySelector('#pmObjectLegend');
 if(!host||!editor)return;
 let committed=structuredClone(validate3DScene(source));
 let scene=structuredClone(committed),angle=36,pitch=53,mode='plan',selected=null,dirty=false,drag=null,saving=false;
 const wallLabels={north:'Nordwand (oben)',south:'Südwand (unten)',west:'Westwand (links)',east:'Ostwand (rechts)'};
 const showStatus=(text,error=false)=>onMessage?.(text,error);
 const selectedOpening=()=>{if(!selected)return null;const [kind,i]=selected.split(':');return openingList(scene,kind)[Number(i)]?{kind,index:Number(i),value:openingList(scene,kind)[Number(i)]}:null;};
 function paint(){
  host.innerHTML=mode==='plan'?renderPlanSVG(scene,selected):render3DSVG(scene,{angle,elevation:pitch});
  host.classList.toggle('pm-plan-mode',mode==='plan');
  container.querySelectorAll('[data-pm-mode]').forEach(b=>{b.classList.toggle('pm-mode-active',b.dataset.pmMode===mode);b.setAttribute('aria-pressed',String(b.dataset.pmMode===mode));});
  if(tools)tools.hidden=mode==='plan';if(pitchBox)pitchBox.hidden=mode==='plan';
  const hint=container.querySelector('#pmViewHint');if(hint)hint.textContent=mode==='plan'?'Tür oder Fenster antippen und entlang seiner Wand verschieben. Genaue Werte darunter einstellen.':'3D mit dem Finger drehen. Möbelnummern stehen in der Legende; die Positionen bearbeitest du im Grundriss.';
  if(legend){const list=scene.objects||[];legend.innerHTML=list.length?list.map((o,i)=>`<span title="${esc(o.name)}"><b>${i+1}</b> ${esc(o.name)}</span>`).join(''):'<span>Noch keine Möbel in dieser Skizze</span>';}
  renderControls();
 }
 function renderControls(){
  const sel=selectedOpening();
  editor.innerHTML=`<div class="pm-editor-heading"><strong>🚪 Türen <em>${scene.doors.length}</em> · 🪟 Fenster <em>${scene.windows.length}</em></strong><div class="pm-opening-add"><button type="button" data-pm-add="door">＋ Tür</button><button type="button" data-pm-add="window">＋ Fenster</button></div></div>
  <div class="pm-opening-list">${[['door',scene.doors],['window',scene.windows]].flatMap(([kind,items])=>items.map((o,i)=>`<button type="button" data-pm-select="${kind}:${i}" class="${selected===`${kind}:${i}`?'pm-selected':''}">${kind==='door'?'🚪 Tür':'🪟 Fenster'} ${i+1}<small>${wallLabels[o.wall].split(' ')[0]} · ${o.offset.toFixed(2)} m</small></button>`)).join('')||'<p class="pm-hint">Noch keine Türen oder Fenster eingezeichnet. Über + hinzufügen.</p>'}</div>
  ${sel?`<div class="pm-editor-fields"><div class="pm-editor-title"><strong>${sel.kind==='door'?'🚪 Tür':'🪟 Fenster'} ${sel.index+1} bearbeiten</strong><button type="button" class="pm-editor-remove" data-pm-remove="1">Entfernen</button></div><label>Wand<select id="pmOpeningWall">${Object.entries(wallLabels).map(([k,v])=>`<option value="${k}" ${sel.value.wall===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Position ab Wandecke <strong id="pmOpeningPositionLabel">${sel.value.offset.toFixed(2)} m</strong><input id="pmOpeningOffset" type="range" step="0.01" min="0" max="${Math.max(0,wallSize(scene,sel.value.wall)-sel.value.width).toFixed(2)}" value="${sel.value.offset}"/></label><div class="pm-editor-dims"><label>Abstand (m)<input id="pmOpeningOffsetNumber" type="number" inputmode="decimal" min="0" step="0.01" max="${Math.max(0,wallSize(scene,sel.value.wall)-sel.value.width).toFixed(2)}" value="${sel.value.offset.toFixed(2)}"/></label><label>Breite (m)<input id="pmOpeningWidth" type="number" inputmode="decimal" min="0.35" max="${Math.min(5,wallSize(scene,sel.value.wall)).toFixed(2)}" step="0.01" value="${sel.value.width.toFixed(2)}"/></label></div>${sel.kind==='window'?`<div class="pm-editor-dims"><label>Brüstung (m)<input id="pmOpeningSill" type="number" min="0.2" max="3" step="0.01" value="${sel.value.sill.toFixed(2)}"/></label><label>Fensterhöhe (m)<input id="pmOpeningHeight" type="number" min="0.3" max="2.6" step="0.01" value="${sel.value.height.toFixed(2)}"/></label></div>`:''}</div>`:'<p class="pm-hint">Wähle oben eine Tür oder ein Fenster aus, um Maße und Position zu ändern.</p>'}
  <div class="pm-editor-save"><button type="button" data-pm-save="1" class="primary-button pm-accent" ${dirty?'':'disabled'}>${saving?'Speichere …':dirty?'✓ Änderungen speichern':'✓ Alles gespeichert'}</button><button type="button" data-pm-reset="1" ${dirty?'':'disabled'}>Verwerfen</button></div><p class="pm-editor-footnote">Speicherung nur auf diesem Gerät. Änderungen erst nach „Speichern“ dauerhaft.</p>`;
 }
 function apply(patch,quiet=false){
  const sel=selectedOpening();if(!sel)return;
  try{scene=editOpening(scene,sel.kind,sel.index,patch);dirty=true;paint();if(!quiet)showStatus('Noch nicht gespeichert – „Änderungen speichern“ antippen.');}
  catch(err){showStatus(err.message,true);renderControls();}
 }
 container.querySelectorAll('[data-pm-mode]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.pmMode;drag=null;paint();}));
 rotation?.addEventListener('input',()=>{angle=Number(rotation.value);if(mode==='3d')paint();});
 elevation?.addEventListener('input',()=>{pitch=Number(elevation.value);if(mode==='3d')paint();});
 container.querySelectorAll('[data-3d-turn]').forEach(btn=>btn.addEventListener('click',()=>{angle=(angle+Number(btn.dataset['3dTurn'])+360)%360;if(rotation)rotation.value=angle;if(mode==='3d')paint();}));
 host.addEventListener('pointerdown',e=>{
  if(mode==='3d'){drag={kind:'orbit',x:e.clientX,base:angle,id:e.pointerId};host.setPointerCapture?.(e.pointerId);return;}
  const hit=e.target.closest('[data-pm-opening]');if(!hit)return;
  selected=hit.getAttribute('data-pm-opening');drag={kind:'opening',id:e.pointerId};host.setPointerCapture?.(e.pointerId);paint();
 });
 host.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.kind==='orbit'){angle=(drag.base+(e.clientX-drag.x)*.8+3600)%360;if(rotation)rotation.value=Math.round(angle);paint();return;}
  const sel=selectedOpening(),svg=host.querySelector('svg');if(!svg||!sel)return;
  const ctm=svg.getScreenCTM();if(!ctm)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(ctm.inverse());
  const {width:w,depth:d}=scene.room,sc=Math.min(360/w,295/d),left=(480-w*sc)/2,top=(385-d*sc)/2;
  const dist=sel.value.wall==='north'||sel.value.wall==='south'?(p.x-left)/sc:(p.y-top)/sc;
  const next=Math.round(clamp(dist-sel.value.width/2,0,wallSize(scene,sel.value.wall)-sel.value.width)*100)/100;
  if(next!==sel.value.offset)apply({offset:next},true);
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,()=>{if(drag?.kind==='opening'&&dirty)showStatus('Position geändert – jetzt speichern.');drag=null;});
 editor.addEventListener('click',async e=>{
  const btn=e.target.closest('button');if(!btn||saving)return;
  if(btn.dataset.pmSelect){selected=btn.dataset.pmSelect;paint();}
  if(btn.dataset.pmAdd){try{scene=addOpening(scene,btn.dataset.pmAdd);selected=`${btn.dataset.pmAdd}:${openingList(scene,btn.dataset.pmAdd).length-1}`;dirty=true;mode='plan';paint();showStatus('Neue Öffnung hinzugefügt. Position auswählen und speichern.');}catch(err){showStatus(err.message,true);}}
  if(btn.dataset.pmRemove){const sel=selectedOpening();if(!sel)return;openingList(scene,sel.kind).splice(sel.index,1);selected=null;dirty=true;paint();showStatus('Öffnung entfernt – noch nicht gespeichert.');}
  if(btn.dataset.pmReset){scene=structuredClone(committed);selected=null;dirty=false;paint();showStatus('Nicht gespeicherte Änderungen verworfen.');}
  if(btn.dataset.pmSave&&dirty){saving=true;renderControls();try{const validated=validate3DScene(scene);await save?.(validated);committed=structuredClone(validated);scene=structuredClone(validated);dirty=false;showStatus('✓ Türen und Fenster gespeichert.');paint();}catch(err){showStatus('Speichern fehlgeschlagen: '+err.message,true);}finally{saving=false;renderControls();}}
 });
 editor.addEventListener('input',e=>{
  const sel=selectedOpening();if(!sel)return;
  if(e.target.id==='pmOpeningOffset'){
   try{
    scene=editOpening(scene,sel.kind,sel.index,{offset:Number(e.target.value)});dirty=true;
    host.innerHTML=mode==='plan'?renderPlanSVG(scene,selected):render3DSVG(scene,{angle,elevation:pitch});
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
 paint();
}
export function downloadJSON(scene,filename){
 const body=JSON.stringify(validate3DScene(scene),null,2)+'\n';const u=URL.createObjectURL(new Blob([body],{type:'application/json'}));
 const a=document.createElement('a');a.href=u;a.download=filename;a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6000);
}
export function install3DViewer(container,scene){
 const host=container.querySelector('.pm-3d-viewport');if(host)host.innerHTML=render3DSVG(scene);
}
