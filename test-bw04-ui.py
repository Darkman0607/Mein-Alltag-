"""Isolated BW04 Chromium UI test: not a live Android/GitHub Pages or IndexedDB test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
source='\n'.join(line for line in (ROOT/'assets/reward-shop-ui.js').read_text().splitlines() if not line.startswith('import ')).replace('export ','')
bootstrap=r'''
const REWARD_CATEGORIES=[{id:'anime-frauen',label:'Anime-Frauen'},{id:'anime-tiere',label:'Anime-Tiere'},{id:'maschinen',label:'Traktoren & Maschinen'},{id:'monster',label:'Monster'}];
const REWARD_RARITIES=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
const BOOSTER_PRESETS=[
 {id:'booster:mixed',name:'Entdecker-Mix',kind:'mixed'},
 {id:'booster:theme:anime-frauen',name:'Anime-Frauen-Booster',kind:'theme'},
 {id:'booster:theme:anime-tiere',name:'Anime-Tiere-Booster',kind:'theme'},
 {id:'booster:theme:maschinen',name:'Traktoren & Maschinen-Booster',kind:'theme'},
 {id:'booster:theme:monster',name:'Monster-Booster',kind:'theme'},
 {id:'booster:premium',name:'Premium-Booster',kind:'premium'},
 {id:'booster:event',name:'Event-Booster',kind:'event'}
];
let mock={wallet:{coins:134,xp:100,shards:0},inventory:[],purchases:[],openings:[],catalog:[],types:BOOSTER_PRESETS.map((t,i)=>({
 ...t,categoryId:null,description:'Testkarten im Katalog',priceCoins:i===0?12:25,eligible:i===0,reason:i===0?'':'Noch nicht genug Karten (0/5)',favorite:false,
 pool:i===0?Array.from({length:5},(_,k)=>({id:'card:'+k,name:'Testkarte '+k,rarity:'selten',categoryId:'monster'})):[],
 odds:Object.fromEntries(REWARD_RARITIES.map(r=>[r,r==='selten'&&i===0?100:0]))
 }))};
async function loadBoosterShop(){return structuredClone(mock);}
async function openOwnedBooster(id){throw Error('Nicht im alten UI-Test öffnen');}
async function purchaseBooster(id,quantity,requestId){
 const t=mock.types.find(t=>t.id===id),cost=quantity*t.priceCoins;
 if(!t.eligible||cost>mock.wallet.coins)throw Error('No coins');
 mock.wallet.coins-=cost;
 mock.purchases.unshift({id:requestId,type:'booster-purchase',boosterTypeId:id,quantity,coinsSpent:cost,createdAt:'2026-11-04T12:00:00Z'});
 for(let i=0;i<quantity;i++)mock.inventory.push({id:'pack:'+i+':'+Date.now(),boosterTypeId:id,purchasedAt:new Date().toISOString(),priceCoins:t.priceCoins});
 return {quantity,total:cost,coinsAfter:mock.wallet.coins};
}
async function setShopFavorite(id,wanted){mock.types.find(t=>t.id===id).favorite=wanted;}
async function setBoosterPrice(id,price){if(!Number.isInteger(price)||price<1||price>500)throw Error('Preis ungültig');mock.types.find(t=>t.id===id).priceCoins=price;}
function newRewardId(prefix){return prefix+':12345678-0000-4000-8000-000000000001';}
window.confirm=()=>true;
'''+source+r'''
window.showShop=(mode)=>{document.querySelector('#view').innerHTML=renderRewardShop(mode);mountRewardShop();};
window.getData=()=>structuredClone(mock);
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061326;color:#fff"><main id="view" style="padding:12px;max-width:700px;margin:auto"></main></body></html>')
  page.add_style_tag(content=(ROOT/'assets/reward-shop.css').read_text())
  page.add_script_tag(content=bootstrap)
  page.evaluate("showShop('shop')")
  page.locator('[data-shop-buy="booster:mixed"]').wait_for(timeout=10000)
  assert page.locator('.bw-shop-card').count()==7
  assert page.locator('[data-shop-buy="booster:mixed"]').is_enabled()
  assert page.locator('[data-shop-buy="booster:premium"]').is_disabled()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'Overflow shop {width}'
  page.locator('[data-shop-fav="booster:mixed"]').click()
  page.wait_for_function("getData().types[0].favorite===true")
  page.locator('#bwShopFilter').select_option('favorites')
  assert page.locator('.bw-shop-card').count()==1
  page.locator('#bwShopFilter').select_option('all')
  page.locator('#bwShopQuantity').select_option('3')
  page.locator('[data-shop-buy="booster:mixed"]').click()
  page.wait_for_function('getData().inventory.length===3')
  assert page.evaluate('getData().wallet.coins')==98
  assert 'gekauft' in page.locator('#bwShopMessage').inner_text()
  page.locator('[data-shop-price="booster:mixed"] summary').count() if False else None
  page.locator('[data-type-card="booster:mixed"] .bw-shop-price summary').click()
  page.locator('[data-shop-price="booster:mixed"] input').fill('15')
  page.locator('[data-shop-price="booster:mixed"] button').click()
  page.wait_for_function('getData().types[0].priceCoins===15')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'Overflow after purchase {width}'
  if width==390:
   page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW04_Shop_390px.png'),full_page=True)
  page.evaluate("showShop('booster')")
  page.locator('.bw-shop-inventory-group').wait_for(timeout=10000)
  assert '3 ×' in page.locator('.bw-shop-inventory-group summary').inner_text()
  page.locator('.bw-shop-inventory-group summary').click()
  assert page.locator('.bw-shop-packs>div').count()==3
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'Overflow inventory {width}'
  if width==390:
   page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW04_Inventar_390px.png'),full_page=True)
  assert not errs,errs
  print('PASS BW04 isolated Chromium',width,'px: shop, filters, favorites, multiple purchase, price adjustment, sealed inventory, no overflow')
  ctx.close()
 browser.close()
