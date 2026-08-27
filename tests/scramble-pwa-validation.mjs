import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const index=fs.readFileSync('index.html','utf8');
const swSource=fs.readFileSync('sw.js','utf8');

const positions={
  legacy:index.indexOf('code/js/scramble-generators.js'),
  provider:index.indexOf('code/js/scramble-provider.js'),
  training:index.indexOf('code/js/training.js'),
  bridge:index.indexOf('code/js/scramble-production-bridge.js'),
  app:index.indexOf('code/js/app.js')
};
for(const [name,position] of Object.entries(positions))assert.ok(position>=0,`${name} is missing from index.html`);
assert.ok(positions.legacy<positions.provider&&positions.provider<positions.training&&positions.training<positions.bridge&&positions.bridge<positions.app,'Scramble production script order is invalid.');
assert.doesNotMatch(index,/scramble-provider-legacy-fallback\.js/,'Phase 3 isolated fallback adapter must not be loaded by production.');

const handlers={};
const deletedCaches=[];
const networkFetches=[];
let skipWaitingCalls=0,claimCalls=0;
const context={
  URL,
  console,
  self:{
    location:{origin:'https://ssc.test'},
    addEventListener(type,handler){handlers[type]=handler;},
    skipWaiting(){skipWaitingCalls+=1;},
    clients:{claim:async()=>{claimCalls+=1;}}
  },
  caches:{
    async keys(){return['ssc-shell-old','third-party-cache'];},
    async delete(name){deletedCaches.push(name);return true;}
  },
  fetch:async(request,options)=>{networkFetches.push({url:request.url,options});return{ok:true,url:request.url};}
};
vm.createContext(context);vm.runInContext(swSource,context,{filename:'sw.js'});
assert.ok(handlers.install&&handlers.activate&&handlers.fetch,'Service Worker handlers are incomplete.');

handlers.install({});assert.equal(skipWaitingCalls,1,'Service Worker install did not skip waiting.');
let activatePromise=null;handlers.activate({waitUntil(promise){activatePromise=promise;}});await activatePromise;
assert.deepEqual(deletedCaches,['ssc-shell-old'],'Service Worker must only clear SSC shell caches.');assert.equal(claimCalls,1,'Service Worker did not claim clients.');

async function networkOnlyAsset(path){
  let responsePromise=null;
  const request={method:'GET',url:`https://ssc.test/${path}`};
  handlers.fetch({request,respondWith(promise){responsePromise=promise;}});
  assert.ok(responsePromise,`${path}: Service Worker did not respond`);await responsePromise;
  const call=networkFetches.at(-1);assert.equal(call.url,request.url);assert.equal(call.options?.cache,'no-store',`${path}: not network-only/no-store`);
}

// First load + reload requests for the new integration assets both bypass Cache Storage.
await networkOnlyAsset('code/js/scramble-provider.js');
await networkOnlyAsset('code/js/scramble-production-bridge.js');
await networkOnlyAsset('code/js/scramble-provider.js');
await networkOnlyAsset('code/js/scramble-production-bridge.js');
assert.equal(networkFetches.length,4);

// Current development SW intentionally has no cached reload path; verify it cannot serve stale app assets.
assert.doesNotMatch(swSource,/caches\.match|cache\.match|cache\.addAll|caches\.open/,'Development Service Worker unexpectedly serves/writes cached shell assets.');
assert.match(swSource,/cache:'no-store'/);

console.log('\n[SSC Scramble Phase 5] PWA / Service Worker summary');
console.log('Provider script present before production caller: PASS');
console.log('Production bridge present before app.js: PASS');
console.log('First-load network-only request: PASS');
console.log('Reload network-only request: PASS');
console.log('Cached reload: SKIPPED / N/A (current SSC development SW intentionally disables app caching)');
console.log('Stale ssc-shell cache cleanup: PASS');
console.log('Cache version change required now: NO');
console.log('Deployment: NOT PERFORMED');
