"""Local browser smoke test for L16.1 (does not mark admin-blocked navigation as success)."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright
import threading
root=Path(__file__).resolve().parent
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':390,'height':844},has_touch=True)
  try:
   page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded',timeout=10000)
  except Exception as e:
   print('BLOCKED L16.1 Chromium:',str(e).splitlines()[0]);raise SystemExit(2)
  page.get_by_role('button',name='Lagerhaus öffnen').click()
  assert page.get_by_text('Meine Lagerbereiche').count()>=1
  print('PASS browser shell; manual floor placement and persistence not covered')
  browser.close()
finally:
 server.shutdown()