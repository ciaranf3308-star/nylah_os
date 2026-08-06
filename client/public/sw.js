// Nylah OS SW v119 fridge rich code 69
const CACHE_NAME = "nylah-os-v119-correctness-patch";
const URLS = ["./","./index.html","./manifest.webmanifest"];
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(URLS.map(u=>new Request(u,{cache:"reload"}))).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(keys.map(k=> k!==CACHE_NAME ? caches.delete(k) : null))));
  self.clients.claim();
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
