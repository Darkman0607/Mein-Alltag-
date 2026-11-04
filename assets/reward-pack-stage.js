/** BW11-HF02 – visual pack opening, completely separate from the secure booster draw.
 * The actual five copies have ALREADY been stored atomically by openOwnedBooster.
 * Replaying, closing and demo mode NEVER draw additional cards or change the wallet.
 */
import {getActivePremiumSettings,playPremiumReveal} from './reward-premium.js';
import {safeStarterAsset} from './reward-series.js';
import {REWARD_RARITIES} from './reward-data.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rarityText={gewoehnlich:'Gewöhnlich',ungewoehnlich:'Ungewöhnlich',selten:'Selten',episch:'Episch',legendaer:'Legendär',mythisch:'Mythisch',diamant:'Diamant'};
const sampleRarities=['gewoehnlich','ungewoehnlich','selten','episch','diamant'];
const safeImage=card=>{
 const data=card?.imageData;
 return typeof data==='string'&&data.length<1150000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(data)?data:safeStarterAsset(card);
};

/** For a free demonstration: catalogue names may be shown, but NEVER any owned instances. */
export function packPreview(catalog=[]){
 const used=new Set();
 return sampleRarities.map((rarity,i)=>{
  const card=catalog.find(x=>x?.rarity===rarity&&!used.has(x.id))||catalog.find(x=>x?.id&&!used.has(x.id));
  if(card)used.add(card.id);
  return {cardId:card?.id||`preview:${i}`,name:card?.name||`Vorschaukarte ${i+1}`,rarity:card?.rarity||rarity,number:card?.number||i+1,duplicate:false};
 });
}

function drawCard(item,index,catalog){
 const rarity=REWARD_RARITIES.includes(item.rarity)?item.rarity:'gewoehnlich';
 const card=catalog.find(c=>c.id===item.cardId),picture=safeImage(card);
 return `<button type="button" class="bw-pack-draw bw11-rarity-${rarity}" data-pack-card="${index}" aria-label="Karte ${index+1} aufdecken" aria-pressed="false" style="--bw-pack-index:${index}">
 <span class="bw-pack-card-inner"><span class="bw-pack-card-back" aria-hidden="true"><span class="bw-pack-card-symbol">✦</span><small>KARTE ${index+1}</small></span>
 <span class="bw-pack-card-front"><span class="bw-pack-card-image">${picture?`<img src="${esc(picture)}" alt="" loading="lazy">`:'✧'}</span><strong>${esc(item.name)}</strong><small>${esc(rarityText[rarity])}</small></span></span></button>`;
}

/** Opening is visual only; result must come from a completed database transaction.
 * Stage is inside the route root, so route changes remove it with the view.
 */
