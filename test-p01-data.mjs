import assert from 'node:assert/strict';
/** Fake transactions preserve read/commit/rollback semantics, including multi-store atomic changes. */
let db;
globalThis.indexedDB={open(){
 const req={result:null,error:null};
 queueMicrotask(()=>{
  if(!db){
   const stores=new Map();
   db={objectStoreNames:{contains:name=>stores.has(name)},createObjectStore:name=>stores.set(name,new Map()),transaction(names,mode){
    const accepted=Array.isArray(names)?names:[names],shadow=new Map(accepted.map(n=>[n,new Map(stores.get(n))]));
    if(accepted.some(x=>!stores.has(x)))throw Error('Store does not exist');
    let done=false,pending=0,finishScheduled=false;
    const tx={error:null,oncomplete:null,onerror:null,onabort:null};
    function finish(){if(finishScheduled)return;finishScheduled=true;setTimeout(()=>{finishScheduled=false;if(done||pending>0)return;done=true;for(const [n,items] of shadow)stores.set(n,items);tx.oncomplete?.();},0);}
    function request(fn){pending++;const req={result:undefined,error:null,onsuccess:null,onerror:null};queueMicrotask(()=>{
     if(done)return;
     try{req.result=fn();req.onsuccess?.({target:req});}catch(err){req.error=err;tx.error=err;tx.abort();req.onerror?.({target:req});}
     finally{pending--;finish();}
    });return req;}
    tx.objectStore=n=>{
     if(!shadow.has(n))throw Error('Undeclared store');const s=shadow.get(n);
     return {get:k=>request(()=>structuredClone(s.get(k))),put:(v,k)=>request(()=>{s.set(k,structuredClone(v));return k;}),delete:k=>request(()=>s.delete(k)),count:()=>request(()=>s.size)};
    };
    tx.abort=()=>{if(done)return;done=true;queueMicrotask(()=>tx.onabort?.());};
    return tx;
   }};
   req.result=db;req.onupgradeneeded?.();
  }else req.result=db;
  req.onsuccess?.();
 });return req;
}};
const {getModuleValue,setModuleValues,mutateModuleValues}=await import('./assets/database.js');
const {saveRoom,savePrivate3DScene,listRooms}=await import('./modules/putzmanager-data.js');
const {createKitchenTemplate}=await import('./modules/putzmanager-room3d.js');
const {ITEM_KEY}=await import('./modules/lagerhaus-items.js');
const {MOVEMENT_KEY}=await import('./modules/lagerhaus-stock.js');
const {roomTaskGroups,taskCount,loadCleaningState,loadMaterialPresets,saveMaterialPreset,clearMaterialPreset,startCleaning,setTimer,setTaskDone,addMaterial,removeMaterial,materialSources,sessionElapsed,cancelCleaning,finishCleaning,duration}=await import('./modules/putzmanager-cleaning.js');
const roomId=await saveRoom({name:'Küche',type:'kueche'});
await savePrivate3DScene(roomId,createKitchenTemplate());
const room=(await listRooms())[0],groups=roomTaskGroups(room);
assert.equal(room.sketch3d.objects.length,15);
assert.equal(groups.length,19,'15 objects + floor + window + door + missing default kitchen fixture');
assert(groups.some(g=>g.name==='Boden'));
assert(groups.find(g=>g.name.includes('Geschirrspüler')).steps.some(t=>t.title.includes('Sieb')));
const originalItems=[
 {id:'gloves',code:'A-0001',name:'Nitrilhandschuhe',type:'verbrauch',unit:'stk',pairCounting:'auto',stockLocations:[{locationId:'',quantity:14}],quantity:14,locationId:'',minimumStock:4,packSize:100},
 {id:'cleaner',code:'A-0002',name:'Reiniger',type:'verbrauch',unit:'ml',stockLocations:[{locationId:'',quantity:500}],quantity:500,locationId:'',minimumStock:100,packSize:500},
 {id:'tool',code:'A-0003',name:'Besen',type:'geraet',unit:'stk',stockLocations:[{locationId:'',quantity:1}],quantity:1,locationId:'',minimumStock:0,packSize:1},
 {id:'container',code:'A-0004',name:'Spray',type:'verbrauch',unit:'ml',stockLocations:[{locationId:'',quantity:200}],quantity:200,locationId:'',minimumStock:10,packSize:500,containers:[{id:'b1',code:'A-0004-B001',label:'Angebrochene Flasche',locationId:'',capacity:500,remaining:200,openedAt:'2026-11-01T10:00:00.000Z'}]}
];
await setModuleValues('lagerhaus',[[ITEM_KEY,originalItems],['rooms.v1',[]],['areas.v1',[]],[MOVEMENT_KEY,[]]]);
const sources=materialSources(originalItems,[],[]);
assert(!sources.some(x=>x.itemId==='tool'),'reusable tools must not be deducted');
assert.equal(sources.find(x=>x.itemId==='container').containerId,'b1','tracked bottle available');
await startCleaning(room);
await assert.rejects(()=>startCleaning(room),/bereits/);
assert.equal((await loadCleaningState()).active[roomId].status,'running');
const task=groups[0].steps[0].id;
await setTaskDone(roomId,task,true);
await setTimer(roomId,'pause');
let state=await loadCleaningState();assert.equal(state.active[roomId].status,'paused');
assert(state.active[roomId].doneTaskIds.includes(task));
await setTimer(roomId,'resume');
await addMaterial(roomId,sources.find(x=>x.itemId==='gloves'),2,'pairs');
await addMaterial(roomId,sources.find(x=>x.itemId==='container'),25,'units');
state=await loadCleaningState();assert.equal(state.active[roomId].materials.length,2);
await saveMaterialPreset(roomId);assert.equal((await loadMaterialPresets())[roomId].length,2);
assert.equal((await getModuleValue('lagerhaus',ITEM_KEY))[0].quantity,14,'no stock deduction when only reserved');
assert(sessionElapsed(state.active[roomId])>=0);
assert(duration(3661000)==='01:01:01');
const result=await finishCleaning(roomId);
assert.equal(result.doneCount,1);assert.equal(result.totalCount,taskCount(groups));
let all=await getModuleValue('lagerhaus',ITEM_KEY);
assert.equal(all.find(x=>x.id==='gloves').quantity,10,'2 pairs = 4 individual gloves');
assert.equal(all.find(x=>x.id==='container').quantity,175);
assert.equal(all.find(x=>x.id==='container').containers[0].remaining,175);
assert.equal(all.find(x=>x.id==='tool').quantity,1);
const events=await getModuleValue('lagerhaus',MOVEMENT_KEY);
assert.equal(events.length,2);assert(events.every(e=>e.context==='putzmanager'&&e.cleaningId===result.id));
state=await loadCleaningState();assert.equal(state.active[roomId],undefined);assert.equal(state.history.length,1);
await assert.rejects(()=>finishCleaning(roomId),/bereits/);
assert.equal((await getModuleValue('lagerhaus',MOVEMENT_KEY)).length,2,'no double booking');
// Forced all-or-nothing failure: one valid line then second overdraws stock.
await startCleaning(room);
await addMaterial(roomId,sources.find(x=>x.itemId==='gloves'),1,'pairs');
await addMaterial(roomId,{...sources.find(x=>x.itemId==='cleaner'),available:800},800,'units');
await assert.rejects(()=>finishCleaning(roomId),/Nicht genügend/);
state=await loadCleaningState();assert(state.active[roomId]);assert.equal(state.history.length,1);
assert.equal((await getModuleValue('lagerhaus',ITEM_KEY)).find(x=>x.id==='gloves').quantity,10);
assert.equal((await getModuleValue('lagerhaus',MOVEMENT_KEY)).length,2);
await cancelCleaning(roomId);
await startCleaning(room);
assert.equal((await loadCleaningState()).active[roomId].materials.length,2,'room preset is automatically loaded');
await clearMaterialPreset(roomId);
await setTaskDone(roomId,task,true);
await cancelCleaning(roomId);
assert.equal((await loadCleaningState()).active[roomId],undefined);
assert.equal((await getModuleValue('lagerhaus',MOVEMENT_KEY)).length,2);
assert.equal((await loadMaterialPresets())[roomId],undefined);
console.log('PASS P01 data: floor and 3D tasks, start/pause/resume, persisted checkmarks, tracked bottle consumption, glove pairs, immutable devices, atomic rollback, idempotent finalization, discard');
