const CACHE_PREFIX='ssc-shell-';

// Development mode: keep the registered service worker harmless.
// It deliberately has no fetch handler, so every request goes directly
// to the network/browser HTTP cache instead of SSC's PWA cache.
self.addEventListener('install',()=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(
      names
        .filter(name=>name.startsWith(CACHE_PREFIX))
        .map(name=>caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

// Intentionally no fetch event listener while SSC is under active development.
