/** L05–L07 – touch-oriented cards, quick entry, templates and dynamic properties. */
import {getModuleValue,mutateModuleValuesWithDeletes,mutateModuleValues} from '../assets/database.js';
import {ITEM_KEY,ITEM_SEQ_KEY,ITEM_TYPES,ITEM_CONDITIONS,ITEM_UNITS,locationChoices,resolveItemLocation,upsertItem,deleteItem} from './lagerhaus-items.js';
import {navigationHref} from './lagerhaus-navigator.js';
import {templatesFor,propertiesFor,templateById,detailedProperties} from './lagerhaus-templates.js';
import {MOVEMENT_KEY,STOCK_ACTIONS,stockPositions,stockTotal,stockAlert,bookStock} from './lagerhaus-stock.js';
import {addContainer,updateContainer,addDevice,updateDevice,containerState,CONTAINER_STATES,DEVICE_STATES,trackedSummary} from './lagerhaus-tracking.js';
import {pairEligible,pairsLabel,consumptionQuantity} from './lagerhaus-consumption.js';
import {CATEGORY_KEY,CATEGORY_COLORS,CATEGORY_STARTERS,cleanTags,categoryLabel,addCategory,editCategory,removeCategory,bulkAssign,toggleFavorite,migrateCategories,filterItems} from './lagerhaus-categories.js';
import {PHOTO_INDEX_KEY,PHOTO_CATEGORIES,PHOTO_STAGES,photoKey,coverPhoto,ownerPhotos,photoHistory,photoDate,suggestedComparison,comparisonPhotos,readPhotoIndex,readPhotoBlob,preparePhoto,savePhoto,changePhoto,removePhoto} from './lagerhaus-photos.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newid=()=>globalThis.crypto?.randomUUID?.()||`item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let items=[],rooms=[],areas=[],categories=[],categoryManagerOpen=false,categoryEditId='',categoryFilter='',itemTypeFilter='',favoriteFilter=false,itemSort='name',tagFilter='',selectedItems=new Set(),editId=null,formOpen=false,query='',operation=Promise.resolve(),stockItemId=null,stockKind='receive',stockEvents=[],trackingItemId=null,trackingRecordId=null,trackingOperation=null,photos=[],photoOpen=false,photoType='item',photoTarget='',photoBusy=false,photoFilterCategory='',photoFilterStage='',photoFilterSearch='',photoSort='newest',comparisonBefore='',comparisonAfter='';
const option=(value,label,current)=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;
function choices(map,current){return Object.entries(map).map(([v,l])=>option(v,l,current)).join('');}
function locationSelect(current){return locationChoices(rooms,areas).map(c=>option(c.id,c.label,current)).join('');}
function status(message){const el=document.getElementById('lagerItemStatus');if(el)el.textContent=message;}
async function load(){
 const [is,rs,as,events,cats]=await Promise.all([getModuleValue('lagerhaus',ITEM_KEY),getModuleValue('lagerhaus','rooms.v1'),getModuleValue('lagerhaus','areas.v1'),getModuleValue('lagerhaus',MOVEMENT_KEY),getModuleValue('lagerhaus',CATEGORY_KEY)]);
 items=Array.isArray(is)?is:[];rooms=Array.isArray(rs)?rs:[];areas=Array.isArray(as)?as:[];stockEvents=Array.isArray(events)?events:[];categories=Array.isArray(cats)?cats:[];
 // Atomic, idempotent migration of legacy free-text categories. Never touches quantities.
 const mig=migrateCategories(items,categories,newid);
 if(mig.changed){await mutateModuleValues('lagerhaus',[ITEM_KEY,CATEGORY_KEY],values=>{const m=migrateCategories(Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[],Array.isArray(values[CATEGORY_KEY])?values[CATEGORY_KEY]:[],newid);return [[ITEM_KEY,m.items],[CATEGORY_KEY,m.categories]];});
 items=await getModuleValue('lagerhaus',ITEM_KEY)||[];categories=await getModuleValue('lagerhaus',CATEGORY_KEY)||[];}
 photos=await readPhotoIndex();
}
async function modify(fn){
 const task=operation.catch(()=>{}).then(async()=>{
  let saved;
  await mutateModuleValuesWithDeletes('lagerhaus',[ITEM_KEY,ITEM_SEQ_KEY,'rooms.v1','areas.v1',MOVEMENT_KEY,PHOTO_INDEX_KEY,CATEGORY_KEY],values=>{
   const current=Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[];
   const seq=Number(values[ITEM_SEQ_KEY])||0;
   const freshRooms=Array.isArray(values['rooms.v1'])?values['rooms.v1']:[];
   const freshAreas=Array.isArray(values['areas.v1'])?values['areas.v1']:[];
   const history=Array.isArray(values[MOVEMENT_KEY])?values[MOVEMENT_KEY]:[];
   const currentCategories=Array.isArray(values[CATEGORY_KEY])?values[CATEGORY_KEY]:[];
   const outcome=fn(current,seq,freshRooms,freshAreas,history,currentCategories);
   saved={...outcome,rooms:freshRooms,areas:freshAreas,categories:outcome.categories||currentCategories};
   const existingPhotos=Array.isArray(values[PHOTO_INDEX_KEY])?values[PHOTO_INDEX_KEY]:[];
   const retainedIds=new Set(outcome.items.map(i=>i.id));
   const removed=existingPhotos.filter(p=>p.ownerType==='item'&&!retainedIds.has(p.ownerId));
   const nextPhotos=removed.length?existingPhotos.filter(p=>!removed.includes(p)):existingPhotos;
   saved.photos=nextPhotos;
   return {write:[[ITEM_KEY,outcome.items],[ITEM_SEQ_KEY,outcome.sequence],...(outcome.categories?[[CATEGORY_KEY,outcome.categories]]:[]),...(outcome.movements?[[MOVEMENT_KEY,outcome.movements]]:[]),...(removed.length?[[PHOTO_INDEX_KEY,nextPhotos]]:[])],remove:removed.map(p=>photoKey(p.id))};
  });
  items=saved.items;rooms=saved.rooms;areas=saved.areas;photos=saved.photos;categories=saved.categories;
  if(saved.movements)stockEvents=saved.movements;
 });
 operation=task;return task;
}
function stockQuantity(value){return String(value??0).replace('.',',');}
function trackingPanel(item){
 const cs=item.containers||[],ds=item.devices||[],sum=trackedSummary(item);
 const locOptions=locationSelect('');
 const action=trackingRecordId&&(cs.find(c=>c.id===trackingRecordId)||ds.find(d=>d.id===trackingRecordId));
 const pairs=pairEligible(item);
 const actionForm=action&&trackingOperation?`<form id="lagerTrackActionForm" class="lager-item-form">
 <h3>${esc(action.code)} · ${esc(trackingOperation==='consume'?'Gebinde-Verbrauch':trackingOperation==='move'?'Lagerort ändern':'Gerätezustand ändern')}</h3>
 ${trackingOperation==='consume'?`<label>Verbrauchseinheit<select name="consumeUnit"><option value="units">${esc(ITEM_UNITS[item.unit]||item.unit)}</option>${pairs?'<option value="pairs">Paar (2 Stück)</option>':''}</select></label><div class="lager-quick-pair"><label>Entnommene Menge<input name="quantity" type="number" min="${item.unit==='stk'?1:.001}" max="${esc(action.remaining)}" step="${item.unit==='stk'?1:.001}" required inputmode="decimal" value="1"></label>${pairs?'<button type="button" data-pair-quick="1">− 1 Paar</button><button type="button" data-pair-quick="2">− 2 Paare</button>':''}</div><p class="lager-stock-help">Gebucht wird immer in der Grundeinheit; bei Paaren werden exakt 2 Handschuhe abgezogen.</p>`:''}
 ${trackingOperation==='move'?`<label>Neuer Lagerort<select name="locationId">${locOptions}</select></label>`:''}
 ${trackingOperation==='condition'?`<label>Neuer Zustand<select name="condition">${choices(DEVICE_STATES,action.condition)}</select></label>`:''}
 <button class="primary-button" type="submit">Änderung speichern</button> <button class="secondary-button" type="button" id="lagerTrackCancelAction">Abbrechen</button></form>`:'';
 return `<section class="lager-tracking-panel" aria-label="Gebinde und Einzelgeräte"><div class="lager-item-form-title"><h2>${esc(item.name)} · Einzelbestände</h2><button type="button" id="lagerTrackClose" class="secondary-button">Schließen</button></div>
 <p>Der Gesamtbestand wird nicht doppelt gezählt. Bestehende Mengen können einzeln gekennzeichnet oder neue Mengen hinzugebucht werden.</p>${pairs?`<p class="lager-pair-summary">🧤 Paarzählung aktiv: Gesamt ${esc(pairsLabel(stockTotal(item)))} (${esc(stockQuantity(stockTotal(item)))} Stück). Die Lagerbuchung bleibt in einzelnen Handschuhen.</p>`:''}
 <div class="lager-track-overview">${item.type==='verbrauch'?`<span>Voll: <strong>${sum.full}</strong></span><span>Angebrochen: <strong>${sum.open}</strong></span><span>Leer: <strong>${sum.empty}</strong></span>`:item.type==='geraet'?`<span>Einzelgeräte: <strong>${sum.devices}</strong></span>`:''}<span>Frei verfügbar: <strong>${esc(stockQuantity(sum.untracked))} ${esc(ITEM_UNITS[item.unit]||item.unit)}</strong></span></div>
 ${item.type==='verbrauch'?`<form id="lagerContainerAdd" class="lager-item-form"><h3>Gebinde erfassen</h3><div class="lager-item-grid"><label>Gebindegröße in ${esc(ITEM_UNITS[item.unit]||item.unit)}<input type="number" name="capacity" min="0.001" step="0.001" max="1000000" inputmode="decimal" placeholder="z. B. 100" required></label><label>Gebindename (optional)<input name="label" maxlength="80" placeholder="z. B. Sprühflasche"></label></div><label>Bereits angebrochen? Restmenge (${esc(ITEM_UNITS[item.unit]||item.unit)}) – leer lassen bei voller Packung<input type="number" name="remaining" min="0.001" step="0.001" max="1000000" inputmode="decimal" placeholder="z. B. 37 von 100"></label><p class="lager-stock-help">Eine angefangene Packung wird nur mit dem tatsächlich vorhandenen Restbestand eingebucht, nicht mit ihrer ursprünglichen Vollmenge.${pairs?' Beispiel: 100 Handschuhe = 50 Paare. Gebindegröße und Restmenge hier als einzelne Handschuhe erfassen.':''}</p><label>Lagerort<select name="locationId">${locOptions}</select></label><label>Bestandsquelle<select name="source"><option value="new">Neu einlagern (+ Bestand)</option><option value="existing">Aus bisherigem Bestand kennzeichnen</option></select></label><button class="primary-button" type="submit">+ Gebinde anlegen</button></form>
 <div class="lager-track-list">${cs.length?cs.map(c=>`<article><div><strong>${esc(c.code)}</strong> ${esc(c.label)} <span class="lager-track-status">${esc(CONTAINER_STATES[containerState(c)])}</span></div><p>${esc(stockQuantity(c.remaining))} / ${esc(stockQuantity(c.capacity))} ${esc(ITEM_UNITS[item.unit]||item.unit)}${pairs?` · ${esc(pairsLabel(c.remaining))} übrig`:''} · ${esc(resolveItemLocation(c.locationId,rooms,areas).label)}</p><div class="lager-item-actions">${containerState(c)==='full'?`<button type="button" class="secondary-button" data-track-action="open" data-track-id="${esc(c.id)}">Öffnen</button>`:''}${containerState(c)!=='empty'?`<button type="button" class="secondary-button" data-track-action="consume" data-track-id="${esc(c.id)}">Verbrauch</button>`:''}<button type="button" class="secondary-button" data-track-action="move" data-track-id="${esc(c.id)}">Umlagern</button><button type="button" class="secondary-button" data-track-action="untrack" data-track-id="${esc(c.id)}">Kennzeichnung entfernen</button></div></article>`).join(''):'<p>Keine Gebinde einzeln erfasst.</p>'}</div>`:''}
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
 return positions.length?`<div class="lager-stock-positions">${positions.map(pos=>{const location=resolveItemLocation(pos.locationId,rooms,areas),href=navigationHref(pos.locationId,rooms,areas);return `<div class="lager-l14-position"><span>${esc(location.label)}${href?`<a class="lager-l14-jump" href="${esc(href)}" aria-label="${esc(item.name)} am Lagerort ${esc(location.label)} in der 3D-Ansicht anzeigen">📍 3D anzeigen</a>`:'<small class="lager-l14-no-place">Kein 3D-Ziel</small>'}</span><strong>${esc(stockQuantity(pos.quantity))} ${esc(item.unit)}</strong></div>`;}).join('')}</div>`:'<p class="lager-stock-empty">Kein Bestand auf Lager</p>';
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
   <label>Paarzählung für Stück-Artikel<select name="pairCounting">${choices({auto:'Automatisch bei Handschuhen',yes:'Aktiviert (1 Paar = 2 Stück)',no:'Deaktiviert'},a.pairCounting||'auto')}</select></label>
   <div class="lager-item-grid"><label>Marke (optional)<input name="brand" maxlength="80" value="${esc(a.brand)}" placeholder="z. B. Bosch"></label><label>Artikelnummer (optional)<input name="articleNumber" maxlength="80" value="${esc(a.articleNumber)}"></label></div>
   <label>Zustand<select name="condition">${choices(ITEM_CONDITIONS,a.condition)}</select></label>
   <div id="lagerItemProperties">${propertyFields(a.type,a.properties)}</div>
   <label>Notiz<textarea name="note" rows="3" maxlength="2000" placeholder="Eigene Informationen zum Artikel">${esc(a.note)}</textarea></label>
  </div>
 </details>
 <div class="lager-item-grid"><label>Kategorie<select name="categoryId"><option value="">Allgemein / keine Kategorie</option>${categories.map(c=>option(c.id,`${c.icon} ${categoryLabel(c,categories)}`,a.categoryId||'')).join('')}</select></label><label>Schlagwörter (Komma getrennt)<input name="tags" maxlength="400" value="${esc((a.tags||[]).join(', '))}" placeholder="z. B. Handschuhe, Arbeitsschutz"></label></div>
 <label class="lager-item-favorite-form"><input name="favorite" type="checkbox" ${a.favorite?'checked':''}> Als Favorit markieren ★</label>
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

function card(item){
 const loc=resolveItemLocation(item.locationId,rooms,areas);
 const props=detailedProperties(item);
 const stock=stockAlert(item);
 const cover=coverPhoto(photos,'item',item.id),count=ownerPhotos(photos,'item',item.id).length;
 return `<article class="lager-item-card">${cover?`<img class="lager-item-cover" src="${esc(cover.thumbnail)}" alt="Hauptfoto von ${esc(item.name)}" loading="lazy">`:''}<div class="lager-item-card-top"><span class="lager-identifier">${esc(item.code)}</span><span class="lager-item-type">${esc(ITEM_TYPES[item.type]||'Sonstiges')}</span></div>
 <div class="lager-l13-title"><h3>${esc(item.name)}</h3><button type="button" aria-label="${item.favorite?'Favorit entfernen':'Als Favorit markieren'}" title="Favorit umschalten" class="lager-favorite-toggle ${item.favorite?'is-favorite':''}" data-favorite-toggle="${esc(item.id)}">${item.favorite?'★':'☆'}</button></div><p class="lager-item-path">⌖ ${stockPositions(item).length>1?'Mehrere Lagerorte':esc(loc.label)}</p>
 <div class="lager-item-facts"><span><strong>${esc(stockQuantity(stock.total))}</strong> ${esc(ITEM_UNITS[item.unit]||item.unit)}</span><span>Packung: ${esc(stockQuantity(item.packSize??1))}</span><span class="lager-l13-category-badge" style="--category-accent:${CATEGORY_COLORS[categories.find(c=>c.id===item.categoryId)?.color]||CATEGORY_COLORS.slate}">${esc(categories.find(c=>c.id===item.categoryId)?.icon||'📦')} ${esc(categories.find(c=>c.id===item.categoryId)?categoryLabel(categories.find(c=>c.id===item.categoryId),categories):item.category||'Allgemein')}</span><span>${esc(ITEM_CONDITIONS[item.condition]||'Gut')}</span></div>
 ${stock.low?`<p class="lager-stock-warning">⚠ Mindestbestand erreicht (${esc(stockQuantity(stock.minimumStock))} ${esc(ITEM_UNITS[item.unit]||item.unit)})</p>`:''}
 ${positionsHtml(item)}
 ${(item.containers||[]).length||((item.devices||[]).length)?`<p class="lager-item-extra">${(item.containers||[]).length?`Gebinde: ${trackedSummary(item).full} voll · ${trackedSummary(item).open} angebrochen · ${trackedSummary(item).empty} leer`:''} ${(item.devices||[]).length?`Einzelgeräte: ${trackedSummary(item).devices}`:''}</p>`:''}
 ${(item.brand||item.articleNumber)?`<p class="lager-item-extra">${esc([item.brand,item.articleNumber].filter(Boolean).join(' · '))}</p>`:''}${props.length?`<dl class="lager-item-properties-list">${props.map(p=>`<div><dt>${esc(p.label)}</dt><dd>${esc(p.value)}</dd></div>`).join('')}</dl>`:''}${item.note?`<p class="lager-item-note">${esc(item.note)}</p>`:''}
 ${(item.tags||[]).length?`<div class="lager-l13-tags">${item.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}
 <label class="lager-l13-select"><input type="checkbox" data-bulk-id="${esc(item.id)}" ${selectedItems.has(item.id)?'checked':''}> Für Sammelzuordnung auswählen</label>
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
function prettyPhotoDate(date){
 const value=String(date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return 'Datum unbekannt';
 return new Intl.DateTimeFormat('de-AT',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
}
function resetPhotoSelection(){photoFilterCategory='';photoFilterStage='';photoFilterSearch='';photoSort='newest';comparisonBefore='';comparisonAfter='';}
function photoPanel(){
 if(!photoOpen)return '';
 const targets=photoTargets();if(!targets.some(x=>x.id===photoTarget))photoTarget=targets[0]?.id||'';
 const all=ownerPhotos(photos,photoType,photoTarget);
 const gallery=photoHistory(photos,photoType,photoTarget,{category:photoFilterCategory,stage:photoFilterStage,search:photoFilterSearch,sort:photoSort});
 const validTarget=targets.some(x=>x.id===photoTarget&&!x.label.startsWith('⚠'));
 const recommended=suggestedComparison(photos,photoType,photoTarget);
 const before=all.some(p=>p.id===comparisonBefore)?comparisonBefore:recommended[0];
 const after=all.some(p=>p.id===comparisonAfter)?comparisonAfter:recommended[1];
 const cmpChoices=selected=>all.map(p=>option(p.id,`${p.stage==='vorher'?'VORHER · ':p.stage==='nachher'?'NACHHER · ':''}${prettyPhotoDate(photoDate(p))} · ${p.description||PHOTO_CATEGORIES[p.category]||'Foto'}`,selected)).join('');
 const galleryHtml=gallery.map(p=>`<article class="lager-photo-tile" data-photo-id="${esc(p.id)}">
 <button type="button" class="lager-photo-preview" data-photo-preview="${esc(p.id)}" aria-label="Foto vergrößert ansehen"><img src="${esc(p.thumbnail)}" alt="${esc(p.description||'Lagerfoto')}" loading="lazy"></button>
 <div class="lager-photo-details">${p.cover?'<span class="lager-photo-main">★ Hauptbild</span>':''}<span class="lager-photo-stage">${esc(PHOTO_STAGES[p.stage||'bestand']||PHOTO_STAGES.bestand)}</span><small>${p.takenOn?'Aufnahme':'Erfasst'}: ${esc(prettyPhotoDate(photoDate(p)))} · ${esc(p.width)} × ${esc(p.height)} px · ${(p.bytes/1024/1024).toFixed(2)} MB</small>
 <label>Kategorie<select data-photo-category="${esc(p.id)}">${Object.entries(PHOTO_CATEGORIES).map(([v,t])=>option(v,t,p.category)).join('')}</select></label>
 <label>Zustandsphase<select data-photo-stage="${esc(p.id)}">${Object.entries(PHOTO_STAGES).map(([v,t])=>option(v,t,p.stage||'bestand')).join('')}</select></label>
 <div class="lager-item-grid"><label>Vergleichsreihe<input data-photo-series="${esc(p.id)}" maxlength="64" value="${esc(p.series||'')}" placeholder="z. B. Reparatur 2026"></label><label>Aufnahmedatum (optional)<input data-photo-taken="${esc(p.id)}" type="date" value="${esc(p.takenOn||'')}"></label></div>
 <label>Beschreibung<input data-photo-description="${esc(p.id)}" maxlength="140" value="${esc(p.description||'')}"></label>
 <div class="lager-photo-buttons"><button type="button" class="secondary-button" data-photo-save="${esc(p.id)}">Speichern</button>${p.cover?'':`<button type="button" class="secondary-button" data-photo-cover="${esc(p.id)}">★ Hauptbild</button>`}<button type="button" class="secondary-button" data-photo-download="${esc(p.id)}">Bild sichern</button><button type="button" class="secondary-button lager-delete" data-photo-delete="${esc(p.id)}">Löschen</button></div></div></article>`).join('');
 return `<section class="lager-photo-panel" id="lagerPhotoPanel" aria-label="Lokale Fotohistorie und Vergleich">
 <div class="lager-item-form-title"><div><span class="eyebrow">L11 · OFFLINE FOTOHISTORIE</span><h2>Meine Fotos & Vergleiche</h2></div><button type="button" id="lagerPhotoClose" class="secondary-button">Schließen</button></div>
 <p class="lager-photo-notice">Fotos liegen nur in diesem Chrome-Profil (IndexedDB), nicht in der Cloud. Vor dem Löschen von Browserdaten die gewünschten Bilder einzeln sichern.</p>
 <div class="lager-item-grid"><label>Fotos für<select id="lagerPhotoType">${option('item','Artikel',photoType)}${option('location','Lagerort / Fach',photoType)}</select></label>
 <label>Auswahl<select id="lagerPhotoTarget">${targets.map(t=>option(t.id,t.label,photoTarget)).join('')}</select></label></div>
 ${validTarget?`<div class="lager-photo-add"><div class="lager-photo-inputs"><label class="primary-button" for="lagerPhotoCamera">📷 Kamera öffnen<input id="lagerPhotoCamera" type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment"></label><label class="secondary-button" for="lagerPhotoGallery">▧ Galerie auswählen<input id="lagerPhotoGallery" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple></label></div>
 <div class="lager-item-grid"><label>Kategorie für neue Fotos<select id="lagerPhotoNewCategory">${Object.entries(PHOTO_CATEGORIES).map(([v,t])=>option(v,t,'allgemein')).join('')}</select></label><label>Zustandsphase<select id="lagerPhotoNewStage">${Object.entries(PHOTO_STAGES).map(([v,t])=>option(v,t,'bestand')).join('')}</select></label></div>
 <div class="lager-item-grid"><label>Vergleichsreihe (optional)<input id="lagerPhotoNewSeries" maxlength="64" placeholder="z. B. Vorher/Nachher Hecke"></label><label>Aufnahmedatum (optional)<input id="lagerPhotoNewTakenOn" type="date"></label></div>
 <label>Beschreibung (optional)<input id="lagerPhotoNewDescription" maxlength="140" placeholder="z. B. Zustand vor Reinigung"></label>
 <label class="lager-photo-quality"><input type="checkbox" id="lagerPhotoOriginal"> Original-Dateien unverändert behalten</label>
 <p class="lager-photo-notice">Standard: optionale WebP-Komprimierung bis 2048 px, nur falls kleiner. Originalmodus speichert ohne Qualitätsänderung. Maximal 25 MB pro Bild. Das Aufnahmedatum wird nur gesetzt, wenn du es selbst angibst.</p></div>`:'<p class="lager-photo-notice">Bitte einen vorhandenen Artikel oder Lagerort auswählen.</p>'}
 <div class="lager-photo-history"><h3>🕘 Bildverlauf · ${all.length} gespeichert</h3><div class="lager-photo-filters"><label>Kategorie<select id="lagerPhotoFilterCategory"><option value="">Alle Kategorien</option>${Object.entries(PHOTO_CATEGORIES).map(([v,t])=>option(v,t,photoFilterCategory)).join('')}</select></label><label>Phase<select id="lagerPhotoFilterStage"><option value="">Alle Phasen</option>${Object.entries(PHOTO_STAGES).map(([v,t])=>option(v,t,photoFilterStage)).join('')}</select></label><label>Reihenfolge<select id="lagerPhotoSort">${option('newest','Neueste zuerst',photoSort)}${option('oldest','Älteste zuerst',photoSort)}</select></label><label>Suche<input type="search" id="lagerPhotoFilterSearch" value="${esc(photoFilterSearch)}" placeholder="Beschreibung, Vergleichsreihe …"></label></div>
 <p class="lager-photo-notice">${gallery.length} Treffer. Ohne selbst eingetragenes Aufnahmedatum wird das Importdatum angezeigt.</p></div>
 ${all.length>=2?`<div class="lager-photo-compare"><h3>↔ Zwei Aufnahmen vergleichen</h3><p class="lager-photo-notice">Nur Fotos desselben Artikels bzw. Lagerortes. Passende Vorher-/Nachher-Bilder derselben Vergleichsreihe werden vorausgewählt.</p>
 <div class="lager-item-grid"><label>Bild links (vorher)<select id="lagerCompareBefore"><option value="">Bitte wählen</option>${cmpChoices(before)}</select></label><label>Bild rechts (nachher)<select id="lagerCompareAfter"><option value="">Bitte wählen</option>${cmpChoices(after)}</select></label></div><button type="button" class="primary-button" id="lagerCompareOpen">Bildvergleich öffnen</button></div>`:''}
 <div class="lager-photo-grid">${galleryHtml||'<p class="lager-hint">Keine passenden Fotos. Filter ändern oder neues Foto hinzufügen.</p>'}</div>
 <dialog id="lagerPhotoDialog" class="lager-photo-dialog"><button type="button" id="lagerPhotoDialogClose" class="secondary-button">Schließen ✕</button><img id="lagerPhotoFull" alt="Foto-Vorschau"><p id="lagerPhotoInfo"></p></dialog>
 <dialog id="lagerCompareDialog" class="lager-photo-dialog lager-compare-dialog"><button type="button" id="lagerCompareClose" class="secondary-button">Schließen ✕</button><h3>Bildvergleich</h3><div class="lager-compare-images"><figure><img id="lagerCompareLeft" alt="Linkes Vergleichsfoto"><figcaption id="lagerCompareLeftInfo"></figcaption></figure><figure><img id="lagerCompareRight" alt="Rechtes Vergleichsfoto"><figcaption id="lagerCompareRightInfo"></figcaption></figure></div></dialog>
 </section>`;
}
function bindPhotoPanel(el,preselect){
 const panel=el.querySelector('#lagerPhotoPanel');if(!panel)return;
 const refresh=async msg=>{photos=await readPhotoIndex();draw(preselect);if(msg)status(msg);};
 panel.querySelector('#lagerPhotoClose').addEventListener('click',()=>{photoOpen=false;draw(preselect);});
 panel.querySelector('#lagerPhotoType').addEventListener('change',e=>{photoType=e.target.value;photoTarget='';resetPhotoSelection();draw(preselect);});
 panel.querySelector('#lagerPhotoTarget').addEventListener('change',e=>{photoTarget=e.target.value;resetPhotoSelection();draw(preselect);});
 const filterIds=[['lagerPhotoFilterCategory',v=>photoFilterCategory=v],['lagerPhotoFilterStage',v=>photoFilterStage=v],['lagerPhotoSort',v=>photoSort=v]];
 for(const [id,fn] of filterIds)panel.querySelector('#'+id)?.addEventListener('change',e=>{fn(e.target.value);draw(preselect);});
 panel.querySelector('#lagerPhotoFilterSearch')?.addEventListener('change',e=>{photoFilterSearch=e.target.value;draw(preselect);});
 const handleFiles=async e=>{
  const files=[...e.target.files];if(!files.length||photoBusy)return;
  photoBusy=true;const inputs=panel.querySelectorAll('input[type=file]');inputs.forEach(b=>b.disabled=true);
  const ownerType=photoType,ownerId=photoTarget;
  const data={ownerType,ownerId,category:panel.querySelector('#lagerPhotoNewCategory').value,description:panel.querySelector('#lagerPhotoNewDescription').value,
   stage:panel.querySelector('#lagerPhotoNewStage').value,series:panel.querySelector('#lagerPhotoNewSeries').value,takenOn:panel.querySelector('#lagerPhotoNewTakenOn').value};
  const keepOriginal=panel.querySelector('#lagerPhotoOriginal').checked;let completed=0;
  try{
   for(const file of files){status(`Foto ${completed+1} von ${files.length} wird lokal vorbereitet …`);
    const prepared=await preparePhoto(file,{keepOriginal});await savePhoto(data,prepared);completed++;
   }
   await refresh(`${completed} Foto${completed===1?'':'s'} lokal gespeichert.`);
  }catch(err){await refresh(`${completed} gespeichert. Fotoimport unterbrochen: ${err.message}`);}
  finally{photoBusy=false;}
 };
 panel.querySelector('#lagerPhotoCamera')?.addEventListener('change',handleFiles);
 panel.querySelector('#lagerPhotoGallery')?.addEventListener('change',handleFiles);
 const readEdit=id=>({category:panel.querySelector(`[data-photo-category="${id}"]`).value,
  description:panel.querySelector(`[data-photo-description="${id}"]`).value,stage:panel.querySelector(`[data-photo-stage="${id}"]`).value,
  series:panel.querySelector(`[data-photo-series="${id}"]`).value,takenOn:panel.querySelector(`[data-photo-taken="${id}"]`).value});
 panel.querySelectorAll('[data-photo-save]').forEach(b=>b.addEventListener('click',async()=>{
  const id=b.dataset.photoSave;b.disabled=true;
  try{await changePhoto(id,readEdit(id));await refresh('Fotohistorie aktualisiert.');}
  catch(err){b.disabled=false;status(err.message);}
 }));
 panel.querySelectorAll('[data-photo-cover]').forEach(b=>b.addEventListener('click',async()=>{
  const id=b.dataset.photoCover;b.disabled=true;
  try{await changePhoto(id,readEdit(id),{cover:true});await refresh('Neues Hauptbild gespeichert.');}
  catch(err){b.disabled=false;status(err.message);}
 }));
 panel.querySelectorAll('[data-photo-delete]').forEach(b=>b.addEventListener('click',async()=>{
  if(!confirm('Dieses Foto unwiderruflich löschen? Andere Fotos und Bestände bleiben bestehen.'))return;
  b.disabled=true;
  try{await removePhoto(b.dataset.photoDelete);await refresh('Nur das ausgewählte Foto wurde gelöscht.');}
  catch(err){b.disabled=false;status(err.message);}
 }));
 const dialog=panel.querySelector('#lagerPhotoDialog');let previewURL=null;
 const cleanup=()=>{if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}};
 dialog.addEventListener('close',cleanup);
 panel.querySelector('#lagerPhotoDialogClose').addEventListener('click',()=>dialog.close());
 panel.querySelectorAll('[data-photo-preview]').forEach(b=>b.addEventListener('click',async()=>{
  b.disabled=true;
  try{const photo=photos.find(p=>p.id===b.dataset.photoPreview),blob=await readPhotoBlob(photo.id);
   cleanup();previewURL=URL.createObjectURL(blob);dialog.querySelector('#lagerPhotoFull').src=previewURL;
   dialog.querySelector('#lagerPhotoInfo').textContent=`${photo.description||PHOTO_CATEGORIES[photo.category]} · ${photo.width} × ${photo.height} Pixel`;
   dialog.showModal();
  }catch(err){cleanup();status('Vorschau nicht verfügbar: '+err.message);}
  finally{b.disabled=false;}
 }));
 panel.querySelectorAll('[data-photo-download]').forEach(b=>b.addEventListener('click',async()=>{
  b.disabled=true;let url;
  try{const p=photos.find(x=>x.id===b.dataset.photoDownload);if(!p)throw new Error('Foto fehlt.');
   const blob=await readPhotoBlob(p.id);url=URL.createObjectURL(blob);const a=document.createElement('a');
   a.href=url;a.download=`lagerfoto-${p.id}.${blob.type==='image/png'?'png':blob.type==='image/avif'?'avif':blob.type==='image/webp'?'webp':'jpg'}`;
   document.body.append(a);a.click();a.remove();status('Bildspeicherung angestoßen. Download im Browser überprüfen.');
  }catch(err){status('Bild konnte nicht gesichert werden: '+err.message);}
  finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),30_000);b.disabled=false;}
 }));
 const compare=panel.querySelector('#lagerCompareDialog');let compareURLs=[];
 const clearCompare=()=>{compareURLs.forEach(x=>URL.revokeObjectURL(x));compareURLs=[];};
 compare?.addEventListener('close',clearCompare);
 panel.querySelector('#lagerCompareClose')?.addEventListener('click',()=>compare.close());
 panel.querySelector('#lagerCompareOpen')?.addEventListener('click',async e=>{
  const btn=e.currentTarget;comparisonBefore=panel.querySelector('#lagerCompareBefore').value;comparisonAfter=panel.querySelector('#lagerCompareAfter').value;
  btn.disabled=true;
  try{const pair=comparisonPhotos(photos,photoType,photoTarget,comparisonBefore,comparisonAfter);
   // Resolve both blobs before replacing the current preview, so failed reads do not leave a half-open modal.
   const binaries=await Promise.all(pair.map(p=>readPhotoBlob(p.id)));clearCompare();compareURLs=binaries.map(b=>URL.createObjectURL(b));
   compare.querySelector('#lagerCompareLeft').src=compareURLs[0];compare.querySelector('#lagerCompareRight').src=compareURLs[1];
   const details=p=>`${PHOTO_STAGES[p.stage||'bestand']} · ${p.takenOn?'Aufnahme':'Erfasst'}: ${prettyPhotoDate(photoDate(p))} · ${p.description||PHOTO_CATEGORIES[p.category]}`;
   compare.querySelector('#lagerCompareLeftInfo').textContent=details(pair[0]);compare.querySelector('#lagerCompareRightInfo').textContent=details(pair[1]);
   compare.showModal();
  }catch(err){status('Vergleich nicht verfügbar: '+err.message);}
  finally{btn.disabled=false;}
 });
}
function currentFiltered(){return filterItems(items,{search:query,categoryId:categoryFilter,type:itemTypeFilter,favorites:favoriteFilter,sort:itemSort,tag:tagFilter},categories);}
function categoryOptions(selected=''){return `<option value="">Alle Kategorien</option>`+categories.map(c=>option(c.id,`${c.icon} ${categoryLabel(c,categories)}`,selected)).join('');}
function categoryManagerHtml(){
 if(!categoryManagerOpen)return '';
 const edit=categories.find(c=>c.id===categoryEditId)||null;
 const starter=CATEGORY_STARTERS.filter(s=>!categories.some(c=>!c.parentId&&c.name.toLocaleLowerCase('de-AT')===s.name.toLocaleLowerCase('de-AT')));
 return `<section class="lager-l13-manager" id="lagerCategoryManager"><div class="lager-item-form-title"><div><span class="eyebrow">L13 · KATEGORIEN</span><h2>Kategorien verwalten</h2></div><button type="button" class="secondary-button" id="lagerCategoryClose">Schließen</button></div>
 <p class="lager-stock-help">Kategorien gehören zu Artikeln, nicht zu einem bestimmten Regal. Beim Umbenennen bleiben die zugeordneten Artikel erhalten.</p>
 ${starter.length?`<div class="lager-l13-starters"><strong>Schnellvorlagen:</strong> ${starter.map((s,i)=>`<button class="secondary-button" type="button" data-cat-starter="${i}">${esc(s.icon)} ${esc(s.name)}</button>`).join('')}</div>`:''}
 <form id="lagerCategoryForm"><h3>${edit?'Kategorie bearbeiten':'Neue Kategorie / Unterkategorie'}</h3><div class="lager-item-grid"><label>Name *<input name="name" required maxlength="55" value="${esc(edit?.name||'')}" placeholder="z. B. Schutzkleidung"></label><label>Übergeordnete Kategorie<select name="parentId"><option value="">Hauptkategorie</option>${categories.filter(c=>c.id!==edit?.id).map(c=>option(c.id,categoryLabel(c,categories),edit?.parentId||'')).join('')}</select></label><label>Symbol (Emoji)<input name="icon" maxlength="12" value="${esc(edit?.icon||'📦')}"></label><label>Farbe<select name="color">${Object.entries(CATEGORY_COLORS).map(([k,v])=>option(k,({slate:'Schiefer',blue:'Blau',teal:'Türkis',green:'Grün',amber:'Orange',violet:'Violett',rose:'Rosa'}[k]),edit?.color||'slate')).join('')}</select></label></div>
 <label>Suchbegriffe / Schreibvarianten (Komma getrennt)<input name="aliases" maxlength="350" placeholder="z. B. Handschuh, Gloves" value="${esc((edit?.aliases||[]).join(', '))}"></label><div class="lager-item-actions"><button type="submit" class="primary-button">${edit?'Kategorie speichern':'+ Kategorie erstellen'}</button>${edit?'<button id="lagerCategoryEditCancel" type="button" class="secondary-button">Abbrechen</button>':''}</div></form>
 <div class="lager-l13-category-list">${categories.length?categories.map(c=>`<article style="--category-accent:${CATEGORY_COLORS[c.color]||CATEGORY_COLORS.slate}"><span class="lager-l13-category-icon">${esc(c.icon||'📦')}</span><div><strong>${esc(categoryLabel(c,categories))}</strong><small>${items.filter(i=>i.categoryId===c.id).length} direkte Artikel ${c.aliases?.length?'· '+esc(c.aliases.join(', ')):''}</small></div><button type="button" class="secondary-button" data-cat-edit="${esc(c.id)}">Bearbeiten</button><button type="button" class="secondary-button lager-delete" data-cat-delete="${esc(c.id)}">Löschen</button></article>`).join(''):'<p>Keine Kategorien angelegt.</p>'}</div></section>`;
}
function filterToolbar(){return `<section class="lager-l13-toolbar" aria-label="Artikelfilter und Sammelzuordnung"><div class="lager-l13-toolhead"><strong>Finden & ordnen</strong><button type="button" class="secondary-button" id="lagerCategoryOpen">⚙ Kategorien verwalten</button></div>
 <div class="lager-l13-filter-grid"><label>Kategorie<select id="lagerFilterCategory">${categoryOptions(categoryFilter)}</select></label><label>Artikeltyp<select id="lagerFilterType"><option value="">Alle Typen</option>${choices(ITEM_TYPES,itemTypeFilter)}</select></label><label>Sortieren<select id="lagerFilterSort">${option('name','Name A–Z',itemSort)}${option('name-desc','Name Z–A',itemSort)}${option('recent','Neueste zuerst',itemSort)}${option('quantity','Kleinster Bestand zuerst',itemSort)}</select></label><label>Schlagwort<input id="lagerFilterTag" type="search" value="${esc(tagFilter)}" placeholder="z. B. Arbeitsschutz"></label></div>
 <label class="lager-l13-select"><input type="checkbox" id="lagerFilterFav" ${favoriteFilter?'checked':''}> Nur Favoriten ★</label>
 <div class="lager-l13-bulk"><span id="lagerBulkCount">${selectedItems.size} ausgewählt</span><button type="button" class="secondary-button" id="lagerBulkSelectVisible">Sichtbare auswählen</button><button type="button" class="secondary-button" id="lagerBulkClear">Auswahl löschen</button><select id="lagerBulkCategory" aria-label="Zielkategorie für ausgewählte Artikel"><option value="">Allgemein / keine Kategorie</option>${categories.map(c=>option(c.id,categoryLabel(c,categories),'' )).join('')}</select><button type="button" class="primary-button" id="lagerBulkApply">Zuordnen</button></div></section>`;}
function draw(preselect=''){
 const el=document.getElementById('lagerItemContent');if(!el)return;
 const filtered=currentFiltered();
 const selected=items.find(i=>i.id===editId);
 const stockSelected=items.find(i=>i.id===stockItemId);
 const trackingSelected=items.find(i=>i.id===trackingItemId);
 const lowCount=items.filter(i=>stockAlert(i).low).length;
 el.innerHTML=`<div class="lager-item-head"><div><strong>${items.length}</strong> Artikel gespeichert · <strong>${lowCount}</strong> Mindestbestand-Warnungen</div><div class="lager-photo-head-actions"><button type="button" id="lagerPhotoOpen" class="secondary-button">📷 Fotoarchiv</button><button type="button" id="lagerItemAdd" class="primary-button">+ Artikel</button></div></div>
 ${categoryManagerHtml()}
 ${photoPanel()}
 ${formOpen?form(selected,preselect):''}
 ${stockSelected?stockPanel(stockSelected):''}
 ${trackingSelected?trackingPanel(trackingSelected):''}
 ${filterToolbar()}
 <label class="lager-item-search-label" for="lagerItemSearch">Artikel durchsuchen</label><input id="lagerItemSearch" class="lager-item-search" type="search" placeholder="Name, Seriennummer, Kennung, Kategorie …" value="${esc(query)}">
 <div id="lagerItemList">${filtered.length?filtered.map(card).join(''):'<p class="lager-hint">Keine Artikel vorhanden oder keine Treffer. Mit „+ Artikel“ kannst du deinen ersten Gegenstand erfassen.</p>'}</div>`;
 el.querySelector('#lagerPhotoOpen').addEventListener('click',()=>{photoOpen=!photoOpen;photoType='item';photoTarget=items[0]?.id||'';resetPhotoSelection();draw(preselect);});
 bindPhotoPanel(el,preselect);
 el.querySelector('#lagerItemAdd').addEventListener('click',()=>{stockItemId=null;trackingItemId=null;editId=null;formOpen=true;draw(preselect);el.querySelector('[name="name"]')?.focus();});
 el.querySelector('#lagerItemCancel')?.addEventListener('click',()=>{editId=null;formOpen=false;draw(preselect);});
 bindTemplates(el);
 bindCategoryControls(el,preselect);
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
  const current=currentFiltered();
  list.innerHTML=current.length?current.map(card).join(''):'<p class="lager-hint">Keine passenden Artikel gefunden.</p>';
  bindCards(list);
 });
 bindCards(el.querySelector('#lagerItemList'));
}
function bindCategoryControls(el,preselect){
 const redraw=()=>draw(preselect),write=async fn=>{await modify((records,sequence,rs,as,history,cats)=>{const outcome=fn(records,cats);return {items:outcome.items||records,categories:outcome.categories||cats,sequence};});redraw();};
 el.querySelector('#lagerCategoryOpen')?.addEventListener('click',()=>{categoryManagerOpen=!categoryManagerOpen;categoryEditId='';redraw();});
 el.querySelector('#lagerCategoryClose')?.addEventListener('click',()=>{categoryManagerOpen=false;categoryEditId='';redraw();});
 el.querySelector('#lagerCategoryEditCancel')?.addEventListener('click',()=>{categoryEditId='';redraw();});
 el.querySelectorAll('[data-cat-edit]').forEach(b=>b.addEventListener('click',()=>{categoryEditId=b.dataset.catEdit;redraw();}));
 el.querySelectorAll('[data-cat-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Leere Kategorie löschen?'))return;b.disabled=true;try{await write((records,cats)=>({categories:removeCategory(cats,records,b.dataset.catDelete)}));status('Kategorie gelöscht.');}catch(e){status('Kategorie: '+e.message);b.disabled=false;}}));
 const starter=CATEGORY_STARTERS.filter(s=>!categories.some(c=>!c.parentId&&c.name.toLocaleLowerCase('de-AT')===s.name.toLocaleLowerCase('de-AT')));
 el.querySelectorAll('[data-cat-starter]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{await write((records,cats)=>({categories:addCategory(cats,starter[Number(b.dataset.catStarter)],newid)}));status('Kategorie aus Vorlage angelegt.');}catch(e){status('Kategorie: '+e.message);b.disabled=false;}}));
 el.querySelector('#lagerCategoryForm')?.addEventListener('submit',async e=>{e.preventDefault();const frm=e.currentTarget,btn=frm.querySelector('[type=submit]');btn.disabled=true;const data=Object.fromEntries(new FormData(frm).entries()),editing=categoryEditId;try{await write((records,cats)=>editing?editCategory(cats,records,editing,data):{categories:addCategory(cats,data,newid)});categoryEditId='';status('Kategorie gespeichert.');}catch(err){status('Kategorie: '+err.message);btn.disabled=false;}});
 for(const [id,setter] of [['lagerFilterCategory',v=>categoryFilter=v],['lagerFilterType',v=>itemTypeFilter=v],['lagerFilterSort',v=>itemSort=v]])el.querySelector('#'+id)?.addEventListener('change',e=>{setter(e.target.value);redraw();});
 el.querySelector('#lagerFilterFav')?.addEventListener('change',e=>{favoriteFilter=e.target.checked;redraw();});
 el.querySelector('#lagerFilterTag')?.addEventListener('change',e=>{tagFilter=e.target.value;redraw();});
 el.querySelector('#lagerBulkSelectVisible')?.addEventListener('click',()=>{for(const i of currentFiltered())selectedItems.add(i.id);redraw();});
 el.querySelector('#lagerBulkClear')?.addEventListener('click',()=>{selectedItems.clear();redraw();});
 el.querySelector('#lagerBulkApply')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;const id=el.querySelector('#lagerBulkCategory').value;const ids=new Set(selectedItems);try{await write((records,cats)=>({items:bulkAssign(records,ids,id,cats)}));selectedItems.clear();redraw();status(ids.size+' Artikel zugeordnet.');}catch(err){status('Sammelzuordnung: '+err.message);e.currentTarget.disabled=false;}});
}
function bindCards(el){
 el?.querySelectorAll('[data-bulk-id]').forEach(ch=>ch.addEventListener('change',e=>{e.target.checked?selectedItems.add(ch.dataset.bulkId):selectedItems.delete(ch.dataset.bulkId);const c=document.getElementById('lagerBulkCount');if(c)c.textContent=selectedItems.size+' ausgewählt';}));
 el?.querySelectorAll('[data-favorite-toggle]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{await modify((records,sequence)=>({items:toggleFavorite(records,b.dataset.favoriteToggle),sequence}));draw();status('Favorit aktualisiert.');}catch(err){status('Favorit: '+err.message);b.disabled=false;}}));
 el?.querySelectorAll('[data-photo-item]').forEach(btn=>btn.addEventListener('click',()=>{photoType='item';photoTarget=btn.dataset.photoItem;photoOpen=true;resetPhotoSelection();draw();document.getElementById('lagerPhotoPanel')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-track-open]').forEach(btn=>btn.addEventListener('click',()=>{trackingItemId=btn.dataset.trackOpen;trackingRecordId=null;trackingOperation=null;stockItemId=null;formOpen=false;editId=null;draw();document.querySelector('.lager-tracking-panel')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-stock-open]').forEach(btn=>btn.addEventListener('click',()=>{trackingItemId=null;stockItemId=btn.dataset.stockOpen;stockKind=btn.dataset.kind;formOpen=false;editId=null;draw();document.getElementById('lagerStockForm')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-item-edit]').forEach(btn=>btn.addEventListener('click',()=>{trackingItemId=null;stockItemId=null;editId=btn.dataset.itemEdit;formOpen=true;draw();document.getElementById('lagerItemForm')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-item-delete]').forEach(btn=>btn.addEventListener('click',async()=>{
  const id=btn.dataset.itemDelete,item=items.find(i=>i.id===id);if(!item)return;
  if(!confirm(`Artikel „${item.name}“ endgültig löschen?`))return;
  btn.disabled=true;
  try{await modify((records,sequence)=>({items:deleteItem(records,id),sequence}));if(editId===id){editId=null;formOpen=false;}if(stockItemId===id)stockItemId=null;selectedItems.delete(id);draw();status('Artikel gelöscht.');}
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
  if((item?.containers||[]).some(c=>c.id===rid)){if(op==='consume')v.quantity=consumptionQuantity(item,v.quantity,v.consumeUnit);return updateContainer(records,id,rid,op,v,ids,{makeEventId:newid});}
  return updateDevice(records,id,rid,op,v,ids,{makeEventId:newid});
 });
 el.querySelectorAll('[data-pair-quick]').forEach(btn=>btn.addEventListener('click',()=>{const form=el.querySelector('#lagerTrackActionForm');if(!form)return;form.elements.namedItem('consumeUnit').value='pairs';form.elements.namedItem('quantity').value=btn.dataset.pairQuick;form.requestSubmit();}));
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
export function renderLagerartikel(){return `<div class="lager-heading"><span class="eyebrow">MEIN ALLTAG · LAGERHAUS</span><h1>Meine Artikel</h1><p>Artikel, Mengen und mehrere Lagerorte verwalten – lokal und offline.</p></div><div class="lager-actions"><a href="#/module/lagerhaus" class="lager-text-link">← Lagerbereiche</a><a class="secondary-button" href="#/lagerhaus/navigator">📍 Lager-Navigator</a></div><div class="lager-status" id="lagerItemStatus" role="status" aria-live="polite">Artikel werden geladen …</div><div id="lagerItemContent"></div>`;}
export async function mountLagerartikel(preselectRoomId=''){
 editId=null;formOpen=false;stockItemId=null;stockKind='receive';trackingItemId=null;trackingRecordId=null;trackingOperation=null;photoOpen=false;photoType='item';photoTarget='';resetPhotoSelection();query='';categoryManagerOpen=false;categoryEditId='';categoryFilter='';itemTypeFilter='';favoriteFilter=false;itemSort='name';tagFilter='';selectedItems.clear();try{await load();if(!document.getElementById('lagerItemContent'))return;
  draw(rooms.some(r=>r.id===preselectRoomId)?preselectRoomId:'');status(`${items.length} Artikel geladen · offline gespeichert.`);
 }catch(e){status('Artikel konnten nicht geladen werden: '+e.message);}
}
