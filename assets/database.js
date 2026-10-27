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
