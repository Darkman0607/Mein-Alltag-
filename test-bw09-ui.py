"""BW09 isolated Chromium checks. No live GitHub Pages or physical Android device involved."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
raw=(ROOT/'assets/reward-calendar-ui.js').read_text(encoding='utf-8')
ui='\n'.join(line for line in raw.splitlines() if not line.startswith('import ')).replace('export ','')
fixture=r'''
let enabled=false,days=new Set(),taskDone=0,claims=new Set(),calls=0,changed=0;
function todayKey(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
async function activateRewardCalendar(){enabled=true;return true;}
async function loadRewardCalendar(){
 const today=todayKey(),total=days.size;
 return {today,settings:{enabled},claimedDays:[...days],totalGiftDays:total,
  readyCount:Number(enabled&&!days.has(today))+Number(enabled&&taskDone>=5&&!claims.has('tasks')),
  gift:{xp:6,coins:5,claimed:days.has(today),ready:enabled&&!days.has(today)},
  taskBonus:{xp:10,coins:6,target:5,progress:Math.min(taskDone,5),actualProgress:taskDone,ready:enabled&&taskDone>=5&&!claims.has('tasks'),claimed:claims.has('tasks')},
  milestones:[3,7,14,30].map(n=>({days:n,xp:n*5,coins:n*2,label:`${n} Tage`,progress:Math.min(total,n),ready:enabled&&total>=n&&!claims.has('m'+n),claimed:claims.has('m'+n)}))};
}
async function claimRewardCalendar(type,n){calls++;
 if(type==='daily'){if(days.has(todayKey()))return {replayed:true};days.add(todayKey());return {replayed:false,xp:6,coins:5};}
 if(type==='tasks'){if(claims.has('tasks'))return {replayed:true};claims.add('tasks');return {replayed:false,xp:10,coins:6};}
 if(claims.has('m'+n))return {replayed:true};claims.add('m'+n);return {replayed:false,xp:n*5,coins:n*2};
}
window.confirm=()=>true;
'''
code=fixture+ui+r'''
window.begin=()=>{document.querySelector('#view').innerHTML=renderRewardCalendar();mountRewardCalendar(()=>{changed++;});};
window.tasksDone=()=>{taskDone=5;};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  context=browser.new_context(viewport={'width':width,'height':850},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#07172b;color:white;font-family:Arial,sans-serif"><main id="view" style="padding:9px;max-width:690px;margin:auto"></main></body></html>')
  page.add_style_tag(content=(ROOT/'assets/reward-calendar.css').read_text())
  page.add_script_tag(content=code)
  page.evaluate('begin()')
  page.locator('[data-bw09-enable]').wait_for()
  assert page.locator('[data-bw09-claim]').count()==0
  page.locator('[data-bw09-enable]').click()
  page.locator('[data-bw09-claim="daily"]').wait_for()
  assert page.locator('.bw09-day').count()==42
  assert page.locator('[data-bw09-claim="daily"]').is_enabled()
  assert page.locator('[data-bw09-claim="tasks"]').is_disabled()
  assert page.locator('[data-bw09-milestone]').count()==4
  page.locator('[data-bw09-claim="daily"]').click()
  page.get_by_text('Prämie erhalten:',exact=False).wait_for()
  assert page.locator('[data-bw09-claim="daily"]').is_disabled()
  assert page.evaluate('calls')==1
  assert page.evaluate('changed')==1
  page.locator('[data-bw09-month="-1"]').click()
  page.locator('[data-bw09-day]').nth(14).click()
  assert page.locator('.bw09-selected-note').is_visible()
  page.locator('[data-bw09-month="1"]').click()
  page.evaluate('tasksDone()')
  page.evaluate('begin()')
  page.locator('[data-bw09-claim="tasks"]').wait_for(state='visible')
  assert page.locator('[data-bw09-claim="tasks"]').is_enabled()
  page.locator('[data-bw09-claim="tasks"]').click()
  page.get_by_text('Prämie erhalten:',exact=False).wait_for()
  assert page.locator('[data-bw09-claim="tasks"]').is_disabled()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'{width}px overflow'
  assert not errors,errors
  if width==390:
   (ROOT/'DOKUMENTATION').mkdir(exist_ok=True)
   page.screenshot(path=str(ROOT/'DOKUMENTATION/BW09_Belohnungskalender_390px.png'),full_page=True)
  print(f'PASS BW09 UI {width}px: opt-in, 42 day cells, daily gift once, bonus gating, month navigation, no overflow')
  context.close()
 browser.close()
