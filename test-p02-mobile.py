"""P02 UI-only Chromium interaction. Real IndexedDB and storage contracts are covered by test-p02-data.mjs."""
from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).parent
src='\n'.join(line for line in (p/'modules/putzmanager-cleaning-ui.js').read_text().splitlines() if not line.startswith('import ')).replace('export async function ','async function ')
boot='''(()=>{
const ITEM_KEY='items.v1';
const QUICK_OPTIONS={bad:[['waschbecken','Waschbecken'],['spiegel','Spiegel'],['dusche','Dusche'],['wanne','Badewanne'],['wc','WC'],['schrank','Schränke'],['muelleimer','Mistkübel']],wc:[['wc','WC-Schüssel'],['waschbecken','Handwaschbecken'],['spiegel','Spiegel'],['muelleimer','Mistkübel']],kueche:[['arbeitsplatte','Arbeitsplatte'],['spuele','Spüle'],['herd','Herd'],['kuehlschrank','Kühlschrank'],['geschirrspueler','Geschirrspüler'],['muelleimer','Mistkübel'],['tisch','Tisch'],['dunstabzug','Dunstabzug']]};
const defaults={bad:['waschbecken','spiegel','dusche','wc','muelleimer'],wc:['wc','waschbecken','spiegel','muelleimer'],kueche:['arbeitsplatte','spuele','herd','kuehlschrank','geschirrspueler','muelleimer','tisch']};
const defaultQuickTypes=type=>defaults[type]||[];
const room={id:'test',type:window.roomType,name:{bad:'Badezimmer',wc:'WC',kueche:'Küche'}[window.roomType],sketch3d:{objects:[]}};
let state={active:{},history:[]},presets={},saved={};
const sources=[{itemId:'g',name:'Nitrilhandschuhe',fromId:'',available:6,unit:'stk',pairs:true,label:'Nitrilhandschuhe · 6 stk'},{itemId:'r',name:'Badreiniger',fromId:'',available:500,unit:'ml',pairs:false,label:'Badreiniger · 500 ml'}];
const getModuleValue=async()=>[];
const roomTaskGroups=(room,types=defaultQuickTypes(room.type))=>[{id:'floor',name:'Boden',steps:['Boden freiräumen','Saugen','Wischen'].map((title,i)=>({id:'floor:'+i,title}))},...types.map(type=>({id:'quick:'+type,name:QUICK_OPTIONS[room.type].find(t=>t[0]===type)[1],steps:[{id:'quick:'+type+':0',title:'Reinigen'},{id:'quick:'+type+':1',title:'Nachwischen'}]}))];
const taskCount=g=>g.reduce((n,part)=>n+part.steps.length,0);
const loadCleaningState=async()=>structuredClone(state);
const loadMaterialPresets=async()=>structuredClone(presets);
const loadQuickTypes=async()=>structuredClone(saved);
const saveQuickTypes=async(id,type,types)=>{saved[id]=types};
const remainingMaterial=(source,materials)=>source.available-materials.filter(m=>m.itemId===source.itemId).reduce((n,m)=>n+m.quantity,0);
const quickMaterialChoices=(sources,materials)=>sources.map((x,i)=>({sourceIndex:i,quantity:i===0?1:50,mode:i===0?'pairs':'units',display:i===0?'1 Paar':'50 ml',name:x.name,remaining:remainingMaterial(x,materials),unit:x.unit})).filter(x=>x.remaining>=(x.mode==='pairs'?2:x.quantity));
const saveMaterialPreset=async id=>{presets[id]=structuredClone(state.active[id].materials)};
const clearMaterialPreset=async id=>{delete presets[id]};
const sessionElapsed=s=>s?2000:0;
const duration=ms=>'00:00:'+String(Math.floor(ms/1000)).padStart(2,'0');
const materialSources=()=>sources;
const startCleaning=async room=>{state.active[room.id]={id:'session',status:'running',roomId:room.id,groups:roomTaskGroups(room,saved[room.id]||defaultQuickTypes(room.type)),doneTaskIds:[],materials:[]}};
const setTimer=async(id,mode)=>{state.active[id].status=mode==='pause'?'paused':'running'};
const setTaskDone=async(id,key,v)=>{let a=state.active[id].doneTaskIds;state.active[id].doneTaskIds=v?[...new Set([...a,key])]:a.filter(x=>x!==key)};
const addMaterial=async(id,source,qty,mode)=>{const units=Number(qty)*(mode==='pairs'?2:1),existing=state.active[id].materials.find(x=>x.itemId===source.itemId);if(remainingMaterial(source,state.active[id].materials)<units)throw Error('Bestand erschöpft');if(existing)existing.quantity+=units;else state.active[id].materials.push({id:'line'+source.itemId,itemId:source.itemId,itemName:source.name,quantity:units,unit:source.unit})};
const removeMaterial=async(id,line)=>{state.active[id].materials=state.active[id].materials.filter(i=>i.id!==line)};
const cancelCleaning=async id=>{delete state.active[id]};
const finishCleaning=async id=>{const s=state.active[id];state.history.unshift({roomId:id,endedAt:new Date().toISOString(),durationMs:2000,doneCount:s.doneTaskIds.length,totalCount:taskCount(s.groups),materials:s.materials});delete state.active[id];return {durationMs:2000,materials:s.materials}};
''' +src+ '''
window.runTest=()=>mountCleaningUi({root:document.getElementById('pmRoot'),room,notify:(s)=>{document.getElementById('pmStatus').textContent=s}});
})();'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  for roomtype,count in [('bad',6),('wc',5),('kueche',8)]:
   page=browser.new_page(viewport={'width':width,'height':820},is_mobile=True,has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#081518;color:white;font-family:system-ui"><div id="pmRoot" class="pm-root" style="padding:8px"><div id="pmStatus"></div><div id="pmCleaningStage"></div></div></body></html>')
   page.add_style_tag(content=(p/'assets/styles.css').read_text());page.add_style_tag(content=(p/'assets/putzmanager.css').read_text())
   page.evaluate('(type)=>window.roomType=type',roomtype);page.add_script_tag(content=boot)
   page.evaluate('runTest()');page.wait_for_selector('.pm-clean-panel')
   assert page.locator('.pm-clean-group').count()==count,(roomtype,count)
   assert page.locator('.pm-quick-list').count()==1
   if roomtype=='bad':
    page.locator('[data-clean-quick-details] summary').click()
    page.locator('[data-clean-quick="dusche"]').uncheck()
    page.wait_for_function('document.querySelectorAll(".pm-clean-group").length===5')
    page.locator('[data-clean-quick="wanne"]').check()
    page.wait_for_function('document.querySelectorAll(".pm-clean-group").length===6')
   page.locator('[data-clean-action="start"]').click();page.wait_for_selector('[data-clean-action="pause"]')
   assert page.locator('#pmMaterials').count()==1
   assert page.locator('[data-clean-action="quick-material"]').count()==2
   page.locator('[data-clean-action="quick-material"]').filter(has_text='Nitrilhandschuhe').click()
   page.wait_for_selector('.pm-clean-basket li')
   assert '2 stk' in page.locator('.pm-clean-basket li').first.inner_text()
   assert page.locator('.pm-clean-basket li').count()==1
   page.locator('.pm-clean-group summary').first.click()
   page.locator('[data-clean-task]').first.check()
   page.wait_for_function('document.querySelector(".pm-clean-summary").textContent.includes("1 von")')
   page.locator('[data-material-details] summary').click()
   page.locator('#pmCleanSource').select_option('1')
   page.locator('#pmCleanMaterial [name="quantity"]').fill('25')
   page.locator('#pmCleanMaterial button[type="submit"]').click()
   page.wait_for_function('document.querySelectorAll(".pm-clean-basket li").length===2')
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 3'),f'Overflow {roomtype} {width}'
   page.once('dialog',lambda d:d.accept());page.locator('[data-clean-action="finish"]').click();page.wait_for_selector('[data-clean-action="start"]')
   assert page.locator('.pm-clean-history').count()==1
   assert not errors,errors
   if width==390:
    (p/'DOKUMENTATION').mkdir(exist_ok=True)
    page.screenshot(path=str(p/'DOKUMENTATION'/f'P02_{roomtype}_390px.png'),full_page=True)
   print(f'PASS P02 Chromium mock {width}px {roomtype}: Schnellliste, Material, Abschluss, kein Overflow')
   page.close()
 browser.close()
