/** P03 – Putzmanager ohne 3D-Oberfläche, inklusive alter Raumdaten. */
import {ROOM_TYPES,OBJECT_TYPES,roomDraft,saveRoom,deleteRoom,listRooms,saveObject,deleteObject,addRoomPhoto,deleteRoomPhoto,readRoomPhoto} from './putzmanager-data.js';
import {mountCleaningUi} from './putzmanager-cleaning-ui.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badges={bad:'🛁',kueche:'🍳',wc:'🚽',wohnen:'🛋️',schlafen:'🛏️',kind:'🧸',flur:'🚪',abstell:'📦',arbeiten:'💻',sonst:'🏠'};
const objectBadges={wc:'🚽',waschbecken:'🚰',dusche:'🚿',wanne:'🛁',spiegel:'🪞',schrank:'🚪',waschmaschine:'🫧',spuele:'🚰',herd:'🍳',kuehlschrank:'🧊',arbeitsplatte:'▰',tisch:'▤',sofa:'🛋️',bett:'🛏️',regal:'▥',unterschrank:'▰',oberschrank:'▤',geschirrspueler:'🫧',backofen:'♨️',stuhl:'🪑',heizkoerper:'♨️',muelleimer:'🗑️',dunstabzug:'◇',sonst:'◆'};
const opt=(items,selected)=>Object.entries(items).map(([val,label])=>`<option value="${esc(val)}" ${val===selected?'selected':''}>${esc(label)}</option>`).join('');
const roomObjects=room=>room.sketch3d?.objects||room.objects||[];
const dims=room=>room.width&&room.depth?`${room.width} × ${room.depth} m`:'Maße offen';
function intro(){return `<div class="pm-hero"><div class="pm-hero-icon">🏠</div><div><div class="pm-eyebrow">PUTZMANAGER · P03</div><h1>Einfach putzen</h1><p>Raum wählen, Reinigung starten, abhaken.</p></div></div>`;}
function roomCards(rooms){return `${intro()}<div class="pm-overview"><div><strong>${rooms.length}</strong><span>${rooms.length===1?'Raum angelegt':'Räume angelegt'}</span></div><span class="pm-private">🔒 Nur auf diesem Gerät</span></div><div class="pm-actions"><button class="primary-button pm-accent" data-action="new-room" type="button">＋ Raum anlegen</button></div>${rooms.length?`<div class="pm-room-list">${rooms.map(r=>`<button class="pm-room-card" type="button" data-action="open-room" data-id="${esc(r.id)}"><span class="pm-room-icon">${badges[r.type]||'🏠'}</span><span class="pm-room-copy"><strong>${esc(r.name)}</strong><small>${esc(ROOM_TYPES[r.type]||'Zimmer')} · Direkt zur Putzliste</small></span><span class="pm-chevron">›</span></button>`).join('')}</div>`:`<div class="pm-blank"><div class="pm-blank-icon">🏡</div><h2>Hier entsteht deine Wohnung</h2><p>Lege einen Raum an und beginne direkt mit der Putzliste. Maße sind nicht nötig.</p></div>`}`;}
function editForm(room){return `${intro()}<form id="pmRoomForm" class="pm-panel"><h2>${room?'Raum bearbeiten':'Neuen Raum anlegen'}</h2><label for="pmName">Raumname *</label><input class="search-input" id="pmName" name="name" required maxlength="60" placeholder="z. B. Badezimmer" value="${esc(room?.name||'')}"><label for="pmType">Raumart</label><select class="search-input" id="pmType" name="type">${opt(ROOM_TYPES,room?.type||'bad')}</select><input type="hidden" name="width" value="${room?.width??''}"><input type="hidden" name="depth" value="${room?.depth??''}"><label for="pmNotes">Notizen</label><textarea class="note-input" id="pmNotes" name="notes" maxlength="2500" placeholder="Besonderheiten, Fenster, Möbel, Reinigungswünsche …">${esc(room?.notes||'')}</textarea><div class="pm-actions"><button class="primary-button pm-accent" type="submit">✓ Raum speichern</button><button class="secondary-button" type="button" data-action="cancel-form">Abbrechen</button></div></form>`;}
function cleaningRows(objects){return objects.map(o=>`<div class="pm-object-row"><span>${objectBadges[o.type]||'◆'}</span><span>${esc(o.name)}</span><button type="button" data-action="delete-object" data-id="${esc(o.id)}" class="pm-mini-delete" aria-label="${esc(o.name)} entfernen">Entfernen</button></div>`).join('')||'<p class="pm-hint">Noch keine Objekte eingetragen.</p>';}
function detail(room){return `<div class="pm-detail-heading"><button type="button" class="secondary-button" data-action="rooms-list">‹ Alle Räume</button><span class="pm-private">🔒 Lokal</span></div><div class="pm-detail-title"><span>${badges[room.type]||'🏠'}</span><div><h1>${esc(room.name)}</h1><p>Deine Putzliste · Einfach abhaken</p></div></div><div id="pmCleaningStage"><p class="pm-hint">Reinigungsplan wird geladen …</p></div><details class="pm-extra-settings"><summary>⚙️ Fotos, Zusatzbereiche und Raum verwalten</summary><div class="pm-extra-inner"><div class="pm-panel"><div class="pm-panel-heading"><h2>Fotos <small>(${(room.photos||[]).length}/24)</small></h2></div><p>Fotografiere dein Zimmer aus mehreren Perspektiven. Die Fotos bleiben in der lokalen App-Datenbank.</p><label class="pm-file-btn" for="pmPhotoInput">📷 Fotos auswählen oder aufnehmen</label><input id="pmPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden/><p class="pm-hint">JPG, PNG oder WebP · max. 12 MB je Originalfoto · Bilder werden verkleinert.</p><div class="pm-photos" id="pmPhotos">${(room.photos||[]).map(p=>`<div class="pm-photo" data-photo="${esc(p.id)}"><div class="pm-photo-placeholder">Bild wird geladen …</div><button type="button" class="pm-remove" data-action="delete-photo" data-id="${esc(p.id)}" aria-label="Foto ${esc(p.name)} löschen">×</button></div>`).join('')}</div></div><div class="pm-panel"><h2>Objekte & Reinigungsbereiche <small id="pmCleaningCount">(${roomObjects(room).length})</small></h2><p>Zusätzliche Reinigungsbereiche, die nicht in deiner Schnellliste stehen.</p><div class="pm-object-list" id="pmCleaningObjects">${cleaningRows(roomObjects(room))}</div><form id="pmObjectForm"><label for="pmObjType">Objektart</label><select id="pmObjType" name="type" class="search-input">${opt(OBJECT_TYPES,'wc')}</select><label for="pmObjName">Bezeichnung</label><input id="pmObjName" name="name" required maxlength="60" class="search-input" placeholder="z. B. WC links"/><input type="hidden" name="position" value="5"><button type="submit" class="secondary-button pm-full">＋ Objekt hinzufügen</button></form></div><div class="pm-panel"><h2>Raumnotizen</h2><p class="pm-notes">${room.notes?esc(room.notes).replace(/\n/g,'<br>'):'Noch keine Notizen gespeichert.'}</p><div class="pm-actions"><button type="button" class="secondary-button" data-action="edit-room">✎ Raum bearbeiten</button><button type="button" class="pm-danger" data-action="delete-room">Raum löschen</button></div></div></div></details>`;}
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
 let rooms=[],screen='list',selectedId='',editingId='',busy=false,stamp=0,photoUrls=[],cleanupCleaning=()=>{};
 const message=(s,error=false)=>{if(!root.isConnected)return;status.textContent=s;status.classList.toggle('pm-error',error);};
 const clean=()=>{for(const u of photoUrls)URL.revokeObjectURL(u);photoUrls=[];};
 async function paint(){
  const generation=++stamp;
  try{rooms=await listRooms();}catch(err){message('Speicher nicht verfügbar: '+err.message,true);return;}
  if(!root.isConnected||generation!==stamp)return;
  const room=rooms.find(r=>r.id===selectedId);
  if(screen==='detail'&&!room){screen='list';selectedId='';}
  cleanupCleaning();cleanupCleaning=()=>{};clean();
  if(screen==='form')content.innerHTML=editForm(rooms.find(r=>r.id===editingId));
  else if(screen==='detail'){
   content.innerHTML=detail(room);
   try{cleanupCleaning=await mountCleaningUi({root,room,notify:message});}catch(err){message('Reinigungsübersicht konnte nicht geladen werden: '+err.message,true);}
   if(!root.isConnected||generation!==stamp){cleanupCleaning();return;}
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
  if(what==='delete-object'&&confirm('Diesen zusätzlichen Reinigungsbereich entfernen?'))action(()=>deleteObject(selectedId,button.dataset.id),'Objekt entfernt.');
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
 window.addEventListener('pagehide',()=>{cleanupCleaning();clean();},{once:true});
 paint();
}
