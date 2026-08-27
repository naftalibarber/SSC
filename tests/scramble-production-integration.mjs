import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const index=fs.readFileSync('index.html','utf8');
const dom=new JSDOM(index,{url:'https://ssc.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
const {document}=window;

window.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
window.alert=()=>{};
window.confirm=()=>true;
window.prompt=()=>null;
window.document.execCommand=()=>true;
if(!window.crypto.randomUUID)window.crypto.randomUUID=()=>`test-${Math.random().toString(16).slice(2)}`;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(predicate,label,timeout=3000){
  const started=Date.now();
  while(Date.now()-started<timeout){if(predicate())return;await sleep(5);}
  throw new Error(`Timed out waiting for ${label}`);
}
function loadClassic(path){window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);}
function dispatchSpace(type){document.dispatchEvent(new window.KeyboardEvent(type,{key:' ',code:'Space',bubbles:true,cancelable:true}));}
async function startTimer(){dispatchSpace('keydown');await sleep(530);dispatchSpace('keyup');await waitFor(()=>window.SSCTimerEvents.getTimerState()==='running','timer running');}
function stopTimer(){dispatchSpace('keydown');}
function history(){try{return JSON.parse(window.localStorage.getItem('rubiksCubeTimerHistoryV1')||'[]');}catch{return[];}}

const NXN={222:2,333:3,444:4,555:5,666:6,777:7};
const aliases={
  '2x2':'222','2×2':'222','222':'222','3x3':'333','3×3':'333','333':'333',
  '4x4':'444','4×4':'444','444':'444','5x5':'555','5×5':'555','555':'555',
  '6x6':'666','6×6':'666','666':'666','7x7':'777','7×7':'777','777':'777',minx:'minx'
};
const eventDefs={
  ...Object.fromEntries(Object.entries(NXN).map(([id,order])=>[id,{id,label:`${order}×${order}`,puzzle:`${order}x${order}`,scrambleEvent:id}])),
  minx:{id:'minx',label:'Megaminx',puzzle:'megaminx',scrambleEvent:'minx'}
};
const standard={
  222:"R U R' F2",
  333:"F R U R' U' F'",
  444:"Rw U Rw' F2",
  555:"Rw U2 Fw' Lw D2",
  666:"3Rw U2 Fw' 3Lw D2",
  777:"3Rw U2 Fw' 3Lw D2 B"
};

let legacyGenerateImpl=async eventId=>eventId==='minx'?'R++ D-- U':'R U2 F';
const legacyCalls=[];
window.SSCScrambles=Object.freeze({
  normalizeEventId(value){const raw=String(value??'').trim().toLowerCase();return aliases[raw]||null;},
  supportsEvent(value){return this.normalizeEventId(value)!==null;},
  getEvent(value){const id=this.normalizeEventId(value);return id?{...eventDefs[id]}:null;},
  getEvents(){return Object.values(eventDefs).map(event=>({...event}));},
  async generate(eventId){const id=this.normalizeEventId(eventId);legacyCalls.push(id);return legacyGenerateImpl(id);},
  async generateMultiBlind(){return [standard[333],"R2 U2 F2","L2 D2 B2"];}
});

window.SSC_FEATURES={previewV1:true,scrambleProviderV1:true};
window.localStorage.setItem('rubiksCubeTimerEventV2','222');

let moduleLoads=0;
let primaryGenerateImpl=async eventId=>standard[eventId];
const providerCalls=[];
window.__SSC_SCRAMBLE_MODULE_LOADER__=async()=>{
  moduleLoads+=1;
  return{randomScrambleForEvent:async eventId=>{providerCalls.push(eventId);return primaryGenerateImpl(eventId);}};
};

loadClassic('code/js/preview/ssc-nxn-state.js');
loadClassic('code/js/preview/ssc-svg-renderer.js');
loadClassic('code/js/preview/ssc-preview-v1.js');
const previewCalls=[];
window.SSCCubePreview={
  normalizeEventId(value){return window.SSCScrambles.normalizeEventId(value);},
  render(container,scramble,eventId){
    const normalized=window.SSCScrambles.normalizeEventId(eventId)||eventId;
    const text=String(scramble??'');previewCalls.push({eventId:normalized,scramble:text});
    if(window.SSCPreviewV1.supportsEvent(normalized))return window.SSCPreviewV1.render(container,text,normalized,{strict:true});
    container.dataset.wcaEvent=normalized;container.dataset.previewScramble=text;return{eventId:normalized,scramble:text,engine:'legacy-test-route'};
  }
};
window.SSCPreviewSizing={scheduleFit(){}};

let trainingState={mode:'normal'};
window.SSCTraining={
  async nextScramble(){return null;},
  consumeAttemptMetadata(){return{};},
  shouldInspect(){return false;},
  getState(){return{...trainingState};}
};

loadClassic('code/js/scramble-provider.js');
loadClassic('code/js/scramble-production-bridge.js');
loadClassic('code/js/app.js');

await waitFor(()=>window.SSCTimerEvents?.getCurrentScramble?.(),'initial production scramble');
const events=window.SSCTimerEvents;
const scrambleEl=document.getElementById('scramble');
const previewEl=document.getElementById('cubePreview2D');

function assertCommitted(eventId,scramble,label){
  assert.equal(events.getCurrent(),eventId,`${label}: wrong current event`);
  assert.equal(events.getCurrentScramble(),scramble,`${label}: wrong currentScramble`);
  assert.equal(scrambleEl.textContent.trim(),scramble,`${label}: DOM scramble differs`);
  assert.notEqual(scrambleEl.textContent.trim(),'[object Promise]',`${label}: Promise leaked to DOM`);
  const last=previewCalls.at(-1);assert.equal(last.eventId,eventId,`${label}: Preview event differs`);assert.equal(last.scramble,scramble,`${label}: Preview scramble differs`);
  if(NXN[eventId]){assert.equal(previewEl.dataset.wcaEvent,eventId,`${label}: Preview V1 did not receive event`);assert.equal(previewEl.dataset.puzzle,`${NXN[eventId]}×${NXN[eventId]}`,`${label}: Preview V1 order differs`);}
}

// Test 1 — Standard generation: Provider -> app state -> DOM -> Preview for all NxN events.
for(const eventId of Object.keys(NXN)){
  primaryGenerateImpl=async id=>standard[id];
  if(events.getCurrent()===eventId)await events.newScramble();else await events.setCurrent(eventId);
  assert.equal(providerCalls.at(-1),eventId,`${eventId}: production did not call Provider with canonical event`);
  assertCommitted(eventId,standard[eventId],`standard ${eventId}`);
}
assert.equal(moduleLoads,1,'Production Provider must cache the cubing.js module.');

// Legacy events remain on the existing production path.
const providerBeforeLegacy=providerCalls.length;
legacyGenerateImpl=async id=>id==='minx'?'R++ D-- U':'R U F';
await events.setCurrent('minx');
assert.equal(providerCalls.length,providerBeforeLegacy,'Megaminx must not use the NxN Provider.');
assert.equal(legacyCalls.at(-1),'minx','Megaminx must remain on SSCScrambles.');
assertCommitted('minx','R++ D-- U','legacy minx');

// Test 2 + Test 9 — A/B/C are all already in Provider; only request C may commit.
await events.setCurrent('333');
primaryGenerateImpl=async id=>standard[id];await events.newScramble();
const deferred=[];
primaryGenerateImpl=eventId=>new Promise((resolve,reject)=>deferred.push({eventId,resolve,reject}));
const raceA=events.newScramble();
await waitFor(()=>deferred.length===1,'request A entering Provider');
const raceB=events.newScramble();
await waitFor(()=>deferred.length===2,'request B entering Provider');
const raceC=events.newScramble();
await waitFor(()=>deferred.length===3,'request C entering Provider');
const C='F2 U R2 D';const A='R U F2';const B='L2 U2 B2';
deferred[2].resolve(C);await sleep(0);deferred[0].resolve(A);deferred[1].resolve(B);
await Promise.all([raceA,raceB,raceC]);
assertCommitted('333',C,'A/B/C race');
assert.equal(events.isGeneratingScramble(),false,'Race completion must clear generating state.');

// Test 3 — Event race: 333 is already in Provider before switching to 777.
primaryGenerateImpl=async id=>standard[id];await events.newScramble();
const eventDeferred=[];
primaryGenerateImpl=eventId=>new Promise((resolve,reject)=>eventDeferred.push({eventId,resolve,reject}));
const old333=events.newScramble();
await waitFor(()=>eventDeferred.length===1,'333 request entering Provider');
const switch777=events.setCurrent('777');
await waitFor(()=>eventDeferred.length===2,'777 request entering Provider');
assert.equal(eventDeferred[0].eventId,'333');assert.equal(eventDeferred[1].eventId,'777');
const sevenRace="3Rw F2 U 3Lw'";
eventDeferred[1].resolve(sevenRace);await sleep(0);eventDeferred[0].resolve("R U R'");
await Promise.all([old333,switch777]);
assertCommitted('777',sevenRace,'event race');

// Test 4 + Test 5 — solve snapshot + normal save/history.
primaryGenerateImpl=async id=>id==='333'?"R U R' U' F2":standard[id];
await events.setCurrent('333');
const solveA=events.getCurrentScramble();
const previewBeforeSolve=previewCalls.at(-1);
await startTimer();
assert.equal(events.getActiveSolveScramble(),solveA,'activeSolveScramble must snapshot before Running/Inspection.');
primaryGenerateImpl=async()=>"F2 R2 U2";
const generatedB=await window.SSCScrambleProvider.generate('333');
assert.equal(generatedB,'F2 R2 U2');
assert.equal(await events.newScramble(),null,'New Scramble must remain blocked while timer is active.');
assert.equal(events.getActiveSolveScramble(),solveA,'Generating B must not change active solve snapshot.');
stopTimer();
await waitFor(()=>history().length>=1,'saved solve');
const saved=history()[0];
assert.equal(saved.scramble,solveA,'Saved solve must use Scramble A snapshot.');
assert.equal(previewBeforeSolve.scramble,solveA,'Preview before solve must equal Scramble A.');
assert.equal(saved.eventId,'333');
assert.ok(!Object.hasOwn(saved,'activeSolveScramble'),'Solve schema must remain unchanged.');

// Inspection snapshot: attempt is locked before inspection begins and retained through running.
await waitFor(()=>events.getTimerState()==='idle'&&!events.isGeneratingScramble(),'automatic next scramble after solve');
window.dispatchEvent(new window.CustomEvent('ssc-general-settings-change',{detail:{competitionMode:true,competitionInspection:true}}));
primaryGenerateImpl=async()=>"R2 U F2 D";await events.newScramble();const inspectionA=events.getCurrentScramble();
dispatchSpace('keydown');await sleep(530);dispatchSpace('keyup');await waitFor(()=>events.getTimerState()==='inspection','inspection state');
assert.equal(events.getActiveSolveScramble(),inspectionA,'Inspection must retain pre-inspection scramble snapshot.');
dispatchSpace('keydown');await sleep(530);dispatchSpace('keyup');await waitFor(()=>events.getTimerState()==='running','running after inspection');
assert.equal(events.getActiveSolveScramble(),inspectionA,'Running after inspection must retain same snapshot.');
primaryGenerateImpl=async()=>"U2 R2 F2";stopTimer();await waitFor(()=>history()[0]?.scramble===inspectionA,'inspection solve saved');
window.dispatchEvent(new window.CustomEvent('ssc-general-settings-change',{detail:{competitionMode:false,competitionInspection:true}}));

// Test 6 — Repeat uses byte-for-byte saved string and never generates.
await waitFor(()=>events.getTimerState()==='idle'&&!events.isGeneratingScramble(),'post-inspection next scramble');
const repeatSaved=history()[0];const callsBeforeRepeat=providerCalls.length;
assert.equal(events.repeatScramble(repeatSaved.scramble,repeatSaved.eventId),true,'Repeat must load saved scramble.');
assert.equal(providerCalls.length,callsBeforeRepeat,'Repeat must not call Provider.generate().');
assertCommitted(repeatSaved.eventId,repeatSaved.scramble,'repeat scramble');

// Test 7 — complete Provider + fallback failure retains previous valid scramble and timer remains usable.
primaryGenerateImpl=async()=>"R U2 F2";await events.newScramble();const previousValid=events.getCurrentScramble();const previewCountBeforeFailure=previewCalls.length;
primaryGenerateImpl=async()=>{throw new Error('forced primary failure');};
legacyGenerateImpl=async()=>{throw new Error('forced legacy failure');};
const capturedErrors=[];const originalError=window.console.error;window.console.error=(...args)=>capturedErrors.push(args);
assert.equal(await events.newScramble(),null,'Complete generation failure should return null.');
window.console.error=originalError;
assert.equal(events.getCurrentScramble(),previousValid,'Failure must retain previous currentScramble.');
assert.equal(scrambleEl.textContent.trim(),previousValid,'Failure must retain previous DOM scramble.');
assert.equal(previewCalls.length,previewCountBeforeFailure,'Failure must not replace Preview.');
assert.ok(capturedErrors.some(args=>args[0]==='[SSC Scramble] unable to generate new scramble'&&args[1]?.eventId==='333'),'Required production failure diagnostic missing.');
assert.equal(events.isGeneratingScramble(),false);
await startTimer();assert.equal(events.getTimerState(),'running','Timer must remain usable after generation failure.');
primaryGenerateImpl=async()=>"F U2 R2";legacyGenerateImpl=async()=>"R U F";stopTimer();await waitFor(()=>events.getTimerState()==='idle','timer stop after generation failure');

// Test 8 — force cubing.js generation failure; Provider fallback reaches production UI + Preview.
await waitFor(()=>!events.isGeneratingScramble(),'automatic next before fallback test');
primaryGenerateImpl=async()=>{throw new Error('forced cubing generation failure');};
const fallbackScramble="R U F2 L'";legacyGenerateImpl=async id=>{assert.equal(id,'333');return fallbackScramble;};
const legacyBeforeFallback=legacyCalls.length;
await events.newScramble();
assert.ok(legacyCalls.length>legacyBeforeFallback,'Production fallback bridge was not invoked.');
assertCommitted('333',fallbackScramble,'production fallback');
assert.equal(window.SSCLegacyScrambleFallback.source,'existing SSCScrambles production path');

// Training random Cross scramble is routed through the Provider; algorithm trainers remain delegated.
trainingState={mode:'cross'};primaryGenerateImpl=async id=>{assert.equal(id,'333');return"F U R2";};
const legacyBeforeCross=legacyCalls.length;const providerBeforeCross=providerCalls.length;
assert.equal(await window.SSCTraining.nextScramble(),'F U R2');
assert.equal(providerCalls.length,providerBeforeCross+1,'Cross training random 333 must use Provider.');
assert.equal(legacyCalls.length,legacyBeforeCross,'Cross training should not call legacy on primary success.');
trainingState={mode:'normal'};

// Test 10 — multiplication-sign aliases map through the same event integration path.
primaryGenerateImpl=async id=>standard[id];legacyGenerateImpl=async id=>id==='minx'?'R++ D-- U':standard[id]||'R U F';
for(const [alias,eventId] of Object.entries({'2×2':'222','3×3':'333','4×4':'444','5×5':'555','6×6':'666','7×7':'777'})){
  await events.setCurrent(alias);assert.equal(events.getCurrent(),eventId,`${alias}: wrong production event mapping`);assert.equal(providerCalls.at(-1),eventId,`${alias}: Provider received wrong event`);assertCommitted(eventId,standard[eventId],`alias ${alias}`);
}

// Keyboard NxN shortcuts use the same setEvent integration path.
primaryGenerateImpl=async id=>standard[id];
document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'2',code:'Digit2',ctrlKey:true,bubbles:true,cancelable:true}));
await waitFor(()=>events.getCurrent()==='222'&&!events.isGeneratingScramble(),'Ctrl+2 event switch');assertCommitted('222',standard[222],'Ctrl+2');
document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'7',code:'Digit7',ctrlKey:true,bubbles:true,cancelable:true}));
await waitFor(()=>events.getCurrent()==='777'&&!events.isGeneratingScramble(),'Ctrl+7 event switch');assertCommitted('777',standard[777],'Ctrl+7');

