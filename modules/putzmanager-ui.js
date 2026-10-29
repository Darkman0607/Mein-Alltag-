/** W01: Wohnungszentrale. No private room photos or plans are shipped as app assets. */
import {ROOM_TYPES,OBJECT_TYPES,roomDraft,saveRoom,deleteRoom,listRooms,saveObject,deleteObject,addRoomPhoto,deleteRoomPhoto,readRoomPhoto} from './putzmanager-data.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badges={bad:'🛁',kueche:'🍳',wc:'🚽',wohnen:'🛋️',schlafen:'🛏️',kind:'🧸',flur:'🚪',abstell:'📦',arbeiten:'💻',sonst:'🏠'};
const objectBadges={wc:'🚽',waschbecken:'🚰',dusche:'🚿',wanne:'🛁',spiegel:'🪞',schrank:'🚪',waschmaschine:'🫧',spuele:'🚰',herd:'🍳',kuehlschrank:'🧊',arbeitsplatte:'▰',tisch:'▤',sofa:'🛋️',bett:'🛏️',regal:'▥',sonst:'◆'};
const opt=(items,selected)=>Object.entries(items).map(([val,label])=>`<option value="${esc(val)}" ${val===selected?'selected':''}>${esc(label)}</option>`).join('');
const dims=room=>room.width&&room.depth?`${room.width} × ${room.depth} m`:'Maße offen';
function intro(){return `<div class="pm-hero"><div class="pm-hero-icon">🏠</div><div><div class="pm-eyebrow">PUTZMANAGER · W01</div><h1>Meine Wohnung</h1><p>Deine Räume. Deine Fotos. Dein späterer Putzplan.</p></div></div>`;}
function roomCards(rooms){return `${intro()}<div class="pm-overview"><div><strong>${rooms.length}</strong><span>${rooms.length===1?'Raum angelegt':'Räume angelegt'}</span></div><span class="pm-private">🔒 Nur auf diesem Gerät</span></div><div class="pm-actions"><button class="primary-button pm-accent" data-action="new-room" type="button">＋ Raum anlegen</button></div>${rooms.length?`<div class="pm-room-list">${rooms.map(r=>`<button class="pm-room-card" type="button" data-action="open-room" data-id="${esc(r.id)}"><span class="pm-room-icon">${badges[r.type]||'🏠'}</span><span class="pm-room-copy"><strong>${esc(r.name)}</strong><small>${esc(ROOM_TYPES[r.type]||'Zimmer')} · ${esc(dims(r))}</small><small>${(r.photos||[]).length} Fotos · ${(r.objects||[]).length} Objekte · Skizze offen</small></span><span class="pm-chevron">›</span></button>`).join('')}</div>`:`<div class="pm-blank"><div class="pm-blank-icon">🏡</div><h2>Hier entsteht deine Wohnung</h2><p>Lege deinen ersten Raum an. Badezimmer und Küche können wir im nächsten Update mit deinen echten Fotos als Skizzen ausarbeiten.</p></div>`}<div class="pm-info">ℹ️ W01 legt die Raumstruktur an. Foto-basierte Zimmer-Skizzen folgen ab W02 – jeweils zwei Zimmer pro Update.</div>`;}
function editForm(room){return `${intro()}<form id="pmRoomForm" class="pm-panel"><h2>${room?'Raum bearbeiten':'Neuen Raum anlegen'}</h2><label for="pmName">Raumname *</label><input class="search-input" id="pmName" name="name" required maxlength="60" placeholder="z. B. Badezimmer" value="${esc(room?.name||'')}"><label for="pmType">Raumart</label><select class="search-input" id="pmType" name="type">${opt(ROOM_TYPES,room?.type||'bad')}</select><div class="pm-two"><div><label for="pmWidth">Breite (m) · optional</label><input class="search-input" type="number" id="pmWidth" name="width" min="0.5" max="100" step="0.01" placeholder="z. B. 3,5" value="${room?.width??''}"></div><div><label for="pmDepth">Länge (m) · optional</label><input class="search-input" type="number" id="pmDepth" name="depth" min="0.5" max="100" step="0.01" placeholder="z. B. 4" value="${room?.depth??''}"></div></div><label for="pmNotes">Notizen</label><textarea class="note-input" id="pmNotes" name="notes" maxlength="2500" placeholder="Besonderheiten, Fenster, Möbel, Reinigungswünsche …">${esc(room?.notes||'')}</textarea><div class="pm-actions"><button class="primary-button pm-accent" type="submit">✓ Raum speichern</button><button class="secondary-button" type="button" data-action="cancel-form">Abbrechen</button></div></form>`;}
function sketch(room){return `<div class="pm-sketch"><div class="pm-sketch-caption">2D-Grundstruktur · Noch nicht nach Fotos angepasst</div><div class="pm-sketch-grid" role="img" aria-label="Schematische Raumfläche mit ${(room.objects||[]).length} markierten Objekten, nicht maßstabsgetreu"><span class="pm-sketch-label">${esc(room.name)}</span>${(room.objects||[]).map(o=>`<span class="pm-marker" style="left:${Math.round(o.x*100)}%;top:${Math.round(o.y*100)}%" title="${esc(o.name)}">${objectBadges[o.type]||'◆'}<small>${esc(o.name)}</small></span>`).join('')}</div><p class="pm-hint">Noch keine echten Wände, Türen oder Fenster eingezeichnet. Das folgt mit deinen Fotos.</p></div>`;}
function detail(room){return `<div class="pm-detail-heading"><button type="button" class="secondary-button" data-action="rooms-list">‹ Alle Räume</button><span class="pm-private">🔒 Lokal</span></div><div class="pm-detail-title"><span>${badges[room.type]||'🏠'}</span><div><h1>${esc(room.name)}</h1><p>${esc(ROOM_TYPES[room.type]||'Zimmer')} · ${esc(dims(room))}</p></div></div>${sketch(room)}<div class="pm-panel"><div class="pm-panel-heading"><h2>Fotos <small>(${(room.photos||[]).length}/24)</small></h2></div><p>Fotografiere dein Zimmer aus mehreren Perspektiven. Die Fotos bleiben in der lokalen App-Datenbank.</p><label class="pm-file-btn" for="pmPhotoInput">📷 Fotos auswählen oder aufnehmen</label><input id="pmPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden/><p class="pm-hint">JPG, PNG oder WebP · max. 12 MB je Originalfoto · Bilder werden verkleinert.</p><div class="pm-photos" id="pmPhotos">${(room.photos||[]).map(p=>`<div class="pm-photo" data-photo="${esc(p.id)}"><div class="pm-photo-placeholder">Bild wird geladen …</div><button type="button" class="pm-remove" data-action="delete-photo" data-id="${esc(p.id)}" aria-label="Foto ${esc(p.name)} löschen">×</button></div>`).join('')}</div></div><div class="pm-panel"><h2>Objekte & Reinigungsbereiche <small>(${(room.objects||[]).length})</small></h2><p>Für die spätere Raumskizze kannst du bereits wichtige Möbel oder Gegenstände markieren.</p><div class="pm-object-list">${(room.objects||[]).map(o=>`<div class="pm-object-row"><span>${objectBadges[o.type]||'◆'}</span><span>${esc(o.name)}</span><button type="button" data-action="delete-object" data-id="${esc(o.id)}" class="pm-mini-delete" aria-label="${esc(o.name)} entfernen">Entfernen</button></div>`).join('')||'<p class="pm-hint">Noch keine Objekte eingetragen.</p>'}</div><form id="pmObjectForm"><label for="pmObjType">Objektart</label><select id="pmObjType" name="type" class="search-input">${opt(OBJECT_TYPES,'wc')}</select><label for="pmObjName">Bezeichnung</label><input id="pmObjName" name="name" required maxlength="60" class="search-input" placeholder="z. B. WC links"/><label for="pmObjPos">Ungefähre Position (von oben gesehen)</label><select id="pmObjPos" name="position" class="search-input">${['oben links','oben Mitte','oben rechts','Mitte links','Raummitte','Mitte rechts','unten links','unten Mitte','unten rechts'].map((v,i)=>`<option value="${i+1}">${v}</option>`).join('')}</select><button type="submit" class="secondary-button pm-full">＋ Objekt hinzufügen</button></form></div><div class="pm-panel"><h2>Raumnotizen</h2><p class="pm-notes">${room.notes?esc(room.notes).replace(/\n/g,'<br>'):'Noch keine Notizen gespeichert.'}</p><div class="pm-actions"><button type="button" class="secondary-button" data-action="edit-room">✎ Raum bearbeiten</button><button type="button" class="pm-danger" data-action="delete-room">Raum löschen</button></div></div><p class="pm-info">Der eigentliche Putzplan, Reinigungszonen und die Foto-zu-Skizze-Übertragung kommen in den vorgesehenen Folgeupdates.</p>`;}
/** Browser-side JPEG downscale; avoids storing originals that would exhaust mobile quota. */
async function optimizePhoto(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024||!file.size)throw Error('Nur JPG/PNG/WebP bis 12 MB auswählen.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>28_000_000)throw Error('Bildauflösung zu groß.');
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Bildbearbeitung nicht verfügbar.');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));
  canvas.width=0;canvas.height=0;
  if(!result||result.size>6*1024*1024)throw Error('Foto konnte nicht ausreichend verkleinert werden.');
  return result;
 }finally{bitmap.close?.();}
}
export function renderPutzmanager(){return `<div id="pmRoot" class="pm-root"><div id="pmStatus" class="pm-status" role="status" aria-live="polite"></div><div id="pmContent"><p class="pm-hint">Wohnung wird geladen …</p></div></div>`;}
export function mountPutzmanager(){
 const root=document.getElementById('pmRoot');if(!root)return;
 const content=root.querySelector('#pmContent'),status=root.querySelector('#pmStatus');
 let rooms=[],screen='list',selectedId='',editingId='',busy=false,stamp=0,photoUrls=[];
 const message=(s,error=false)=>{if(!root.isConnected)return;status.textContent=s;status.classList.toggle('pm-error',error);};
 const clean=()=>{for(const u of photoUrls)URL.revokeObjectURL(u);photoUrls=[];};
 async function paint(){
  const generation=++stamp;
  try{rooms=await listRooms();}catch(err){message('Speicher nicht verfügbar: '+err.message,true);return;}
  if(!root.isConnected||generation!==stamp)return;
  const room=rooms.find(r=>r.id===selectedId);
  if(screen==='detail'&&!room){screen='list';selectedId='';}
  clean();
  if(screen==='form')content.innerHTML=editForm(rooms.find(r=>r.id===editingId));
  else if(screen==='detail'){
   content.innerHTML=detail(room);
   for(const p of room.photos||[]){
    try{const b=await readRoomPhoto(p.id);if(!root.isConnected||generation!==stamp)return;
     const node=content.querySelector(`[data-photo="${CSS.escape(p.id)}"] .pm-photo-placeholder`);
     if(node&&b instanceof Blob){const url=URL.createObjectURL(b);photoUrls.push(url);node.innerHTML=`<img alt="${esc(p.name||'Raumfoto')}" src="${url}">`;}
    }catch{ /* Thumbnail failure must not break room management. */ }
   }
  }else content.innerHTML=roomCards(rooms);
 }
 async function action(fn,success){if(busy)return;busy=true;message('Speichere …');try{await fn();message(success||'Gespeichert ✓');await paint();}catch(err){message(err.message||'Speichern fehlgeschlagen.',true);}finally{busy=false;}}
 root.addEventListener('click',e=>{
  const button=e.target.closest('[data-action]');if(!button)return;
  const what=button.dataset.action;
  if(what==='new-room'){screen='form';editingId='';message('');paint();}
  if(what==='rooms-list'){screen='list';selectedId='';message('');paint();}
  if(what==='open-room'){selectedId=button.dataset.id;screen='detail';message('');paint();}
  if(what==='edit-room'){editingId=selectedId;screen='form';message('');paint();}
  if(what==='cancel-form'){screen=editingId?'detail':'list';message('');paint();}
  if(what==='delete-room'&&confirm('Diesen Raum einschließlich seiner Fotos und Objekte endgültig löschen?')){
   const rid=selectedId;action(async()=>{await deleteRoom(rid);selectedId='';screen='list';},'Raum gelöscht.');
  }
  if(what==='delete-photo'&&confirm('Dieses Zimmerfoto löschen?'))action(()=>deleteRoomPhoto(selectedId,button.dataset.id),'Foto gelöscht.');
  if(what==='delete-object')action(()=>deleteObject(selectedId,button.dataset.id),'Objekt entfernt.');
 });
 root.addEventListener('submit',e=>{
  if(e.target.id==='pmRoomForm'){
   e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
   try{roomDraft(data);}catch(err){message(err.message,true);return;}
   action(async()=>{const rid=await saveRoom(data,editingId||null);selectedId=rid;screen='detail';},'Raum gespeichert ✓');
  }
  if(e.target.id==='pmObjectForm'){
   e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
   action(()=>saveObject(selectedId,data),'Objekt gespeichert ✓');
  }
 });
 root.addEventListener('change',async e=>{
  if(e.target.id!=='pmPhotoInput')return;
  const files=Array.from(e.target.files||[]);if(!files.length||busy)return;
  const roomId=selectedId;busy=true;let added=0,failed=[];
  try{
   for(const file of files){
    try{message(`Foto ${added+1}/${files.length} wird verarbeitet …`);const blob=await optimizePhoto(file);await addRoomPhoto(roomId,blob,file.name);added++;}
    catch(err){failed.push(`${file.name}: ${err.message}`);}
   }
   await paint();message(`${added} Foto(s) gespeichert.${failed.length?' Fehler: '+failed.join('; '):''}`,Boolean(failed.length));
  }finally{busy=false;}
 });
 window.addEventListener('pagehide',clean,{once:true});
 paint();
}
