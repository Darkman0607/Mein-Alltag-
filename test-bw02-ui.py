"""BW02 isolated Chromium DOM/UI/mobile test. Persistence tested separately in Node."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
album=(ROOT/'assets/reward-album.js').read_text()
ui=(ROOT/'assets/reward-album-ui.js').read_text()
# Isolated pure domain projections from actual app source, no local HTTP/network permitted.
album=album[album.index('const FAVORITE_KEY='):album.index('export async function loadRewardAlbum()')].replace('export ','')
ui='\n'.join(line for line in ui.splitlines() if not line.startswith('import ')).replace('export ','')
boot=r'''
const REWARD_CATEGORIES=[{id:'anime-frauen',label:'Anime-Frauen',planned:25},{id:'anime-tiere',label:'Anime-Tiere',planned:25},{id:'maschinen',label:'Traktoren & Maschinen',planned:25},{id:'monster',label:'Monster',planned:25}];
const REWARD_RARITIES=['gewoehnlich','ungewoehnlich','selten','episch','legendaer','mythisch','diamant'];
'''+album+r'''
let catalog=[],instances=[],favorites=[];
async function loadRewardAlbum(){return projectAlbum(catalog,instances,favorites);}
async function setAlbumFavorite(id,wanted){favorites=wanted?[...new Set([...favorites,id])]:favorites.filter(k=>k!==id);}
async function saveAlbumCard(item){const i=catalog.findIndex(c=>c.categoryId===item.categoryId&&c.number===item.number);const x={...item,id:i>=0?catalog[i].id:'catalog:'+item.categoryId+':'+String(item.number).padStart(3,'0')};if(i>=0)catalog[i]=x;else catalog.push(x);return x;}
async function prepareAlbumImage(file){if(file.size>10000000)throw Error('Zu groß');return 'data:image/png;base64,iVBORw0KGgo=';}
'''+ui+r'''
window.startAlbum=()=>{document.getElementById('view').innerHTML=renderRewardAlbum();mountRewardAlbum();};
window.getState=()=>({catalog,instances,favorites});
'''
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#06182e;color:white;margin:0"><main id="view" style="width:min(100%,540px);padding:10px;margin:auto"></main></body></html>')
  page.add_style_tag(content=(ROOT/'assets/styles.css').read_text())
  page.add_style_tag(content=(ROOT/'assets/reward-album.css').read_text())
  page.add_script_tag(content=boot)
  page.evaluate('startAlbum()')
  page.locator('.bw-card-tile').first.wait_for(timeout=8000)
  assert page.locator('.bw-card-tile').count()==100
  assert '0 / 100' in page.locator('#bwAlbumStats').inner_text()
  page.locator('[data-bw-cat="monster"]').click()
  assert page.locator('.bw-card-tile').count()==25
  page.locator('#bwAlbumSearch').fill('002')
  assert page.locator('.bw-card-tile').count()==1
  page.locator('.bw-card-favorite').click()
  page.wait_for_function("document.querySelector('.bw-card-favorite')?.getAttribute('aria-pressed')==='true'")
  page.locator('#bwAlbumFilter').select_option('favorites')
  assert page.locator('.bw-card-tile').count()==1
  page.locator('.bw-card-open').click()
  assert page.locator('#bwCardModal').is_visible()
  page.locator('#bwCardEditButton').click()
  page.locator('#bwCardName').fill('Originaltestkarte')
  page.locator('#bwCardRarity').select_option('selten')
  page.locator('#bwCardDescription').fill('Nur Test; nicht gesammelt.')
  page.locator('#bwCardSave').click()
  page.wait_for_function("document.querySelector('#bwModalTitle')?.textContent==='Originaltestkarte'")
  assert 'Noch nicht gesammelt' in page.locator('#bwModalBody').inner_text()
  assert len(page.evaluate('getState().catalog'))==1
  assert len(page.evaluate('getState().instances'))==0
  if width==390:
   (ROOT/'DOKUMENTATION'/'BW02_Karte_Detail_390px.png').parent.mkdir(exist_ok=True)
   page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW02_Karte_Detail_390px.png'))
  page.locator('#bwModalClose').click()
  assert page.locator('#bwCardModal').is_hidden()
  page.locator('#bwAlbumSearch').fill('')
  page.locator('#bwAlbumFilter').select_option('all')
  assert page.locator('.bw-card-tile').count()==25
  assert 'Originaltestkarte' in page.locator('[data-bw-open="monster:2"]').inner_text()
  if width==390:page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW02_Album_390px.png'),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'Horizontal overflow {width}'
  assert not errors,errors
  page.close();context.close()
  print(f'PASS BW02 isolated Chromium UI {width}px: 100 Plätze, Filter, Favoriten, Details, Kartenbearbeitung, kein vorgetäuschter Besitz, kein horizontaler Überlauf')
 browser.close()
