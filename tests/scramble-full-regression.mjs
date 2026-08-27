import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';

const INDEX=fs.readFileSync('index.html','utf8');
const NXN=Object.freeze({222:2,333:3,444:4,555:5,666:6,777:7});
const NXN_IDS=Object.keys(NXN);
const LEGACY_EVENTS=Object.freeze({
  minx:'R++ D-- U',
  pyram:"R U L' B",
  skewb:"R U' L B'",
  sq1:'(1,0) / (3,0) / (-1,-1)',
  clock:'UR3+ DR2- y2 U1+ ALL2+'
});
const BASE_NXN=Object.freeze({
  222:"R U R' F2",
  333:"F R U R' U' F'",
  444:"Rw U Rw' F2",
  555:"Rw U2 Fw' Lw D2",
  666:"3Rw U2 Fw' 3Lw D2",
  777:"3Rw U2 Fw' 3Lw D2 B"
});
const UNIVERSAL_SUFFIXES=Object.freeze(['U','R2',"F'",'D','L2',"B'"]);
const STORAGE={
  history:'rubiksCubeTimerHistoryV1',
  event:'rubiksCubeTimerEventV2',
  puzzle:'rubiksCubeTimerPuzzleV1',
  language:'sscLanguageV1',
  general:'sscGeneralSettingsV1',
  sessions:'sscSessionsByEventV3',
  activeSessions:'sscActiveSessionByEventV3',
  legacySessions:'sscSessionsV1',
  legacyActive:'sscActiveSessionV1',
  previewMode:'sscPreviewModeV1',
  previewMigration:'sscTwistyProfessionalPreviewV1'
};

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(predicate,label,timeout=4000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    try{if(predicate())return;}catch{}
    await sleep(5);
  }
  throw new Error(`Timed out waiting for ${label}`);
}
function snapshotStorage(storage){
  const out={};
  for(let i=0;i<storage.length;i+=1){const key=storage.key(i);out[key]=storage.getItem(key);}
  return out;
}
function json(storage,key,fallback){try{return JSON.parse(storage.getItem(key)??'null')??fallback;}catch{return fallback;}}
function findSolve(storage,id){return json(storage,STORAGE.history,[]).find(s=>s?.id===id)||null;}
function latestSolve(storage){return json(storage,STORAGE.history,[])[0]||null;}

const legacyPreMigrationSolve={
  id:'legacy-pre-migration-1',
  timeMs:12345,
  scramble:"R U R' U'",
  puzzle:'3x3',
  session:'session-1',
  date:'2026-08-01T10:00:00.000Z'
};
const INITIAL_STORAGE={
  [STORAGE.history]:JSON.stringify([legacyPreMigrationSolve]),
  [STORAGE.puzzle]:'3x3',
  [STORAGE.legacySessions]:JSON.stringify([{id:'session-1',name:'Legacy Session'}]),
  [STORAGE.legacyActive]:'session-1',
  [STORAGE.language]:'he',
  [STORAGE.general]:JSON.stringify({theme:'light',competitionMode:false,competitionInspection:true,timePrecision:3}),
  [STORAGE.previewMode]:'2d',
  [STORAGE.previewMigration]:'1'
};

