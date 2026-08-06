 // Nylah OS SW v113 white-screen fix - network-first HTML, clear all old caches
const CACHE_NAME = "nylah-os-v113-white-fix";
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
  // network-first for navigations / html to avoid white screen from stale index
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(fetch(req).then(r=>{
      return r;
    }).catch(()=> caches.match("./index.html")));
    return;
  }
  // cache-first for assets
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
