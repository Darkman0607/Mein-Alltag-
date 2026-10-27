/** L05–L07 – touch-oriented cards, quick entry, templates and dynamic properties. */
import {getModuleValue,mutateModuleValuesWithDeletes} from '../assets/database.js';
import {ITEM_KEY,ITEM_SEQ_KEY,ITEM_TYPES,ITEM_CONDITIONS,ITEM_UNITS,locationChoices,resolveItemLocation,upsertItem,deleteItem} from './lagerhaus-items.js';
import {templatesFor,propertiesFor,templateById,detailedProperties} from './lagerhaus-templates.js';
import {MOVEMENT_KEY,STOCK_ACTIONS,stockPositions,stockTotal,stockAlert,bookStock} from './lagerhaus-stock.js';
import {addContainer,updateContainer,addDevice,updateDevice,containerState,CONTAINER_STATES,DEVICE_STATES,trackedSummary} from './lagerhaus-tracking.js';
import {PHOTO_INDEX_KEY,PHOTO_CATEGORIES,photoKey,coverPhoto,ownerPhotos,readPhotoIndex,readPhotoBlob,preparePhoto,savePhoto,changePhoto,removePhoto} from './lagerhaus-photos.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newid=()=>globalThis.crypto?.randomUUID?.()||`item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let items=[],rooms=[],areas=[],editId=null,formOpen=false,query='',operation=Promise.resolve(),stockItemId=null,stockKind='receive',stockEvents=[],trackingItemId=null,trackingRecordId=null,trackingOperation=null,photos=[],photoOpen=false,photoType='item',photoTarget='',photoBusy=false;
const option=(value,label,current)=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;
function choices(map,current){return Object.entries(map).map(([v,l])=>option(v,l,current)).join('');}
function locationSelect(current){return locationChoices(rooms,areas).map(c=>option(c.id,c.label,current)).join('');}
function status(message){const el=document.getElementById('lagerItemStatus');if(el)el.textContent=message;}
async function load(){
 const [is,rs,as,events]=await Promise.all([getModuleValue('lagerhaus',ITEM_KEY),getModuleValue('lagerhaus','rooms.v1'),getModuleValue('lagerhaus','areas.v1'),getModuleValue('lagerhaus',MOVEMENT_KEY)]);
 items=Array.isArray(is)?is:[];rooms=Array.isArray(rs)?rs:[];areas=Array.isArray(as)?as:[];stockEvents=Array.isArray(events)?events:[];photos=await readPhotoIndex();
}
async function modify(fn){
 const task=operation.catch(()=>{}).then(async()=>{
  let saved;
  await mutateModuleValuesWithDeletes('lagerhaus',[ITEM_KEY,ITEM_SEQ_KEY,'rooms.v1','areas.v1',MOVEMENT_KEY,PHOTO_INDEX_KEY],values=>{
   const current=Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[];
   const seq=Number(values[ITEM_SEQ_KEY])||0;
   const freshRooms=Array.isArray(values['rooms.v1'])?values['rooms.v1']:[];
   const freshAreas=Array.isArray(values['areas.v1'])?values['areas.v1']:[];
   const history=Array.isArray(values[MOVEMENT_KEY])?values[MOVEMENT_KEY]:[];
   const outcome=fn(current,seq,freshRooms,freshAreas,history);
   saved={...outcome,rooms:freshRooms,areas:freshAreas};
   const existingPhotos=Array.isArray(values[PHOTO_INDEX_KEY])?values[PHOTO_INDEX_KEY]:[];
   const retainedIds=new Set(outcome.items.map(i=>i.id));
   const removed=existingPhotos.filter(p=>p.ownerType==='item'&&!retainedIds.has(p.ownerId));
   const nextPhotos=removed.length?existingPhotos.filter(p=>!removed.includes(p)):existingPhotos;
   saved.photos=nextPhotos;
   return {write:[[ITEM_KEY,outcome.items],[ITEM_SEQ_KEY,outcome.sequence],...(outcome.movements?[[MOVEMENT_KEY,outcome.movements]]:[]),...(removed.length?[[PHOTO_INDEX_KEY,nextPhotos]]:[])],remove:removed.map(p=>photoKey(p.id))};
  });
  items=saved.items;rooms=saved.rooms;areas=saved.areas;photos=saved.photos;
  if(saved.movements)stockEvents=saved.movements;
 });
 operation=task;return task;
}
function stockQuantity(value){return String(value??0).replace('.',',');}
function trackingPanel(item){
 const cs=item.containers||[],ds=item.devices||[],sum=trackedSummary(item);
 const locOptions=locationSelect('');
 const action=trackingRecordId&&(cs.find(c=>c.id===trackingRecordId)||ds.find(d=>d.id===trackingRecordId));
 const actionForm=action&&trackingOperation?`<form id="lagerTrackActionForm" class="lager-item-form">
 <h3>${esc(action.code)} · ${esc(trackingOperation==='consume'?'Gebinde-Verbrauch':trackingOperation==='move'?'Lagerort ändern':'Gerätezustand ändern')}</h3>
 ${trackingOperation==='consume'?`<label>Entnommene Menge (${esc(ITEM_UNITS[item.unit]||item.unit)})<input name="quantity" type="number" min="0.001" max="${esc(action.remaining)}" step="0.001" required inputmode="decimal"></label>`:''}
 ${trackingOperation==='move'?`<label>Neuer Lagerort<select name="locationId">${locOptions}</select></label>`:''}
 ${trackingOperation==='condition'?`<label>Neuer Zustand<select name="condition">${choices(DEVICE_STATES,action.condition)}</select></label>`:''}
 <button class="primary-button" type="submit">Änderung speichern</button> <button class="secondary-button" type="button" id="lagerTrackCancelAction">Abbrechen</button></form>`:'';
 return `<section class="lager-tracking-panel" aria-label="Gebinde und Einzelgeräte"><div class="lager-item-form-title"><h2>${esc(item.name)} · Einzelbestände</h2><button type="button" id="lagerTrackClose" class="secondary-button">Schließen</button></div>
 <p>Der Gesamtbestand wird nicht doppelt gezählt. Bestehende Mengen können einzeln gekennzeichnet oder neue Mengen hinzugebucht werden.</p>
 <div class="lager-track-overview">${item.type==='verbrauch'?`<span>Voll: <strong>${sum.full}</strong></span><span>Angebrochen: <strong>${sum.open}</strong></span><span>Leer: <strong>${sum.empty}</strong></span>`:item.type==='geraet'?`<span>Einzelgeräte: <strong>${sum.devices}</strong></span>`:''}<span>Frei verfügbar: <strong>${esc(stockQuantity(sum.untracked))} ${esc(ITEM_UNITS[item.unit]||item.unit)}</strong></span></div>
 ${item.type==='verbrauch'?`<form id="lagerContainerAdd" class="lager-item-form"><h3>Gebinde erfassen</h3><div class="lager-item-grid"><label>Gebindegröße in ${esc(ITEM_UNITS[item.unit]||item.unit)}<input type="number" name="capacity" min="0.001" step="0.001" max="1000000" inputmode="decimal" placeholder="z. B. 0.75" required></label><label>Gebindename (optional)<input name="label" maxlength="80" placeholder="z. B. Sprühflasche"></label></div><label>Lagerort<select name="locationId">${locOptions}</select></label><label>Bestandsquelle<select name="source"><option value="new">Neu einlagern (+ Bestand)</option><option value="existing">Aus bisherigem Bestand kennzeichnen</option></select></label><button class="primary-button" type="submit">+ Gebinde anlegen</button></form>
 <div class="lager-track-list">${cs.length?cs.map(c=>`<article><div><strong>${esc(c.code)}</strong> ${esc(c.label)} <span class="lager-track-status">${esc(CONTAINER_STATES[containerState(c)])}</span></div><p>${esc(stockQuantity(c.remaining))} / ${esc(stockQuantity(c.capacity))} ${esc(ITEM_UNITS[item.unit]||item.unit)} · ${esc(resolveItemLocation(c.locationId,rooms,areas).label)}</p><div class="lager-item-actions">${containerState(c)==='full'?`<button type="button" class="secondary-button" data-track-action="open" data-track-id="${esc(c.id)}">Öffnen</button>`:''}${containerState(c)!=='empty'?`<button type="button" class="secondary-button" data-track-action="consume" data-track-id="${esc(c.id)}">Verbrauch</button>`:''}<button type="button" class="secondary-button" data-track-action="move" data-track-id="${esc(c.id)}">Umlagern</button><button type="button" class="secondary-button" data-track-action="untrack" data-track-id="${esc(c.id)}">Kennzeichnung entfernen</button></div></article>`).join(''):'<p>Keine Gebinde einzeln erfasst.</p>'}</div>`:''}
 ${item.type==='geraet'?`<form id="lagerDeviceAdd" class="lager-item-form"><h3>Einzelgerät registrieren</h3><div class="lager-item-grid"><label>Seriennummer *<input name="serialNumber" maxlength="100" required placeholder="Vom Gerät ablesen"></label><label>Gerätebezeichnung<input name="label" maxlength="80" placeholder="z. B. Akkuschrauber 1"></label></div><label>Lagerort<select name="locationId">${locOptions}</select></label><div class="lager-item-grid"><label>Bestandsquelle<select name="source"><option value="new">Neu einlagern (+1)</option><option value="existing">Bestehendes Gerät kennzeichnen</option></select></label><label>Gerätezustand<select name="condition">${choices(DEVICE_STATES,'gut')}</select></label></div><button class="primary-button" type="submit">+ Gerät registrieren</button></form>
 ${item.unit==='stk'?`<div class="lager-track-list">${ds.length?ds.map(d=>`<article><div><strong>${esc(d.code)}</strong> ${esc(d.label)} <span class="lager-track-status">${esc(DEVICE_STATES[d.condition]||d.condition)}</span></div><p>Seriennummer: <strong>${esc(d.serialNumber)}</strong> · ${esc(resolveItemLocation(d.locationId,rooms,areas).label)}</p><div class="lager-item-actions"><button type="button" class="secondary-button" data-track-action="move" data-track-id="${esc(d.id)}">Umlagern</button><button type="button" class="secondary-button" data-track-action="condition" data-track-id="${esc(d.id)}">Zustand</button><button type="button" class="secondary-button" data-track-action="issue" data-track-id="${esc(d.id)}">Ausbuchen</button><button type="button" class="secondary-button" data-track-action="untrack" data-track-id="${esc(d.id)}">Kennzeichnung entfernen</button></div></article>`).join(''):'<p>Keine Geräte einzeln erfasst.</p>'}</div>`:'<p class="lager-stock-warning">Einzelgeräte benötigen die Einheit „Stück“. Bitte zunächst einen Artikel ohne Bestand auf diese Einheit umstellen.</p>'}`:''}
 ${actionForm}<p class="lager-stock-help">Eine Kennzeichnung ist kein zusätzlicher Bestand. „Kennzeichnung entfernen“ gibt vorhandene Restmengen wieder frei, „Ausbuchen“ reduziert den tatsächlichen Bestand. Leere Gebinde bleiben dokumentiert, bis du die Kennzeichnung entfernst.</p></section>`;
}
function stockPanel(item){
 const list=stockPositions(item);
 const stock=stockAlert(item);
 const sources=list.map(p=>option(p.locationId,`${resolveItemLocation(p.locationId,rooms,areas).label} · ${stockQuantity(p.quantity)} ${ITEM_UNITS[item.unit]||item.unit}`,list[0]?.locationId)).join('');
 const destinations=locationChoices(rooms,areas).map(c=>option(c.id,c.label,'')).join('');
 return `<form class="lager-stock-form" id="lagerStockForm"><div class="lager-item-form-title"><h2>Bestandsbuchung · ${esc(item.name)}</h2><button type="button" id="lagerStockCancel" class="secondary-button">Schließen</button></div>
 <p class="lager-stock-total">Aktueller Gesamtbestand: <strong>${esc(stockQuantity(stock.total))} ${esc(ITEM_UNITS[item.unit]||item.unit)}</strong></p>
 <div class="lager-stock-modes">${Object.entries(STOCK_ACTIONS).map(([v,label])=>`<button type="button" data-stock-mode="${v}" class="secondary-button ${v===stockKind?'is-stock-active':''}">${label}</button>`).join('')}</div>
 ${stockKind!=='receive'?`<label>Von Lagerort<select name="fromId" required>${sources}</select></label>`:''}
 ${stockKind!=='issue'?`<label>${stockKind==='transfer'?'Nach Lagerort':'Einlagern bei'}<select name="toId">${destinations}</select></label>`:''}
 <label>Mengeneingabe<select name="unitMode"><option value="units">Einheiten (${esc(ITEM_UNITS[item.unit]||item.unit)})</option><option value="packs">Packungen à ${esc(stockQuantity(item.packSize??1))} ${esc(ITEM_UNITS[item.unit]||item.unit)}</option></select></label>
 <label>Menge<input name="quantity" type="number" inputmode="decimal" min="0.001" step="0.001" max="1000000" required placeholder="z. B. 2"></label>
 <button class="primary-button" type="submit">${esc(STOCK_ACTIONS[stockKind])} buchen</button>
 ${stockEvents.filter(e=>e.itemId===item.id).slice(-5).reverse().length?`<div class="lager-stock-history"><strong>Letzte Buchungen</strong>${stockEvents.filter(e=>e.itemId===item.id).slice(-5).reverse().map(e=>`<div><span>${esc(STOCK_ACTIONS[e.type]||e.type)} · ${esc(new Date(e.createdAt).toLocaleDateString('de-AT'))}</span><span>${esc(stockQuantity(e.quantity))} ${esc(ITEM_UNITS[item.unit]||item.unit)}</span></div>`).join('')}</div>`:''}
 <p class="lager-stock-help">Packungsbuchungen werden automatisch in Grundeinheiten umgerechnet. Buchungen ändern nur den Bestand, nicht die Artikelnummer oder den Lagerort anderer Positionen. Maximal drei Nachkommastellen.</p></form>`;
}
function positionsHtml(item){
 const positions=stockPositions(item);
 return positions.length?`<div class="lager-stock-positions">${positions.map(pos=>`<div><span>${esc(resolveItemLocation(pos.locationId,rooms,areas).label)}</span><strong>${esc(stockQuantity(pos.quantity))}</strong></div>`).join('')}</div>`:'<p class="lager-stock-empty">Kein Bestand auf Lager</p>';
}
function templateSelect(type){
 return `<option value="">Ohne Vorlage – selbst erfassen</option>${templatesFor(type).map(t=>option(t.id,t.title,'')).join('')}`;
}
function propertyFields(type,values={}){
 const fields=propertiesFor(type);
 if(!fields.length)return '<p class="lager-hint">Dieser Artikeltyp hat keine zusätzlichen Felder.</p>';
 return `<p class="lager-item-props-caption">Weitere Eigenschaften für ${esc(ITEM_TYPES[type]||'Artikel')}</p>`+fields.map(field=>{
  const value=values?.[field.key]??'';
  return `<label>${esc(field.label)} <span class="lager-optional">(optional)</span><input name="property.${esc(field.key)}" type="${field.kind==='date'?'date':'text'}" ${field.max?`maxlength="${field.max}"`:''} ${field.hint?`placeholder="${esc(field.hint)}"`:''} value="${esc(value)}"></label>`;
 }).join('');
}
function form(item,requestedLocation=''){
 const a=item||{name:'',type:'geraet',category:'',quantity:1,unit:'stk',condition:'gut',locationId:requestedLocation,brand:'',articleNumber:'',note:'',properties:{},minimumStock:0,packSize:1};
 const location=resolveItemLocation(a.locationId,rooms,areas);
 return `<form id="lagerItemForm" class="lager-item-form">
 <div class="lager-item-form-title"><h2>${item?'Artikel bearbeiten':'Neuen Artikel erfassen'}</h2><button type="button" class="secondary-button" id="lagerItemCancel">Abbrechen</button></div>
 ${item?`<span class="lager-identifier">${esc(item.code)}</span>`:''}
 <div class="lager-item-grid"><label>Artikeltyp<select name="type" id="lagerItemType">${choices(ITEM_TYPES,a.type)}</select></label><label>Vorlage (optional)<select id="lagerItemTemplate" aria-label="Artikelvorlage">${templateSelect(a.type)}</select></label></div>
 <p class="lager-item-quick-tip">Schnellerfassung: Name, Menge und Lagerort genügen. Weitere Angaben sind freiwillig.</p>
 <label>Artikelname *<input name="name" required maxlength="100" autocomplete="off" placeholder="z. B. Akkuschrauber" value="${esc(a.name)}"></label>
 <div class="lager-item-grid"><label>${item?'Gesamtmenge (nur über Buchung änderbar)':'Anfangsbestand *'}<input name="quantity" type="number" inputmode="decimal" min="0" max="1000000" step="0.001" required value="${esc(a.quantity)}" ${item?'readonly':''}></label><label>Einheit<select name="unit" ${item&&stockTotal(item)>0?'disabled':''}>${choices(ITEM_UNITS,a.unit)}</select></label></div>
 <label>${item?'Lagerort (über Buchung ändern)':'Erster Lagerort'}<select name="locationId" ${item?'disabled':''}>${locationSelect(location.valid?a.locationId:'')}</select></label>
 ${!location.valid?'<p class="lager-item-alert">Der bisherige Lagerort existiert nicht mehr. Bitte neu zuordnen.</p>':''}
 <details class="lager-item-details" id="lagerItemDetails" ${item?'open':''}>
  <summary>Weitere Angaben und typabhängige Eigenschaften</summary>
  <div class="lager-item-details-body">
   <div class="lager-item-grid"><label>Mindestbestand (Warnung bei Erreichen)<input name="minimumStock" type="number" min="0" max="1000000" step="0.001" inputmode="decimal" value="${esc(a.minimumStock??0)}"></label><label>Packungsgröße (pro Packung)<input name="packSize" type="number" min="0.001" max="1000000" step="0.001" inputmode="decimal" value="${esc(a.packSize??1)}"></label></div>
   <label>Kategorie <span class="lager-optional">(optional)</span><input name="category" maxlength="55" placeholder="z. B. Werkzeuge" value="${esc(a.category)}"></label>
   <div class="lager-item-grid"><label>Marke (optional)<input name="brand" maxlength="80" value="${esc(a.brand)}" placeholder="z. B. Bosch"></label><label>Artikelnummer (optional)<input name="articleNumber" maxlength="80" value="${esc(a.articleNumber)}"></label></div>
   <label>Zustand<select name="condition">${choices(ITEM_CONDITIONS,a.condition)}</select></label>
   <div id="lagerItemProperties">${propertyFields(a.type,a.properties)}</div>
   <label>Notiz<textarea name="note" rows="3" maxlength="2000" placeholder="Eigene Informationen zum Artikel">${esc(a.note)}</textarea></label>
  </div>
 </details>
 <p class="lager-item-quick-tip">📷 Artikelfotos kannst du nach dem Speichern direkt über „Fotos“ auf der Artikelkarte hinzufügen.</p>
 <button class="primary-button" type="submit">${item?'Änderungen speichern':'Artikel speichern'}</button></form>`;
}
function bindTemplates(el){
 const formEl=el.querySelector('#lagerItemForm');if(!formEl)return;
 const type=el.querySelector('#lagerItemType');const template=el.querySelector('#lagerItemTemplate');const properties=el.querySelector('#lagerItemProperties');
 type?.addEventListener('change',()=>{
  if(template)template.innerHTML=templateSelect(type.value);
  if(properties)properties.innerHTML=propertyFields(type.value);
 });
 template?.addEventListener('change',()=>{
  const t=templateById(type.value,template.value);if(!t)return;
  for(const [key,value] of Object.entries(t.values)){
   const field=formEl.elements.namedItem(key);
   if(field && 'value' in field)field.value=String(value);
  }
  formEl.querySelector('[name="name"]')?.focus();
 });
}

