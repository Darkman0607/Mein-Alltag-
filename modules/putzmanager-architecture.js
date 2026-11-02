/** W02 – offline architectural room rendering in pure SVG. No photo upload, CDN or network access.
 * This is a deliberately stylised architectural visualization, not photorealism or CAD.
 * Every furnished surface is derived from editable scene geometry; no private floor plan is bundled.
 */
const archClamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const palette={
 wc:['#d5e6e5','#a3babc'],waschbecken:['#f1f5f1','#c2d5d1'],dusche:['#b6dce5','#82afc0'],wanne:['#dae9ed','#abc9d4'],spiegel:['#91cada','#648f9d'],
 schrank:['#c6b7a7','#897564'],unterschrank:['#584a46','#302d2b'],oberschrank:['#e8e7e1','#c5c5bd'],geschirrspueler:['#dbdbd5','#aeb5b9'],
 spuele:['#5e5049','#302c2c'],herd:['#61544e','#292729'],backofen:['#4f4441','#252526'],kuehlschrank:['#e3e1d8','#a6aaa9'],
 arbeitsplatte:['#615a57','#363336'],tisch:['#b29879','#765c48'],stuhl:['#91745c','#624b40'],sofa:['#88aaa0','#5c7770'],
 bett:['#b8c4d6','#8996ac'],regal:['#c3ae92','#756656'],heizkoerper:['#f1f1e8','#b4bab6'],muelleimer:['#7b8587','#4f5c5e'],
 dunstabzug:['#d1d4d1','#7d8589'],waschmaschine:['#e6e6de','#adb7bb'],sonst:['#bcb09f','#746b66']
};
const sh=(hex,f)=>{const h=hex.replace('#','');const n=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));return `rgb(${n.map(v=>archClamp(Math.round(v*f),0,255)).join(' ')})`;};
function objectKind(o){if(o.type!=='schrank'&&o.type!=='sonst')return o.type;const n=(o.name||'').toLocaleLowerCase('de');if(n.includes('geschirrspüler')||n.includes('spülmaschine'))return 'geschirrspueler';if(n.includes('oberschrank')||n.includes('hängeschrank'))return 'oberschrank';if(n.includes('unterschrank'))return 'unterschrank';if(n.includes('heizkörper'))return 'heizkoerper';if(n.includes('backofen'))return 'backofen';if(n.includes('stuhl')||n.includes('sessel'))return 'stuhl';if(n.includes('abfall')||n.includes('müll'))return 'muelleimer';return o.type;}
export function renderArchitectural3DSVG(scene,{angle=35,elevation=53,zoom=1}={}){
 const w=scene.room.width,d=scene.room.depth,h=scene.room.height,rad=Math.PI/180,a=angle*rad,el=elevation*rad;
 // Fit the full room at default zoom regardless of orientation; zooming in may intentionally crop.
 const raw=([x,y,z])=>{const dx=x-w/2,dz=z-d/2,xx=dx*Math.cos(a)+dz*Math.sin(a),zz=-dx*Math.sin(a)+dz*Math.cos(a);return [xx,zz*Math.sin(el)-y*Math.cos(el),zz*Math.cos(el)+y*Math.sin(el)];};
 const corners=[];for(const x of [0,w])for(const y of [0,h])for(const z of [0,d])corners.push(raw([x,y,z]));
 const xs=corners.map(v=>v[0]),ys=corners.map(v=>v[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(430/Math.max(.1,maxX-minX),370/Math.max(.1,maxY-minY))*.84*zoom;
 const cx=240-((minX+maxX)/2)*scale,cy=200-((minY+maxY)/2)*scale;
 const project=p=>{const v=raw(p);return [cx+v[0]*scale,cy+v[1]*scale,v[2]];};
 let idx=0;const pieces=[];
 const n=x=>Number(x.toFixed(1));
 const polygon=(vertices,fill,stroke='none',strokeWidth=0,opacity=1,priority=0,extra='')=>{
  const p=vertices.map(project),depth=p.reduce((s,q)=>s+q[2],0)/p.length;
  pieces.push({depth:depth+priority/10000,order:idx++,markup:`<polygon points="${p.map(q=>`${n(q[0])},${n(q[1])}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linejoin="round" ${extra}/>`});
 };
 const line=(points,color,width=1,opacity=1,priority=.5)=>{
  const p=points.map(project),depth=p.reduce((s,q)=>s+q[2],0)/p.length;
  pieces.push({depth:depth+priority/10000,order:idx++,markup:`<polyline points="${p.map(q=>`${n(q[0])},${n(q[1])}`).join(' ')}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`});
 };
 const box=(x1,x2,y1,y2,z1,z2,color,light,tag='')=>{
  const sides=[[[x1,y1,z1],[x1,y1,z2],[x1,y2,z2],[x1,y2,z1]],[[x2,y1,z1],[x2,y1,z2],[x2,y2,z2],[x2,y2,z1]],[[x1,y1,z1],[x2,y1,z1],[x2,y2,z1],[x1,y2,z1]],[[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]],[[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]]];
  sides.forEach((p,i)=>polygon(p,sh(color,[.94,.73,.71,.86,light||1.2][i]),'#17252b55',.7,1,0,tag));
 };
 const frame=(wall,offset,width,y1,y2,inset,fill,stroke,tag)=>{
  let p;if(wall==='north'||wall==='south'){const z=wall==='north'?-inset:d+inset;p=[[offset,y1,z],[offset+width,y1,z],[offset+width,y2,z],[offset,y2,z]];}
  else{const x=wall==='west'?-inset:w+inset;p=[[x,y1,offset],[x,y1,offset+width],[x,y2,offset+width],[x,y2,offset]];}
  polygon(p,fill,stroke,2,1,2,tag);return p;
 };
 const insetRect=(v,rate=.07)=>v.map((p,i)=>p.map((q,k)=>q*(1-rate)+(v.reduce((s,t)=>s+t[k],0)/v.length)*rate));
 // Vinyl/wood floor and subtle plank seams – photo-based palette only, no copied photo textures.
 polygon([[0,0,0],[w,0,0],[w,0,d],[0,0,d]],'#a99983','#f2dfbe',1.2);
 for(let z=.27;z<d;z+=.36)line([[.015,.006,z],[w-.015,.006,z]],'#6f655a',.65,.38);
 for(let z=0,j=0;z<d;z+=.72,j++)for(let x=(j%2)*.67;x<w;x+=1.34)line([[x,.009,z],[x,.009,Math.min(d,z+.36)]],'#dfcfb8',.55,.3);
 // White plaster walls on the far two sides only: the furniture remains visible while rotating.
 const walls={north:[[0,0,0],[w,0,0],[w,h,0],[0,h,0]],south:[[0,0,d],[w,0,d],[w,h,d],[0,h,d]],west:[[0,0,0],[0,0,d],[0,h,d],[0,h,0]],east:[[w,0,0],[w,0,d],[w,h,d],[w,h,0]]};
 const far=new Set([Math.cos(a)>=0?'north':'south',Math.sin(a)>=0?'east':'west']);
 for(const [wall,points] of Object.entries(walls))if(far.has(wall))polygon(points,wall==='north'?'#e7e4dd':'#f3f3ed','#e8e7e1',1,.43,-4,`data-wall="${wall}"`);
 // Window / door shapes support opposite walls when the room is rotated.
 for(const win of scene.windows||[]){
  const v=frame(win.wall,win.offset,win.width,win.sill,win.sill+win.height,.019,'#c0dbe0','#f9ffff','data-window="true"');
  polygon(insetRect(v,.08),'#a4cbd2','#dffaff',1,.85,3);
  // Window mullions, parallel slats like the blinds in the supplied reference photos.
  const a=v[0],b=v[1],c=v[2],dd=v[3];
  line([[ (a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],[ (c[0]+dd[0])/2,(c[1]+dd[1])/2,(c[2]+dd[2])/2]],'#f5f9f3',2.6,.95,3);
  for(let t=.2;t<.92;t+=.135){const p=v[0].map((q,k)=>q*(1-t)+v[3][k]*t),q=v[1].map((v2,k)=>v2*(1-t)+v[2][k]*t);line([p,q],'#f2f5ec',1.35,.77,4);}
 }
 for(const door of scene.doors||[]){const v=frame(door.wall,door.offset,door.width,.01,Math.min(2.12,h),.03,'#bfc7c2','#ffffff','data-door="true"');polygon(insetRect(v,.08),'#e4e5de','#fbfdf9',1,1,3);}
 const objs=scene.objects||[];
 for(const [i,o] of objs.entries()){
  const swapped=o.rotation===90||o.rotation===270,ww=swapped?o.depth:o.width,dd=swapped?o.width:o.depth;
  const x1=o.x-ww/2,x2=o.x+ww/2,z1=o.z-dd/2,z2=o.z+dd/2,y1=o.baseY||0,y2=y1+o.height,k=objectKind(o),col=palette[k]||palette.sonst;
  if(!o.baseY&&k!=='arbeitsplatte')polygon([[x1-.015,.006,z1-.025],[x2+.015,.006,z1-.025],[x2+.015,.006,z2+.025],[x1-.015,.006,z2+.025]],'#293129', 'none',0,.22,-2);
  // An actual chair has a seat/back/legs; tables have an open space under the tabletop.
  if(k==='tisch'){
   for(const x of [x1+.08,x2-.08])for(const z of [z1+.08,z2-.08])box(x-.035,x+.035,0,Math.min(.69,y2-.04),z-.035,z+.035,'#6a5445',1);
   box(x1,x2,y2-.075,y2,z1,z2,col[0],1.23,`data-object="${i}"`);
   for(let z=z1+.07;z<z2-.02;z+=.13)line([[x1+.02,y2+.007,z],[x2-.02,y2+.007,z]],'#d1b293',.5,.32);
   continue;
  }
  if(k==='stuhl'){
   for(const x of [x1+.05,x2-.05])for(const z of [z1+.05,z2-.05])box(x-.025,x+.025,0,.46,z-.025,z+.025,col[1],1);
   box(x1+.02,x2-.02,.43,.5,z1+.025,z2-.025,col[0],1.15,`data-object="${i}"`);
   box(x1+.015,x2-.015,.52,y2,z2-.065,z2-.015,col[0],1.07);continue;
  }
  if(k==='regal'){
   const p=.055;for(const x of [x1,x2-p])box(x,x+p,y1,y2,z1,z2,col[1],1.1);
   for(let y=y1+.12;y<y2;y+=.36)box(x1,x2,y,y+.036,z1,z2,col[0],1.12,`data-object="${i}"`);
   continue;
  }
  if(k==='muelleimer'){
   box(x1+.02,x2-.02,y1,y2-.07,z1+.02,z2-.02,col[0],1.1,`data-object="${i}"`);
   box(x1,x2,y2-.085,y2,z1,z2,col[1],1.17);continue;
  }
  if(k==='heizkoerper'){
   box(x1,x2,y1,y2,z1,z2,col[0],1.08,`data-object="${i}"`);
   const faceX=x1-.012;for(let z=z1+.09;z<z2-.06;z+=.075)line([[faceX,y1+.09,z],[faceX,y2-.06,z]],'#bac3c2',2.6,.94,4);continue;
  }
  if(k==='arbeitsplatte'){
   box(x1,x2,y1,y2,z1,z2,'#4c4a49',1.2,`data-object="${i}"`);continue;
  }
  // Cabinet panels, handle profiles, appliance displays – surfaces are not generic unmarked cubes.
  box(x1,x2,y1,y2,z1,z2,col[0],1.15,`data-object="${i}"`);
  const frontX=x1-.012,base=y1+.035,cap=y2-.035;
  const panel=[[frontX,base,z1+.025],[frontX,base,z2-.025],[frontX,cap,z2-.025],[frontX,cap,z1+.025]];
  let faceFill=col[0];if(['herd','backofen'].includes(k))faceFill='#514d4a';
  if(k==='kuehlschrank')faceFill='#e8e6de';
  polygon(panel,faceFill,sh(col[1],.75),.9,1,5);
  if(['schrank','unterschrank','oberschrank','spuele'].includes(k)){
   // subtle vertical wood grain and real narrow chrome handle
   for(let z=z1+.09;z<z2-.04;z+=.12)line([[frontX-.005,base+.03,z],[frontX-.005,cap-.04,z]],sh(col[0],.86),.65,.25,5);
   line([[frontX-.018,Math.min(cap-.15,base+.35),z2-.10],[frontX-.018,Math.min(cap-.06,base+.53),z2-.10]],'#d8dde0',2.5,1,6);
   if(k==='spuele'){
    box(x1-.027,x2+.016,y2-.035,y2+.01,z1-.028,z2+.028,'#54575a',1.24);
    const sinkY=y2+.016, sx1=x1+.065,sx2=x2-.055,sz1=z1+.12,sz2=z2-.11;
    polygon([[sx1,sinkY,sz1],[sx2,sinkY,sz1],[sx2,sinkY,sz2],[sx1,sinkY,sz2]],'#9aabb2','#edf1ed',1.5,1,8);
    polygon([[sx1+.06,sinkY+.001,sz1+.055],[sx2-.06,sinkY+.001,sz1+.055],[sx2-.06,sinkY+.001,sz2-.055],[sx1+.06,sinkY+.001,sz2-.055]],'#4e6469','#e8eff0',.9,1,9);
    line([[x2-.11,sinkY,sz2-.07],[x2-.11,sinkY+.13,sz2-.07],[x2-.20,sinkY+.13,sz2-.07]],'#dce3e2',2,1,9);
   }
  }
  if(['unterschrank','geschirrspueler','herd','spuele'].includes(k)){
   box(x1,x2,y2-.035,y2+.012,z1-.016,z2+.016,'#515255',1.14);
  }
  if(k==='geschirrspueler'){
   // Full integrated front and visible control strip near the top; recognizable dishwasher.
   polygon([[frontX-.01,cap-.15,z1+.035],[frontX-.01,cap-.15,z2-.035],[frontX-.01,cap-.04,z2-.035],[frontX-.01,cap-.04,z1+.035]],'#939b9d','#cdd5d5',.8,1,7);
   line([[frontX-.02,cap-.17,z1+.15],[frontX-.02,cap-.17,z2-.14]],'#e7edeb',3.5,1,8);
   for(let z=z1+.09;z<z1+.25;z+=.06)line([[frontX-.025,cap-.075,z],[frontX-.025,cap-.055,z]],'#d7e5e8',1.8,1,9);
  }
  if(k==='herd'||k==='backofen'){
   // Integrated oven front, handles and dark glass window.
   polygon([[frontX-.02,base+.18,z1+.075],[frontX-.02,base+.18,z2-.075],[frontX-.02,cap-.18,z2-.075],[frontX-.02,cap-.18,z1+.075]],'#202b31','#7a848a',1.2,1,8);
   line([[frontX-.03,cap-.14,z1+.12],[frontX-.03,cap-.14,z2-.12]],'#d4d6d5',3.4,1,9);
   if(k==='herd'){
    box(x1,x2,y2-.014,y2+.012,z1,z2,'#27292c',1.12);
    for(const X of [x1+.19,x2-.16])for(const Z of [z1+.19,z2-.19]){
     const rad2=.085;const pts=[];for(let t=0;t<=20;t++)pts.push([X+Math.cos(t*Math.PI/10)*rad2,y2+.02,Z+Math.sin(t*Math.PI/10)*rad2]);
     polygon(pts,'none','#a5abad',1.5,1,10);
    }
   }
  }
  if(k==='kuehlschrank'){
   const split=y1+o.height*.46;
   line([[frontX-.03,split,z1+.01],[frontX-.03,split,z2-.01]],'#9a9f9d',1.6,1,8);
   for(const y of [split-.18,split+.20])line([[frontX-.04,y,z2-.13],[frontX-.04,y+.22,z2-.13]],'#7d888b',3.6,1,9);
  }
  if(k==='oberschrank')line([[frontX-.015,y1+.11,z2-.10],[frontX-.015,y1+.21,z2-.10]],'#c5c9c7',2.5,1,9);
 }
 pieces.sort((a,b)=>a.depth-b.depth||a.order-b.order);
 const result=pieces.map(t=>t.markup).join('');
 return `<svg class="pm-3d-svg pm-architect-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 400" role="img" aria-label="Räumliche 3D-Ansicht mit Möbeln, Geräten, Türen und Fenstern"><defs><radialGradient id="pmArchSky" cx="50%" cy="36%" r="90%"><stop stop-color="#3a5553"/><stop offset="1" stop-color="#0b1a1c"/></radialGradient><filter id="pmArchShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity=".15"/></filter></defs><rect width="480" height="400" fill="url(#pmArchSky)"/>${result}</svg>`;
}
