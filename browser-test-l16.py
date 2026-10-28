"""L16 Chromium + IndexedDB smoke test; reports BLOCKED rather than claiming pass when policy denies localhost."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parent
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(base)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
  page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True,accept_downloads=True)
  errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  try:page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='networkidle',timeout=12000)
  except Exception as e:raise RuntimeError('Browser-Navigation blockiert: '+str(e)[:300])
  page.get_by_role('button',name='Lagerhaus öffnen').click()
  page.get_by_role('link',name='Geräte & Service').first.click()
  assert page.get_by_role('heading',name='Geräte- & Serviceakten').count()==1
  page.evaluate('''async ()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('mein-alltag-v0',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});await new Promise((res,rej)=>{const tx=db.transaction('lagerhaus','readwrite');tx.objectStore('lagerhaus').put([{id:'i1',type:'geraet',name:'Akkuschrauber',quantity:1,code:'A1',unit:'stk',devices:[{id:'d1',code:'G1',label:'TEST',serialNumber:'S1',condition:'gut',service:{operatingHours:12}}]}],'items.v1');tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}''')
  page.reload(wait_until='networkidle')
  page.get_by_role('button',name='Serviceakte öffnen').click()
  page.locator('#lagerServiceRepairForm [name=description]').fill('Testreparatur')
  page.locator('#lagerServiceRepairForm [name=cost]').fill('25.30')
  page.locator('#lagerServiceRepairForm [name=blockAfter]').check()
  page.locator('#lagerServiceRepairForm button[type=submit]').click()
  page.wait_for_timeout(350)
  assert page.get_by_text('Reparatur einschließlich Kosten',exact=False).count()>0
  assert page.get_by_text('Gerät gesperrt',exact=False).count()>0
  page.reload(wait_until='networkidle')
  page.get_by_role('button',name='Serviceakte öffnen').click()
  assert page.get_by_text('Testreparatur',exact=False).count()>0
  assert not errors,errors
  print('PASS L16 browser: responsive/touch, repair, blocked status, IndexedDB persistence')
  b.close()
finally:server.shutdown()