/** BW02 – accessible, touch-friendly album. No demo ownership or artificial rewards. */
import {ALBUM_SLOTS,CATEGORY_APPEARANCE,CATEGORY_FIELDS,loadRewardAlbum,filterAlbum,setAlbumFavorite,saveAlbumCard,prepareAlbumImage} from './reward-album.js';
import {REWARD_CATEGORIES,REWARD_RARITIES} from './reward-data.js';
import {safeStarterAsset,installStarterSeries,previewStarterImport} from './reward-series.js';
import {renderPremiumSettings,playPremiumReveal} from './reward-premium.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const rarityNames={gewoehnlich:'Gewöhnlich',ungewoehnlich:'Ungewöhnlich',selten:'Selten',episch:'Episch',legendaer:'Legendär',mythisch:'Mythisch',diamant:'Diamant'};
const pad=n=>String(n).padStart(3,'0');
const percent=(n,total)=>total?Math.round(n*100/total):0;

export function renderRewardAlbum(){return `<div class="bw-album" id="bwAlbum">
 <div class="bw-album-intro"><span class="bw-album-kicker">SAMMLUNG · 4 THEMEN</span><h2>Dein Kartenalbum</h2><p>100 nummerierte Plätze. Kartenmotive können von dir ergänzt werden; <strong>ein ausgefüllter Kartenplatz ist noch keine gesammelte Karte</strong>.</p></div>
 ${renderPremiumSettings()}
 <div class="bw-starter-import" id="bwStarterImport"><button type="button" id="bwStarterImportButton">🎨 Fehlende Kartenplätze füllen</button><p id="bwStarterImportStatus" role="status" aria-live="polite">Startserie: 100 unabhängige Vektormotive; bereits angelegte Karten bleiben unverändert.</p></div>
 <div class="bw-album-stats" id="bwAlbumStats" role="status" aria-live="polite">Lade Sammelfortschritt …</div>
 <div class="bw-album-categories" id="bwAlbumCategories" role="group" aria-label="Kartenkategorie"></div>
 <div class="bw-album-controls"><label for="bwAlbumSearch">Karte suchen</label><input id="bwAlbumSearch" class="bw-album-search" type="search" maxlength="80" placeholder="Name oder Nummer, z. B. 003" autocomplete="off"/>
 <label for="bwAlbumFilter">Karten anzeigen</label><select id="bwAlbumFilter" class="bw-album-select"><option value="all">Alle Plätze</option><option value="owned">Nur gesammelte</option><option value="missing">Noch fehlende</option><option value="favorites">Meine Favoriten</option></select></div>
 <div class="bw-album-results" id="bwAlbumResults" aria-live="polite"></div><div class="bw-card-grid" id="bwAlbumGrid"><p>Album wird geladen …</p></div>
 <p class="bw-album-explain">Eine Katalogkarte ist noch keine gesammelte Karte. Echte Exemplare erhältst du erst durch Boosterziehung oder Splitter-Herstellung.</p>
 <div class="bw-card-modal" id="bwCardModal" hidden role="dialog" aria-modal="true" aria-labelledby="bwModalTitle"><div class="bw-card-modal-content"><button type="button" class="bw-modal-close" id="bwModalClose" aria-label="Kartendetails schließen">×</button><div id="bwModalBody"></div></div></div>
 </div>`;}

function art(slot,large=false){
 const appearance=CATEGORY_APPEARANCE[slot.categoryId];
 const image=slot.card?.imageData;
 const starter=slot.card&&!image?safeStarterAsset(slot.card):null;
 const hasSafeImage=typeof image==='string'&&/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(image)&&image.length<=1150000;
 const rarity=REWARD_RARITIES.includes(slot.card?.rarity)?slot.card.rarity:'unbekannt';
 return `<div class="bw-card-art bw-theme-${appearance.theme} bw-rarity-${rarity} ${slot.owned?'bw-is-owned':'bw-is-missing'} ${large?'bw-art-large':''}">
  ${hasSafeImage||starter?`<img src="${hasSafeImage?image:starter}" alt="${esc(slot.card.name)}" loading="lazy"/>`:`<span class="bw-card-emblem" aria-hidden="true">${appearance.icon}</span><span class="bw-card-unavailable">${slot.card?'Motiv fehlt':'Kartenplatz'}</span>`}
  <span class="bw-card-art-number">#${pad(slot.number)}</span><span class="bw11-rarity-chip">${esc(rarityNames[rarity]||'Karte')}</span>
 </div>`;
}

