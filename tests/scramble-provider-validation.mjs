import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

class FakeClassList{
  constructor(){this.values=new Set();}
  add(...names){names.forEach(name=>this.values.add(name));}
  remove(...names){names.forEach(name=>this.values.delete(name));}
  contains(name){return this.values.has(name);}
}
function datasetKey(attribute){return attribute.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());}
class FakeElement{
  constructor(tagName='div'){
    this.tagName=String(tagName).toUpperCase();this.attributes={};this.children=[];this.dataset={};
    this.classList=new FakeClassList();this.isConnected=true;this.id='';
  }
  setAttribute(name,value){
    const text=String(value);this.attributes[name]=text;if(name==='id')this.id=text;
    if(name==='class')text.split(/\s+/).filter(Boolean).forEach(item=>this.classList.add(item));
    if(name.startsWith('data-'))this.dataset[datasetKey(name)]=text;
  }
  getAttribute(name){return this.attributes[name]??null;}
  appendChild(child){this.children.push(child);child.parentNode=this;return child;}
  replaceChildren(...children){this.children=[...children];children.forEach(child=>{child.parentNode=this;});}
  querySelectorAll(selector){
    const matches=[];const visit=node=>{for(const child of node.children||[]){
      if(selector.includes('.ssc-svg-sticker')&&child.classList?.contains('ssc-svg-sticker'))matches.push(child);visit(child);
    }};visit(this);return matches;
  }
}

globalThis.window=globalThis;
globalThis.Element=FakeElement;
globalThis.document={documentElement:{lang:'en'},createElementNS(_namespace,name){return new FakeElement(name);}};
const storage=new Map();
globalThis.localStorage={
  getItem(key){return storage.has(key)?storage.get(key):null;},
  setItem(key,value){storage.set(key,String(value));},
  removeItem(key){storage.delete(key);}
};
globalThis.SSCPreviewSizing={scheduleFit(){}};

async function loadClassic(path){await import(pathToFileURL(resolve(path)).href);}
await loadClassic('code/js/scramble-provider-legacy-fallback.js');
await loadClassic('code/js/preview/ssc-nxn-state.js');
await loadClassic('code/js/preview/ssc-svg-renderer.js');
await loadClassic('code/js/preview/ssc-preview-v1.js');

const cubing=await import('cubing/scramble');
const EVENTS=Object.freeze({222:2,333:3,444:4,555:5,666:6,777:7});
const ALIASES=Object.freeze({
  '2x2':'222','2×2':'222','3x3':'333','3×3':'333','4x4':'444','4×4':'444',
  '5x5':'555','5×5':'555','6x6':'666','6×6':'666','7x7':'777','7×7':'777'
});

let moduleLoads=0;
const cubingEventCalls=[];
globalThis.__SSC_SCRAMBLE_MODULE_LOADER__=async()=>{
  moduleLoads+=1;
  return{randomScrambleForEvent:async eventId=>{
    cubingEventCalls.push(eventId);
    return cubing.randomScrambleForEvent(eventId);
  }};
};

await loadClassic('code/js/scramble-provider.js');
const provider=globalThis.SSCScrambleProvider;
assert.ok(provider,'SSCScrambleProvider must exist.');
assert.equal(provider.getSourceInfo().productionIntegrated,false,'Phase 3 must not integrate production.');

function validateCompatibility(scramble,eventId,order){
  assert.equal(typeof scramble,'string',`${eventId}: resolved scramble must be a string.`);
  assert.ok(scramble.trim(),`${eventId}: scramble must not be empty.`);
  assert.notEqual(scramble,'[object Promise]',`${eventId}: Promise text leaked into scramble.`);
  assert.equal(typeof scramble?.then,'undefined',`${eventId}: resolved value must not be Promise-like.`);
  const moves=globalThis.SSCNxNState.normalizeScramble(scramble);
  assert.ok(moves.length>0,`${eventId}: scramble must contain moves.`);
  for(const move of moves)assert.ok(globalThis.SSCNxNState.parseMove(move,order),`${eventId}: unsupported notation ${move}`);
  const state=globalThis.SSCNxNState.buildState(scramble,order,{strict:true});
  assert.equal(state.ignoredMoves.length,0,`${eventId}: State Engine ignored moves.`);
  const container=new FakeElement('div');
  const preview=globalThis.SSCPreviewV1.render(container,scramble,eventId,{strict:true});
  assert.equal(preview.eventId,eventId,`${eventId}: Preview used wrong event.`);
  assert.equal(preview.order,order,`${eventId}: Preview used wrong order.`);
  assert.ok(preview.svg,`${eventId}: Preview did not produce SVG.`);
  assert.equal(preview.state.ignoredMoves.length,0,`${eventId}: Preview state ignored moves.`);
}