async function createHarness(seed=INITIAL_STORAGE){
  const virtualConsole=new VirtualConsole();
  const jsdomErrors=[];
  virtualConsole.on('jsdomError',error=>jsdomErrors.push(error));
  const dom=new JSDOM(INDEX,{url:'https://ssc.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const {window}=dom;
  const {document}=window;

  window.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
  window.alert=()=>{};
  window.confirm=()=>true;
  window.prompt=()=>null;
  window.document.execCommand=()=>true;
  if(!window.crypto.randomUUID)window.crypto.randomUUID=()=>`test-${Math.random().toString(16).slice(2)}`;

  const nativeSetTimeout=window.setTimeout.bind(window);
  window.setTimeout=(fn,delay,...args)=>nativeSetTimeout(fn,Number(delay)===500?5:delay,...args);
  let perfOffset=0;
  const nativeNow=window.performance.now.bind(window.performance);
  Object.defineProperty(window.performance,'now',{configurable:true,value:()=>nativeNow()+perfOffset});

  Object.entries(seed||{}).forEach(([key,value])=>{
    if(value!==null&&value!==undefined)window.localStorage.setItem(key,String(value));
  });

  const consoleLog={errors:[],warnings:[]};
  const nativeError=window.console.error.bind(window.console);
  const nativeWarn=window.console.warn.bind(window.console);
  window.console.error=(...args)=>consoleLog.errors.push(args);
  window.console.warn=(...args)=>consoleLog.warnings.push(args);

  const loadClassic=path=>window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);
  window.SSC_FEATURES={previewV1:true,scrambleProviderV1:true};

  // Real event registry + real WCA preview renderer are used for non-NxN events.
  loadClassic('code/js/wca-previews.js');
  const wcaPreview=window.SSCCubePreview;

  let sequence=0;
  const makeNxNScramble=eventId=>`${BASE_NXN[eventId]} ${UNIVERSAL_SUFFIXES[(sequence++)%UNIVERSAL_SUFFIXES.length]}`.trim();
  let primaryGenerateImpl=async eventId=>makeNxNScramble(eventId);
  let legacyGenerateImpl=async eventId=>LEGACY_EVENTS[eventId]||makeNxNScramble(eventId);
  const providerCalls=[];
  const legacyCalls=[];
  let providerModuleLoads=0;

  // Existing production SSCScrambles contract. The actual legacy generator itself is
  // exercised separately in scramble-legacy-events-validation.mjs.
  window.SSCScrambles=Object.freeze({
    normalizeEventId(value){const id=wcaPreview.normalizeEventId(value);return window.SSCWCAEvents[id]?id:null;},
    supportsEvent(value){return this.normalizeEventId(value)!==null;},
    getEvent(value){const id=this.normalizeEventId(value);return id?{...window.SSCWCAEvents[id]}:null;},
    getEvents(){return Object.values(window.SSCWCAEvents).map(event=>({...event}));},
    async generate(eventId){const id=this.normalizeEventId(eventId);legacyCalls.push(id);return legacyGenerateImpl(id);},
    async generateMany(eventId,amount){const out=[];for(let i=0;i<amount;i+=1)out.push(await this.generate(eventId));return out;},
    async generateMultiBlind(cubeCount){const out=[];for(let i=0;i<cubeCount;i+=1)out.push(makeNxNScramble('333'));return out;}
  });

  window.__SSC_SCRAMBLE_MODULE_LOADER__=async()=>{
    providerModuleLoads+=1;
    return{randomScrambleForEvent:async eventId=>{providerCalls.push(eventId);return primaryGenerateImpl(eventId);}};
  };

  // Real SSC NxN state + SVG renderer.
  loadClassic('code/js/preview/ssc-nxn-state.js');
  loadClassic('code/js/preview/ssc-svg-renderer.js');
  loadClassic('code/js/preview/ssc-preview-v1.js');
  const previewCalls=[];
  const directPreview={
    ...wcaPreview,
    render(container,scramble,eventId='333'){
      const normalized=wcaPreview.normalizeEventId(eventId);
      const text=String(scramble??'');
      if(window.SSCPreviewV1.supportsEvent(normalized))return window.SSCPreviewV1.render(container,text,normalized,{strict:true});
      return wcaPreview.render(container,text,normalized);
    },
    getColors:()=>window.SSCPreviewV1.getColors(),
    setColors:next=>window.SSCPreviewV1.setColors(next),
    resetColors:()=>window.SSCPreviewV1.resetColors()
  };
  window.SSCCubePreview=directPreview;
  const managerBaseRender=directPreview.render.bind(directPreview);
  window.SSCPreviewManager={
    normalizeMode:value=>String(value||'').toLowerCase()==='2d'?'2d':'3d',
    async render({container,eventId,scramble,mode}){
      if(container?.id==='sscPreview3DViewer'&&mode==='3d'){
        container.dataset.previewMode='3d';
        const player=document.createElement('div');player.className='ssc-puzzle-3d-player';container.replaceChildren(player);return player;
      }
      const result=managerBaseRender(container,scramble,eventId);container.dataset.previewMode=mode==='3d'?'3d':'2d';return result;
    }
  };
  loadClassic('code/js/preview-integration.js');
  loadClassic('code/js/preview-visibility-hotfix.js');
  loadClassic('code/js/preview-sizing.js');
  const connectedRender=window.SSCCubePreview.render.bind(window.SSCCubePreview);
  window.SSCCubePreview={...window.SSCCubePreview,async render(container,scramble,eventId){
    previewCalls.push({eventId:wcaPreview.normalizeEventId(eventId),scramble:String(scramble??'')});
    return connectedRender(container,scramble,eventId);
  }};

  loadClassic('code/js/scramble-provider.js');
  loadClassic('code/js/training-data.js');
  loadClassic('code/js/training.js');
  loadClassic('code/js/scramble-production-bridge.js');
  loadClassic('code/js/app.js');
  loadClassic('code/js/scramble-history.js');
  loadClassic('code/js/settings.js');
  loadClassic('code/js/advanced-features.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));

  await waitFor(()=>window.SSCTimerEvents?.getCurrentScramble?.()&&!window.SSCTimerEvents.isGeneratingScramble(),'initial production scramble');
  await sleep(10);

  const events=window.SSCTimerEvents;
  const scrambleEl=document.getElementById('scramble');
  const previewEl=document.getElementById('cubePreview2D');

  const dispatchKey=(type,{key,code,ctrlKey=false,metaKey=false,shiftKey=false}={})=>document.dispatchEvent(new window.KeyboardEvent(type,{key,code,ctrlKey,metaKey,shiftKey,bubbles:true,cancelable:true}));
  const dispatchSpace=type=>dispatchKey(type,{key:' ',code:'Space'});
  const advance=ms=>{perfOffset+=ms;};
  async function waitGenerated(){await waitFor(()=>!events.isGeneratingScramble(),'scramble generation');await sleep(5);}
  async function startNormal(){
    dispatchSpace('keydown');await waitFor(()=>events.getTimerState()==='ready','timer ready');dispatchSpace('keyup');await waitFor(()=>events.getTimerState()==='running','timer running');
  }
  async function enterInspection(){
    dispatchSpace('keydown');await waitFor(()=>events.getTimerState()==='ready','inspection arm ready');dispatchSpace('keyup');await waitFor(()=>events.getTimerState()==='inspection','inspection state');
  }
  async function startFromInspection(inspectElapsedMs){
    advance(inspectElapsedMs);dispatchSpace('keydown');await waitFor(()=>events.getTimerState()==='inspection-ready','inspection ready');dispatchSpace('keyup');await waitFor(()=>events.getTimerState()==='running','running after inspection');
  }
  async function stopRunning(solveMs=1000){
    advance(solveMs);dispatchSpace('keydown');await waitFor(()=>events.getTimerState()==='idle','timer stopped');dispatchSpace('keyup');
  }
  async function solveNormal(solveMs=1000){
    const before=json(window.localStorage,STORAGE.history,[]).length;
    const eventId=events.getCurrent();const scramble=events.getCurrentScramble();
    await startNormal();assert.equal(events.getActiveSolveScramble(),scramble,'active solve snapshot differs before normal solve');
    await stopRunning(solveMs);await waitFor(()=>json(window.localStorage,STORAGE.history,[]).length===before+1,'solve saved');
    const saved=latestSolve(window.localStorage);await waitGenerated();return{saved,eventId,scramble};
  }
  function lastPreview(){return previewCalls.at(-1)||null;}
  function assertCommitted(eventId,scramble,label){
    assert.equal(events.getCurrent(),eventId,`${label}: currentEvent`);
    assert.equal(events.getCurrentScramble(),scramble,`${label}: currentScramble`);
    assert.equal(scrambleEl.textContent.trim(),scramble,`${label}: DOM scramble`);
    assert.ok(scramble,`${label}: blank scramble`);
    assert.notEqual(scramble,'[object Promise]',`${label}: Promise leakage`);
    const last=lastPreview();assert.equal(last?.eventId,eventId,`${label}: preview event`);assert.equal(last?.scramble,scramble,`${label}: preview scramble`);
  }

  return{
    dom,window,document,events,scrambleEl,previewEl,previewCalls,providerCalls,legacyCalls,consoleLog,jsdomErrors,
    get providerModuleLoads(){return providerModuleLoads;},
    setPrimary(fn){primaryGenerateImpl=fn;},setLegacy(fn){legacyGenerateImpl=fn;},makeNxNScramble,
    advance,dispatchKey,dispatchSpace,waitGenerated,startNormal,enterInspection,startFromInspection,stopRunning,solveNormal,lastPreview,assertCommitted,
    history:()=>json(window.localStorage,STORAGE.history,[]),storageSnapshot:()=>snapshotStorage(window.localStorage),
    restoreConsole(){window.console.error=nativeError;window.console.warn=nativeWarn;}
  };
}

const h=await createHarness();
const {window,document,events}=h;

// 23 — LocalStorage compatibility begins at startup with a real pre-migration solve shape.
assert.ok(h.history().some(s=>s.id===legacyPreMigrationSolve.id),'legacy solve did not load');
const untouchedLegacy=findSolve(window.localStorage,legacyPreMigrationSolve.id);
assert.equal(untouchedLegacy.scramble,legacyPreMigrationSolve.scramble);
assert.equal(untouchedLegacy.puzzle,'3x3');
assert.equal(Object.hasOwn(untouchedLegacy,'eventId'),false,'old solve was unnecessarily schema-migrated in storage');
assert.ok(events.getSessions().some(s=>s.id==='session-1'),'legacy session was not migrated/read');

// 1 — Repeated New Scramble -> one exact string shared by state/DOM/Preview, all NxN.
for(const eventId of NXN_IDS){
  if(events.getCurrent()!==eventId)await events.setCurrent(eventId);
  for(let i=0;i<3;i+=1){
    const result=await events.newScramble();assert.equal(typeof result,'string',`${eventId}: new scramble must resolve string`);h.assertCommitted(eventId,result,`new scramble ${eventId} #${i+1}`);
  }
}
assert.equal(h.providerModuleLoads,1,'Provider module cache must remain one load');

// 2 — Ten genuinely in-flight New Scramble requests, returned last -> first.
await events.setCurrent('333');
const fastDeferred=[];
h.setPrimary(eventId=>new Promise((resolve,reject)=>fastDeferred.push({eventId,resolve,reject})));
const fastRequests=[];
for(let i=0;i<10;i+=1){
  fastRequests.push(events.newScramble());
  await waitFor(()=>fastDeferred.length===i+1,`fast request ${i+1} entered provider`);
  assert.ok(events.getCurrentScramble(),'fast clicks must not blank currentScramble while loading');
}
const fastExpected=[];
for(let i=0;i<10;i+=1)fastExpected.push(`${BASE_NXN[333]} ${UNIVERSAL_SUFFIXES[i%UNIVERSAL_SUFFIXES.length]} U${i%2?'2':''}`.trim());
for(let i=9;i>=0;i-=1){fastDeferred[i].resolve(fastExpected[i]);await sleep(0);}
await Promise.all(fastRequests);h.assertCommitted('333',fastExpected[9],'10-click race');
assert.equal(events.isGeneratingScramble(),false);

// 3 — Rapid event switching with all requests already in flight; only final 333 may commit.
const eventSequence=['333','777','222','666','444','555','333'];
const switchDeferred=[];
h.setPrimary(eventId=>new Promise((resolve,reject)=>switchDeferred.push({eventId,resolve,reject})));
const switchRequests=[];
for(let i=0;i<eventSequence.length;i+=1){
  const eventId=eventSequence[i];
  const request=events.getCurrent()===eventId?events.newScramble():events.setCurrent(eventId);
  switchRequests.push(request);await waitFor(()=>switchDeferred.length===i+1,`event race request ${i+1}`);
}
const switchScrambles=switchDeferred.map((item,index)=>`${BASE_NXN[item.eventId]} ${UNIVERSAL_SUFFIXES[index%UNIVERSAL_SUFFIXES.length]}`);
for(let i=switchDeferred.length-1;i>=0;i-=1){switchDeferred[i].resolve(switchScrambles[i]);await sleep(0);}
await Promise.all(switchRequests);h.assertCommitted('333',switchScrambles.at(-1),'rapid event switching');

// Restore normal deterministic primary generation.
h.setPrimary(async eventId=>h.makeNxNScramble(eventId));

// 4 — Normal Timer solve for every NxN; saved event/scramble/time and visible history/session count.
const nxnTimerResults=[];
window.dispatchEvent(new window.CustomEvent('ssc-general-settings-change',{detail:{competitionMode:false,competitionInspection:true}}));
window.SSCTraining.setMode('normal');
for(let i=0;i<NXN_IDS.length;i+=1){
  const eventId=NXN_IDS[i];if(events.getCurrent()!==eventId)await events.setCurrent(eventId);else await events.newScramble();
  const result=await h.solveNormal(1100+(i*100));
  assert.equal(result.saved.eventId,eventId,`${eventId}: saved event`);assert.equal(result.saved.scramble,result.scramble,`${eventId}: saved scramble`);assert.ok(result.saved.rawTimeMs>0,`${eventId}: saved time`);
  assert.equal(events.getCurrentSession().solves[0].scramble,result.scramble,`${eventId}: session solve scramble`);
  assert.ok(Number(document.getElementById('solveCount').textContent)>=1,`${eventId}: solve count did not update`);
  nxnTimerResults.push(result);
}

// 5 + 6 — Competition Mode inspection, normal, +2 and DNF, all retaining Scramble A.
const modeToggle=document.getElementById('competitionModeToggle');const inspectionToggle=document.getElementById('competitionInspectionToggle');
assert.ok(modeToggle&&inspectionToggle,'Competition controls are missing');
modeToggle.checked=true;modeToggle.dispatchEvent(new window.Event('change',{bubbles:true}));inspectionToggle.checked=true;inspectionToggle.dispatchEvent(new window.Event('change',{bubbles:true}));
assert.equal(events.getCompetitionSettings().mode,true);assert.equal(events.getCompetitionSettings().inspection,true);
await events.setCurrent('333');
async function competitionAttempt(inspectMs,expectedPenalty,label){
  await events.newScramble();const scramble=events.getCurrentScramble();const before=h.history().length;
  await h.enterInspection();assert.equal(events.getActiveSolveScramble(),scramble,`${label}: inspection snapshot`);
  await h.startFromInspection(inspectMs);assert.equal(events.getActiveSolveScramble(),scramble,`${label}: running snapshot`);
  await h.stopRunning(1200);await waitFor(()=>h.history().length===before+1,`${label}: save`);const saved=h.history()[0];
  assert.equal(saved.scramble,scramble,`${label}: saved scramble`);assert.equal(saved.penalty,expectedPenalty,`${label}: penalty`);await h.waitGenerated();return saved;
}
await competitionAttempt(1000,'OK','competition OK');
await competitionAttempt(15550,'+2','competition +2');
await competitionAttempt(17550,'DNF','competition DNF');
modeToggle.checked=false;modeToggle.dispatchEvent(new window.Event('change',{bubbles:true}));

// 7 — Active Solve race: external B generation cannot contaminate saved A; UI New Scramble remains blocked while running.
await events.setCurrent('444');await events.newScramble();const activeA=events.getCurrentScramble();const beforeActive=h.history().length;
await h.startNormal();assert.equal(events.getActiveSolveScramble(),activeA);
h.setPrimary(async()=>"Rw F2 U Rw'");const externalB=await window.SSCScrambleProvider.generate('444');assert.equal(externalB,"Rw F2 U Rw'");
assert.equal(await events.newScramble(),null,'New Scramble must remain blocked during active solve');
await h.stopRunning(1400);await waitFor(()=>h.history().length===beforeActive+1,'active race solve save');assert.equal(h.history()[0].scramble,activeA,'active solve race saved wrong scramble');
h.setPrimary(async eventId=>h.makeNxNScramble(eventId));await h.waitGenerated();

// 8 — Repeat byte-for-byte, no Provider call, then another timed attempt saves the same scramble.
const repeatSource=h.history().find(s=>s.eventId==='444'&&s.scramble===activeA);assert.ok(repeatSource);
const providerBeforeRepeat=h.providerCalls.length;assert.equal(events.repeatScramble(repeatSource.scramble,repeatSource.eventId),true);await sleep(5);
h.assertCommitted('444',repeatSource.scramble,'repeat load');assert.equal(h.providerCalls.length,providerBeforeRepeat,'Repeat called Provider');
const repeatBefore=h.history().length;await h.startNormal();await h.stopRunning(1500);await waitFor(()=>h.history().length===repeatBefore+1,'repeat attempt save');assert.equal(h.history()[0].scramble,repeatSource.scramble,'repeat attempt changed scramble');await h.waitGenerated();

// 9 — Real Scramble History Previous navigation; currentScramble/DOM/Preview stay synchronized. No Next control exists in current production.
await events.setCurrent('333');const historyValues=[];
for(let i=0;i<3;i+=1){historyValues.push(await events.newScramble());await sleep(10);}
const providerBeforePrevious=h.providerCalls.length;const prevButton=document.getElementById('prevScramble');assert.ok(prevButton&&!prevButton.disabled,'Previous Scramble should be available');
prevButton.click();await sleep(10);h.assertCommitted('333',historyValues[1],'history previous #1');
prevButton.click();await sleep(10);h.assertCommitted('333',historyValues[0],'history previous #2');assert.equal(h.providerCalls.length,providerBeforePrevious,'History Previous generated a new scramble');
assert.equal(document.getElementById('nextScramble'),null,'A history Next control unexpectedly appeared; current production only implements Previous.');

// 10 — Sessions: solve in old session, create/switch session, event switch round-trip, scramble persistence.
await events.newScramble();const originalSession=events.getCurrentSession();const oldSessionSolve=(await h.solveNormal(1600)).saved;
const originalPrompt=window.prompt;window.prompt=()=> 'Regression Session';document.getElementById('addSession').click();window.prompt=originalPrompt;await sleep(5);
const newSession=events.getCurrentSession();assert.notEqual(newSession.id,originalSession.id);assert.equal(newSession.name,'Regression Session');
await events.newScramble();const newSessionSolve=(await h.solveNormal(1700)).saved;
const sessionSelect=document.getElementById('sessionSelect');sessionSelect.value=originalSession.id;sessionSelect.dispatchEvent(new window.Event('change',{bubbles:true}));await sleep(5);
assert.equal(events.getCurrentSession().id,originalSession.id);assert.ok(events.getCurrentSession().solves.some(s=>s.id===oldSessionSolve.id&&s.scramble===oldSessionSolve.scramble));
await events.setCurrent('777');await events.setCurrent('333');assert.equal(events.getCurrentSession().id,originalSession.id,'active session not restored after event round-trip');
sessionSelect.value=newSession.id;sessionSelect.dispatchEvent(new window.Event('change',{bubbles:true}));await sleep(5);assert.ok(events.getCurrentSession().solves.some(s=>s.id===newSessionSolve.id&&s.scramble===newSessionSolve.scramble));

// 11 + saved-solve integrity — build 12 solves in one 333 session, verify stats and each attempt's event/scramble/time.
const integrity=[];await events.setCurrent('333');
for(let i=0;i<12;i+=1){await events.newScramble();const expectedScramble=events.getCurrentScramble();const expectedEvent=events.getCurrent();const result=await h.solveNormal(1800+(i*50));
  integrity.push({id:result.saved.id,eventId:expectedEvent,scramble:expectedScramble});assert.equal(result.saved.eventId,expectedEvent);assert.equal(result.saved.scramble,expectedScramble);assert.ok(result.saved.rawTimeMs>0);
}
for(const expected of integrity){const saved=findSolve(window.localStorage,expected.id);assert.equal(saved.eventId,expected.eventId);assert.equal(saved.scramble,expected.scramble);assert.ok(Number(saved.rawTimeMs)>0);}
assert.notEqual(document.getElementById('quickAo5').textContent,'—','Ao5 did not calculate');assert.notEqual(document.getElementById('quickAo12').textContent,'—','Ao12 did not calculate');
const primaryStats=document.getElementById('statsPrimary');assert.ok(primaryStats?.textContent.includes('Single'));assert.ok(!primaryStats.textContent.includes('Single—'),'Best Single missing');
document.getElementById('moreStatsButton').click();assert.equal(document.getElementById('statsGrid').hidden,false);assert.match(document.getElementById('statsGrid').textContent,/Mean|ממוצע/,'Mean statistic missing');

// 12 — Solve management: +2, DNF, delete/undo, Notes and Tags all preserve scramble.
const managed=h.history().find(s=>s.id===integrity.at(-1).id);assert.ok(managed);const managedScramble=managed.scramble;
assert.equal(events.setPenalty(managed.id,'+2'),true);assert.equal(findSolve(window.localStorage,managed.id).scramble,managedScramble);
assert.equal(events.setPenalty(managed.id,'DNF'),true);assert.equal(findSolve(window.localStorage,managed.id).scramble,managedScramble);
assert.equal(events.setPenalty(managed.id,'OK'),true);
assert.equal(events.deleteSolve(managed.id),true);assert.equal(findSolve(window.localStorage,managed.id),null);assert.equal(events.undoDelete(),true);assert.equal(findSolve(window.localStorage,managed.id).scramble,managedScramble);
await sleep(10);const row=[...document.querySelectorAll('.solve-row')].find(el=>el.textContent.includes(managedScramble));assert.ok(row,'managed solve row missing');row.click();await sleep(20);
const metadata=document.querySelector('.solve-metadata-editor');assert.ok(metadata,'Notes/Tags metadata editor missing');const tagInput=metadata.querySelector('.tag-picker input');assert.ok(tagInput);tagInput.checked=true;tagInput.dispatchEvent(new window.Event('change',{bubbles:true}));
const note=metadata.querySelector('textarea');note.value='Phase 5 regression note';note.dispatchEvent(new window.Event('change',{bubbles:true}));await sleep(10);
const managedAfter=findSolve(window.localStorage,managed.id);assert.equal(managedAfter.scramble,managedScramble);assert.equal(managedAfter.note,'Phase 5 regression note');assert.ok(Array.isArray(managedAfter.tags)&&managedAfter.tags.length>=1);
document.querySelector('[data-solve-close]')?.click();

// 13 — Ctrl/Cmd+2..7 use the same production setEvent -> Provider -> Preview path. No New Scramble keyboard shortcut exists.
for(const eventId of NXN_IDS){const number=String(NXN[eventId]);const before=h.providerCalls.length;h.dispatchKey('keydown',{key:number,code:`Digit${number}`,ctrlKey:true});await waitFor(()=>events.getCurrent()===eventId&&!events.isGeneratingScramble(),`Ctrl+${number}`);await sleep(5);assert.ok(h.providerCalls.length>before,`Ctrl+${number} did not use Provider`);h.assertCommitted(eventId,events.getCurrentScramble(),`Ctrl+${number}`);}
const appSource=fs.readFileSync('code/js/app.js','utf8');assert.doesNotMatch(appSource,/shortcutNewScramble|KeyR.*newScramble|KeyG.*newScramble/,'Unexpected dedicated New Scramble keyboard path detected');

// 14 — Hebrew/English switch, then Event/New Scramble: IDs and Preview remain canonical.
await events.setCurrent('333');await events.newScramble();const langProviderBefore=h.providerCalls.length;document.getElementById('languageToggle').click();assert.equal(document.documentElement.lang,'en');assert.equal(events.getCurrent(),'333');assert.equal(events.getCurrentScramble(),document.getElementById('scramble').textContent.trim());
await events.setCurrent('777');const englishScramble=events.getCurrentScramble();h.assertCommitted('777',englishScramble,'English event switch');document.getElementById('languageToggle').click();assert.equal(document.documentElement.lang,'he');await events.newScramble();h.assertCommitted('777',events.getCurrentScramble(),'Hebrew new scramble');assert.ok(h.providerCalls.length>langProviderBefore);

// 15 — Light/Dark/OLED on 333 and 777; theme changes may rerender but never generate or alter scramble.
for(const eventId of ['333','777']){await events.setCurrent(eventId);await events.newScramble();for(const theme of ['light','dark','oled']){const scramble=events.getCurrentScramble();const calls=h.providerCalls.length;document.querySelector(`[data-theme-choice="${theme}"]`).click();await sleep(15);assert.equal(document.documentElement.dataset.theme,theme);assert.equal(events.getCurrentScramble(),scramble);assert.equal(h.providerCalls.length,calls,`${theme}: theme change generated scramble`);assert.equal(h.lastPreview()?.scramble,scramble,`${theme}: preview lost scramble`);}}

// 16 + 17 — Existing Preview settings, resize, interaction/modal and cube colors never generate a scramble.
for(const eventId of ['333','777']){await events.setCurrent(eventId);await events.newScramble();const scramble=events.getCurrentScramble();const providerBefore=h.providerCalls.length;
  await window.SSCPreviewSettings.setMode('2d');await sleep(10);assert.equal(events.getCurrentScramble(),scramble);assert.equal(h.lastPreview()?.scramble,scramble);
  window.SSCPreviewSizing.setPreviewSize(300);await sleep(10);assert.equal(events.getCurrentScramble(),scramble);assert.equal(h.providerCalls.length,providerBefore);
  window.SSCPreviewSettings.setInteractive(false);window.SSCPreviewSettings.setInteractive(true);await window.SSCPreviewSettings.setMode('3d');await sleep(10);await window.SSCPreviewSettings.open(h.previewEl);assert.equal(window.SSCPreviewSettings.isOpen(),true);window.SSCPreviewSettings.close();assert.equal(window.SSCPreviewSettings.isOpen(),false);
  const colors=window.SSCCubePreview.getColors();const original=colors.U;window.SSCCubePreview.setColors({...colors,U:original.toLowerCase()==='#ffffff'?'#eeeeee':'#ffffff'});await sleep(15);assert.equal(events.getCurrentScramble(),scramble);assert.equal(h.providerCalls.length,providerBefore,'preview/color setting generated scramble');assert.equal(h.lastPreview()?.scramble,scramble);window.SSCCubePreview.setColors(colors);
}
assert.equal(document.querySelector('[data-preview-visible],#previewVisibilityToggle,#previewPositionSelect'),null,'Unexpected hide/position control surfaced; current production has no such control to regress.');

// 18 + 19 — Training: Cross random 333 -> Provider; PLL/OLL dedicated setups stay dedicated; Practice is exact repeat.
await events.setCurrent('333');
window.SSCTraining.setMode('cross');await waitFor(()=>events.getCurrent()==='333'&&!events.isGeneratingScramble(),'Cross mode initial scramble');const crossBefore=h.providerCalls.length;const crossScramble=await events.newScramble();assert.ok(h.providerCalls.length>crossBefore);assert.equal(h.providerCalls.at(-1),'333');h.assertCommitted('333',crossScramble,'Cross Trainer');
const crossHistoryBefore=h.history().length;await h.enterInspection();await h.startFromInspection(1000);await h.stopRunning(1300);await waitFor(()=>h.history().length===crossHistoryBefore+1,'Cross training solve');assert.equal(h.history()[0].training?.type,'cross');assert.equal(h.history()[0].scramble,crossScramble);await h.waitGenerated();
for(const mode of ['pll','oll']){const before=h.providerCalls.length;window.SSCTraining.setMode(mode);await waitFor(()=>!events.isGeneratingScramble(),`${mode} generated setup`);await sleep(10);assert.equal(h.providerCalls.length,before,`${mode} incorrectly used random Provider`);assert.ok(events.getCurrentScramble(),`${mode} setup empty`);assert.equal(h.lastPreview()?.scramble,events.getCurrentScramble(),`${mode} preview mismatch`);}
window.SSCTraining.setMode('normal');await h.waitGenerated();
const practiceSource=h.history().find(s=>!s.practice&&!s.training&&s.eventId==='333');assert.ok(practiceSource);const practiceProviderBefore=h.providerCalls.length;window.SSCTraining.startPractice(practiceSource);await waitFor(()=>events.getCurrent()==='333'&&events.getCurrentScramble()===practiceSource.scramble,'Practice exact scramble');assert.equal(h.providerCalls.length,practiceProviderBefore,'Practice repeat called Provider');
const practiceBefore=h.history().length;await h.startNormal();await h.stopRunning(1250);await waitFor(()=>h.history().length===practiceBefore+1,'Practice attempt save');assert.equal(h.history()[0].scramble,practiceSource.scramble);assert.equal(h.history()[0].practice,true);window.SSCTraining.setMode('normal');await h.waitGenerated();

// 20 — Legacy non-NxN production path: generator + timer + save + existing WCA preview; Provider must not run.
for(const [eventId,legacyScramble] of Object.entries(LEGACY_EVENTS)){
  h.setLegacy(async id=>LEGACY_EVENTS[id]);const providerBefore=h.providerCalls.length;const legacyBefore=h.legacyCalls.length;
  if(events.getCurrent()===eventId)await events.newScramble();else await events.setCurrent(eventId);
  assert.equal(h.providerCalls.length,providerBefore,`${eventId}: NxN Provider was called`);assert.ok(h.legacyCalls.length>legacyBefore,`${eventId}: existing SSCScrambles path not called`);h.assertCommitted(eventId,legacyScramble,`${eventId} legacy`);
  const display=h.previewEl.querySelector('scramble-display');assert.ok(display,`${eventId}: existing WCA preview missing`);assert.equal(display.getAttribute('scramble'),legacyScramble);
  const before=h.history().length;await h.startNormal();await h.stopRunning(1350);await waitFor(()=>h.history().length===before+1,`${eventId}: solve saved`);assert.equal(h.history()[0].eventId,eventId);assert.equal(h.history()[0].scramble,legacyScramble);await h.waitGenerated();
}

// 21 — Force cubing generation failure for every NxN; existing fallback must feed the same string to UI+Preview.
const expectedFailureErrorsStart=h.consoleLog.errors.length;
h.setPrimary(async()=>{throw new Error('Phase 5 forced cubing failure');});
for(const eventId of NXN_IDS){const fallback=`${BASE_NXN[eventId]} U2`;h.setLegacy(async id=>{assert.equal(id,eventId);return fallback;});if(events.getCurrent()===eventId)await events.newScramble();else await events.setCurrent(eventId);h.assertCommitted(eventId,fallback,`${eventId} production fallback`);}
assert.ok(h.consoleLog.errors.slice(expectedFailureErrorsStart).filter(args=>args[0]==='[SSC Scramble] cubing.js generation failed').length>=NXN_IDS.length,'Provider failure diagnostic missing for fallback matrix');

// 22 — Total failure: currentScramble/DOM/Preview remain previous; Timer remains usable.
h.setPrimary(async()=>{throw new Error('Phase 5 forced primary total failure');});h.setLegacy(async()=>{throw new Error('Phase 5 forced legacy total failure');});
await events.setCurrent('333'); // This may fail but preserves previous cross-event string; obtain a valid 333 first below if needed.
h.setPrimary(async eventId=>h.makeNxNScramble(eventId));h.setLegacy(async eventId=>h.makeNxNScramble(eventId));await events.newScramble();const stable=events.getCurrentScramble();const stablePreview=h.lastPreview();
h.setPrimary(async()=>{throw new Error('Phase 5 forced primary total failure');});h.setLegacy(async()=>{throw new Error('Phase 5 forced legacy total failure');});const totalErrorStart=h.consoleLog.errors.length;assert.equal(await events.newScramble(),null);assert.equal(events.getCurrentScramble(),stable);assert.equal(h.scrambleEl.textContent.trim(),stable);assert.equal(h.lastPreview()?.scramble,stablePreview.scramble);assert.ok(h.consoleLog.errors.slice(totalErrorStart).some(args=>args[0]==='[SSC Scramble] unable to generate new scramble'));
await h.startNormal();h.setPrimary(async eventId=>h.makeNxNScramble(eventId));h.setLegacy(async eventId=>h.makeNxNScramble(eventId));await h.stopRunning(1450);await h.waitGenerated();assert.ok(events.getCurrentScramble(),'Timer unusable after total generation failure');

// Stress — 100 mixed NxN requests all enter Provider, resolve in reverse order; stale wins/blank/Promise/errors must be zero.
await events.setCurrent('333');const stressDeferred=[];h.setPrimary(eventId=>new Promise((resolve,reject)=>stressDeferred.push({eventId,resolve,reject})));const stressRequests=[];const stressTargets=[];
for(let i=0;i<100;i+=1){const eventId=NXN_IDS[i%NXN_IDS.length];stressTargets.push(eventId);const p=events.getCurrent()===eventId?events.newScramble():events.setCurrent(eventId);stressRequests.push(p);await waitFor(()=>stressDeferred.length===i+1,`stress request ${i+1}`);assert.ok(events.getCurrentScramble(),`stress request ${i+1}: blank scramble`);assert.notEqual(h.scrambleEl.textContent.trim(),'[object Promise]');}
const stressValues=stressDeferred.map((item,index)=>`${BASE_NXN[item.eventId]} ${UNIVERSAL_SUFFIXES[index%UNIVERSAL_SUFFIXES.length]} ${index%2?'U':'D'}`);
for(let i=stressDeferred.length-1;i>=0;i-=1){stressDeferred[i].resolve(stressValues[i]);if(i%10===0)await sleep(0);}
await Promise.all(stressRequests);const finalStressEvent=stressTargets.at(-1),finalStressScramble=stressValues.at(-1);h.assertCommitted(finalStressEvent,finalStressScramble,'100-request stress');assert.equal(events.isGeneratingScramble(),false);
h.setPrimary(async eventId=>h.makeNxNScramble(eventId));

// 24 — Reload: settings/session/history survive; startup creates a valid new scramble and an old solve can still Repeat exactly.
await events.setCurrent('333');document.querySelector('[data-theme-choice="dark"]').click();if(document.documentElement.lang!=='en')document.getElementById('languageToggle').click();await events.newScramble();const preReloadHistory=h.history();const reloadRepeatSource=preReloadHistory.find(s=>s.id===legacyPreMigrationSolve.id);const persistedSessionId=events.getCurrentSession().id;const storageBeforeReload=h.storageSnapshot();
h.dom.window.close();
const r=await createHarness(storageBeforeReload);assert.equal(r.document.documentElement.lang,'en');assert.equal(r.document.documentElement.dataset.theme,'dark');assert.equal(r.events.getCurrent(),'333');assert.equal(r.events.getCurrentSession().id,persistedSessionId);assert.ok(r.history().some(s=>s.id===legacyPreMigrationSolve.id&&s.scramble===legacyPreMigrationSolve.scramble));assert.ok(r.events.getCurrentScramble());r.assertCommitted('333',r.events.getCurrentScramble(),'reload startup');const reloadProviderBefore=r.providerCalls.length;assert.equal(r.events.repeatScramble(reloadRepeatSource.scramble,'333'),true);await sleep(10);assert.equal(r.events.getCurrentScramble(),reloadRepeatSource.scramble);assert.equal(r.providerCalls.length,reloadProviderBefore,'Reloaded legacy Repeat called Provider');
const legacyAfterReload=findSolve(r.window.localStorage,legacyPreMigrationSolve.id);assert.equal(legacyAfterReload.scramble,legacyPreMigrationSolve.scramble);assert.equal(Object.hasOwn(legacyAfterReload,'eventId'),false,'Reload rewrote legacy solve schema');

// Console quality — only intentionally forced generation diagnostics are permitted.
const allowedError=args=>args[0]==='[SSC Scramble] cubing.js generation failed'||args[0]==='[SSC Scramble] unable to generate new scramble';
const unexpectedErrors=r.consoleLog.errors.filter(args=>!allowedError(args));const unexpectedWarnings=r.consoleLog.warnings.filter(args=>!/Professional TwistyPlayer migration/.test(String(args[0])));assert.deepEqual(unexpectedErrors,[],'Unexpected console errors after reload');assert.equal(r.jsdomErrors.length,0,`JSDOM runtime errors after reload: ${r.jsdomErrors.map(e=>e.message).join('; ')}`);
const unexpectedPrimaryErrors=h.consoleLog.errors.filter(args=>!allowedError(args));const unexpectedPrimaryWarnings=h.consoleLog.warnings.filter(args=>!/Professional TwistyPlayer migration/.test(String(args[0])));assert.deepEqual(unexpectedPrimaryErrors,[],'Unexpected console errors during full regression');assert.equal(h.jsdomErrors.length,0,`JSDOM runtime errors: ${h.jsdomErrors.map(e=>e.message).join('; ')}`);

// Static assertions: Provider is never bypassed in production callers; no Promise rendering shortcut was added.
const bridgeSource=fs.readFileSync('code/js/scramble-production-bridge.js','utf8');assert.doesNotMatch(appSource,/randomScrambleForEvent/);assert.doesNotMatch(bridgeSource,/randomScrambleForEvent/);assert.doesNotMatch(h.scrambleEl.textContent,/\[object Promise\]/);

console.log('\n[SSC Scramble Phase 5] Full regression summary');
console.log('NxN New Scramble 222–777 × repeated: PASS');
console.log('Fast New Scramble 10 in-flight / stale wins: PASS');
console.log('Rapid event switching: PASS');
console.log('Timer normal solves 222–777: PASS');
console.log('Inspection OK/+2/DNF: PASS');
console.log('Competition Mode: PASS');
console.log('Active solve snapshot race: PASS');
console.log('Repeat + repeat attempt byte-for-byte: PASS');
console.log('Scramble History Previous: PASS');
console.log('Scramble History Next: SKIPPED (not implemented in current production)');
console.log('Sessions + event round-trip: PASS');
console.log('Statistics Best/Mean/Ao5/Ao12: PASS');
console.log('Solve management Delete/Undo/+2/DNF/Notes/Tags: PASS');
console.log('Keyboard Ctrl/Cmd+2..7: PASS');
console.log('New Scramble keyboard shortcut: SKIPPED (not implemented)');
console.log('Language HE/EN: PASS');
console.log('Themes Light/Dark/OLED: PASS');
console.log('Preview mode/resize/interaction/modal: PASS');
console.log('Preview hide/position: SKIPPED (controls not implemented in current production)');
console.log('Cube colors 333/777 preserve scramble: PASS');
console.log('Training Cross/PLL/OLL/Practice: PASS');
console.log('Legacy non-NxN app flow minx/pyram/skewb/sq1/clock: PASS');
console.log('Provider fallback 222–777: PASS');
console.log('Total generation failure protection: PASS');
console.log('Legacy LocalStorage solve compatibility: PASS');
console.log('Refresh/reload persistence + startup generation: PASS');
console.log('Stress 100 mixed in-flight requests: PASS');
console.log('Saved solve integrity: 12/12 PASS (>=10 required)');
console.log(`Unexpected console errors: ${unexpectedPrimaryErrors.length+unexpectedErrors.length}`);
console.log(`Unexpected console warnings: ${unexpectedPrimaryWarnings.length+unexpectedWarnings.length}`);
console.log('Deployment: NOT PERFORMED');

r.dom.window.close();
