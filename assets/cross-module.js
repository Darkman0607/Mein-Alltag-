/** Atomic bridge for deliberately confirmed actions spanning two isolated module stores.
 * No implicit cross-module reads or writes. All read/validation/write work occurs inside
 * one IndexedDB readwrite transaction; failed stock bookings cannot finish a cleaning.
 */
import {openDatabase,MODULE_STORES,REWARD_STORES} from './database.js';
export async function atomicModuleChange(readKeys, change){
 if(!Array.isArray(readKeys)||!readKeys.length||typeof change!=='function')throw Error('Ungültige Transaktion.');
 const ids=new Set();
 for(const pair of readKeys){
  if(!Array.isArray(pair)||pair.length!==2||![...MODULE_STORES,...REWARD_STORES].includes(pair[0])||typeof pair[1]!=='string'||!pair[1])throw Error('Ungültiger Modulschlüssel.');
  const key=pair[0]+'\0'+pair[1];if(ids.has(key))throw Error('Doppelter Transaktionsschlüssel.');ids.add(key);
 }
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction([...new Set(readKeys.map(pair=>pair[0]))],'readwrite');
  const values=Object.create(null);let pending=readKeys.length,returned,callbackError;
  tx.oncomplete=()=>resolve(returned);
  tx.onerror=()=>{};
  tx.onabort=()=>reject(callbackError||tx.error||Error('Gemeinsame Buchung wurde abgebrochen.'));
  for(const [store,key] of readKeys){
   const request=tx.objectStore(store).get(key);
   request.onsuccess=()=>{
    (values[store]??=Object.create(null))[key]=request.result??null;
    if(--pending!==0)return;
    try{
     const result=change(values);
     if(!result||!Array.isArray(result.writes))throw Error('Ungültige gemeinsame Buchung.');
     for(const [name,writeKey,data] of result.writes){
      if(!ids.has(name+'\0'+writeKey))throw Error('Schreibziel nicht freigegeben.');
      tx.objectStore(name).put(data,writeKey);
     }
     returned=result.result;
    }catch(err){callbackError=err;tx.abort();}
   };
  }
 });
}
