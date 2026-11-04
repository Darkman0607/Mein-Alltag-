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
import {readRewardOverview} from './reward-data.js';
import {loadRewardAlbum} from './reward-album.js';
import {renderRewardAlbum,mountRewardAlbum} from './reward-album-ui.js';
import {renderRewardEconomy,mountRewardEconomy} from './reward-economy-ui.js';
import {renderRewardShop,mountRewardShop} from './reward-shop-ui.js';
import {prepareGoogleIdentity,connectGoogleDrive,disconnectGoogleDrive,isDriveConnected,getGoogleClientId,saveGoogleClientId,validateGoogleClientId,listDriveBackups,uploadDriveBackup,downloadDriveBackup} from './google-drive.js';

export const APP_VERSION='0.24.6';
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
  if(part[0]==='reward')return {page:'reward',section:['album','booster','shop','missionen','more','wunschliste','herstellung'].includes(part[1])?part[1]:'start'};
  if(['home','calendar','search','more','overview','messages'].includes(part[0])) return {page:part[0]};
  return {page:'home'};
}
export function navigate(page,id){
  const newHash=page==='module' && byId[id] ? `#/module/${id}`:page==='reward'&&id?`#/reward/${id}`:`#/${page}`;
  if(location.hash===newHash){render();return;}
  location.hash=newHash;
}
function section(title,subtitle=''){return `<div class="section-heading"><span class="eyebrow">Mein Alltag · Beta V${APP_VERSION}</span><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>`;}
function bwIcon(name){
 const paths={
  home:'<path d="m3 10 9-7 9 7v10h-7v-7h-4v7H3z"/>',
  overview:'<path d="M4 21v-9h4v9M10 21V5h4v16M16 21v-13h4v13"/>',
  messages:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10M10 21h4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  search:'<circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/>',
  album:'<path d="M12 6q-4-3-9-2v15q5-1 9 2m0-15q4-3 9-2v15q-5-1-9 2M12 6v15"/>',
  booster:'<rect x="7" y="4" width="14" height="17" rx="2" transform="rotate(7 14 13)"/><path d="M9 1v2m-4 5 1 1M14 9l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
  shop:'<path d="M3 9h18l-2-5H5L3 9ZM5 9v12h14V9M9 21v-8h6v8"/>',
  missionen:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
 };
 return `<svg class="bw-nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.more}</svg>`;
}
function renderHome(){
  const reward={id:'belohnungswelt',name:'Belohnungswelt',subtitle:'Karten sammeln & Belohnungen'};
  const entries=[...MODULES,reward];
  return `<section class="bw-home" aria-label="Mein Alltag – Hauptmenü">
    <div class="bw-home-head"><div class="bw-mountain-mist"></div><div class="bw-roof" aria-hidden="true">⌂</div>
      <h1>Mein Alltag</h1><p>Deine Alltagszentrale</p>
      <button type="button" class="bw-header-action bw-head-left" data-navigate="more" aria-label="Einstellungen öffnen">${bwIcon('settings')}</button>
      <button type="button" class="bw-header-action bw-head-right" data-navigate="messages" aria-label="Mitteilungen öffnen">${bwIcon('messages')}</button>
    </div>
    <div class="bw-home-modules">${entries.map(m=>`<button type="button" class="bw-module" data-open="${m.id}" aria-label="${esc(m.name)} öffnen"><img src="./assets/bw00/${m.id}.webp" alt="" draggable="false"><span>${m.id==='hausservice'?'M.R<br>Hausservice':esc(m.name)}</span></button>`).join('')}</div>
    <div class="bw-home-end"><span>MEIN ALLTAG · BETA V${APP_VERSION}</span><button class="bw-install" id="installAction" type="button">App installieren – Anleitung</button><p id="installHelp" aria-live="polite" class="install-help"></p></div>
  </section>`;
}
const BW_TAB_ICONS={album:'▣',booster:'✦',shop:'▤',missionen:'◎',more:'•••'};
function rewardBottomNav(current){
 const items=[['album','Album'],['booster','Booster'],['shop','Shop'],['missionen','Missionen'],['more','Mehr']];
 return items.map(([id,name])=>`<button type="button" class="nav-item bw-reward-nav ${current===id?'active':''}" data-reward="${id}" aria-label="${name}" ${current===id?'aria-current="page"':''}><span class="bw-nav-icon" aria-hidden="true">${bwIcon(id)}</span><span>${name}</span></button>`).join('');
}
function renderReward(route){
 const tab=route.section||'start';
 const titles={start:'Deine Karten- & Belohnungszentrale',album:'Dein Kartenalbum',booster:'Deine Booster',shop:'Booster-Shop',missionen:'Missionen & Erfolge',more:'Weitere Funktionen',wunschliste:'Deine Wunschliste',herstellung:'Kartenherstellung'};
 const panel=tab==='start'?`<div class="bw-reward-hero">
     <div class="bw-reward-hero-light"></div><img src="./assets/bw00/hero_dragon.webp" alt="Designbeispiel: Karte mit blauem Fantasy-Drachen" draggable="false"/>
     <div class="bw-hero-label"><strong>Deine besondere Karte</strong><span>Designvorschau · noch keine Karte gesammelt</span></div>
    </div>
    <button class="bw-progress" type="button" data-reward="album" aria-label="Sammlungsalbum öffnen"><span class="bw-progress-icon" aria-hidden="true">▤</span><span class="bw-progress-copy"><strong>Sammelfortschritt</strong><span>0 / 100 Karten</span><span class="bw-progress-track"><span style="width:0%"></span></span></span><b>0%</b></button>
    <p class="bw-note">BW05: Booster aus dem Shop können jetzt geöffnet werden. Pro Pack erhältst du fünf zufällige Kartenexemplare. Öffnungen werden dauerhaft im Album und Journal gespeichert.</p>`:
    tab==='album'?renderRewardAlbum():
    tab==='booster'?renderRewardShop('booster'):
    tab==='shop'?renderRewardShop('shop'):
    tab==='missionen'?renderRewardEconomy():
    tab==='wunschliste'?`<div class="bw-empty-panel"><span class="bw-panel-symbol">♡</span><h2>Wunschliste</h2><p>Hier werden später gesuchte Karten und fehlende Lieblingskarten gesammelt.</p><p class="bw-muted">Noch keine Karten vorgemerkt.</p></div>`:
    tab==='herstellung'?`<div class="bw-empty-panel"><span class="bw-panel-symbol">⚒</span><h2>Kartenherstellung</h2><p>Karten bis Mythisch sollen aus Splittern herstellbar sein. Diamant-Karten bleiben exklusiv für Booster und Herausforderungen.</p><p class="bw-muted">Die Herstellung folgt in einem späteren Update.</p></div>`:
    `<div class="bw-empty-panel"><h2>Weitere Funktionen</h2><p>BW05: Kartenalbum, XP/Münzen, Booster-Shop und sichere Fünf-Karten-Öffnung sind aktiv. Handel, Herstellung und Belohnungskalender folgen später.</p><p id="bwStorageStatus" role="status">Prüfe neuen Datenspeicher …</p><div class="bw-quicklinks"><button data-reward="wunschliste" type="button">♡ Wunschliste</button><button data-reward="herstellung" type="button">⚒ Herstellung</button><button data-navigate="more" type="button">⚙ App-Einstellungen</button></div></div>`;
 return `<section class="bw-reward-scene" aria-label="Belohnungswelt"><div class="bw-reward-head"><button class="bw-reward-back" type="button" data-navigate="home" aria-label="Zurück zum Hauptmenü">‹</button><div class="bw-reward-head-center"><span class="bw-reward-logo"><img src="./assets/bw00/belohnungswelt.webp" alt="" draggable="false"/></span><h1>Belohnungswelt</h1><p>${esc(titles[tab])}</p></div><button class="bw-reward-info" type="button" data-reward="more" aria-label="Weitere Funktionen">ⓘ</button></div>
  <div class="bw-reward-wallet" aria-label="Dein Guthaben"><div class="bw-wallet-xp"><span>★</span><strong id="bwWalletXp">0 XP</strong></div><div class="bw-wallet-coins"><span>🪙</span><strong id="bwWalletCoins">0</strong></div><div class="bw-wallet-splitters"><span>💎</span><strong id="bwWalletShards">0</strong></div></div>
  <div class="bw-reward-body">${panel}</div>
  </section>`;
}
async function mountRewardStorage(route){
 const status=document.getElementById('bwStorageStatus');
 const container=document.querySelector('.bw-reward-scene');
 if(!container)return;
 try{
  const summary=await readRewardOverview();
  if(!container.isConnected)return;
  const wallet=summary.wallet||{xp:0,coins:0,shards:0};
  for(const [id,value] of [['bwWalletXp',String(wallet.xp||0)+' XP'],['bwWalletCoins',wallet.coins||0],['bwWalletShards',wallet.shards||0]]){
   const target=container.querySelector('#'+id);if(target)target.textContent=String(value);
  }
  if(status)status.textContent=`Datenspeicher bereit (Schema ${summary.schemaVersion}). ${summary.catalogCards} Karten im Katalog · ${summary.ownedCopies} Exemplare · ${summary.unopenedBoosters} ungeöffnete Booster. XP- und Münzbuchungen sind für ausdrücklich freigegebene Raumreinigungen möglich.`;
  if(route.section==='start'){
   const album=await loadRewardAlbum();if(!container.isConnected)return;
   const progress=container.querySelector('.bw-progress');
   if(progress){progress.querySelector('.bw-progress-copy>span').textContent=`${album.uniqueOwned} / ${album.total} Karten`;
    progress.querySelector('.bw-progress-track span').style.width=album.percent+'%';
    progress.querySelector('b').textContent=album.percent+'%';}
  }
 }catch(e){if(status&&status.isConnected)status.textContent='Datenspeicher nicht verfügbar: '+e.message;
  else if(container.isConnected){const note=container.querySelector('.bw-note');if(note)note.textContent='Speicher konnte nicht geladen werden: '+e.message;}}
}
function renderOverview(){return `${section('Übersicht','Alles Wichtige schnell erreichen.')}<div class="glass-card"><h2>Deine Übersicht</h2><p>Wähle eine Funktion, die du öffnen möchtest.</p><button type="button" class="row-link" data-navigate="calendar"><span>📅 Kalender</span><span>›</span></button><button type="button" class="row-link" data-navigate="search"><span>⌕ Suche</span><span>›</span></button><button type="button" class="row-link" data-navigate="reward"><span>🎴 Belohnungswelt</span><span>›</span></button></div>`;}
function renderMessages(){return `${section('Mitteilungen','Deine Informationszentrale.')}<div class="glass-card"><h2>Keine neuen Mitteilungen</h2><p>Benachrichtigungen werden erst angezeigt, wenn die jeweiligen Module entsprechende Ereignisse unterstützen. Die angezeigte Null ist kein erfundener Datenbestand.</p><button type="button" class="secondary-button" data-navigate="home">Zur Startseite</button></div>`;}

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
function renderMore(){return `${section('Mehr & Einstellungen','Lokaler Speicher und sichere Backups.')}<div class="glass-card"><h2>App-Version</h2><p>Mein Alltag · Beta V${APP_VERSION}</p><p>Die fünf Alltagsmodule und die Belohnungswelt speichern Daten lokal. Google Drive überträgt Daten ausschließlich beim manuellen Sichern oder Wiederherstellen.</p></div><div class="glass-card"><h2>Lokaler Datenspeicher</h2><div id="storageStatus" role="status"><p>Prüfe Datenbank …</p></div></div>
<div class="glass-card backup-card" id="backupManager"><h2>🔐 Verschlüsseltes Gesamtbackup</h2><p>Alle sechs Bereiche, Fotos und Belege werden vor dem Speichern mit <strong>AES-256-GCM</strong> verschlüsselt. Kein automatischer Cloud-Abgleich.</p><p><strong>Wichtig:</strong> Das Passwort wird nicht gespeichert. Ohne Passwort kann das Backup nicht wiederhergestellt werden. Die lokalen Daten auf diesem Gerät sind weiterhin nicht separat verschlüsselt.</p>
<label class="field-label" for="backupPassword">Backup-Passwort (mindestens 12 Zeichen)</label><input class="search-input" id="backupPassword" type="password" autocomplete="new-password" minlength="12" placeholder="Eigenes sicheres Backup-Passwort"/>
<label class="field-label" for="backupPasswordConfirm">Passwort für neue Sicherung wiederholen</label><input class="search-input" id="backupPasswordConfirm" type="password" autocomplete="new-password" minlength="12" placeholder="Passwort erneut eingeben"/>
<h3>📁 Google Drive</h3><p>Manuell in deinem Google Drive im sichtbaren Ordner <strong>Mein Alltag Backups</strong> sichern und von dort wiederherstellen. Google erhält nur verschlüsselte Dateien.</p>
<details class="drive-setup" id="googleDriveSetup"><summary>Google Drive einmalig einrichten</summary><p>Für die Anmeldung über GitHub Pages benötigt Mein Alltag eine kostenlose Google-Cloud-OAuth-Client-ID für Webanwendungen. Google Drive API aktivieren; als autorisierte JavaScript-Quelle <code>${esc(location.origin)}</code> eintragen. Anleitung: <a href="./GOOGLE_DRIVE_EINRICHTUNG.md" target="_blank" rel="noopener">GOOGLE_DRIVE_EINRICHTUNG.md</a></p><label class="field-label" for="googleClientId">Google OAuth-Client-ID (kein Passwort)</label><input class="search-input" id="googleClientId" type="text" autocomplete="off" spellcheck="false" placeholder="123456789-abc.apps.googleusercontent.com"/><button type="button" class="primary-button backup-main" id="googleSaveClientId">Client-ID auf diesem Gerät speichern</button><p class="drive-action-inline" id="googleSetupFeedback" role="status" aria-live="polite"></p></details>
<p class="drive-connect-status" id="googleConnection" role="status">Google Drive: nicht verbunden.</p><div class="drive-button-row"><button class="primary-button" type="button" id="googleLogin">Mit Google anmelden</button><button class="primary-button drive-secondary" type="button" id="googleLogout" disabled>Abmelden</button></div>
<button class="primary-button backup-main" type="button" id="driveSave" disabled>Verschlüsseltes Backup in Google Drive speichern</button>
<button class="primary-button backup-main drive-secondary" type="button" id="driveRefresh" disabled>Backups in Drive anzeigen / aktualisieren</button>
<label class="field-label" for="driveBackupList">Drive-Backup zur Wiederherstellung auswählen</label><select class="search-input drive-select" id="driveBackupList" disabled><option value="">Erst mit Google anmelden</option></select>
<p class="module-privacy">⚠️ Wiederherstellen ersetzt die im gewählten Backup enthaltenen Bereiche. Bei alten Sicherungen bleiben Belohnungswelt-Daten erhalten. Du benötigst das Backup-Passwort.</p>
<label class="backup-check"><input type="checkbox" id="backupUnderstand"/> Ich habe meine bisherigen lokalen Daten gesichert und stimme dem Ersetzen der im Backup enthaltenen Bereiche zu.</label>
<button class="primary-button backup-main backup-import" type="button" id="driveRestore" disabled>Aus Google Drive wiederherstellen</button>
<hr><h3>Offline-Alternative: Backup-Datei</h3>
<button class="primary-button backup-main drive-secondary" id="backupExport" type="button">Verschlüsseltes Backup herunterladen</button>
<label class="field-label" for="backupFile">Lokale Sicherungsdatei (.meinalltag)</label><input class="backup-file" id="backupFile" type="file" accept=".meinalltag,application/octet-stream,application/json"/>
<button class="primary-button backup-main backup-import" id="backupImport" type="button">Backup-Datei mit Passwort importieren</button>
<p class="backup-result" role="status" aria-live="polite" id="backupResult"></p></div>
<div class="glass-card"><h2>App installieren</h2><p id="installStatus">Installation prüfen …</p><button type="button" class="primary-button" id="installAction">App installieren – Anleitung</button><p id="installHelp" aria-live="polite" class="install-help"></p><p>Alternativ: Chrome-Menü ⋮ → Zum Startbildschirm hinzufügen. Der Android-Browser entscheidet, ob eine App oder eine Verknüpfung erstellt wird.</p></div><button type="button" class="row-link" id="checkUpdate"><span>Auf Updates prüfen</span><span>↻</span></button><p id="moreMessage" class="module-privacy" role="status"></p>`;}
async function loadStorage(){const node=document.getElementById('storageStatus');if(!node)return;try{const names=await getStoreNames();const sizes=await Promise.all(MODULE_STORES.map(getModuleCount));if(!node.isConnected)return;node.innerHTML=`<div class="storage-line"><span>Datenbank</span><strong>${esc(DB_NAME)} · v${DB_VERSION}</strong></div>${[...MODULES,{name:'Belohnungswelt'}].map((m,i)=>`<div class="storage-line"><span>${esc(m.name)}</span><strong>${sizes[i]} Eintrag${sizes[i]===1?'':'e'}</strong></div>`).join('')}<p style="margin-top:13px">Getrennte Speicherbereiche: ${names.length} (6 Bereiche + 7 Belohnungs-Speicher + Metadaten)</p>`;}catch(e){if(node.isConnected)node.textContent=`Speicher nicht verfügbar: ${e.message}`;}}
async function loadNote(id){const field=document.getElementById('moduleNote');if(!field)return;try{const data=await getModuleValue(id,'startNote');if(field.isConnected)field.value=typeof data==='string'?data:'';}catch(e){const msg=document.getElementById('saveMessage');if(msg)msg.textContent=`Speicherfehler: ${e.message}`;}}
async function saveNote(id){const field=document.getElementById('moduleNote');const msg=document.getElementById('saveMessage');if(!field||!msg)return;const value=field.value;try{await setModuleValue(id,'startNote',value);if(msg.isConnected)msg.textContent='Gespeichert ✓';}catch(e){if(msg.isConnected)msg.textContent=`Fehler: ${e.message}`;}}
function bindView(route){
 view.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>el.dataset.open==='belohnungswelt'?navigate('reward'):navigate('module',el.dataset.open)));
 view.querySelector('[data-go-home]')?.addEventListener('click',()=>navigate('home'));
 view.querySelectorAll('[data-navigate]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.navigate)));
 view.querySelectorAll('[data-reward]').forEach(el=>el.addEventListener('click',()=>navigate('reward',el.dataset.reward)));
 if(route.page==='reward'){mountRewardStorage(route);if(route.section==='album')mountRewardAlbum();if(route.section==='missionen')mountRewardEconomy(()=>mountRewardStorage(route));if(['shop','booster'].includes(route.section))mountRewardShop();}
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
  const detail=info.legacy?'ALT-BACKUP (5 Module): Die fünf alten Module und Metadaten werden ersetzt. Deine bereits gespeicherten Belohnungswelt-Daten bleiben erhalten.':'AKTUELLES BACKUP (6 Bereiche): Alle sechs Bereiche einschließlich Belohnungswelt werden ersetzt.';
  if(!window.confirm(`Verschlüsseltes Backup geprüft: ${info.count} Datenbankeinträge.\n${detail}\nFortfahren?`))return null;
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
function defaultBottomNav(){return `
  <button type="button" class="nav-item" data-route="home" aria-label="Start"><span class="bw-nav-icon" aria-hidden="true">${bwIcon('home')}</span><span>Start</span></button>
  <button type="button" class="nav-item" data-route="calendar" aria-label="Kalender"><span class="bw-nav-icon" aria-hidden="true">${bwIcon('calendar')}</span><span>Kalender</span></button>
  <button type="button" class="nav-item" data-route="search" aria-label="Suche"><span class="bw-nav-icon" aria-hidden="true">${bwIcon('search')}</span><span>Suche</span></button>
  <button type="button" class="nav-item" data-route="more" aria-label="Mehr"><span class="bw-nav-icon" aria-hidden="true">${bwIcon('more')}</span><span>Mehr</span></button>`;}
function homeBottomNav(){return `
  <button type="button" class="nav-item" data-route="home" aria-current="page" aria-label="Start"><span class="bw-nav-icon" aria-hidden="true">${bwIcon('home')}</span><span>Start</span></button>
  <button type="button" class="nav-item" data-route="overview" aria-label="Übersicht"><span class="bw-nav-icon" aria-hidden="true">${bwIcon('overview')}</span><span>Übersicht</span></button>
  <button type="button" class="nav-item" data-route="messages" aria-label="Mitteilungen"><span class="bw-nav-icon" aria-hidden="true">${bwIcon('messages')}</span><span>Mitteilungen</span></button>
  <button type="button" class="nav-item" data-route="more" aria-label="Einstellungen"><span class="bw-nav-icon" aria-hidden="true">${bwIcon('settings')}</span><span>Einstellungen</span></button>`;}
export function render(){
 const route=hashRoute();
 const labels={home:['Mein Alltag','STRUKTURIERT. EINFACH. DEIN.'],calendar:['Kalender','DEINE ÜBERSICHT'],search:['Suche','SCHNELL ZUM BEREICH'],more:['Mein Alltag','MEHR & EINSTELLUNGEN'],overview:['Übersicht','DEINE ALLTAGSZENTRALE'],messages:['Mitteilungen','NEUIGKEITEN'],reward:['Belohnungswelt','DEINE KARTENSAMMLUNG']};
 const [title,sub]=route.page==='lagerartikel'?['Lagerhaus','ARTIKELVERWALTUNG']:route.page==='lagerraum'?['Lagerhaus','3D-LAGERRAUM']:route.page==='lagernavigator'?['Lagerhaus','LAGER-NAVIGATOR']:route.page==='lagerservice'?['Lagerhaus','GERÄTE & SERVICE']:route.page==='module'?[byId[route.id].name,'DEIN EIGENER BEREICH']:labels[route.page];
 appTitle.textContent=title;appSubtitle.textContent=sub;
 backButton.hidden=route.page==='home';
 view.innerHTML=route.page==='home'?renderHome():route.page==='reward'?renderReward(route):route.page==='overview'?renderOverview():route.page==='messages'?renderMessages():route.page==='module'?(route.id==='lagerhaus'?renderLagerhaus():route.id==='frauengesundheit'?renderHealth():route.id==='putzmanager'?renderPutzmanager():renderModule(byId[route.id])):route.page==='lagerartikel'?renderLagerartikel():route.page==='lagerraum'?renderLagerraum():route.page==='lagernavigator'?renderLagerNavigator():route.page==='lagerservice'?renderLagerService():route.page==='calendar'?renderCalendar():route.page==='search'?renderSearch():renderMore();
 document.body.classList.toggle('health-mode',route.page==='module'&&route.id==='frauengesundheit');
 document.body.classList.toggle('home-mode',route.page==='home');
 document.body.classList.toggle('reward-mode',route.page==='reward');
 const nav=document.querySelector('.bottom-nav');
 if(route.page==='reward')nav.innerHTML=rewardBottomNav(route.section);
 else if(route.page==='home')nav.innerHTML=homeBottomNav();
 else nav.innerHTML=defaultBottomNav();
 nav.querySelectorAll('[data-route]').forEach(el=>{const active=el.dataset.route===route.page;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');el.addEventListener('click',()=>navigate(el.dataset.route));});
 nav.querySelectorAll('[data-reward]').forEach(el=>el.addEventListener('click',()=>navigate('reward',el.dataset.reward)));
 view.scrollTop=0;bindView(route);
 document.getElementById('installAction')?.addEventListener('click',requestInstall);
 refreshInstallUI();
}
backButton.addEventListener('click',()=>{if(history.length>1)history.back();else navigate('home');});
document.getElementById('settingsButton').addEventListener('click',()=>navigate('more'));

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
