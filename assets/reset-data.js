/** P04 – Modul-Testdaten selektiv und transaktionssicher zurücksetzen.
 * Alle Modul-Daten sind in IndexedDB gespeichert; bewusst KEINE Löschung
 * des globalen Metadaten-Stores oder von Google-Drive-Einstellungen.
 */
import {openDatabase, MODULE_STORES, REWARD_STORES} from './database.js';

const AREAS = Object.freeze([
  {id:'lagerhaus',label:'Lagerhaus',icon:'📦'},
  {id:'frauengesundheit',label:'Frauengesundheit',icon:'♡'},
  {id:'familienplaner',label:'Familienplaner',icon:'📅'},
  {id:'putzmanager',label:'Putzmanager',icon:'🧹'},
  {id:'hausservice',label:'M.R Hausservice',icon:'🏡'},
  {id:'belohnungswelt',label:'Belohnungswelt',icon:'🎴'}
]);
const allowedIds=new Set(AREAS.map(item=>item.id));

/** No caller-controlled store names. The reward world has seven related stores. */
export function storesForReset(ids){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!allowedIds.has(id))){
    throw Error('Bitte mindestens einen gültigen Bereich auswählen.');
  }
  const stores=new Set(ids);
  if(stores.has('belohnungswelt'))for(const store of REWARD_STORES)stores.add(store);
  const valid=new Set([...MODULE_STORES,...REWARD_STORES]);
  if([...stores].some(store=>!valid.has(store)))throw Error('Ungültiger Datenspeicher.');
  return [...stores];
}

/** Store entries, NOT inventory item counts or completed-task counts. */
export async function readResetCounts(){
  const db=await openDatabase(),names=[...MODULE_STORES,...REWARD_STORES];
  return new Promise((resolve,reject)=>{
    const result=Object.create(null);
    const tx=db.transaction(names,'readonly');
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>{};
    tx.onabort=()=>reject(tx.error||Error('Speicherübersicht fehlgeschlagen.'));
    for(const name of names){
      const request=tx.objectStore(name).count();
      request.onsuccess=()=>{result[name]=request.result;};
    }
  });
}

/** One readwrite transaction makes the selected reset all-or-nothing. */
export async function resetSelectedModules(ids){
  const names=storesForReset(ids),db=await openDatabase();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(names,'readwrite');
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>{};
    tx.onabort=()=>reject(tx.error||Error('Löschen abgebrochen; keine Teil-Löschung durchgeführt.'));
    try{for(const name of names)tx.objectStore(name).clear();}
    catch(e){tx.abort();reject(e);}
  });
  const counts=await readResetCounts();
  const remaining=names.filter(name=>counts[name]!==0);
  if(remaining.length)throw Error('Löschung abgeschlossen, aber anschließend sind neue Daten erschienen: '+remaining.join(', ')+'. Schließe andere App-Fenster und prüfe erneut.');
  return {areas:ids.length,stores:names.length};
}

export function renderResetPanel(){
  return `<div class="glass-card test-reset" id="testDataReset">
    <div class="test-reset-heading"><span aria-hidden="true">🧹</span><h2>Testdaten zurücksetzen</h2></div>
    <p>Alle bisherigen Eingaben der gewählten Bereiche löschen – ohne die App neu zu installieren. <strong>Das lässt sich nicht rückgängig machen.</strong></p>
    <p class="test-reset-warning"><strong>Vorher sichern:</strong> Weiter unten unter „Verschlüsseltes Gesamtbackup“ kannst du eine Sicherungsdatei herunterladen. Ein Backup wird hier <strong>nicht automatisch</strong> erstellt.</p>
    <div class="test-reset-controls"><button type="button" id="resetSelectCleaning" class="secondary-button">Lagerhaus + Putzmanager wählen</button><button type="button" id="resetSelectAll" class="secondary-button">Alle 6 auswählen</button><button type="button" id="resetSelectNone" class="secondary-button">Auswahl aufheben</button></div>
    <fieldset class="test-reset-options"><legend>Welche Bereiche möchtest du löschen?</legend>
      ${AREAS.map(a=>`<label class="test-reset-option"><input type="checkbox" data-reset-module="${a.id}"/><span class="test-reset-icon" aria-hidden="true">${a.icon}</span><span class="test-reset-label">${a.label}</span><small id="resetCount-${a.id}">Prüfe …</small></label>`).join('')}
    </fieldset>
    <p class="test-reset-tip">💡 Bei einem kompletten Putz-Neustart <strong>Lagerhaus UND Putzmanager</strong> auswählen: Bereits abgebuchtes Material wird beim alleinigen Löschen des Putzmanagers nicht ins Lager zurückgebucht.</p>
    <p id="resetSelectionSummary" class="test-reset-selection" aria-live="polite">Noch kein Bereich ausgewählt.</p>
    <label class="field-label" for="resetPhrase">Zur Sicherheit <strong>LÖSCHEN</strong> eintippen</label>
    <input id="resetPhrase" class="search-input" type="text" maxlength="20" spellcheck="false" autocomplete="off" placeholder="LÖSCHEN" />
    <label class="test-reset-ack"><input type="checkbox" id="resetUnderstand"/><span>Mir ist bewusst, dass die ausgewählten Daten dauerhaft verloren gehen, falls ich kein Backup habe.</span></label>
    <button type="button" id="resetExecute" class="test-reset-danger" disabled>Ausgewählte Testdaten endgültig löschen</button>
    <p id="resetFeedback" class="test-reset-feedback" role="status" aria-live="polite"></p>
    <p class="test-reset-footnote">App-Dateien, Version, andere Module und Google-Drive-Konfiguration bleiben erhalten. Belohnungswelt: Karten, Booster, Münzen und Verlauf werden gelöscht. Die angezeigte Anzahl beschreibt Speichereinträge, nicht einzelne Artikel oder Putzvorgänge.</p>
  </div>`;
}

