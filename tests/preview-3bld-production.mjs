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
let previewMode='2d';
globalThis.SSCPreviewSettings={syncLastRender(){},getMode(){return previewMode;}};
globalThis.SSC_FEATURES={previewV1:true};
globalThis.__SSC_SCRAMBLE_MODULE_LOADER__=()=>import('cubing/scramble');

async function load(path){await import(pathToFileURL(resolve(path)).href);}

await load('code/js/wca-previews.js');
const registryPreview=globalThis.SSCCubePreview;
await load('code/js/preview/ssc-nxn-state.js');
await load('code/js/preview/ssc-svg-renderer.js');
await load('code/js/preview/ssc-preview-v1.js');
await load('code/js/scramble-generators.js');

assert.equal(globalThis.SSCPreviewV1.orderForEvent('333bf'),3);
assert.equal(globalThis.SSCPreviewV1.normalizeEventId('3bld'),'333bf');
assert.equal(globalThis.SSCNxNState.parseMove("Fw'",3)?.layerDepth,2,'3BLD-oriented 3x3 wide moves must parse.');

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

let connected3DCalls=0;
globalThis.SSCPuzzle3D={
  supportsEvent(eventId){return ['333','333bf','333fm','333oh'].includes(String(eventId));},
  dispose(){},
  getEvent(eventId){return registryPreview.getEvent?.(eventId)||null;}
};
globalThis.SSCCubePreview={
  ...registryPreview,
  async render(container,_scramble,eventId){
    connected3DCalls+=1;
    container.dataset.previewMode='3d';
    container.dataset.previewEngine='ssc-native-3d';
    container.dataset.wcaEvent=eventId;
    container.childElementCount=1;
    return{engine:'ssc-native-3d',eventId};
  }
};

let v1Calls=0;
const nativeRender=globalThis.SSCPreviewV1.render.bind(globalThis.SSCPreviewV1);
globalThis.SSCPreviewV1={...globalThis.SSCPreviewV1,render(...args){v1Calls+=1;return nativeRender(...args);}};
await load('code/js/preview/ssc-preview-v1-integration.js');
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('333bf'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('3bld'),true);

const productionScramble=await globalThis.SSCScrambleProvider.generate('333bf');

previewMode='2d';
const twoDContainer=new FakeElement();
await globalThis.SSCCubePreview.render(twoDContainer,productionScramble,'333bf');
assert.equal(v1Calls,1,'2D 3BLD must call the native 3x3 V1 renderer.');
assert.equal(connected3DCalls,0,'2D 3BLD must not use the 3D connected renderer.');
assert.equal(twoDContainer.dataset.previewEngine,'ssc-native-v1');
assert.equal(twoDContainer.dataset.wcaEvent,'333bf');

previewMode='3d';
const threeDContainer=new FakeElement();
await globalThis.SSCCubePreview.render(threeDContainer,productionScramble,'333bf');
assert.equal(v1Calls,1,'3D 3BLD must not be forced back through the 2D V1 renderer.');
assert.equal(connected3DCalls,1,'3D 3BLD must use the same connected 3D route as 3x3.');
assert.equal(threeDContainer.dataset.previewEngine,'ssc-native-3d');
assert.equal(threeDContainer.dataset.wcaEvent,'333bf');
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseConnected3D(threeDContainer,'333bf'),true);

console.log(JSON.stringify({ok:true,event:'333bf',samples,twoD:'ssc-native-v1',threeD:'ssc-native-3d'},null,2));
