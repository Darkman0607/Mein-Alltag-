"""Isolated Chromium UI checks on real BW11 render functions; no local network needed.
This does not constitute live GitHub Pages or Android-PWA acceptance."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent

def js_file(name):
 return '\n'.join(s for s in (ROOT/name).read_text(encoding='utf-8').splitlines() if not s.startswith('import ')).replace('export ','')
fixture=r'''
const REWARD_RARITIES=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
const REWARD_CATEGORIES=[{id:'anime-frauen',label:'Anime Frauen'},{id:'anime-tiere',label:'Anime Tiere'},{id:'maschinen',label:'Maschinen'},{id:'monster',label:'Monster'}];
const CATEGORY_APPEARANCE=Object.fromEntries(REWARD_CATEGORIES.map((c,i)=>[c.id,{icon:['👩','🐈','🚜','🐉'][i],label:c.label,theme:['violet','mint','gold','blue'][i]}]));
const CATEGORY_FIELDS=Object.fromEntries(REWARD_CATEGORIES.map(c=>[c.id,[]]));
const ALBUM_SLOTS=100;
const dbStorage=new Map();let writes=0;
async function getModuleValue(store,key){return structuredClone(dbStorage.get(`${store}:${key}`)??null);}
async function setModuleValue(store,key,val){dbStorage.set(`${store}:${key}`,structuredClone(val));writes++;}
const catalog=[];
const slots=REWARD_CATEGORIES.flatMap((c)=>Array.from({length:25},(_,i)=>{
 const n=i+1,rarity=REWARD_RARITIES[Math.min(6,Math.floor((n-1)/4))];
 const card={id:`catalog:${c.id}:${String(n).padStart(3,'0')}`,name:`${c.label} ${n}`,categoryId:c.id,number:n,rarity,description:'Originale Testkarte, keine realen Booster.',details:{},imageData:null,imageAsset:`./assets/card-art/${c.id}/${String(n).padStart(3,'0')}.svg`};
 catalog.push(card);
 return {id:`${c.id}:${n}`,categoryId:c.id,number:n,owned:c.id==='monster'&&n===25?1:0,copies:[],card,favorite:false};
}));
function safeStarterAsset(c){return c.imageAsset;}
function previewStarterImport(){return {toAdd:0};}
function installStarterSeries(){throw Error('not in UI fixture');}
function filterAlbum(album,{category,status,query}){return album.slots.filter(s=>(category==='all'||s.categoryId===category)&&(status==='all'||status==='owned'&&s.owned||status==='missing'&&!s.owned||status==='favorites'&&s.favorite)&&(!query||s.card?.name.toLowerCase().includes(query.toLowerCase())||String(s.number).includes(query)));}
async function loadRewardAlbum(){return {slots,uniqueOwned:1,total:100,copies:1,configured:100,percent:1,favorites:0,byCategory:REWARD_CATEGORIES.map(c=>({id:c.id,label:c.label,owned:c.id==='monster'?1:0,total:25}))};}
async function setAlbumFavorite(){};async function saveAlbumCard(){};async function prepareAlbumImage(){};
window.confirm=()=>false;
'''
code=fixture+js_file('assets/reward-premium.js')+'\n'+js_file('assets/reward-album-ui.js')+r'''
window.startBW11=()=>{document.getElementById('view').innerHTML=renderRewardAlbum();mountPremiumSettings(document.getElementById('view'));mountRewardAlbum();};
window.readBW11=()=>({current:getActivePremiumSettings(),stored:dbStorage.get('belohnungswelt:bw11:visual-preferences'),writes});
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,412]:
  context=browser.new_context(viewport={'width':width,'height':820},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#06182e;color:white"><main id="view" style="max-width:620px;margin:auto;padding:10px"></main></body></html>')
  for css in ('assets/reward-album.css','assets/reward-premium.css'):page.add_style_tag(content=(ROOT/css).read_text(encoding='utf-8'))
  page.add_script_tag(content=code)
  page.evaluate('startBW11()')
  page.locator('[data-bw11-setting="effects"]:not([disabled])').wait_for()
  page.locator('.bw-card-open').first.wait_for()
  assert page.locator('.bw-card-open').count()==100
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'album overflow at {width}'
  page.locator('[data-bw11-setting="effects"]').select_option('reduced')
  page.wait_for_function("document.documentElement.dataset.bw11Effects === 'reduced'")
  assert page.evaluate('readBW11().stored.effects')=='reduced'
  page.locator('[data-bw11-setting="sound"]').check()
  page.wait_for_function('readBW11().stored.sound === true')
  page.locator('[data-bw11-setting="effects"]').select_option('full')
  page.wait_for_function("document.documentElement.dataset.bw11Effects === 'full'")
  page.locator('[data-bw-open="monster:25"]').click()
  page.locator('#bwCardModal:not([hidden])').wait_for()
  assert page.locator('.bw-art-large.bw-rarity-diamant').count()==1
  assert page.locator('.bw-art-large .bw11-rarity-chip').inner_text()=='Diamant'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'modal overflow at {width}'
  if width==390:page.screenshot(path=str(ROOT/'DOKUMENTATION/BW11_Album_390px.png'),full_page=True)
  page.locator('#bwModalClose').click()
  page.locator('[data-bw-open="anime-frauen:1"]').click()
  assert page.locator('.bw-art-large.bw-is-missing').count()==1
  page.locator('#bwModalClose').click()
  assert not errors,errors
  print(f'PASS BW11 isolated album {width}px: 100 slots, full/reduced state, optional sound, diamond label, owned state, no overflow')
  context.close()
 # Reduced motion media check: animation must compute as none for large, owned Diamond.
 ctx=browser.new_context(viewport={'width':390,'height':820},reduced_motion='reduce');page=ctx.new_page()
 page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#06182e"><main id="view"></main></body></html>')
 for css in ('assets/reward-album.css','assets/reward-premium.css'):page.add_style_tag(content=(ROOT/css).read_text())
 page.add_script_tag(content=code);page.evaluate('startBW11()');page.locator('.bw-card-open').first.wait_for()
 page.evaluate("document.documentElement.dataset.bw11Effects='full'")
 page.locator('[data-bw-open="monster:25"]').click()
 anim=page.locator('.bw-art-large.bw-rarity-diamant').evaluate("el=>getComputedStyle(el,'::after').animationName")
 assert anim=='none',anim
 print('PASS BW11 OS reduced-motion automatically disables premium animation')
 ctx.close();browser.close()
