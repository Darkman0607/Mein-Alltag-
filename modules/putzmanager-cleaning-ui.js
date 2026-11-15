/** P03 – one-tap cleaning checklist without the 3D interface. */
import {getModuleValue} from '../assets/database.js';
import {groupStatus,loadSchedule,saveSchedule,intervalLabel} from './putzmanager-schedule.js';
import {ITEM_KEY} from './lagerhaus-items.js';
import {quantityLabel} from './lagerhaus-consumption.js';
import {roomTaskGroups,taskCount,QUICK_OPTIONS,defaultQuickTypes,loadQuickTypes,saveQuickTypes,quickMaterialChoices,remainingMaterial,loadCleaningState,loadMaterialPresets,saveMaterialPreset,clearMaterialPreset,sessionElapsed,duration,materialSources,startCleaning,setTimer,setTaskDone,setGroupDone,addMaterial,removeMaterial,cancelCleaning,finishCleaning} from './putzmanager-cleaning.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=n=>String(Number(n)).replace('.',',');
function tasksHtml(groups,done,enabled,expandedGroups,history,roomId,roomSchedules){
 const completed=new Set(done||[]);
 return groups.map(group=>{
  const count=group.steps.filter(step=>completed.has(step.id)).length;
  const ready=count===group.steps.length;
  const status=groupStatus(history,roomId,group,roomSchedules?.[group.id]);
  const id=esc(group.id),name=esc(group.name);
  const statusText=enabled?(ready?'✓ Jetzt fertig':count?`${count}/${group.steps.length} Schritte`:'Noch offen'):status.state==='done'?'✓ Nicht fällig':status.state==='overdue'?'● Überfällig':status.state==='optional'?'Bei Bedarf':'● Fällig';
  const desc=enabled?'Diese Reinigung läuft':status.label;
  const options=[['daily','Täglich'],['days:2','Alle 2 Tage'],['days:3','Alle 3 Tage'],['weekly','Wöchentlich'],['days:14','Alle 14 Tage'],['monthly','Monatlich'],['off','Nur bei Bedarf'],['custom','Eigene Tagezahl']];
  const chosen=status.interval.kind==='days'?( [2,3,14].includes(status.interval.every)?`days:${status.interval.every}`:'custom'):status.interval.kind;
  const select=`<details class="pm-schedule-setting"><summary>⚙ Rhythmus: ${esc(intervalLabel(status.interval))}</summary><label>Wie oft reinigen?<select data-clean-interval="${id}" aria-label="Rhythmus für ${name}">${options.map(([v,t])=>`<option value="${v}" ${chosen===v?'selected':''}>${t}</option>`).join('')}</select></label><div class="pm-custom-schedule"><label>Eigener Abstand in Tagen<input type="number" inputmode="numeric" min="1" max="365" data-clean-days="${id}" value="${status.interval.kind==='days'?status.interval.every:7}"></label><button type="button" data-clean-action="save-days" data-group-id="${id}">Speichern</button></div></details>`;
  const control=`<label class="pm-clean-area"><input type="checkbox" data-clean-area="${id}" ${ready?'checked':''} ${enabled?'':'disabled'}><span class="pm-clean-area-label">${name}<em>${esc(desc)}</em></span><small class="pm-state-${status.state}">${statusText}</small></label>`;
  const steps=group.steps.map(step=>`<label class="pm-clean-task ${completed.has(step.id)?'pm-clean-done':''}"><input type="checkbox" data-clean-task="${esc(step.id)}" ${completed.has(step.id)?'checked':''} ${enabled?'':'disabled'}><span>${esc(step.title)}</span></label>`).join('');
  return `<div class="pm-clean-group ${ready&&enabled?'pm-area-done':''}">${control}${select}<details data-clean-group="${id}" ${expandedGroups.has(group.id)?'open':''}><summary class="pm-area-details">Einzelschritte ${count}/${group.steps.length} anzeigen</summary><div class="pm-clean-task-list">${steps}</div></details></div>`;
 }).join('');
}