function tile(slot){const appearance=CATEGORY_APPEARANCE[slot.categoryId];const title=slot.card?.name||`Karte #${pad(slot.number)}`;
 return `<div class="bw-card-tile ${slot.owned?'has-copy':''}" data-slot="${esc(slot.id)}">
  <button type="button" class="bw-card-open" data-bw-open="${esc(slot.id)}" aria-label="${esc(title)}, ${esc(appearance.label)}, ${slot.owned?`${slot.owned} Exemplare`:'nicht gesammelt'} – Details öffnen">${art(slot)}<span class="bw-card-name">${esc(title)}</span><span class="bw-card-state">${slot.owned?`✓ ${slot.owned} × vorhanden`:slot.card?'Noch nicht gesammelt':'Nicht gestaltet'}</span></button>
  <button type="button" class="bw-card-favorite ${slot.favorite?'is-favorite':''}" data-bw-favorite="${esc(slot.id)}" aria-pressed="${slot.favorite}" aria-label="${esc(title)} ${slot.favorite?'aus Favoriten entfernen':'als Favorit merken'}" title="${slot.favorite?'Favorit entfernen':'Favorit merken'}">${slot.favorite?'★':'☆'}</button>
 </div>`;}

export function mountRewardAlbum(){
 const root=document.getElementById('bwAlbum');if(!root)return;
 let album=null,category='all',status='all',query='',activeSlot=null,pendingImage=null,busy=false,lastFocus=null;
 const stats=root.querySelector('#bwAlbumStats'),categories=root.querySelector('#bwAlbumCategories'),grid=root.querySelector('#bwAlbumGrid'),results=root.querySelector('#bwAlbumResults');
 const modal=root.querySelector('#bwCardModal'),modalBody=root.querySelector('#bwModalBody');
 const closeBtn=root.querySelector('#bwModalClose');
 const findSlot=id=>album?.slots.find(x=>x.id===id);
 const paint=()=>{
  if(!root.isConnected||!album)return;
  stats.innerHTML=`<div><strong>${album.uniqueOwned}<small> / ${album.total}</small></strong><span>Verschiedene gesammelt</span></div><div><strong>${album.copies}</strong><span>Exemplare insgesamt</span></div><div><strong>${album.configured}</strong><span>Karten gestaltet</span></div><div class="bw-album-meter"><span style="width:${album.percent}%"></span></div><p>${album.percent}% der geplanten Karten tatsächlich gesammelt</p>`;
  categories.innerHTML=`<button type="button" class="bw-category-chip ${category==='all'?'active':''}" aria-pressed="${category==='all'}" data-bw-cat="all"><b>ALLE</b><span>${album.uniqueOwned} / 100</span></button>`+album.byCategory.map(c=>`<button type="button" class="bw-category-chip ${category===c.id?'active':''}" aria-pressed="${category===c.id}" data-bw-cat="${esc(c.id)}"><b>${CATEGORY_APPEARANCE[c.id].icon} ${esc(c.label)}</b><span>${c.owned} / ${c.total}</span></button>`).join('');
  const matching=filterAlbum(album,{category,status,query});results.textContent=`${matching.length} Kartenplätze angezeigt · ${matching.filter(s=>s.owned).length} gesammelt · ${album.favorites} Favoriten`;
  grid.innerHTML=matching.length?matching.map(tile).join(''):'<div class="bw-album-empty">Keine passenden Kartenplätze. Filter oder Suche ändern.</div>';
 };
 const reload=async()=>{album=await loadRewardAlbum();paint();const b=root.querySelector('#bwStarterImportButton');if(b){const plan=previewStarterImport(album.slots.filter(x=>x.card).map(x=>x.card));b.disabled=plan.toAdd===0;b.textContent=plan.toAdd?`🎨 ${plan.toAdd} freie Kartenplätze füllen`:'✓ Startserie vollständig angelegt';}return album;};
 const close=()=>{
  if(modal.hidden)return;modal.hidden=true;document.body.classList.remove('bw-card-dialog-open');modalBody.replaceChildren();activeSlot=null;pendingImage=null;
  if(lastFocus?.isConnected)lastFocus.focus();
 };
 const detail=slot=>{
  const appearance=CATEGORY_APPEARANCE[slot.categoryId],title=slot.card?.name||`Karte #${pad(slot.number)}`;
  const rarity=slot.card?.rarity||'gewoehnlich';
  return `<h2 id="bwModalTitle">${esc(title)}</h2><p class="bw-modal-meta">${esc(appearance.label)} · #${pad(slot.number)} von 025</p>
    ${art(slot,true)}<div class="bw-modal-status"><strong>${slot.owned?`✓ ${slot.owned} Exemplar${slot.owned===1?'':'e'} im Besitz`:'Noch nicht gesammelt'}</strong>${slot.card?`<span>${esc(rarityNames[rarity]||'Unbekannt')} · ${(slot.card.imageData||safeStarterAsset(slot.card))?'Motiv hinterlegt':'Ohne Motiv'}</span>`:'<span>Dieser Kartenplatz hat noch keinen Katalogeintrag.</span>'}</div>
    ${slot.card?.description?`<p class="bw-card-description">${esc(slot.card.description)}</p>`:''}
    ${CATEGORY_FIELDS[slot.categoryId].filter(f=>slot.card?.details?.[f.key]).map(f=>`<div class="bw-card-detail-row"><b>${esc(f.label)}</b><span>${esc(slot.card.details[f.key])}</span></div>`).join('')}
    ${slot.owned?`<details class="bw-card-copies"><summary>Gesammelte Exemplare (${slot.owned})</summary>${slot.copies.map(copy=>`<p>Exemplar ${esc(copy.id||'ohne ID')} · ${esc(copy.obtainedAt||'Datum unbekannt')} ${copy.locked?'· 🔒 geschützt':''}</p>`).join('')}</details>`:''}
    <div class="bw-card-modal-actions"><button type="button" class="bw-album-action" data-bw-detailfav="${esc(slot.id)}">${slot.favorite?'★ Favorit entfernen':'☆ Als Favorit merken'}</button><button type="button" class="bw-album-action bw-primary" id="bwCardEditButton">${slot.card?'Karte bearbeiten':'Karte gestalten'}</button></div>
    <p class="bw-album-disclaimer">Karten selbst gestalten erzeugt keine Sammlung und vergibt keine Münzen. Erst eine spätere Boosterziehung kann Exemplare hinzufügen.</p>`;
 };
 const edit=slot=>{
  const name=slot.card?.name||'',note=slot.card?.description||'',rarity=slot.card?.rarity||'gewoehnlich';
  modalBody.innerHTML=`<h2 id="bwModalTitle">Karte #${pad(slot.number)} gestalten</h2><p class="bw-modal-meta">${esc(CATEGORY_APPEARANCE[slot.categoryId].label)} · Motiv und Kartendaten bearbeiten</p>
  ${art(slot,true)}<form id="bwCardForm" class="bw-card-form">
   <label for="bwCardName">Kartenname *</label><input id="bwCardName" name="name" maxlength="90" required value="${esc(name)}" placeholder="Eigener Kartenname"/>
   <label for="bwCardRarity">Seltenheit *</label><select id="bwCardRarity" name="rarity">${REWARD_RARITIES.map(r=>`<option value="${r}" ${r===rarity?'selected':''}>${esc(rarityNames[r])}</option>`).join('')}</select>
   <label for="bwCardDescription">Beschreibung (optional)</label><textarea id="bwCardDescription" name="description" maxlength="600" rows="3" placeholder="Eigene Details zur Karte">${esc(note)}</textarea>
   ${CATEGORY_FIELDS[slot.categoryId].map(f=>`<label for="bwAttr_${f.key}">${esc(f.label)} (optional)</label><input id="bwAttr_${f.key}" name="bwAttr_${f.key}" maxlength="120" value="${esc(slot.card?.details?.[f.key]||'')}"/>`).join('')}
   <label class="bw-card-event-toggle"><input id="bwEventCard" type="checkbox" name="eventCard" ${slot.card?.eventCard===true?'checked':''}/><span>Als Eventkarte markieren (für spätere Event-Booster)</span></label>
   <label for="bwCardImage">Eigenes Bild (PNG, JPG, WebP, maximal 8 MB)</label><input id="bwCardImage" name="picture" type="file" accept="image/png,image/jpeg,image/webp"/>
   <p class="bw-album-disclaimer">Bild wird auf deinem Gerät verkleinert und offline gespeichert. Ohne Auswahl bleibt ein bisher vorhandenes Motiv erhalten. Keine automatische Vergabe einer Karte.</p>
   <p class="bw-card-form-error" id="bwCardFormMessage" role="status" aria-live="polite"></p>
   <div class="bw-card-modal-actions"><button type="button" class="bw-album-action" id="bwCardEditCancel">Zurück</button><button class="bw-album-action bw-primary" id="bwCardSave" type="submit">Karte speichern</button></div>
  </form>`;
  const form=modalBody.querySelector('#bwCardForm'),msg=modalBody.querySelector('#bwCardFormMessage');
  form.querySelector('#bwCardEditCancel').addEventListener('click',()=>{pendingImage=null;modalBody.innerHTML=detail(findSlot(slot.id));wireDetail(slot.id);});
  form.querySelector('#bwCardImage').addEventListener('change',async e=>{
   const file=e.target.files?.[0];pendingImage=null;msg.textContent='';if(!file)return;
   try{pendingImage=await prepareAlbumImage(file);msg.textContent='✓ Bild optimiert – bereit zum Speichern.';}catch(err){msg.textContent=err.message;e.target.value='';}
  });
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(busy)return;
   const file=form.querySelector('#bwCardImage').files?.[0];
   if(file&&!pendingImage){msg.textContent='Bitte ein gültiges Bild auswählen oder die Bildverarbeitung abwarten.';return;}
   busy=true;const submit=form.querySelector('#bwCardSave');submit.disabled=true;msg.textContent='Speichere Karte …';
   try{
    await saveAlbumCard({categoryId:slot.categoryId,number:slot.number,name:form.elements.name.value,rarity:form.elements.rarity.value,description:form.elements.description.value,imageData:pendingImage,eventCard:form.elements.eventCard.checked,details:Object.fromEntries(CATEGORY_FIELDS[slot.categoryId].map(f=>[f.key,form.elements['bwAttr_'+f.key].value]))});
    pendingImage=null;await reload();const fresh=findSlot(slot.id);modalBody.innerHTML=detail(fresh);wireDetail(slot.id);
   }catch(err){msg.textContent='Speichern fehlgeschlagen: '+err.message;submit.disabled=false;}finally{busy=false;}
  });
  form.querySelector('#bwCardName').focus();
 };
 const wireDetail=id=>{
  modalBody.querySelector('#bwCardEditButton')?.addEventListener('click',()=>edit(findSlot(id)));
  modalBody.querySelector('[data-bw-detailfav]')?.addEventListener('click',async()=>{
   const slot=findSlot(id);if(!slot||busy)return;busy=true;
   try{await setAlbumFavorite(id,!slot.favorite);await reload();modalBody.innerHTML=detail(findSlot(id));wireDetail(id);}
   catch(e){alert('Favorit konnte nicht gespeichert werden: '+e.message);}finally{busy=false;}
  });
 };
 const open=id=>{
  const slot=findSlot(id);if(!slot)return;
  lastFocus=document.activeElement;activeSlot=id;
  modalBody.innerHTML=detail(slot);modal.hidden=false;document.body.classList.add('bw-card-dialog-open');wireDetail(id);playPremiumReveal(slot.card?.rarity);closeBtn.focus();
 };
 root.addEventListener('click',async e=>{
  const cat=e.target.closest('[data-bw-cat]');if(cat){category=cat.dataset.bwCat;paint();return;}
  const fav=e.target.closest('[data-bw-favorite]');if(fav){const slot=findSlot(fav.dataset.bwFavorite);if(!slot||busy)return;busy=true;fav.disabled=true;
   try{await setAlbumFavorite(slot.id,!slot.favorite);await reload();}catch(err){results.textContent='Favorit konnte nicht gespeichert werden: '+err.message;}finally{busy=false;}return;
  }
  const card=e.target.closest('[data-bw-open]');if(card){open(card.dataset.bwOpen);return;}
 });
 root.querySelector('#bwStarterImportButton').addEventListener('click',async()=>{if(busy||!album)return;const current=previewStarterImport(album.slots.filter(x=>x.card).map(x=>x.card));if(!current.toAdd)return;if(!confirm(`Nur ${current.toAdd} LEERE Albumplätze mit eigenen Vektor-Katalogkarten füllen? Deine Bilder, vorhandene Karten, Münzen und Exemplare bleiben erhalten.`))return;busy=true;const info=root.querySelector('#bwStarterImportStatus');info.textContent='Startkarten werden atomar gespeichert …';try{const done=await installStarterSeries();await reload();info.textContent=`✓ ${done.added} Kartenplätze ergänzt; ${done.preserved} vorhandene geschützt. Es wurden keine Kartenexemplare vergeben.`;}catch(err){info.textContent='Import fehlgeschlagen: '+err.message;}finally{busy=false;}});
 root.querySelector('#bwAlbumSearch').addEventListener('input',e=>{query=e.target.value;paint();});
 root.querySelector('#bwAlbumFilter').addEventListener('change',e=>{status=e.target.value;paint();});
 closeBtn.addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 const keyHandler=e=>{
  if(!root.isConnected){document.removeEventListener('keydown',keyHandler);return;}
  if(modal.hidden)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  if(e.key==='Tab'){
   const focusable=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(x=>x.getClientRects().length>0);
   if(!focusable.length)return;
   if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
   else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
  }
 };
 document.addEventListener('keydown',keyHandler);
 reload().catch(e=>{if(root.isConnected){grid.textContent='Album konnte nicht geladen werden: '+e.message;stats.textContent='Datenbankfehler';}});
}
