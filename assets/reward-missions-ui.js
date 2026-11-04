/** BW08 mobile, accessible mission dashboard; no fictitious progress. */
import {activateMissions,claimMission,loadMissionBoard} from './reward-missions.js';
import {renderRewardEconomy,mountRewardEconomy} from './reward-economy-ui.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const filters=[['all','Alle'],['day','Heute'],['week','Woche'],['month','Monat'],['alltime','Sammlung']];
const periodLabel={day:'Heute',week:'Diese Woche',month:'Dieser Monat',all:'Dauerhaft'};
export function renderMissionCenter(){return `<section class="bw-mission-center" id="bwMissionCenter" aria-label="Missionen und Erfolge">
 <div class="bw-mission-hero"><span class="bw-mission-kicker">BW08 · MISSIONEN</span><h2>Deine Missionen</h2><p>Erledigte Aufgaben und echte Sammelfortschritte bringen dir zusätzliche Münzen und XP. Du holst dir fertige Belohnungen selbst ab.</p><div class="bw-mission-hero-stats" id="bwMissionStats" aria-live="polite">Missionen werden geladen …</div></div>
 <div id="bwMissionContent" role="region" aria-label="Missionsübersicht"><p>Missionen werden geladen …</p></div>
 <p id="bwMissionMessage" class="bw-mission-message" role="status" aria-live="polite"></p>
 <details class="bw-mission-rules"><summary>⚙ XP-Regeln, Freigaben und Belohnungsverlauf</summary>${renderRewardEconomy()}</details>
 </section>`;}
function missionRow(m){const pct=Math.round(Math.min(100,100*m.progress/m.target));return `<article class="bw-mission-card ${m.claimed?'bw-mission-claimed':''}" data-mission-id="${esc(m.id)}">
 <div class="bw-mission-top"><span class="bw-mission-symbol" aria-hidden="true">${m.icon}</span><div class="bw-mission-title"><small>${periodLabel[m.period]}</small><h3>${esc(m.title)}</h3></div><div class="bw-mission-prizes"><span>+${m.xp} ★</span><span>+${m.coins} 🪙</span></div></div>
 <p>${esc(m.description)}</p><div class="bw-mission-progress-text"><span>${m.claimed?'Belohnung abgeholt':m.complete?'Ziel erreicht':`${m.progress} von ${m.target} geschafft`}</span><strong>${m.progress}/${m.target}</strong></div>
 <div class="bw-mission-track" role="progressbar" aria-label="Fortschritt ${esc(m.title)}" aria-valuemin="0" aria-valuemax="${m.target}" aria-valuenow="${m.progress}"><span style="width:${pct}%"></span></div>
 <button type="button" class="bw-mission-claim" data-claim="${esc(m.id)}" ${m.claimable?'':'disabled'}>${m.claimed?'✓ Abgeholt':m.claimable?'Belohnung abholen':'Noch nicht erreicht'}</button>
 </article>`;}
function boardHtml(board,filter){if(!board.settings.enabled)return `<div class="bw-mission-optin"><div class="bw-mission-start-icon">🎯</div><h3>Missionen aktivieren</h3><p>Ab der Aktivierung zählen nur neue, bestätigte Raumreinigungen und echte Boosteröffnungen. Bestehende Sammelkarten zählen für Sammlerziele. Keine Gesundheitsdaten, keine rückwirkende Vergütung und keine automatische Auszahlung.</p><button type="button" data-activate-missions>Missionen jetzt starten</button></div>`;
 const shown=board.missions.filter(m=>filter==='all'||(filter==='alltime'?m.period==='all':m.period===filter));
 const badges=filters.map(([key,title])=>`<button class="${filter===key?'active':''}" type="button" data-mission-filter="${key}" aria-pressed="${filter===key}">${title}</button>`).join('');
 return `<div class="bw-mission-filter" role="group" aria-label="Missionszeitraum">${badges}</div><div class="bw-mission-grid">${shown.map(missionRow).join('')}</div><p class="bw-mission-hint">Zeiträume richten sich nach der lokalen Uhr deines Geräts (Woche ab Montag). Abholen ist nur im aktuellen Zeitraum möglich. Missionen zahlen einmalig pro Zeitraum aus. Für Putzmissionen muss die Freigabe unten aktiviert sein.</p>`;}
export async function mountMissionCenter(onChanged=()=>{}){
 const root=document.getElementById('bwMissionCenter');if(!root)return;
 const area=root.querySelector('#bwMissionContent'),stats=root.querySelector('#bwMissionStats'),message=root.querySelector('#bwMissionMessage');
 let filter='all',busy=false;
 function feedback(text,error=false){message.textContent=text;message.classList.toggle('error',error);}
 async function refresh(){const board=await loadMissionBoard();if(!root.isConnected)return;
  stats.textContent=board.settings.enabled?`${board.summary.ready} bereit zum Abholen · ${board.summary.claimed} bereits abgeholt · ${board.missions.length} Ziele`:'Noch nicht aktiviert · keine automatische Belohnung';
  area.innerHTML=boardHtml(board,filter);
 }
 area.addEventListener('click',async event=>{
  const control=event.target.closest('button');if(!control||busy)return;
  if(control.hasAttribute('data-mission-filter')){filter=control.dataset.missionFilter;try{await refresh();}catch(e){feedback(e.message,true);}return;}
  if(control.hasAttribute('data-activate-missions')){
   if(!confirm('Missionen jetzt starten? Neue bestätigte Ereignisse zählen erst AB der Aktivierung. Bereits gesammelte unterschiedliche Karten können Sammelziele erfüllen. Keine rückwirkenden Ereignis-Belohnungen.'))return;
   busy=true;control.disabled=true;
   try{await activateMissions();await refresh();feedback('✓ Missionen aktiviert. Aufgaben zählen jetzt ab diesem Zeitpunkt.');await onChanged();}
   catch(e){feedback('Aktivierung fehlgeschlagen: '+e.message,true);await refresh().catch(()=>{});}finally{busy=false;}return;
  }
  if(control.hasAttribute('data-claim')){
   const missionId=control.dataset.claim;busy=true;control.disabled=true;
   try{const result=await claimMission(missionId);await refresh();feedback(result.replayed?'✓ Diese Belohnung war bereits abgeholt.':`✓ Mission abgeschlossen! +${result.xp} XP und +${result.coins} Münzen.`);await onChanged();}
   catch(e){feedback('Keine Auszahlung: '+e.message,true);await refresh().catch(()=>{});}finally{busy=false;}
  }
 });
 try{await refresh();}catch(e){area.textContent='Missionen konnten nicht geladen werden: '+e.message;feedback(e.message,true);}
 await mountRewardEconomy(onChanged);
}