const summarizeLine=line=>`${line.itemName}: ${quantityLabel({name:line.itemName,unit:line.unit,type:'verbrauch',pairCounting:line.pairCounting||'auto'},line.quantity)}`;
const receiptLine=line=>`${summarizeLine(line)}${Number.isFinite(line.balanceAfter)?' · Danach: '+quantityLabel({name:line.itemName,unit:line.unit,type:'verbrauch',pairCounting:line.pairCounting||'auto'},line.balanceAfter):''}`;
function quickListHtml(room,selected){
 const options=QUICK_OPTIONS[room.type];if(!options)return '';
 return `<details class="pm-quick-list" data-clean-quick-details><summary>⚡ Schnellliste anpassen <small>(${selected.length} Vorlagen ausgewählt)</small></summary>
 <p>Wähle, welche Bereiche zu deiner Reinigung gehören. Deine Auswahl gilt für den nächsten Start. Bereits eingetragene zusätzliche Bereiche bleiben bestehen.</p>
 <div class="pm-quick-grid">${options.map(([type,label])=>`<label class="pm-quick-choice"><input type="checkbox" data-clean-quick="${esc(type)}" ${selected.includes(type)?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div></details>`;
}
function materialHtml(active,sources,preset){
 const fast=quickMaterialChoices(sources,active.materials);
 return `<div class="pm-clean-material" id="pmMaterials"><div class="pm-material-top"><h3>📦 Material-Schnellauswahl</h3><span>${active.materials.length} vorgemerkt</span></div>
 <p>Ein Tipp merkt die angezeigte Menge vor. <strong>Abgebucht wird erst nach bestätigtem Abschluss.</strong></p>
 ${fast.length?`<div class="pm-material-fast">${fast.map(x=>`<button type="button" class="pm-material-shortcut" data-clean-action="quick-material" data-source-index="${x.sourceIndex}" data-quantity="${x.quantity}" data-mode="${x.mode}"><strong>＋ ${esc(x.name)}</strong><small>${esc(x.display)} · frei: ${n(x.remaining)} ${esc(x.unit)}</small></button>`).join('')}</div>`:'<p class="pm-hint">Keine passenden Schnellauswahl-Artikel mit ausreichendem Bestand gefunden.</p>'}
 ${sources.length?`<details class="pm-material-more" data-material-details><summary>＋ Anderen Artikel oder genaue Menge wählen</summary>
 <form id="pmCleanMaterial"><label for="pmCleanSource">Verbrauchsartikel und Lagerort</label><select id="pmCleanSource" name="sourceIndex" required class="search-input">${sources.map((v,i)=>`<option value="${i}">${esc(v.label)} · noch ${n(remainingMaterial(v,active.materials))} ${esc(v.unit)}</option>`).join('')}</select><div class="pm-clean-material-grid"><label>Verwendete Menge<input class="search-input" type="number" name="quantity" inputmode="decimal" min="0" step="0.001" value="1" required></label><label>Einheit<select class="search-input" name="mode" id="pmCleanUnit"><option value="units">Grundeinheiten</option><option value="pairs">Paar Handschuhe</option></select></label></div><button class="secondary-button pm-full" type="submit">＋ Material vormerken</button></form></details>`:'<p class="pm-clean-warning">Keine verfügbaren Verbrauchsartikel im Lagerhaus. Reinigung ohne Abbuchung möglich.</p>'}
 <div class="pm-material-basket"><h4>Für diese Reinigung vorgemerkt</h4>${active.materials.length?`<ul class="pm-clean-basket">${active.materials.map(line=>`<li><span>${esc(summarizeLine(line))}</span><button type="button" data-clean-action="remove-material" data-line-id="${esc(line.id)}" aria-label="${esc(line.itemName)} entfernen">×</button></li>`).join('')}</ul>`:'<p class="pm-hint">Noch keine Lagerabbuchung vorgemerkt.</p>'}</div>
 ${active.materials.length?'<button class="secondary-button pm-full" type="button" data-clean-action="save-preset">🔁 Diese Materialauswahl für den Raum merken</button>':''}${preset?.length?'<button class="pm-clean-discard" type="button" data-clean-action="clear-preset">Gespeicherte Materialvorlage löschen</button>':''}</div>`;
}
function cleanPanel(room,active,history,sources,preset,expandedGroups,quickTypes,roomSchedules){
 const groups=active?.groups||roomTaskGroups(room,quickTypes),total=taskCount(groups),done=active?.doneTaskIds?.length||0;
 const recent=history.filter(h=>h.roomId===room.id).slice(0,5);
 const completedAreas=groups.filter(g=>g.steps.every(step=>active?.doneTaskIds?.includes(step.id))).length;
 const progress=total?Math.round(100*done/total):0;
 return `<section class="pm-clean-panel" aria-label="Raum reinigen">
 <div class="pm-clean-header"><div><div class="pm-eyebrow">PUTZMANAGER · P03</div><h2>🧽 ${esc(room.name)} reinigen</h2><p>Ein Häkchen pro Bereich. Details und Material nur bei Bedarf.</p></div><span class="pm-clean-progress">${done}/${total}</span></div>
 <div class="pm-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="Reinigungsfortschritt"><div class="pm-progress-fill" style="width:${progress}%"></div></div>
 <div class="pm-clean-timer" role="timer" aria-live="off" data-clean-clock>${duration(sessionElapsed(active))}</div>
 <p class="pm-clean-caption">${active?active.status==='running'?'Die Stoppuhr läuft. Fortschritt bleibt beim Schließen gespeichert.':'Stoppuhr pausiert – Zeit und Häkchen sind gespeichert.':'Zuerst Raum auswählen, dann mit „Reinigung starten“ die Stoppuhr aktivieren.'}</p>
 ${preset?.length?`<p class="pm-clean-caption">🔁 Gespeicherte Materialvorlage: ${preset.length} Position(en) · beim Start automatisch vorgemerkt.</p>`:''}
 <div class="pm-clean-controls">${active?`
 <button type="button" class="secondary-button" data-clean-action="${active.status==='running'?'pause':'resume'}">${active.status==='running'?'⏸ Pausieren':'▶ Weiterputzen'}</button>
 <button type="button" class="primary-button pm-accent" data-clean-action="finish">✓ Reinigung abschließen</button>
 <button type="button" class="pm-clean-discard" data-clean-action="discard">Reinigung verwerfen</button>`:
 `<button type="button" class="primary-button pm-accent pm-full" data-clean-action="start">▶ ${esc(room.name)} jetzt reinigen</button>`}</div>
 ${!active?quickListHtml(room,quickTypes):''}
 <div class="pm-clean-summary"><strong>✅ Putzliste</strong><span>${completedAreas} von ${groups.length} Bereichen fertig</span></div>
 <div class="pm-clean-groups">${tasksHtml(groups,active?.doneTaskIds,Boolean(active),expandedGroups,history,room.id,roomSchedules)}</div>
 ${active?materialHtml(active,sources,preset):''}
 <details class="pm-clean-history"><summary>📋 Vollständige Reinigungshistorie (${history.filter(h=>h.roomId===room.id).length})</summary>
 ${history.filter(h=>h.roomId===room.id).length?history.filter(h=>h.roomId===room.id).map(record=>`<div class="pm-clean-receipt"><strong>${esc(new Date(record.endedAt).toLocaleString('de-AT'))} · ${duration(record.durationMs)}</strong><small>${record.doneCount}/${record.totalCount} Einzelschritte</small>${Array.isArray(record.completedTasks)?`<details><summary>✓ ${record.completedGroups?.length||0} Bereiche vollständig · ${record.completedTasks.length} Schritte</summary><ul>${record.completedTasks.map(step=>`<li>${esc(step.groupName)}: ${esc(step.title)}</li>`).join('')}</ul></details>`:'<p>Älterer Eintrag: Welche Aufgaben erledigt wurden, wurde damals nicht gespeichert. Der Status wird nicht geschätzt.</p>'}${record.materials?.length?`<ul>${record.materials.map(line=>`<li>− ${esc(receiptLine(line))}</li>`).join('')}</ul>`:'<p>Kein Material abgebucht.</p>'}</div>`).join(''):'<p>Noch keine abgeschlossene Reinigung.</p>'}</details>
 </section>`;
}
export async function mountCleaningUi({root,room,notify}){
 const stage=root.querySelector('#pmCleaningStage');if(!stage)return ()=>{};
 let stop=false,timer=0,locked=false,state=null,sources=[],presets={},quickPrefs={},roomSchedules={},renderedOnce=false;
 const expandedGroups=new Set();
 async function refresh(){
  const [loaded,items,warehouseRooms,areas,presetData,quickData,scheduleData]=await Promise.all([loadCleaningState(),getModuleValue('lagerhaus',ITEM_KEY),getModuleValue('lagerhaus','rooms.v1'),getModuleValue('lagerhaus','areas.v1'),loadMaterialPresets(),loadQuickTypes(),loadSchedule()]);
  if(stop||!stage.isConnected)return;
  state=loaded;presets=presetData;quickPrefs=quickData;roomSchedules=scheduleData[room.id]||{};
  try{sources=materialSources(Array.isArray(items)?items:[],Array.isArray(warehouseRooms)?warehouseRooms:[],Array.isArray(areas)?areas:[]);}catch(e){sources=[];notify('Lagerwarnung: '+e.message,true);}
  const manualOpen=Boolean(stage.querySelector('[data-material-details][open]'));
  const quickOpen=Boolean(stage.querySelector('[data-clean-quick-details][open]'));
  const openSchedule=[...stage.querySelectorAll('.pm-schedule-setting[open]')].map(el=>el.closest('.pm-clean-group')?.querySelector('[data-clean-interval]')?.dataset.cleanInterval).filter(Boolean);
  const historyOpen=Boolean(stage.querySelector('.pm-clean-history[open]'));
  // The task list is redrawn after every checkmark. Keep whatever groups the user opened.
  if(renderedOnce){
   expandedGroups.clear();
   stage.querySelectorAll('details[data-clean-group][open]').forEach(group=>expandedGroups.add(group.dataset.cleanGroup));
  }
  stage.innerHTML=cleanPanel(room,state.active[room.id],state.history,sources,presets[room.id],expandedGroups,Array.isArray(quickPrefs[room.id])?quickPrefs[room.id]:defaultQuickTypes(room.type),roomSchedules);
  if(manualOpen&&stage.querySelector('[data-material-details]'))stage.querySelector('[data-material-details]').open=true;
  if(quickOpen&&stage.querySelector('[data-clean-quick-details]'))stage.querySelector('[data-clean-quick-details]').open=true;
  if(historyOpen)stage.querySelector('.pm-clean-history').open=true;
  for(const id of openSchedule){const el=[...stage.querySelectorAll('[data-clean-interval]')].find(x=>x.dataset.cleanInterval===id);if(el)el.closest('.pm-schedule-setting').open=true;}
  renderedOnce=true;
  const material=stage.querySelector('#pmCleanMaterial');
  if(material){material.querySelector('[name="mode"]').disabled=!sources[0]?.pairs;material.querySelector('[name="quantity"]').step=sources[0]?.unit==='stk'?'1':'0.001';}
 }
 const updateClock=()=>{
  if(stop||!stage.isConnected){clearInterval(timer);return;}
  const clock=stage.querySelector('[data-clean-clock]');if(clock)clock.textContent=duration(sessionElapsed(state?.active[room.id]));
 };
 await refresh();timer=setInterval(updateClock,1000);
 stage.addEventListener('click',async e=>{
  const button=e.target.closest('[data-clean-action]');if(!button||locked)return;
  const action=button.dataset.cleanAction,session=state?.active[room.id];
  if(action==='finish'){
   const total=taskCount(session.groups),done=session.doneTaskIds.length;
   const lines=session.materials.map(summarizeLine).join('\n')||'Keine Verbrauchsartikel';
   if(!confirm(`Reinigung wirklich abschließen?\n\nErledigt: ${done}/${total} Aufgaben\nZeit: ${duration(sessionElapsed(session))}\n\nLagerhaus-Abbuchung:\n${lines}\n\n${done<total?'ACHTUNG: Es sind noch Aufgaben offen.\n':''}Der Verbrauch wird erst jetzt gebucht.`))return;
  }
  if(action==='clear-preset'&&!confirm('Gespeicherte Materialvorlage für diesen Raum löschen? Die aktuelle Reinigung bleibt unverändert.'))return;
  if(action==='discard'&&!confirm('Reinigung ohne Abschluss verwerfen? Alle Häkchen und die gemessene Zeit dieser Sitzung gehen verloren. Es wird nichts vom Lager abgebucht.'))return;
  locked=true;
  try{
   let message='Gespeichert ✓';
   if(action==='start'){await startCleaning(room);message='Reinigung und Stoppuhr gestartet.';}
   else if(action==='pause'||action==='resume'){await setTimer(room.id,action);message=action==='pause'?'Stoppuhr pausiert.':'Stoppuhr läuft wieder.';}
   else if(action==='finish'){const out=await finishCleaning(room.id);message=`✓ Reinigung abgeschlossen (${duration(out.durationMs)}). ${out.materials.length?out.materials.length+' Lagerbuchungen: '+out.materials.map(receiptLine).join(' · '):'Kein Material abgebucht.'}${out.reward?.awarded?` 🪙 +${out.reward.coins} Münzen, ★ +${out.reward.xp} XP.`:''}`;}
   else if(action==='discard'){await cancelCleaning(room.id);message='Reinigung verworfen; Lager unverändert.';}
   else if(action==='quick-material'){const source=sources[Number(button.dataset.sourceIndex)];await addMaterial(room.id,source,button.dataset.quantity,button.dataset.mode);message='✓ '+source.name+' vorgemerkt; Lager bleibt bis zum Abschluss unverändert.';}
   else if(action==='remove-material'){await removeMaterial(room.id,button.dataset.lineId);message='Material aus der Vormerkliste entfernt.';}
   else if(action==='save-preset'){await saveMaterialPreset(room.id);message='Materialauswahl gespeichert und beim nächsten Reinigungsstart automatisch vorgemerkt.';}
   else if(action==='clear-preset'){await clearMaterialPreset(room.id);message='Gespeicherte Materialvorlage gelöscht.';}
   else if(action==='save-days'){const id=button.dataset.groupId,input=[...stage.querySelectorAll('[data-clean-days]')].find(el=>el.dataset.cleanDays===id);const n=Number(input?.value);if(!Number.isInteger(n)||n<1||n>365)throw Error('Bitte eine Zahl zwischen 1 und 365 Tagen wählen.');await saveSchedule(room.id,id,{kind:'days',every:n});message='Eigener Reinigungsrhythmus gespeichert.';}
   else return;
   await refresh();notify(message);
  }catch(error){notify(error?.message||'Aktion fehlgeschlagen.',true);}finally{locked=false;}
 });
 stage.addEventListener('change',async e=>{
  if(e.target.matches('[data-clean-interval]')){
   if(e.target.value==='custom'){e.target.closest('.pm-schedule-setting').querySelector('[data-clean-days]').focus();return;}
   if(locked)return;locked=true;
   try{const x=e.target.value,kind=x.startsWith('days:')?'days':x,every=kind==='days'?Number(x.split(':')[1]):1;await saveSchedule(room.id,e.target.dataset.cleanInterval,{kind,every});await refresh();notify('Reinigungsrhythmus gespeichert.');}
   catch(error){notify(error.message,true);await refresh();}finally{locked=false;}return;
  }
  if(e.target.matches('[data-clean-quick]')){
   if(locked)return;
   locked=true;
   try{
    const selected=[...stage.querySelectorAll('[data-clean-quick]:checked:not(:disabled)')].map(input=>input.dataset.cleanQuick);
    await saveQuickTypes(room.id,room.type,selected);await refresh();notify('Schnellliste gespeichert.');
   }catch(error){notify(error.message||'Schnellliste konnte nicht gespeichert werden.',true);await refresh();}finally{locked=false;}
   return;
  }
  if(e.target.id==='pmCleanSource'){
   const selected=sources[Number(e.target.value)],form=stage.querySelector('#pmCleanMaterial');
   if(!selected||!form)return;
   form.querySelector('[name="mode"]').disabled=!selected.pairs;
   if(!selected.pairs)form.querySelector('[name="mode"]').value='units';
   form.querySelector('[name="quantity"]').step=selected.unit==='stk'?'1':'0.001';
   return;
  }
  const checkbox=e.target.closest('[data-clean-task], [data-clean-area]');if(!checkbox||locked)return;
  locked=true;
  try{if(checkbox.dataset.cleanArea)await setGroupDone(room.id,checkbox.dataset.cleanArea,checkbox.checked);
      else await setTaskDone(room.id,checkbox.dataset.cleanTask,checkbox.checked);await refresh();}
  catch(error){notify(error.message,true);await refresh();}finally{locked=false;}
 });
 stage.addEventListener('submit',async e=>{
  if(e.target.id!=='pmCleanMaterial'||locked)return;
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target)),source=sources[Number(data.sourceIndex)];
  locked=true;
  try{await addMaterial(room.id,source,data.quantity,data.mode||'units');await refresh();notify('Material vorgemerkt. Lagerbuchung erfolgt beim Abschluss.');}
  catch(error){notify(error.message||'Material nicht übernommen.',true);}finally{locked=false;}
 });
 return ()=>{stop=true;clearInterval(timer);};
}
