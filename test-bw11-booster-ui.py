"""BW11: real booster markup and reveal interactions in isolated Chromium, no network."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent

def src(name):return '\n'.join(s for s in (ROOT/name).read_text().splitlines() if not s.startswith('import ')).replace('export ','')
fixture=r'''
const REWARD_RARITIES=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
const REWARD_CATEGORIES=[{id:'monster',label:'Monster'}];
const BOOSTER_PRESETS=[{id:'mixed',name:'Testbooster',kind:'mixed'}];
const newRewardId=()=> 'test-id';
const database=new Map();
async function getModuleValue(store,key){return database.get(store+':'+key)||null;}
async function setModuleValue(store,key,value){database.set(store+':'+key,structuredClone(value));}
const rarities=['gewoehnlich','ungewoehnlich','selten','episch','diamant'];
const catalog=rarities.map((rarity,i)=>({id:'catalog:monster:'+String(i+1).padStart(3,'0'),name:'Testkarte '+(i+1),number:i+1,categoryId:'monster',rarity,imageAsset:'./assets/card-art/monster/00'+(i+1)+'.svg'}));
let inv=[{id:'pack:BW11-one',boosterTypeId:'mixed',priceCoins:12,purchasedAt:'2026-11-04T12:00:00Z'}];
const content=()=>({wallet:{coins:0},inventory:inv,catalog,purchases:[],openings:[],types:[]});
async function loadBoosterShop(){return content();}
async function openOwnedBooster(id){inv=[];return {replayed:false,openedAt:'2026-11-04T12:30:00Z',cards:catalog.map(c=>({cardId:c.id,name:c.name,number:c.number,rarity:c.rarity,duplicate:false}))};}
async function purchaseBooster(){throw Error('not needed')};async function setBoosterPrice(){};async function setShopFavorite(){};
const safeStarterAsset=card=>card.imageAsset;
window.confirm=()=>true;
'''
script=fixture+src('assets/reward-premium.js')+'\n'+src('assets/reward-shop-ui.js')+r'''
window.startBooster=()=>{document.getElementById('view').innerHTML=renderRewardShop('booster');mountPremiumSettings(document.getElementById('view'));mountRewardShop();}
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  ctx=browser.new_context(viewport={'width':width,'height':820},is_mobile=True,has_touch=True,reduced_motion='no-preference')
  page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#06182e;color:white"><main id="view" style="padding:8px;max-width:700px;margin:auto"></main></body></html>')
  for css in ('assets/reward-shop.css','assets/reward-premium.css'):page.add_style_tag(content=(ROOT/css).read_text())
  page.add_script_tag(content=script);page.evaluate('startBooster()')
  page.locator('[data-shop-open]').wait_for()
  page.locator('[data-shop-open]').click()
  page.locator('[data-reveal-card]').first.wait_for()
  assert page.locator('.bw-open-card').count()==5
  assert page.locator('.bw-open-card.bw11-rarity-diamant').count()==1
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'{width}px pre-reveal overflow'
  page.locator('.bw-open-card.bw11-rarity-diamant').click()
  assert page.locator('.bw-open-card.bw11-rarity-diamant.is-revealed').count()==1
  animation=page.locator('.bw-open-card.bw11-rarity-diamant').evaluate("el=>getComputedStyle(el,'::after').animationName")
  assert animation=='bw11-reveal',animation
  page.locator('[data-reveal-all]').click()
  assert page.locator('.bw-open-card.is-revealed').count()==5
  assert page.locator('.bw11-instant').count()==1
  assert page.locator('.bw-open-card.bw11-rarity-diamant').evaluate("el=>getComputedStyle(el,'::after').animationName")=='none'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'{width}px reveal overflow'
  if width==390:page.screenshot(path=str(ROOT/'DOKUMENTATION/BW11_Booster_390px.png'),full_page=True)
  assert not errors,errors
  print(f'PASS BW11 booster {width}px: rarity styling, one-card reveal, five-card instant reveal, no overflow')
  ctx.close()
 browser.close()
