import {openDatabase,getModuleValue,setModuleValue,getStoreNames,getModuleCount,DB_NAME,DB_VERSION,MODULE_STORES} from './database.js';
import lagerhaus from '../modules/lagerhaus.js';
import {renderLagerhaus,mountLagerhaus,renderLagerraum,mountLagerraum} from '../modules/lagerhaus-app.js';
import {renderLagerartikel,mountLagerartikel} from '../modules/lagerhaus-items-view.js';
import {renderLagerNavigator,mountLagerNavigator} from '../modules/lagerhaus-navigator-view.js';
import {renderLagerService,mountLagerService} from '../modules/lagerhaus-service-view.js';
import frauengesundheit from '../modules/frauengesundheit.js';
import familienplaner from '../modules/familienplaner.js';
import putzmanager from '../modules/putzmanager.js';
import {renderPutzmanager,mountPutzmanager} from '../modules/putzmanager-ui.js';
import hausservice from '../modules/hausservice.js';
import {renderHealth,mountHealth,confirmHealthExit} from '../modules/frauengesundheit-ui.js';
import {createEncryptedBackup,triggerBackupDownload,decryptBackup,restoreSnapshot,validateSnapshot} from './backup.js';
import {prepareGoogleIdentity,connectGoogleDrive,disconnectGoogleDrive,isDriveConnected,getGoogleClientId,saveGoogleClientId,validateGoogleClientId,listDriveBackups,uploadDriveBackup,downloadDriveBackup} from './google-drive.js';