function matchesItem(item,search){
 const terms=[item.name,item.code,item.category,item.brand,item.articleNumber,item.note,...Object.values(item.properties||{}),...(item.containers||[]).flatMap(c=>[c.code,c.label]),...(item.devices||[]).flatMap(d=>[d.code,d.label,d.serialNumber])];
 return terms.join(' ').toLocaleLowerCase('de-AT').includes(search.toLocaleLowerCase('de-AT'));
}
function card(item){
 const loc=resolveItemLocation(item.locationId,rooms,areas);
 const props=detailedProperties(item);
 const stock=stockAlert(item);
 const cover=coverPhoto(photos,'item',item.id),count=ownerPhotos(photos,'item',item.id).length;
 return `<article class="lager-item-card">${cover?`<img class="lager-item-cover" src="${esc(cover.thumbnail)}" alt="Hauptfoto von ${esc(item.name)}" loading="lazy">`:''}<div class="lager-item-card-top"><span class="lager-identifier">${esc(item.code)}</span><span class="lager-item-type">${esc(ITEM_TYPES[item.type]||'Sonstiges')}</span></div>
 <h3>${esc(item.name)}</h3><p class="lager-item-path">⌖ ${stockPositions(item).length>1?'Mehrere Lagerorte':esc(loc.label)}</p>
 <div class="lager-item-facts"><span><strong>${esc(stockQuantity(stock.total))}</strong> ${esc(ITEM_UNITS[item.unit]||item.unit)}</span><span>Packung: ${esc(stockQuantity(item.packSize??1))}</span><span>${esc(item.category||'Allgemein')}</span><span>${esc(ITEM_CONDITIONS[item.condition]||'Gut')}</span></div>
 ${stock.low?`<p class="lager-stock-warning">⚠ Mindestbestand erreicht (${esc(stockQuantity(stock.minimumStock))} ${esc(ITEM_UNITS[item.unit]||item.unit)})</p>`:''}
 ${positionsHtml(item)}
 ${(item.containers||[]).length||((item.devices||[]).length)?`<p class="lager-item-extra">${(item.containers||[]).length?`Gebinde: ${trackedSummary(item).full} voll · ${trackedSummary(item).open} angebrochen · ${trackedSummary(item).empty} leer`:''} ${(item.devices||[]).length?`Einzelgeräte: ${trackedSummary(item).devices}`:''}</p>`:''}
 ${(item.brand||item.articleNumber)?`<p class="lager-item-extra">${esc([item.brand,item.articleNumber].filter(Boolean).join(' · '))}</p>`:''}${props.length?`<dl class="lager-item-properties-list">${props.map(p=>`<div><dt>${esc(p.label)}</dt><dd>${esc(p.value)}</dd></div>`).join('')}</dl>`:''}${item.note?`<p class="lager-item-note">${esc(item.note)}</p>`:''}
 <div class="lager-stock-actions"><button type="button" class="secondary-button" data-stock-open="${esc(item.id)}" data-kind="receive">+ Einlagern</button><button type="button" class="secondary-button" data-stock-open="${esc(item.id)}" data-kind="issue" ${stock.empty?'disabled':''}>− Entnehmen</button><button type="button" class="secondary-button" data-stock-open="${esc(item.id)}" data-kind="transfer" ${stock.empty?'disabled':''}>↔ Umlagern</button></div>
 ${(item.type==='geraet'||item.type==='verbrauch')?`<button type="button" class="primary-button lager-track-main-button" data-track-open="${esc(item.id)}">${item.type==='geraet'?'⚙ Einzelgeräte':'▣ Gebinde'} verwalten</button>`:''}
 <div class="lager-item-actions"><button type="button" class="secondary-button" data-photo-item="${esc(item.id)}">📷 Fotos (${count})</button><button type="button" class="secondary-button" data-item-edit="${esc(item.id)}">Bearbeiten</button><button type="button" class="secondary-button lager-delete" data-item-delete="${esc(item.id)}">Löschen</button></div></article>`;
}
function photoTargets(){
 const active=photoType==='item'?items.map(i=>({id:i.id,label:`${i.code} · ${i.name}`})):locationChoices(rooms,areas).filter(x=>x.id);
 const missing=ownerPhotos(photos,photoType,photoTarget).length>0&&photoTarget&&!active.some(x=>x.id===photoTarget);
 if(missing)active.push({id:photoTarget,label:'⚠ Lagerort/Artikel existiert nicht mehr – Fotos sichern oder löschen'});
 return active;
}
function photoPanel(){
 if(!photoOpen)return '';
 const targets=photoTargets();if(!targets.some(x=>x.id===photoTarget))photoTarget=targets[0]?.id||'';
 const gallery=ownerPhotos(photos,photoType,photoTarget);
 const validTarget=targets.some(x=>x.id===photoTarget&&!x.label.startsWith('⚠'));
 return `<section class="lager-photo-panel" id="lagerPhotoPanel" aria-label="Lokales Fotoarchiv">
 <div class="lager-item-form-title"><div><span class="eyebrow">L10 · OFFLINE FOTOARCHIV</span><h2>Meine Fotos</h2></div><button type="button" id="lagerPhotoClose" class="secondary-button">Schließen</button></div>
 <p class="lager-photo-notice">Fotos bleiben ausschließlich in diesem Chrome-Profil (IndexedDB). Löschen von Browserdaten entfernt auch Fotos. Kein Cloud-Backup.</p>
 <div class="lager-item-grid"><label>Fotos für<select id="lagerPhotoType">${option('item','Artikel',photoType)}${option('location','Lagerort / Fach',photoType)}</select></label>
 <label>Auswahl<select id="lagerPhotoTarget">${targets.map(t=>option(t.id,t.label,photoTarget)).join('')}</select></label></div>
 ${validTarget?`<div class="lager-photo-add"><div class="lager-photo-inputs"><label class="primary-button" for="lagerPhotoCamera">📷 Kamera öffnen<input id="lagerPhotoCamera" type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment"></label><label class="secondary-button" for="lagerPhotoGallery">▧ Galerie auswählen<input id="lagerPhotoGallery" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple></label></div>
 <div class="lager-item-grid"><label>Kategorie für neue Fotos<select id="lagerPhotoNewCategory">${Object.entries(PHOTO_CATEGORIES).map(([v,t])=>option(v,t,'allgemein')).join('')}</select></label><label>Beschreibung (optional)<input id="lagerPhotoNewDescription" maxlength="140" placeholder="z. B. Regal oben"></label></div>
 <label class="lager-photo-quality"><input type="checkbox" id="lagerPhotoOriginal"> Original-Dateien unverändert behalten</label>
 <p class="lager-photo-notice">Standard: optimierte WebP-Datei (max. 2048 px, Qualitätsfaktor 90 %), nur wenn kleiner als Original. Mit Häkchen wird die Originaldatei ohne Qualitätsänderung gespeichert. Pro Bild max. 25 MB.</p></div>`:'<p class="lager-photo-notice">Bitte einen vorhandenen Artikel oder Lagerort auswählen.</p>'}
 <h3>${gallery.length} Foto${gallery.length===1?'':'s'} gespeichert</h3><div class="lager-photo-grid">${gallery.map(p=>`<article class="lager-photo-tile" data-photo-id="${esc(p.id)}">
 <button type="button" class="lager-photo-preview" data-photo-preview="${esc(p.id)}" aria-label="Foto in Originalgröße ansehen"><img src="${esc(p.thumbnail)}" alt="${esc(p.description||'Lagerfoto')}" loading="lazy"></button>
 <div class="lager-photo-details">${p.cover?'<span class="lager-photo-main">★ Hauptbild</span>':''}<small>${esc(p.width)} × ${esc(p.height)} px · ${(p.bytes/1024/1024).toFixed(2)} MB · ${p.optimized?'optimiert':'Original'}</small>
 <label>Kategorie<select data-photo-category="${esc(p.id)}">${Object.entries(PHOTO_CATEGORIES).map(([v,t])=>option(v,t,p.category)).join('')}</select></label>
 <label>Beschreibung<input data-photo-description="${esc(p.id)}" maxlength="140" value="${esc(p.description||'')}"></label>
 <div class="lager-photo-buttons"><button type="button" class="secondary-button" data-photo-save="${esc(p.id)}">Speichern</button>${p.cover?'':`<button type="button" class="secondary-button" data-photo-cover="${esc(p.id)}">★ Hauptbild</button>`}<button type="button" class="secondary-button lager-delete" data-photo-delete="${esc(p.id)}">Löschen</button></div></div></article>`).join('')||'<p class="lager-hint">Noch keine Fotos an dieser Stelle.</p>'}</div>
 <dialog id="lagerPhotoDialog" class="lager-photo-dialog"><button type="button" id="lagerPhotoDialogClose" class="secondary-button">Schließen ✕</button><img id="lagerPhotoFull" alt="Foto-Vorschau"><p id="lagerPhotoInfo"></p></dialog>
 </section>`;
}
function bindPhotoPanel(el,preselect){
 const panel=el.querySelector('#lagerPhotoPanel');if(!panel)return;
 const refresh=async msg=>{photos=await readPhotoIndex();draw(preselect);if(msg)status(msg);};
 panel.querySelector('#lagerPhotoClose').addEventListener('click',()=>{photoOpen=false;draw(preselect);});
 panel.querySelector('#lagerPhotoType').addEventListener('change',e=>{photoType=e.target.value;photoTarget='';draw(preselect);});
 panel.querySelector('#lagerPhotoTarget').addEventListener('change',e=>{photoTarget=e.target.value;draw(preselect);});
 const handleFiles=async e=>{
  const files=[...e.target.files];if(!files.length||photoBusy)return;
  photoBusy=true;const buttons=panel.querySelectorAll('input[type=file]');buttons.forEach(b=>b.disabled=true);
  const category=panel.querySelector('#lagerPhotoNewCategory').value;
  const description=panel.querySelector('#lagerPhotoNewDescription').value;
  const keepOriginal=panel.querySelector('#lagerPhotoOriginal').checked;
  let completed=0;
  try{
   for(const file of files){
    status(`Foto ${completed+1} von ${files.length} wird lokal vorbereitet …`);
    const prepared=await preparePhoto(file,{keepOriginal});
    await savePhoto({ownerType:photoType,ownerId:photoTarget,category,description},prepared);
    completed++;
   }
   await refresh(`${completed} Foto${completed===1?'':'s'} lokal gespeichert.`);
  }catch(err){await refresh(`${completed} gespeichert. Fotoimport unterbrochen: ${err.message}`);}
  finally{photoBusy=false;}
 };
 panel.querySelector('#lagerPhotoCamera')?.addEventListener('change',handleFiles);
 panel.querySelector('#lagerPhotoGallery')?.addEventListener('change',handleFiles);
 panel.querySelectorAll('[data-photo-save]').forEach(b=>b.addEventListener('click',async()=>{
  const id=b.dataset.photoSave;b.disabled=true;
  try{await changePhoto(id,{category:panel.querySelector(`[data-photo-category="${id}"]`).value,description:panel.querySelector(`[data-photo-description="${id}"]`).value});await refresh('Fotoangaben gespeichert.');}
  catch(err){b.disabled=false;status(err.message);}
 }));
 panel.querySelectorAll('[data-photo-cover]').forEach(b=>b.addEventListener('click',async()=>{
  const id=b.dataset.photoCover;b.disabled=true;
  try{const p=photos.find(x=>x.id===id);await changePhoto(id,p,{cover:true});await refresh('Neues Hauptbild gespeichert.');}
  catch(err){b.disabled=false;status(err.message);}
 }));
 panel.querySelectorAll('[data-photo-delete]').forEach(b=>b.addEventListener('click',async()=>{
  if(!confirm('Dieses Foto dauerhaft aus dem lokalen Archiv löschen?'))return;
  b.disabled=true;
  try{await removePhoto(b.dataset.photoDelete);await refresh('Foto endgültig gelöscht.');}
  catch(err){b.disabled=false;status(err.message);}
 }));
 const dialog=panel.querySelector('#lagerPhotoDialog');let previewURL=null;
 const cleanup=()=>{if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}};
 dialog.addEventListener('close',cleanup);
 panel.querySelector('#lagerPhotoDialogClose').addEventListener('click',()=>dialog.close());
 panel.querySelectorAll('[data-photo-preview]').forEach(b=>b.addEventListener('click',async()=>{
  b.disabled=true;
  try{
   const photo=photos.find(p=>p.id===b.dataset.photoPreview),blob=await readPhotoBlob(photo.id);
   cleanup();previewURL=URL.createObjectURL(blob);
   dialog.querySelector('#lagerPhotoFull').src=previewURL;
   dialog.querySelector('#lagerPhotoInfo').textContent=`${photo.description||PHOTO_CATEGORIES[photo.category]} · ${photo.width} × ${photo.height} Pixel`;
   dialog.showModal();
  }catch(err){cleanup();status('Vorschau nicht verfügbar: '+err.message);}
  finally{b.disabled=false;}
 }));
}
function draw(preselect=''){
 const el=document.getElementById('lagerItemContent');if(!el)return;
 const filtered=items.filter(i=>matchesItem(i,query));
 const selected=items.find(i=>i.id===editId);
 const stockSelected=items.find(i=>i.id===stockItemId);
 const trackingSelected=items.find(i=>i.id===trackingItemId);
 const lowCount=items.filter(i=>stockAlert(i).low).length;
 el.innerHTML=`<div class="lager-item-head"><div><strong>${items.length}</strong> Artikel gespeichert · <strong>${lowCount}</strong> Mindestbestand-Warnungen</div><div class="lager-photo-head-actions"><button type="button" id="lagerPhotoOpen" class="secondary-button">📷 Fotoarchiv</button><button type="button" id="lagerItemAdd" class="primary-button">+ Artikel</button></div></div>
 ${photoPanel()}
 ${formOpen?form(selected,preselect):''}
 ${stockSelected?stockPanel(stockSelected):''}
 ${trackingSelected?trackingPanel(trackingSelected):''}
 <label class="lager-item-search-label" for="lagerItemSearch">Artikel durchsuchen</label><input id="lagerItemSearch" class="lager-item-search" type="search" placeholder="Name, Seriennummer, Kennung, Kategorie …" value="${esc(query)}">
 <div id="lagerItemList">${filtered.length?filtered.map(card).join(''):'<p class="lager-hint">Keine Artikel vorhanden oder keine Treffer. Mit „+ Artikel“ kannst du deinen ersten Gegenstand erfassen.</p>'}</div>`;
 el.querySelector('#lagerPhotoOpen').addEventListener('click',()=>{photoOpen=!photoOpen;photoType='item';photoTarget=items[0]?.id||'';draw(preselect);});
 bindPhotoPanel(el,preselect);
 el.querySelector('#lagerItemAdd').addEventListener('click',()=>{stockItemId=null;trackingItemId=null;editId=null;formOpen=true;draw(preselect);el.querySelector('[name="name"]')?.focus();});
 el.querySelector('#lagerItemCancel')?.addEventListener('click',()=>{editId=null;formOpen=false;draw(preselect);});
 bindTemplates(el);
 el.querySelectorAll('[data-stock-mode]').forEach(b=>b.addEventListener('click',()=>{stockKind=b.dataset.stockMode;draw(preselect);}));
 el.querySelector('#lagerStockCancel')?.addEventListener('click',()=>{stockItemId=null;draw(preselect);});
 el.querySelector('#lagerStockForm')?.addEventListener('submit',async event=>{
  event.preventDefault();const frm=event.currentTarget;
  const submit=frm.querySelector('[type="submit"]');submit.disabled=true;
  const details=Object.fromEntries(new FormData(frm).entries());
  try{
   await modify((records,sequence,currentRooms,currentAreas,history)=>{
    const index=records.findIndex(x=>x.id===stockItemId);
    if(index<0)throw new Error('Artikel wurde bereits gelöscht.');
    const validIds=new Set(locationChoices(currentRooms,currentAreas).map(x=>x.id));
    const result=bookStock(records[index],{...details,type:stockKind},validIds,{makeId:newid});
    const updated=records.slice();updated[index]=result.item;
    return {items:updated,sequence,movements:[...history,result.event].slice(-3000)};
   });
   stockItemId=null;draw(preselect);status('Bestandsbuchung erfolgreich gespeichert.');
  }catch(e){status('Buchung fehlgeschlagen: '+e.message);submit.disabled=false;}
 });
 el.querySelector('#lagerItemForm')?.addEventListener('submit',async event=>{
  event.preventDefault();const formEl=event.currentTarget,submit=formEl.querySelector('[type="submit"]');
  const f=new FormData(formEl);const value=Object.fromEntries(f.entries());
  if(editId){const existing=items.find(x=>x.id===editId);value.locationId=existing?.locationId||'';value.unit=value.unit||existing?.unit||'stk';}
  value.properties=Object.fromEntries(propertiesFor(value.type).map(prop=>[prop.key,f.get(`property.${prop.key}`)||'']));
  submit.disabled=true;
  try{await modify((records,sequence,currentRooms,currentAreas)=>upsertItem(records,value,{id:editId,rooms:currentRooms,areas:currentAreas,makeId:newid,sequence}));
   editId=null;formOpen=false;draw();status('Artikel erfolgreich gespeichert.');
  }catch(e){status('Speichern fehlgeschlagen: '+e.message);submit.disabled=false;}
 });
 bindTracking(el,preselect);
 el.querySelector('#lagerItemSearch').addEventListener('input',event=>{
  query=event.target.value;const list=el.querySelector('#lagerItemList');
  const current=items.filter(i=>matchesItem(i,query));
  list.innerHTML=current.length?current.map(card).join(''):'<p class="lager-hint">Keine passenden Artikel gefunden.</p>';
  bindCards(list);
 });
 bindCards(el.querySelector('#lagerItemList'));
}
function bindCards(el){
 el?.querySelectorAll('[data-photo-item]').forEach(btn=>btn.addEventListener('click',()=>{photoType='item';photoTarget=btn.dataset.photoItem;photoOpen=true;draw();document.getElementById('lagerPhotoPanel')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-track-open]').forEach(btn=>btn.addEventListener('click',()=>{trackingItemId=btn.dataset.trackOpen;trackingRecordId=null;trackingOperation=null;stockItemId=null;formOpen=false;editId=null;draw();document.querySelector('.lager-tracking-panel')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-stock-open]').forEach(btn=>btn.addEventListener('click',()=>{trackingItemId=null;stockItemId=btn.dataset.stockOpen;stockKind=btn.dataset.kind;formOpen=false;editId=null;draw();document.getElementById('lagerStockForm')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-item-edit]').forEach(btn=>btn.addEventListener('click',()=>{trackingItemId=null;stockItemId=null;editId=btn.dataset.itemEdit;formOpen=true;draw();document.getElementById('lagerItemForm')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-item-delete]').forEach(btn=>btn.addEventListener('click',async()=>{
  const id=btn.dataset.itemDelete,item=items.find(i=>i.id===id);if(!item)return;
  if(!confirm(`Artikel „${item.name}“ endgültig löschen?`))return;
  btn.disabled=true;
  try{await modify((records,sequence)=>({items:deleteItem(records,id),sequence}));if(editId===id){editId=null;formOpen=false;}if(stockItemId===id)stockItemId=null;draw();status('Artikel gelöscht.');}
  catch(e){status('Löschen fehlgeschlagen: '+e.message);btn.disabled=false;}
 }));
}
function bindTracking(el,preselect){
 const save=async make=>modify((records,sequence,currentRooms,currentAreas,history)=>{
  const ids=new Set(locationChoices(currentRooms,currentAreas).map(x=>x.id));
  const result=make(records,ids);
  return {items:result.items,sequence,...(result.event?{movements:[...history,result.event].slice(-3000)}:{})};
 });
 const formSubmit=(selector,fn)=>el.querySelector(selector)?.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type="submit"]');btn.disabled=true;
  const values=Object.fromEntries(new FormData(f).entries());const id=trackingItemId;
  try{await save((records,ids)=>fn(records,id,values,ids));trackingRecordId=null;trackingOperation=null;draw(preselect);status('Einzelbestand erfolgreich gespeichert.');}
  catch(err){status('Einzelbestand: '+err.message);btn.disabled=false;}
 });
 formSubmit('#lagerContainerAdd',(records,id,v,ids)=>addContainer(records,id,v,ids,{makeId:newid,makeEventId:newid}));
 formSubmit('#lagerDeviceAdd',(records,id,v,ids)=>addDevice(records,id,v,ids,{makeId:newid,makeEventId:newid}));
 formSubmit('#lagerTrackActionForm',(records,id,v,ids)=>{
  const item=records.find(r=>r.id===id),rid=trackingRecordId,op=trackingOperation;
  if((item?.containers||[]).some(c=>c.id===rid))return updateContainer(records,id,rid,op,v,ids,{makeEventId:newid});
  return updateDevice(records,id,rid,op,v,ids,{makeEventId:newid});
 });
 el.querySelector('#lagerTrackClose')?.addEventListener('click',()=>{trackingItemId=null;trackingRecordId=null;trackingOperation=null;draw(preselect);});
 el.querySelector('#lagerTrackCancelAction')?.addEventListener('click',()=>{trackingRecordId=null;trackingOperation=null;draw(preselect);});
 el.querySelectorAll('[data-track-action]').forEach(b=>b.addEventListener('click',async()=>{
  const id=trackingItemId,rid=b.dataset.trackId,act=b.dataset.trackAction;
  const isContainer=(items.find(x=>x.id===id)?.containers||[]).some(x=>x.id===rid);
  if(['consume','move','condition'].includes(act)){trackingRecordId=rid;trackingOperation=act;draw(preselect);document.getElementById('lagerTrackActionForm')?.scrollIntoView({block:'center',behavior:'smooth'});return;}
  if(act==='untrack'&&!confirm('Einzelkennzeichnung aufheben? Die vorhandene Menge bleibt im Gesamtbestand.'))return;
  if(act==='issue'&&!confirm('Dieses Einzelgerät endgültig aus dem Bestand ausbuchen?'))return;
  b.disabled=true;
  try{await save((records,ids)=>isContainer?updateContainer(records,id,rid,act,{},ids,{makeEventId:newid}):updateDevice(records,id,rid,act,{},ids,{makeEventId:newid}));draw(preselect);status('Änderung erfolgreich gespeichert.');}
  catch(err){status('Einzelbestand: '+err.message);b.disabled=false;}
 }));
}
export function renderLagerartikel(){return `<div class="lager-heading"><span class="eyebrow">MEIN ALLTAG · LAGERHAUS</span><h1>Meine Artikel</h1><p>Artikel, Mengen und mehrere Lagerorte verwalten – lokal und offline.</p></div><div class="lager-actions"><a href="#/module/lagerhaus" class="lager-text-link">← Lagerbereiche</a></div><div class="lager-status" id="lagerItemStatus" role="status" aria-live="polite">Artikel werden geladen …</div><div id="lagerItemContent"></div>`;}
export async function mountLagerartikel(preselectRoomId=''){
 editId=null;formOpen=false;stockItemId=null;stockKind='receive';trackingItemId=null;trackingRecordId=null;trackingOperation=null;photoOpen=false;photoType='item';photoTarget='';query='';try{await load();if(!document.getElementById('lagerItemContent'))return;
  draw(rooms.some(r=>r.id===preselectRoomId)?preselectRoomId:'');status(`${items.length} Artikel geladen · offline gespeichert.`);
 }catch(e){status('Artikel konnten nicht geladen werden: '+e.message);}
}
