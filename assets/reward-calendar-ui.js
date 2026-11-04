/** BW09 – accessible month grid, explicit claims, no automated gifts or artificial activity. */
import {activateRewardCalendar,claimRewardCalendar,loadRewardCalendar} from './reward-calendar.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const months=new Intl.DateTimeFormat('de-AT',{month:'long',year:'numeric'});
const dayLabel=new Intl.DateTimeFormat('de-AT',{day:'numeric',month:'long',year:'numeric'});
function moveMonth(d,delta){return new Date(d.getFullYear(),d.getMonth()+delta,1);}
function grid(board,month,selected){
 const first=new Date(month.getFullYear(),month.getMonth(),1),offset=(first.getDay()+6)%7;
 const start=new Date(first.getFullYear(),first.getMonth(),1-offset);
 const history=new Set(board.claimedDays);
 const cells=Array.from({length:42},(_,i)=>{const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),key=dateKey(d),current=d.getMonth()===first.getMonth(),gift=history.has(key),today=key===board.today;
 return `<button type="button" class="bw09-day ${current?'':'bw09-other'} ${gift?'bw09-received':''} ${today?'bw09-today':''} ${key===selected?'bw09-selected':''}" data-bw09-day="${key}" aria-label="${esc(dayLabel.format(d))}${gift?', Geschenk abgeholt':''}${today?', heute':''}" aria-pressed="${key===selected}"><span>${d.getDate()}</span><small>${gift?'✓':today?'•':''}</small></button>`;});
 return `<div class="bw09-monthbar"><button type="button" data-bw09-month="-1" aria-label="Vorheriger Monat">‹</button><h3>${esc(months.format(month))}</h3><button type="button" data-bw09-month="1" aria-label="Nächster Monat">›</button></div><div class="bw09-days" role="group" aria-label="Belohnungskalender"><div class="bw09-weekhead">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<span>${x}</span>`).join('')}</div><div class="bw09-daygrid">${cells.join('')}</div></div>`;
}
function giftCard(kind,title,emoji,desc,prize,ready,claimed,progress){
 return `<article class="bw09-prize"><div class="bw09-prize-top"><span aria-hidden="true" class="bw09-emoji">${emoji}</span><div><h3>${title}</h3><p>${desc}</p></div></div><div class="bw09-prize-bottom"><span class="bw09-payout">+${prize.xp} XP · +${prize.coins} 🪙</span><button type="button" data-bw09-claim="${kind}" ${ready?'':'disabled'}>${claimed?'✓ Abgeholt':ready?'Jetzt abholen':progress??'Noch nicht verfügbar'}</button></div></article>`;
}
function content(board,month,selected){
 if(!board.settings.enabled)return `<div class="bw09-intro"><span class="bw09-big" aria-hidden="true">🎁</span><h3>Deinen Belohnungskalender starten</h3><p>Jeden Tag ein kleines Geschenk, zusätzliche Prämien für echte Putzaufgaben und Meilensteine für regelmäßig abgeholte Geschenke. Keine automatische Auszahlung und keine Strafe, wenn du Tage auslässt.</p><button type="button" data-bw09-enable>Belohnungskalender aktivieren</button><small>Es zählen nur künftig bestätigte Aufgaben aus dem freigegebenen Putzmanager. Gesundheitsdaten werden nicht ausgewertet.</small></div>`;
 const selectedDate=new Date(Number(selected.slice(0,4)),Number(selected.slice(5,7))-1,Number(selected.slice(8,10))),historical=new Set(board.claimedDays).has(selected);
 const selectedText=selected===board.today?(historical?'Das heutige Geschenk ist bereits abgeholt.':'Heute kannst du dein Geschenk abholen.'):historical?'Für diesen Tag wurde ein Geschenk abgeholt.':selected<board.today?'An diesem Tag wurde kein Geschenk abgeholt. Es gibt keine Strafe und keine rückwirkende Auszahlung.':'Dieser Tag liegt in der Zukunft – Geschenke werden erst am jeweiligen Tag verfügbar.';
 const daily=giftCard('daily','Dein Tagesgeschenk','🎁','Einmal pro Kalendertag. Du entscheidest, ob du es abholst.',board.gift,board.gift.ready,board.gift.claimed);
 const tasks=giftCard('tasks','Aktivitätsbonus','🧽','Fünf tatsächlich bestätigte Putzaufgaben seit Aktivierung, heute.',board.taskBonus,board.taskBonus.ready,board.taskBonus.claimed,`${board.taskBonus.progress}/${board.taskBonus.target} Aufgaben`);
 const milestones=board.milestones.map(m=>`<article class="bw09-milestone"><div><strong>${m.days} Tage · ${m.label}</strong><small>${m.claimed?'✓ Abgeholt':`${m.progress}/${m.days} Geschenktage`} · +${m.xp} XP · +${m.coins} 🪙</small><div class="bw09-track" role="progressbar" aria-label="${m.label}" aria-valuemin="0" aria-valuemax="${m.days}" aria-valuenow="${m.progress}"><span style="width:${100*m.progress/m.days}%"></span></div></div><button type="button" data-bw09-milestone="${m.days}" ${m.ready?'':'disabled'}>${m.claimed?'✓ Erledigt':m.ready?'Abholen':'Gesperrt'}</button></article>`).join('');
 return `<div class="bw09-status">🎁 <strong>${board.totalGiftDays}</strong> Geschenktage gesammelt · <strong>${board.readyCount}</strong> Prämien bereit</div>${grid(board,month,selected)}<p class="bw09-selected-note">${esc(dayLabel.format(selectedDate))}: ${esc(selectedText)}</p><div class="bw09-claimgrid">${daily}${tasks}</div><section class="bw09-milestones"><h3>🏆 Deine Meilensteine</h3><p>Es zählt die Gesamtzahl verschiedener Tage, an denen du ein Tagesgeschenk abgeholt hast. Pausentage löschen nichts.</p>${milestones}</section><p class="bw09-smallprint">Nur lokale Kalenderzeit deines Geräts. Rückwirkendes Abholen ist ausgeschlossen. Die App verwendet keine überprüfbare Serverzeit. Aktiviere Putzmanager-Prämien in den Missionsregeln, damit bestätigte Reinigungen zählen.</p>`;
}
export function renderRewardCalendar(){return `<section id="bw09Calendar" class="bw09-calendar" aria-label="Belohnungskalender"><header class="bw09-hero"><span class="bw09-kicker">BW09 · BELOHNUNGSKALENDER</span><h2>Jeder Tag zählt 🎁</h2><p>Geschenke, Aktivitätsboni und dauerhafte Meilensteine – ohne Druck, ohne verpasste-Tage-Strafe.</p></header><div id="bw09Body" aria-live="off">Kalender wird geladen …</div><p class="bw09-feedback" id="bw09Feedback" role="status" aria-live="polite"></p></section>`;}
export async function mountRewardCalendar(onChanged=()=>{}){
 const root=document.getElementById('bw09Calendar');if(!root)return;
 const body=root.querySelector('#bw09Body'),feedback=root.querySelector('#bw09Feedback');
 let month=new Date(),selected=dateKey(month),busy=false;
 month=new Date(month.getFullYear(),month.getMonth(),1);
 const tell=(text,error=false)=>{feedback.textContent=text;feedback.classList.toggle('error',error);};
 async function refresh(){const board=await loadRewardCalendar();if(root.isConnected)body.innerHTML=content(board,month,selected);}
 body.addEventListener('click',async event=>{
  const target=event.target.closest('button');if(!target||busy)return;
  if(target.hasAttribute('data-bw09-month')){month=moveMonth(month,Number(target.dataset.bw09Month));selected=dateKey(month);try{await refresh();}catch(e){tell(e.message,true);}return;}
  if(target.hasAttribute('data-bw09-day')){selected=target.dataset.bw09Day;try{await refresh();}catch(e){tell(e.message,true);}return;}
  if(target.hasAttribute('data-bw09-enable')){
   if(!confirm('Belohnungskalender aktivieren? Ab heute kannst du täglich ein Geschenk abholen. Aufgabenboni zählen nur neue, verifizierte Putzaufgaben. Es gibt keine automatische Auszahlung.'))return;
   busy=true;target.disabled=true;
   try{await activateRewardCalendar();await refresh();tell('✓ Kalender aktiviert. Dein erstes Tagesgeschenk wartet auf dich.');}
   catch(e){tell('Aktivierung fehlgeschlagen: '+e.message,true);await refresh().catch(()=>{});}finally{busy=false;}return;
  }
  const type=target.dataset.bw09Claim;
  const days=target.dataset.bw09Milestone;
  if(!type&&!days)return;
  busy=true;target.disabled=true;
  try{
   const result=await claimRewardCalendar(days?'milestone':type,days?Number(days):null);
   await refresh();tell(result.replayed?'✓ Diese Prämie wurde bereits abgeholt.':`✓ Prämie erhalten: +${result.xp} XP und +${result.coins} Münzen.`);
   await onChanged();
  }catch(e){tell('Keine Auszahlung: '+e.message,true);await refresh().catch(()=>{});}finally{busy=false;}
 });
 try{await refresh();}catch(e){body.textContent='Belohnungskalender nicht verfügbar: '+e.message;tell(e.message,true);}
}
