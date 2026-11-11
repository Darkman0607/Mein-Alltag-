/** P01 – isolated room-cleaning panel, mounted above the 3D editor. */
import {getModuleValue} from '../assets/database.js';
import {ITEM_KEY} from './lagerhaus-items.js';
import {roomTaskGroups,taskCount,QUICK_OPTIONS,defaultQuickTypes,loadQuickTypes,saveQuickTypes,quickMaterialChoices,remainingMaterial,loadCleaningState,loadMaterialPresets,saveMaterialPreset,clearMaterialPreset,sessionElapsed,duration,materialSources,startCleaning,setTimer,setTaskDone,addMaterial,removeMaterial,cancelCleaning,finishCleaning} from './putzmanager-cleaning.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=n=>String(Number(n)).replace('.',',');
function tasksHtml(groups,done,enabled,expandedGroups){
 const completed=new Set(done||[]);
 return groups.map(group=>{
  const count=group.steps.filter(step=>completed.has(step.id)).length;
  return `<details class="pm-clean-group" data-clean-group="${esc(group.id)}" ${expandedGroups.has(group.id)?'open':''}><summary class="pm-clean-group-summary"><span class="pm-clean-group-name">${esc(group.name)}</span><span class="pm-clean-group-count">${count}/${group.steps.length}</span><span class="pm-clean-group-chevron" aria-hidden="true"></span></summary><div class="pm-clean-task-list">${group.steps.map(step=>`<label class="pm-clean-task ${completed.has(step.id)?'pm-clean-done':''}"><input type="checkbox" data-clean-task="${esc(step.id)}" ${completed.has(step.id)?'checked':''} ${enabled?'':'disabled'}><span>${esc(step.title)}</span></label>`).join('')}</div></details>`;
 }).join('');
}