export function mountResetPanel(){
  const root=document.getElementById('testDataReset');if(!root)return;
  const checks=[...root.querySelectorAll('[data-reset-module]')];
  const phrase=root.querySelector('#resetPhrase');
  const understand=root.querySelector('#resetUnderstand');
  const button=root.querySelector('#resetExecute');
  const summary=root.querySelector('#resetSelectionSummary');
  const feedback=root.querySelector('#resetFeedback');
  let busy=false,counts=null;
  const selected=()=>checks.filter(c=>c.checked).map(c=>c.dataset.resetModule);
  const validPhrase=()=>phrase.value.trim().toLocaleUpperCase('de-AT')==='LÖSCHEN';
  function update(){
    const ids=selected();
    const entryCount=counts?storesForReset(ids.length?ids:['lagerhaus']).reduce((sum,n)=>sum+(ids.length?(counts[n]||0):0),0):null;
    summary.textContent=!ids.length?'Noch kein Bereich ausgewählt.':`${ids.length} von 6 Bereichen ausgewählt`+(entryCount===null?'':` · ${entryCount} gespeicherte Datenbankeinträge`);
    button.disabled=busy||!ids.length||!validPhrase()||!understand.checked;
  }
  for(const cb of checks)cb.addEventListener('change',()=>{feedback.textContent='';update();});
  phrase.addEventListener('input',update);
  understand.addEventListener('change',update);
  root.querySelector('#resetSelectCleaning').addEventListener('click',()=>{for(const cb of checks)cb.checked=['lagerhaus','putzmanager'].includes(cb.dataset.resetModule);feedback.textContent='';update();});
  root.querySelector('#resetSelectAll').addEventListener('click',()=>{for(const cb of checks)cb.checked=true;feedback.textContent='';update();});
  root.querySelector('#resetSelectNone').addEventListener('click',()=>{for(const cb of checks)cb.checked=false;feedback.textContent='';update();});
  readResetCounts().then(result=>{
    if(!root.isConnected)return;counts=result;
    for(const a of AREAS){
      const keys=storesForReset([a.id]);const n=keys.reduce((sum,key)=>sum+(result[key]||0),0);
      root.querySelector(`#resetCount-${a.id}`).textContent=`${n} Einträge`;
    }
    update();
  }).catch(e=>{if(root.isConnected){feedback.textContent='Speicherübersicht nicht verfügbar: '+e.message;feedback.dataset.kind='error';}});
  button.addEventListener('click',async()=>{
    const ids=selected();
    if(busy||!ids.length||!validPhrase()||!understand.checked)return;
    const labels=AREAS.filter(a=>ids.includes(a.id)).map(a=>a.label).join(', ');
    const extra=ids.includes('putzmanager')&&!ids.includes('lagerhaus')?'\nAchtung: Bereits verbrauchtes Material bleibt im Lagerhaus abgebucht.':'';
    if(!window.confirm(`LETZTE WARNUNG\n\nDiese Bereiche und alle ihre gespeicherten Daten werden dauerhaft gelöscht:\n${labels}${extra}\n\nDie App und nicht ausgewählte Module bleiben erhalten.\n\nJetzt wirklich löschen?`))return;
    busy=true;feedback.dataset.kind='progress';feedback.textContent='Lösche Daten sicher aus der lokalen Datenbank …';update();
    try{
      const result=await resetSelectedModules(ids);
      feedback.dataset.kind='success';feedback.textContent=`✓ ${result.areas} Bereich(e) zurückgesetzt. Daten überprüft. App wird neu geladen.`;
      button.disabled=true;
      setTimeout(()=>location.reload(),1300);
    }catch(e){
      feedback.dataset.kind='error';feedback.textContent='Löschen fehlgeschlagen: '+e.message;
      busy=false;update();
    }
  });
  update();
}
