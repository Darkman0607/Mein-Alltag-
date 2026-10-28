"""D02: echte mobile Chromium Klicksimulation; kein Live-Google-Konto."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
src=(root/'assets/app.js').read_text()
a=src[src.index('function renderMore(){'):src.index('async function loadStorage()')]
b=src[src.index('function bindBackup(){'):src.index('export function render(){')]
js='''
const APP_VERSION='0.17.1'; const esc=s=>String(s).replace(/[&<>"']/g,'');
const section=(title,subtitle)=>`<div class="section-heading"><h1>${title}</h1><p>${subtitle}</p></div>`;
const state={client:'',connected:false,uploadFail:false,listingFail:false};
const getGoogleClientId=()=>state.client;
const validateGoogleClientId=(id)=>/^[0-9]{5,}-[a-z0-9_-]+\\.apps\\.googleusercontent\\.com$/i.test(id);
function saveGoogleClientId(id){if(!validateGoogleClientId(id))throw Error('Ungültige Client-ID');state.client=id;}
const prepareGoogleIdentity=async()=>{};
function connectGoogleDrive(){if(!state.client)throw Error('Fehlende Client-ID');state.connected=true;return Promise.resolve();}
function disconnectGoogleDrive(){state.connected=false;}
const isDriveConnected=()=>state.connected;
async function listDriveBackups(){if(state.listingFail)throw Error('Drive nicht erreichbar');return [{id:'test_backup_file_123456789',name:'Mein_Alltag_Backup_test.meinalltag',createdTime:'2026-10-28T18:00:00Z',size:'1024'}];}
async function uploadDriveBackup(){if(state.uploadFail)throw Error('Uploadfehler');return {name:'Mein_Alltag_Backup_2026.meinalltag'};}
const downloadDriveBackup=async()=>({format:'mein-alltag-encrypted-backup-v1'});
async function createEncryptedBackup(){return {format:'mein-alltag-encrypted-backup-v1'};}
const triggerBackupDownload=()=> 'lokal.meinalltag';
const decryptBackup=async()=>({});const restoreSnapshot=async()=>1;const validateSnapshot=()=>({count:1});
''' + a + b + '''
document.getElementById('view').innerHTML=renderMore();bindBackup();'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='de-AT',device_scale_factor=1)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"></head><body><main id="view"></main></body></html>')
 page.add_style_tag(content=(root/'assets/styles.css').read_text())
 page.add_script_tag(content=js)
 def toast_has(expected,kind):
  toast=page.locator('#backupFeedbackToast')
  assert toast.is_visible(), 'Toast not visible'
  assert expected in toast.inner_text(),(expected,toast.inner_text())
  assert toast.get_attribute('data-kind')==kind,toast.get_attribute('data-kind')
 # Fehler bei falscher ID, erscheint unmittelbar am Button und als Toast
 page.locator('#googleDriveSetup').evaluate('(el)=>el.open=true')
 page.locator('#googleClientId').fill('falsche_id')
 page.locator('#googleSaveClientId').click()
 toast_has('nicht gespeichert','error')
 assert 'nicht gespeichert' in page.locator('#googleSetupFeedback').inner_text()
 # Gültige ID speichern und grünes Feedback direkt am Button
 page.locator('#googleClientId').fill('769887530240-test123.apps.googleusercontent.com')
 page.locator('#googleSaveClientId').click()
 toast_has('Client-ID auf diesem Gerät gespeichert','success')
 assert 'gespeichert' in page.locator('#googleSetupFeedback').inner_text()
 assert page.locator('#googleSetupFeedback').get_attribute('data-kind')=='success'
 # Anmeldung, Ladeanzeige + erfolgreiche Rückmeldung
 page.locator('#googleLogin').click()
 page.wait_for_function("document.querySelector('#backupFeedbackToast').textContent.includes('Google angemeldet und Drive verbunden')")
 toast_has('Google angemeldet und Drive verbunden','success')
 assert page.locator('#driveSave').is_enabled()
 # Verschlüsselt speichern, Dateiname in Bestätigung
 page.locator('#backupPassword').fill('abcdefghijklmnop')
 page.locator('#backupPasswordConfirm').fill('abcdefghijklmnop')
 page.locator('#driveSave').click()
 page.wait_for_function("document.querySelector('#backupFeedbackToast').textContent.includes('Backup erfolgreich in Google Drive gespeichert')")
 toast_has('Backup erfolgreich in Google Drive gespeichert','success')
 assert '2026.meinalltag' in page.locator('#backupResult').inner_text()
 # Negativfall zeigt ohne Scrollen eine konkrete Fehlermeldung
 page.evaluate('state.uploadFail=true')
 page.locator('#backupPasswordConfirm').fill('abcdefghijklmnop')
 page.locator('#driveSave').click()
 page.wait_for_function("document.querySelector('#backupFeedbackToast').textContent.includes('Drive-Sicherung fehlgeschlagen')")
 toast_has('Drive-Sicherung fehlgeschlagen','error')
 # Restore UI stays gated by checkbox
 assert not page.locator('#driveRestore').is_enabled()
 # Abmelden mit Toast
 page.locator('#googleLogout').click()
 toast_has('Von Google Drive abgemeldet','success')
 assert not page.locator('#driveSave').is_enabled()
 assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'Horizontal overflow'
 assert not errors,errors
 page.screenshot(path=str(root/'D02_mobile_test.png'),full_page=False)
 print('PASS D02 Chromium 390px: invalid client, saved client, login, upload, failed upload, logout, toast, inline message, no JS errors')
 browser.close()
