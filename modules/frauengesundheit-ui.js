/* Mein Alltag · F01 – Gesundheitszentrale. Alle Einträge nur in Store frauengesundheit. */
import {getModuleValue,setModuleValue} from '../assets/database.js';
const SECTIONS=[
 ['zyklus','Zyklus','Verstehe deinen Zyklus besser.'],
 ['periode','Periode','Symptome, Stärke und mehr.'],
 ['ausfluss','Ausfluss','Beobachte Veränderungen.'],
 ['sex','Sex','Lust, Schutz und Wohlbefinden.'],
 ['schwangerschaft','Schwangerschaft','Von Kinderwunsch bis Geburt.'],
 ['lernzentrum','Lernzentrum','Wissen für deine Gesundheit.'],
 ['tagebuch','Tagebuch','Gefühle, Symptome und Gedanken.'],
 ['untersuchungen','Untersuchungen & Notizen','Frauenarztbesuche, Selbstuntersuchung, Befunde.']
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const fmt=d=>{if(!/^\d{4}-\d\d-\d\d$/.test(d||''))return '';const [y,m,day]=d.split('-');return `${day}.${m}.${y}`;};
let tab='start',category='',records=[],cycle={},message='',formOpen=false;
const icon=n=>`./assets/health-icons/${n}.png`;
function cycleCard(){
 const start=cycle.start||'',len=Number(cycle.length||0);
 const utcDay=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d);};
 const startTime=start?utcDay(start):NaN;
 const diff=Number.isFinite(startTime)?Math.round((utcDay(today())-startTime)/86400000):NaN;
 const valid=Number.isFinite(diff)&&diff>=0&&diff<365&&len>=18&&len<=60;
 const day=valid?diff%len+1:null;
 const percentage=day?Math.round(day/len*100):0;
 const next=valid?new Date(startTime+Math.ceil((diff+1)/len)*len*86400000):null;
 const upcoming=next?`${String(next.getUTCDate()).padStart(2,'0')}.${String(next.getUTCMonth()+1).padStart(2,'0')}.${next.getUTCFullYear()}`:'Noch kein Datum';
 return `<button type="button" class="health-cycle-card" data-health-section="zyklus" aria-label="Zyklusübersicht öffnen">
   <div class="health-cycle-ring" style="--progress:${percentage}%"><div class="health-cycle-num"><span>Zyklus Tag</span><strong>${day||'–'}</strong><span>${valid?`von ${len}`:'noch offen'}</span></div></div>
   <div class="health-phase"><span class="health-chip">${valid?'Deine Übersicht':'Aktuelle Phase'}</span><h2>${valid?'Zyklusübersicht':'Noch nicht erfasst'}</h2><p>${valid?'Die Berechnung ist nur eine Schätzung auf Basis deiner Angaben.':'Trage deinen Zyklusstart ein, damit hier deine Übersicht erscheint.'}</p><div class="health-next"><span aria-hidden="true">▣</span><div><b>${valid?'Nächste Periode (geschätzt)':'Zyklus einrichten'}</b><small>${upcoming}</small></div></div></div>
   <img class="health-flower" src="${icon('blume')}" alt=""/><span class="health-cycle-chevron">›</span>
 </button>`;
}
function startMarkup(){return `${cycleCard()}<div class="health-tiles">${SECTIONS.map(([id,title,sub])=>`<button class="health-tile" type="button" data-health-section="${id}"><img alt="" loading="lazy" src="${icon(id)}"/><div class="health-tile-text"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div><span class="health-chevron">›</span></button>`).join('')}</div>`;}
function calendarMarkup(){
 const map=new Map();for(const r of records){map.set(r.date,(map.get(r.date)||0)+1)}
 return `<h2 class="health-subhead">Mein Kalender</h2><p class="health-subtext">Deine gespeicherten Einträge nach Datum.</p><div class="health-entries">${[...map].sort((a,b)=>b[0].localeCompare(a[0])).map(([d,n])=>`<button class="health-date-row" data-health-day="${d}"><b>${fmt(d)}</b><span>${n} Eintrag${n===1?'':'e'} ›</span></button>`).join('')||'<p class="health-empty">Noch keine Einträge vorhanden.</p>'}</div>`;
}
function listMarkup(list){return list.length?`<div class="health-entries">${[...list].sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created)).map(x=>`<article class="health-entry"><div><small>${fmt(x.date)} · ${esc(SECTIONS.find(s=>s[0]===x.category)?.[1]||'Eintrag')}</small><h3>${esc(x.title)}</h3><p>${esc(x.text).replaceAll('\n','<br>')}</p>${x.photo?`<img class="health-photo" src="${x.photo}" alt="Gespeichertes Foto" loading="lazy"/>`:''}</div><button type="button" class="health-delete" data-health-delete="${esc(x.id)}" aria-label="Eintrag löschen">Löschen</button></article>`).join('')}</div>`:'<p class="health-empty">Noch keine Einträge vorhanden.</p>';}
function sectionMarkup(){
 const sec=SECTIONS.find(s=>s[0]===category);if(!sec)return startMarkup();
 const list=records.filter(r=>r.category===category);
 return `<button type="button" class="health-breadcrumb" data-health-go="start">‹ Zur Übersicht</button><div class="health-section-heading"><img alt="" src="${icon(category)}"/><div><h2>${esc(sec[1])}</h2><p>${esc(sec[2])}</p></div></div>
 ${category==='lernzentrum'?`<div class="health-info"><strong>Wissen & eigene Notizen</strong><p>Hier kannst du eigene Lernnotizen sammeln. Medizinisch geprüfte Lerntexte folgen in einem späteren Update. Diese Ansicht stellt keine Diagnose.</p></div>`:''}
 ${category==='zyklus'?`<form class="health-cycle-form" id="healthCycleForm"><h3>Meine Zykluseinstellungen</h3><label>Erster Tag der letzten Periode<input required type="date" name="start" max="${today()}" value="${esc(cycle.start||'')}"></label><label>Gewöhnliche Zykluslänge (Tage)<input required type="number" name="length" min="18" max="60" placeholder="z. B. 28" value="${esc(cycle.length||'')}"></label><button class="health-save" type="submit">Zyklus speichern</button><p>Alle Berechnungen sind Schätzungen, keine zuverlässige Verhütungsmethode.</p></form>`:''}
 <div class="health-list-title"><h3>Meine Einträge (${list.length})</h3><button class="health-add" type="button" id="healthAdd">+ Eintrag</button></div>${formOpen?formMarkup():''}${listMarkup(list)}`;
}
function formMarkup(){return `<form id="healthEntryForm" class="health-entry-form"><h3>Neuer Eintrag</h3><label>Datum<input name="date" type="date" value="${today()}" required max="9999-12-31"/></label><label>Titel<input name="title" maxlength="140" placeholder="z. B. Arzttermin oder Beobachtung" required/></label><label>Notizen<textarea name="text" rows="5" maxlength="10000" placeholder="Deine persönlichen Angaben"></textarea></label><label>Foto (optional, höchstens 3 MB)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"/></label><div class="health-form-actions"><button type="submit" class="health-save">Speichern</button><button type="button" class="health-neutral" id="healthCancel">Abbrechen</button></div></form>`;}
function entriesMarkup(){return `<h2 class="health-subhead">Alle Einträge</h2><p class="health-subtext">Deine privaten Notizen bleiben ausschließlich auf diesem Gerät, bis du sie selbst sicherst.</p><div class="health-list-title"><h3>${records.length} Einträge</h3><button class="health-add" data-health-section="tagebuch">+ Eintrag</button></div>${listMarkup(records)}`;}
function renderInterior(){return tab==='start'?category?sectionMarkup():startMarkup():tab==='kalender'?calendarMarkup():tab==='eintraege'?entriesMarkup():`<h2 class="health-subhead">Mehr</h2><div class="health-info"><strong>Privater Gesundheitsbereich</strong><p>Keine zusätzliche PIN und keine lokale Datenverschlüsselung. Für den Schutz deines Geräts ist die Android-Bildschirmsperre wichtig.</p><p>Verschlüsselte Gesamtbackups findest du unter „Mein Alltag → Mehr & Einstellungen“.</p></div><button type="button" class="health-more-btn" data-health-settings="1">Datenschutz & Gesamtbackup öffnen</button><button type="button" class="health-more-btn" data-health-go="start">Zur Gesundheitsübersicht</button>`;}
export function renderHealth(){return `<div class="health-app" id="healthApp"><header class="health-heading"><div><h1>Frauengesundheit <span>♡</span></h1><p>Dein Körper. Dein Wissen. Deine Stärke.</p></div><button class="health-profile" type="button" data-health-home="1" aria-label="Zurück zur Hauptseite Mein Alltag" title="Zurück zu Mein Alltag">●</button></header><div class="health-content" id="healthContent">${renderInterior()}</div><p class="health-alert" id="healthMessage" role="status" aria-live="polite">${esc(message)}</p><nav class="health-nav" aria-label="Navigation Frauengesundheit">${[['start','⌂','Start'],['kalender','▦','Kalender'],['eintraege','▤','Einträge'],['mehr','•••','Mehr']].map(([id,ico,label])=>`<button class="health-tab ${tab===id?'on':''}" type="button" data-health-tab="${id}" ${tab===id?'aria-current="page"':''}><span>${ico}</span><b>${label}</b></button>`).join('')}</nav></div>`;}
function updateUI(){const app=document.getElementById('healthApp');if(!app)return;app.outerHTML=renderHealth();bindHealth();}
function setMsg(value){message=value;const el=document.getElementById('healthMessage');if(el)el.textContent=value;}
function readFile(file){return new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(new Error('Bild konnte nicht gelesen werden.'));reader.readAsDataURL(file);});}
async function saveForm(e){e.preventDefault();const f=e.currentTarget,d=new FormData(f);const title=String(d.get('title')||'').trim(),date=String(d.get('date')||'');if(!title||!/^\d{4}-\d\d-\d\d$/.test(date))return setMsg('Bitte Titel und Datum eingeben.');const file=f.elements.photo.files?.[0];let photo='';if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>3*1024*1024)return setMsg('Foto muss JPG, PNG oder WebP mit höchstens 3 MB sein.');photo=await readFile(file);}const item={id:crypto.randomUUID(),category,date,title,text:String(d.get('text')||'').slice(0,10000),photo,created:new Date().toISOString()};const next=[...records,item];try{await setModuleValue('frauengesundheit','health.entries.v1',next);records=next;formOpen=false;message='Eintrag gespeichert.';updateUI();}catch(err){setMsg('Speichern fehlgeschlagen: '+err.message);}}
async function saveCycle(e){e.preventDefault();const d=new FormData(e.currentTarget);const length=Number(d.get('length')),start=String(d.get('start')||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||start>today()||!Number.isInteger(length)||length<18||length>60)return setMsg('Bitte gültigen Zyklusstart und eine Länge von 18 bis 60 Tagen eingeben.');try{await setModuleValue('frauengesundheit','health.cycle.v1',{start,length});cycle={start,length};message='Zyklus gespeichert.';updateUI();}catch(err){setMsg(err.message);}}
async function deleteEntry(id){if(!window.confirm('Diesen Eintrag mit einem eventuell enthaltenen Foto endgültig löschen?'))return;const next=records.filter(r=>r.id!==id);try{await setModuleValue('frauengesundheit','health.entries.v1',next);records=next;message='Eintrag gelöscht.';updateUI();}catch(err){setMsg(err.message);}}
function bindHealth(){const app=document.getElementById('healthApp');if(!app)return;
 app.querySelectorAll('[data-health-section]').forEach(b=>b.addEventListener('click',()=>{tab='start';category=b.dataset.healthSection;formOpen=false;message='';updateUI();}));
 app.querySelectorAll('[data-health-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.healthTab;category='';formOpen=false;message='';updateUI();}));
 app.querySelectorAll('[data-health-go]').forEach(b=>b.addEventListener('click',()=>{tab='start';category='';formOpen=false;updateUI();}));
 app.querySelectorAll('[data-health-delete]').forEach(b=>b.addEventListener('click',()=>deleteEntry(b.dataset.healthDelete)));
 app.querySelector('[data-health-home]')?.addEventListener('click',()=>{location.hash='#/home';});
 app.querySelector('[data-health-settings]')?.addEventListener('click',()=>{location.hash='#/more';});
 app.querySelectorAll('[data-health-day]').forEach(b=>b.addEventListener('click',()=>{tab='eintraege';category='';updateUI();}));
 app.querySelector('#healthAdd')?.addEventListener('click',()=>{formOpen=true;updateUI();});
 app.querySelector('#healthCancel')?.addEventListener('click',()=>{formOpen=false;updateUI();});
 app.querySelector('#healthEntryForm')?.addEventListener('submit',e=>saveForm(e).catch(err=>setMsg(err.message)));
 app.querySelector('#healthCycleForm')?.addEventListener('submit',saveCycle);
}
export async function mountHealth(){tab='start';category='';formOpen=false;message='';try{const [items,settings]=await Promise.all([getModuleValue('frauengesundheit','health.entries.v1'),getModuleValue('frauengesundheit','health.cycle.v1')]);records=Array.isArray(items)?items:[];cycle=settings||{};}catch(e){message='Speicher nicht verfügbar: '+e.message;}updateUI();}
