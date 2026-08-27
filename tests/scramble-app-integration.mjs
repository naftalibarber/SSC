import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('index.html','utf8');
const dom=new JSDOM(html,{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;

window.console=console;
window.alert=()=>{};
window.confirm=()=>true;
window.prompt=()=>null;
window.ResizeObserver=class{observe(){}disconnect(){}};
window.__SSC_SCRAMBLE_MODULE_LOADER__=()=>import('cubing/scramble');
window.SSC_FEATURES={previewV1:true};
if(!window.crypto.randomUUID)window.crypto.randomUUID=()=>`test-${Date.now()}-${Math.random()}`;
if(!window.CSS)window.CSS={};
if(!window.CSS.escape)window.CSS.escape=value=>String(value).replace(/[^a-zA-Z0-9_-]/g,'\\$&');

function evaluate(path){window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function waitFor(predicate,label,timeout=15000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    if(predicate())return;
    await sleep(10);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}
function pressSpace(){
  window.document.dispatchEvent(new window.KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true,cancelable:true}));
}
function releaseSpace(){
  window.document.dispatchEvent(new window.KeyboardEvent('keyup',{code:'Space',key:' ',bubbles:true,cancelable:true}));
}
function history(){return JSON.parse(window.localStorage.getItem('rubiksCubeTimerHistoryV1')||'[]');}

// Production load order for the pieces used by the timer/scramble/preview path.
evaluate('code/js/cube2x2.js');
evaluate('code/js/cube-preview.js');
evaluate('code/js/wca-previews.js');
evaluate('code/js/preview/ssc-nxn-state.js');
evaluate('code/js/preview/ssc-svg-renderer.js');
evaluate('code/js/preview/ssc-preview-v1.js');
evaluate('code/js/preview/ssc-preview-v1-integration.js');
evaluate('code/js/scramble2x2.js');
evaluate('code/js/scramble-generators.js');
evaluate('code/js/app.js');

assert.equal(window.SSCScrambleProvider,window.SSCScrambles,'Production legacy API must be the same central provider object.');
assert.equal(typeof window.SSCTimerEvents?.newScramble,'function','Timer integration API is missing.');
assert.equal(typeof window.SSCTimerEvents?.repeatScramble,'function','Repeat-scramble integration API is missing.');

const scrambleElement=window.document.getElementById('scramble');
const previewElement=window.document.getElementById('cubePreview2D');
const appSource=fs.readFileSync('code/js/app.js','utf8');
assert.match(appSource,/if\(timer\.isBusy\(\)\)return null;const requestId=\+\+scrambleRequestId/,'New Scramble must reject requests while the timer is busy.');
assert.match(appSource,/if\(requestId!==scrambleRequestId\|\|requestedEvent!==currentEvent\)return null/,'Async generation must reject stale requests.');
assert.match(appSource,/scramble=await window\.SSCScrambles\.generate\(requestedEvent\);previewScramble=scramble/,'NxN UI generation must await the shared provider before rendering.');
assert.match(appSource,/showScramble\(scramble,requestedEvent,previewScramble\)/,'Displayed and preview scramble must share the resolved source value.');
assert.match(appSource,/if\(!text\|\|eventId!==currentEvent\|\|timer\.isBusy\(\)\)return false/,'Repeat/history loading must not replace a running solve scramble.');

await waitFor(()=>scrambleElement.dataset.scrambleTransient==='false'&&scrambleElement.textContent.trim(),'initial scramble');
assert.equal(scrambleElement.textContent.includes('[object Promise]'),false,'A Promise reached the scramble UI.');

const events=['222','333','444','555','666','777'];
const savedByEvent={};

for(const eventId of events){
  if(window.SSCTimerEvents.getCurrent()!==eventId){
    const changed=await window.SSCTimerEvents.setCurrent(eventId);
    assert.equal(changed,true,`${eventId} could not become the active event.`);
  }
  await waitFor(()=>scrambleElement.dataset.eventId===eventId&&scrambleElement.dataset.scrambleTransient==='false'&&scrambleElement.textContent.trim(),`${eventId} scramble`);

  const scrambleA=scrambleElement.textContent.trim();
  assert.equal(typeof scrambleA,'string');
  assert.ok(scrambleA);
  assert.equal(scrambleA.includes('[object Promise]'),false,`${eventId} displayed a Promise.`);
  const order=window.SSCPreviewV1.orderForEvent(eventId);
  const state=window.SSCNxNState.buildState(scrambleA,order,{strict:true});
  assert.deepEqual(Array.from(state.ignoredMoves),[],`${eventId} displayed scramble contains an unsupported move.`);
  assert.equal(previewElement.dataset.wcaEvent,eventId,`${eventId} preview received the wrong event.`);
  assert.equal(previewElement.dataset.previewEngine,'ssc-native-v1',`${eventId} did not route through SSCPreviewV1.`);

  // Start the solve from Scramble A.
  pressSpace();
  await sleep(540);
  releaseSpace();
  await waitFor(()=>window.SSCTimerEvents.getTimerState()==='running',`${eventId} timer start`);

  // Generate an independent Scramble B while A is running. Provider generation
  // must be pure and the production New Scramble route must refuse to swap A.
  const scrambleB=await window.SSCScrambleProvider.generate(eventId);
  assert.equal(typeof scrambleB,'string');
  assert.ok(scrambleB.trim());
  const blocked=await window.SSCTimerEvents.newScramble();
  assert.equal(blocked,null,`${eventId} New Scramble was not blocked while running.`);
  assert.equal(scrambleElement.textContent.trim(),scrambleA,`${eventId} running solve was replaced by another scramble.`);

  await sleep(20);
  pressSpace();
  await waitFor(()=>window.SSCTimerEvents.getTimerState()==='idle',`${eventId} timer stop`);

  const saved=history()[0];
  assert.ok(saved,`${eventId} solve was not saved.`);
  assert.equal(saved.eventId,eventId,`${eventId} solve history event mismatch.`);
  assert.equal(saved.scramble,scrambleA,`${eventId} solve was saved with the wrong scramble.`);
  savedByEvent[eventId]=scrambleA;

  // onStop starts a new asynchronous generation. Repeat must invalidate that
  // request and restore the exact historical string without regenerating it.
  const repeated=window.SSCTimerEvents.repeatScramble(saved.scramble,saved.eventId);
  assert.equal(repeated,true,`${eventId} repeat scramble was rejected while idle.`);
  assert.equal(scrambleElement.textContent.trim(),scrambleA,`${eventId} repeat changed the saved scramble string.`);
  assert.equal(previewElement.dataset.wcaEvent,eventId,`${eventId} repeat preview event mismatch.`);
}

const allHistory=history();
for(const eventId of events){
  const solve=allHistory.find(item=>item.eventId===eventId);
  assert.ok(solve,`${eventId} is missing from solve history.`);
  assert.equal(solve.scramble,savedByEvent[eventId],`${eventId} history did not preserve the solve scramble.`);
}
assert.ok(allHistory.length>=events.length,'Not all NxN integration solves were saved.');

console.log('[SSC Scramble CI] App integration regression summary');
console.log(JSON.stringify({
  ok:true,
  events,
  newScramble:true,
  preview:'SSCPreviewV1',
  timerStartStop:true,
  saveSolve:true,
  history:true,
  repeatExact:true,
  runningScrambleProtected:true,
  promiseLeak:false,
  failures:0
},null,2));

dom.window.close();
