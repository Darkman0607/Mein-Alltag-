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
const {getModuleValue,setModuleValue}=await import('./assets/database.js');
const {roomTaskGroups,loadCleaningState,markGroupNow,markStepNow,startCleaning,setTaskDone,finishCleaning}=await import('./modules/putzmanager-cleaning.js');
const {roomScheduleSummary,groupStatus}=await import('./modules/putzmanager-schedule.js');
const room={id:'k-hf01',name:'Küche',type:'kueche',objects:[]};
const other={id:'b-hf01',name:'Bad',type:'bad',objects:[]};
const groups=roomTaskGroups(room),dish=groups.find(g=>g.id==='quick:geschirrspueler');
assert.equal(dish.steps.length,1,'Aus-/Einräumen ist eine einzelne tägliche Handlung');
assert.equal(dish.steps[0].title,'Geschirr einräumen oder ausräumen');
assert(!groups.some(g=>g.type==='geschirrspuelerpflege'),'Optionale Pflege wird nicht automatisch fällig');
assert(roomTaskGroups(room,['geschirrspueler','geschirrspuelerpflege']).some(g=>g.type==='geschirrspuelerpflege'));
const baseline=roomScheduleSummary(room,groups,[],{});
assert.equal(baseline.due,groups.length);
const old={roomId:room.id,endedAt:new Date().toISOString(),doneCount:11,totalCount:21};
await setModuleValue('putzmanager','cleaning.sessions.v1',{active:{},history:[old]});
assert.equal(roomScheduleSummary(room,groups,[old],{}).due,groups.length,'Legacy totals are not proof of completed items');
// No session, no room finish, no timer: one tap must persist immediately.
await markGroupNow(room.id,dish,true);
let state=await loadCleaningState();
assert.equal(state.active[room.id],undefined,'No running session is required');
assert.equal(state.taskEvents.length,1);
assert.equal(state.taskEvents[0].groupName,'Geschirrspüler');
assert.equal(state.history.length,1,'Historical receipts are unchanged');
let summary=roomScheduleSummary(room,groups,state.history,{},new Date(),state.taskEvents);
assert.equal(summary.doneToday,1,'Dashboard count rises immediately');
assert.equal(summary.due,groups.length-1,'Due count decreases immediately');
await markGroupNow(room.id,dish,true);
assert.equal((await loadCleaningState()).taskEvents.length,1,'Repeat tap does not create duplicate history');
state=await loadCleaningState();
assert.equal(groupStatus(state.history,room.id,dish,undefined,new Date(),state.taskEvents).state,'done','Reload retains completion');
const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(12,0,0,0);
assert.equal(groupStatus(state.history,room.id,dish,undefined,tomorrow,state.taskEvents).state,'due','Daily duty becomes due tomorrow');
const dayAfter=new Date(tomorrow);dayAfter.setDate(dayAfter.getDate()+1);
assert.equal(groupStatus(state.history,room.id,dish,undefined,dayAfter,state.taskEvents).state,'overdue');
await markGroupNow(room.id,dish,false);
state=await loadCleaningState();
assert.equal(state.taskEvents.length,0,'Undo removes only current-day quick event');
summary=roomScheduleSummary(room,groups,state.history,{},new Date(),state.taskEvents);
assert.equal(summary.due,groups.length);
// Single substep also triggers permanent completion, without any room session.
await markStepNow(room.id,dish,dish.steps[0].id,true);
state=await loadCleaningState();assert.equal(state.taskEvents.length,1);
await markStepNow(room.id,dish,dish.steps[0].id,false);
state=await loadCleaningState();assert.equal(state.taskEvents.length,0);
// Partial detailed tasks are stored; completing all creates one history event.
const floor=groups.find(g=>g.id==='area:floor');
await markStepNow(room.id,floor,floor.steps[0].id,true);
state=await loadCleaningState();
assert.equal(state.quickSteps[room.id][floor.id].stepIds.length,1);
assert.equal(state.taskEvents.length,0);
await markStepNow(room.id,floor,floor.steps[1].id,true);
await markStepNow(room.id,floor,floor.steps[2].id,true);
state=await loadCleaningState();assert.equal(state.taskEvents.length,1);
assert.equal(state.taskEvents[0].groupId,'area:floor');
await markStepNow(room.id,floor,floor.steps[1].id,false);
state=await loadCleaningState();
assert.equal(state.taskEvents.length,0);
assert.deepEqual(new Set(state.quickSteps[room.id][floor.id].stepIds),new Set([floor.steps[0].id,floor.steps[2].id]),'Undo preserves the other two checks');
// Room separation and no automatic stock issue.
await markGroupNow(other.id,roomTaskGroups(other).find(g=>g.id==='area:floor'),true);
state=await loadCleaningState();
assert.equal(state.taskEvents[0].roomId,other.id);
assert.equal((await getModuleValue('lagerhaus','stock.movements.v1'))?.length||0,0);
// In-session checkbox immediately writes an event, before finalization.
await startCleaning(room);
await setTaskDone(room.id,dish.steps[0].id,true);
state=await loadCleaningState();
assert(state.taskEvents.some(x=>x.roomId===room.id&&x.groupId===dish.id));
assert(state.active[room.id]);
await markGroupNow(room.id,dish,false);
state=await loadCleaningState();
assert(!state.taskEvents.some(x=>x.roomId===room.id&&x.groupId===dish.id));
console.log('PASS P05 HF01: instant standalone and in-session ticks, persistence, tomorrow due, undo, partial steps, no double counting, no warehouse booking, legacy history preserved');
