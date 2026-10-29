/** Lernschule LS02 – Lesebibliothek und lokaler, sitzungsgebundener Admin-Zugang.
 * Nur Lernschul-Admin-Einstellungen werden getrennt im vorhandenen IDB-Store gespeichert.
 * Ein lokaler Passwortschutz kann bei Manipulation des Geräts/Browsers umgangen werden.
 */
import {getModuleValue,setModuleValue} from '../assets/database.js';
export const LEARNING_KEY='health.lernschule.library.v1';
export const LEARNING_ADMIN_KEY='health.lernschule.admin.v1';
const STORE='frauengesundheit';
const text=v=>String(v??'');
const escapeHTML=s=>text(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TOPICS=[
 ['anatomie','Weibliche Anatomie','Organe und Körperwissen',['Äußere Geschlechtsorgane','Innere Geschlechtsorgane','Hormone und Körperfunktionen']],
 ['zyklus','Menstruation & Zyklus','Grundlagen und Veränderungen',['Zyklusphasen','Menstruation','Zyklusbeobachtungen']],
 ['hygiene','Intimhygiene & Körperwissen','Pflege und Körperwahrnehmung',['Intimhygiene','Körperwahrnehmung']],
 ['brust','Brustgesundheit','Entwicklung und Vorsorge',['Aufbau der Brust','Brustgesundheit und Vorsorge']],
 ['sexualitaet','Sexualgesundheit & Fruchtbarkeit','Verhütung und Fruchtbarkeit',['Sexualgesundheit','Verhütung','Fruchtbarkeit']],
 ['schwangerschaft','Schwangerschaft & Geburt','Schwangerschaft bis Wochenbett',['Schwangerschaft','Geburt','Wochenbett']],
 ['untersuchungen','Untersuchungen & Vorsorge','Untersuchungen und Befunde',['Gynäkologische Untersuchungen','Vorsorge und Befunde','Medizinische Verfahren']]
];
export const createLearningLibrary=()=>({schema:1,topics:TOPICS.map(([id,title,subtitle,chapters])=>({id,title,subtitle,chapters:chapters.map((name,i)=>({id:`${id}-kap-${i+1}`,title:name,sections:[]}))}))});
export function validateLearningLibrary(data){
 if(!data||data.schema!==1||!Array.isArray(data.topics))throw new Error('Ungültige Lernschul-Daten.');
 const ids=new Set();
 for(const t of data.topics){
  if(!t||typeof t.id!=='string'||typeof t.title!=='string'||!Array.isArray(t.chapters)||ids.has(t.id))throw new Error('Ungültiges Lernthema.');
  ids.add(t.id);
  for(const c of t.chapters)if(!c||typeof c.id!=='string'||typeof c.title!=='string'||!Array.isArray(c.sections))throw new Error('Ungültiges Lernkapitel.');
 }
 return data;
}
let library=createLearningLibrary(),topicId='',chapterId='',query='',error='';
let adminConfig=null,adminSession=false,adminView='',adminNotice='',adminError='',oneTimeCode='';
export function clearLearningView(){topicId='';chapterId='';query='';error='';adminView='';adminNotice='';adminError='';oneTimeCode='';}
export async function loadLearning(){
 try{
  const saved=await getModuleValue(STORE,LEARNING_KEY);
  if(saved===null){const defaults=createLearningLibrary();await setModuleValue(STORE,LEARNING_KEY,defaults);library=defaults;}
  else library=validateLearningLibrary(saved);
  const config=await getModuleValue(STORE,LEARNING_ADMIN_KEY);
  if(config!==null){if(!validAdminConfig(config))throw new Error('Admin-Einstellungen beschädigt.');adminConfig=config;}
  else adminConfig=null;
  error='';
 }catch(e){error='Lernschule konnte nicht geladen werden: '+e.message;}
 return !error;
}
// PBKDF2-SHA256: Salt und Prüfsummen liegen auf dem eigenen Gerät; Klartext nie persistieren.
const ADMIN_ROUNDS=250000;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=str=>new Uint8Array(str.match(/.{2}/g)?.map(v=>parseInt(v,16))||[]);
function randomHex(length){const a=new Uint8Array(length);crypto.getRandomValues(a);return hex(a);}
function validHash(v){return !!v&&typeof v.salt==='string'&&/^[a-f0-9]{32}$/.test(v.salt)&&typeof v.hash==='string'&&/^[a-f0-9]{64}$/.test(v.hash)&&v.rounds===ADMIN_ROUNDS;}
function validAdminConfig(v){return !!v&&v.schema===1&&validHash(v.password)&&validHash(v.recovery);}
async function hashSecret(secret,salt){
 if(!crypto?.subtle)throw new Error('Passwortschutz benötigt eine sichere HTTPS-/localhost-Verbindung.');
 const input=new TextEncoder().encode(secret);
 const key=await crypto.subtle.importKey('raw',input,'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:ADMIN_ROUNDS,hash:'SHA-256'},key,256);
 return hex(new Uint8Array(bits));
}
async function makeProof(secret){const salt=randomHex(16);return {salt,rounds:ADMIN_ROUNDS,hash:await hashSecret(secret,salt)};}
async function verifyProof(secret,proof){
 const candidate=unhex(await hashSecret(secret,proof.salt)),real=unhex(proof.hash);
 let diff=0;for(let i=0;i<real.length;i++)diff|=candidate[i]^real[i];return diff===0;
}
function checkNewPassword(p,repeat){if(p.length<12||p.length>128)throw new Error('Das Admin-Passwort muss 12 bis 128 Zeichen haben.');if(p!==repeat)throw new Error('Die beiden Passwörter stimmen nicht überein.');}
function freshRecovery(){return randomHex(20).match(/.{1,4}/g).join('-').toUpperCase();}
function normalizeRecovery(v){return text(v).replace(/[\s-]/g,'').toUpperCase();}
async function setNewAdmin(password,repeat,recovery){
 checkNewPassword(password,repeat);
 const code=freshRecovery();const config={schema:1,password:await makeProof(password),recovery:await makeProof(normalizeRecovery(code))};
 await setModuleValue(STORE,LEARNING_ADMIN_KEY,config);
 adminConfig=config;adminSession=true;oneTimeCode=code;adminView='recoveryReady';adminError='';
 adminNotice=recovery?'Das alte Passwort wurde mit dem Wiederherstellungscode zurückgesetzt.':'Admin-Passwort eingerichtet.';
}
async function adminAction(action,data){
 adminError='';adminNotice='';
 if(action==='setup'){
  if(adminConfig)throw new Error('Ein Admin-Passwort ist bereits eingerichtet.');
  await setNewAdmin(data.get('password')||'',data.get('repeat')||'',false);return;
 }
 if(action==='login'){
  if(!adminConfig)throw new Error('Bitte zuerst das Admin-Passwort einrichten.');
  if(!await verifyProof(data.get('password')||'',adminConfig.password))throw new Error('Admin-Passwort falsch.');
  adminSession=true;adminView='';adminNotice='Admin-Modus freigeschaltet.';return;
 }
 if(action==='reset'){
  if(!adminConfig)throw new Error('Es gibt noch kein Admin-Passwort.');
  const code=normalizeRecovery(data.get('recovery')||'');
  if(!await verifyProof(code,adminConfig.recovery))throw new Error('Wiederherstellungscode falsch.');
  await setNewAdmin(data.get('password')||'',data.get('repeat')||'',true);return;
 }
 throw new Error('Unbekannte Admin-Aktion.');
}
const passwordInput=(name,title,autocomplete)=>`<label class="ls-admin-label">${title}<input name="${name}" type="password" minlength="12" maxlength="128" autocomplete="${autocomplete}" required></label>`;
function renderLearningAdmin(){
 const intro='<div class="ls-admin-heading"><span aria-hidden="true">🔐</span><div><strong>Lernschule verwalten</strong><p>Admin-Zugang nur für Änderungen an Lerninhalten.</p></div></div>';
 if(oneTimeCode)return `<section class="ls-admin" id="lsAdmin">${intro}<div class="ls-admin-success" role="status">${escapeHTML(adminNotice)}<p><strong>Wiederherstellungscode – nur jetzt sichtbar:</strong></p><code id="lsRecoveryCode">${escapeHTML(oneTimeCode)}</code><p>Diesen Code außerhalb der App sicher aufbewahren. Er wird nicht noch einmal angezeigt.</p></div><button type="button" class="ls-admin-primary" data-ls-admin-ack>Code sicher aufbewahrt – weiter</button></section>`;
 const status=adminNotice?`<div class="ls-admin-success" role="status">${escapeHTML(adminNotice)}</div>`:'';
 const problem=adminError?`<div class="ls-notice" role="alert">${escapeHTML(adminError)}</div>`:'';
 if(adminSession)return `<section class="ls-admin" id="lsAdmin">${intro}${status}${problem}<span class="ls-admin-pill">✓ Admin-Modus aktiv</span><p>Du kannst die Lernschule lesen. Die Funktionen zum Erstellen und Bearbeiten von Lektionen folgen mit LS03.</p><button type="button" class="ls-admin-secondary" data-ls-admin-logout>Admin abmelden</button></section>`;
 if(!adminConfig)return `<section class="ls-admin" id="lsAdmin">${intro}${problem}<p>Richte einmalig dein Admin-Passwort ein. Lesen bleibt ohne Anmeldung möglich.</p><form class="ls-admin-form" data-ls-admin-form="setup">${passwordInput('password','Neues Admin-Passwort (mindestens 12 Zeichen)','new-password')}${passwordInput('repeat','Passwort wiederholen','new-password')}<button type="submit" class="ls-admin-primary">Admin-Zugang einrichten</button></form></section>`;
 if(adminView==='reset')return `<section class="ls-admin" id="lsAdmin">${intro}${status}${problem}<p>Setze das Admin-Passwort mit deinem extern gesicherten Wiederherstellungscode zurück.</p><form class="ls-admin-form" data-ls-admin-form="reset"><label class="ls-admin-label">Wiederherstellungscode<input name="recovery" type="text" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-..."></label>${passwordInput('password','Neues Passwort (mindestens 12 Zeichen)','new-password')}${passwordInput('repeat','Neues Passwort wiederholen','new-password')}<button type="submit" class="ls-admin-primary">Passwort zurücksetzen</button></form><button type="button" class="ls-admin-text" data-ls-admin-show="login">Zur Anmeldung</button></section>`;
 return `<section class="ls-admin" id="lsAdmin">${intro}${status}${problem}<form class="ls-admin-form" data-ls-admin-form="login">${passwordInput('password','Admin-Passwort','current-password')}<button type="submit" class="ls-admin-primary">Admin anmelden</button></form><button type="button" class="ls-admin-text" data-ls-admin-show="reset">Passwort vergessen? Wiederherstellungscode verwenden</button></section>`;
}
export function renderLearning(){return renderLearningBase()+renderLearningAdmin();}
const countLessons=c=>(c.sections||[]).reduce((n,s)=>n+(s.lessons||[]).length,0);
const topicById=id=>library.topics.find(t=>t.id===id);
function renderLearningBase(){
 const topic=topicById(topicId),chapter=topic?.chapters?.find(c=>c.id===chapterId);
 const intro=`<div class="ls-header"><div class="ls-icon" aria-hidden="true">📚</div><div><span class="ls-overline">DEINE LERNSCHULE</span><h2>Wissen entdecken</h2><p>Themen, Kapitel und Lektionen – alles an einem Ort.</p></div></div><button class="ls-admin-jump" type="button" data-ls-admin-jump>🔐 Admin-Zugang ↓</button>`;
 if(error)return `${intro}<div class="ls-notice" role="alert">${escapeHTML(error)}</div>`;
 if(chapter)return `${intro}<div class="ls-trail"><button type="button" data-ls-back="topics">Alle Themen</button><span>›</span><button type="button" data-ls-back="chapters">${escapeHTML(topic.title)}</button></div><section class="ls-detail"><span class="ls-overline">KAPITEL</span><h3>${escapeHTML(chapter.title)}</h3><p>Dieses Kapitel ist vorbereitet. Es enthält noch keine Lektionen. Inhalte und Wissenstests folgen mit dem geschützten Lerneditor.</p><div class="ls-empty">Noch keine Unterkapitel oder Lektionen vorhanden.</div></section>`;
 if(topic)return `${intro}<div class="ls-trail"><button type="button" data-ls-back="topics">Alle Themen</button><span>›</span><b>${escapeHTML(topic.title)}</b></div><section class="ls-detail"><span class="ls-overline">LERNTHEMA</span><h3>${escapeHTML(topic.title)}</h3><p>${escapeHTML(topic.subtitle)}</p></section><div class="ls-stack">${topic.chapters.map(c=>`<button type="button" class="ls-item" data-ls-chapter="${escapeHTML(c.id)}"><span class="ls-chapter-icon">▤</span><span class="ls-item-main"><strong>${escapeHTML(c.title)}</strong><small>${countLessons(c)} Lektionen · vorbereitet</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`;
 const q=query.trim().toLocaleLowerCase('de-AT');
 const topics=library.topics.filter(t=>!q||[t.title,t.subtitle,...t.chapters.map(c=>c.title)].join(' ').toLocaleLowerCase('de-AT').includes(q));
 return `${intro}<div class="ls-intro"><strong>Deine persönliche Lernbibliothek</strong><p>Alle Themen sind bereits angelegt. Die Kapitel sind noch leer – es wurden keine medizinischen Inhalte vorgetäuscht.</p></div><label class="ls-search-label" for="lsSearch">Themen und Kapitel suchen<input id="lsSearch" type="search" maxlength="120" autocomplete="off" value="${escapeHTML(query)}" placeholder="z. B. Zyklus, Brust, Vorsorge"/></label><p class="ls-result-count" id="lsResultCount">${topics.length} von ${library.topics.length} Themen</p><div class="ls-grid" id="lsTopicResults">${topics.map((t,i)=>`<button type="button" class="ls-topic" data-ls-topic="${escapeHTML(t.id)}"><span class="ls-topic-symbol" aria-hidden="true">${['♡','◷','✿','◈','◇','❀','✚'][library.topics.indexOf(t)%7]}</span><strong>${escapeHTML(t.title)}</strong><small>${t.chapters.length} Kapitel · 0 Lektionen</small><span class="ls-topic-arrow" aria-hidden="true">›</span></button>`).join('')||'<div class="ls-empty">Keine passenden Themen gefunden.</div>'}</div><div class="ls-info"><strong>🔒 Lerninhalte verwalten</strong><p>Der Admin-Zugang ist jetzt verfügbar. Der Editor für eigene Lektionen und die Wissenstests folgen in weiteren Updates. Lesen bleibt ohne Anmeldung zugänglich.</p></div>`;
}
export function bindLearning(root,onChange){
 if(!root)return;
 root.querySelector('[data-ls-admin-jump]')?.addEventListener('click',()=>root.querySelector('#lsAdmin')?.scrollIntoView({behavior:'smooth',block:'start'}));
 root.querySelectorAll('[data-ls-admin-form]').forEach(form=>form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
  try{await adminAction(form.dataset.lsAdminForm,new FormData(form));}catch(err){adminError=err.message;}
  finally{button.disabled=false;onChange();}
 }));
 root.querySelector('[data-ls-admin-logout]')?.addEventListener('click',()=>{adminSession=false;adminView='';adminNotice='Admin-Modus beendet.';oneTimeCode='';onChange();});
 root.querySelector('[data-ls-admin-ack]')?.addEventListener('click',()=>{oneTimeCode='';adminNotice='Admin-Modus aktiv. Den Code außerhalb der App aufbewahren.';onChange();});
 root.querySelectorAll('[data-ls-admin-show]').forEach(b=>b.addEventListener('click',()=>{adminView=b.dataset.lsAdminShow;adminError='';adminNotice='';onChange();}));
 root.querySelector('#lsSearch')?.addEventListener('input',e=>{query=e.target.value;const temp=document.createElement('div');temp.innerHTML=renderLearning();root.querySelector('#lsTopicResults')?.replaceWith(temp.querySelector('#lsTopicResults'));root.querySelector('#lsResultCount')?.replaceWith(temp.querySelector('#lsResultCount'));bindTopicButtons(root,onChange);});
 bindTopicButtons(root,onChange);
 root.querySelectorAll('[data-ls-chapter]').forEach(b=>b.addEventListener('click',()=>{chapterId=b.dataset.lsChapter;onChange();}));
 root.querySelectorAll('[data-ls-back]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.lsBack==='topics'){topicId='';chapterId='';}else chapterId='';onChange();}));
}
function bindTopicButtons(root,onChange){root.querySelectorAll('[data-ls-topic]').forEach(b=>b.addEventListener('click',()=>{topicId=b.dataset.lsTopic;chapterId='';query='';onChange();}));}
