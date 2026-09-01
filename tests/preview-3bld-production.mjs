import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

class FakeClassList{
  constructor(){this.values=new Set();}
  add(...names){names.forEach(name=>this.values.add(name));}
  remove(...names){names.forEach(name=>this.values.delete(name));}
  contains(name){return this.values.has(name);}
  [Symbol.iterator](){return this.values[Symbol.iterator]();}
}

class FakeStyle{
  constructor(){this.values=new Map();}
  setProperty(name,value){this.values.set(name,String(value));}
  removeProperty(name){const value=this.values.get(name)||'';this.values.delete(name);return value;}
}

class FakeElement{
  constructor(tagName='div'){
    this.tagName=String(tagName).toUpperCase();
    this.attributes={};
    this.children=[];
    this.dataset={};
    this.classList=new FakeClassList();
    this.style=new FakeStyle();
    this.childElementCount=0;
    this.isConnected=true;
  }
  setAttribute(name,value){this.attributes[name]=String(value);}
  appendChild(child){this.children.push(child);this.childElementCount=this.children.length;return child;}
  replaceChildren(...children){this.children=[...children];this.childElementCount=this.children.length;}
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
globalThis.SSCPreviewSettings={syncLastRender(){}};
globalThis.SSC_FEATURES={previewV1:true};
globalThis.__SSC_SCRAMBLE_MODULE_LOADER__=()=>import('cubing/scramble');

async function load(path){await import(pathToFileURL(resolve(path)).href);}

await load('code/js/wca-previews.js');
const legacyPreview=globalThis.SSCCubePreview;
await load('code/js/preview/ssc-nxn-state.js');
await load('code/js/preview/ssc-svg-renderer.js');
await load('code/js/preview/ssc-preview-v1.js');
await load('code/js/scramble-generators.js');

assert.equal(globalThis.SSCPreviewV1.orderForEvent('333bf'),3);
assert.equal(globalThis.SSCPreviewV1.normalizeEventId('3bld'),'333bf');

const samples=30;
for(let index=0;index<samples;index+=1){
  const scramble=await globalThis.SSCScrambleProvider.generate('333bf');
  assert.ok(scramble.trim(),`3BLD scramble ${index+1} must not be empty.`);

  const bldState=globalThis.SSCPreviewV1.getState('333bf',scramble);
  const cubeState=globalThis.SSCPreviewV1.getState('333',scramble);
  assert.deepEqual(bldState,cubeState,`3BLD scramble ${index+1} must produce the exact 3x3 state.`);

  const container=new FakeElement();
  const result=globalThis.SSCPreviewV1.render(container,scramble,'333bf',{strict:true});
  assert.equal(result.order,3);
  assert.equal(result.eventId,'333bf');
  assert.equal(container.dataset.previewEngine,'ssc-native-v1');
  assert.equal(container.dataset.wcaEvent,'333bf');
  assert.equal(container.children.length,1);
}

// Install the production integration around the real legacy preview and confirm
// the public render entry point routes 3BLD to V1 rather than scramble-display.
globalThis.SSCCubePreview=legacyPreview;
let v1Calls=0;
const nativeRender=globalThis.SSCPreviewV1.render.bind(globalThis.SSCPreviewV1);
globalThis.SSCPreviewV1={...globalThis.SSCPreviewV1,render(...args){v1Calls+=1;return nativeRender(...args);}};
await load('code/js/preview/ssc-preview-v1-integration.js');
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('333bf'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('3bld'),true);

const productionScramble=await globalThis.SSCScrambleProvider.generate('333bf');
const productionContainer=new FakeElement();
await globalThis.SSCCubePreview.render(productionContainer,productionScramble,'333bf');
assert.equal(v1Calls,1,'Production SSCCubePreview.render must call native V1 for 3BLD.');
assert.equal(productionContainer.dataset.previewEngine,'ssc-native-v1');
assert.equal(productionContainer.dataset.wcaEvent,'333bf');

console.log(JSON.stringify({ok:true,event:'333bf',samples,productionRoute:'ssc-native-v1'},null,2));
