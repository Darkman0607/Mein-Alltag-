"""LS04: interactive Chromium component testing with simulated IDB and Crypto adapters."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
learn=(root/'modules/lernschule.js').read_text().replace("import {getModuleValue,setModuleValue} from '../assets/database.js';",'')
for symbol in ['createLearningLibrary','validateLearningLibrary','clearLearningView','learningHasUnsavedChanges','loadLearning','renderLearning','bindLearning']:
 learn=learn.replace('export function '+symbol,'function '+symbol).replace('export async function '+symbol,'async function '+symbol).replace('export const '+symbol,'const '+symbol)
learn=learn.replace('export const LEARNING_KEY','const LEARNING_KEY').replace('export const LEARNING_ADMIN_KEY','const LEARNING_ADMIN_KEY')
mock="""
const memory={};
const getModuleValue=async(s,k)=>structuredClone(memory[s+':'+k]??null);
const setModuleValue=async(s,k,v)=>{memory[s+':'+k]=structuredClone(v);};
Object.defineProperty(crypto,'subtle',{configurable:true,value:{
 importKey:async(_,key)=>key,
 deriveBits:async(cfg,key)=>{const a=new Uint8Array(32);for(let i=0;i<key.length;i++)a[i%32]=(a[i%32]+key[i]+i)%256;for(let i=0;i<cfg.salt.length;i++)a[i%32]^=cfg.salt[i];return a.buffer;}
}});
const root=document.getElementById('view');
const rerender=()=>{root.innerHTML=renderLearning();bindLearning(root,rerender);};
window.mountTest=async()=>{await loadLearning();rerender();};
window.mockStore=memory;
"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
 errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content('<!doctype html><html lang="de"><head><meta charset="utf-8"></head><body class="health-mode"><div id="view" class="health-app"></div></body></html>')
 page.add_style_tag(content=(root/'assets/styles.css').read_text())
 page.add_script_tag(content=mock+learn)
 page.evaluate('mountTest()')
 # Set up admin and create a fresh lesson in existing first topic.
 page.locator('[data-ls-admin-form=setup] [name=password]').fill('Password-sehr-lang-42')
 page.locator('[data-ls-admin-form=setup] [name=repeat]').fill('Password-sehr-lang-42')
 page.locator('[data-ls-admin-form=setup] button[type=submit]').click()
 page.locator('[data-ls-admin-ack]').click()
 page.locator('[data-ls-topic=anatomie]').click()
 page.locator('[data-ls-chapter=anatomie-kap-1]').click()
 page.locator('[data-ls-new=section]').click()
 page.locator('#lsEntityForm [name=title]').fill('LS04 Praxis')
 page.locator('#lsEntityForm [type=submit]').click()
 page.locator('[data-ls-section]').filter(has_text='LS04 Praxis').click()
 page.locator('[data-ls-new=lesson]').click()
 page.locator('#lsLessonForm [name=title]').fill('Lektion mit PDF')
 page.locator('#lsEditable').fill('Lesetext Original')
 # Add infobox, remove, re-add and edit, ordering.
 page.locator('[data-ls-add-block=note]').click()
 page.locator('[data-ls-note-title]').fill('💡 Merksatz')
 page.locator('[data-ls-note-body]').fill('Lernen ist wichtig.\nZweite Zeile.')
 page.locator('[data-ls-note-style]').select_option('tip')
 assert page.locator('.ls-block-item').count()==1
 assert page.evaluate('learningHasUnsavedChanges()')
 # Block unsafe fake PDF by magic signature, upload legit minimal bytes afterward.
 page.locator('[data-ls-block-files=pdf]').set_input_files({'name':'falsch.pdf','mimeType':'application/pdf','buffer':b'not pdf'})
 assert 'Ungültige PDF' in page.locator('#lsBlockHelp').inner_text()
 assert page.locator('.ls-block-item').count()==1
 page.locator('[data-ls-block-files=pdf]').set_input_files({'name':'anleitung.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\n1 0 obj <</Type/Catalog>> endobj\n%%EOF'})
 assert page.locator('.ls-block-item').count()==2
 # Galley file limits and JPEG/PNG preview – use a real 1px PNG.
 png=bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082')
 page.locator('[data-ls-block-files=gallery]').set_input_files([
  {'name':'bild1.png','mimeType':'image/png','buffer':png},
  {'name':'bild2.png','mimeType':'image/png','buffer':png}])
 assert page.locator('.ls-block-item').count()==3
 assert '2 Bilder' in page.locator('.ls-block-list').inner_text()
 page.locator('.ls-block-item').nth(2).locator('[data-ls-block-move=up]').click()
 assert 'Galerie' in page.locator('.ls-block-item').nth(1).inner_text()
 page.locator('#lsTogglePreview').click()
 assert page.locator('#lsPreview .ls-content-gallery img').count()==2
 assert page.locator('#lsPreview .ls-content-pdf').count()==1
 assert 'Merksatz' in page.locator('#lsPreview').inner_text()
 # PDF preview uses in-memory Blob URL (no remote network); iframe exists.
 page.locator('#lsPreview [data-ls-open-pdf]').click()
 assert page.locator('#lsPreview .ls-pdf-view iframe').count()==1
 # Save published -> visible reader, reload -> still available.
 page.locator('[data-ls-save=published]').click()
 assert page.locator('[data-ls-lesson]').count()==1
 page.locator('[data-ls-admin-logout]').click()
 page.locator('[data-ls-lesson]').click()
 assert page.locator('.ls-reader .ls-content-gallery img').count()==2
 assert page.locator('.ls-reader .ls-content-pdf').count()==1
 assert page.locator('.ls-reader .ls-content-note').count()==1
 assert page.locator('.ls-reader .ls-content-gallery img').first.get_attribute('src').startswith('data:image/png;base64,')
 # Test PDF saved as offline local data: no URL pointing to a server.
 db=page.evaluate("mockStore['frauengesundheit:health.lernschule.library.v1']")
 lesson=db['topics'][0]['chapters'][0]['sections'][0]['lessons'][0]
 assert lesson['status']=='published' and len(lesson['blocks'])==3
 assert any(x['type']=='pdf' and x['data'].startswith('data:application/pdf;base64,') for x in lesson['blocks'])
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
 # Edit published lesson as draft; public title and published block content must stay unchanged.
 page.locator('[data-ls-admin-form=login] [name=password]').fill('Password-sehr-lang-42')
 page.locator('[data-ls-admin-form=login] button[type=submit]').click()
 page.locator('[data-ls-edit=lesson]').click()
 page.locator('#lsLessonForm [name=title]').fill('Nur Entwurf, nicht öffentlich')
 page.locator('.ls-block-item').first.locator('[data-ls-block-move=remove]').click()
 page.locator('[data-ls-save=draft]').click()
 db=page.evaluate("mockStore['frauengesundheit:health.lernschule.library.v1']")
 lesson=db['topics'][0]['chapters'][0]['sections'][0]['lessons'][0]
 assert lesson['title']=='Lektion mit PDF' and lesson['draftTitle']=='Nur Entwurf, nicht öffentlich'
 assert len(lesson['blocks'])==3 and len(lesson['draftBlocks'])==2
 page.locator('[data-ls-admin-logout]').click()
 assert 'Lektion mit PDF' in page.locator('[data-ls-lesson]').inner_text()
 page.locator('[data-ls-lesson]').click()
 assert page.locator('.ls-reader .ls-content-gallery img').count()==2
 # Existing data survives simulated reload.
 page.evaluate('clearLearningView(); mountTest()')
 assert page.locator('[data-ls-topic]').count()==7
 assert not errs,errs
 (root/'DOKUMENTATION').mkdir(exist_ok=True)
 page.screenshot(path=str(root/'DOKUMENTATION/LS04_390px.png'),full_page=True)
 print('PASS LS04: mobile 390px; pdf magic rejection, PDF inline preview, image gallery, infobox, reorder, publish, isolated draft, reader, reload, local-only data, no JS errors')
 browser.close()
