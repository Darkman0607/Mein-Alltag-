/* Mein Alltag – offline shell cache; increment version when updating assets. */
const CACHE='mein-alltag-v0-11-0';
const ASSETS=[
 './','./index.html','./version.json','./manifest.webmanifest','./assets/styles.css','./assets/app.js','./assets/database.js',
 './assets/icons/app-192.png','./assets/icons/app-512.png',
 './assets/icons/lagerhaus.png','./assets/icons/frauengesundheit.png','./assets/icons/familienplaner.png','./assets/icons/putzmanager.png','./assets/icons/hausservice.png',
 './modules/lagerhaus.js','./modules/lagerhaus-app.js','./modules/lagerhaus-hierarchy.js','./modules/lagerhaus-items.js','./modules/lagerhaus-templates.js','./modules/lagerhaus-items-view.js','./modules/lagerhaus-stock.js','./modules/lagerhaus-tracking.js','./modules/lagerhaus-fach.js','./modules/lagerhaus-photos.js','./modules/frauengesundheit.js','./modules/familienplaner.js','./modules/putzmanager.js','./modules/hausservice.js'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mein-alltag-')&&k!==CACHE).map(k=>caches.delete(k)))),
 self.clients.claim()
])));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 if(e.request.mode==='navigate'){
   e.respondWith(fetch(e.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));}return response;}).catch(()=>caches.match('./index.html')));
   return;
 }
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return res;})));
});
