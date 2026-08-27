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

const EVENTS=Object.freeze({222:2,333:3,444:4,555:5,666:6,777:7});
const legacy=globalThis.SSCLegacyScrambleFallback;
const fallbackCalls=[];
globalThis.SSCLegacyScrambleFallback=Object.freeze({
  ...legacy,
  generate(eventId){
    fallbackCalls.push(eventId);
    return legacy.generate(eventId);
  }
});

let moduleLoads=0;
globalThis.__SSC_SCRAMBLE_MODULE_LOADER__=async()=>{
  moduleLoads+=1;
  return{
    async randomScrambleForEvent(eventId){
      throw new Error(`forced cubing.js generation failure for ${eventId}`);
    }
  };
};

const capturedErrors=[];
const originalConsoleError=console.error;
console.error=(...args)=>capturedErrors.push(args);

await loadClassic('code/js/scramble-provider.js');
const provider=globalThis.SSCScrambleProvider;
assert.ok(provider,'SSCScrambleProvider must exist.');
assert.equal(provider.getSourceInfo().productionIntegrated,false,'Fallback validation must not integrate production.');

const results={};
const failures=[];
let stateParsingPass=true;
let previewCompatibilityPass=true;
let unsupportedNotation=0;

try{
  for(const [eventId,order] of Object.entries(EVENTS)){
    try{
      const beforeCalls=fallbackCalls.length;
      const scramble=await provider.generate(eventId);
      assert.equal(fallbackCalls.length,beforeCalls+1,`${eventId}: legacy fallback must run exactly once.`);
      assert.equal(fallbackCalls.at(-1),eventId,`${eventId}: legacy fallback received wrong eventId.`);
      assert.equal(typeof scramble,'string',`${eventId}: fallback must resolve to a string.`);
      assert.ok(scramble.trim(),`${eventId}: fallback scramble must not be empty.`);
      assert.notEqual(scramble,'[object Promise]',`${eventId}: Promise text leaked from fallback.`);

      const moves=globalThis.SSCNxNState.normalizeScramble(scramble);
      assert.ok(moves.length>0,`${eventId}: fallback scramble must contain moves.`);
      for(const move of moves){
        if(!globalThis.SSCNxNState.parseMove(move,order)){
          unsupportedNotation+=1;
          throw new Error(`${eventId}: unsupported notation ${move}`);
        }
      }

      const state=globalThis.SSCNxNState.buildState(scramble,order,{strict:true});
      assert.equal(state.ignoredMoves.length,0,`${eventId}: fallback State Engine ignored moves.`);

      const container=new FakeElement('div');
      const preview=globalThis.SSCPreviewV1.render(container,scramble,eventId,{strict:true});
      assert.equal(preview.eventId,eventId,`${eventId}: fallback Preview used wrong event.`);
      assert.equal(preview.order,order,`${eventId}: fallback Preview used wrong order.`);
      assert.ok(preview.svg,`${eventId}: fallback Preview did not produce SVG.`);
      assert.equal(preview.state.ignoredMoves.length,0,`${eventId}: fallback Preview ignored moves.`);
      results[eventId]={ok:true};
    }catch(error){
      if(String(error?.message||error).includes('State'))stateParsingPass=false;
      if(String(error?.message||error).includes('Preview'))previewCompatibilityPass=false;
      results[eventId]={ok:false,error:String(error?.stack||error)};
      failures.push({eventId,error:String(error?.stack||error)});
    }
  }
}finally{
  console.error=originalConsoleError;
}

const requiredLogs=Object.keys(EVENTS).every(eventId=>capturedErrors.some(args=>
  args[0]==='[SSC Scramble] cubing.js generation failed'&&args[1]?.eventId===eventId
));
const fallbackPass=Object.values(results).every(result=>result.ok)&&fallbackCalls.length===6&&requiredLogs;
const moduleCachePass=moduleLoads===1;
stateParsingPass=stateParsingPass&&Object.values(results).every(result=>result.ok);
previewCompatibilityPass=previewCompatibilityPass&&Object.values(results).every(result=>result.ok);

console.log('\n[SSC Scramble Provider CI] Isolated fallback summary');
for(const eventId of Object.keys(EVENTS))console.log(`${eventId}: ${results[eventId]?.ok?'PASS':'FAIL'}`);
console.log(`Fallback: ${fallbackPass?'PASS':'FAIL'}`);
console.log(`Fallback State parsing: ${stateParsingPass?'PASS':'FAIL'}`);
console.log(`Fallback Preview compatibility: ${previewCompatibilityPass?'PASS':'FAIL'}`);
console.log(`Fallback unsupported notation: ${unsupportedNotation===0?'NONE':unsupportedNotation}`);
console.log(`cubing.js module cache under forced generation failure: ${moduleCachePass?'PASS':'FAIL'} (loads=${moduleLoads})`);
console.log(`Required failure diagnostic: ${requiredLogs?'PASS':'FAIL'}`);
console.log('Production integration: NOT PERFORMED');

if(!fallbackPass||!stateParsingPass||!previewCompatibilityPass||unsupportedNotation!==0||!moduleCachePass||!requiredLogs){
  failures.forEach(failure=>console.error(JSON.stringify(failure,null,2)));
  process.exit(1);
}
