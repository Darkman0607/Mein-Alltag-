/** Lernschule LS01 – offlinefähiger Lese-Einstieg im Frauengesundheit-Modul.
 * Alle Daten bleiben im bestehenden IndexedDB-Store 'frauengesundheit',
 * unter einem separaten Schlüssel – Tagebuch/Periode werden nicht verändert.
 * Bearbeiten und Veröffentlichen erfolgen erst in einem späteren Admin-Update.
 */
import {getModuleValue,setModuleValue} from '../assets/database.js';
export const LEARNING_KEY='health.lernschule.library.v1';
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
export function clearLearningView(){topicId='';chapterId='';query='';error='';}
export async function loadLearning(){
 try{
  const saved=await getModuleValue(STORE,LEARNING_KEY);
  if(saved===null){const defaults=createLearningLibrary();await setModuleValue(STORE,LEARNING_KEY,defaults);library=defaults;}
  else library=validateLearningLibrary(saved);
  error='';
 }catch(e){error='Lernschule konnte nicht geladen werden: '+e.message;}
 return !error;
}
const countLessons=c=>(c.sections||[]).reduce((n,s)=>n+(s.lessons||[]).length,0);
const topicById=id=>library.topics.find(t=>t.id===id);
export function renderLearning(){
 const topic=topicById(topicId),chapter=topic?.chapters?.find(c=>c.id===chapterId);
 const intro=`<div class="ls-header"><div class="ls-icon" aria-hidden="true">📚</div><div><span class="ls-overline">DEINE LERNSCHULE</span><h2>Wissen entdecken</h2><p>Themen, Kapitel und Lektionen – alles an einem Ort.</p></div></div>`;
 if(error)return `${intro}<div class="ls-notice" role="alert">${escapeHTML(error)}</div>`;
 if(chapter)return `${intro}<div class="ls-trail"><button type="button" data-ls-back="topics">Alle Themen</button><span>›</span><button type="button" data-ls-back="chapters">${escapeHTML(topic.title)}</button></div><section class="ls-detail"><span class="ls-overline">KAPITEL</span><h3>${escapeHTML(chapter.title)}</h3><p>Dieses Kapitel ist vorbereitet. Es enthält noch keine Lektionen. Inhalte und Wissenstests folgen mit dem geschützten Lerneditor.</p><div class="ls-empty">Noch keine Unterkapitel oder Lektionen vorhanden.</div></section>`;
 if(topic)return `${intro}<div class="ls-trail"><button type="button" data-ls-back="topics">Alle Themen</button><span>›</span><b>${escapeHTML(topic.title)}</b></div><section class="ls-detail"><span class="ls-overline">LERNTHEMA</span><h3>${escapeHTML(topic.title)}</h3><p>${escapeHTML(topic.subtitle)}</p></section><div class="ls-stack">${topic.chapters.map(c=>`<button type="button" class="ls-item" data-ls-chapter="${escapeHTML(c.id)}"><span class="ls-chapter-icon">▤</span><span class="ls-item-main"><strong>${escapeHTML(c.title)}</strong><small>${countLessons(c)} Lektionen · vorbereitet</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`;
 const q=query.trim().toLocaleLowerCase('de-AT');
 const topics=library.topics.filter(t=>!q||[t.title,t.subtitle,...t.chapters.map(c=>c.title)].join(' ').toLocaleLowerCase('de-AT').includes(q));
 return `${intro}<div class="ls-intro"><strong>Deine persönliche Lernbibliothek</strong><p>Alle Themen sind bereits angelegt. Die Kapitel sind noch leer – es wurden keine medizinischen Inhalte vorgetäuscht.</p></div><label class="ls-search-label" for="lsSearch">Themen und Kapitel suchen<input id="lsSearch" type="search" maxlength="120" autocomplete="off" value="${escapeHTML(query)}" placeholder="z. B. Zyklus, Brust, Vorsorge"/></label><p class="ls-result-count" id="lsResultCount">${topics.length} von ${library.topics.length} Themen</p><div class="ls-grid" id="lsTopicResults">${topics.map((t,i)=>`<button type="button" class="ls-topic" data-ls-topic="${escapeHTML(t.id)}"><span class="ls-topic-symbol" aria-hidden="true">${['♡','◷','✿','◈','◇','❀','✚'][library.topics.indexOf(t)%7]}</span><strong>${escapeHTML(t.title)}</strong><small>${t.chapters.length} Kapitel · 0 Lektionen</small><span class="ls-topic-arrow" aria-hidden="true">›</span></button>`).join('')||'<div class="ls-empty">Keine passenden Themen gefunden.</div>'}</div><div class="ls-info"><strong>🔒 Lerninhalte verwalten</strong><p>Der passwortgeschützte Admin-Editor und die Wissenstests kommen in den nächsten Lernschul-Updates. Lesen und Nachschlagen bleiben ohne Anmeldung zugänglich.</p></div>`;
}
export function bindLearning(root,onChange){
 if(!root)return;
 root.querySelector('#lsSearch')?.addEventListener('input',e=>{query=e.target.value;const temp=document.createElement('div');temp.innerHTML=renderLearning();root.querySelector('#lsTopicResults')?.replaceWith(temp.querySelector('#lsTopicResults'));root.querySelector('#lsResultCount')?.replaceWith(temp.querySelector('#lsResultCount'));bindTopicButtons(root,onChange);});
 bindTopicButtons(root,onChange);
 root.querySelectorAll('[data-ls-chapter]').forEach(b=>b.addEventListener('click',()=>{chapterId=b.dataset.lsChapter;onChange();}));
 root.querySelectorAll('[data-ls-back]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.lsBack==='topics'){topicId='';chapterId='';}else chapterId='';onChange();}));
}
function bindTopicButtons(root,onChange){root.querySelectorAll('[data-ls-topic]').forEach(b=>b.addEventListener('click',()=>{topicId=b.dataset.lsTopic;chapterId='';query='';onChange();}));}
