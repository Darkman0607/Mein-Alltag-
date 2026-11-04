"""BW05 isolated Chromium render and interaction test; not an Android HTTPS/PWA test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
source='\n'.join(line for line in (ROOT/'assets/reward-shop-ui.js').read_text().splitlines() if not line.startswith('import ')).replace('export ','')
bootstrap=r'''
const REWARD_CATEGORIES=[{id:'monster',label:'Monster'}];
const REWARD_RARITIES=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
const BOOSTER_PRESETS=[{id:'booster:mixed',name:'Entdecker-Mix',kind:'mixed'}];
let mock={wallet:{xp:20,coins:35,shards:0},inventory:[{id:'pack:00000000-0000-4000-8000-000000000000:1',boosterTypeId:'booster:mixed',purchasedAt:'2026-11-04T12:00:00Z',priceCoins:20}],
 purchases:[],openings:[],catalog:Array.from({length:5},(_,i)=>({id:'card:'+i,name:'Karte '+(i+1),rarity:i%2?'episch':'selten',number:i+1,categoryId:'monster'})),
 types:[{id:'booster:mixed',name:'Entdecker-Mix',kind:'mixed',categoryId:null,description:'Test',priceCoins:20,eligible:true,reason:'',favorite:false,pool:Array.from({length:5},(_,i)=>({id:'card:'+i,name:'Karte '+(i+1),rarity:'selten',categoryId:'monster'})),odds:Object.fromEntries(REWARD_RARITIES.map(r=>[r,r==='selten'?100:0]))}]};
function safeStarterAsset(card){return card?.imageAsset||null;}
async function loadBoosterShop(){return structuredClone(mock);}
async function openOwnedBooster(id){
 const index=mock.inventory.findIndex(p=>p.id===id);if(index===-1)throw Error('Booster not found');
 mock.inventory.splice(index,1);
 const cards=Array.from({length:5},(_,i)=>({cardId:'card:'+i,copyId:'copy:'+i,name:'Karte '+(i+1),rarity:i%2?'episch':'selten',categoryId:'monster',number:i+1,duplicate:i===3}));
 mock.openings.push({id:'opening:1',type:'booster-open',createdAt:'2026-11-04T12:11:00Z',boosterTypeId:'booster:mixed',cards});
 return {packId:id,cards,openedAt:'2026-11-04T12:11:00Z',replayed:false};
}
async function purchaseBooster(){throw Error('not tested');}
async function setShopFavorite(){throw Error('not tested');}
async function setBoosterPrice(){throw Error('not tested');}
function newRewardId(){return 'purchase:00000000-0000-4000-8000-000000000000';}
window.confirm=()=>true;
'''+source+r'''
window.mount=()=>{document.querySelector('#view').innerHTML=renderRewardShop('booster');mountRewardShop();};
window.getMock=()=>structuredClone(mock);
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  ctx=browser.new_context(viewport={'width':width,'height':860},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061326;color:#fff"><main id="view" style="padding:12px;max-width:700px;margin:auto"></main></body></html>')
  page.add_style_tag(content=(ROOT/'assets/reward-shop.css').read_text())
  page.add_script_tag(content=bootstrap)
  page.evaluate('mount()')
  btn=page.locator('[data-shop-open]');btn.wait_for(timeout=15000)
  assert btn.count()==1
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'inventory overflow {width}'
  btn.click()
  page.locator('.bw-open-card-grid .bw-open-card').first.wait_for(timeout=15000)
  assert page.locator('.bw-open-card').count()==5
  assert page.evaluate('getMock().inventory.length')==0
  assert page.locator('#bwOpenResults').count()==1
  assert page.locator('.bw-open-history').count()==1
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'opening overflow {width}'
  page.locator('[data-reveal-card="0"]').click()
  assert page.locator('.bw-open-card.is-revealed').count()==1
  page.locator('[data-reveal-all]').click()
  assert page.locator('.bw-open-card.is-revealed').count()==5
  if width==390:
   (ROOT/'DOKUMENTATION').mkdir(exist_ok=True)
   page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW05_Boosteroeffnung_390px.png'),full_page=True)
  # After moving around/re-mount the opening is still in the history.
  page.evaluate('mount()')
  page.locator('.bw-open-history summary').wait_for(timeout=10000)
  page.locator('.bw-open-history summary').click()
  assert page.locator('.bw-open-history li').count()==5
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'history overflow {width}'
  assert not errors,errors
  print(f'PASS BW05 isolated Chromium {width}px – 5 revealed cards, inventory deduction, history after remount, no overflow')
  ctx.close()
 browser.close()
