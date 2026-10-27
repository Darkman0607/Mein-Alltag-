/** L05–L07 – touch-oriented cards, quick entry, templates and dynamic properties. */
import {getModuleValue,mutateModuleValues} from '../assets/database.js';
import {ITEM_KEY,ITEM_SEQ_KEY,ITEM_TYPES,ITEM_CONDITIONS,ITEM_UNITS,locationChoices,resolveItemLocation,upsertItem,deleteItem} from './lagerhaus-items.js';
import {templatesFor,propertiesFor,templateById,detailedProperties} from './lagerhaus-templates.js';
import {MOVEMENT_KEY,STOCK_ACTIONS,stockPositions,stockTotal,stockAlert,bookStock} from './lagerhaus-stock.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newid=()=>globalThis.crypto?.randomUUID?.()||`item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let items=[],rooms=[],areas=[],editId=null,formOpen=false,query='',operation=Promise.resolve(),stockItemId=null,stockKind='receive',stockEvents=[];
const option=(value,label,current)=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;
function choices(map,current){return Object.entries(map).map(([v,l])=>option(v,l,current)).join('');}
function locationSelect(current){return locationChoices(rooms,areas).map(c=>option(c.id,c.label,current)).join('');}
function status(message){const el=document.getElementById('lagerItemStatus');if(el)el.textContent=message;}
async function load(){
 const [is,rs,as,events]=await Promise.all([getModuleValue('lagerhaus',ITEM_KEY),getModuleValue('lagerhaus','rooms.v1'),getModuleValue('lagerhaus','areas.v1'),getModuleValue('lagerhaus',MOVEMENT_KEY)]);
 items=Array.isArray(is)?is:[];rooms=Array.isArray(rs)?rs:[];areas=Array.isArray(as)?as:[];stockEvents=Array.isArray(events)?events:[];
}
async function modify(fn){
 const task=operation.catch(()=>{}).then(async()=>{
  let saved;
  await mutateModuleValues('lagerhaus',[ITEM_KEY,ITEM_SEQ_KEY,'rooms.v1','areas.v1',MOVEMENT_KEY],values=>{
   const current=Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[];
   const seq=Number(values[ITEM_SEQ_KEY])||0;
   const freshRooms=Array.isArray(values['rooms.v1'])?values['rooms.v1']:[];
   const freshAreas=Array.isArray(values['areas.v1'])?values['areas.v1']:[];
   const history=Array.isArray(values[MOVEMENT_KEY])?values[MOVEMENT_KEY]:[];
   const outcome=fn(current,seq,freshRooms,freshAreas,history);
   saved={...outcome,rooms:freshRooms,areas:freshAreas};
   return [[ITEM_KEY,outcome.items],[ITEM_SEQ_KEY,outcome.sequence],...(outcome.movements?[[MOVEMENT_KEY,outcome.movements]]:[])];
  });
  items=saved.items;rooms=saved.rooms;areas=saved.areas;
  if(saved.movements)stockEvents=saved.movements;
 });
 operation=task;return task;
}
function stockQuantity(value){return String(value??0).replace('.',',');}
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
 <div class="lager-photo-placeholder" aria-label="Fotofunktion für späteres Update vorgesehen">▧ <span>Artikelfoto – Platzhalter. Kamera und Galerie folgen mit L10.</span></div>
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
 return `<article class="lager-item-card"><div class="lager-item-card-top"><span class="lager-identifier">${esc(item.code)}</span><span class="lager-item-type">${esc(ITEM_TYPES[item.type]||'Sonstiges')}</span></div>
 <h3>${esc(item.name)}</h3><p class="lager-item-path">⌖ ${stockPositions(item).length>1?'Mehrere Lagerorte':esc(loc.label)}</p>
 <div class="lager-item-facts"><span><strong>${esc(stockQuantity(stock.total))}</strong> ${esc(ITEM_UNITS[item.unit]||item.unit)}</span><span>Packung: ${esc(stockQuantity(item.packSize??1))}</span><span>${esc(item.category||'Allgemein')}</span><span>${esc(ITEM_CONDITIONS[item.condition]||'Gut')}</span></div>
 ${stock.low?`<p class="lager-stock-warning">⚠ Mindestbestand erreicht (${esc(stockQuantity(stock.minimumStock))} ${esc(ITEM_UNITS[item.unit]||item.unit)})</p>`:''}
 ${positionsHtml(item)}
 ${(item.brand||item.articleNumber)?`<p class="lager-item-extra">${esc([item.brand,item.articleNumber].filter(Boolean).join(' · '))}</p>`:''}${props.length?`<dl class="lager-item-properties-list">${props.map(p=>`<div><dt>${esc(p.label)}</dt><dd>${esc(p.value)}</dd></div>`).join('')}</dl>`:''}${item.note?`<p class="lager-item-note">${esc(item.note)}</p>`:''}
 <div class="lager-stock-actions"><button type="button" class="secondary-button" data-stock-open="${esc(item.id)}" data-kind="receive">+ Einlagern</button><button type="button" class="secondary-button" data-stock-open="${esc(item.id)}" data-kind="issue" ${stock.empty?'disabled':''}>− Entnehmen</button><button type="button" class="secondary-button" data-stock-open="${esc(item.id)}" data-kind="transfer" ${stock.empty?'disabled':''}>↔ Umlagern</button></div>
 <div class="lager-item-actions"><button type="button" class="secondary-button" data-item-edit="${esc(item.id)}">Bearbeiten</button><button type="button" class="secondary-button lager-delete" data-item-delete="${esc(item.id)}">Löschen</button></div></article>`;
}
function draw(preselect=''){
 const el=document.getElementById('lagerItemContent');if(!el)return;
 const filtered=items.filter(i=>[i.name,i.code,i.category,i.brand,i.articleNumber,i.note,...Object.values(i.properties||{})].join(' ').toLocaleLowerCase('de-AT').includes(query.toLocaleLowerCase('de-AT')));
 const selected=items.find(i=>i.id===editId);
 const stockSelected=items.find(i=>i.id===stockItemId);
 const lowCount=items.filter(i=>stockAlert(i).low).length;
 el.innerHTML=`<div class="lager-item-head"><div><strong>${items.length}</strong> Artikel gespeichert · <strong>${lowCount}</strong> Mindestbestand-Warnungen</div><button type="button" id="lagerItemAdd" class="primary-button">+ Artikel</button></div>
 ${formOpen?form(selected,preselect):''}
 ${stockSelected?stockPanel(stockSelected):''}
 <label class="lager-item-search-label" for="lagerItemSearch">Artikel durchsuchen</label><input id="lagerItemSearch" class="lager-item-search" type="search" placeholder="Name, Nummer, Marke, Kategorie …" value="${esc(query)}">
 <div id="lagerItemList">${filtered.length?filtered.map(card).join(''):'<p class="lager-hint">Keine Artikel vorhanden oder keine Treffer. Mit „+ Artikel“ kannst du deinen ersten Gegenstand erfassen.</p>'}</div>`;
 el.querySelector('#lagerItemAdd').addEventListener('click',()=>{stockItemId=null;editId=null;formOpen=true;draw(preselect);el.querySelector('[name="name"]')?.focus();});
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
 el.querySelector('#lagerItemSearch').addEventListener('input',event=>{
  query=event.target.value;const list=el.querySelector('#lagerItemList');
  const current=items.filter(i=>[i.name,i.code,i.category,i.brand,i.articleNumber,i.note,...Object.values(i.properties||{})].join(' ').toLocaleLowerCase('de-AT').includes(query.toLocaleLowerCase('de-AT')));
  list.innerHTML=current.length?current.map(card).join(''):'<p class="lager-hint">Keine passenden Artikel gefunden.</p>';
  bindCards(list);
 });
 bindCards(el.querySelector('#lagerItemList'));
}
function bindCards(el){
 el?.querySelectorAll('[data-stock-open]').forEach(btn=>btn.addEventListener('click',()=>{stockItemId=btn.dataset.stockOpen;stockKind=btn.dataset.kind;formOpen=false;editId=null;draw();document.getElementById('lagerStockForm')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-item-edit]').forEach(btn=>btn.addEventListener('click',()=>{stockItemId=null;editId=btn.dataset.itemEdit;formOpen=true;draw();document.getElementById('lagerItemForm')?.scrollIntoView({block:'start',behavior:'smooth'});}));
 el?.querySelectorAll('[data-item-delete]').forEach(btn=>btn.addEventListener('click',async()=>{
  const id=btn.dataset.itemDelete,item=items.find(i=>i.id===id);if(!item)return;
  if(!confirm(`Artikel „${item.name}“ endgültig löschen?`))return;
  btn.disabled=true;
  try{await modify((records,sequence)=>({items:deleteItem(records,id),sequence}));if(editId===id){editId=null;formOpen=false;}if(stockItemId===id)stockItemId=null;draw();status('Artikel gelöscht.');}
  catch(e){status('Löschen fehlgeschlagen: '+e.message);btn.disabled=false;}
 }));
}
export function renderLagerartikel(){return `<div class="lager-heading"><span class="eyebrow">MEIN ALLTAG · LAGERHAUS</span><h1>Meine Artikel</h1><p>Artikel, Mengen und mehrere Lagerorte verwalten – lokal und offline.</p></div><div class="lager-actions"><a href="#/module/lagerhaus" class="lager-text-link">← Lagerbereiche</a></div><div class="lager-status" id="lagerItemStatus" role="status" aria-live="polite">Artikel werden geladen …</div><div id="lagerItemContent"></div>`;}
export async function mountLagerartikel(preselectRoomId=''){
 editId=null;formOpen=false;stockItemId=null;stockKind='receive';query='';try{await load();if(!document.getElementById('lagerItemContent'))return;
  draw(rooms.some(r=>r.id===preselectRoomId)?preselectRoomId:'');status(`${items.length} Artikel geladen · offline gespeichert.`);
 }catch(e){status('Artikel konnten nicht geladen werden: '+e.message);}
}
