/* Mein Alltag F01 – vollständige manuelle, passwortverschlüsselte Datensicherung.
   File format: JSON envelope + AES-256-GCM ciphertext; KDF PBKDF2-SHA256 310000 rounds.
   No request to a cloud API is made. Raw values remain local in IndexedDB. */
import {openDatabase,DB_NAME,MODULE_STORES} from './database.js';
export const BACKUP_FORMAT='mein-alltag-encrypted-backup-v1';
const STORES=[...MODULE_STORES,'meta'];
const ITERATIONS=310000;
const bytesToBase64=bytes=>{let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);};
const base64ToBytes=value=>{if(typeof value!=='string'||value.length>400000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(value)||value.length%4!==0)throw Error('Beschädigte Backup-Daten.');const bin=atob(value),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes;};
const arrayBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
async function encode(value){
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
 if(value instanceof Blob)return {$type:'ma-blob',mime:value.type,name:value instanceof File?value.name:null,modified:value instanceof File?value.lastModified:null,data:bytesToBase64(new Uint8Array(await value.arrayBuffer()))};
 if(value instanceof Date)return {$type:'ma-date',iso:value.toISOString()};
 if(value instanceof ArrayBuffer)return {$type:'ma-arraybuffer',data:bytesToBase64(new Uint8Array(value))};
 if(ArrayBuffer.isView(value))return {$type:'ma-view',kind:value.constructor.name,data:bytesToBase64(new Uint8Array(value.buffer,value.byteOffset,value.byteLength))};
 if(Array.isArray(value))return Promise.all(value.map(encode));
 if(typeof value==='object'){
   const object={};for(const [key,item] of Object.entries(value)){if(key==='__proto__'||key==='constructor'||key==='prototype')throw Error('Unzulässiger Datenfeldname.');object[key]=await encode(item);}return object;
 }
 throw Error('Nicht unterstützter Datentyp in der Sicherung.');
}
function decode(value,depth=0){
 if(depth>80)throw Error('Backup enthält zu tief verschachtelte Daten.');
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
 if(Array.isArray(value))return value.map(x=>decode(x,depth+1));
 if(!value||typeof value!=='object')throw Error('Ungültiger Sicherungsinhalt.');
 if(value.$type==='ma-blob'){
   const bytes=base64ToBytes(value.data);const mime=typeof value.mime==='string'?value.mime:'';
   return typeof value.name==='string'?new File([bytes],value.name,{type:mime,lastModified:value.modified||Date.now()}):new Blob([bytes],{type:mime});
 }
 if(value.$type==='ma-date'){const date=new Date(value.iso);if(!Number.isFinite(date.getTime()))throw Error('Ungültiges Datum.');return date;}
 if(value.$type==='ma-arraybuffer')return arrayBuffer(base64ToBytes(value.data));
 if(value.$type==='ma-view'){
   const bytes=base64ToBytes(value.data);if(value.kind==='Uint8Array')return bytes;
   if(value.kind==='DataView')return new DataView(arrayBuffer(bytes));
   const ctor=({Int8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array})[value.kind];
   if(typeof ctor!=='function'||bytes.byteLength%ctor.BYTES_PER_ELEMENT)throw Error('Ungültiger Binärdatentyp.');return new ctor(arrayBuffer(bytes));
 }
 if(Object.hasOwn(value,'$type'))throw Error('Unbekannter Backup-Datentyp.');
 const obj={};for(const [key,item] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw Error('Unzulässiger Feldname.');Object.defineProperty(obj,key,{value:decode(item,depth+1),enumerable:true,writable:true,configurable:true});}return obj;
}
export async function captureSnapshot(){
 const db=await openDatabase();
 const entries=await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORES,'readonly');const result={};let finished=0;
   tx.onerror=()=>{};tx.onabort=()=>reject(tx.error||Error('Lesen abgebrochen.'));
   tx.oncomplete=()=>resolve(result);
   for(const store of STORES){const os=tx.objectStore(store),keys=os.getAllKeys(),values=os.getAll();let k,v;
     keys.onsuccess=()=>{k=keys.result; if(v!==undefined)result[store]=k.map((key,i)=>[key,v[i]])};
     values.onsuccess=()=>{v=values.result; if(k!==undefined)result[store]=k.map((key,i)=>[key,v[i]])};
   }
 });
 const encoded={};for(const store of STORES){encoded[store]=[];for(const [key,value] of entries[store]||[])encoded[store].push([await encode(key),await encode(value)]);}
 return {format:'mein-alltag-snapshot-v1',db:DB_NAME,stores:encoded};
}
export function validateSnapshot(data){
 if(!data||data.format!=='mein-alltag-snapshot-v1'||data.db!==DB_NAME||!data.stores||typeof data.stores!=='object')throw Error('Datei gehört nicht zur unterstützten Mein-Alltag-Datenbank.');
 if(Object.keys(data.stores).sort().join('|')!==[...STORES].sort().join('|'))throw Error('Unvollständige Sicherung: Ein oder mehrere Module fehlen.');
 const decoded={};let count=0;
 for(const store of STORES){const entries=data.stores[store];if(!Array.isArray(entries)||entries.length>100000)throw Error('Ungültige Modul-Daten.');const seen=new Set();decoded[store]=entries.map(row=>{
   if(!Array.isArray(row)||row.length!==2)throw Error('Ungültiger Datenbankeintrag.');
   const key=decode(row[0]);if(!(['string','number'].includes(typeof key))||String(key).length>1000)throw Error('Ungültiger Datenbankschlüssel.');
   const marker=typeof key+':'+key;if(seen.has(marker))throw Error('Doppelter Datensatz.');seen.add(marker);count++;
   return [key,decode(row[1])];
 });}
 return {decoded,count};
}
async function keyFromPassword(password,salt){
 if(typeof password!=='string'||password.length<12||password.length>512)throw Error('Backup-Passwort muss mindestens 12 Zeichen lang sein.');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptSnapshot(snapshot,password){
 if(!globalThis.crypto?.subtle)throw Error('Verschlüsselung braucht HTTPS oder localhost.');
 validateSnapshot(snapshot);
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await keyFromPassword(password,salt);
 const payload=new TextEncoder().encode(JSON.stringify(snapshot));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,payload);
 return {format:BACKUP_FORMAT,version:1,created:new Date().toISOString(),cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:bytesToBase64(salt),iv:bytesToBase64(iv),ciphertext:bytesToBase64(new Uint8Array(encrypted))};
}
export async function decryptBackup(envelope,password){
 if(!globalThis.crypto?.subtle)throw Error('Entschlüsselung braucht HTTPS oder localhost.');
 if(!envelope||envelope.format!==BACKUP_FORMAT||envelope.version!==1||envelope.cipher!=='AES-256-GCM'||envelope.kdf!=='PBKDF2-SHA256'||envelope.iterations!==ITERATIONS)throw Error('Unbekanntes oder ungültiges Backup-Format.');
 const salt=base64ToBytes(envelope.salt),iv=base64ToBytes(envelope.iv),ciphertext=base64ToBytes(envelope.ciphertext);
 if(salt.length!==16||iv.length!==12||ciphertext.length<16)throw Error('Unvollständige Verschlüsselungsdaten.');
 const key=await keyFromPassword(password,salt);
 let plain;
 try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ciphertext);}catch{throw Error('Passwort falsch oder Backup beschädigt.');}
 let snapshot;try{snapshot=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain));}catch{throw Error('Entschlüsselte Daten sind ungültig.');}
 validateSnapshot(snapshot);return snapshot;
}
export async function restoreSnapshot(snapshot){
 const {decoded,count}=validateSnapshot(snapshot),db=await openDatabase();
 // Single cross-store readwrite transaction: any write error rolls back ALL stores.
 await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORES,'readwrite');
   tx.oncomplete=()=>resolve();tx.onerror=()=>{};tx.onabort=()=>reject(tx.error||Error('Import abgebrochen. Bisherige Daten bleiben erhalten.'));
   try{for(const store of STORES){const os=tx.objectStore(store);os.clear();for(const [key,value] of decoded[store])os.put(value,key);}}catch(err){tx.abort();reject(err);}
 });
 return count;
}
export async function createEncryptedBackup(password){return encryptSnapshot(await captureSnapshot(),password);}
export function triggerBackupDownload(data){
 const date=new Date().toISOString().slice(0,10),name=`Mein_Alltag_Backup_${date}.meinalltag`;
 const blob=new Blob([JSON.stringify(data)],{type:'application/octet-stream'});
 const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);return name;
}
