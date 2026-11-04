"""Isolated Chromium test for the real BW03 UI module, with in-memory fake persistence.
This does NOT claim to test live GitHub Pages, Android PWA, or the actual IndexedDB backend.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
ui='\n'.join(line for line in (ROOT/'assets/reward-economy-ui.js').read_text().splitlines() if not line.startswith('import ')).replace('export ','')
bootstrap=r'''
const REWARD_SOURCES=[{id:'putzmanager',label:'Putzmanager',available:true},{id:'lagerhaus',label:'Lagerhaus',available:false},{id:'familienplaner',label:'Familienplaner',available:false},{id:'hausservice',label:'M.R Hausservice',available:false},{id:'frauengesundheit',label:'Frauengesundheit',available:false}];
let model={settings:{sources:{putzmanager:{enabled:false,enabledAt:null}},cleaningRule:{xpPerTask:2,coinsPerFinish:5,bonusCoinsPer10Min:1,minMinutes:1,minTasks:1,requireAll:true}},wallet:{xp:22,coins:17,shards:0},journal:[{id:'reward:clean:demo',type:'cleaning-complete',createdAt:'2026-11-04T10:00:00Z',doneCount:3,totalCount:3,xp:6,coins:5}]};
async function loadRewardEconomy(){return structuredClone(model);}
async function setRewardConsent(source,enabled){if(source!=='putzmanager')throw Error('Not supported');model.settings.sources.putzmanager={enabled,enabledAt:enabled?new Date().toISOString():null};}
async function saveRewardCleaningRule(changes){model.settings.cleaningRule={...model.settings.cleaningRule,...changes};}
window.confirm=()=>true;
'''+ui+r'''
window.openRewards=()=>{document.querySelector('#view').innerHTML=renderRewardEconomy();mountRewardEconomy();};
window.getRewards=()=>structuredClone(model);
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#071327;color:#fff;margin:0"><main id="view" style="max-width:540px;padding:10px;margin:auto"></main></body></html>')
  page.add_style_tag(content=(ROOT/'assets/reward-economy.css').read_text())
  page.add_script_tag(content=bootstrap)
  page.evaluate('openRewards()')
  page.locator('#bwEnableCleaning').wait_for(timeout=10000)
  assert not page.locator('#bwEnableCleaning').is_checked()
  assert 'Gesundheitsdaten bleiben ausdrücklich ausgeschlossen' in page.locator('#bwEcoContent').inner_text()
  assert page.locator('.bw-eco-entry').count()==1
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'Overflow first paint {width}'
  page.locator('#bwEnableCleaning').check()
  page.wait_for_function('getRewards().settings.sources.putzmanager.enabled===true')
  assert 'Freigabe aktiv seit' in page.locator('#bwEcoContent').inner_text()
  page.locator('input[name="xpPerTask"]').fill('4')
  page.locator('input[name="coinsPerFinish"]').fill('9')
  page.locator('input[name="minMinutes"]').fill('2')
  page.locator('#bwCleaningRuleForm button[type="submit"]').click()
  page.wait_for_function('getRewards().settings.cleaningRule.xpPerTask===4')
  assert page.evaluate('getRewards().settings.cleaningRule.coinsPerFinish')==9
  assert page.evaluate('getRewards().settings.cleaningRule.minMinutes')==2
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'Overflow final {width}'
  if width==390:
   (ROOT/'DOKUMENTATION').mkdir(exist_ok=True)
   page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW03_XP_Muenzen_390px.png'),full_page=True)
  assert not errors,errors
  print(f'PASS BW03 isolated UI {width}px: opt-in, rule editing, history, privacy, no horizontal overflow')
  ctx.close()
 browser.close()