export function showBoosterPackStage(root,result,catalog=[],{demo=false,packName='Booster'}={}){
 if(!root?.isConnected||!Array.isArray(result?.cards)||result.cards.length!==5)return null;
 root.querySelector('.bw-pack-stage')?.remove();
 const reduced=typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const prefs=getActivePremiumSettings();
 const mode=prefs.effects;
 const stage=document.createElement('section');
 stage.className='bw-pack-stage';
 stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');stage.setAttribute('aria-label','Booster-Erlebnis');
 stage.innerHTML=`<div class="bw-pack-content">
 <button type="button" class="bw-pack-exit" data-pack-close aria-label="Boosteransicht schließen">×</button>
 <header class="bw-pack-header"><span>${demo?'KOSTENLOSE VORSCHAU':'BOOSTER GEÖFFNET'}</span><h2>${esc(packName)}</h2><p>${demo?'So sieht das Öffnen aus. Es werden keine Karten vergeben und keine Münzen abgezogen.':'Fünf Karten sind bereits sicher gespeichert. Enthülle sie mit einem Fingertipp!'}</p></header>
 <div class="bw-pack-theater" aria-hidden="true"><div class="bw-pack-halo"></div><div class="bw-pack-shockwave"></div>
 <div class="bw-pack-wrapper"><div class="bw-pack-wrapper-top"><span>✦ ✦ ✦</span></div><div class="bw-pack-wrapper-front"><span class="bw-pack-mini">MEIN ALLTAG</span><span class="bw-pack-emblem">✦</span><strong>${demo?'TEST BOOSTER':'PREMIUM BOOSTER'}</strong><small>5 KARTEN</small></div></div>
 <div class="bw-pack-sparks">${Array.from({length:12},(_,i)=>`<i style="--spark:${i}"></i>`).join('')}</div></div>
 <div class="bw-pack-reveal-panel"><p class="bw-pack-instruction" aria-live="polite">✨ Dein Booster wird geöffnet …</p><div class="bw-pack-cards">${result.cards.map((x,i)=>drawCard(x,i,catalog)).join('')}</div></div>
 <nav class="bw-pack-actions" aria-label="Kartenaktionen"><button type="button" class="bw-pack-action-primary" data-pack-reveal-all>✨ Alle 5 Karten aufdecken</button><button type="button" class="bw-pack-action-secondary" data-pack-replay>↻ Effekt noch einmal ansehen</button><button type="button" class="bw-pack-action-secondary" data-pack-close>${demo?'Vorschau beenden':'Zur Booster-Übersicht'}</button></nav>
 <p class="bw-pack-footer">${demo?'Nur Animation – kein Kauf, keine Karten, keine Belohnung.':'Alle fünf Karten wurden bereits in deiner Sammlung gespeichert.'}<span>${mode==='off'?' Effekte ausgeschaltet.':mode==='reduced'?' Reduzierte Effekte.':reduced?' System-Einstellung „Bewegung reduzieren“ ist aktiv.':''}</span></p>
 </div>`;
 root.append(stage);
 const instruction=stage.querySelector('.bw-pack-instruction');
 let openTimer=null,origin=document.activeElement;
 const queueOpen=()=>{
  if(openTimer!==null)clearTimeout(openTimer);
  stage.classList.remove('is-open','bw-pack-instant');
  stage.querySelectorAll('[data-pack-card]').forEach(b=>{b.classList.remove('is-revealed');b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',`Karte ${Number(b.dataset.packCard)+1} aufdecken`);});
  instruction.textContent='✨ Dein Booster wird geöffnet …';
  if(mode==='off'||mode==='reduced'||reduced){stage.classList.add('is-open');instruction.textContent='Tippe auf eine Karte, um sie aufzudecken.';return;}
  // A visible packet enters the screen first, then bursts and fans out.
  openTimer=setTimeout(()=>{
   if(!stage.isConnected)return;
   stage.classList.add('is-open');
   instruction.textContent='🎴 Tippe auf eine Karte, um sie aufzudecken.';
  },480);
 };
 const dismiss=()=>{
  if(openTimer!==null)clearTimeout(openTimer);
  stage.remove();
  if(origin?.isConnected)origin.focus();
  else root.querySelector('#bwOpenResults,[data-shop-open],[data-pack-preview]')?.focus();
 };
 stage.addEventListener('click',event=>{
  if(event.target.closest('[data-pack-close]')){dismiss();return;}
  if(event.target.closest('[data-pack-replay]')){queueOpen();return;}
  if(event.target.closest('[data-pack-reveal-all]')){
   if(openTimer!==null)clearTimeout(openTimer);
   stage.classList.add('is-open','bw-pack-instant');
   stage.querySelectorAll('[data-pack-card]').forEach(b=>{b.classList.add('is-revealed');b.setAttribute('aria-pressed','true');b.setAttribute('aria-label',`Karte ${Number(b.dataset.packCard)+1} angezeigt`);});
   instruction.textContent=demo?'Vorschau: fünf Karten aufgedeckt.':'Alle fünf Karten aufgedeckt und gespeichert.';
   return;
  }
  const btn=event.target.closest('[data-pack-card]');
  if(!btn||!stage.classList.contains('is-open')||btn.classList.contains('is-revealed'))return;
  btn.classList.add('is-revealed');btn.setAttribute('aria-pressed','true');
  const i=Number(btn.dataset.packCard);btn.setAttribute('aria-label',`Karte ${i+1} angezeigt`);
  if(!demo)playPremiumReveal(result.cards[i]?.rarity);
  const count=stage.querySelectorAll('[data-pack-card].is-revealed').length;
  instruction.textContent=count===5?'🎉 Alle fünf Karten enthüllt!':`${count} von 5 Karten enthüllt`;
 });
 stage.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();dismiss();return;}
  if(e.key!=='Tab')return;
  const focusables=[...stage.querySelectorAll('button:not([disabled])')];
  const first=focusables[0],last=focusables[focusables.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 });
 queueOpen();stage.querySelector('.bw-pack-exit')?.focus();
 return stage;
}
