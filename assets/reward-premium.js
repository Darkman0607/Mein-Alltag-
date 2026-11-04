/** BW11 – optional premium effects. Preferences are stored in the existing
 * belohnungswelt IndexedDB module store so encrypted full backups include them.
 * Visuals never write reward catalog, instances or wallet data. */
import {getModuleValue,setModuleValue} from './database.js';

export const BW11_SETTINGS_KEY='bw11:visual-preferences';
export const BW11_DEFAULT=Object.freeze({effects:'full',sound:false});
const VALID_EFFECTS=new Set(['full','reduced','off']);
let current={...BW11_DEFAULT};
let loaded=false;
let loading=null;
export function normalizePremiumSettings(raw){
 return {effects:VALID_EFFECTS.has(raw?.effects)?raw.effects:BW11_DEFAULT.effects,sound:raw?.sound===true};
}
export function getActivePremiumSettings(){return {...current};}
function applyPremiumSettings(value){
 current=normalizePremiumSettings(value);
 if(typeof document!=='undefined')document.documentElement.dataset.bw11Effects=current.effects;
 return {...current};
}
export async function loadPremiumSettings(){
 if(loaded)return getActivePremiumSettings();
 if(!loading)loading=getModuleValue('belohnungswelt',BW11_SETTINGS_KEY)
  .then(x=>{loaded=true;return applyPremiumSettings(x);})
  .finally(()=>{loading=null;});
 return loading;
}
export async function savePremiumSettings(next){
 const prefs=normalizePremiumSettings(next);
 await setModuleValue('belohnungswelt',BW11_SETTINGS_KEY,prefs);
 loaded=true;
 return applyPremiumSettings(prefs);
}
export function renderPremiumSettings(){return `<section class="bw11-settings" aria-label="Karteneffekte einstellen">
 <div class="bw11-setting-header"><b>✨ Premium-Karteneffekte</b><span>BW11</span></div>
 <div class="bw11-settings-fields"><label>Animationen <select class="bw11-effects-select" data-bw11-setting="effects" disabled><option value="full">Volle Effekte</option><option value="reduced">Reduziert</option><option value="off">Aus</option></select></label>
 <label class="bw11-sound-label"><input type="checkbox" data-bw11-setting="sound" disabled/> Ton bei Kartenaufdeckung</label></div>
 <p>Volle Effekte laufen nur in der Karten-Großansicht und aufgedeckten Boostern. Bei System-Einstellung „Bewegung reduzieren“ bleiben Animationen immer ausgeschaltet. Ton ist standardmäßig aus.</p>
 <p class="bw11-setting-message" data-bw11-message role="status" aria-live="polite">Lade Einstellungen …</p>
 </section>`;}
export function mountPremiumSettings(root){
 if(!root)return;
 const selects=[...root.querySelectorAll('[data-bw11-setting="effects"]')],checks=[...root.querySelectorAll('[data-bw11-setting="sound"]')];
 const notes=[...root.querySelectorAll('[data-bw11-message]')];
 const note=(s,error=false)=>notes.forEach(n=>{if(!n.isConnected)return;n.textContent=s;n.classList.toggle('is-error',error);});
 const sync=v=>{selects.forEach(s=>{if(s.isConnected){s.value=v.effects;s.disabled=false;}});checks.forEach(s=>{if(s.isConnected){s.checked=v.sound;s.disabled=false;}});};
 const start=()=>loadPremiumSettings().then(v=>{if(root.isConnected){sync(v);note('Einstellungen geladen.');}}).catch(err=>{note('Speicherfehler: '+err.message,true);});
 void start();
 let saving=false;
 async function update(part){
  if(saving)return;saving=true;selects.forEach(s=>s.disabled=true);checks.forEach(s=>s.disabled=true);
  try{const next=await savePremiumSettings({...getActivePremiumSettings(),...part});if(root.isConnected){sync(next);note('✓ Einstellungen gespeichert.');}}
  catch(e){if(root.isConnected){sync(getActivePremiumSettings());note('Speichern fehlgeschlagen: '+e.message,true);}}
  finally{saving=false;}
 }
 root.querySelectorAll('[data-bw11-setting]').forEach(el=>el.addEventListener('change',e=>{
  if(e.target.dataset.bw11Setting==='effects')void update({effects:e.target.value});
  else void update({sound:e.target.checked});
 }));
}
/** Small original synthesised chime; no third-party audio files or autoplay.
 * Only called directly from click/tap after the user has opted in. */
export function playPremiumReveal(rarity='gewoehnlich'){
 if(!current.sound||typeof window==='undefined')return false;
 const AudioCtx=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtx)return false;
 try{
  const ctx=new AudioCtx(),now=ctx.currentTime,high=['legendaer','mythisch','diamant'].includes(rarity);
  const notes=high?[523.25,783.99,1046.5]:[440,659.25];
  notes.forEach((frequency,i)=>{
   const osc=ctx.createOscillator(),vol=ctx.createGain(),start=now+i*.072;
   osc.type='sine';osc.frequency.value=frequency;
   vol.gain.setValueAtTime(.0001,start);vol.gain.exponentialRampToValueAtTime(.065,start+.018);
   vol.gain.exponentialRampToValueAtTime(.0001,start+.17);
   osc.connect(vol);vol.connect(ctx.destination);osc.start(start);osc.stop(start+.18);
  });
  // Close after all oscillators finish; no outstanding playback on navigation.
  if(typeof setTimeout==='function')setTimeout(()=>ctx.close().catch(()=>{}),550);
  return true;
 }catch{return false;}
}
