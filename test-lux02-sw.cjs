const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const worker=fs.readFileSync(__dirname+'/sw.js','utf8');
const listeners={};const calls=[];const cache={addAll: async paths=>{calls.push({type:'cache',paths});},put:async()=>{},};
const context={
 location:{origin:'https://example.test'},URL,Promise,
 self:{addEventListener:(name,fn)=>{listeners[name]=fn},skipWaiting:async()=>{calls.push({type:'skip'})},clients:{claim:async()=>{calls.push({type:'claim'})}}},
 caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true,match:async()=>null},fetch:async()=>({ok:true,clone(){return this;},status:200})
};
vm.runInNewContext(worker,context);
assert.equal(typeof listeners.install,'function');assert.equal(typeof listeners.fetch,'function');
let done;listeners.install({waitUntil:p=>done=p});
done.then(()=>{
 const required=calls.find(x=>x.type==='cache')?.paths||[];
 assert(required.includes('./assets/app.js'));
 assert(required.includes('./modules/lagerhaus-app.js'));
 assert(required.includes('./modules/lagerhaus-quick.js'));
 assert(required.includes('./index.html'));
 assert(!required.includes('./assets/card-art/anime-frauen/001.webp'));
 assert(calls.some(x=>x.type==='skip'));
 assert(required.length>65&&required.length<120);
 console.log('PASS LUX02 PWA: install cache',required.length,'critical files; optional art does not block update');
}).catch(e=>{console.error(e);process.exitCode=1});