const summarizeLine=line=>`${line.itemName}: ${n(line.quantity)} ${line.unit}`;
function quickListHtml(room,selected){
 const options=QUICK_OPTIONS[room.type];if(!options)return '';
 const existing=new Set((room.sketch3d?.objects||room.objects||[]).map(o=>o.type));
 return `<details class="pm-quick-list" data-clean-quick-details><summary>⚡ Schnellliste anpassen <small>(${selected.length} Vorlagen ausgewählt)</small></summary>
 <p>Diese Aufgaben werden ohne 3D-Einrichtung angelegt. Vorhandene Möbel aus deinem Raumplan sind immer dabei. Deine Auswahl gilt für den nächsten Start.</p>
 <div class="pm-quick-grid">${options.map(([type,label])=>`<label class="pm-quick-choice"><input type="checkbox" data-clean-quick="${esc(type)}" ${selected.includes(type)||existing.has(type)?'checked':''} ${existing.has(type)?'disabled':''}><span>${esc(label)}${existing.has(type)?' · 3D':''}</span></label>`).join('')}</div></details>`;
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
function cleanPanel(room,active,history,sources,preset,expandedGroups,quickTypes){
 const groups=active?.groups||roomTaskGroups(room,quickTypes),total=taskCount(groups),done=active?.doneTaskIds?.length||0;
 const recent=history.filter(h=>h.roomId===room.id).slice(0,3);
 return `<section class="pm-clean-panel" aria-label="Raum reinigen">
 <div class="pm-clean-header"><div><div class="pm-eyebrow">PUTZMANAGER · P02</div><h2>🧽 ${esc(room.name)} reinigen</h2><p>Schnellstart ohne Möbel-Einrichtung · Aufgaben und Material direkt griffbereit.</p></div><span class="pm-clean-progress">${done}/${total}</span></div>
 <div class="pm-clean-timer" role="timer" aria-live="off" data-clean-clock>${duration(sessionElapsed(active))}</div>
 <p class="pm-clean-caption">${active?active.status==='running'?'Die Stoppuhr läuft. Fortschritt bleibt beim Schließen gespeichert.':'Stoppuhr pausiert – Zeit und Häkchen sind gespeichert.':'Zuerst Raum auswählen, dann mit „Reinigung starten“ die Stoppuhr aktivieren.'}</p>
 ${preset?.length?`<p class="pm-clean-caption">🔁 Gespeicherte Materialvorlage: ${preset.length} Position(en) · beim Start automatisch vorgemerkt.</p>`:''}
 <div class="pm-clean-controls">${active?`
 <button type="button" class="secondary-button" data-clean-action="${active.status==='running'?'pause':'resume'}">${active.status==='running'?'⏸ Pausieren':'▶ Weiterputzen'}</button>
 <button type="button" class="primary-button pm-accent" data-clean-action="finish">✓ Reinigung abschließen</button>
 <button type="button" class="pm-clean-discard" data-clean-action="discard">Reinigung verwerfen</button>`:
 `<button type="button" class="primary-button pm-accent pm-full" data-clean-action="start">▶ ${esc(room.name)} jetzt reinigen</button>`}</div>
 ${!active?quickListHtml(room,quickTypes):''}
 ${active?materialHtml(active,sources,preset):''}
 <div class="pm-clean-summary"><strong>Aufgabenübersicht</strong><span>${done} von ${total} erledigt</span></div>
 <div class="pm-clean-fold-controls" role="group" aria-label="Aufgabengruppen ein- oder ausklappen"><button type="button" data-clean-toggle-all="collapse">▴ Alle einklappen</button><button type="button" data-clean-toggle-all="expand">▾ Alle aufklappen</button></div>
 <div class="pm-clean-groups">${tasksHtml(groups,active?.doneTaskIds,Boolean(active),expandedGroups)}</div>
 ${recent.length?`<details class="pm-clean-history"><summary>Letzte Reinigungen (${recent.length})</summary>${recent.map(record=>`<p><strong>${esc(new Date(record.endedAt).toLocaleDateString('de-AT'))}</strong> · ${duration(record.durationMs)} · ${record.doneCount}/${record.totalCount} Aufgaben · ${record.materials.length} Materialpositionen</p>`).join('')}</details>`:''}
 </section>`;
}
export async function mountCleaningUi({root,room,notify}){
 const stage=root.querySelector('#pmCleaningStage');if(!stage)return ()=>{};
 let stop=false,timer=0,locked=false,state=null,sources=[],presets={},quickPrefs={},renderedOnce=false;
 const expandedGroups=new Set();
 async function refresh(){
  const [loaded,items,warehouseRooms,areas,presetData,quickData]=await Promise.all([loadCleaningState(),getModuleValue('lagerhaus',ITEM_KEY),getModuleValue('lagerhaus','rooms.v1'),getModuleValue('lagerhaus','areas.v1'),loadMaterialPresets(),loadQuickTypes()]);
  if(stop||!stage.isConnected)return;
  state=loaded;presets=presetData;quickPrefs=quickData;
  try{sources=materialSources(Array.isArray(items)?items:[],Array.isArray(warehouseRooms)?warehouseRooms:[],Array.isArray(areas)?areas:[]);}catch(e){sources=[];notify('Lagerwarnung: '+e.message,true);}
  const manualOpen=Boolean(stage.querySelector('[data-material-details][open]'));
  const quickOpen=Boolean(stage.querySelector('[data-clean-quick-details][open]'));
  // The task list is redrawn after every checkmark. Keep whatever groups the user opened.
  if(renderedOnce){
   expandedGroups.clear();
   stage.querySelectorAll('details[data-clean-group][open]').forEach(group=>expandedGroups.add(group.dataset.cleanGroup));
  }
  stage.innerHTML=cleanPanel(room,state.active[room.id],state.history,sources,presets[room.id],expandedGroups,Array.isArray(quickPrefs[room.id])?quickPrefs[room.id]:defaultQuickTypes(room.type));
  if(manualOpen&&stage.querySelector('[data-material-details]'))stage.querySelector('[data-material-details]').open=true;
  if(quickOpen&&stage.querySelector('[data-clean-quick-details]'))stage.querySelector('[data-clean-quick-details]').open=true;
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
  const foldButton=e.target.closest('[data-clean-toggle-all]');
  if(foldButton){
   const expand=foldButton.dataset.cleanToggleAll==='expand';
   stage.querySelectorAll('details[data-clean-group]').forEach(group=>{group.open=expand;});
   return;
  }
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
   else if(action==='finish'){const out=await finishCleaning(room.id);message=`✓ Reinigung abgeschlossen (${duration(out.durationMs)}). ${out.materials.length} Lagerposition(en) abgebucht.${out.reward?.awarded?` 🪙 +${out.reward.coins} Münzen, ★ +${out.reward.xp} XP.`:''}`;}
   else if(action==='discard'){await cancelCleaning(room.id);message='Reinigung verworfen; Lager unverändert.';}
   else if(action==='quick-material'){const source=sources[Number(button.dataset.sourceIndex)];await addMaterial(room.id,source,button.dataset.quantity,button.dataset.mode);message='✓ '+source.name+' vorgemerkt; Lager bleibt bis zum Abschluss unverändert.';}
   else if(action==='remove-material'){await removeMaterial(room.id,button.dataset.lineId);message='Material aus der Vormerkliste entfernt.';}
   else if(action==='save-preset'){await saveMaterialPreset(room.id);message='Materialauswahl gespeichert und beim nächsten Reinigungsstart automatisch vorgemerkt.';}
   else if(action==='clear-preset'){await clearMaterialPreset(room.id);message='Gespeicherte Materialvorlage gelöscht.';}
   else return;
   await refresh();notify(message);
  }catch(error){notify(error?.message||'Aktion fehlgeschlagen.',true);}finally{locked=false;}
 });
 stage.addEventListener('change',async e=>{
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
  const checkbox=e.target.closest('[data-clean-task]');if(!checkbox||locked)return;
  locked=true;
  try{await setTaskDone(room.id,checkbox.dataset.cleanTask,checkbox.checked);await refresh();}
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
