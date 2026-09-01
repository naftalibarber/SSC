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
let fullscreenElement=null;
let fullscreenRequests=0;
let fullscreenExits=0;
Object.defineProperty(window.document,'fullscreenElement',{configurable:true,get:()=>fullscreenElement});
window.document.documentElement.requestFullscreen=async()=>{fullscreenRequests+=1;fullscreenElement=window.document.documentElement;window.document.dispatchEvent(new window.Event('fullscreenchange'));};
window.document.exitFullscreen=async()=>{fullscreenExits+=1;fullscreenElement=null;window.document.dispatchEvent(new window.Event('fullscreenchange'));};

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
assert.equal(window.SSCTraining,undefined,'The removed Training system must not initialize.');
assert.equal(window.document.getElementById('trainingButton'),null,'The removed Training button must not render.');
assert.equal(window.document.getElementById('trainingModal'),null,'The removed Training dialog must not render.');

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

const fullscreenButton=window.document.getElementById('fullscreenButton');
assert.ok(fullscreenButton,'The fullscreen toolbar button must render.');
assert.equal(fullscreenButton.getAttribute('aria-label'),'מסך מלא','The fullscreen button must start with its Hebrew enter label.');
assert.equal(fullscreenButton.getAttribute('aria-pressed'),'false','The fullscreen button must start unpressed.');
assert.ok(fullscreenButton.querySelector('svg[data-toolbar-icon="fullscreen-enter"]'),'The fullscreen button is missing its maximize icon.');
assert.ok(fullscreenButton.querySelector('svg[data-toolbar-icon="fullscreen-exit"]'),'The fullscreen button is missing its restore icon.');
const fullscreenStateBefore={event:window.SSCTimerEvents.getCurrent(),scramble:scrambleElement.textContent,history:JSON.stringify(history())};
fullscreenButton.click();
await sleep(0);
assert.equal(fullscreenRequests,1,'The fullscreen button did not request fullscreen.');
assert.equal(window.document.fullscreenElement,window.document.documentElement,'The document did not enter fullscreen.');
assert.equal(fullscreenButton.getAttribute('aria-label'),'מסך קטן','The active fullscreen button must offer the small-screen action.');
assert.equal(fullscreenButton.getAttribute('aria-pressed'),'true','The fullscreen button did not expose its active state.');
fullscreenButton.click();
await sleep(0);
assert.equal(fullscreenExits,1,'The fullscreen button did not exit fullscreen.');
assert.equal(window.document.fullscreenElement,null,'The document did not return to normal size.');
assert.equal(fullscreenButton.getAttribute('aria-label'),'מסך מלא','The restored button must offer fullscreen again.');
assert.deepEqual({event:window.SSCTimerEvents.getCurrent(),scramble:scrambleElement.textContent,history:JSON.stringify(history())},fullscreenStateBefore,'Changing screen mode must not change the event, scramble, or solve history.');

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

const historyKey='rubiksCubeTimerHistoryV1';
const base777=allHistory.find(item=>item.eventId==='777');
assert.ok(base777,'The full-history regression needs a 7x7 solve in the active session.');
const unrelatedHistory=allHistory.filter(item=>item.eventId!=='777'||item.sessionId!==base777.sessionId);
function installActiveSessionSolves(count){
  const baseTime=Date.parse(base777.createdAt)||Date.now();
  const solves=Array.from({length:count},(_,index)=>({
    ...base777,
    id:`full-history-${index+1}`,
    rawTimeMs:12000+(index*137),
    timeMs:12000+(index*137),
    rawTime:Number(((12000+(index*137))/1000).toFixed(3)),
    finalTimeMs:12000+(index*137),
    finalTime:Number(((12000+(index*137))/1000).toFixed(3)),
    penalty:'OK',
    scramble:`${base777.scramble} ${index+1}`,
    createdAt:new Date(baseTime-(index*60000)).toISOString(),
    date:new Date(baseTime-(index*60000)).toISOString()
  }));
  const next=[...solves,...unrelatedHistory];
  window.localStorage.setItem(historyKey,JSON.stringify(next));
  window.dispatchEvent(new window.StorageEvent('storage',{key:historyKey,newValue:JSON.stringify(next)}));
  return solves;
}

