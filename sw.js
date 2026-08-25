const CACHE_PREFIX='ssc-shell-';

// SSC development mode.
// Offline/PWA caching is intentionally disabled while the app changes rapidly.
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

// Network-only: never serve or write SSC assets from Cache Storage.
// cache:'no-store' also bypasses the browser HTTP cache for same-origin app assets.
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  event.respondWith(fetch(request,{cache:'no-store'}));
});
