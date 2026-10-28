/** L16.2 – reine UI-Umordnung; die Lagerdatenbank bleibt unverändert. */
const opened=new Set();
export function resetCompactRoomUi(){opened.clear();}

/** Native <details> statt langer Formulare; Dialoge bleiben außerhalb der Klappgruppen. */
export function enhanceRoomUi(root,{selected=false,selectedCompartment=false}={}){
 const stage=root.querySelector('#lagerStage');
 if(!stage)return;
 const status=root.querySelector('#lagerStatus');
 const panelList=document.createElement('div');
 panelList.className='lager-room-folds';
 panelList.setAttribute('aria-label','Aufklappbare Lagereinstellungen');
 status.before(panelList);
 const fold=(key,label,description,icon,nodes)=>{
  const content=nodes.filter(Boolean);
  if(!content.length)return null;
  const details=document.createElement('details');
  details.className='lager-room-fold';
  details.dataset.roomFold=key;
  const isOpen=opened.has(key)||(key==='edit'&&selected)||(key==='fach'&&selectedCompartment);
  details.open=isOpen;
  const summary=document.createElement('summary');
  summary.className='lager-room-fold-head';
  const symbol=document.createElement('span');symbol.className='lager-room-fold-icon';symbol.setAttribute('aria-hidden','true');symbol.textContent=icon;
  const heading=document.createElement('span');heading.className='lager-room-fold-label';
  const strong=document.createElement('strong');strong.textContent=label;
  const small=document.createElement('small');small.textContent=description;
  heading.append(strong,small);
  const arrow=document.createElement('span');arrow.className='lager-room-fold-chevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';
  summary.append(symbol,heading,arrow);
  const body=document.createElement('div');body.className='lager-room-fold-body';
  content.forEach(node=>body.append(node));
  details.append(summary,body);panelList.append(details);
  details.addEventListener('toggle',()=>{
   if(!root.contains(details))return;
   if(details.open)opened.add(key);else opened.delete(key);
  });
  return details;
 };
 const floor=fold('floor','Bodenlager & freie Stellplätze','Rasenmäher, Geräte und Schachteln','🧰',[root.querySelector('.lager-floor-chooser')]);
 const furniture=fold('furniture','Regale & Möbel hinzufügen','Möbelbibliothek und Stellplätze','▤',[root.querySelector('.lager-chooser')]);
 fold('fach','Fächer & Artikel verwalten','Fächer und Bestandsbuchungen','▣',[root.querySelector('.lager-fach-overview')]);
 fold('unassigned','Noch nicht eingeräumt','Artikel ohne Regalzuordnung','📦',[root.querySelector('.lager-unassigned')]);
 fold('edit','Ausgewähltes Möbel bearbeiten','Position, Name und Fächer','✎',[root.querySelector('.lager-editor'),root.querySelector('.lager-compartments')]);
 const footer=root.querySelector('.lager-room-footer');
 const editRoom=root.querySelector('#lagerEditRoom');
 if(footer&&editRoom)footer.prepend(editRoom);
 fold('room','Raumeinstellungen','Raum bearbeiten und weitere Optionen','⚙',[footer]);
 const quick=document.createElement('div');quick.className='lager-stage-quick';
 const addButton=(id,label,variant,target,focus)=>{
  const button=document.createElement('button');button.type='button';button.id=id;button.className=variant;button.textContent=label;
  button.addEventListener('click',()=>{
   if(!target)return;
   target.open=true;opened.add(target.dataset.roomFold);
   target.scrollIntoView({behavior:'smooth',block:'start'});
   const ctl=target.querySelector(focus);
   if(ctl)window.setTimeout(()=>ctl.focus({preventScroll:true}),220);
  });
  quick.append(button);
 };
 addButton('lagerQuickFloor','＋ Bodenobjekt','primary-button',floor,'#lagerFloorKind');
 addButton('lagerQuickFurniture','＋ Regal / Möbel','secondary-button',furniture,'#lagerFurnitureCategory');
 stage.before(quick);
 const tools=root.querySelector('.lager-stage-tools');
 const controls=tools?.querySelector('.lager-stage-buttons');
 const full=tools?.querySelector('#lagerFullScreen');
 if(tools&&controls&&full){
  const detail=document.createElement('details');detail.className='lager-stage-control-fold';detail.dataset.roomFold='controls';detail.open=opened.has('controls');
  const summary=document.createElement('summary');summary.textContent='⚙ 3D-Steuerung';
  const body=document.createElement('div');body.className='lager-stage-control-body';
  const oldHint=tools.querySelector('span');
  if(oldHint){oldHint.className='lager-hint';body.append(oldHint);}
  body.append(controls);detail.append(summary,body);
  tools.prepend(detail);
  full.classList.add('lager-fullscreen-toggle');tools.append(full);
  detail.addEventListener('toggle',()=>{if(root.contains(detail)){if(detail.open)opened.add('controls');else opened.delete('controls');}});
 }
}
