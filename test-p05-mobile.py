#!/usr/bin/env python3
"""Tests real P05 interface with IndexedDB and Chromium at 320/390/412 pixels."""
from urllib.parse import urlparse,unquote
from mimetypes import guess_type
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,contextlib
os.chdir(Path(__file__).parent)
URL='https://meinalltag.test/'
ROOT=Path(__file__).parent
def fulfill(route):
 path=unquote(urlparse(route.request.url).path).lstrip('/') or 'index.html'
 f=(ROOT/path).resolve()
 if not f.is_relative_to(ROOT) or not f.is_file():return route.fulfill(status=404,body='Not found')
 return route.fulfill(status=200,body=f.read_bytes(),content_type=guess_type(str(f))[0] or 'application/octet-stream')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,412):
  context=browser.new_context(viewport={'width':width,'height':850},device_scale_factor=1,is_mobile=True,has_touch=True,service_workers='block')
  page=context.new_page();page.route('**/*',fulfill);failures=[]
  page.on('pageerror',lambda err:failures.append(str(err)))
  page.goto(URL,wait_until='domcontentloaded');page.wait_for_timeout(350)
  page.evaluate("""async () => {
   const {setModuleValue}=await import('./assets/database.js');
   await setModuleValue('putzmanager','wohnung.rooms.v1',[
    {id:'k-test',name:'Küche',type:'kueche',photos:[],objects:[],createdAt:new Date().toISOString()},
    {id:'b-test',name:'Badezimmer',type:'bad',photos:[],objects:[],createdAt:new Date().toISOString()}]);
   await setModuleValue('putzmanager','cleaning.sessions.v1',{active:{},history:[{id:'old-1',roomId:'k-test',endedAt:'2026-11-14T20:00:00',doneCount:11,totalCount:21,durationMs:120000,materials:[]}]});
  }""")
  page.goto(URL+'#/module/putzmanager');page.locator('.pm-gallery-card').first.wait_for()
  assert page.locator('.pm-gallery-card').count()==2
  assert page.locator('.pm-stat').count()==3
  assert page.locator('.pm-gallery-card').first.locator('.pm-gallery-track').count()==1
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),f'horizontal overflow {width}'
  page.locator('[data-theme="light"]').first.click()
  assert page.evaluate('document.body.classList.contains("pm-light-mode")')
  if width==390:page.screenshot(path='/mnt/data/_work_p05/P05_Light_390.png',full_page=True)
  page.locator('[data-action="open-room"][data-id="k-test"]').click()
  page.locator('[data-clean-interval="quick:geschirrspueler"]').wait_for()
  assert page.get_by_text('Älterer Eintrag: Welche Aufgaben',exact=False).count()==0
  page.locator('.pm-clean-history').locator('summary').first.click()
  assert page.get_by_text('Älterer Eintrag: Welche Aufgaben',exact=False).count()==1
  interval=page.locator('[data-clean-interval="quick:geschirrspueler"]')
  interval.locator('xpath=ancestor::details[1]').locator('summary').first.click()
  interval.select_option('days:2')
  # Data persists in IndexedDB, not just in markup.
  assert page.evaluate("""async()=>{const m=await import('./assets/database.js');const p=await m.getModuleValue('putzmanager','cleaning.schedule.v1');return p['k-test']['quick:geschirrspueler'].every;}""")==2
  # No session started; a single tap must persist and immediately affect the dashboard.
  page.locator('[data-clean-area="quick:geschirrspueler"]').check()
  assert page.locator('[data-clean-area="quick:geschirrspueler"]').is_checked()
  assert 'Heute erledigt' in page.locator('.pm-clean-group').filter(has=page.locator('[data-clean-area="quick:geschirrspueler"]')).inner_text()
  assert page.evaluate("""async()=>{const m=await import('./assets/database.js');const p=await m.getModuleValue('putzmanager','cleaning.sessions.v1');return p.taskEvents.length===1&&p.taskEvents[0].groupId==='quick:geschirrspueler'&&!p.active['k-test'];}""")
  page.locator('[data-action="rooms-list"]').click()
  page.get_by_text('Geschirrspüler',exact=True).first.wait_for()
  assert page.locator('.pm-stat').first.locator('strong').inner_text()=='1'
  page.locator('[data-action="open-room"][data-id="k-test"]').click()
  assert page.locator('[data-clean-area="quick:geschirrspueler"]').is_checked()
  assert page.get_by_text('Älterer Eintrag: Welche Aufgaben',exact=False).count()==1
  if width==390:page.screenshot(path='/mnt/data/_work_p05/P05_Room_390.png',full_page=True)
  page.goto(URL+'#/home');page.wait_for_timeout(250)
  assert not page.evaluate('document.body.classList.contains("pm-light-mode")'),'theme leaked into another module'
  assert not failures,failures
  print(f'PASS P05 Chromium {width}px: rooms, intervals, history, completed status, themes, navigation, no horizontal overflow')
  context.close()
 browser.close()

