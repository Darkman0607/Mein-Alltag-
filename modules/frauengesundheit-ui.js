/* Mein Alltag – F02–F07: private, locally stored health journal; no medical diagnosis. */
import {getModuleValue,setModuleValue,setModuleValues} from '../assets/database.js';
const STORE='frauengesundheit', ENTRIES='health.entries.v1', CYCLE='health.cycle.v1', PREG='health.pregnancy.v1';
const SECTIONS=[
 ['zyklus','Zyklus','Verlauf, Kalender und Zykluslänge.'],
 ['periode','Periode','Beginn, Ende und Blutungsstärke.'],
 ['ausfluss','Ausfluss','Farbe, Menge und Veränderungen.'],
 ['sex','Sex','Private Einträge zu Sexualität und Verhütung.'],
 ['schwangerschaft','Schwangerschaft','Status, Tests und Schwangerschaftswochen.'],
 ['lernzentrum','Lernzentrum','Für ein späteres Update vorgemerkt.'],
 ['tagebuch','Tagebuch','Befinden, Symptome und Gedanken.'],
 ['untersuchungen','Untersuchungen & Notizen','Termine, Fragen, Befunde und Selbstbeobachtungen.']
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const validDate=d=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return false;const dt=new Date(d+'T12:00:00Z');return !Number.isNaN(dt.getTime())&&dt.toISOString().slice(0,10)===d;};
const fmt=d=>validDate(d)?`${d.slice(8,10)}.${d.slice(5,7)}.${d.slice(0,4)}`:'';
const fromUTC=d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
const days=(a,b)=>Math.floor((Date.parse(b+'T12:00:00')-Date.parse(a+'T12:00:00'))/86400000);
const datePlus=(d,n)=>fromUTC(new Date(Date.parse(d+'T12:00:00')+n*86400000));
const icon=n=>`./assets/health-icons/${n}.png`;
let tab='start',category='',records=[],cycle={},pregnancy={},message='',formOpen=false,editId='',selectedDay='',calendarMonth=today().slice(0,7);
const field=(name,label,type='text',value='',attributes='')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attributes}></label>`;
const area=(name,label,value='',placeholder='')=>`<label>${label}<textarea name="${name}" rows="3" maxlength="8000" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
const choice=(name,label,options,value='')=>`<label>${label}<select name="${name}">${options.map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
function cycleStats(){
 const start=cycle.start, len=Number(cycle.length);
 if(!validDate(start)||!Number.isInteger(len)||len<18||len>60)return null;
 const diff=days(start,today());if(diff<0||diff>400)return null;
 const day=(diff%len)+1;return {day,len,next:datePlus(start,Math.floor(diff/len+1)*len)};
}
function cycleCard(){
 const v=cycleStats(), pct=v?Math.round(v.day/v.len*100):0;
 return `<button type="button" class="health-cycle-card" data-health-section="zyklus" aria-label="Zyklusübersicht öffnen"><div class="health-cycle-ring" style="--progress:${pct}%"><div class="health-cycle-num"><span>Zyklus Tag</span><strong>${v?v.day:'–'}</strong><span>${v?`von ${v.len}`:'noch offen'}</span></div></div><div class="health-phase"><span class="health-chip">Deine Übersicht</span><h2>${v?'Zyklusübersicht':'Noch nicht erfasst'}</h2><p>${v?'Nur eine Schätzung aus deinen Angaben.':'Letzten Periodenbeginn und Zykluslänge eintragen.'}</p><div class="health-next"><span aria-hidden="true">▣</span><div><b>Nächste Periode (geschätzt)</b><small>${v?fmt(v.next):'Noch kein Datum'}</small></div></div></div><img class="health-flower" src="${icon('blume')}" alt=""/><span class="health-cycle-chevron">›</span></button>`;
}
function startMarkup(){
 const exams=records.filter(r=>r.category==='untersuchungen');const upcoming=exams.filter(r=>r.details?.kind==='frauenarzt'&&r.details?.visitStatus!=='abgeschlossen'&&r.date>=today()).sort((a,b)=>a.date.localeCompare(b.date)||String(a.details?.time||'').localeCompare(String(b.details?.time||'')));const latest=[...exams].sort((a,b)=>b.date.localeCompare(a.date))[0];
 return `${cycleCard()}<div class="health-quick-actions"><button type="button" data-health-quick="untersuchungen">+ Untersuchung / Arzttermin</button><button type="button" data-health-quick="periode">+ Periode</button><button type="button" data-health-quick="schwangerschaft">+ Schwangerschaftstest</button></div>${upcoming.length?`<div class="health-appointment"><b>⏰ Nächster Frauenarzttermin</b><span>${fmt(upcoming[0].date)}${upcoming[0].details?.time?' · '+esc(upcoming[0].details.time):''} · ${esc(upcoming[0].title)}</span><button type="button" data-health-edit="${esc(upcoming[0].id)}">Fragen & Notizen öffnen ›</button></div>`:latest?`<div class="health-appointment"><b>Letzte Untersuchung / Termin</b><span>${fmt(latest.date)} · ${esc(latest.title)}</span><button type="button" data-health-edit="${esc(latest.id)}">Eintrag öffnen ›</button></div>`:''}<div class="health-tiles">${SECTIONS.map(([id,title,sub])=>`<button class="health-tile" type="button" data-health-section="${id}"><img alt="" loading="lazy" src="${icon(id)}"/><div class="health-tile-text"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div><span class="health-chevron">›</span></button>`).join('')}</div>`;
}
function attachMarkup(x){
 const a=x.attachment,old=x.photo;
 if(a&&/^data:(image\/jpeg|image\/png|image\/webp|application\/pdf);base64,/.test(a.data||'')){
  if(a.mime?.startsWith('image/'))return `<img class="health-photo" src="${a.data}" alt="Angehängtes Bild" loading="lazy"/>`;
  return `<a class="health-file-link" href="${a.data}" download="${esc(a.name||'befund.pdf')}">📄 ${esc(a.name||'Befund herunterladen')}</a>`;
 }
 if(old&&/^data:image\/(png|jpeg|webp);base64,/.test(old))return `<img class="health-photo" src="${old}" alt="Gespeichertes Foto" loading="lazy"/>`;
 return '';
}
function detailMarkup(x){const d=x.details||{};const labels={kind:'Art',visitStatus:'Terminstatus',time:'Uhrzeit',provider:'Ärztin / Stelle',place:'Ort',reason:'Anlass',questions:'Fragen für den Termin',complaints:'Beschwerden',actions:'Durchgeführte Untersuchung',findings:'Befunde / Ergebnisse',advice:'Empfehlungen / Behandlung',diagnosis:'Ärztliche Einschätzung / Diagnose',medications:'Vereinbarte Medikamente / Maßnahmen',followup:'Nachkontrolle',testResult:'Testergebnis',testType:'Testart',status:'Status',flow:'Blutungsstärke',periodEvent:'Blutungsereignis',color:'Farbe',texture:'Konsistenz',amount:'Menge',odor:'Geruch',pain:'Schmerzstärke',mood:'Stimmung',contraception:'Verhütung',protection:'Schutz',feeling:'Wohlbefinden',symptoms:'Symptome',temperature:'Temperatur'};return Object.entries(d).filter(([k,v])=>labels[k]&&v!==''&&v!==null&&v!==undefined).map(([k,v])=>`<div class="health-detail"><b>${esc(labels[k])}</b><span>${esc(v)}</span></div>`).join('');}
function listMarkup(list){return list.length?`<div class="health-entries">${[...list].sort((a,b)=>b.date.localeCompare(a.date)||String(b.created||'').localeCompare(String(a.created||''))).map(x=>`<article class="health-entry"><div><small>${fmt(x.date)}${x.details?.time?' · '+esc(x.details.time):''} · ${esc(SECTIONS.find(s=>s[0]===x.category)?.[1]||'Eintrag')}</small><h3>${esc(x.title)}</h3>${x.text?`<p>${esc(x.text).replaceAll('\n','<br>')}</p>`:''}${detailMarkup(x)}${attachMarkup(x)}</div><div class="health-entry-actions"><button type="button" class="health-neutral" data-health-edit="${esc(x.id)}">Bearbeiten</button><button type="button" class="health-delete" data-health-delete="${esc(x.id)}">Löschen</button></div></article>`).join('')}</div>`:'<p class="health-empty">Noch keine Einträge vorhanden.</p>';}
function pregnancyMarkup(){
 const status=pregnancy.status||'unbekannt', start=pregnancy.lastPeriod||cycle.start||'';
 const elapsed=validDate(start)?days(start,today()):-1;
 const showWeek=['moeglich','test-positiv','bestaetigt'].includes(status)&&elapsed>=0&&elapsed<300;
 return `<div class="health-info"><strong>Schwangerschaftsstatus</strong><form id="healthPregnancyForm" class="health-structured-form">
 ${choice('status','Aktueller Status',[['unbekannt','Unbekannt'],['moeglich','Möglich / Periode ausständig'],['test-positiv','Test positiv – noch nicht bestätigt'],['bestaetigt','Ärztlich bestätigt'],['nicht-schwanger','Aktuell nicht schwanger']],status)}
 ${field('lastPeriod','Erster Tag der letzten Periode (optional)','date',pregnancy.lastPeriod||'')}
 <button class="health-save" type="submit">Status speichern</button></form>
 ${showWeek?`<p><b>Rechnerisch SSW ${Math.floor(elapsed/7)+1} (${elapsed%7}+${0})</b> · voraussichtlicher Geburtstermin: ${fmt(datePlus(start,280))}.</p><p>Rechnerische Orientierung ab letzter Periode; die Datierung kann ärztlich abweichen.</p>`:'<p>Keine Schwangerschaftsdiagnose aus Zyklus oder Symptomen. Test oder medizinische Abklärung erforderlich.</p>'}</div>`;
}
function cycleMarkup(){return `<form class="health-cycle-form" id="healthCycleForm"><h3>Meine Zykluseinstellungen</h3>${field('start','Erster Tag der letzten Periode','date',cycle.start||'',`max="${today()}" required`)}${field('length','Übliche Zykluslänge (Tage)','number',cycle.length||'', 'min="18" max="60" required')}<button class="health-save" type="submit">Zyklus speichern</button><p>Schätzungen können stark abweichen und eignen sich nicht zur Verhütung.</p></form>`;}
function sectionMarkup(){
 const sec=SECTIONS.find(x=>x[0]===category);if(!sec)return startMarkup();
 if(category==='lernzentrum')return `<button type="button" class="health-breadcrumb" data-health-go="start">‹ Zur Übersicht</button><div class="health-section-heading"><img src="${icon(category)}" alt=""/><h2>Lernzentrum</h2></div><div class="health-info">Das Lernzentrum bleibt in dieser Basisversion zurückgestellt.</div>`;
 const list=records.filter(r=>r.category===category);const appointments=list.filter(r=>r.details?.kind==='frauenarzt'&&r.details?.visitStatus!=='abgeschlossen');
 return `<button type="button" class="health-breadcrumb" data-health-go="start">‹ Zur Übersicht</button><div class="health-section-heading"><img alt="" src="${icon(category)}"/><div><h2>${esc(sec[1])}</h2><p>${esc(sec[2])}</p></div></div>${category==='zyklus'?cycleMarkup():''}${category==='schwangerschaft'?pregnancyMarkup():''}
 ${category==='untersuchungen'?`<div class="health-info"><strong>Vor und nach dem Termin</strong><p><b>Vorher:</b> Fragen, Beschwerden und gewünschte Themen notieren. <b>Nachher:</b> denselben Eintrag bearbeiten, Status auf „Durchgeführt“ ändern und Befunde sowie nächste Schritte ergänzen.</p><p>Bitte ärztliche Aussagen von eigenen Beobachtungen unterscheiden. Keine automatische Diagnose.</p></div>`:''}
 ${category==='untersuchungen'&&appointments.length?`<p class="health-appointment-count">${appointments.length} offene(r) Termin(e) – für den Termin bitte denselben Eintrag später weiterbearbeiten.</p>`:''}<div class="health-list-title"><h3>Meine Einträge (${list.length})</h3><button class="health-add" type="button" id="healthAdd">+ Eintrag</button></div>${formOpen?formMarkup():''}${listMarkup(list)}`;
}
function extraFields(cat,d){
 if(cat==='untersuchungen')return `<div class="health-form-section"><h4>Untersuchung und Termin</h4>${choice('kind','Art der Dokumentation',[['frauenarzt','Frauenarzttermin'],['selbst','Eigene Beobachtung'],['labor','Labor / Befund'],['sonstiges','Sonstiges']],d.kind||'frauenarzt')}${choice('visitStatus','Status',[['geplant','Geplant / noch offen'],['abgeschlossen','Durchgeführt / abgeschlossen']],d.visitStatus||'geplant')}${field('time','Uhrzeit','time',d.time||'')}${field('provider','Ärztin / Praxis (optional)','text',d.provider||'','maxlength="160"')}${field('place','Ort (optional)','text',d.place||'','maxlength="160"')}${area('reason','Grund des Termins',d.reason||'')}${area('complaints','Beschwerden / eigene Beobachtungen',d.complaints||'')}${area('questions','Meine Fragen für die Ärztin',d.questions||'')}${area('actions','Was wurde untersucht?',d.actions||'')}${area('findings','Ergebnisse / Befunde',d.findings||'')}${area('diagnosis','Von der Ärztin mitgeteilte Einschätzung / Diagnose',d.diagnosis||'')}${area('advice','Empfehlungen / Behandlung',d.advice||'')}${area('medications','Vereinbarte Medikamente / Maßnahmen (optional)',d.medications||'')}${field('followup','Nächster Termin / Nachkontrolle','date',d.followup||'')}</div>`;
 if(cat==='schwangerschaft')return `<div class="health-form-section"><h4>Test oder Schwangerschaftsnotiz</h4>${choice('testType','Art',[['urintest','Schwangerschaftstest (Urin)'],['bluttest','Bluttest'],['arzt','Ärztliche Untersuchung'],['notiz','Allgemeine Notiz']],d.testType||'urintest')}${choice('testResult','Ergebnis',[['unbekannt','Noch unbekannt'],['positiv','Positiv'],['negativ','Negativ'],['ungueltig','Ungültig / unklar'],['offen','Keine Testergebnisse']],d.testResult||'unbekannt')}${area('symptoms','Beobachtungen',d.symptoms||'')}</div>`;
 if(cat==='periode')return `<div class="health-form-section"><h4>Periode dokumentieren</h4>${choice('periodEvent','Ereignis',[['beginn','Beginn der Periode'],['laufend','Blutung / weiterer Tag'],['ende','Ende der Periode'],['schmierblutung','Schmierblutung']],d.periodEvent||'beginn')}${choice('flow','Blutungsstärke',[['','Nicht angegeben'],['leicht','Leicht'],['mittel','Mittel'],['stark','Stark']],d.flow||'')}${choice('pain','Schmerzstärke',[['','Nicht angegeben'],['0','0 – keine'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['6','6'],['7','7'],['8','8'],['9','9'],['10','10 – sehr stark']],d.pain||'')}</div>`;
 if(cat==='ausfluss')return `<div class="health-form-section"><h4>Beobachtungen zum Ausfluss</h4>${choice('color','Farbe',[['','Nicht angegeben'],['klar','Klar'],['weiss','Weiß'],['gelb','Gelb'],['gruen','Grün'],['braun','Braun'],['rosa','Rosa'],['anders','Anders']],d.color||'')}${choice('texture','Konsistenz',[['','Nicht angegeben'],['fluessig','Flüssig'],['cremig','Cremig'],['dehnbar','Dehnbar'],['kruemelig','Krümelig'],['anders','Anders']],d.texture||'')}${choice('amount','Menge',[['','Nicht angegeben'],['wenig','Wenig'],['normal','Normal'],['viel','Viel']],d.amount||'')}${choice('odor','Geruch',[['','Nicht angegeben'],['unauffaellig','Unauffällig'],['auffaellig','Auffällig']],d.odor||'')}${area('symptoms','Zusätzliche Beschwerden',d.symptoms||'')}</div>`;
 if(cat==='sex')return `<div class="health-form-section"><h4>Privater Eintrag (freiwillig)</h4>${choice('protection','Schutz',[['','Nicht angegeben'],['ja','Ja'],['nein','Nein'],['unklar','Unklar']],d.protection||'')}${field('contraception','Verhütung (optional)','text',d.contraception||'','maxlength="160"')}${area('feeling','Wohlbefinden / Beobachtungen',d.feeling||'')}</div>`;
 if(cat==='tagebuch')return `<div class="health-form-section"><h4>Befinden</h4>${choice('mood','Stimmung',[['','Nicht angegeben'],['gut','Gut'],['neutral','Neutral'],['angespannt','Angespannt'],['traurig','Traurig'],['andere','Andere']],d.mood||'')}${area('symptoms','Symptome',d.symptoms||'')}</div>`;
 return `<div class="health-form-section"><h4>Zyklusbeobachtung</h4>${area('symptoms','Symptome',d.symptoms||'')}</div>`;
}
function formMarkup(){
 const item=records.find(r=>r.id===editId),d=item?.details||{};
 return `<form id="healthEntryForm" class="health-entry-form"><h3>${item?'Eintrag bearbeiten':'Neuer Eintrag'}</h3>${field('date','Datum','date',item?.date||today(),'required')}${field('title','Titel','text',item?.title||(category==='untersuchungen'?'Frauenarzttermin':category==='schwangerschaft'?'Schwangerschaftstest':''),'required maxlength="140"')}${extraFields(category,d)}${area('text','Weitere persönliche Notizen',item?.text||'','Optional')}
 <label>Foto oder PDF (optional, maximal 4 MB pro Eintrag)<input name="attachment" type="file" accept="image/png,image/jpeg,image/webp,application/pdf"/></label>${item&&(item.attachment||item.photo)?`<div class="health-existing-file">Vorhandener Anhang: ${esc(item.attachment?.name||'Bild')} ${attachMarkup(item)}<label><input type="checkbox" name="removeAttachment" value="1"/> Vorhandenen Anhang entfernen</label></div>`:''}
 <div class="health-form-actions"><button type="submit" class="health-save">${item?'Änderungen speichern':'Eintrag speichern'}</button><button type="button" class="health-neutral" id="healthCancel">Abbrechen</button></div></form>`;
}
function calendarMarkup(){
 const [year,month]=calendarMonth.split('-').map(Number);const first=new Date(Date.UTC(year,month-1,1)),offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(year,month,0)).getUTCDate(),map=new Map();
 for(const r of records)map.set(r.date,(map.get(r.date)||0)+1);
 const cells=Array.from({length:offset},()=>'<span class="health-calendar-blank"></span>').join('')+Array.from({length:count},(_,i)=>{const date=`${calendarMonth}-${String(i+1).padStart(2,'0')}`;return `<button type="button" class="health-calendar-day ${map.has(date)?'has-entry':''} ${selectedDay===date?'selected':''}" data-health-day="${date}" aria-label="${fmt(date)}"><b>${i+1}</b>${map.has(date)?`<small>${map.get(date)}</small>`:''}</button>`;}).join('');
 const list=selectedDay?records.filter(r=>r.date===selectedDay):records.filter(r=>r.date.startsWith(calendarMonth));
 return `<h2 class="health-subhead">Gesundheitskalender</h2><div class="health-calendar-head"><button type="button" data-health-month="-1" aria-label="Vorheriger Monat">‹</button><strong>${new Intl.DateTimeFormat('de-AT',{month:'long',year:'numeric',timeZone:'UTC'}).format(first)}</strong><button type="button" data-health-month="1" aria-label="Nächster Monat">›</button></div><div class="health-calendar-grid">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d=>`<span class="health-calendar-weekday">${d}</span>`).join('')}${cells}</div><div class="health-list-title"><h3>${selectedDay?fmt(selectedDay):'Einträge im Monat'}</h3><button class="health-neutral" type="button" data-health-resetday="1">Alle im Monat</button></div>${listMarkup(list)}`;
}
function entriesMarkup(){return `<h2 class="health-subhead">Alle Einträge</h2><p class="health-subtext">Privat auf diesem Gerät gespeichert. Bitte regelmäßig ein verschlüsseltes Backup erstellen.</p>${listMarkup(records)}`;}
function renderInterior(){return tab==='start'?(category?sectionMarkup():startMarkup()):tab==='kalender'?calendarMarkup():tab==='eintraege'?entriesMarkup():`<h2 class="health-subhead">Mehr & Datenschutz</h2><div class="health-info"><strong>Private Gesundheitsdaten</strong><p>Diese Einträge werden lokal im Browser gespeichert, derzeit ohne eigene App-PIN und ohne lokale Verschlüsselung. Geräte-Bildschirmsperre ist wichtig. Verschlüsselte Gesamtsicherung unter Mein Alltag → Mehr & Einstellungen.</p></div><button type="button" class="health-more-btn" data-health-settings="1">Backup & Einstellungen öffnen</button>`;}
export function renderHealth(){return `<div class="health-app" id="healthApp"><header class="health-heading"><div><h1>Frauengesundheit <span>♡</span></h1><p>Dein Körper. Dein Wissen. Deine Stärke.</p></div><button class="health-profile" type="button" data-health-home="1" aria-label="Zur Hauptseite Mein Alltag">●</button></header><div class="health-content" id="healthContent">${renderInterior()}</div><p class="health-alert" id="healthMessage" role="status" aria-live="polite">${esc(message)}</p><nav class="health-nav" aria-label="Navigation Frauengesundheit">${[['start','⌂','Start'],['kalender','▦','Kalender'],['eintraege','▤','Einträge'],['mehr','•••','Mehr']].map(([id,ico,label])=>`<button class="health-tab ${tab===id?'on':''}" type="button" data-health-tab="${id}" ${tab===id?'aria-current="page"':''}><span>${ico}</span><b>${label}</b></button>`).join('')}</nav></div>`;}
function updateUI(){const app=document.getElementById('healthApp');if(!app)return;app.outerHTML=renderHealth();bindHealth();}
function setMsg(v){message=v;const el=document.getElementById('healthMessage');if(el)el.textContent=v;}
function readFile(file){return new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(new Error('Datei konnte nicht gelesen werden.'));reader.readAsDataURL(file);});}
const FORM_FIELDS={zyklus:['symptoms'],periode:['periodEvent','flow','pain'],ausfluss:['color','texture','amount','odor','symptoms'],sex:['protection','contraception','feeling'],schwangerschaft:['testType','testResult','symptoms'],tagebuch:['mood','symptoms'],untersuchungen:['kind','visitStatus','time','provider','place','reason','complaints','questions','actions','findings','diagnosis','advice','medications','followup']};
async function saveForm(e){
 e.preventDefault();const f=e.currentTarget,data=new FormData(f),title=String(data.get('title')||'').trim(),date=String(data.get('date')||'');
 if(!title||!validDate(date))return setMsg('Bitte gültigen Titel und Datum eingeben.');
 const old=records.find(x=>x.id===editId),file=f.elements.attachment.files?.[0];let attachment=old?.attachment||null,photo=old?.photo||'';
 if(file){if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||file.size===0||file.size>4*1024*1024)return setMsg('Nur JPG/PNG/WebP/PDF bis maximal 4 MB möglich.');const raw=await readFile(file);attachment={name:file.name.slice(0,160),mime:file.type,data:raw};photo='';}
 else if(data.has('removeAttachment')){attachment=null;photo='';}
 const details={};for(const name of FORM_FIELDS[category]||[])details[name]=String(data.get(name)||'').slice(0,8000);
 const entry={id:old?.id||crypto.randomUUID(),category,date,title,text:String(data.get('text')||'').slice(0,8000),details,attachment,photo,created:old?.created||new Date().toISOString(),updated:new Date().toISOString()};
 const next=old?records.map(x=>x.id===old.id?entry:x):[...records,entry];
 try{
  const values=[[ENTRIES,next]];
  if(category==='periode'&&details.periodEvent==='beginn'&&(!cycle.start||date>=cycle.start))values.push([CYCLE,{...cycle,start:date}]);
  await setModuleValues(STORE,values);records=next;if(values.length>1)cycle={...cycle,start:date};formOpen=false;editId='';message='Eintrag gespeichert.';updateUI();
 }catch(err){setMsg('Speichern fehlgeschlagen: '+err.message);}
}
async function saveCycle(e){e.preventDefault();const d=new FormData(e.currentTarget),length=Number(d.get('length')),start=String(d.get('start')||'');if(!validDate(start)||start>today()||!Number.isInteger(length)||length<18||length>60)return setMsg('Gültigen Periodenbeginn und 18–60 Tage eingeben.');try{await setModuleValue(STORE,CYCLE,{start,length});cycle={start,length};message='Zyklus gespeichert.';updateUI();}catch(err){setMsg(err.message);}}
async function savePregnancy(e){e.preventDefault();const d=new FormData(e.currentTarget),status=String(d.get('status')||'unbekannt'),lastPeriod=String(d.get('lastPeriod')||'');if(!['unbekannt','moeglich','test-positiv','bestaetigt','nicht-schwanger'].includes(status)||(lastPeriod&&(!validDate(lastPeriod)||lastPeriod>today())))return setMsg('Bitte gültige Angaben eingeben.');try{await setModuleValue(STORE,PREG,{status,lastPeriod});pregnancy={status,lastPeriod};message='Schwangerschaftsstatus gespeichert.';updateUI();}catch(err){setMsg(err.message);}}
async function deleteEntry(id){if(!window.confirm('Diesen Eintrag und seine Anhänge endgültig löschen?'))return;const next=records.filter(r=>r.id!==id);try{await setModuleValue(STORE,ENTRIES,next);records=next;message='Eintrag gelöscht.';updateUI();}catch(err){setMsg(err.message);}}
function bindHealth(){const app=document.getElementById('healthApp');if(!app)return;
 app.querySelectorAll('[data-health-section]').forEach(b=>b.addEventListener('click',()=>{tab='start';category=b.dataset.healthSection;formOpen=false;editId='';message='';updateUI();}));
 app.querySelectorAll('[data-health-quick]').forEach(b=>b.addEventListener('click',()=>{tab='start';category=b.dataset.healthQuick;formOpen=true;editId='';message='';updateUI();}));
 app.querySelectorAll('[data-health-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.healthTab;category='';selectedDay='';formOpen=false;editId='';message='';updateUI();}));
 app.querySelectorAll('[data-health-go]').forEach(b=>b.addEventListener('click',()=>{tab='start';category='';formOpen=false;editId='';updateUI();}));
 app.querySelectorAll('[data-health-delete]').forEach(b=>b.addEventListener('click',()=>deleteEntry(b.dataset.healthDelete)));
 app.querySelectorAll('[data-health-edit]').forEach(b=>b.addEventListener('click',()=>{const r=records.find(x=>x.id===b.dataset.healthEdit);if(!r)return;tab='start';category=r.category;editId=r.id;formOpen=true;message='';updateUI();document.getElementById('healthEntryForm')?.scrollIntoView({block:'start'});}));
 app.querySelector('[data-health-home]')?.addEventListener('click',()=>{location.hash='#/home';});
 app.querySelector('[data-health-settings]')?.addEventListener('click',()=>{location.hash='#/more';});
 app.querySelectorAll('[data-health-month]').forEach(b=>b.addEventListener('click',()=>{const [y,m]=calendarMonth.split('-').map(Number),date=new Date(Date.UTC(y,m-1+Number(b.dataset.healthMonth),1));calendarMonth=fromUTC(date).slice(0,7);selectedDay='';updateUI();}));
 app.querySelectorAll('[data-health-day]').forEach(b=>b.addEventListener('click',()=>{selectedDay=b.dataset.healthDay;updateUI();}));
 app.querySelector('[data-health-resetday]')?.addEventListener('click',()=>{selectedDay='';updateUI();});
 app.querySelector('#healthAdd')?.addEventListener('click',()=>{formOpen=true;editId='';updateUI();document.getElementById('healthEntryForm')?.scrollIntoView({block:'start'});});
 app.querySelector('#healthCancel')?.addEventListener('click',()=>{formOpen=false;editId='';updateUI();});
 app.querySelector('#healthEntryForm')?.addEventListener('submit',e=>saveForm(e).catch(err=>setMsg(err.message)));
 app.querySelector('#healthCycleForm')?.addEventListener('submit',saveCycle);
 app.querySelector('#healthPregnancyForm')?.addEventListener('submit',savePregnancy);
}
export async function mountHealth(){tab='start';category='';formOpen=false;editId='';message='';calendarMonth=today().slice(0,7);selectedDay='';try{const [items,c,p]=await Promise.all([getModuleValue(STORE,ENTRIES),getModuleValue(STORE,CYCLE),getModuleValue(STORE,PREG)]);records=Array.isArray(items)?items:[];cycle=c||{};pregnancy=p||{};}catch(e){message='Speicher nicht verfügbar: '+e.message;}updateUI();}