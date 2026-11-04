"""BW07 isolated Chromium mobile UI regression, 320/390/412 px. Not an Android PWA test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
src='\n'.join(s for s in (ROOT/'assets/reward-cards-ui.js').read_text().splitlines() if not s.startswith('import ')).replace('export ','')
bootstrap=r'''
const REWARD_RARITIES=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
const newRewardId=()=>`cardtrade:${Math.random().toString(36).slice(2)}`;
const card={id:'catalog:monster:001',name:'Nebelwisp',categoryId:'monster',rarity:'gewoehnlich',number:1,imageAsset:'./assets/card-art/monster/001.svg'};
const card2={...card,id:'catalog:monster:025',name:'Auroradrache',rarity:'diamant',number:25,imageAsset:'./assets/card-art/monster/025.svg'};
const rates={version:1,sellCoins:{gewoehnlich:1,ungewoehnlich:2,selten:4,episch:8,legendaer:16,mythisch:32,diamant:64},salvageShards:{gewoehnlich:1,ungewoehnlich:2,selten:4,episch:8,legendaer:16,mythisch:32,diamant:64},craftShards:{gewoehnlich:10,ungewoehnlich:20,selten:40,episch:80,legendaer:160,mythisch:320}};
let state={wallet:{xp:123,coins:3,shards:15},catalog:[card,card2],instances:[{id:'copy:one',cardId:card.id,locked:false,obtainedAt:'2026-11-04T10:00:00Z',rarityAtDraw:'gewoehnlich'},{id:'copy:two',cardId:card.id,locked:false,obtainedAt:'2026-11-04T11:00:00Z',rarityAtDraw:'gewoehnlich'}],history:[],rates};
async function loadRewardAlbum(){return {slots:[{id:'monster:1',card, favorite:true},{id:'monster:25',card:card2,favorite:false}]};}
async function loadRewardCardManager(){return {...structuredClone(state),groups:group(state)};}
function group(state){return state.catalog.map(card=>({card,instances:state.instances.filter(x=>x.cardId===card.id),total:state.instances.filter(x=>x.cardId===card.id).length,locked:state.instances.filter(x=>x.cardId===card.id&&x.locked).length})).filter(g=>g.total);}
async function setCardCopyLock(id,locked){const c=state.instances.find(c=>c.id===id);if(!c)throw Error('missing');c.locked=locked;return c;}
async function tradeCardCopy({copyId,kind}){const i=state.instances.findIndex(c=>c.id===copyId);if(i<0)throw Error('missing');const c=state.instances.splice(i,1)[0];if(kind==='sell')state.wallet.coins++;else state.wallet.shards++;state.history.unshift({type:'card-'+kind,cardId:c.cardId,cardName:'Nebelwisp',createdAt:new Date().toISOString(),coins:1,shards:1});return {replayed:false};}
async function craftCardCopy({cardId}){const c=state.catalog.find(c=>c.id===cardId);if(!c||c.rarity==='diamant')throw Error('diamant');state.wallet.shards-=10;state.instances.push({id:'copy:new',cardId,locked:false,obtainedAt:new Date().toISOString(),rarityAtDraw:'gewoehnlich'});state.history.unshift({type:'card-craft',cardId,cardName:c.name,shardsSpent:10,createdAt:new Date().toISOString()});return {replayed:false};}
function validateCardRates(){return true;}
async function saveCardRateSettings(x){state.rates=x;}
window.confirm=()=>true;
'''+src+r'''
window.mount=()=>{document.querySelector('#view').innerHTML=renderRewardCards();mountRewardCards();};
window.getState=()=>structuredClone(state);
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,412]:
  context=browser.new_context(viewport={'width':width,'height':850},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#071629;color:white"><main id="view" style="padding:9px;max-width:690px;margin:auto"></main></body></html>')
  page.add_style_tag(content=(ROOT/'assets/reward-cards.css').read_text())
  page.add_script_tag(content=bootstrap)
  page.evaluate('mount()')
  page.locator('.bw-cards-group summary').first.wait_for(timeout=10000)
  assert page.locator('.bw-cards-group').count()==1
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'overflow before operations {width}'
  page.locator('.bw-cards-group summary').click()
  page.locator('[data-card-lock="copy:one"]').click()
  page.wait_for_function("getState().instances.find(x=>x.id==='copy:one').locked===true")
  page.locator('.bw-cards-group summary').click()
  assert page.locator('[data-card-sell="copy:one"]').is_disabled()
  page.locator('[data-card-lock="copy:one"]').click()
  page.wait_for_function("getState().instances.find(x=>x.id==='copy:one').locked===false")
  page.locator('.bw-cards-group summary').click()
  page.locator('[data-card-sell="copy:one"]').click()
  page.wait_for_function('getState().wallet.coins===4')
  page.locator('#bwCraftForm select').select_option(card['id'] if False else 'catalog:monster:001')
  page.locator('#bwCraftForm button').click()
  page.wait_for_function('getState().wallet.shards===5')
  assert page.locator('.bw-cards-history li').count()==2
  page.locator('#bwCardsOnlyFav').check()
  assert page.locator('.bw-cards-group').count()==1
  page.locator('#bwCardsSearch').fill('gibt-es-nicht')
  assert page.locator('.bw-cards-group').count()==0
  page.locator('#bwCardsSearch').fill('')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'overflow after operations {width}'
  if width==390:page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW07_Kartenverwaltung_390px.png'),full_page=True)
  assert not errors,errors
  print(f'PASS BW07 UI mobile Chromium {width}px: grouped copies, locking, sale, craft, search, favorites, no horizontal overflow')
  context.close()
 browser.close()