const results={};
const failures=[];
let totalPassed=0;
let totalTested=0;
for(const [eventId,order] of Object.entries(EVENTS)){
  let passed=0;
  for(let i=0;i<100;i+=1){
    totalTested+=1;
    try{
      const callIndex=cubingEventCalls.length;
      const pending=provider.generate(eventId);
      assert.equal(typeof pending?.then,'function',`${eventId}: provider async boundary must return a Promise.`);
      const scramble=await pending;
      assert.equal(cubingEventCalls.length,callIndex+1,`${eventId}: cubing.js should be called exactly once per generation.`);
      assert.equal(cubingEventCalls[callIndex],eventId,`${eventId}: wrong eventId passed to cubing.js.`);
      validateCompatibility(scramble,eventId,order);
      passed+=1;totalPassed+=1;
    }catch(error){failures.push({eventId,index:i+1,error:String(error?.stack||error)});}
  }
  results[eventId]={passed,total:100,ok:passed===100};
}

let aliasesPass=true;
for(const [alias,eventId] of Object.entries(ALIASES)){
  try{
    assert.equal(provider.normalizeEventId(alias),eventId,`${alias}: alias normalized incorrectly.`);
    const callIndex=cubingEventCalls.length;
    const scramble=await provider.generate(alias);
    assert.equal(cubingEventCalls[callIndex],eventId,`${alias}: alias passed wrong eventId to cubing.js.`);
    validateCompatibility(scramble,eventId,EVENTS[eventId]);
  }catch(error){aliasesPass=false;failures.push({eventId:`alias:${alias}`,error:String(error?.stack||error)});}
}

const moduleCachePass=moduleLoads===1;
let concurrentPass=true;
try{
  const concurrent=await Promise.all([provider.generate('222'),provider.generate('333'),provider.generate('444')]);
  assert.equal(concurrent.length,3);
  assert.ok(concurrent.every(value=>typeof value==='string'&&value.trim()));
  assert.equal(moduleLoads,1,'Concurrent requests must reuse the cached cubing.js module.');
}catch(error){concurrentPass=false;failures.push({eventId:'concurrency',error:String(error?.stack||error)});}

// Provider is intentionally stateless. Latest-request-wins cannot be decided here because
// only the integration layer owns request IDs and knows which result may update the UI.
const raceOwnershipDocumented=provider.getSourceInfo().raceProtection==='integration-layer';
const unsupportedMoves=failures.filter(item=>String(item.error).includes('unsupported notation'));
const stateParsingPass=Object.values(results).every(result=>result.ok)&&unsupportedMoves.length===0;
const previewCompatibilityPass=Object.values(results).every(result=>result.ok)&&failures.every(item=>!String(item.error).includes('Preview'));

console.log('\n[SSC Scramble Provider CI] Primary validation summary');
for(const eventId of Object.keys(EVENTS)){
  const result=results[eventId];
  console.log(`${eventId}: ${result.passed}/${result.total} ${result.ok?'PASS':'FAIL'}`);
}
console.log(`\nTOTAL: ${totalPassed}/${totalTested}`);
console.log(`FAILED: ${totalTested-totalPassed}`);
console.log(`Aliases: ${aliasesPass?'PASS':'FAIL'}`);
console.log(`State parsing: ${stateParsingPass?'PASS':'FAIL'}`);
console.log(`Preview compatibility: ${previewCompatibilityPass?'PASS':'FAIL'}`);
console.log(`Unsupported notation: ${unsupportedMoves.length===0?'NONE':unsupportedMoves.length}`);
console.log(`cubing.js module cache: ${moduleCachePass?'PASS':'FAIL'} (loads=${moduleLoads})`);
console.log(`Concurrent provider calls: ${concurrentPass?'PASS':'FAIL'}`);
console.log(`Race protection ownership: ${raceOwnershipDocumented?'INTEGRATION LAYER / DOCUMENTED':'FAIL'}`);
console.log('Fallback: VALIDATED IN ISOLATED TEST PROCESS');
console.log('Production integration: NOT PERFORMED');

const allPass=totalPassed===600&&aliasesPass&&stateParsingPass&&previewCompatibilityPass&&unsupportedMoves.length===0&&moduleCachePass&&concurrentPass&&raceOwnershipDocumented;
if(!allPass){
  console.error('\n[SSC Scramble Provider CI] Failures');
  failures.slice(0,20).forEach(failure=>console.error(JSON.stringify(failure,null,2)));
  process.exit(1);
}
