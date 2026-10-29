/** Lernschule LS04 – Rich-Text-Lektionen mit geordneten Medien- und Infobausteinen und Adminzugang.
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
  for(const c of t.chapters){
   if(!c||typeof c.id!=='string'||typeof c.title!=='string'||!Array.isArray(c.sections))throw new Error('Ungültiges Lernkapitel.');
   for(const section of c.sections){
    if(!section||typeof section.id!=='string'||typeof section.title!=='string'||!Array.isArray(section.lessons))throw new Error('Ungültiges Unterkapitel.');
    for(const lesson of section.lessons){
     if(!lesson||typeof lesson.id!=='string'||typeof lesson.title!=='string'||typeof lesson.html!=='string'||!['draft','published'].includes(lesson.status))throw new Error('Ungültige Lektion.');
     validateLessonBlocks(lesson.blocks||[]);
     if(lesson.draftBlocks!==undefined)validateLessonBlocks(lesson.draftBlocks);
    }
   }
  }
 }
 return data;
}
let library=createLearningLibrary(),topicId='',chapterId='',sectionId='',lessonId='',query='',error='';
let editTarget=null,editorDirty=false,editorBaseline='',editorMessage='';
let adminConfig=null,adminSession=false,adminView='',adminNotice='',adminError='',oneTimeCode='';
export function clearLearningView(){topicId='';chapterId='';sectionId='';lessonId='';query='';error='';adminView='';adminNotice='';adminError='';oneTimeCode='';editTarget=null;editorDirty=false;editorBaseline='';editorMessage='';}
export function learningHasUnsavedChanges(){return editorDirty;}
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
 if(adminSession)return `<section class="ls-admin" id="lsAdmin">${intro}${status}${problem}<span class="ls-admin-pill">✓ Admin-Modus aktiv</span><p>Du kannst Themen, Kapitel, Unterkapitel und Lektionen erstellen und bearbeiten. Entwürfe sehen nur Admins.</p><button type="button" class="ls-admin-secondary" data-ls-admin-logout>Admin abmelden</button></section>`;
 if(!adminConfig)return `<section class="ls-admin" id="lsAdmin">${intro}${problem}<p>Richte einmalig dein Admin-Passwort ein. Lesen bleibt ohne Anmeldung möglich.</p><form class="ls-admin-form" data-ls-admin-form="setup">${passwordInput('password','Neues Admin-Passwort (mindestens 12 Zeichen)','new-password')}${passwordInput('repeat','Passwort wiederholen','new-password')}<button type="submit" class="ls-admin-primary">Admin-Zugang einrichten</button></form></section>`;
 if(adminView==='reset')return `<section class="ls-admin" id="lsAdmin">${intro}${status}${problem}<p>Setze das Admin-Passwort mit deinem extern gesicherten Wiederherstellungscode zurück.</p><form class="ls-admin-form" data-ls-admin-form="reset"><label class="ls-admin-label">Wiederherstellungscode<input name="recovery" type="text" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-..."></label>${passwordInput('password','Neues Passwort (mindestens 12 Zeichen)','new-password')}${passwordInput('repeat','Neues Passwort wiederholen','new-password')}<button type="submit" class="ls-admin-primary">Passwort zurücksetzen</button></form><button type="button" class="ls-admin-text" data-ls-admin-show="login">Zur Anmeldung</button></section>`;
 return `<section class="ls-admin" id="lsAdmin">${intro}${status}${problem}<form class="ls-admin-form" data-ls-admin-form="login">${passwordInput('password','Admin-Passwort','current-password')}<button type="submit" class="ls-admin-primary">Admin anmelden</button></form><button type="button" class="ls-admin-text" data-ls-admin-show="reset">Passwort vergessen? Wiederherstellungscode verwenden</button></section>`;
}
export function renderLearning(){return renderLearningBase()+renderLearningAdmin();}

// Editor erlaubt nur lokal geprüfte Darstellungstags und eine enge Stil-/Bild-Whitelist.
// Importiertes HTML wird immer umgeschrieben; Script, Event-Handler, SVG, fremde Bilder verschwinden.
const ALLOWED_TAGS=new Set(['P','DIV','BR','STRONG','B','EM','I','U','S','UL','OL','LI','H2','H3','H4','BLOCKQUOTE','SPAN','TABLE','THEAD','TBODY','TR','TD','TH','IMG','A']);
const SKIP_TAGS=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','VIDEO','AUDIO','LINK','META','BUTTON','TEMPLATE']);
const ALLOWED_FONTS=['Arial','Georgia','Verdana','Trebuchet MS'];
const FONT_LABELS=[['Arial','Arial'],['Georgia','Georgia'],['Verdana','Verdana'],['Trebuchet MS','Trebuchet']];
const EMOJIS=['🌸','📚','🩸','💡','✅','🩺','❤️','🔎','⚠️','💜','📝','⭐','🌿','📌','➜'];
function safeStyle(style){
 const result=[];
 for(const declaration of text(style).split(';')){
  const split=declaration.indexOf(':');if(split<0)continue;
  const name=declaration.slice(0,split).trim().toLowerCase(),value=declaration.slice(split+1).trim();
  if(['color','background-color'].includes(name)&&(/^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(value)))result.push(`${name}:${value}`);
  if(name==='font-size'&&/^\d{1,2}px$/.test(value)&&Number(value.slice(0,-2))>=10&&Number(value.slice(0,-2))<=48)result.push(`font-size:${value}`);
  if(name==='font-family'&&ALLOWED_FONTS.some(f=>f.toLowerCase()===value.replaceAll('"','').replaceAll("'",'').toLowerCase()))result.push(`font-family:${value}`);
  if(name==='text-align'&&/^(left|right|center|justify)$/.test(value))result.push(`text-align:${value}`);
 }
 return result.join(';');
}
function sanitizeHtml(input){
 if(typeof document==='undefined')return escapeHTML(text(input));
 const tpl=document.createElement('template');tpl.innerHTML=text(input);
 const clean=(node,parent)=>{
  if(node.nodeType===3){parent.appendChild(document.createTextNode(node.textContent||''));return;}
  if(node.nodeType!==1)return;
  const tag=node.tagName;
  if(SKIP_TAGS.has(tag))return;
  const allowed=ALLOWED_TAGS.has(tag),out=allowed?document.createElement(tag.toLowerCase()):document.createDocumentFragment();
  if(allowed){
   const style=safeStyle(node.getAttribute('style'));if(style)out.setAttribute('style',style);
   if(tag==='A'){
    const href=text(node.getAttribute('href')).trim();if(/^https?:\/\//i.test(href)){
     out.setAttribute('href',href);out.setAttribute('rel','noopener noreferrer');out.setAttribute('target','_blank');
    }
   }
   if(tag==='IMG'){
    const src=text(node.getAttribute('src'));
    if(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)||src.length>2000000)return;
    out.setAttribute('src',src);out.setAttribute('alt',text(node.getAttribute('alt')).slice(0,150));out.setAttribute('loading','lazy');
   }
  }
  if(tag!=='IMG')for(const child of [...node.childNodes])clean(child,out);
  parent.appendChild(out);
 };
 const wrap=document.createElement('div');for(const child of [...tpl.content.childNodes])clean(child,wrap);
 return wrap.innerHTML;
}
// LS04: zusätzliche Lektionen-Bausteine getrennt von bestehendem HTML ablegen.
// PDF-/Bild-Daten müssen lokal als geprüfte data:-URL vorliegen. Nie Fremdlinks rendern.
const PDF_PREFIX='data:application/pdf;base64,';
const IMAGE_PATTERN=/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const PDF_PATTERN=/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/;
const NOTE_STYLES=['info','tip','warning'];
function validateLessonBlocks(blocks){
 if(!Array.isArray(blocks)||blocks.length>20)throw new Error('Maximal 20 zusätzliche Bausteine pro Lektion.');
 let total=0;
 for(const b of blocks){
  if(!b||typeof b.id!=='string'||b.id.length>100||typeof b.type!=='string')throw new Error('Ungültiger Lektionen-Baustein.');
  if(b.type==='note'){
   if(typeof b.title!=='string'||b.title.length>100||typeof b.body!=='string'||b.body.length>4000||!NOTE_STYLES.includes(b.style))throw new Error('Ungültiger Infokasten.');
  }else if(b.type==='image'||b.type==='gallery'){
   const images=b.type==='image'?[{data:b.data,name:b.name}]:b.images;
   if(!Array.isArray(images)||!images.length||images.length>4)throw new Error('Ungültige Bildergalerie.');
   for(const img of images){if(!img||!IMAGE_PATTERN.test(img.data||'')||img.data.length>1250000||typeof img.name!=='string'||img.name.length>140)throw new Error('Unzulässige Bilddatei.');total+=img.data.length;}
  }else if(b.type==='pdf'){
   if(!PDF_PATTERN.test(b.data||'')||b.data.length>2100000||typeof b.name!=='string'||b.name.length>140)throw new Error('Ungültiger PDF-Anhang.');total+=b.data.length;
  }else throw new Error('Unbekannter Bausteintyp.');
 }
 if(total>8500000)throw new Error('Die Medien dieser Lektion sind zu groß (maximal etwa 6 MB Dateien).');
 return blocks;
}
function renderLessonBlocks(blocks){
 if(!Array.isArray(blocks))return '';
 return blocks.map(b=>{
  if(b.type==='note')return `<aside class="ls-content-note ls-note-${escapeHTML(b.style)}"><strong>${escapeHTML(b.title)}</strong><p>${escapeHTML(b.body).replaceAll('\n','<br>')}</p></aside>`;
  if(b.type==='image'||b.type==='gallery'){
   const list=b.type==='image'?[{data:b.data,name:b.name}]:b.images;
   return `<div class="ls-content-gallery">${list.filter(img=>IMAGE_PATTERN.test(img.data||'')).map(img=>`<figure><img loading="lazy" src="${img.data}" alt="${escapeHTML(img.name)}"><figcaption>${escapeHTML(img.name)}</figcaption></figure>`).join('')}</div>`;
  }
  if(b.type==='pdf')return `<div class="ls-content-pdf"><span aria-hidden="true">📄</span><div><strong>${escapeHTML(b.name)}</strong><small>PDF · lokal in dieser Lektion gespeichert</small></div><button type="button" data-ls-open-pdf="${escapeHTML(b.id)}">Ansehen</button><button type="button" data-ls-download-pdf="${escapeHTML(b.id)}">Speichern</button><div class="ls-pdf-view" data-ls-pdf-view="${escapeHTML(b.id)}" hidden></div></div>`;
  return '';
 }).join('');
}
function parseDataFile(base64){
 const comma=base64.indexOf(','),binary=atob(base64.slice(comma+1)),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Blob([bytes],{type:base64.startsWith(PDF_PREFIX)?'application/pdf':'application/octet-stream'});
}
function bindPdfButtons(root,blocks){
 const byId=new Map((blocks||[]).filter(b=>b.type==='pdf').map(b=>[b.id,b]));
 root.querySelectorAll('[data-ls-open-pdf],[data-ls-download-pdf]').forEach(button=>button.addEventListener('click',()=>{
  const download=button.hasAttribute('data-ls-download-pdf'),id=button.dataset.lsOpenPdf||button.dataset.lsDownloadPdf,block=byId.get(id);
  if(!block||!PDF_PATTERN.test(block.data))return;
  if(download){
   const url=URL.createObjectURL(parseDataFile(block.data));
   const a=document.createElement('a');a.href=url;a.download=block.name.endsWith('.pdf')?block.name:block.name+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return;
  }
  const slot=root.querySelector(`[data-ls-pdf-view="${CSS.escape(id)}"]`);
  if(!slot)return;
  if(!slot.hidden){
   if(slot.dataset.objectUrl)URL.revokeObjectURL(slot.dataset.objectUrl);
   slot.removeAttribute('data-object-url');slot.innerHTML='';slot.hidden=true;return;
  }
  const url=URL.createObjectURL(parseDataFile(block.data));slot.dataset.objectUrl=url;
  slot.hidden=false;slot.innerHTML='';
  const iframe=document.createElement('iframe');iframe.title='PDF: '+block.name;iframe.src=url;iframe.loading='lazy';slot.appendChild(iframe);
  const fallback=document.createElement('p');fallback.textContent='Falls dein Browser keine PDF-Vorschau unterstützt: „Speichern“ benutzen.';slot.appendChild(fallback);
  // Blob-URLs nicht sofort freigeben: die PDF-Vorschau muss sie bis zum Neuladen lesen können.
 }));
}
function makeId(){return typeof crypto?.randomUUID==='function'?crypto.randomUUID():randomHex(16);}
function docCopy(){return structuredClone(library);}
async function saveLibrary(next){
 if(!adminSession)throw new Error('Bitte zuerst als Admin anmelden.');
 validateLearningLibrary(next);
 await setModuleValue(STORE,LEARNING_KEY,next);
 library=next;
}
function editButtons(kind,id){return adminSession?`<button type="button" class="ls-edit-link" data-ls-edit="${kind}" data-ls-edit-id="${escapeHTML(id)}" aria-label="${kind} bearbeiten">✎ Bearbeiten</button>`:'';}
function goTo(kind,id){
 if(kind==='topic'){topicId=id;chapterId='';sectionId='';lessonId='';}
 if(kind==='chapter'){chapterId=id;sectionId='';lessonId='';}
 if(kind==='section'){sectionId=id;lessonId='';}
 if(kind==='lesson')lessonId=id;
 editTarget=null;editorMessage='';
}
function guardedChange(change,onChange){
 if(editorDirty&&!window.confirm('Du hast ungespeicherte Änderungen. Ohne Speichern verlassen?'))return false;
 editorDirty=false;editorBaseline='';change();onChange();return true;
}
function renderSimpleEditor(){
 if(!adminSession||!editTarget||editTarget.kind==='lesson')return '';
 const {kind,id}=editTarget;
 const existing=kind==='topic'?topicById(id):kind==='chapter'?chapterById():sectionById();
 const name=kind==='topic'?'Thema':kind==='chapter'?'Kapitel':'Unterkapitel';
 return `<section class="ls-workspace" id="lsWorkspace"><h3>${id?'✎ '+name+' bearbeiten':'➕ '+name+' erstellen'}</h3><form id="lsEntityForm"><label>Titel<input name="title" maxlength="120" required value="${escapeHTML(existing?.title||'')}"></label>${kind==='topic'?`<label>Beschreibung<input name="subtitle" maxlength="200" value="${escapeHTML(existing?.subtitle||'')}"></label>`:''}<div class="ls-workspace-actions"><button class="ls-admin-primary" type="submit">Speichern</button><button class="ls-admin-secondary" type="button" data-ls-cancel>Abbrechen</button></div><div class="ls-editor-message" role="status">${escapeHTML(editorMessage)}</div></form></section>`;
}
function renderLessonEditor(){
 if(!adminSession||editTarget?.kind!=='lesson')return '';
 const existing=editTarget.id?sectionById()?.lessons.find(l=>l.id===editTarget.id):null;
 const html=existing?.draftHtml??existing?.html??'';
 return `<section class="ls-workspace ls-lesson-workspace" id="lsWorkspace"><h3>✍️ ${existing?'Lektion bearbeiten':'Neue Lektion'}</h3><p>Texte einfügen, markieren und über die Werkzeugleiste gestalten. Ein Entwurf ist nur für den Admin sichtbar.</p><form id="lsLessonForm"><label>Titel der Lektion<input type="text" maxlength="140" required name="title" value="${escapeHTML(existing?.draftTitle??existing?.title??'')}"></label><div class="ls-editor-toolbar" role="toolbar" aria-label="Text formatieren"><button type="button" data-ls-cmd="bold" title="Fett"><b>B</b></button><button type="button" data-ls-cmd="italic" title="Kursiv"><i>I</i></button><button type="button" data-ls-cmd="underline" title="Unterstrichen"><u>U</u></button><button type="button" data-ls-cmd="insertUnorderedList" title="Liste">☷</button><button type="button" data-ls-cmd="formatBlock" data-ls-value="h3" title="Überschrift">H</button><button type="button" data-ls-cmd="formatBlock" data-ls-value="p" title="Absatz">¶</button><label>Schriftart<select id="lsFont"><option value="">Schrift</option>${FONT_LABELS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label>Größe<select id="lsFontSize">${[12,14,16,18,20,24,28,32,36,40,48].map(n=>`<option value="${n}" ${n===16?'selected':''}>${n} px</option>`).join('')}</select></label><label>Textfarbe<input type="color" id="lsTextColor" value="#683250" aria-label="Textfarbe"></label><label>Markierung<input type="color" id="lsMarkColor" value="#f8d7e6" aria-label="Markierungsfarbe"></label><label>Bild<input id="lsImageInput" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Bild einfügen"></label><button type="button" data-ls-table title="Tabelle einfügen">▦ Tabelle</button></div><div class="ls-emoji-picker" aria-label="Emojis einfügen">${EMOJIS.map(e=>`<button type="button" data-ls-emoji="${e}" aria-label="Emoji ${e} einfügen">${e}</button>`).join('')}</div><label class="ls-editor-label" for="lsEditable">Lektionstext</label><div id="lsEditable" class="ls-editable ls-rich-content" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Lektionstext" data-placeholder="Hier schreiben oder Text aus der Zwischenablage einfügen …">${sanitizeHtml(html)}</div><section class="ls-block-editor" aria-label="Lektions-Bausteine"><h4>➕ Weitere Bausteine</h4><p>Füge Bilder, eine Galerie, PDF oder Infokästen direkt zur Lektion hinzu. Mit ↑ und ↓ sortieren.</p><div class="ls-block-tools"><button type="button" data-ls-add-block="note">💡 Infokasten</button><label class="ls-block-file">🖼️ Bild<input type="file" data-ls-block-files="image" accept="image/png,image/jpeg,image/webp" hidden></label><label class="ls-block-file">🖼️ Galerie<input type="file" data-ls-block-files="gallery" accept="image/png,image/jpeg,image/webp" multiple hidden></label><label class="ls-block-file">📄 PDF<input type="file" data-ls-block-files="pdf" accept="application/pdf,.pdf" hidden></label></div><div id="lsBlocksList" class="ls-block-list"></div><div class="ls-block-help" role="status" id="lsBlockHelp"></div></section><div class="ls-workspace-actions"><button type="button" class="ls-admin-secondary" id="lsTogglePreview">👁 Vorschau</button><button type="submit" class="ls-admin-secondary" data-ls-save="draft">Entwurf speichern</button><button type="submit" class="ls-admin-primary" data-ls-save="published">Veröffentlichen</button><button type="button" class="ls-admin-secondary" data-ls-cancel>Abbrechen</button></div><div class="ls-editor-message" id="lsEditorMessage" role="status">${escapeHTML(editorMessage)}</div></form><div id="lsPreview" class="ls-rich-content ls-preview" hidden></div></section>`;
}
function renderWorkspace(){return renderSimpleEditor()+renderLessonEditor();}
async function saveEntity(kind,id,values){
 if(!adminSession)throw new Error('Admin-Anmeldung erforderlich.');
 const title=text(values.get('title')).trim().slice(0,120),subtitle=text(values.get('subtitle')).trim().slice(0,200);
 if(!title)throw new Error('Bitte einen Titel eingeben.');
 const next=docCopy();
 if(kind==='topic'){
  const t=next.topics.find(t=>t.id===id);
  if(t){t.title=title;t.subtitle=subtitle;}else next.topics.push({id:makeId(),title,subtitle,chapters:[]});
 }else {
  const t=next.topics.find(t=>t.id===topicId);if(!t)throw new Error('Thema nicht gefunden.');
  if(kind==='chapter'){
   const c=t.chapters.find(c=>c.id===id);
   if(c)c.title=title;else t.chapters.push({id:makeId(),title,sections:[]});
  }else if(kind==='section'){
   const c=t.chapters.find(c=>c.id===chapterId);if(!c)throw new Error('Kapitel nicht gefunden.');
   const sec=c.sections.find(s=>s.id===id);if(sec)sec.title=title;else c.sections.push({id:makeId(),title,lessons:[]});
  }else throw new Error('Unbekannter Inhaltstyp.');
 }
 await saveLibrary(next);
}
async function saveLesson(id,title,html,status,blocks=[]){
 if(!adminSession)throw new Error('Admin-Anmeldung erforderlich.');
 title=text(title).trim().slice(0,140);html=sanitizeHtml(html);validateLessonBlocks(blocks);
 const plain=document.createElement('div');plain.innerHTML=html;
 if(!title||(!plain.textContent.trim()&&!plain.querySelector('img')&&!blocks.length))throw new Error('Titel und Inhalt eingeben.');
 if(html.length>1000000)throw new Error('Der Rich-Text-Bereich ist zu groß (maximal 1 MB).');
 const next=docCopy(),sec=next.topics.find(t=>t.id===topicId)?.chapters.find(c=>c.id===chapterId)?.sections.find(s=>s.id===sectionId);
 if(!sec)throw new Error('Unterkapitel nicht gefunden.');
 const old=sec.lessons.find(l=>l.id===id),now=new Date().toISOString();
 if(old){
  old.updatedAt=now;
  if(status==='draft'&&old.status==='published'){
   // LS04: Bereits veröffentlichte Inhalte inkl. Titel und PDF/Bilder bleiben unverändert.
   old.draftTitle=title;old.draftHtml=html;old.draftBlocks=structuredClone(blocks);
  }else{
   old.title=title;old.html=html;old.blocks=structuredClone(blocks);old.status=status;
   delete old.draftTitle;delete old.draftHtml;delete old.draftBlocks;
  }
 }else sec.lessons.push({id:makeId(),title,html,blocks:structuredClone(blocks),status,createdAt:now,updatedAt:now});
 await saveLibrary(next);
}
function bindWorkspace(root,onChange){
 const form=root.querySelector('#lsEntityForm');
 form?.addEventListener('input',()=>{editorDirty=true;});
 form?.addEventListener('submit',async e=>{e.preventDefault();
  try{const f=new FormData(form);await saveEntity(editTarget.kind,editTarget.id,f);editorDirty=false;editorMessage='';editTarget=null;onChange();}
  catch(err){const box=form.querySelector('.ls-editor-message');if(box)box.textContent=err.message;}
 });
 const lessonForm=root.querySelector('#lsLessonForm'),editor=root.querySelector('#lsEditable');
 if(lessonForm&&editor){
  const old=editTarget.id?sectionById()?.lessons.find(l=>l.id===editTarget.id):null;
  const blocks=structuredClone(old?.draftBlocks??old?.blocks??[]);
  const help=root.querySelector('#lsBlockHelp'),blockList=root.querySelector('#lsBlocksList');
  const info=(message)=>{help.textContent=message;};
  const paintBlocks=()=>{
   blockList.innerHTML=blocks.map((b,i)=>`<div class="ls-block-item" data-ls-block-i="${i}"><div class="ls-block-item-top"><strong>${escapeHTML({note:'💡 Infokasten',image:'🖼️ Bild',gallery:'🖼️ Galerie',pdf:'📄 PDF'}[b.type]||b.type)} ${i+1}</strong><div><button type="button" data-ls-block-move="up" aria-label="Baustein nach oben" ${i===0?'disabled':''}>↑</button><button type="button" data-ls-block-move="down" aria-label="Baustein nach unten" ${i===blocks.length-1?'disabled':''}>↓</button><button type="button" data-ls-block-move="remove" aria-label="Baustein entfernen">✕</button></div></div>${b.type==='note'?`<label>Titel<input data-ls-note-title maxlength="100" value="${escapeHTML(b.title)}"></label><label>Art<select data-ls-note-style>${NOTE_STYLES.map(st=>`<option value="${st}" ${b.style===st?'selected':''}>${{info:'Information',tip:'Tipp',warning:'Wichtig'}[st]}</option>`).join('')}</select></label><label>Text<textarea data-ls-note-body rows="3" maxlength="4000">${escapeHTML(b.body)}</textarea></label>`:`<span class="ls-block-filename">${escapeHTML(b.type==='gallery'?`${b.images.length} Bilder`:b.name)}</span>`}</div>`).join('')||'<p class="ls-block-empty">Noch keine weiteren Bausteine. Der Rich-Text bleibt oben.</p>';
   blockList.querySelectorAll('[data-ls-block-move]').forEach(button=>button.addEventListener('click',()=>{
    const i=Number(button.closest('[data-ls-block-i]').dataset.lsBlockI),action=button.dataset.lsBlockMove;
    if(action==='remove'){blocks.splice(i,1);}else{const to=i+(action==='up'?-1:1);if(to<0||to>=blocks.length)return;[blocks[i],blocks[to]]=[blocks[to],blocks[i]];}
    editorDirty=true;paintBlocks();
   }));
   blockList.querySelectorAll('[data-ls-note-title],[data-ls-note-style],[data-ls-note-body]').forEach(input=>input.addEventListener('input',()=>{
    const b=blocks[Number(input.closest('[data-ls-block-i]').dataset.lsBlockI)];
    if(input.hasAttribute('data-ls-note-title'))b.title=input.value;
    if(input.hasAttribute('data-ls-note-style'))b.style=input.value;
    if(input.hasAttribute('data-ls-note-body'))b.body=input.value;
    editorDirty=true;
   }));
  };
  paintBlocks();
  root.querySelector('[data-ls-add-block="note"]')?.addEventListener('click',()=>{
   if(blocks.length>=20){info('Maximal 20 Bausteine.');return;}
   blocks.push({id:makeId(),type:'note',title:'Wissenswert',body:'Hier den Infotext eintragen.',style:'info'});
   editorDirty=true;paintBlocks();
  });
  root.querySelectorAll('[data-ls-block-files]').forEach(input=>input.addEventListener('change',async()=>{
   const kind=input.dataset.lsBlockFiles,files=[...input.files];if(!files.length)return;
   try{
    if(blocks.length>=20)throw new Error('Maximal 20 Bausteine pro Lektion.');
    if(kind==='gallery'&&files.length>4)throw new Error('Höchstens 4 Bilder pro Galerie.');
    const images=[];
    for(const file of files){
     if(kind==='pdf'){
      if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf'))throw new Error('Nur PDF-Dateien erlaubt.');
      if(file.size>1500000)throw new Error('PDF darf höchstens 1,5 MB haben.');
      const sig=new Uint8Array(await file.slice(0,5).arrayBuffer());
      if(String.fromCharCode(...sig)!=='%PDF-')throw new Error('Ungültige PDF-Datei.');
     }else if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>900000)throw new Error('Nur JPG/PNG/WebP bis 900 KB pro Bild.');
     const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Datei konnte nicht gelesen werden.'));r.readAsDataURL(file);});
     images.push({data,name:file.name.slice(0,140)});
    }
    const b=kind==='pdf'?{id:makeId(),type:'pdf',...images[0]}:kind==='gallery'?{id:makeId(),type:'gallery',images}:{id:makeId(),type:'image',...images[0]};
    validateLessonBlocks([...blocks,b]);blocks.push(b);editorDirty=true;paintBlocks();info('Baustein hinzugefügt. Bitte Lektion speichern.');
   }catch(e){info(e.message);}finally{input.value='';}
  }));
  let selected=null;
  const remember=()=>{const selection=getSelection();if(selection?.rangeCount&&editor.contains(selection.anchorNode))selected=selection.getRangeAt(0).cloneRange();};
  const restore=()=>{editor.focus();if(!selected)return;const selection=getSelection();selection.removeAllRanges();selection.addRange(selected);};
  const dirty=()=>{editorDirty=true;};
  editor.addEventListener('input',dirty);lessonForm.querySelector('[name=title]').addEventListener('input',dirty);
  editor.addEventListener('mouseup',remember);editor.addEventListener('keyup',remember);editor.addEventListener('touchend',remember);
  const format=(command,value)=>{restore();document.execCommand(command,false,value);remember();dirty();};
  root.querySelectorAll('[data-ls-cmd]').forEach(b=>{b.addEventListener('pointerdown',e=>e.preventDefault());b.addEventListener('click',()=>format(b.dataset.lsCmd,b.dataset.lsValue||null));});
  const spanStyle=(property,value)=>{
   restore();let range=getSelection()?.rangeCount?getSelection().getRangeAt(0):null;
   if(!range||!editor.contains(range.commonAncestorContainer))return;
   const span=document.createElement('span');span.style[property]=value;
   if(range.collapsed){span.textContent='\u200b';range.insertNode(span);range.setStart(span.firstChild,1);range.collapse(true);}
   else{span.appendChild(range.extractContents());range.insertNode(span);range.selectNodeContents(span);}
   getSelection().removeAllRanges();getSelection().addRange(range);remember();dirty();
  };
  const font=root.querySelector('#lsFont'),size=root.querySelector('#lsFontSize'),color=root.querySelector('#lsTextColor'),mark=root.querySelector('#lsMarkColor');
  font?.addEventListener('change',()=>{if(ALLOWED_FONTS.includes(font.value))spanStyle('fontFamily',font.value);});
  size?.addEventListener('change',()=>spanStyle('fontSize',size.value+'px'));
  color?.addEventListener('input',()=>spanStyle('color',color.value));
  mark?.addEventListener('input',()=>spanStyle('backgroundColor',mark.value));
  root.querySelectorAll('[data-ls-emoji]').forEach(b=>{b.addEventListener('pointerdown',e=>e.preventDefault());b.addEventListener('click',()=>format('insertText',b.dataset.lsEmoji));});
  root.querySelector('[data-ls-table]')?.addEventListener('click',()=>format('insertHTML','<table><tbody><tr><td>Zelle 1</td><td>Zelle 2</td></tr><tr><td>Zelle 3</td><td>Zelle 4</td></tr></tbody></table><p></p>'));
  editor.addEventListener('paste',e=>{e.preventDefault();
   const html=e.clipboardData?.getData('text/html'),plain=e.clipboardData?.getData('text/plain')||'';
   format(html?'insertHTML':'insertText',html?sanitizeHtml(html):plain);
  });
  root.querySelector('#lsImageInput')?.addEventListener('change',async e=>{
   const file=e.target.files?.[0];if(!file)return;
   const box=root.querySelector('#lsEditorMessage');
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>950000){box.textContent='Nur PNG/JPG/WebP-Bilder bis 950 KB je Bild. Bitte verkleinern.';e.target.value='';return;}
   try{const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Bild konnte nicht gelesen werden.'));r.readAsDataURL(file);});
    format('insertHTML',`<p><img src="${src}" alt="${escapeHTML(file.name)}"></p>`);box.textContent='Bild eingefügt. Bitte Lektion speichern.';
   }catch(err){box.textContent=err.message;}e.target.value='';
  });
  root.querySelector('#lsTogglePreview')?.addEventListener('click',()=>{
   const preview=root.querySelector('#lsPreview');preview.hidden=!preview.hidden;
   if(!preview.hidden){preview.innerHTML=sanitizeHtml(editor.innerHTML)+renderLessonBlocks(blocks);bindPdfButtons(preview,blocks);preview.scrollIntoView({block:'nearest'});}
  });
  lessonForm.addEventListener('submit',async e=>{e.preventDefault();
   const box=root.querySelector('#lsEditorMessage'),buttons=lessonForm.querySelectorAll('[type=submit]');
   const status=e.submitter?.dataset.lsSave==='published'?'published':'draft';buttons.forEach(b=>b.disabled=true);
   try{await saveLesson(editTarget.id,lessonForm.elements.title.value,editor.innerHTML,status,blocks);editorDirty=false;editorMessage='';editTarget=null;onChange();}
   catch(err){box.textContent='Speichern fehlgeschlagen: '+err.message;}
   finally{buttons.forEach(b=>b.disabled=false);}
  });
 }
 root.querySelectorAll('[data-ls-cancel]').forEach(b=>b.addEventListener('click',()=>guardedChange(()=>{editTarget=null;editorMessage='';},onChange)));
}

const countLessons=c=>(c.sections||[]).reduce((n,s)=>n+(s.lessons||[]).filter(l=>adminSession||l.status==='published').length,0);
const chapterById=()=>topicById(topicId)?.chapters.find(c=>c.id===chapterId);
const sectionById=()=>chapterById()?.sections.find(s=>s.id===sectionId);
const lessonById=()=>sectionById()?.lessons.find(l=>l.id===lessonId);
const topicById=id=>library.topics.find(t=>t.id===id);
function renderLearningBase(){
 const topic=topicById(topicId),chapter=chapterById(),section=sectionById(),lesson=lessonById();
 const intro=`<div class="ls-header"><div class="ls-icon" aria-hidden="true">📚</div><div><span class="ls-overline">DEINE LERNSCHULE</span><h2>Wissen entdecken</h2><p>Themen, Kapitel und Lektionen – alles an einem Ort.</p></div></div><button class="ls-admin-jump" type="button" data-ls-admin-jump>🔐 Admin-Zugang ↓</button>`;
 if(error)return `${intro}<div class="ls-notice" role="alert">${escapeHTML(error)}</div>`;
 const action=(label,kind)=>adminSession?`<button class="ls-admin-add" type="button" data-ls-new="${kind}">＋ ${label}</button>`:'';
 const crumb=(label,kind)=>`<button type="button" data-ls-back="${kind}">${escapeHTML(label)}</button><span>›</span>`;
 const trail=`<div class="ls-trail">${crumb('Alle Themen','topics')}${topic?crumb(topic.title,'chapters'):''}${chapter?crumb(chapter.title,'sections'):''}${section?crumb(section.title,'lessons'):''}</div>`;
 if(lesson){
  if(lesson.status!=='published'&&!adminSession)return `${intro}${trail}<div class="ls-notice">Diese Lektion ist noch nicht veröffentlicht.</div>`;
  return `${intro}${trail}<section class="ls-detail"><span class="ls-overline">LEKTION ${lesson.status==='draft'?'· ENTWURF':''}</span><h3>${escapeHTML(lesson.title)}</h3>${editButtons('lesson',lesson.id)}<div class="ls-rich-content ls-reader">${sanitizeHtml(lesson.html)}${renderLessonBlocks(lesson.blocks||[])}</div>${adminSession&&lesson.draftHtml?'<p class="ls-draft-note">Es existiert eine unveröffentlichte Bearbeitung dieser Lektion.</p>':''}</section>${renderWorkspace()}`;
 }
 if(section){
  const visible=section.lessons.filter(l=>adminSession||l.status==='published');
  return `${intro}${trail}<section class="ls-detail"><span class="ls-overline">UNTERKAPITEL</span><h3>${escapeHTML(section.title)}</h3>${editButtons('section',section.id)}${action('Neue Lektion','lesson')}</section><div class="ls-stack">${visible.map(l=>`<div class="ls-list-line"><button class="ls-item" type="button" data-ls-lesson="${escapeHTML(l.id)}"><span class="ls-chapter-icon">📖</span><span class="ls-item-main"><strong>${escapeHTML(l.title)}</strong><small>${l.status==='draft'?'Entwurf · nur Admin':'Lektion · veröffentlicht'}${l.draftHtml?' · neue Änderungen als Entwurf':''}</small></span><span aria-hidden="true">›</span></button>${editButtons('lesson',l.id)}</div>`).join('')||'<div class="ls-empty">Noch keine Lektionen vorhanden.</div>'}</div>${renderWorkspace()}`;
 }
 if(chapter){
  return `${intro}${trail}<section class="ls-detail"><span class="ls-overline">KAPITEL</span><h3>${escapeHTML(chapter.title)}</h3>${editButtons('chapter',chapter.id)}${action('Neues Unterkapitel','section')}</section><div class="ls-stack">${chapter.sections.map(sec=>`<div class="ls-list-line"><button type="button" class="ls-item" data-ls-section="${escapeHTML(sec.id)}"><span class="ls-chapter-icon">▤</span><span class="ls-item-main"><strong>${escapeHTML(sec.title)}</strong><small>${sec.lessons.filter(l=>adminSession||l.status==='published').length} Lektionen</small></span><span aria-hidden="true">›</span></button>${editButtons('section',sec.id)}</div>`).join('')||'<div class="ls-empty">Noch keine Unterkapitel oder Lektionen vorhanden.</div>'}</div>${renderWorkspace()}`;
 }
 if(topic){
  return `${intro}${trail}<section class="ls-detail"><span class="ls-overline">LERNTHEMA</span><h3>${escapeHTML(topic.title)}</h3><p>${escapeHTML(topic.subtitle)}</p>${editButtons('topic',topic.id)}${action('Neues Kapitel','chapter')}</section><div class="ls-stack">${topic.chapters.map(c=>`<div class="ls-list-line"><button type="button" class="ls-item" data-ls-chapter="${escapeHTML(c.id)}"><span class="ls-chapter-icon">▤</span><span class="ls-item-main"><strong>${escapeHTML(c.title)}</strong><small>${countLessons(c)} Lektionen</small></span><span aria-hidden="true">›</span></button>${editButtons('chapter',c.id)}</div>`).join('')||'<div class="ls-empty">Noch keine Kapitel vorhanden.</div>'}</div>${renderWorkspace()}`;
 }
 const q=query.trim().toLocaleLowerCase('de-AT');
 const topics=library.topics.filter(t=>!q||[t.title,t.subtitle,...t.chapters.flatMap(c=>[c.title,...c.sections.flatMap(s=>[s.title,...s.lessons.filter(l=>adminSession||l.status==='published').map(l=>l.title)])])].join(' ').toLocaleLowerCase('de-AT').includes(q));
 return `${intro}<div class="ls-intro"><strong>Deine persönliche Lernbibliothek</strong><p>Sieben vorbereitete Themen. Als Admin kannst du eigene Themen, Kapitel, Unterkapitel und Lektionen ergänzen.</p></div>${action('Neues Thema','topic')}<label class="ls-search-label" for="lsSearch">Themen und Lektionen suchen<input id="lsSearch" type="search" maxlength="120" autocomplete="off" value="${escapeHTML(query)}" placeholder="z. B. Zyklus, Brust, Vorsorge"/></label><p class="ls-result-count" id="lsResultCount">${topics.length} von ${library.topics.length} Themen</p><div class="ls-grid" id="lsTopicResults">${topics.map(t=>`<div class="ls-topic-wrap"><button type="button" class="ls-topic" data-ls-topic="${escapeHTML(t.id)}"><span class="ls-topic-symbol" aria-hidden="true">${['♡','◷','✿','◈','◇','❀','✚'][library.topics.indexOf(t)%7]}</span><strong>${escapeHTML(t.title)}</strong><small>${t.chapters.length} Kapitel · ${t.chapters.reduce((n,c)=>n+countLessons(c),0)} Lektionen</small><span class="ls-topic-arrow" aria-hidden="true">›</span></button>${editButtons('topic',t.id)}</div>`).join('')||'<div class="ls-empty">Keine passenden Themen gefunden.</div>'}</div><div class="ls-info"><strong>🔒 Lerninhalte verwalten</strong><p>Als Admin kannst du kopierte Texte mit eigener Schriftgröße, Farbe, Schriftart, Emojis und Bildern gestalten. Entwürfe bleiben privat.</p></div>${renderWorkspace()}`;
}
export function bindLearning(root,onChange){
 if(!root)return;
 root.querySelector('[data-ls-admin-jump]')?.addEventListener('click',()=>root.querySelector('#lsAdmin')?.scrollIntoView({behavior:'smooth',block:'start'}));
 root.querySelectorAll('[data-ls-admin-form]').forEach(form=>form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
  try{await adminAction(form.dataset.lsAdminForm,new FormData(form));}catch(err){adminError=err.message;}
  finally{button.disabled=false;onChange();}
 }));
 root.querySelector('[data-ls-admin-logout]')?.addEventListener('click',()=>guardedChange(()=>{adminSession=false;adminView='';adminNotice='Admin-Modus beendet.';oneTimeCode='';editTarget=null;},onChange));
 root.querySelector('[data-ls-admin-ack]')?.addEventListener('click',()=>{oneTimeCode='';adminNotice='Admin-Modus aktiv. Den Code außerhalb der App aufbewahren.';onChange();});
 root.querySelectorAll('[data-ls-admin-show]').forEach(b=>b.addEventListener('click',()=>{adminView=b.dataset.lsAdminShow;adminError='';adminNotice='';onChange();}));
 bindWorkspace(root,onChange);
 const lesson=lessonById();if(lesson)bindPdfButtons(root,lesson.blocks||[]);
 root.querySelectorAll('[data-ls-new]').forEach(b=>b.addEventListener('click',()=>guardedChange(()=>{if(!adminSession)return;editTarget={kind:b.dataset.lsNew,id:''};editorMessage='';},onChange)));
 root.querySelectorAll('[data-ls-edit]').forEach(b=>b.addEventListener('click',()=>guardedChange(()=>{if(!adminSession)return;const kind=b.dataset.lsEdit,id=b.dataset.lsEditId;editTarget={kind,id};if(kind==='topic'){topicId=id;chapterId='';sectionId='';lessonId='';}if(kind==='chapter'){chapterId=id;sectionId='';lessonId='';}if(kind==='section'){sectionId=id;lessonId='';}if(kind==='lesson')lessonId='';editorMessage='';},onChange)));
 root.querySelector('#lsSearch')?.addEventListener('input',e=>{query=e.target.value;const temp=document.createElement('div');temp.innerHTML=renderLearning();root.querySelector('#lsTopicResults')?.replaceWith(temp.querySelector('#lsTopicResults'));root.querySelector('#lsResultCount')?.replaceWith(temp.querySelector('#lsResultCount'));bindTopicButtons(root,onChange);});
 bindTopicButtons(root,onChange);
 root.querySelectorAll('[data-ls-chapter]').forEach(b=>b.addEventListener('click',()=>guardedChange(()=>goTo('chapter',b.dataset.lsChapter),onChange)));
 root.querySelectorAll('[data-ls-section]').forEach(b=>b.addEventListener('click',()=>guardedChange(()=>goTo('section',b.dataset.lsSection),onChange)));
 root.querySelectorAll('[data-ls-lesson]').forEach(b=>b.addEventListener('click',()=>guardedChange(()=>goTo('lesson',b.dataset.lsLesson),onChange)));
 root.querySelectorAll('[data-ls-back]').forEach(b=>b.addEventListener('click',()=>guardedChange(()=>{const k=b.dataset.lsBack;if(k==='topics'){topicId='';chapterId='';sectionId='';lessonId='';}else if(k==='chapters'){chapterId='';sectionId='';lessonId='';}else if(k==='sections'){sectionId='';lessonId='';}else if(k==='lessons')lessonId='';editTarget=null;},onChange)));
}
function bindTopicButtons(root,onChange){root.querySelectorAll('[data-ls-topic]').forEach(b=>b.addEventListener('click',()=>guardedChange(()=>{goTo('topic',b.dataset.lsTopic);query='';},onChange)));}
