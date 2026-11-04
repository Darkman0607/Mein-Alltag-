"""BW06 isolated Chromium responsive album test, NOT a live GitHub Pages / Android test."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
source='\n'.join(line for line in (ROOT/'assets/reward-album-ui.js').read_text().splitlines() if not line.startswith('import ')).replace('export ','')
metadata=json.loads((ROOT/'DOKUMENTATION/BW06_100_Karten_Daten.json').read_text())
bootstrap=r'''const REWARD_CATEGORIES=[
 {id:'anime-frauen',label:'Anime-Frauen',planned:25},
 {id:'anime-tiere',label:'Anime-Tiere',planned:25},
 {id:'maschinen',label:'Traktoren & Maschinen',planned:25},
 {id:'monster',label:'Monster',planned:25}];
const REWARD_RARITIES=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
const CATEGORY_FIELDS={
 'anime-frauen':[{key:'figur',label:'Figur / Rolle'},{key:'welt',label:'Welt / Herkunft'}],
 'anime-tiere':[{key:'tierart',label:'Tierart'},{key:'lebensraum',label:'Lebensraum'}],
 maschinen:[{key:'marke',label:'Marke / Hersteller'},{key:'modell',label:'Modell / Typ'},{key:'leistung',label:'Leistung / PS'}],
 monster:[{key:'element',label:'Element'},{key:'faehigkeit',label:'Besondere Fähigkeit'}]};
const CATEGORY_APPEARANCE={
 'anime-frauen':{icon:'✧',label:'Anime-Frauen',theme:'violet'},
 'anime-tiere':{icon:'✿',label:'Anime-Tiere',theme:'mint'},
 maschinen:{icon:'⚙',label:'Traktoren & Maschinen',theme:'gold'},
 monster:{icon:'✦',label:'Monster',theme:'blue'}};
const ALBUM_SLOTS=REWARD_CATEGORIES.flatMap(c=>Array.from({length:25},(_,i)=>({id:c.id+':'+(i+1),number:i+1,categoryId:c.id})));
let cards=[{id:'catalog:monster:001',categoryId:'monster',number:1,name:'Eigene Altkarte',rarity:'selten',details:{element:'Altbestand'}}];
let favorites=[];
let copies=[];
function safeStarterAsset(card){return card?.imageAsset||null;}
function build(){
 const slots=ALBUM_SLOTS.map(s=>({...s,card:cards.find(c=>c.categoryId===s.categoryId&&c.number===s.number)||null,owned:0,copies:[],favorite:favorites.includes(s.id)}));
 return {slots,total:100,uniqueOwned:0,copies:0,configured:cards.length,favorites:favorites.length,percent:0,
 byCategory:REWARD_CATEGORIES.map(c=>({...c,total:25,owned:0,configured:slots.filter(s=>s.categoryId===c.id&&s.card).length}))};
}
function filterAlbum(album,{category='all',status='all',query=''}){
 return album.slots.filter(s=>(category==='all'||s.categoryId===category)&&
 (status!=='owned'||s.owned)&&(status!=='missing'||!s.owned)&&(status!=='favorites'||s.favorite)&&
 (!query||[s.card?.name||'',s.categoryId,String(s.number).padStart(3,'0')].join(' ').toLowerCase().includes(query.toLowerCase())));
}
async function loadRewardAlbum(){return build();}
async function installStarterSeries(){let added=0;for(const x of STARTERS){if(cards.some(c=>c.categoryId===x.categoryId&&c.number===x.number))continue;cards.push({...x,id:'catalog:'+x.categoryId+':'+String(x.number).padStart(3,'0')});added++;}return {added,preserved:100-added,total:100};}
async function setAlbumFavorite(slotId,want){favorites=want?[...favorites,slotId]:favorites.filter(x=>x!==slotId);}
async function saveAlbumCard(x){const target=cards.find(c=>c.categoryId===x.categoryId&&c.number===x.number);Object.assign(target,x);return target;}
async function prepareAlbumImage(){throw Error('Nicht in diesem isolierten Test implementiert');}
window.confirm=()=>true;
'''+ 'const STARTERS='+json.dumps(metadata,ensure_ascii=False)+';\n'+source+'''
window.render=()=>{document.getElementById('view').innerHTML=renderRewardAlbum();mountRewardAlbum();};
window.getStore=()=>structuredClone({cards,favorites,copies});
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  ctx=browser.new_context(viewport={'width':width,'height':820},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  # Serve the real assets for `<img src="./assets/card-art/...">` without an external web request.
  def image_handler(route):
   relative=route.request.url.split('bw06.test/')[-1]
   file=ROOT/relative
   if file.is_file() and file.suffix=='.svg':route.fulfill(status=200,body=file.read_bytes(),content_type='image/svg+xml')
   else:route.fulfill(status=404,body='not found')
  page.route('https://bw06.test/assets/card-art/**',image_handler)
  page.set_content('<!doctype html><html lang="de"><head><base href="https://bw06.test/"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#081b30;color:#eaf6ff"><main id="view" style="padding:12px;max-width:780px;margin:auto"></main></body></html>')
  page.add_style_tag(content=(ROOT/'assets/reward-album.css').read_text())
  page.add_script_tag(content=bootstrap)
  page.evaluate('render()')
  page.locator('#bwStarterInstall').wait_for(timeout=7000)
  assert page.locator('#bwStarterInstall').inner_text()=='99 freie Kartenplätze füllen'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'before import overflow {width}'
  page.locator('#bwStarterInstall').click()
  page.wait_for_function('getStore().cards.length===100',timeout=10000)
  assert page.evaluate('getStore().cards.find(x=>x.categoryId==="monster"&&x.number===1).name')=='Eigene Altkarte'
  assert page.locator('#bwStarterInstall').is_disabled()
  assert page.locator('.bw-card-tile').count()==100
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'after import overflow {width}'
  page.locator('#bwAlbumSearch').fill('Ayla')
  assert page.locator('.bw-card-tile').count()==1
  page.locator('[data-bw-open]').click()
  assert page.locator('#bwCardModal').is_visible()
  assert 'Ayla' in page.locator('#bwModalTitle').inner_text()
  assert page.locator('.bw-art-large img').count()==1
  if width==390:
   (ROOT/'DOKUMENTATION').mkdir(exist_ok=True)
   page.screenshot(path=str(ROOT/'DOKUMENTATION/BW06_Album_mobil_390.png'),full_page=True)
  page.locator('#bwModalClose').click()
  page.locator('#bwAlbumSearch').fill('')
  page.evaluate('render()')
  page.locator('#bwStarterInstall').wait_for(timeout=7000)
  assert page.locator('#bwStarterInstall').is_disabled()
  assert page.evaluate('getStore().copies.length')==0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'after remount overflow {width}'
  assert not errors,errors
  ctx.close()
  print(f'PASS BW06 isolated mobile {width}px: import preserves user card, 100 card slots, art + detail, no free copies, remount, no overflow')
 browser.close()
