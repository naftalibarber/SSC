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
    this.tagName=String(tagName).toUpperCase();
    this.attributes={};
    this.children=[];
    this.dataset={};
    this.classList=new FakeClassList();
    this.isConnected=true;
    this.id='';
  }
  setAttribute(name,value){
    const text=String(value);
    this.attributes[name]=text;
    if(name==='id')this.id=text;
    if(name==='class')text.split(/\s+/).filter(Boolean).forEach(item=>this.classList.add(item));
    if(name.startsWith('data-'))this.dataset[datasetKey(name)]=text;
  }
  getAttribute(name){return this.attributes[name]??null;}
  appendChild(child){this.children.push(child);child.parentNode=this;return child;}
  replaceChildren(...children){this.children=[...children];children.forEach(child=>{child.parentNode=this;});}
  querySelectorAll(){return[];}
}

globalThis.window=globalThis;
globalThis.Element=FakeElement;
globalThis.document={
  documentElement:{lang:'en'},
  createElementNS(_namespace,name){return new FakeElement(name);}
};

const storage=new Map();
globalThis.localStorage={
  getItem(key){return storage.has(key)?storage.get(key):null;},
  setItem(key,value){storage.set(key,String(value));},
  removeItem(key){storage.delete(key);}
};
globalThis.SSCPreviewSizing={scheduleFit(){}};
globalThis.__SSC_SCRAMBLE_MODULE_LOADER__=()=>import('cubing/scramble');

async function load(path){await import(pathToFileURL(resolve(path)).href);}

await load('code/js/wca-previews.js');
await load('code/js/preview/ssc-nxn-state.js');
await load('code/js/preview/ssc-svg-renderer.js');
await load('code/js/preview/ssc-preview-v1.js');
await load('code/js/cube2x2.js');
await load('code/js/scramble2x2.js');
await load('code/js/scramble-generators.js');

assert.equal(globalThis.SSCScrambleProvider,globalThis.SSCScrambles,'Legacy and canonical scramble APIs must reference one provider object.');

const EVENTS=Object.freeze({222:2,333:3,444:4,555:5,666:6,777:7});
const ALIASES=Object.freeze({
  '2x2':'222','2×2':'222','222':'222',
  '3x3':'333','3×3':'333','333':'333',
  '4x4':'444','4×4':'444','444':'444',
  '5x5':'555','5×5':'555','555':'555',
  '6x6':'666','6×6':'666','666':'666',
  '7x7':'777','7×7':'777','777':'777'
});

for(const [alias,eventId] of Object.entries(ALIASES)){
  assert.equal(globalThis.SSCScrambleProvider.normalizeEventId(alias),eventId,`Alias ${alias} must normalize to ${eventId}.`);
}

const perEvent=100;
const results={};
let generated=0;
let rendered=0;

for(const [eventId,order] of Object.entries(EVENTS)){
  for(let index=0;index<perEvent;index+=1){
    const generation=globalThis.SSCScrambleProvider.generate(eventId);
    assert.equal(typeof generation?.then,'function',`${eventId} generation must stay asynchronous at the provider boundary.`);
    const scramble=await generation;
    assert.equal(typeof scramble,'string',`${eventId} scramble must resolve to a string.`);
    assert.ok(scramble.trim(),`${eventId} scramble must not be empty.`);
    assert.equal(scramble.includes('[object Promise]'),false,`${eventId} scramble must never stringify a Promise.`);

    const state=globalThis.SSCNxNState.buildState(scramble,order,{strict:true});
    assert.equal(state.order,order);
    assert.deepEqual(state.ignoredMoves,[],`${eventId} contains an unsupported move.`);

    const container=new FakeElement('div');
    container.id=`scramble-${eventId}-${index}`;
    const preview=globalThis.SSCPreviewV1.render(container,scramble,eventId,{strict:true});
    assert.equal(preview.order,order,`${eventId} rendered with the wrong cube order.`);
    assert.equal(preview.eventId,eventId,`${eventId} preview normalized to the wrong event.`);
    assert.equal(container.dataset.wcaEvent,eventId,`${eventId} preview metadata mismatch.`);
    assert.ok(container.children.length===1,`${eventId} preview did not render an SVG.`);

    generated+=1;
    rendered+=1;
  }
  results[eventId]={ok:true,order,tested:perEvent};
}

assert.equal(generated,600,'NxN validation must generate exactly 600 cubing.js scrambles.');
assert.equal(rendered,600,'Every generated scramble must pass SSCPreviewV1 rendering.');

delete globalThis.__SSC_SCRAMBLE_MODULE_LOADER__;

console.log('[SSC Scramble CI] NxN generation validation summary');
console.log(JSON.stringify({
  ok:true,
  provider:'SSCScrambleProvider',
  legacyAliasSameObject:true,
  cubingVersion:'0.63.4',
  generated,
  rendered,
  failures:0,
  events:results
},null,2));