export const APP_VERSION='0.22.0';
export const MODULES=Object.freeze([lagerhaus,frauengesundheit,familienplaner,putzmanager,hausservice]);
const byId=Object.fromEntries(MODULES.map(m=>[m.id,m]));
const view=document.getElementById('view');
const backButton=document.getElementById('backButton');
const appTitle=document.getElementById('appTitle');
const appSubtitle=document.getElementById('appSubtitle');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=m=>`./assets/icons/${m.icon}`;
function hashRoute(){
  const part=(location.hash || '#/home').replace(/^#\/?/,'').split('/').filter(Boolean);
  if(part[0]==='lagerhaus' && part[1]==='service') return {page:'lagerservice'};
  if(part[0]==='lagerhaus' && part[1]==='navigator') return {page:'lagernavigator'};
  if(part[0]==='lagerhaus' && part[1]==='items') return {page:'lagerartikel',roomId:part[2]?decodeURIComponent(part[2]):''};
  if(part[0]==='lagerhaus' && part[1]==='room' && part[2]) return {page:'lagerraum',roomId:decodeURIComponent(part[2]),shelfId:part[3]==='shelf'&&part[4]?decodeURIComponent(part[4]):'',focusId:part[3]==='focus'&&part[4]?decodeURIComponent(part[4]):'',compartmentId:part[5]==='fach'&&part[6]?decodeURIComponent(part[6]):''};
  if(part[0]==='module' && byId[part[1]]) return {page:'module',id:part[1]};
  if(['home','calendar','search','more'].includes(part[0])) return {page:part[0]};
  return {page:'home'};
}
export function navigate(page,id){
  const newHash=page==='module' && byId[id] ? `#/module/${id}`:`#/${page}`;
  if(location.hash===newHash){render();return;}
  location.hash=newHash;
}
function section(title,subtitle=''){return `<div class="section-heading"><span class="eyebrow">Mein Alltag · Beta V${APP_VERSION}</span><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>`;}
function renderHome(){
  return `<div class="home-intro">Fünf Bereiche. Ein Ort für deinen Alltag.</div><div class="module-grid">${MODULES.map((m,i)=>`<button type="button" class="module-tile ${i===4?'wide':''}" data-open="${m.id}" data-id="${m.id}" aria-label="${esc(m.name)} öffnen"><img src="${icon(m)}" alt="" draggable="false"/><div class="tile-copy"><div class="tile-title">${esc(m.name)}</div><div class="tile-desc">${esc(m.subtitle)}</div></div></button>`).join('')}</div><div class="home-footer"><button class="install-link" id="installAction" type="button">App installieren – Anleitung</button><p id="installHelp" class="install-help" aria-live="polite"></p>MEIN ALLTAG · BETA V${APP_VERSION}</div>`;
}
function renderModule(m){return `<div class="module-hero" data-id="${m.id}"><img src="${icon(m)}" alt=""/><div><h1>${esc(m.name)}</h1><p>${esc(m.subtitle)}</p></div></div><span class="status-pill">Grundgerüst eingerichtet</span><div class="glass-card"><h2>Dein Bereich</h2><p>${esc(m.description)}</p><label class="field-label" for="moduleNote">Meine Startnotiz (nur auf diesem Gerät)</label><textarea maxlength="2000" class="note-input" id="moduleNote" placeholder="Optional: Hier kannst du eine kurze Notiz speichern."></textarea><div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px"><button type="button" class="primary-button" id="saveNote">Notiz speichern</button><span class="inline-message" id="saveMessage" role="status"></span></div></div><div class="glass-card"><h2>Für spätere Updates vorgesehen</h2>${m.features.map(s=>`<p>✓ ${esc(s)}</p>`).join('')}<p class="module-privacy">Diese Funktionen sind noch nicht umgesetzt. V0 liefert Navigation und getrennten lokalen Datenspeicher.</p></div>`;}
function monthMatrix(date){
 const first=new Date(date.getFullYear(),date.getMonth(),1);const offset=(first.getDay()+6)%7;
 const days=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
 const count=Math.ceil((offset+days)/7)*7;
 return Array.from({length:count},(_,i)=>{const d=new Date(date.getFullYear(),date.getMonth(),i-offset+1);return {date:d,other:d.getMonth()!==date.getMonth()};});
}
// Chrome on Android only permits the native prompt after beforeinstallprompt.
// Do not pretend that a normal click can force installation when Chrome does not offer it.
let deferredInstallPrompt=null;
let installedByEvent=false;
function installedMode(){
  return installedByEvent || window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}
const installInstructions='Öffne diese Adresse direkt in Google Chrome. Tippe rechts oben auf \"⋮\" → \"Zum Startbildschirm hinzufügen\" → \"Installieren\". Falls nur \"Verknüpfung erstellen\" angeboten wird, ist die richtige App-Installation auf diesem Gerät aktuell nicht verfügbar.';
function refreshInstallUI(){
  const button=document.getElementById('installAction');
  const status=document.getElementById('installStatus');
  if(button){
    button.disabled=Boolean(installedMode());
    button.textContent=installedMode()?'Bereits installiert':deferredInstallPrompt?'App jetzt installieren':'App installieren – Anleitung';
  }
  if(status){
    status.textContent=installedMode()?'Die App läuft im eigenen App-Fenster.':deferredInstallPrompt?'Chrome bietet die Installation jetzt direkt an.':'Falls Chrome keine Installationsaufforderung anbietet, verwende die Browser-Menüfunktion.';
  }
}
async function requestInstall(){
  const info=document.getElementById('installHelp');
  if(installedMode()){if(info)info.textContent='Die App ist bereits als eigenständige App geöffnet.';return;}
  if(!deferredInstallPrompt){if(info)info.textContent=installInstructions;return;}
  const event=deferredInstallPrompt;
  deferredInstallPrompt=null;
  refreshInstallUI();
  try{
    await event.prompt();
    const choice=await event.userChoice;
    if(info){
      info.textContent=choice?.outcome==='accepted'?'Installationsanfrage angenommen. Prüfe deinen Startbildschirm.':'Installation nicht bestätigt. '+installInstructions;
    }
  }catch(e){if(info)info.textContent='Direkte Installation nicht möglich. '+installInstructions;}
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  refreshInstallUI();
});
window.addEventListener('appinstalled',()=>{
  installedByEvent=true;
  deferredInstallPrompt=null;
  refreshInstallUI();
  const info=document.getElementById('installHelp');
  if(info)info.textContent='App installiert. Du kannst Mein Alltag jetzt über den Startbildschirm öffnen.';
});
let calendarDate=new Date();
function renderCalendar(){const now=new Date();const fmt=new Intl.DateTimeFormat('de-AT',{month:'long',year:'numeric'});return `${section('Kalender','Monatsübersicht – Termine kommen in einem späteren Update.')}<div class="glass-card"><div class="calendar-head"><button type="button" id="prevMonth" aria-label="Vorheriger Monat">‹</button><h2>${esc(fmt.format(calendarDate))}</h2><button type="button" id="nextMonth" aria-label="Nächster Monat">›</button></div><div class="calendar-grid">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d=>`<span class="day-label">${d}</span>`).join('')}${monthMatrix(calendarDate).map(d=>`<span class="day-cell ${d.other?'other':''} ${d.date.toDateString()===now.toDateString()?'today':''}">${d.date.getDate()}</span>`).join('')}</div></div><div class="glass-card"><h2>Noch keine Termine</h2><p>Der Kalender ist bereits bedienbar. Die Verknüpfung mit dem Familienplaner ist für ein späteres Update vorgesehen.</p></div>`;}
function renderSearch(){return `${section('Suche','Finde deine fünf Bereiche.')}<label class="field-label" for="searchInput">App-Bereiche durchsuchen</label><input class="search-input" id="searchInput" autocomplete="off" type="search" placeholder="z. B. Lager oder Familie"/><div class="search-results" id="searchResults"></div>`;}
function searchResults(q){const x=q.trim().toLocaleLowerCase('de-AT');const items=MODULES.filter(m=>`${m.name} ${m.subtitle} ${m.description}`.toLocaleLowerCase('de-AT').includes(x));return items.length?items.map(m=>`<button type="button" class="row-link" data-open="${m.id}"><span>${esc(m.name)}<small style="display:block;color:#9aaab8;font-size:11px;margin-top:3px">${esc(m.subtitle)}</small></span><span>›</span></button>`).join(''):'<p class="empty-state">Kein passender Bereich gefunden.</p>';}
function renderMore(){return `${section('Mehr & Einstellungen','Lokaler Speicher und sichere Backups.')}<div class="glass-card"><h2>App-Version</h2><p>Mein Alltag · Beta V${APP_VERSION}</p><p>Die fünf Module speichern Daten lokal. Google Drive überträgt Daten ausschließlich beim manuellen Sichern oder Wiederherstellen.</p></div><div class="glass-card"><h2>Lokaler Datenspeicher</h2><div id="storageStatus" role="status"><p>Prüfe Datenbank …</p></div></div>
<div class="glass-card backup-card" id="backupManager"><h2>🔐 Verschlüsseltes Gesamtbackup</h2><p>Alle fünf Module, Fotos und Belege werden vor dem Speichern mit <strong>AES-256-GCM</strong> verschlüsselt. Kein automatischer Cloud-Abgleich.</p><p><strong>Wichtig:</strong> Das Passwort wird nicht gespeichert. Ohne Passwort kann das Backup nicht wiederhergestellt werden. Die lokalen Daten auf diesem Gerät sind weiterhin nicht separat verschlüsselt.</p>
<label class="field-label" for="backupPassword">Backup-Passwort (mindestens 12 Zeichen)</label><input class="search-input" id="backupPassword" type="password" autocomplete="new-password" minlength="12" placeholder="Eigenes sicheres Backup-Passwort"/>
<label class="field-label" for="backupPasswordConfirm">Passwort für neue Sicherung wiederholen</label><input class="search-input" id="backupPasswordConfirm" type="password" autocomplete="new-password" minlength="12" placeholder="Passwort erneut eingeben"/>
<h3>📁 Google Drive</h3><p>Manuell in deinem Google Drive im sichtbaren Ordner <strong>Mein Alltag Backups</strong> sichern und von dort wiederherstellen. Google erhält nur verschlüsselte Dateien.</p>
<details class="drive-setup" id="googleDriveSetup"><summary>Google Drive einmalig einrichten</summary><p>Für die Anmeldung über GitHub Pages benötigt Mein Alltag eine kostenlose Google-Cloud-OAuth-Client-ID für Webanwendungen. Google Drive API aktivieren; als autorisierte JavaScript-Quelle <code>${esc(location.origin)}</code> eintragen. Anleitung: <a href="./GOOGLE_DRIVE_EINRICHTUNG.md" target="_blank" rel="noopener">GOOGLE_DRIVE_EINRICHTUNG.md</a></p><label class="field-label" for="googleClientId">Google OAuth-Client-ID (kein Passwort)</label><input class="search-input" id="googleClientId" type="text" autocomplete="off" spellcheck="false" placeholder="123456789-abc.apps.googleusercontent.com"/><button type="button" class="primary-button backup-main" id="googleSaveClientId">Client-ID auf diesem Gerät speichern</button><p class="drive-action-inline" id="googleSetupFeedback" role="status" aria-live="polite"></p></details>
<p class="drive-connect-status" id="googleConnection" role="status">Google Drive: nicht verbunden.</p><div class="drive-button-row"><button class="primary-button" type="button" id="googleLogin">Mit Google anmelden</button><button class="primary-button drive-secondary" type="button" id="googleLogout" disabled>Abmelden</button></div>
<button class="primary-button backup-main" type="button" id="driveSave" disabled>Verschlüsseltes Backup in Google Drive speichern</button>
<button class="primary-button backup-main drive-secondary" type="button" id="driveRefresh" disabled>Backups in Drive anzeigen / aktualisieren</button>
<label class="field-label" for="driveBackupList">Drive-Backup zur Wiederherstellung auswählen</label><select class="search-input drive-select" id="driveBackupList" disabled><option value="">Erst mit Google anmelden</option></select>
<p class="module-privacy">⚠️ Wiederherstellen ersetzt die lokalen Daten aller fünf Module. Dafür benötigst du das Passwort der gewählten Sicherung.</p>
<label class="backup-check"><input type="checkbox" id="backupUnderstand"/> Ich habe meine bisherigen lokalen Daten gesichert und stimme dem Ersetzen aller fünf Module zu.</label>
<button class="primary-button backup-main backup-import" type="button" id="driveRestore" disabled>Aus Google Drive wiederherstellen</button>
<hr><h3>Offline-Alternative: Backup-Datei</h3>
<button class="primary-button backup-main drive-secondary" id="backupExport" type="button">Verschlüsseltes Backup herunterladen</button>
<label class="field-label" for="backupFile">Lokale Sicherungsdatei (.meinalltag)</label><input class="backup-file" id="backupFile" type="file" accept=".meinalltag,application/octet-stream,application/json"/>
<button class="primary-button backup-main backup-import" id="backupImport" type="button">Backup-Datei mit Passwort importieren</button>
<p class="backup-result" role="status" aria-live="polite" id="backupResult"></p></div>
<div class="glass-card"><h2>App installieren</h2><p id="installStatus">Installation prüfen …</p><button type="button" class="primary-button" id="installAction">App installieren – Anleitung</button><p id="installHelp" aria-live="polite" class="install-help"></p><p>Alternativ: Chrome-Menü ⋮ → Zum Startbildschirm hinzufügen. Der Android-Browser entscheidet, ob eine App oder eine Verknüpfung erstellt wird.</p></div><button type="button" class="row-link" id="checkUpdate"><span>Auf Updates prüfen</span><span>↻</span></button><p id="moreMessage" class="module-privacy" role="status"></p>`;}
async function loadStorage(){const node=document.getElementById('storageStatus');if(!node)return;try{const names=await getStoreNames();const sizes=await Promise.all(MODULE_STORES.map(getModuleCount));if(!node.isConnected)return;node.innerHTML=`<div class="storage-line"><span>Datenbank</span><strong>${esc(DB_NAME)} · v${DB_VERSION}</strong></div>${MODULES.map((m,i)=>`<div class="storage-line"><span>${esc(m.name)}</span><strong>${sizes[i]} Eintrag${sizes[i]===1?'':'e'}</strong></div>`).join('')}<p style="margin-top:13px">Getrennte Speicherbereiche: ${names.length} (5 Module + technische Metadaten)</p>`;}catch(e){if(node.isConnected)node.textContent=`Speicher nicht verfügbar: ${e.message}`;}}
async function loadNote(id){const field=document.getElementById('moduleNote');if(!field)return;try{const data=await getModuleValue(id,'startNote');if(field.isConnected)field.value=typeof data==='string'?data:'';}catch(e){const msg=document.getElementById('saveMessage');if(msg)msg.textContent=`Speicherfehler: ${e.message}`;}}
async function saveNote(id){const field=document.getElementById('moduleNote');const msg=document.getElementById('saveMessage');if(!field||!msg)return;const value=field.value;try{await setModuleValue(id,'startNote',value);if(msg.isConnected)msg.textContent='Gespeichert ✓';}catch(e){if(msg.isConnected)msg.textContent=`Fehler: ${e.message}`;}}
function bindView(route){
 view.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>navigate('module',el.dataset.open)));
 if(route.page==='module'){
   if(route.id==='lagerhaus') mountLagerhaus();
   else if(route.id==='frauengesundheit') mountHealth();
   else if(route.id==='putzmanager') mountPutzmanager();
   else { document.getElementById('saveNote')?.addEventListener('click',()=>saveNote(route.id)); loadNote(route.id); }
 }
 if(route.page==='lagerraum') mountLagerraum(route.roomId,route.shelfId,route.focusId,route.compartmentId);
 if(route.page==='lagernavigator') mountLagerNavigator();
 if(route.page==='lagerservice') mountLagerService();
 if(route.page==='lagerartikel') mountLagerartikel(route.roomId);
 if(route.page==='calendar'){
   document.getElementById('prevMonth').addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);render();});
   document.getElementById('nextMonth').addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);render();});
 }
 if(route.page==='search'){
   const field=document.getElementById('searchInput');const result=document.getElementById('searchResults');
   const update=()=>{result.innerHTML=searchResults(field.value);result.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>navigate('module',b.dataset.open)));};
   field.addEventListener('input',update);update();
 }
 if(route.page==='more'){
   loadStorage();bindBackup();document.getElementById('checkUpdate').addEventListener('click',async()=>{
     const message=document.getElementById('moreMessage');
     if(!('serviceWorker' in navigator)){message.textContent='Updateprüfung wird hier nicht unterstützt.';return;}
     try{
       message.textContent='Prüfe die veröffentlichte Version …';
       // Bypass the offline cache; this tells us what is actually published online.
       const url=new URL('../version.json',import.meta.url);
       url.searchParams.set('_',String(Date.now()));
       const response=await fetch(url,{cache:'no-store'});
       if(!response.ok)throw new Error(`Serverstatus ${response.status}`);
       const release=await response.json();
       if(typeof release.version!=='string')throw new Error('Ungültige Versionsdatei');
       const registration=await navigator.serviceWorker.getRegistration();
       if(registration)await registration.update();
       message.textContent=release.version===APP_VERSION
         ?`Du verwendest Beta V${APP_VERSION}. Der Server bietet dieselbe Version an.`
         :`Auf GitHub liegt Beta V${release.version}, installiert ist V${APP_VERSION}. Die Aktualisierung wird vorbereitet. Falls kein Banner erscheint, App vollständig schließen und wieder öffnen.`;
     }catch(e){message.textContent=`Online-Version derzeit nicht prüfbar: ${e.message}. Lokale App V${APP_VERSION} funktioniert offline weiter.`;}
   });
 }
}
function bindBackup(){
 const status=document.getElementById('backupResult'),password=document.getElementById('backupPassword'),confirmPass=document.getElementById('backupPasswordConfirm');
 const exportButton=document.getElementById('backupExport'),importButton=document.getElementById('backupImport');
 const login=document.getElementById('googleLogin'),logout=document.getElementById('googleLogout'),save=document.getElementById('driveSave');
 const refresh=document.getElementById('driveRefresh'),restore=document.getElementById('driveRestore');
 const list=document.getElementById('driveBackupList'),connection=document.getElementById('googleConnection');
 const clientInput=document.getElementById('googleClientId');clientInput.value=getGoogleClientId();
 const setupFeedback=document.getElementById('googleSetupFeedback');
 // Diese Meldung erscheint auch dann sofort, wenn das Ergebnisfeld unten nicht sichtbar ist.
 let toast=document.getElementById('backupFeedbackToast');
 if(!toast){toast=document.createElement('div');toast.id='backupFeedbackToast';toast.className='backup-feedback-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=true;
  toast.innerHTML='<span class="backup-toast-mark" aria-hidden="true"></span><span class="backup-toast-text"></span><button type="button" class="backup-toast-close" aria-label="Meldung schließen">×</button>';
  document.body.appendChild(toast);
 }
 toast.querySelector('.backup-toast-close').onclick=()=>{toast.hidden=true;clearTimeout(toast._feedbackTimer);};
 function announce(message,kind='info',setup=false){
  status.textContent=message;status.dataset.kind=kind;
  if(setup){setupFeedback.textContent=message;setupFeedback.dataset.kind=kind;}
  clearTimeout(toast._feedbackTimer);
  toast.dataset.kind=kind;toast.querySelector('.backup-toast-mark').textContent=kind==='success'?'✓':kind==='error'?'!':'…';
  toast.querySelector('.backup-toast-text').textContent=message;
  toast.hidden=false;
  // Eine laufende Aktion bleibt angezeigt. Erfolg / Fehler kann zusätzlich unten nachgelesen werden.
  if(kind!=='progress')toast._feedbackTimer=setTimeout(()=>{toast.hidden=true;},kind==='error'?9500:6500);
 }
 let busyNow=false;
 function connectedUI(){
  const connected=isDriveConnected();
  connection.textContent=connected?'✓ Google Drive verbunden – nur für diese Sitzung.':'Google Drive nicht verbunden. Google-Anmeldung erforderlich.';
  logout.disabled=!connected||busyNow;login.disabled=busyNow;
  for(const button of [save,refresh])button.disabled=!connected||busyNow;
  restore.disabled=!connected||busyNow||!list.value;
  list.disabled=!connected||busyNow;
 }
 function busy(active){busyNow=active;exportButton.disabled=active;importButton.disabled=active;document.getElementById('googleSaveClientId').disabled=active;connectedUI();}
 function validNewPassword(){
  if(password.value.length<12){announce('Für ein neues Backup mindestens 12 Zeichen als Passwort eingeben.','error');return false;}
  if(password.value!==confirmPass.value){announce('Passwort und Bestätigung stimmen nicht überein.','error');return false;}
  return true;
 }
 async function driveList(){
  const items=await listDriveBackups();list.replaceChildren();
  const intro=document.createElement('option');intro.value='';intro.textContent=items.length?'Backup auswählen ('+items.length+' gefunden)':'Noch keine Backups im Drive-Ordner';list.append(intro);
  for(const item of items){const option=document.createElement('option');option.value=item.id;
   const date=item.createdTime?new Date(item.createdTime).toLocaleString('de-AT'):'Datum unbekannt';
   option.textContent=`${date} · ${item.name} · ${Math.ceil(Number(item.size||0)/1024)} KB`;list.append(option);
  }
  connectedUI();return items.length;
 }
 const currentId=getGoogleClientId();if(currentId&&validateGoogleClientId(currentId))prepareGoogleIdentity().catch(()=>{});
 document.getElementById('googleSaveClientId').addEventListener('click',()=>{
  try{
   if(!validateGoogleClientId(clientInput.value))throw Error('Bitte eine gültige OAuth-Client-ID eintragen.');
   saveGoogleClientId(clientInput.value);list.replaceChildren(new Option('Erst mit Google anmelden',''));connectedUI();
   announce('✓ Client-ID auf diesem Gerät gespeichert. Du kannst dich jetzt mit Google anmelden.','success',true);
   prepareGoogleIdentity().catch(e=>announce('Google-Anmeldung ist derzeit nicht verfügbar: '+e.message,'error',true));
  }catch(e){announce('Client-ID nicht gespeichert: '+e.message,'error',true);}
 });
 login.addEventListener('click',async()=>{
  if(!validateGoogleClientId(getGoogleClientId())){document.getElementById('googleDriveSetup').open=true;announce('Bitte zuerst Google Drive einrichten und eine OAuth-Client-ID speichern.','error');return;}
  // requestAccessToken is invoked synchronously in connectGoogleDrive(), directly from this user click.
  let pending;try{pending=connectGoogleDrive();}catch(e){announce(e.message,'error');prepareGoogleIdentity().catch(()=>{});return;}
  busy(true);announce('Google-Anmeldung wird geöffnet …','progress');
  try{
   await pending;connectedUI();announce('✓ Google angemeldet. Lade deine Backups …','progress');
   try{const n=await driveList();announce(`✓ Google angemeldet und Drive verbunden. ${n} Backup(s) gefunden.`,'success');}
   catch(e){announce('✓ Google angemeldet, aber Backup-Liste konnte nicht geladen werden: '+e.message,'error');}
  }catch(e){announce('Google-Anmeldung fehlgeschlagen: '+e.message,'error');}
  finally{busy(false);}
 });
 logout.addEventListener('click',()=>{disconnectGoogleDrive();list.replaceChildren(new Option('Erst mit Google anmelden',''));announce('✓ Von Google Drive abgemeldet. Deine lokalen Daten bleiben erhalten.','success');connectedUI();});
 list.addEventListener('change',connectedUI);
 refresh.addEventListener('click',async()=>{busy(true);announce('Lade deine Backups aus Google Drive …','progress');try{const n=await driveList();announce(`✓ Backup-Liste aktualisiert: ${n} Backup(s) gefunden.`,'success');}catch(e){announce('Drive-Liste konnte nicht geladen werden: '+e.message,'error');}finally{busy(false);}});
 save.addEventListener('click',async()=>{
  if(!validNewPassword())return;
  busy(true);announce('Verschlüssele alle lokalen Daten auf diesem Gerät …','progress');
  try{const data=await createEncryptedBackup(password.value);announce('Lade das verschlüsselte Backup nach Google Drive hoch …','progress');
   const result=await uploadDriveBackup(data);confirmPass.value='';
   try{await driveList();announce(`✓ Backup erfolgreich in Google Drive gespeichert: ${result.name}.`,'success');}
   catch{announce(`✓ Backup erfolgreich in Google Drive gespeichert: ${result.name}. Die Liste konnte noch nicht aktualisiert werden.`,'success');}
  }catch(e){announce('Drive-Sicherung fehlgeschlagen: '+e.message+' Deine lokalen Daten wurden nicht verändert.','error');}
  finally{busy(false);}
 });
 async function importEnvelope(data){
  if(!document.getElementById('backupUnderstand').checked)throw Error('Bitte zuerst bestätigen, dass bestehende Daten ersetzt werden dürfen.');
  if(!password.value)throw Error('Backup-Passwort fehlt.');
  const snapshot=await decryptBackup(data,password.value),info=validateSnapshot(snapshot);
  if(!window.confirm(`Verschlüsseltes Backup geprüft: ${info.count} Datenbankeinträge. Wirklich ALLE lokalen Daten der fünf Module ersetzen?`))return null;
  const count=await restoreSnapshot(snapshot);password.value='';confirmPass.value='';
  setTimeout(()=>location.reload(),950);return count;
 }
 restore.addEventListener('click',async()=>{
  if(!list.value){announce('Bitte zuerst eine Drive-Sicherung auswählen.','error');return;}
  if(!document.getElementById('backupUnderstand').checked){announce('Bitte den Datenersatz zuerst bestätigen.','error');return;}
  if(!password.value){announce('Passwort für die gewählte Sicherung eingeben.','error');return;}
  busy(true);announce('Lade verschlüsselte Datei aus Google Drive und prüfe das Passwort …','progress');
  try{const envelope=await downloadDriveBackup(list.value);const count=await importEnvelope(envelope);
   announce(count===null?'Wiederherstellung abgebrochen. Keine Daten geändert.':`✓ ${count} Datensätze wiederhergestellt. App wird neu geladen.`,count===null?'info':'success');
  }catch(e){announce('Drive-Wiederherstellung fehlgeschlagen: '+e.message+' Lokale Daten bleiben unverändert.','error');}
  finally{busy(false);}
 });
 exportButton.addEventListener('click',async()=>{
  if(!validNewPassword())return;
  busy(true);announce('Erstelle und verschlüssele lokale Sicherungsdatei …','progress');
  try{const data=await createEncryptedBackup(password.value);const file=triggerBackupDownload(data);confirmPass.value='';announce(`✓ Verschlüsselte Datei heruntergeladen: ${file}.`,'success');}
  catch(e){announce('Sicherung fehlgeschlagen: '+e.message,'error');}
  finally{busy(false);}
 });
 importButton.addEventListener('click',async()=>{
  const file=document.getElementById('backupFile').files[0];
  if(!file){announce('Bitte eine .meinalltag-Datei auswählen.','error');return;}
  if(file.size>180*1024*1024){announce('Backup-Datei zu groß (maximal 180 MB).','error');return;}
  busy(true);announce('Prüfe und entschlüssele die lokale Sicherungsdatei …','progress');
  try{const count=await importEnvelope(JSON.parse(await file.text()));announce(count===null?'Import abgebrochen. Keine Daten geändert.':`✓ ${count} Datensätze wiederhergestellt. App wird neu geladen.`,count===null?'info':'success');}
  catch(e){announce('Wiederherstellung fehlgeschlagen: '+e.message+' Lokale Daten wurden nicht verändert.','error');}
  finally{busy(false);}
 });
 connectedUI();
}
export function render(){
 const route=hashRoute();
 const labels={home:['Mein Alltag','STRUKTURIERT. EINFACH. DEIN.'],calendar:['Kalender','DEINE ÜBERSICHT'],search:['Suche','SCHNELL ZUM BEREICH'],more:['Mein Alltag','MEHR & EINSTELLUNGEN']};
 const [title,sub]=route.page==='lagerartikel'?['Lagerhaus','ARTIKELVERWALTUNG']:route.page==='lagerraum'?['Lagerhaus','3D-LAGERRAUM']:route.page==='lagernavigator'?['Lagerhaus','LAGER-NAVIGATOR']:route.page==='lagerservice'?['Lagerhaus','GERÄTE & SERVICE']:route.page==='module'?[byId[route.id].name,'DEIN EIGENER BEREICH']:labels[route.page];
 appTitle.textContent=title;appSubtitle.textContent=sub;
 backButton.hidden=route.page==='home';
 document.querySelectorAll('.nav-item').forEach(item=>{const active=item.dataset.route===route.page;item.classList.toggle('active',active);if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');});
 view.innerHTML=route.page==='home'?renderHome():route.page==='module'?(route.id==='lagerhaus'?renderLagerhaus():route.id==='frauengesundheit'?renderHealth():route.id==='putzmanager'?renderPutzmanager():renderModule(byId[route.id])):route.page==='lagerartikel'?renderLagerartikel():route.page==='lagerraum'?renderLagerraum():route.page==='lagernavigator'?renderLagerNavigator():route.page==='lagerservice'?renderLagerService():route.page==='calendar'?renderCalendar():route.page==='search'?renderSearch():renderMore();
 document.body.classList.toggle('health-mode',route.page==='module'&&route.id==='frauengesundheit');
 view.scrollTop=0;bindView(route);
 document.getElementById('installAction')?.addEventListener('click',requestInstall);
 refreshInstallUI();
}
backButton.addEventListener('click',()=>{if(history.length>1)history.back();else navigate('home');});
document.getElementById('settingsButton').addEventListener('click',()=>navigate('more'));
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));
let renderedHash=location.hash;
window.addEventListener('hashchange',()=>{
 if(renderedHash.startsWith('#/module/frauengesundheit') && location.hash!==renderedHash && !confirmHealthExit()){
  history.replaceState(null,'',renderedHash);return;
 }
 renderedHash=location.hash;render();
});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('#lagerShelfPanel[open]')&&!backButton.hidden){if(history.length>1)history.back();else navigate('home');}});
if(!location.hash)history.replaceState(null,'','#/home');
render();
openDatabase().catch(err=>console.warn('IndexedDB nicht verfügbar:',err));

if('serviceWorker' in navigator && location.protocol!=='file:'){
 window.addEventListener('load',async()=>{
   try{
     const registration=await navigator.serviceWorker.register('./sw.js');
     const banner=document.getElementById('updateBanner');
     let alreadyControlled=Boolean(navigator.serviceWorker.controller);
     function showUpdate(){if(registration.waiting && alreadyControlled)banner.hidden=false;}
     if(registration.waiting)showUpdate();
     registration.addEventListener('updatefound',()=>{const w=registration.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed')showUpdate();});});
     document.getElementById('updateButton').addEventListener('click',()=>registration.waiting?.postMessage({type:'SKIP_WAITING'}));
     navigator.serviceWorker.addEventListener('controllerchange',()=>{if(alreadyControlled)window.location.reload();else alreadyControlled=true;});
   }catch(e){console.warn('Offline-Funktion derzeit nicht verfügbar:',e);}
 });
}
