"""BW11-HF02 – isolated Chromium tests of the real pack-opening markup and animation.
Not a live Android or GitHub Pages integration test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent

def source(name):
    text='\n'.join(line for line in (ROOT/name).read_text().splitlines() if not line.startswith('import ')).replace('export ','')
    if name.endswith('reward-pack-stage.js'):
        text=text.replace('const esc=', 'const stageEsc=').replace('esc(', 'stageEsc(')
    return text

fixture=r'''
const REWARD_RARITIES=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
const REWARD_CATEGORIES=[{id:'monster',label:'Monster'}];
const BOOSTER_PRESETS=[{id:'booster:mixed',name:'Entdecker-Mix',kind:'mixed'}];
const rarities=['gewoehnlich','ungewoehnlich','selten','episch','diamant'];
const catalog=rarities.map((r,i)=>({id:'catalog:monster:'+String(i+1).padStart(3,'0'),name:'Monsterkarte '+(i+1),number:i+1,categoryId:'monster',rarity:r,imageAsset:null}));
const safeStarterAsset=card=>null;
const getActivePremiumSettings=()=>({effects:window.visualMode||'full',sound:false});
const renderPremiumSettings=()=>'<section>Volle Effekte</section>';
const playPremiumReveal=()=>false;
const newRewardId=()=> 'purchase:any';
let inventory=[{id:'pack:00000000-0000-4000-8000-000000000000:1',boosterTypeId:'booster:mixed',priceCoins:12,purchasedAt:'2026-11-04T12:00:00Z'}];
let openingCalls=0, persistentCopies=0;
const content=()=>({wallet:{coins:42},inventory,catalog,purchases:[],openings:[],types:[]});
async function loadBoosterShop(){return structuredClone(content());}
async function openOwnedBooster(id){if(!inventory.length)throw Error('Pack fehlt');inventory=[];openingCalls++;persistentCopies+=5;return {replayed:false,openedAt:'2026-11-04T12:30:00Z',cards:catalog.map(c=>({cardId:c.id,name:c.name,number:c.number,rarity:c.rarity,duplicate:false}))};}
async function purchaseBooster(){throw Error('not needed');}
async function setBoosterPrice(){};async function setShopFavorite(){};
window.confirm=()=>true;
'''
js=fixture+source('assets/reward-pack-stage.js')+'\n'+source('assets/reward-shop-ui.js')+r'''
window.startBooster=()=>{document.getElementById('view').innerHTML=renderRewardShop('booster');mountRewardShop();};
window.state=()=>({inventory:inventory.length,openingCalls,persistentCopies});
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  ctx=browser.new_context(viewport={'width':width,'height':820},is_mobile=True,has_touch=True,reduced_motion='no-preference')
  page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#06182e;color:white"><main id="view" style="padding:8px;max-width:700px;margin:auto"></main></body></html>')
  for sheet in ('assets/reward-shop.css','assets/reward-premium.css','assets/reward-pack-effects.css'):
   page.add_style_tag(content=(ROOT/sheet).read_text())
  page.add_script_tag(content=js)
  page.evaluate("document.documentElement.dataset.bw11Effects='full';startBooster()")
  page.locator('[data-pack-preview]').wait_for()
  page.locator('[data-pack-preview]').click()
  page.locator('.bw-pack-stage').wait_for()
  page.wait_for_function("document.querySelector('.bw-pack-stage')?.classList.contains('is-open')")
  assert page.locator('.bw-pack-draw').count()==5
  assert page.locator('.bw-pack-header').inner_text().find('VORSCHAU')>=0
  assert page.evaluate('state().inventory')==1 and page.evaluate('state().openingCalls')==0
  animation=page.locator('.bw-pack-wrapper').evaluate("el=>getComputedStyle(el).animationName")
  assert 'bw-pack-burst' in animation,animation
  page.locator('[data-pack-card="0"]').click()
  assert page.locator('.bw-pack-draw.is-revealed').count()==1
  page.locator('[data-pack-replay]').click()
  page.wait_for_function("document.querySelector('.bw-pack-stage')?.classList.contains('is-open')")
  assert page.locator('.bw-pack-draw.is-revealed').count()==0
  page.locator('[data-pack-reveal-all]').click()
  assert page.locator('.bw-pack-draw.is-revealed').count()==5
  assert page.locator('.bw-pack-stage.bw-pack-instant').count()==1
  assert page.evaluate('state().inventory')==1 and page.evaluate('state().openingCalls')==0
  page.locator('.bw-pack-exit').click()
  assert page.locator('.bw-pack-stage').count()==0
  page.locator('[data-shop-open]').click()
  page.locator('.bw-pack-stage').wait_for()
  page.wait_for_function("document.querySelector('.bw-pack-stage')?.classList.contains('is-open')")
  assert page.evaluate('state().inventory')==0 and page.evaluate('state().persistentCopies')==5 and page.evaluate('state().openingCalls')==1
  assert page.locator('#bwOpenResults').count()==1
  assert page.locator('.bw-pack-draw').count()==5
  if width==390:
   page.wait_for_timeout(1650)
   (ROOT/'DOKUMENTATION').mkdir(exist_ok=True)
   page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW11_HF02_Packoeffnung_390px.png'),full_page=False)
  page.locator('[data-pack-reveal-all]').click()
  assert page.locator('.bw-pack-draw.is-revealed').count()==5
  page.locator('[data-pack-close]').last.click()
  assert page.locator('#bwOpenResults').count()==1
  assert page.evaluate('state().persistentCopies')==5 and page.evaluate('state().openingCalls')==1
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'overflow at {width}'
  assert not errors,errors
  ctx.close()
  print(f'PASS {width}px: free preview, pack burst, five-card reveal, replay, real opening, saved five copies, no overflow')
 # The full/reduced/off settings and operating-system reduction must be honored.
 for name,mode,reduce in [('reduced','reduced','no-preference'),('off','off','no-preference'),('os-reduced','full','reduce')]:
  ctx=browser.new_context(viewport={'width':390,'height':820},reduced_motion=reduce)
  page=ctx.new_page();page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="view"></div></body></html>')
  for sheet in ('assets/reward-shop.css','assets/reward-premium.css','assets/reward-pack-effects.css'):
   page.add_style_tag(content=(ROOT/sheet).read_text())
  page.add_script_tag(content=js)
  page.evaluate(f"window.visualMode='{mode}';document.documentElement.dataset.bw11Effects='{mode}';startBooster()")
  page.locator('[data-pack-preview]').click()
  assert page.locator('.bw-pack-stage.is-open').count()==1
  assert page.locator('.bw-pack-draw').count()==5
  if mode!='full':assert page.locator('.bw-pack-wrapper').evaluate('el=>getComputedStyle(el).animationName')=='none'
  page.locator('[data-pack-reveal-all]').click()
  assert page.locator('.bw-pack-draw.is-revealed').count()==5
  ctx.close();print('PASS mode '+name)
 browser.close()
