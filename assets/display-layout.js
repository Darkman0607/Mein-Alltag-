/* LAYOUT01: Ansicht bleibt pro Gerät gespeichert; kein Zugriff auf Moduldaten. */
const KEY='meinalltag.layout.preference.v1';
const MODES=['auto','mobile','desktop'];
const media=window.matchMedia('(min-width: 920px)');
const controls=document.getElementById('layoutSwitch');
let preference='auto';
try{const saved=localStorage.getItem(KEY);if(MODES.includes(saved))preference=saved;}catch(_){/* localStorage kann gesperrt sein */}
function updateLayout(){
 const effective=preference==='auto'?(media.matches?'desktop':'mobile'):preference;
 document.body.classList.toggle('layout-desktop',effective==='desktop');
 document.body.classList.toggle('layout-mobile',effective==='mobile');
 document.body.dataset.layoutPreference=preference;
 document.body.dataset.layoutEffective=effective;
 controls?.querySelectorAll('[data-layout-mode]').forEach(button=>{
  const active=button.dataset.layoutMode===preference;
  button.setAttribute('aria-pressed',String(active));
 });
 if(controls)controls.title='Ansicht: '+(preference==='auto'?'Automatisch – ':'')+(effective==='desktop'?'PC':'Handy');
}
export function initDisplayLayout(){
 controls?.addEventListener('click',event=>{
  const button=event.target.closest('button[data-layout-mode]');
  if(!button||!controls.contains(button)||!MODES.includes(button.dataset.layoutMode))return;
  preference=button.dataset.layoutMode;
  try{localStorage.setItem(KEY,preference);}catch(_){/* Umschalten funktioniert trotzdem */}
  updateLayout();
 });
 if(media.addEventListener)media.addEventListener('change',updateLayout);
 else if(media.addListener)media.addListener(updateLayout);
 updateLayout();
}
