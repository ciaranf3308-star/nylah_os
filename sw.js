 // Nylah OS SW v114 white-fix tour - network-first HTML, clear all old caches, skipWaiting
const CACHE_NAME = "nylah-os-v114-white-fix-tour";
const ASSETS = ["./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:"reload"}))).catch(()=>{})));
});
self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.map(k=> k!==CACHE_NAME ? caches.delete(k) : null)))
    .then(()=> self.clients.claim())
  );
});
self.addEventListener("fetch", e=>{
  const req = e.request;
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(fetch(req).then(r=> r).catch(()=> caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(cached=> cached || fetch(req)));
});
self.addEventListener("push", e=>{
  const data = e.data ? e.data.json() : {};
  const title = data.title || "Nylah OS";
  const body = data.body || "New chore for you";
  e.waitUntil(self.registration.showNotification(title, {body, vibrate:[200,100,200], data:{url:data.url||"./"}}));
});
self.addEventListener("notificationclick", e=>{
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || "./"));
});
