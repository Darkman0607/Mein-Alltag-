"""Chromium rendering and interaction with a stub storage module; real stock logic separately tested by test-p01-data.mjs."""
from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).parent
src='\n'.join(line for line in (p/'modules/putzmanager-cleaning-ui.js').read_text().splitlines() if not line.startswith('import ')).replace('export async function ','async function ')
boot='''(()=>{
const ITEM_KEY='items.v1';
const QUICK_OPTIONS={kueche:[['spuele','Spüle'],['herd','Herd']]};
const defaultQuickTypes=()=>['spuele','herd'];
const loadQuickTypes=async()=>({});
const saveQuickTypes=async()=>{};
const remainingMaterial=(source,materials)=>source.available-materials.filter(m=>m.itemName===source.name).reduce((n,m)=>n+m.quantity,0);
const quickMaterialChoices=(sources,materials)=>remainingMaterial(sources[0],materials)>=2?[{sourceIndex:0,quantity:1,mode:'pairs',display:'1 Paar',name:sources[0].name,remaining:remainingMaterial(sources[0],materials),unit:'stk'}]:[];

const room={id:'k1',name:'Küche',sketch3d:{objects:[
 ...['Kühlschrank','Spüle','Geschirrspüler','Arbeitsplatte','Herd','Küchenschrank','Esstisch','Mülleimer','Dunstabzug','Sessel','Oberschrank','Unterschrank','Backofen','Regal','Heizkörper'].map((name,i)=>({id:'obj'+i,name,type:['kuehlschrank','spuele','geschirrspueler','arbeitsplatte','herd','schrank','tisch','muelleimer','dunstabzug','stuhl','oberschrank','unterschrank','backofen','regal','heizkoerper'][i]}))]}};
let state={active:{},history:[]},preset={};
const source={itemId:'gloves',name:'Nitrilhandschuhe',fromId:'',available:30,unit:'stk',pairs:true,label:'Nitrilhandschuhe · Keller · frei 30 stk'};
const getModuleValue=async(store,key)=> key===ITEM_KEY?[{id:'gloves',name:'Nitrilhandschuhe'}]:[];
const roomTaskGroups=()=>[{id:'floor',name:'Boden',steps:['Boden freiräumen','Boden saugen','Boden feucht wischen'].map((title,i)=>({id:'floor:'+i,title}))},...room.sketch3d.objects.map(o=>({id:o.id,name:o.name,steps:[{id:o.id+':0',title:'Oberflächen reinigen'},{id:o.id+':1',title:'Bei Bedarf gründlich reinigen'}]}))];
const taskCount=g=>g.reduce((sum,group)=>sum+group.steps.length,0);
const loadCleaningState=async()=>structuredClone(state);
const loadMaterialPresets=async()=>structuredClone(preset);
const saveMaterialPreset=async id=>{preset[id]=structuredClone(state.active[id].materials)};
const clearMaterialPreset=async id=>{delete preset[id]};
const sessionElapsed=s=>s?2000:0;
const duration=ms=>'00:00:'+String(Math.floor(ms/1000)).padStart(2,'0');
const materialSources=()=>[source];
const startCleaning=async room=>{state.active[room.id]={id:'t1',status:'running',roomId:room.id,startedAt:new Date().toISOString(),groups:roomTaskGroups(),doneTaskIds:[],materials:[]}};
const setTimer=async(id,mode)=>{state.active[id].status=mode==='pause'?'paused':'running'};
const setTaskDone=async(id,key,v)=>{let a=state.active[id].doneTaskIds;state.active[id].doneTaskIds=v?[...new Set([...a,key])]:a.filter(x=>x!==key)};
const addMaterial=async(id,source,qty,mode)=>{state.active[id].materials.push({id:'line'+Date.now(),itemName:source.name,quantity:Number(qty)*(mode==='pairs'?2:1),unit:source.unit})};
const removeMaterial=async(id,line)=>{state.active[id].materials=state.active[id].materials.filter(i=>i.id!==line)};
const cancelCleaning=async id=>{delete state.active[id]};
const finishCleaning=async id=>{const s=state.active[id];state.history.unshift({roomId:id,endedAt:new Date().toISOString(),durationMs:2000,doneCount:s.doneTaskIds.length,totalCount:taskCount(s.groups),materials:s.materials});delete state.active[id];return {durationMs:2000,materials:s.materials}};
''' +src+ '''\nwindow.runTest=()=>mountCleaningUi({root:document.getElementById('pmRoot'),room,notify:(v)=>{document.getElementById('pmStatus').textContent=v}});
})();'''
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  page=browser.new_page(viewport={'width':width,'height':840},is_mobile=True,has_touch=True)
  errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#081518;color:white;font-family:system-ui"><div id="pmRoot" class="pm-root" style="padding:8px"><div id="pmStatus"></div><div id="pmCleaningStage"></div></div></body></html>')
  page.add_style_tag(content=(p/'assets/styles.css').read_text());page.add_style_tag(content=(p/'assets/putzmanager.css').read_text())
  page.add_script_tag(content=boot)
  page.evaluate('runTest()');page.wait_for_selector('.pm-clean-panel')
  assert page.locator('.pm-clean-group').count()==16
  assert page.locator('.pm-clean-group[open]').count()==0, 'Reinigungsbereiche müssen standardmäßig geschlossen sein'
  page.locator('[data-clean-toggle-all="expand"]').click()
  assert page.locator('.pm-clean-group[open]').count()==16
  page.locator('[data-clean-toggle-all="collapse"]').click()
  assert page.locator('.pm-clean-group[open]').count()==0
  page.locator('.pm-clean-group summary').first.click()
  assert page.locator('.pm-clean-group[open]').count()==1
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 3'),'Overflow at '+str(width)
  page.locator('[data-clean-action="start"]').click()
  page.wait_for_selector('[data-clean-action="pause"]')
  page.locator('[data-clean-task]').first.check()
  page.wait_for_function('document.querySelector(".pm-clean-summary").textContent.includes("1 von")')
  assert page.locator('.pm-clean-group').first.get_attribute('open') is not None, 'Geöffnete Gruppe soll nach einem Häkchen offen bleiben'
  assert page.locator('.pm-clean-group[open]').count()==1
  page.locator('[data-clean-action="pause"]').click()
  page.wait_for_selector('[data-clean-action="resume"]')
  page.locator('[data-clean-action="resume"]').click()
  page.locator('[data-material-details] summary').click()
  page.locator('#pmCleanMaterial [name="quantity"]').fill('2')
  page.locator('#pmCleanMaterial [name="mode"]').select_option('pairs')
  page.locator('#pmCleanMaterial button[type="submit"]').click()
  page.wait_for_selector('.pm-clean-basket li')
  page.locator('[data-clean-action="save-preset"]').click()
  page.wait_for_function('document.querySelector(".pm-clean-panel").innerText.includes("Gespeicherte Materialvorlage")')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 3'), 'Overflow after entering materials'
  page.once('dialog',lambda d:d.accept())
  page.locator('[data-clean-action="finish"]').click()
  page.wait_for_selector('[data-clean-action="start"]')
  assert page.locator('.pm-clean-history').count()==1
  (p/'DOKUMENTATION').mkdir(exist_ok=True)
  page.screenshot(path=str(p/'DOKUMENTATION'/f'P01_Reinigung_{width}px.png'),full_page=True)
  assert not errors,errors
  print(f'PASS P01 mobile Chromium {width}px: task list, checkbox, timer controls, materials, template, finish, history, no overflow')
  page.close()
 browser.close()
