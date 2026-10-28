/* Mein Alltag D01: Drive-Sicherung per Google Identity Services / Drive v3.
 * OAuth client ID is public configuration, never an OAuth client secret.
 * Access tokens only live in memory. Scope drive.file sees only files created/opened by this app.
 */
export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.file';
export const DRIVE_FOLDER='Mein Alltag Backups';
const CLIENT_KEY='mein-alltag-google-oauth-client-id';
const DRIVE_API='https://www.googleapis.com/drive/v3/files';
const UPLOAD_API='https://www.googleapis.com/upload/drive/v3/files';
const MAX_BACKUP=180*1024*1024;
const OAUTH_CLIENT_RE=/^[0-9]{5,}-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i;
let scriptPromise,tokenClient,tokenClientId='',accessToken='',expiresAt=0,loginPending=null;

export function validateGoogleClientId(value){return OAUTH_CLIENT_RE.test(String(value||'').trim());}
export function getGoogleClientId(){try{return localStorage.getItem(CLIENT_KEY)||'';}catch{return '';}}
export function saveGoogleClientId(value){
 const id=String(value||'').trim();if(id&&!validateGoogleClientId(id))throw Error('Ungültige OAuth-Client-ID. Sie muss mit .apps.googleusercontent.com enden.');
 if(id!==getGoogleClientId())disconnectGoogleDrive();
 try{if(id)localStorage.setItem(CLIENT_KEY,id);else localStorage.removeItem(CLIENT_KEY);}catch{throw Error('Google-Konfiguration konnte auf diesem Gerät nicht gespeichert werden.');}
 return id;
}
export function isDriveConnected(){return Boolean(accessToken&&expiresAt>Date.now()+30000);}
export function disconnectGoogleDrive(){
 const previous=accessToken;accessToken='';expiresAt=0;tokenClient=null;tokenClientId='';
 if(previous&&globalThis.google?.accounts?.oauth2?.revoke)google.accounts.oauth2.revoke(previous,()=>{});
}
export function prepareGoogleIdentity(){
 if(globalThis.google?.accounts?.oauth2?.initTokenClient)return Promise.resolve();
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  script.onload=()=>globalThis.google?.accounts?.oauth2?.initTokenClient?resolve():reject(Error('Google-Anmeldedienst nicht verfügbar.'));
  script.onerror=()=>reject(Error('Google-Anmeldedienst konnte nicht geladen werden. Prüfe Internetverbindung und Browser-Sperren.'));
  document.head.append(script);
 }).catch(e=>{scriptPromise=null;throw e;});
 return scriptPromise;
}
/** Must be called directly by a click handler after prepareGoogleIdentity has completed. */
export function connectGoogleDrive(){
 const id=getGoogleClientId();
 if(!validateGoogleClientId(id))throw Error('Zuerst unter „Google Drive einrichten“ eine gültige OAuth-Client-ID speichern.');
 if(!globalThis.google?.accounts?.oauth2?.initTokenClient)throw Error('Google-Anmeldung lädt noch. Bitte erneut auf „Google anmelden“ tippen.');
 if(loginPending)throw Error('Google-Anmeldung läuft bereits.');
 if(!tokenClient||tokenClientId!==id){
  tokenClientId=id;
  tokenClient=google.accounts.oauth2.initTokenClient({
   client_id:id,scope:DRIVE_SCOPE,
   callback:reply=>{
    const pending=loginPending;loginPending=null;
    if(!pending)return;
    if(reply?.error||!reply?.access_token){pending.reject(Error('Google-Anmeldung abgebrochen oder Berechtigung nicht erteilt.'));return;}
    if(!globalThis.google.accounts.oauth2.hasGrantedAllScopes?.(reply,DRIVE_SCOPE)){
     pending.reject(Error('Drive-Dateizugriff wurde nicht freigegeben.'));return;
    }
    accessToken=reply.access_token;
    expiresAt=Date.now()+Math.max(0,Number(reply.expires_in)||3500)*1000;
    pending.resolve();
   },
   error_callback:reply=>{
    const pending=loginPending;loginPending=null;
    pending?.reject(Error(reply?.type==='popup_closed'?'Google-Anmeldefenster geschlossen.':'Google-Anmeldefenster konnte nicht geöffnet werden. Popup-Sperre prüfen.'));
   }
  });
 }
 return new Promise((resolve,reject)=>{
  loginPending={resolve,reject};
  try{tokenClient.requestAccessToken({prompt:'select_account'});}catch(e){loginPending=null;reject(Error('Google-Anmeldung konnte nicht starten: '+e.message));}
 });
}
async function requestDrive(url,options={}){
 if(!isDriveConnected())throw Error('Google-Verbindung abgelaufen. Bitte erneut „Google anmelden“.');
 if(!url.startsWith('https://www.googleapis.com/'))throw Error('Ungültige Google-API-Adresse.');
 let response;
 try{response=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${accessToken}`},cache:'no-store'});}catch{
  throw Error('Keine Verbindung zu Google Drive. Internetzugang prüfen.');
 }
 if(!response.ok){
  if(response.status===401){accessToken='';expiresAt=0;throw Error('Google-Zugriff abgelaufen. Bitte erneut anmelden.');}
  if(response.status===403)throw Error('Drive-Zugriff verweigert (403). Google Drive API / Freigabe im Google-Cloud-Projekt prüfen.');
  if(response.status===404)throw Error('Drive-Datei wurde nicht gefunden oder ist nicht mehr verfügbar.');
  if(response.status===413)throw Error('Backup ist für diese Drive-Anfrage zu groß.');
  throw Error(`Google Drive meldet HTTP ${response.status}.`);
 }
 return response;
}
async function apiJSON(url,options){return (await requestDrive(url,options)).json();}
function queryURL(params){const url=new URL(DRIVE_API);for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));return url.toString();}
async function findBackupFolder(create){
 const q=`name = '${DRIVE_FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
 const data=await apiJSON(queryURL({q,fields:'nextPageToken,files(id,name)',pageSize:50}));
 const folder=(data.files||[]).find(x=>x.name===DRIVE_FOLDER);
 if(folder)return folder.id;
 if(!create)return null;
 const created=await apiJSON(DRIVE_API+'?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:DRIVE_FOLDER,mimeType:'application/vnd.google-apps.folder'})});
 if(!created?.id)throw Error('Backup-Ordner wurde nicht angelegt.');
 return created.id;
}
export async function listDriveBackups(){
 const folder=await findBackupFolder(false);if(!folder)return [];
 const files=[];let pageToken='';
 for(let i=0;i<10;i++){
  const q=`'${folder}' in parents and trashed = false`;
  const params={q,fields:'nextPageToken,files(id,name,createdTime,size,mimeType)',pageSize:100,orderBy:'createdTime desc'};
  if(pageToken)params.pageToken=pageToken;
  const result=await apiJSON(queryURL(params));
  files.push(...(result.files||[]).filter(file=>typeof file.name==='string'&&file.name.startsWith('Mein_Alltag_Backup_')&&file.name.endsWith('.meinalltag')&&/^[a-zA-Z0-9_-]{10,200}$/.test(file.id)));
  pageToken=result.nextPageToken||'';if(!pageToken)break;
 }
 return files.slice(0,100);
}
export async function uploadDriveBackup(envelope){
 if(!envelope||envelope.format!=='mein-alltag-encrypted-backup-v1')throw Error('Nur verschlüsselte Mein-Alltag-Sicherungen können hochgeladen werden.');
 const content=new Blob([JSON.stringify(envelope)],{type:'application/octet-stream'});
 if(content.size>MAX_BACKUP)throw Error('Backup überschreitet die maximale Größe von 180 MB.');
 const folder=await findBackupFolder(true);
 const name=`Mein_Alltag_Backup_${new Date().toISOString().replace(/[:.]/g,'-')}.meinalltag`;
 // Resumable uploads also support larger photo/PDF backup files.
 const start=await requestDrive(UPLOAD_API+'?uploadType=resumable&fields=id,name,createdTime,size',{
  method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/octet-stream','X-Upload-Content-Length':String(content.size)},
  body:JSON.stringify({name,parents:[folder],mimeType:'application/octet-stream',appProperties:{meinAlltagBackup:'encrypted-v1'}})
 });
 const session=start.headers.get('Location');
 if(!session||!session.startsWith(UPLOAD_API+'?'))throw Error('Google Drive hat keine gültige Upload-Adresse zurückgegeben.');
 const result=await apiJSON(session,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:content});
 if(!result?.id)throw Error('Google Drive hat den Upload nicht bestätigt.');
 return {id:result.id,name:result.name||name,size:content.size};
}
export async function downloadDriveBackup(fileId){
 if(!/^[a-zA-Z0-9_-]{10,200}$/.test(String(fileId)))throw Error('Ungültige Drive-Dateikennung.');
 const response=await requestDrive(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`);
 if(Number(response.headers.get('Content-Length'))>MAX_BACKUP)throw Error('Sicherung ist größer als 180 MB.');
 const data=await response.blob();
 if(data.size>MAX_BACKUP)throw Error('Sicherung ist größer als 180 MB.');
 try{return JSON.parse(await data.text());}catch{throw Error('Drive-Datei enthält kein gültiges Backup-JSON.');}
}
