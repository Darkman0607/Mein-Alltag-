from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parent
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(base)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
  page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
  page.on('pageerror',lambda err:print('PAGE ERROR:',str(err)))
  try:page.goto(url,wait_until='networkidle',timeout=12000)
  except Exception as err:raise RuntimeError('Browser-Navigation gesperrt: '+str(err)[:300])
  page.get_by_role('button',name='Lagerhaus öffnen').click()
  page.get_by_role('link',name='Geräte & Service').first.click()
  assert page.get_by_role('heading',name='Geräte- & Serviceakten').count()==1
  page.evaluate('''async ()=>{let db=await new Promise((resolve,reject)=>{let r=indexedDB.open('mein-alltag-v0',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{let tx=db.transaction('lagerhaus','readwrite');tx.objectStore('lagerhaus').put([{id:'i1',name:'Akkuschrauber',code:'A-0001',unit:'stk',type:'geraet',quantity:1,stockLocations:[{locationId:'',quantity:1}],devices:[{id:'d1',serialNumber:'TEST-01',code:'G-001',label:'Testgerät',locationId:'',condition:'gut'}]}],'items.v1');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}''')
  page.reload(wait_until='networkidle')
  page.get_by_role('button',name='Serviceakte öffnen').click()
  frm=page.locator('#lagerServiceFileForm')
  frm.locator('[name=manufacturer]').fill('Test-Hersteller')
  frm.locator('[name=operatingHours]').fill('40')
  frm.locator('[name=intervalHours]').fill('20')
  frm.locator('[name=checklist]').fill('Sichtprüfung\nReinigen')
  frm.get_by_role('button',name='Serviceakte speichern').click()
  page.wait_for_timeout(500)
  assert page.get_by_text('Serviceakte gespeichert.').count()>0
  done=page.locator('#lagerServiceCompleteForm')
  done.locator('[name=completed]').check() # first one
  done.locator('[name=completed]').nth(1).check()
  done.get_by_role('button',name='Wartung als erledigt speichern').click()
  page.wait_for_timeout(500)
  assert page.get_by_text('Wartung gespeichert.',exact=False).count()>0
  assert page.get_by_text('Letzter bestätigter Service').count()>0
  print('PASS UI L15: Chrome touch viewport, navigation, IndexedDB persistence, maintenance checklist and completion')
  browser.close()
finally:server.shutdown()