/** BW03: screen for consent, adjustable rules and an auditable reward journal. */
import {loadRewardEconomy,setRewardConsent,saveRewardCleaningRule,REWARD_SOURCES} from './reward-economy.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderRewardEconomy(){return `<section class="bw-economy" id="bwEconomy" aria-label="XP und Münzen verwalten">
 <header><span class="bw-economy-kicker">BW03 · XP & MÜNZEN</span><h2>Deine Belohnungsregeln</h2><p>Belohnungen gibt es nur für bestätigte, abgeschlossene Arbeiten und nur nach deiner Freigabe. Keine Werbung und kein Echtgeld.</p></header>
 <div id="bwEcoContent" role="region" aria-label="Belohnungseinstellungen"><p>Lade Kontostand und Regeln …</p></div>
 <p id="bwEcoMessage" class="bw-eco-feedback" role="status" aria-live="polite"></p>
 </section>`;}
const fmt=iso=>{const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleString('de-AT',{dateStyle:'short',timeStyle:'short'}):'Unbekannt';};
const field=(name,label,rule,min,max)=>`<label class="bw-rule-field"><span>${esc(label)}</span><input name="${name}" type="number" inputmode="numeric" step="1" min="${min}" max="${max}" required value="${rule[name]}"></label>`;
function economyHtml(data){
 const {settings,wallet,journal}=data,rule=settings.cleaningRule,active=settings.sources.putzmanager.enabled;
 return `<div class="bw-economy-totals"><div><strong>${wallet.xp}</strong><span>★ XP</span></div><div><strong>${wallet.coins}</strong><span>🪙 Münzen</span></div><div><strong>${wallet.shards}</strong><span>💎 Splitter</span></div></div>
 <section class="bw-economy-card"><h3>1. Freigaben je App-Bereich</h3><p>Standardmäßig ist alles ausgeschaltet. Nur der Putzmanager kann in BW03 Belohnungen auslösen.</p>
 <label class="bw-eco-consent"><input type="checkbox" id="bwEnableCleaning" ${active?'checked':''}><span><strong>🧽 Putzmanager: Raumreinigung</strong><small>Nur neue Reinigungen ab Freigabe. Andere Arbeiten zählen nicht automatisch.</small></span></label>
 ${REWARD_SOURCES.filter(s=>!s.available).map(s=>`<div class="bw-eco-disabled"><span>${esc(s.label)}</span><small>${s.id==='frauengesundheit'?'Gesundheitsdaten bleiben ausdrücklich ausgeschlossen.':'Noch keine Belohnungsanbindung.'}</small></div>`).join('')}
 <p class="bw-eco-footnote">${active?`Freigabe aktiv seit ${fmt(settings.sources.putzmanager.enabledAt)}.`:'Putzmanager-Belohnungen sind deaktiviert.'} Bereits vor der Freigabe gestartete Sitzungen erhalten rückwirkend keine Belohnung.</p></section>
 <section class="bw-economy-card"><h3>2. Belohnung je Raumreinigung</h3><p>Es zählen nur Aufgaben, die im Putzmanager abgehakt und anschließend mit „Reinigung abschließen“ bestätigt wurden. Die Einstellungen gelten ab dem nächsten Abschluss.</p>
 <form id="bwCleaningRuleForm" class="bw-eco-rules">${field('xpPerTask','XP pro erledigter Aufgabe',rule,0,50)}${field('coinsPerFinish','Münzen pro Abschluss',rule,0,100)}${field('bonusCoinsPer10Min','Bonus-Münzen je 10 Minuten',rule,0,20)}${field('minMinutes','Mindestzeit in Minuten',rule,0,60)}${field('minTasks','Mindestens erledigte Aufgaben',rule,1,60)}
 <label class="bw-eco-check"><input type="checkbox" name="requireAll" ${rule.requireAll?'checked':''}><span>Nur belohnen, wenn alle Aufgaben im Raum erledigt wurden</span></label>
 <button type="submit" class="bw-eco-save">Regeln speichern</button></form><p class="bw-eco-footnote">Sicherheitslimit pro Reinigung: maximal 1.000 XP und 250 Münzen. Keine Belohnung bei abgebrochener Reinigung, ungültiger Zeit oder vor der Freigabe gestartetem Vorgang.</p></section>
 <section class="bw-economy-card"><h3>3. Belohnungsverlauf</h3><p>Jede Vergabe wird mit einer festen Ereignis-ID gespeichert. Doppelklicks können dieselbe Reinigung nicht zweimal vergüten.</p>
 ${journal.length?`<div class="bw-eco-journal">${journal.map(item=>`<div class="bw-eco-entry"><span>✓ Raumreinigung<small>${fmt(item.createdAt)} · ${item.doneCount} von ${item.totalCount} Aufgaben</small></span><b>+${item.xp} XP<br>+${item.coins} 🪙</b></div>`).join('')}</div>`:'<div class="bw-eco-empty">Noch keine Belohnung verbucht.</div>'}
 </section><p class="bw-eco-footnote">Das Konto und das Buchungsjournal sind Bestandteil deiner verschlüsselten Mein-Alltag-Gesamtsicherung. Shop, Booster, Missionen und Kartenverwertung folgen später.</p>`;
}
export async function mountRewardEconomy(onChanged=()=>{}){
 const root=document.getElementById('bwEconomy');if(!root)return;
 const area=root.querySelector('#bwEcoContent'),status=root.querySelector('#bwEcoMessage');let busy=false;
 async function refresh(){
  const data=await loadRewardEconomy();if(!root.isConnected)return;
  area.innerHTML=economyHtml(data);
 }
 function feedback(message,error=false){if(root.isConnected){status.textContent=message;status.classList.toggle('error',error);}}
 area.addEventListener('change',async e=>{
  if(e.target.id!=='bwEnableCleaning'||busy)return;
  const checkbox=e.target,enabled=checkbox.checked;
  if(enabled&&!confirm('Putzmanager mit der Belohnungswelt verbinden? Nur NEU gestartete und bestätigte Raumreinigungen können danach XP und Münzen erhalten.')){
   checkbox.checked=false;return;
  }
  busy=true;checkbox.disabled=true;feedback('Speichere Freigabe …');
  try{await setRewardConsent('putzmanager',enabled);await refresh();feedback(enabled?'✓ Putzmanager für neue Reinigungen freigegeben.':'✓ Freigabe deaktiviert. Vorhandene XP und Münzen bleiben erhalten.');await onChanged();}
  catch(err){feedback('Freigabe fehlgeschlagen: '+err.message,true);await refresh().catch(()=>{});}
  finally{busy=false;}
 });
 area.addEventListener('submit',async e=>{
  if(e.target.id!=='bwCleaningRuleForm')return;e.preventDefault();if(busy)return;
  const form=e.target;const changes={};for(const key of ['xpPerTask','coinsPerFinish','bonusCoinsPer10Min','minMinutes','minTasks'])changes[key]=Number(form.elements[key].value);
  changes.requireAll=form.elements.requireAll.checked;
  busy=true;const button=form.querySelector('button[type=submit]');button.disabled=true;feedback('Speichere Regeln …');
  try{await saveRewardCleaningRule(changes);await refresh();feedback('✓ Belohnungsregeln gespeichert.');await onChanged();}
  catch(err){feedback('Speichern fehlgeschlagen: '+err.message,true);button.disabled=false;}
  finally{busy=false;}
 });
 try{await refresh();}catch(err){area.textContent='Belohnungskonto konnte nicht geladen werden: '+err.message;feedback(err.message,true);}
}
