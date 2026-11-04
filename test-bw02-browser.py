"""BW02 full browser smoke test: intercepted HTTPS origin, real IndexedDB, no external network."""
import asyncio,io,mimetypes
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent
ORIGIN='https://mein-alltag-bw02.test'

async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  ctx=await browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,service_workers='block')
  page=await ctx.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  async def serve(route):
   from urllib.parse import urlparse,unquote
   path=unquote(urlparse(route.request.url).path).lstrip('/')
   target=(ROOT/path).resolve() if path else ROOT/'index.html'
   if target.is_file() and target.is_relative_to(ROOT):
    await route.fulfill(path=str(target),content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
   else:await route.fulfill(status=404,body='Not found')
  await page.route('**/*',serve)
  try:
   await page.goto(ORIGIN+'/index.html#/reward/album',wait_until='domcontentloaded')
   await page.wait_for_selector('.bw-card-grid .bw-card-tile',timeout=12000)
   assert await page.locator('.bw-card-tile').count()==100
   assert '0 / 100' in await page.locator('#bwAlbumStats').inner_text()
   assert '0' in await page.locator('.bw-album-results').inner_text()
   assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2')
   await page.locator('[data-bw-cat="monster"]').click()
   assert await page.locator('.bw-card-tile').count()==25
   await page.locator('#bwAlbumSearch').fill('002')
   assert await page.locator('.bw-card-tile').count()==1
   await page.locator('.bw-card-favorite').click()
   await page.wait_for_function('document.querySelector(".bw-card-favorite")?.getAttribute("aria-pressed")==="true"')
   await page.locator('#bwAlbumSearch').fill('')
   await page.locator('#bwAlbumFilter').select_option('favorites')
   assert await page.locator('.bw-card-tile').count()==1
   await page.locator('.bw-card-open').click()
   assert await page.locator('#bwCardModal').is_visible()
   await page.locator('#bwCardEditButton').click()
   await page.locator('#bwCardName').fill('Blauer Wächter')
   await page.locator('#bwCardRarity').select_option('episch')
   await page.locator('#bwCardDescription').fill('Originaltestkarte, kein freigeschaltetes Exemplar.')
   image=Image.new('RGB',(480,720),(50,100,160));buf=io.BytesIO();image.save(buf,format='PNG')
   await page.locator('#bwCardImage').set_input_files({'name':'eigenes-testbild.png','mimeType':'image/png','buffer':buf.getvalue()})
   await page.wait_for_function('document.querySelector("#bwCardFormMessage")?.textContent.includes("optimiert")')
   await page.locator('#bwCardSave').click()
   await page.wait_for_function('document.querySelector("#bwModalTitle")?.textContent.includes("Blauer Wächter")')
   assert 'Noch nicht gesammelt' in await page.locator('#bwModalBody').inner_text()
   assert await page.locator('.bw-art-large img').count()==1
   await page.locator('#bwModalClose').click()
   assert await page.locator('#bwCardModal').is_hidden()
   # Check a saved card does not create false ownership or XP.
   await page.reload(wait_until='domcontentloaded')
   await page.wait_for_selector('.bw-card-tile')
   assert '0 / 100' in await page.locator('#bwAlbumStats').inner_text()
   await page.locator('#bwAlbumFilter').select_option('favorites')
   assert await page.locator('.bw-card-tile').count()==1
   assert 'Blauer Wächter' in await page.locator('.bw-card-tile').inner_text()
   assert await page.locator('.bw-card-art img').count()==1
   summary=await page.evaluate('''async()=>{
     const data=await import('./assets/reward-album.js');const db=await import('./assets/database.js');
     const backup=await import('./assets/backup.js');
     const a=await data.loadRewardAlbum();
     const state=await backup.captureSnapshot();
     return {owned:a.uniqueOwned,configured:a.configured,favorites:a.favorites,version:(await db.openDatabase()).version,stores:Object.keys(state.stores).length,albumRows:state.stores.belohnungswelt.length};
   }''')
   assert summary=={'owned':0,'configured':1,'favorites':1,'version':2,'stores':14,'albumRows':1},summary
   # Image/metadata and favorites survive backup/restore in the real browser.
   await page.evaluate('''async()=>{
    const b=await import('./assets/backup.js'),a=await import('./assets/reward-album.js');
    const snap=await b.captureSnapshot();const enc=await b.encryptSnapshot(snap,'BW02-Browser-Backup2026!');
    const decrypted=await b.decryptBackup(enc,'BW02-Browser-Backup2026!');
    await a.setAlbumFavorite('monster:2',false);await b.restoreSnapshot(decrypted);
    const restored=await a.loadRewardAlbum();
    if(restored.favorites!==1||restored.configured!==1||restored.uniqueOwned!==0)throw Error('Wrong restored album');
   }''')
   await page.goto(ORIGIN+'/index.html#/reward/start',wait_until='domcontentloaded')
   await page.wait_for_function('document.querySelector(".bw-progress-copy>span")?.textContent.includes("0 / 100")')
   for width in (320,390,412):
    await page.set_viewport_size({'width':width,'height':844})
    await page.goto(ORIGIN+'/index.html#/reward/album',wait_until='domcontentloaded')
    await page.wait_for_selector('.bw-card-tile')
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'horizontal overflow {width}'
    await page.locator('[data-bw-cat="monster"]').click()
    assert await page.locator('.bw-card-tile').count()==25
    if width==390:
     (ROOT/'DOKUMENTATION'/'BW02_Album_390px.png').parent.mkdir(exist_ok=True)
     await page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW02_Album_390px.png'),full_page=True)
     await page.locator('[data-bw-open="monster:2"]').click()
     await page.screenshot(path=str(ROOT/'DOKUMENTATION'/'BW02_Karte_Detail_390px.png'),full_page=False)
     await page.locator('#bwModalClose').click()
   assert not errors,errors
   print('PASS BW02 Chromium: HTTPS route, real IndexedDB, 100 Slots, 4 categories, search, filters, favorites persistence, original picture import, editing, no fake ownership, backup/restore, mobile 320/390/412 no overflow, no JS errors.')
  finally:
   await ctx.close();await browser.close()

if __name__=='__main__':asyncio.run(run())
