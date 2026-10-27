/** Mein Alltag V0: strictly isolated IndexedDB stores for independent modules. */
export const DB_NAME = 'mein-alltag-v0';
export const DB_VERSION = 1;
export const MODULE_STORES = Object.freeze(['lagerhaus','frauengesundheit','familienplaner','putzmanager','hausservice']);
const META_STORE = 'meta';
let dbPromise;

export function openDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB wird nicht unterstützt.'));
  if (!dbPromise) dbPromise = new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded = () => {
      const db=request.result;
      for(const store of [...MODULE_STORES,META_STORE]) if(!db.objectStoreNames.contains(store)) db.createObjectStore(store);
    };
    request.onsuccess = () => {
      const db=request.result;
      db.onversionchange=()=>{db.close();dbPromise=undefined;};
      resolve(db);
    };
    request.onerror=()=>reject(request.error || new Error('Datenbankfehler'));
    request.onblocked=()=>reject(new Error('Datenbank durch anderes Fenster blockiert.'));
  }).catch(err=>{dbPromise=undefined;throw err;});
  return dbPromise;
}
function assertStore(store){if(!MODULE_STORES.includes(store)) throw new Error('Ungültiger Modul-Speicher');}
export async function getModuleValue(store,key) {
  assertStore(store);
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(store,'readonly').objectStore(store).get(key);
    req.onsuccess=()=>resolve(req.result ?? null);
    req.onerror=()=>reject(req.error);
  });
}
export async function setModuleValue(store,key,value) {
  assertStore(store);
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite');
    tx.objectStore(store).put(value,key);
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error || new Error('Speichern abgebrochen'));
  });
}
/** Persist several values in a single IndexedDB transaction (L04 hierarchy). */
export async function setModuleValues(store,entries) {
  assertStore(store);
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite');
    const objectStore=tx.objectStore(store);
    for(const [key,value] of entries)objectStore.put(value,key);
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error||new Error('Datenbankfehler'));
    tx.onabort=()=>reject(tx.error||new Error('Speichern abgebrochen'));
  });
}
export async function getStoreNames() {
  const db=await openDatabase();
  return [...db.objectStoreNames];
}
export async function getModuleCount(store){
  assertStore(store);
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(store,'readonly').objectStore(store).count();
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
/** L07: read/validate/write multiple keys in ONE readwrite transaction.
 * Callback must be synchronous; avoiding a read-before-write race across tabs. */
export async function mutateModuleValues(store,keys,change){
 assertStore(store);
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,'readwrite');
  const object=tx.objectStore(store);
  const values=Object.create(null);
  let pending=keys.length,output,callbackError;
  tx.oncomplete=()=>resolve(output);
  tx.onabort=()=>reject(callbackError||tx.error||new Error('Buchung abgebrochen'));
  tx.onerror=()=>{}; // onabort handles the original transaction error
  for(const key of keys){
   const req=object.get(key);
   req.onsuccess=()=>{
    values[key]=req.result??null;
    if(--pending!==0)return;
    try{
     output=change(values);
     if(!Array.isArray(output))throw new Error('Ungültiger Buchungsauftrag.');
     for(const [writeKey,data] of output)object.put(data,writeKey);
    }catch(err){callbackError=err;tx.abort();}
   };
  }
 });
}

/** L10: atomic photo/metadata changes including physical deletion of photo payload keys.
 * Callbacks are synchronous and run after all requested keys have been read. */
export async function mutateModuleValuesWithDeletes(store,keys,change){
 assertStore(store);
 if(!Array.isArray(keys)||keys.length===0||new Set(keys).size!==keys.length)throw new Error('Ungültige Transaktionsschlüssel.');
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,'readwrite'),object=tx.objectStore(store);
  const values=Object.create(null);let pending=keys.length,output,callbackError;
  tx.oncomplete=()=>resolve(output);
  tx.onerror=()=>{};
  tx.onabort=()=>reject(callbackError||tx.error||new Error('Foto-Speicherung abgebrochen.'));
  for(const key of keys){
   const req=object.get(key);
   req.onsuccess=()=>{
    values[key]=req.result??null;if(--pending!==0)return;
    try{
     output=change(values);
     if(!output||!Array.isArray(output.write)||!Array.isArray(output.remove||[]))throw new Error('Ungültige Speicheraktion.');
     const removed=new Set(output.remove||[]);
     if(output.write.some(([k])=>removed.has(k)))throw new Error('Derselbe Schlüssel kann nicht gleichzeitig gelöscht und geschrieben werden.');
     for(const [key,value] of output.write)object.put(value,key);
     for(const key of removed)object.delete(key);
    }catch(e){callbackError=e;tx.abort();}
   };
  }
 });
}
