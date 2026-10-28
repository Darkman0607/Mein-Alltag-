"""D01 mobile Chromium rendered UI test, no Google login or real personal data."""
from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parent
src=(root/'assets/app.js').read_text()
a=src[src.index('function renderMore(){'):src.index('async function loadStorage()')]
b=src[src.index('function bindBackup(){'):src.index('export function render(){')]
# Fake out imported services; this is an isolated layout & click interaction test.
js='''const APP_VERSION='0.17.0';const esc=s=>String(s).replace(/[&<>"']/g,'');
const section=(title,subtitle)=>`<div class="section-heading"><h1>${title}</h1><p>${subtitle}</p></div>`;
const getGoogleClientId=()=>'';const saveGoogleClientId=(id)=>{if(!id.endsWith('.apps.googleusercontent.com'))throw Error('Ungültige Client-ID');};
const validateGoogleClientId=(id)=>Boolean(id&&id.endsWith('.apps.googleusercontent.com'));
const prepareGoogleIdentity=async()=>{};const connectGoogleDrive=()=>{throw Error('Keine Client-ID');};
const disconnectGoogleDrive=()=>{};const isDriveConnected=()=>false;
const listDriveBackups=async()=>[];const uploadDriveBackup=async()=>{};const downloadDriveBackup=async()=>{};
const createEncryptedBackup=async()=>({});const triggerBackupDownload=()=>'';
const decryptBackup=async()=>({});const restoreSnapshot=async()=>0;const validateSnapshot=()=>({count:0});
''' + a + b + '''\ndocument.getElementById('view').innerHTML=renderMore();bindBackup();'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='de-AT')
 page=context.new_page()
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="view"></main></body></html>')
 page.add_style_tag(content=(root/'assets/styles.css').read_text())
 page.add_script_tag(content=js)
 assert page.get_by_text('Beta V0.17.0').count()>=1
 assert page.locator('#googleLogin').is_enabled()
 assert not page.locator('#driveSave').is_enabled()
 assert not page.locator('#driveRestore').is_enabled()
 assert page.locator('#googleDriveSetup').get_attribute('open') is None
 page.locator('#googleLogin').click()
 assert page.locator('#googleDriveSetup').get_attribute('open') is not None
 assert 'einrichten' in page.locator('#backupResult').inner_text()
 page.locator('#googleClientId').fill('bad-client-id')
 page.locator('#googleSaveClientId').click()
 assert 'Ungültige Client-ID' in page.locator('#backupResult').inner_text()
 assert not page.locator('#driveSave').is_enabled()
 assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'Horizontal overflow at 390px'
 assert not errors,errors
 print('PASS D01 UI: mobile 390px layout, disabled Drive controls, setup prompt, invalid ID handling, no JS error')
 browser.close()
