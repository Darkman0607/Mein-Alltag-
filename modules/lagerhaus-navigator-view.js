/** L14 – touch-first inventory navigator and alternative structural list view. */
import {getModuleValue} from '../assets/database.js';
import {itemLocations,filterLocations,roomTree} from './lagerhaus-navigator.js';
import {searchKey} from './lagerhaus-categories.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rooms=[],areas=[],items=[],rows=[],mode='articles',query='',roomFilter='';
const fmt=q=>String(q??0).replace('.',',');
function resultLine(row){
 const loc=row.location;
 return `<article class="lager-l14-card"><div class="lager-l14-itemhead"><span class="lager-identifier">${esc(row.itemCode)}</span><strong>${esc(row.itemName)}</strong><b>${esc(fmt(row.quantity))} ${esc(row.unit)}</b></div>
 <div class="lager-l14-path"><span aria-hidden="true">📍</span><span>${esc(loc.path)}</span></div>
 ${row.href?`<a class="lager-l14-cta" href="${esc(row.href)}" aria-label="${esc(row.itemName)} im 3D-Lager anzeigen: ${esc(loc.path)}">${loc.kind==='compartment'?'Fach':loc.kind==='furniture'?'Regal':loc.kind==='floor'?'Bodenstellplatz':'Raum'} im 3D-Lager anzeigen <span aria-hidden="true">›</span></a>`:`<p class="lager-l14-notfound">${loc.kind==='missing'?'⚠️ Lagerort nicht vorhanden – bitte Artikelzuordnung prüfen.':'Noch keinem Lagerraum zugeordnet.'}</p>`}</article>`;
}
function treeHtml(){
 const tree=roomTree(rooms,areas,items).filter(room=>!roomFilter||room.id===roomFilter);
 const found=tree.filter(r=>!query||searchKey([r.name,r.areaName,r.code,...r.furniture.flatMap(f=>[f.name,f.code,...f.compartments.flatMap(c=>[c.name,c.code])])].join(' ')).includes(searchKey(query.trim())));
 return found.length?found.map(room=>`<section class="lager-l14-room"><div class="lager-l14-treehead"><div><span class="eyebrow">${esc(room.areaName)}</span><h2>${esc(room.name)}</h2><small>${esc(room.code)} · ${room.count} Bestandspositionen</small></div><a class="lager-l14-cta" href="${esc(room.href)}">3D-Raum ›</a></div>
 ${room.furniture.length?room.furniture.map(f=>`<div class="lager-l14-furniture"><div class="lager-l14-treenode"><div><strong>▦ ${esc(f.name)}</strong><small>${esc(f.code)} · ${f.count} Positionen inklusive Fächer</small></div><a class="lager-l14-cta" href="${esc(f.href)}">3D zeigen ›</a></div>
 ${f.compartments.map(c=>`<div class="lager-l14-treenode lager-l14-subnode"><div><span>${esc(c.name)}</span><small>${esc(c.code)} · ${c.count} Positionen</small></div><a class="lager-l14-cta" href="${esc(c.href)}">Fach finden ›</a></div>`).join('')}</div>`).join(''):'<p class="lager-hint">Noch keine Regale oder Fächer in diesem Raum.</p>'}</section>`).join(''):'<p class="lager-hint">Keine passenden Lagerräume gefunden.</p>';
}
function draw(){
 const section=document.getElementById('lagerNavigatorContent');if(!section)return;
 const visible=filterLocations(rows,query,roomFilter);
 section.innerHTML=`<section class="lager-l14-panel"><div class="lager-l14-controls"><label>Artikel oder Lagerort suchen<input id="lagerNavigatorSearch" type="search" placeholder="z. B. Handschuhe, Keller, Fach F-001" autocomplete="off" value="${esc(query)}"></label><label>Raum einschränken<select id="lagerNavigatorRoom"><option value="">Alle Räume</option>${rooms.map(r=>`<option value="${esc(r.id)}" ${roomFilter===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label></div>
 <div class="lager-l14-switch" role="group" aria-label="Navigatoransicht"><button type="button" data-l14-mode="articles" class="${mode==='articles'?'is-active':''}" aria-pressed="${mode==='articles'}">📦 Artikelpositionen</button><button type="button" data-l14-mode="tree" class="${mode==='tree'?'is-active':''}" aria-pressed="${mode==='tree'}">▤ Raum-/Regalliste</button></div><p class="lager-l14-counter" id="lagerNavigatorCount" role="status">${mode==='articles'?`${visible.length} Lagerpositionen zu ${new Set(visible.map(x=>x.itemId)).size} Artikeln gefunden`:`${rooms.length} Räume · strukturierte Lagerortliste`}</p></section>
 <div id="lagerNavigatorResults">${mode==='articles'?(visible.length?visible.map(resultLine).join(''):'<p class="lager-hint">Keine passenden Lagerpositionen gefunden. Prüfe den Suchbegriff oder den Raumfilter.</p>'):treeHtml()}</div>`;
 const field=section.querySelector('#lagerNavigatorSearch');
 field.addEventListener('input',e=>{query=e.target.value;const current=filterLocations(rows,query,roomFilter);const list=section.querySelector('#lagerNavigatorResults');list.innerHTML=mode==='articles'?(current.length?current.map(resultLine).join(''):'<p class="lager-hint">Keine passenden Lagerpositionen gefunden.</p>'):treeHtml();section.querySelector('#lagerNavigatorCount').textContent=mode==='articles'?`${current.length} Lagerpositionen gefunden`:`${rooms.length} Räume · strukturierte Lagerortliste`;});
 section.querySelector('#lagerNavigatorRoom').addEventListener('change',e=>{roomFilter=e.target.value;draw();});
 section.querySelectorAll('[data-l14-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.l14Mode;draw();}));
}
export function renderLagerNavigator(){return `<div class="lager-heading"><span class="eyebrow">MEIN ALLTAG · LAGERHAUS · L14</span><h1>📍 Lager-Navigator</h1><p>Artikel finden und direkt zu ihrem Raum, Regal oder Fach springen. Alternativ alle Lagerplätze als Liste anzeigen.</p></div><nav class="lager-actions" aria-label="Lager-Navigation"><a href="#/module/lagerhaus" class="lager-text-link">← Lagerbereiche</a><a href="#/lagerhaus/items" class="secondary-button">▣ Meine Artikel</a></nav><div id="lagerNavigatorStatus" class="lager-status" role="status">Lagerpositionen werden geladen …</div><div id="lagerNavigatorContent"></div>`;}
export async function mountLagerNavigator(){
 const area=document.getElementById('lagerNavigatorContent');if(!area)return;
 mode='articles';query='';roomFilter='';
 try{
  const [loadedRooms,loadedAreas,loadedItems]=await Promise.all(['rooms.v1','areas.v1','items.v1'].map(key=>getModuleValue('lagerhaus',key)));
  if(!document.getElementById('lagerNavigatorContent'))return;
  rooms=Array.isArray(loadedRooms)?loadedRooms:[];areas=Array.isArray(loadedAreas)?loadedAreas:[];items=Array.isArray(loadedItems)?loadedItems:[];
  rows=itemLocations(items,rooms,areas);
  draw();document.getElementById('lagerNavigatorStatus').textContent=`${rows.length} Lagerpositionen geladen · nur lokal · keine Bestandsänderung`;
 }catch(e){const node=document.getElementById('lagerNavigatorStatus');if(node)node.textContent='Lager-Navigator konnte nicht geladen werden: '+e.message;}
}