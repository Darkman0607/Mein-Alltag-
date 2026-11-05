"""BW13 isolated real Chromium rendering checks (network-independent)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,subprocess,json
ROOT=Path(__file__).resolve().parent
old=(ROOT/'test-bw11-ui.py').read_text()
fixture=old.split("fixture=r'''",1)[1].split("'''",1)[0]
fixture=fixture.replace('function safeStarterAsset(c){return c.imageAsset;}',
 'function safeStarterAsset(c){return c.categoryId===\'anime-frauen\'&&c.number<=25?`./assets/card-art/anime-frauen/${String(c.number).padStart(3,\'0\')}.webp`:c.imageAsset;}')
known=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {BW06_STARTER_CARDS} from './assets/reward-series-data.js';console.log(JSON.stringify(Object.fromEntries(BW06_STARTER_CARDS.filter(c=>c.categoryId==='anime-frauen').map(c=>[c.number,{name:c.name,rarity:c.rarity}]))))"],cwd=ROOT,text=True))
fixture=fixture.replace('const catalog=[];', 'const __bw13names='+json.dumps(known,ensure_ascii=False)+';\nconst catalog=[];')
fixture=fixture.replace('name:`${c.label} ${n}`,', "name:c.id==='anime-frauen'?__bw13names[n].name:`${c.label} ${n}`,")
fixture=fixture.replace('number:n,rarity,description:', "number:n,rarity:c.id==='anime-frauen'?__bw13names[n].rarity:rarity,description:")
code=fixture+'\n'+ '\n'.join(s for s in (ROOT/'assets/reward-premium.js').read_text().splitlines() if not s.startswith('import ')).replace('export ','')+ '\n'+ '\n'.join(s for s in (ROOT/'assets/reward-album-ui.js').read_text().splitlines() if not s.startswith('import ')).replace('export ','')+'''
window.startBW13=()=>{document.getElementById('view').innerHTML=renderRewardAlbum();mountPremiumSettings(document.getElementById('view'));mountRewardAlbum();};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def static_files(route):
   rel=route.request.url.split('https://test.invalid/',1)[-1]
   f=ROOT/rel
   if f.is_file() and f.suffix=='.webp':route.fulfill(status=200,content_type='image/webp',body=f.read_bytes())
   else:route.abort()
  page.route('https://test.invalid/**',static_files)
  page.set_content('<!doctype html><html lang="de"><head><base href="https://test.invalid/"><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#06182e;color:white"><main id="view" style="max-width:620px;margin:auto;padding:10px"></main></body></html>')
  for css in ('assets/reward-album.css','assets/reward-premium.css'):page.add_style_tag(content=(ROOT/css).read_text())
  page.add_script_tag(content=code)
  page.evaluate('startBW13()')
  page.locator('.bw-card-tile').first.wait_for()
  assert page.locator('.bw-card-tile').count()==100
  page.locator('button[data-bw-cat="anime-frauen"]').click()
  assert page.locator('.bw-card-tile').count()==25
  page.wait_for_function('''()=>Array.from(document.querySelectorAll('.bw-card-tile img')).slice(0,2).every(i=>i.complete&&i.naturalWidth>0)''',timeout=10000)
  metrics=page.evaluate('''()=>({columns:getComputedStyle(document.querySelector('.bw-card-grid')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth-innerWidth,ratio:document.querySelector('.bw-bespoke-art').getBoundingClientRect().width/document.querySelector('.bw-bespoke-art').getBoundingClientRect().height,picture:document.querySelector('.bw-card-art img').naturalWidth,number:getComputedStyle(document.querySelector('.bw-bespoke-art .bw-card-art-number')).display,innerFrame:getComputedStyle(document.querySelector('.bw-bespoke-art'),'::before').display})''')
  assert metrics['columns']==2,metrics
  assert metrics['overflow']<=2,metrics
  assert abs(metrics['ratio']-.8)<.035,metrics
  assert metrics['picture']==360,metrics
  assert metrics['number']=='block',metrics
  assert metrics['innerFrame']=='none',metrics
  if width==390:
   page.locator('.bw-card-grid').scroll_into_view_if_needed()
   page.evaluate("scrollTo(0,document.querySelector('.bw-card-grid').getBoundingClientRect().top + scrollY - 16)")
   page.screenshot(path=str(ROOT/'DOKUMENTATION/BW13_Album_390px.png'),full_page=False)
  page.locator('button[data-bw-open="anime-frauen:1"]').click()
  page.locator('#bwCardModal:not([hidden])').wait_for()
  page.locator('#bwCardModal .bw-art-large img').wait_for()
  assert page.locator('#bwCardModal .bw-card-art-number').inner_text()=='#001'
  if width==390:page.screenshot(path=str(ROOT/'DOKUMENTATION/BW13_Kartendetail_390px.png'),full_page=False)
  page.locator('#bwModalClose').click()
  assert page.locator('#bwCardModal').is_hidden()
  assert not errors,errors
  print(f'PASS BW13 mobile {width}px: 25 anime cards, 2 columns, portrait framing, responsive details & no overflow')
  ctx.close()
 browser.close()
