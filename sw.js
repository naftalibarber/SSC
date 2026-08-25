const CACHE_VERSION='ssc-shell-20260825-2';
const CACHE_PREFIX='ssc-shell-';
const PRECACHE=[
  './',
  './index.html',
  './ssc-logo.png',
  './manifest.webmanifest',
  './code/js/app.js',
  './code/js/import-export.js',
  './code/js/advanced-features.js',
  './code/js/scramble-generators.js',
  './code/js/cube2x2.js',
  './code/js/scramble2x2.js',
  './code/js/cube-preview.js',
  './code/js/wca-previews.js',
  './code/js/preview-manager.js',
  './code/js/preview-integration.js',
  './code/js/preview-visibility-hotfix.js',
  './code/js/preview-sizing.js',
  './code/js/scramble-history.js',
  './code/js/settings.js',
  './code/js/hebrew-i18n-fixes.js',
  './code/css/styles.css',
  './code/css/training-upgrades.css',
  './code/css/advanced-features.css',
  './code/css/cube-preview.css',
  './code/css/wca-previews.css',
  './code/css/event-selector.css',
  './code/css/competition-mode.css',
  './code/css/layout-fix.css'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_VERSION);
    await Promise.allSettled(PRECACHE.map(async url=>{
      const response=await fetch(url,{cache:'reload'});
      if(response.ok)await cache.put(url,response);
    }));
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_VERSION).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(request,{cache:'no-store'});
        const cache=await caches.open(CACHE_VERSION);
        if(fresh.ok)cache.put('./index.html',fresh.clone());
        return fresh;
      }catch{
        return (await caches.match(request))||(await caches.match('./index.html'))||(await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_VERSION);
    try{
      const fresh=await fetch(request,{cache:'no-store'});
      if(fresh.ok)cache.put(request,fresh.clone());
      return fresh;
    }catch{
      const cached=await cache.match(request,{ignoreSearch:true});
      if(cached)return cached;
      throw new Error('Offline and resource is not cached');
    }
  })());
});
