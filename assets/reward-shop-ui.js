import {safeStarterAsset} from './reward-series.js';
/** BW05: Booster shop and accessible opening. Purchase + opening histories are immutable. */
import {loadBoosterShop,purchaseBooster,setBoosterPrice,setShopFavorite,BOOSTER_PRESETS} from './reward-shop.js';
import {REWARD_CATEGORIES,REWARD_RARITIES,newRewardId} from './reward-data.js';
import {openOwnedBooster} from './reward-opening.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=n=>(Math.round(n*100)/100).toLocaleString('de-AT',{maximumFractionDigits:2})+' %';
const date=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString('de-AT',{dateStyle:'short',timeStyle:'short'}):'–';};
const categoryLabel=id=>REWARD_CATEGORIES.find(c=>c.id===id)?.label||id;
const labelForType=type=>type.kind==='mixed'?'Gemischt':type.kind==='theme'?'Themen-Booster':type.kind==='premium'?'Premium':'Event';
const boosterIcon=type=>type.kind==='mixed'?'🎴':type.kind==='theme'?'🃏':type.kind==='premium'?'💎':'🎉';
const rarityLabel=r=>({gewoehnlich:'Gewöhnlich',ungewoehnlich:'Ungewöhnlich',selten:'Selten',episch:'Episch',legendaer:'Legendär',mythisch:'Mythisch',diamant:'Diamant'})[r]||r;
export function renderRewardShop(mode='shop'){
 if(mode==='booster')return `<section class="bw-shop" id="bwShop" data-mode="booster" aria-label="Inventar ungeöffneter Booster"><header class="bw-shop-title"><span>BW05 · DEIN INVENTAR</span><h2>Deine Booster öffnen</h2><p>Öffne einen gekauften Booster und erhalte fünf echte Kartenexemplare. Jede Öffnung wird dauerhaft dokumentiert.</p></header><div id="bwShopContent">Lade Booster …</div><p class="bw-shop-message" id="bwShopMessage" role="status" aria-live="polite"></p></section>`;
 return `<section class="bw-shop" id="bwShop" data-mode="shop" aria-label="Booster-Shop"><header class="bw-shop-title"><span>BW05 · BOOSTER-SHOP</span><h2>Dein Karten-Shop</h2><p>Virtuelle Münzen aus deinen freigegebenen Aufgaben. Kein Echtgeld. Jedes Pack enthält fünf unabhängige Kartenziehungen.</p></header><div id="bwShopContent">Lade Booster-Shop …</div><p class="bw-shop-message" id="bwShopMessage" role="status" aria-live="polite"></p></section>`;
}
function shopSummary(data){
 return `<div class="bw-shop-balance"><div><span>🪙 Münzguthaben</span><strong>${data.wallet.coins.toLocaleString('de-AT')}</strong></div><div><span>🎁 Ungeöffnete Packs</span><strong>${data.inventory.length}</strong></div></div>`;
}
function shopFilters(){return `<div class="bw-shop-controls"><label>Booster suchen<input id="bwShopSearch" type="search" placeholder="Name oder Kategorie …" autocomplete="off" maxlength="80"/></label><div class="bw-shop-selects"><label>Shop-Kategorie<select id="bwShopCategory"><option value="all">Alle Arten</option><option value="mixed">Gemischt</option><option value="theme">Themen</option><option value="premium">Premium</option><option value="event">Event</option></select></label><label>Filter<select id="bwShopFilter"><option value="all">Alle anzeigen</option><option value="buyable">Kaufbereit</option><option value="favorites">Favoriten</option><option value="rare">Chance auf Selten oder höher</option></select></label></div></div>`;}
function probabilityRows(type){
 return `<div class="bw-shop-odds" aria-label="Theoretische Wahrscheinlichkeiten je Kartenplatz">${REWARD_RARITIES.map(key=>`<div><span>${rarityLabel(key)}</span><strong>${percent(type.odds[key])}</strong></div>`).join('')}</div>`;
}
function poolDetails(type){return `<details class="bw-shop-pool"><summary>Kartenpool ansehen (${type.pool.length} Karten)</summary>${type.pool.length?`<ul>${type.pool.map(x=>`<li><span>${esc(x.name)} <small>${esc(categoryLabel(x.categoryId))}</small></span><b>${rarityLabel(x.rarity)}</b></li>`).join('')}</ul>`:'<p>Noch keine passenden Karten angelegt.</p>'}</details>`;}
function boosterCard(type,coins,qty){
 const canBuy=type.eligible&&Number.isSafeInteger(type.priceCoins)&&coins>=type.priceCoins*qty;
 const reason=!type.eligible?type.reason:coins<type.priceCoins*qty?'Zu wenig Münzen für die gewählte Menge.':'';
 return `<article class="bw-shop-card" data-type-card="${esc(type.id)}"><div class="bw-shop-card-top"><span class="bw-shop-art" aria-hidden="true">${boosterIcon(type)}</span><div><small>${esc(labelForType(type))} · 5 Karten / Pack</small><h3>${esc(type.name)}</h3><p>${esc(type.description)}</p></div><button class="bw-shop-favorite ${type.favorite?'is-fav':''}" type="button" data-shop-fav="${esc(type.id)}" aria-label="${type.favorite?'Favorit entfernen':'Als Favorit markieren'}" aria-pressed="${type.favorite}">${type.favorite?'★':'☆'}</button></div>
 <div class="bw-shop-card-meta"><span>🪙 <strong>${type.priceCoins}</strong> / Pack</span><span>${type.pool.length} Karten im Pool</span></div>
 <details class="bw-shop-info"><summary>Ziehchancen pro Kartenplatz</summary>${probabilityRows(type)}<p>Aktive Ziehung: fünf unabhängige Karten mit Zurücklegen gemäß den beim Kauf gespeicherten Seltenheitsgewichten. Keine garantierten Raritäten.</p></details>
 ${poolDetails(type)}
 <div class="bw-shop-buy"><button class="bw-shop-buy-button" type="button" data-shop-buy="${esc(type.id)}" ${canBuy?'':'disabled'}>${canBuy?`Kaufen · ${type.priceCoins*qty} Münzen`:!type.eligible?'Noch nicht kaufbar':'Zu wenig Münzen'}</button><details class="bw-shop-price"><summary>Preis anpassen</summary><form data-shop-price="${esc(type.id)}"><label>Münzen je Pack <input type="number" inputmode="numeric" name="coins" min="1" max="500" step="1" value="${type.priceCoins}" required/></label><button type="submit">Speichern</button></form></details></div>
 ${reason?`<p class="bw-shop-reason">${esc(reason)}</p>`:''}</article>`;
}
function renderShopBody(data,filters){
 const qty=filters.qty;
 const filtered=data.types.filter(t=>{
  if(filters.category!=='all'&&t.kind!==filters.category)return false;
  if(filters.filter==='buyable'&&(!t.eligible||data.wallet.coins<t.priceCoins*qty))return false;
  if(filters.filter==='favorites'&&!t.favorite)return false;
  if(filters.filter==='rare'&&!['selten','episch','legendaer','mythisch','diamant'].some(r=>t.odds[r]>0))return false;
  const search=filters.query.trim().toLocaleLowerCase('de-AT');
  if(search&&!`${t.name} ${t.kind} ${categoryLabel(t.categoryId)}`.toLocaleLowerCase('de-AT').includes(search))return false;
  return true;
 });
 return `${shopSummary(data)}${shopFilters()}<div class="bw-shop-qty"><label>Booster pro Einkauf <select id="bwShopQuantity">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}" ${n===qty?'selected':''}>${n} ${n===1?'Booster':'Booster'}</option>`).join('')}</select></label><span>Inventarlimit: 200 ungeöffnete Booster</span></div><p class="bw-shop-warning">⚠️ Ein Booster ist nur mit mindestens fünf passenden, bereits von dir angelegten Karten kaufbar. Albumplätze allein zählen nicht. Originalmotive werden nicht automatisch erzeugt.</p><div id="bwShopGrid" class="bw-shop-grid">${filtered.length?filtered.map(t=>boosterCard(t,data.wallet.coins,qty)).join(''):'<p class="bw-shop-empty">Keine Booster für diese Filter gefunden.</p>'}</div><p class="bw-shop-disclaimer">Die Ziehchancen beschreiben das gespeicherte Rechenmodell pro Kartenplatz. Beim Öffnen werden fünf Karten nach dem beim Kauf gespeicherten Pool gezogen. Kein Echtgeld und keine garantierte Seltenheit.</p><section class="bw-shop-history"><h3>Letzte Käufe</h3>${purchaseHistory(data.purchases)}</section>`;
}
function purchaseHistory(items){return items.length?`<div>${items.map(p=>`<div class="bw-shop-history-row"><span>${date(p.createdAt)}<small>${esc(BOOSTER_PRESETS.find(x=>x.id===p.boosterTypeId)?.name||p.boosterTypeId)} · ${p.quantity} ×</small></span><b>−${p.coinsSpent} 🪙</b></div>`).join('')}</div>`:'<p class="bw-shop-empty">Noch keine Booster gekauft.</p>';}
function openingCard(item,index,data,revealed=false){
 const card=data.catalog.find(c=>c.id===item.cardId),safeImage=typeof card?.imageData==='string'&&/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(card.imageData)?card.imageData:safeStarterAsset(card);
 return `<button type="button" class="bw-open-card ${revealed?'is-revealed':''}" data-reveal-card="${index}" aria-label="Karte ${index+1} ${revealed?'anzeigen':'aufdecken'}" aria-pressed="${revealed}"><span class="bw-open-back" aria-hidden="true">✦<small>KARTE ${index+1}</small></span><span class="bw-open-front"><span class="bw-open-image">${safeImage?`<img src="${esc(safeImage)}" alt="" loading="lazy">`:'✧'}</span><strong>${esc(item.name)}</strong><small>#${String(item.number||0).padStart(3,'0')} · ${esc(rarityLabel(item.rarity))}</small>${item.duplicate?'<em>Bereits vorhanden / doppelt</em>':'<em>Neu in der Sammlung</em>'}</span></button>`;
}
function openingResults(result,data){
 return `<section class="bw-open-results" id="bwOpenResults" aria-label="Deine fünf gezogenen Karten" tabindex="-1"><div class="bw-open-results-heading"><span>✨ BW05 · ERGEBNIS</span><h3>Deine 5 neuen Karten!</h3><p>${result.replayed?'Bereits gespeicherte Öffnung':'Sicher gespeichert'} · ${date(result.openedAt)} · Jede Karte ist jetzt als Exemplar im Album vorhanden.</p></div><div class="bw-open-card-grid">${result.cards.map((x,i)=>openingCard(x,i,data)).join('')}</div><button type="button" class="bw-open-reveal-all" data-reveal-all="1">Alle 5 Karten aufdecken</button><button type="button" class="bw-open-to-album" data-go-album="1">Zum Kartenalbum</button></section>`;
}
function openingHistory(items){
 return `<section class="bw-shop-history"><h3>Öffnungsverlauf (${items.length})</h3>${items.length?items.map(item=>`<details class="bw-open-history"><summary>✦ ${date(item.createdAt)} · ${esc(BOOSTER_PRESETS.find(t=>t.id===item.boosterTypeId)?.name||'Booster')} · 5 Karten</summary><ol>${item.cards.map(card=>`<li>${esc(card.name)} · ${esc(rarityLabel(card.rarity))}${card.duplicate?' · Doppelt':''}</li>`).join('')}</ol></details>`).join(''):'<p class="bw-shop-empty">Noch kein Booster geöffnet.</p>'}</section>`;
}
function renderInventoryBody(data,lastOpening=null){
 const groups=BOOSTER_PRESETS.map(preset=>({preset,packs:data.inventory.filter(p=>p.boosterTypeId===preset.id)})).filter(x=>x.packs.length);
 return `${shopSummary(data)}${lastOpening?openingResults(lastOpening,data):''}<div class="bw-shop-inventory-head"><h3>Dein versiegeltes Inventar</h3><p>Jeder Booster öffnet genau fünf unabhängige Kartenplätze. Bereits erhaltene Karten können erneut gezogen werden.</p></div>
 ${groups.length?groups.map(({preset,packs})=>`<details class="bw-shop-inventory-group" open><summary><span aria-hidden="true">${boosterIcon(preset)}</span><strong>${esc(preset.name)}</strong><b>${packs.length} ×</b></summary><div class="bw-shop-packs">${packs.map(pack=>`<div class="bw-open-pack-row"><span>🎁 Pack #${esc(pack.id.slice(-8))}<small>Gekauft: ${date(pack.purchasedAt)} · ${pack.priceCoins} Münzen</small></span><button type="button" data-shop-open="${esc(pack.id)}" aria-label="Booster ${esc(pack.id.slice(-8))} öffnen">Jetzt öffnen ✨</button></div>`).join('')}</div></details>`).join(''):`<div class="bw-shop-empty bw-shop-inventory-empty">Keine ungeöffneten Booster vorhanden.<br><button type="button" data-go-shop="1">Zum Booster-Shop</button></div>`}
 ${openingHistory(data.openings)}<section class="bw-shop-history"><h3>Kaufverlauf</h3>${purchaseHistory(data.purchases)}</section><p class="bw-shop-disclaimer">Beim Öffnen verschwinden versiegelte Booster nur dann, wenn gleichzeitig fünf Kartenexemplare und die Journalbuchung erfolgreich gespeichert wurden. Kaufdatum, Pool und Chancen bleiben historisch dokumentiert. Auch die vollständige verschlüsselte Sicherung enthält die Ergebnisse.</p>`;
}
export async function mountRewardShop(){
 const root=document.getElementById('bwShop');if(!root)return;
 const area=root.querySelector('#bwShopContent'),message=root.querySelector('#bwShopMessage'),mode=root.dataset.mode;
 const filters={qty:1,category:'all',filter:'all',query:''};let data=null,busy=false,lastOpening=null;
 const feedback=(txt,err=false)=>{if(!root.isConnected)return;message.textContent=txt;message.classList.toggle('is-error',err);};
 async function refresh(){
  data=await loadBoosterShop();if(!root.isConnected)return;
  area.innerHTML=mode==='booster'?renderInventoryBody(data,lastOpening):renderShopBody(data,filters);
  if(mode==='shop'){area.querySelector('#bwShopSearch').value=filters.query;area.querySelector('#bwShopCategory').value=filters.category;area.querySelector('#bwShopFilter').value=filters.filter;}
 }
 function repaint(){if(!root.isConnected||!data||mode!=='shop')return;area.innerHTML=renderShopBody(data,filters);area.querySelector('#bwShopSearch').value=filters.query;area.querySelector('#bwShopCategory').value=filters.category;area.querySelector('#bwShopFilter').value=filters.filter;}
 area.addEventListener('input',e=>{if(e.target.id==='bwShopSearch'){filters.query=e.target.value;repaint();const el=area.querySelector('#bwShopSearch');el.focus();el.setSelectionRange(filters.query.length,filters.query.length);}});
 area.addEventListener('change',e=>{if(e.target.id==='bwShopCategory'){filters.category=e.target.value;repaint();}else if(e.target.id==='bwShopFilter'){filters.filter=e.target.value;repaint();}else if(e.target.id==='bwShopQuantity'){filters.qty=Number(e.target.value);repaint();}});
 area.addEventListener('click',async e=>{
  if(e.target.closest('[data-go-shop]')){location.hash='#/reward/shop';return;}
  if(e.target.closest('[data-go-album]')){location.hash='#/reward/album';return;}
  if(e.target.closest('[data-reveal-all]')){area.querySelectorAll('[data-reveal-card]').forEach(card=>{card.classList.add('is-revealed');card.setAttribute('aria-pressed','true');});return;}
  const reveal=e.target.closest('[data-reveal-card]');if(reveal){reveal.classList.add('is-revealed');reveal.setAttribute('aria-pressed','true');return;}
  if(busy)return;
  const open=e.target.closest('[data-shop-open]');if(open){
   const packId=open.dataset.shopOpen,pack=data?.inventory?.find(x=>x.id===packId);if(!pack)return;
   if(!confirm('Dieses versiegelte Pack jetzt öffnen?\nDu erhältst genau fünf zufällige Karten aus dem beim Kauf gespeicherten Kartenpool. Doppelte Karten sind möglich.'))return;
   busy=true;open.disabled=true;feedback('Sichere Kartenziehung wird gespeichert …');
   try{lastOpening=await openOwnedBooster(packId);await refresh();feedback('✓ Fünf Karten dauerhaft gespeichert. Das Ergebnis kannst du jetzt aufdecken.');area.querySelector('#bwOpenResults')?.focus();}
   catch(err){feedback('Öffnen nicht möglich: '+err.message,true);await refresh().catch(()=>{});}
   finally{busy=false;}return;
  }
  const fav=e.target.closest('[data-shop-fav]');if(fav){busy=true;try{
   const type=data.types.find(t=>t.id===fav.dataset.shopFav);if(!type)return;
   await setShopFavorite(type.id,!type.favorite);await refresh();feedback('Favorit gespeichert.');
  }catch(err){feedback(err.message,true);}finally{busy=false;}return;}
  const buy=e.target.closest('[data-shop-buy]');if(!buy)return;
  const type=data.types.find(t=>t.id===buy.dataset.shopBuy);if(!type)return;
  const price=type.priceCoins*filters.qty;
  if(!confirm(`${filters.qty} × ${type.name} für ${price} virtuelle Münzen kaufen?\nDie Packs werden ungeöffnet gespeichert. Du kannst die Packs sofort im Inventar öffnen.`))return;
  const requestId=newRewardId('purchase');busy=true;buy.disabled=true;feedback('Kauf wird sicher gebucht …');
  try{const done=await purchaseBooster(type.id,filters.qty,requestId);await refresh();feedback(`✓ ${done.quantity} ${done.quantity===1?'Booster':'Booster'} gekauft, ${done.total} Münzen abgebucht. Verbleibend: ${done.coinsAfter}. Die Packs findest du unter „Booster“.`);}
  catch(err){feedback('Kauf nicht durchgeführt: '+err.message,true);await refresh().catch(()=>{});}finally{busy=false;}
 });
 area.addEventListener('submit',async e=>{
  const form=e.target.closest('[data-shop-price]');if(!form)return;e.preventDefault();if(busy)return;
  busy=true;const id=form.dataset.shopPrice,price=Number(form.elements.coins.value);
  try{await setBoosterPrice(id,price);await refresh();feedback('✓ Preis gespeichert. Bereits gekaufte Packs bleiben unverändert.');}
  catch(err){feedback('Preis nicht gespeichert: '+err.message,true);}finally{busy=false;}
 });
 try{await refresh();}catch(err){area.textContent='Shop konnte nicht geladen werden: '+err.message;feedback(err.message,true);}
}