installActiveSessionSolves(11);
const compactHistory=window.document.getElementById('historyList');
const fullHistoryNotice=window.document.getElementById('fullHistoryNotice');
const fullHistoryButton=window.document.getElementById('fullHistoryButton');
const fullHistoryModal=window.document.getElementById('fullHistoryModal');
assert.equal(compactHistory.children.length,11,'The compact list must show every solve below its twelve-row limit.');
assert.equal(fullHistoryNotice.hidden,true,'The full-history notice must stay hidden below twelve solves.');

installActiveSessionSolves(12);
assert.equal(compactHistory.children.length,12,'The compact list must show exactly twelve rows at the limit.');
assert.equal(fullHistoryNotice.hidden,false,'The full-history notice must appear at twelve solves.');
assert.equal(fullHistoryButton.getAttribute('aria-haspopup'),'dialog','The full-history control must identify its dialog behavior.');
assert.equal(fullHistoryButton.getAttribute('aria-controls'),'fullHistoryModal','The full-history control must identify the dialog it opens.');
fullHistoryButton.click();
assert.equal(fullHistoryModal.hidden,false,'The full-history button did not open its dialog.');
assert.equal(fullHistoryModal.querySelector('[data-full-history-title]').textContent,'כל הפתרונות','The full-history dialog did not use the active Hebrew language.');
assert.equal(fullHistoryModal.querySelectorAll('.full-history-row').length,12,'The full-history dialog did not render all twelve solves.');

const fifteenSolves=installActiveSessionSolves(15);
const fullRows=Array.from(fullHistoryModal.querySelectorAll('.full-history-row'));
assert.equal(compactHistory.children.length,12,'The compact list must remain limited to twelve rows.');
assert.equal(fullRows.length,15,'The full-history dialog must render every solve in the active session.');
assert.equal(new Set(fullRows.map(row=>row.dataset.solveId)).size,15,'Every full-history row must retain its unique solve id.');
assert.match(fullHistoryModal.querySelector('[data-full-history-count]').textContent,/15/,'The full-history dialog count was not updated live.');

const oldestId=fifteenSolves.at(-1).id;
fullHistoryModal.querySelector(`[data-solve-id="${oldestId}"] [data-penalty="+2"]`).click();
assert.equal(history().find(item=>item.id===oldestId)?.penalty,'+2','Penalty editing from the full-history dialog was not persisted.');
assert.equal(fullHistoryModal.querySelectorAll('.full-history-row').length,15,'Editing a solve must not close or truncate full history.');

window.document.getElementById('languageToggle').click();
assert.equal(window.document.documentElement.lang,'en','The language toggle did not switch to English.');
assert.equal(fullscreenButton.getAttribute('aria-label'),'Full Screen','The fullscreen button did not update to English.');
assert.equal(fullscreenButton.querySelector('[data-fullscreen-label]').textContent,'FULL SCREEN','The visible fullscreen label did not update to English.');
assert.equal(fullHistoryButton.textContent,'View all solves','The full-history button did not update to English.');
assert.equal(fullHistoryModal.querySelector('[data-full-history-title]').textContent,'All solves','The open full-history dialog did not update to English.');
window.document.getElementById('languageToggle').click();
assert.equal(window.document.documentElement.lang,'he','The language toggle did not switch back to Hebrew.');
assert.equal(fullHistoryModal.querySelector('[data-full-history-title]').textContent,'כל הפתרונות','The open full-history dialog did not return to Hebrew.');

window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
assert.equal(fullHistoryModal.hidden,true,'Escape must close the full-history dialog.');

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
  compactHistoryLimit:12,
  fullHistoryCount:15,
  fullHistoryActions:true,
  fullHistoryLanguage:true,
  fullscreenToggle:true,
  fullscreenStatePreserved:true,
  trainingRemoved:true,
  runningScrambleProtected:true,
  promiseLeak:false,
  failures:0
},null,2));

dom.window.close();
