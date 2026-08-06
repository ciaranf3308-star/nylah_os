// Nylah OS SW v115 prod restore - network-first, clear old, skipWaiting
const CACHE_NAME = "nylah-os-v115-prod-restore";
const ASSETS = ["./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:"reload"}))).catch(()=>{})));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", e=>{
  const req=e.request;
  if(req.mode==='navigate'||req.destination==='document'){
    e.respondWith(fetch(req).then(r=>r).catch(()=>caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(c=>c||fetch(req)));
});
