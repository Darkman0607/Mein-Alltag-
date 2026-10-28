import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 DRIVE_SCOPE,DRIVE_FOLDER,validateGoogleClientId,saveGoogleClientId,getGoogleClientId,
 prepareGoogleIdentity,connectGoogleDrive,disconnectGoogleDrive,isDriveConnected,
 listDriveBackups,uploadDriveBackup,downloadDriveBackup
} from './assets/google-drive.js';
const local=new Map();globalThis.localStorage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)};
const clientId='12345678901-abc123def.apps.googleusercontent.com';
assert.equal(validateGoogleClientId(clientId),true);
assert.equal(validateGoogleClientId('anything'),false);
assert.throws(()=>saveGoogleClientId('private-secret'));
assert.equal(saveGoogleClientId(clientId),clientId);assert.equal(getGoogleClientId(),clientId);
assert.equal(isDriveConnected(),false);
let tokenRequestCount=0;
globalThis.google={accounts:{oauth2:{initTokenClient(o){assert.equal(o.client_id,clientId);assert.equal(o.scope,DRIVE_SCOPE);return {requestAccessToken(){tokenRequestCount++;o.callback({access_token:'TEST_ACCESS_TOKEN',expires_in:3600,scope:DRIVE_SCOPE});}};},hasGrantedAllScopes:(response,scope)=>response.scope===scope,revoke:(token,cb)=>{assert.equal(token,'TEST_ACCESS_TOKEN');cb();}}}};
await prepareGoogleIdentity();await connectGoogleDrive();assert.equal(isDriveConnected(),true);assert.equal(tokenRequestCount,1);
assert.equal([...local.keys()].length,1,'No OAuth access token saved in localStorage');
let folderExists=false,files=[];let savedFile='';let calls=[];
globalThis.fetch=async(url,opts={})=>{
 calls.push({url,method:opts.method||'GET',auth:opts.headers?.Authorization});
 assert.equal(opts.headers?.Authorization,'Bearer TEST_ACCESS_TOKEN');
 if(url.includes('uploadType=resumable')&&opts.method==='POST'){
  const meta=JSON.parse(opts.body);assert.equal(meta.name.startsWith('Mein_Alltag_Backup_'),true);assert.deepEqual(meta.parents,['FOLDER_ID_123456789']);
  return new Response('',{status:200,headers:{Location:'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=mock123'}});
 }
 if(url.includes('upload_id=mock123')&&opts.method==='PUT'){
  savedFile=await opts.body.text();assert.equal(JSON.parse(savedFile).format,'mein-alltag-encrypted-backup-v1');
  files.push({id:'BACKUP_ID_123456789',name:'Mein_Alltag_Backup_2026.meinalltag',size:String(savedFile.length),createdTime:'2026-10-28T17:00:00Z'});
  return Response.json({id:'BACKUP_ID_123456789',name:'Mein_Alltag_Backup_2026.meinalltag'});
 }
 if(url.startsWith('https://www.googleapis.com/drive/v3/files?')&&opts.method==='POST'){
  const data=JSON.parse(opts.body);assert.equal(data.name,DRIVE_FOLDER);folderExists=true;return Response.json({id:'FOLDER_ID_123456789',name:DRIVE_FOLDER});
 }
 if(url.includes('/drive/v3/files/BACKUP_ID_123456789?alt=media'))return Response.json(JSON.parse(savedFile));
 if(url.includes('/drive/v3/files?')&&(!opts.method||opts.method==='GET')){
  const q=new URL(url).searchParams.get('q');
  if(q.includes('application/vnd.google-apps.folder'))return Response.json({files:folderExists?[{id:'FOLDER_ID_123456789',name:DRIVE_FOLDER}]:[]});
  if(q.includes('in parents'))return Response.json({files});
 }
 throw Error('Unrecognized mock: '+(opts.method||'GET')+' '+url);
};
assert.deepEqual(await listDriveBackups(),[]);
let envelope={format:'mein-alltag-encrypted-backup-v1',version:1,ciphertext:'xxx'};
const uploaded=await uploadDriveBackup(envelope);assert.equal(uploaded.id,'BACKUP_ID_123456789');
const listed=await listDriveBackups();assert.equal(listed.length,1);assert.equal(listed[0].id,'BACKUP_ID_123456789');
const down=await downloadDriveBackup(listed[0].id);assert.deepEqual(down,envelope);
await assert.rejects(downloadDriveBackup('../files'),/Ungültige Drive-Dateikennung/);
await assert.rejects(uploadDriveBackup({format:'plain-text'}),/verschlüsselte/);
assert.equal(calls.some(c=>c.url.includes('uploadType=resumable')),true);
disconnectGoogleDrive();assert.equal(isDriveConnected(),false);
await assert.rejects(listDriveBackups(),/erneut „Google anmelden“/);
assert.equal(getGoogleClientId(),clientId);
const app=readFileSync('assets/app.js','utf8'),sw=readFileSync('sw.js','utf8'),v=JSON.parse(readFileSync('version.json'));
for(const id of ['googleLogin','googleLogout','driveSave','driveRestore','driveRefresh','driveBackupList','backupExport','backupImport','backupUnderstand'])assert(app.includes('id="'+id+'"'),id);
assert.match(app,/APP_VERSION='0.17.0'/);assert.equal(v.version,'0.17.0');assert.match(sw,/mein-alltag-v0-17-0/);assert.match(sw,/google-drive.js/);
console.log('PASS D01 Google Drive: OAuth, narrow scope, in-memory token, folder create/list, resumable upload, download, error guards, UI hooks, SW/version');