// Static production wiring assertions: no direct cubing API outside Provider and correct script order/flag.
const appSource=fs.readFileSync('code/js/app.js','utf8');const bridgeSource=fs.readFileSync('code/js/scramble-production-bridge.js','utf8');
assert.doesNotMatch(appSource,/randomScrambleForEvent/,'app.js must not bypass SSCScrambleProvider.');
assert.doesNotMatch(bridgeSource,/randomScrambleForEvent/,'production bridge must not bypass SSCScrambleProvider.');
assert.match(index,/window\.SSC_FEATURES=\{previewV1:true,scrambleProviderV1:true\}/);
assert.doesNotMatch(index,/scramble-provider-legacy-fallback\.js/,'Phase 3 synthetic fallback adapter must not be loaded in Production.');
const positions={legacy:index.indexOf('code/js/scramble-generators.js'),provider:index.indexOf('code/js/scramble-provider.js'),training:index.indexOf('code/js/training.js'),bridge:index.indexOf('code/js/scramble-production-bridge.js'),app:index.indexOf('code/js/app.js')};
for(const [name,pos] of Object.entries(positions))assert.ok(pos>=0,`${name} script missing from index.html`);
assert.ok(positions.legacy<positions.provider&&positions.provider<positions.training&&positions.training<positions.bridge&&positions.bridge<positions.app,'Production scramble script order is invalid.');
assert.match(appSource,/activeSolveScramble=currentScramble/);
assert.match(appSource,/requestId!==scrambleRequestId\|\|requestedEvent!==currentEvent/);
assert.match(appSource,/\[SSC Scramble\] unable to generate new scramble/);

console.log('\n[SSC Scramble Phase 4 CI] Production integration summary');
console.log('Standard generation 222–777: PASS');
console.log('Single source currentScramble -> DOM -> Preview: PASS');
console.log('Race A/B/C latest request wins: PASS');
console.log('Event-switch race 333 -> 777: PASS');
console.log('activeSolveScramble snapshot: PASS');
console.log('Inspection scramble snapshot: PASS');
console.log('Normal solve + History scramble: PASS');
console.log('Repeat byte-for-byte / no Provider call: PASS');
console.log('Complete generation failure retains previous scramble: PASS');
console.log('Timer usable after generation failure: PASS');
console.log('Production fallback bridge: PASS');
console.log('Fast New Scramble clicks: PASS');
console.log('NxN aliases: PASS');
console.log('NxN keyboard shortcuts share setEvent path: PASS');
console.log('Legacy non-NxN path preserved: PASS');
console.log('Cross training random 333 uses Provider: PASS');
console.log('Promise leakage to UI: NONE');
console.log(`cubing.js module loads: ${moduleLoads} (PASS)`);
console.log('Deployment: NOT PERFORMED');
