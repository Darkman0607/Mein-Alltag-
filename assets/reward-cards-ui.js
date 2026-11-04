/** BW07 – instance protection, safely confirmed virtual sale / salvage / crafting. */
import {loadRewardCardManager,setCardCopyLock,tradeCardCopy,craftCardCopy,saveCardRateSettings,validateCardRates} from './reward-cards.js';
import {REWARD_RARITIES,newRewardId} from './reward-data.js';
import {loadRewardAlbum} from './reward-album.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles={gewoehnlich:'Gewöhnlich',ungewoehnlich:'Ungewöhnlich',selten:'Selten',episch:'Episch',legendaer:'Legendär',mythisch:'Mythisch',diamant:'Diamant'};
const displayDate=s=>{const d=new Date(s);return Number.isFinite(+d)?d.toLocaleString('de-AT',{dateStyle:'short',timeStyle:'short'}):'–';};
const safeArt=card=>{
 if(typeof card.imageData==='string'&&/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(card.imageData)&&card.imageData.length<=1150000)return card.imageData;
 const canonical=`./assets/card-art/${card.categoryId}/${String(card.number).padStart(3,'0')}.svg`;
 return card.imageAsset===canonical&&/^\.\/assets\/card-art\/(anime-frauen|anime-tiere|maschinen|monster)\/(?:00[1-9]|0[12][0-9])\.svg$/.test(canonical)?canonical:null;
};
export function renderRewardCards(){return `<section class="bw-cards" id="bwCards" aria-label="Kartenverwaltung und Herstellung">
 <header><span>BW07 · KARTENVERWALTUNG</span><h2>Deine Karten schützen & herstellen</h2><p>Jedes Exemplar einzeln sperren, doppelte Karten freiwillig verwerten oder virtuelle Münzen erhalten. Neue Karten werden nur mit echten Splittern hergestellt.</p></header>
 <div id="bwCardsBody" role="region" aria-label="Deine Karten"><p>Karten werden geladen …</p></div><p class="bw-cards-feedback" id="bwCardsFeedback" role="status" aria-live="polite"></p>
 </section>`;}
