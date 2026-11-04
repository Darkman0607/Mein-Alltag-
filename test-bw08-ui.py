"""BW08 isolated Chromium checks with real mission markup, no network or Android bridge."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
script='\n'.join(s for s in (root/'assets/reward-missions-ui.js').read_text().splitlines() if not s.startswith('import ')).replace('export ','')
fixture=r'''
let activated=false,claimed=new Set(),calls=0, onChangedCalls=0;
const base=[
{id:'daily-clean',title:'Ein Raum geschafft',description:'Raumreinigung bestätigen.',icon:'🧽',period:'day',target:1,progress:1,xp:12,coins:5},
{id:'daily-tasks',title:'Fünf Aufgaben erledigt',description:'Viele Aufgaben erledigen.',icon:'✅',period:'day',target:5,progress:3,xp:8,coins:4},
{id:'weekly-clean',title:'Drei Räume diese Woche',description:'Fortschritt sammeln.',icon:'🏡',period:'week',target:3,progress:2,xp:30,coins:15},
{id:'monthly-clean',title:'Zehn saubere Räume',description:'Dauerhaft besser putzen.',icon:'🌟',period:'month',target:10,progress:8,xp:80,coins:35},
{id:'collector-5',title:'Sammlerstart',description:'Karten erwerben.',icon:'📘',period:'all',target:5,progress:5,xp:15,coins:8}];
function renderRewardEconomy(){return '<section id="bwEconomy">XP-Regeln verfügbar</section>';}
async function mountRewardEconomy(){window.economyMounted=true;}
async function activateMissions(){activated=true;return {enabled:true,activatedAt:new Date().toISOString()};}
async function loadMissionBoard(){const missions=base.map(m=>({...m,claimed:claimed.has(m.id),claimable:activated&&m.progress>=m.target&&!claimed.has(m.id),complete:m.progress>=m.target}));return {settings:{enabled:activated},missions,summary:{ready:missions.filter(m=>m.claimable).length,claimed:claimed.size}};}
async function claimMission(id){calls++;if(claimed.has(id))return {replayed:true};claimed.add(id);return {replayed:false,xp:base.find(m=>m.id===id).xp,coins:base.find(m=>m.id===id).coins};}
window.confirm=()=>true;
'''
code=fixture+script+'''\nwindow.startMission=()=>{document.querySelector('#view').innerHTML=renderMissionCenter();mountMissionCenter(()=>{onChangedCalls++});};'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  ctx=b.new_context(viewport={'width':width,'height':850},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#07172b;color:white"><main id="view" style="padding:9px;max-width:690px;margin:auto"></main></body></html>')
  page.add_style_tag(content=(root/'assets/reward-missions.css').read_text())
  page.add_script_tag(content=code);page.evaluate('startMission()')
  page.locator('[data-activate-missions]').wait_for()
  assert page.locator('[data-claim]').count()==0,'no rewards before activation'
  page.locator('[data-activate-missions]').click()
  page.locator('[data-claim="daily-clean"]').wait_for()
  assert page.locator('[data-claim="daily-tasks"]').is_disabled()
  assert page.locator('[data-claim="collector-5"]').is_enabled()
  page.locator('[data-claim="daily-clean"]').click()
  page.get_by_text('✓ Mission abgeschlossen!').first.wait_for()
  assert page.locator('[data-claim="daily-clean"]').is_disabled()
  assert page.evaluate('calls')==1
  page.locator('[data-mission-filter="week"]').click()
  assert page.locator('[data-claim]').count()==1
  page.locator('[data-mission-filter="alltime"]').click()
  assert page.locator('[data-claim="collector-5"]').count()==1
  page.locator('.bw-mission-rules summary').click()
  assert page.locator('#bwEconomy').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'{width}px horizontal overflow'
  assert not errors,errors
  if width==390:
   (root/'DOKUMENTATION').mkdir(exist_ok=True)
   page.locator('[data-mission-filter="all"]').click()
   page.screenshot(path=str(root/'DOKUMENTATION/BW08_Missionen_390px.png'),full_page=True)
  print(f'PASS BW08 Chromium isolated {width}px: opt-in, proper button states, claim once, filters, existing economy, no overflow')
  ctx.close()
 b.close()