function groupRow(group,rates,activeOnly=false){
 const {card,instances}=group,rarity=card.rarity;
 const pic=safeArt(card);
 return `<details class="bw-cards-group" ${activeOnly?'open':''}><summary><span class="bw-cards-art">${pic?`<img src="${esc(pic)}" alt="" loading="lazy">`:'✦'}</span><span><b>${esc(card.name)}</b><small>#${String(card.number).padStart(3,'0')} · ${titles[rarity]||esc(rarity)}</small></span><strong>${instances.length} × <small>${group.locked} 🔒</small></strong></summary><div class="bw-cards-copies">
 ${instances.map(copy=>{const rarity=REWARD_RARITIES.includes(copy.rarityAtDraw)?copy.rarityAtDraw:card.rarity;return `<div class="bw-cards-copy"><span><b>${copy.locked?'🔒 Gesperrt':'🔓 Freigegeben'}</b><small>${esc(copy.id.slice(-8))} · ${displayDate(copy.obtainedAt)} · ${titles[rarity]}</small></span><div class="bw-cards-actions"><button type="button" data-card-lock="${esc(copy.id)}" aria-label="${copy.locked?'Karte entsperren':'Karte sperren'}">${copy.locked?'Entsperren':'Sperren'}</button><button type="button" data-card-sell="${esc(copy.id)}" ${copy.locked?'disabled':''}>+${rates.sellCoins[rarity]} 🪙</button><button type="button" data-card-salvage="${esc(copy.id)}" ${copy.locked?'disabled':''}>+${rates.salvageShards[rarity]} 💎</button></div></div>`;}).join('')}</div></details>`;
}
function cardRateRows(rates){return REWARD_RARITIES.map(rarity=>`<tr><th scope="row">${titles[rarity]}</th><td>${rateField('sellCoins',rarity,rates.sellCoins[rarity])}</td><td>${rateField('salvageShards',rarity,rates.salvageShards[rarity])}</td><td>${rarity==='diamant'?'Nicht herstellbar':rateField('craftShards',rarity,rates.craftShards[rarity])}</td></tr>`).join('');}
function rateField(table,rarity,value){return `<label><span class="sr-only">${titles[rarity]} ${table}</span><input data-rate="${table}:${rarity}" type="number" min="1" max="10000" step="1" value="${value}" inputmode="numeric" aria-label="${titles[rarity]} ${table}"></label>`;}
function bodyMarkup(data,favs,query='',onlyFavorites=false){
 const owned=data.groups.filter(g=>g.card.name.toLocaleLowerCase('de-AT').includes(query.toLocaleLowerCase('de-AT'))&&(!onlyFavorites||favs.has(`${g.card.categoryId}:${g.card.number}`)));
 const catalog=data.catalog.filter(card=>card.rarity!=='diamant').sort((a,b)=>a.categoryId.localeCompare(b.categoryId)||a.number-b.number);
 const rates=data.rates;
 return `<div class="bw-cards-balances"><div><strong>${data.instances.length}</strong><small>Kartenexemplare</small></div><div><strong>${data.instances.filter(x=>x.locked).length}</strong><small>🔒 Geschützt</small></div><div><strong>${data.wallet.coins}</strong><small>🪙 Münzen</small></div><div><strong>${data.wallet.shards}</strong><small>💎 Splitter</small></div></div>
 <section class="bw-cards-panel"><h3>1. Gesammelte Karten & Einzelschutz</h3><p>Gleiche Karten sind gebündelt. Tippe eine Karte an, um jedes Exemplar einzeln zu sperren, zu verkaufen oder zu verwerten. Die letzte Kopie und besonders seltene Karten benötigen eine zusätzliche Bestätigung.</p>
 <div class="bw-cards-controls"><label>Karten suchen<input id="bwCardsSearch" type="search" maxlength="80" value="${esc(query)}" placeholder="Kartenname …" /></label><label class="bw-cards-check"><input type="checkbox" id="bwCardsOnlyFav" ${onlyFavorites?'checked':''}/> Nur Albumfavoriten</label></div>
 <div class="bw-cards-list">${owned.length?owned.map(g=>groupRow(g,rates)).join(''):'<p class="bw-cards-empty">Keine gesammelten Karten für diesen Filter. Starte im Booster-Inventar oder passe die Suche an.</p>'}</div></section>
 <section class="bw-cards-panel"><h3>2. Aus Splittern herstellen</h3><p>Wähle eine bereits im Album angelegte Karte. Ihre Seltenheit bestimmt die Kosten. Ein neues Exemplar wird erst nach Bestätigung angelegt. <strong>Diamantkarten sind ausgeschlossen.</strong></p>
 <form id="bwCraftForm" class="bw-cards-form"><label>Karte auswählen<select name="card" required><option value="">Bitte Karte wählen</option>${catalog.map(card=>`<option value="${esc(card.id)}">${esc(card.name)} (#${String(card.number).padStart(3,'0')}) · ${titles[card.rarity]} · ${rates.craftShards[card.rarity]} Splitter</option>`).join('')}</select></label><button type="submit" ${catalog.length?'':'disabled'}>Eine Karte herstellen</button></form>${catalog.length?'':'<p>Lege zuerst Katalogkarten im Album an bzw. importiere die Startserie.</p>'}</section>
 <details class="bw-cards-panel bw-cards-rates"><summary><strong>3. Virtuelle Preisregeln anpassen</strong></summary><p>Startwerte sind Vorschläge für das private Spiel – keine Marktpreise. Herstellung muss mehr Splitter kosten, als dieselbe Karte bei der Verwertung ergibt. Änderungen gelten für künftige Buchungen.</p><form id="bwRatesForm"><div class="bw-cards-table-wrap"><table><thead><tr><th>Seltenheit</th><th>Verkauf 🪙</th><th>Verwertung 💎</th><th>Herstellung 💎</th></tr></thead><tbody>${cardRateRows(rates)}</tbody></table></div><button type="submit">Preise speichern</button></form></details>
 <section class="bw-cards-panel"><h3>4. Karten-Journal</h3>${data.history.length?`<ol class="bw-cards-history">${data.history.map(x=>`<li><span>${x.type==='card-craft'?'⚒ Hergestellt':x.type==='card-sell'?'🪙 Verkauft':'💎 Verwertet'}: ${esc(x.cardName||x.cardId)}<small>${displayDate(x.createdAt)}</small></span><b>${x.type==='card-sell'?`+${x.coins} 🪙`:x.type==='card-craft'?`−${x.shardsSpent} 💎`:`+${x.shards} 💎`}</b></li>`).join('')}</ol>`:'<p>Keine Kartenbuchung vorhanden.</p>'}</section>
 <p class="bw-cards-warning">⚠️ Verkauf und Splitterverwertung sind endgültig: Die gewählte Kopie wird entfernt, dafür wird virtuelles Guthaben gebucht. Es gibt keinen Echtgeldhandel und keinen Kartentausch mit anderen Nutzern. Vorher ein App-Backup anlegen.</p>`;
}
export async function mountRewardCards(onChange=()=>{}){
 const root=document.getElementById('bwCards');if(!root)return;
 const area=root.querySelector('#bwCardsBody'),status=root.querySelector('#bwCardsFeedback');let data=null,favorites=new Set(),busy=false,query='',onlyFavorites=false;
 const say=(s,error=false)=>{if(root.isConnected){status.textContent=s;status.classList.toggle('is-error',error);}};
 async function refresh(){const [manager,album]=await Promise.all([loadRewardCardManager(),loadRewardAlbum()]);if(!root.isConnected)return;
  data=manager;favorites=new Set(album.slots.filter(s=>s.favorite).map(s=>s.id));area.innerHTML=bodyMarkup(data,favorites,query,onlyFavorites);}
 area.addEventListener('input',e=>{if(e.target.id==='bwCardsSearch'&&data){query=e.target.value;area.innerHTML=bodyMarkup(data,favorites,query,onlyFavorites);const search=area.querySelector('#bwCardsSearch');search.focus();search.setSelectionRange(query.length,query.length);}});
 area.addEventListener('change',e=>{if(e.target.id==='bwCardsOnlyFav'&&data){onlyFavorites=e.target.checked;area.innerHTML=bodyMarkup(data,favorites,query,onlyFavorites);}});
 area.addEventListener('click',async e=>{
  const lock=e.target.closest('[data-card-lock]'),sell=e.target.closest('[data-card-sell]'),salvage=e.target.closest('[data-card-salvage]');if(!lock&&!sell&&!salvage||busy||!data)return;
  const copyId=(lock||sell||salvage).dataset[lock?'cardLock':sell?'cardSell':'cardSalvage'];
  const copy=data.instances.find(x=>x.id===copyId);if(!copy){say('Karte inzwischen nicht mehr vorhanden.',true);return;}
  busy=true;
  try{
   if(lock){await setCardCopyLock(copyId,!copy.locked);say(copy.locked?'✓ Exemplar entsperrt.':'✓ Exemplar geschützt.');}
   else{
    const kind=sell?'sell':'salvage',group=data.groups.find(g=>g.card.id===copy.cardId),rarity=REWARD_RARITIES.includes(copy.rarityAtDraw)?copy.rarityAtDraw:group?.card.rarity;
    if(!group)throw Error('Kartendaten fehlen.');
    const payout=kind==='sell'?`${data.rates.sellCoins[rarity]} Münzen`:`${data.rates.salvageShards[rarity]} Splitter`;
    if(!confirm(`Dieses Exemplar von „${group.card.name}“ dauerhaft ${kind==='sell'?'verkaufen':'verwerten'}?\nDu bekommst ${payout}. Die Karte wird aus deinem Besitz entfernt.`))return;
    const last=group.total===1,rare=['legendaer','mythisch','diamant'].includes(rarity);
    if((last||rare)&&!confirm(`${last?'ACHTUNG: Dies ist dein LETZTES Exemplar. ':''}${rare?'Die Karte ist besonders selten. ':''}Wirklich endgültig entfernen?`))return;
    const result=await tradeCardCopy({copyId,kind,requestId:newRewardId('cardtrade'),allowLastCopy:last,allowRare:rare});
    say(result.replayed?'Vorgang bereits gespeichert.':`✓ ${payout} gebucht. Ein Exemplar entfernt.`);
   }
   await refresh();await onChange();
  }catch(err){say('Nicht durchgeführt: '+err.message,true);await refresh().catch(()=>{});}finally{busy=false;}
 });
 area.addEventListener('submit',async e=>{
  const craft=e.target.closest('#bwCraftForm'),rates=e.target.closest('#bwRatesForm');if(!craft&&!rates)return;e.preventDefault();if(busy)return;
  busy=true;try{
   if(craft){const cardId=craft.elements.card.value,card=data.catalog.find(x=>x.id===cardId);
    if(!card)throw Error('Karte auswählen.');const price=data.rates.craftShards[card.rarity];
    if(!confirm(`„${card.name}“ einmal für ${price} Splitter herstellen?`))return;
    const result=await craftCardCopy({cardId,requestId:newRewardId('cardcraft')});say(result.replayed?'Bereits hergestellt.':`✓ „${card.name}“ hergestellt und ${price} Splitter abgezogen.`);
   }else{
    const changed=[];for(const input of rates.querySelectorAll('[data-rate]')){
     const [table,rarity]=input.dataset.rate.split(':'),value=Number(input.value);
     if(!Number.isSafeInteger(value)||value<1||value>10000)throw Error('Preise zwischen 1 und 10.000 eingeben.');
     if(data.rates[table][rarity]!==value)changed.push({table,rarity,value});
    }
    // Preflight all constraints; no partial price-table modifications on invalid input.
    const proposed=structuredClone(data.rates);for(const change of changed)proposed[change.table][change.rarity]=change.value;
    validateCardRates(proposed);if(changed.length)await saveCardRateSettings(proposed);
    say(changed.length?`✓ ${changed.length} Preisänderungen gespeichert.`:'Keine Änderung.');
   }
   await refresh();await onChange();
  }catch(err){say('Nicht gespeichert: '+err.message,true);await refresh().catch(()=>{});}finally{busy=false;}
 });
 try{await refresh();}catch(err){area.textContent='Kartenverwaltung nicht verfügbar: '+err.message;say(err.message,true);}
}
