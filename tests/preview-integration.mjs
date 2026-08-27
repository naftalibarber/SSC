import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

class FakeElement{
  constructor(){this.dataset={};this.childElementCount=0;}
}

globalThis.window=globalThis;
globalThis.Element=FakeElement;
globalThis.SSC_FEATURES={previewV1:true};

let legacyCalls=0;
let legacySetColors=0;
let legacyResetColors=0;
let legacyMode='ok';
let managerCalls=0;
let v1Calls=0;
let v1Mode='ok';
let fitCalls=0;
let colors={U:'#ffffff',D:'#ffd500',F:'#16a34a',B:'#2563eb',R:'#ef4444',L:'#f97316'};

const legacyPreview={
  render(container,scramble,eventId){
    legacyCalls++;
    if(legacyMode==='throw')throw new Error('forced legacy failure');
    container.childElementCount=1;
    return{engine:'legacy',scramble,eventId};
  },
  setColors(){legacySetColors++;},
  resetColors(){legacyResetColors++;},
  getEvent(eventId){return{id:eventId};}
};

globalThis.SSCCubePreview=legacyPreview;
globalThis.SSCPreviewManager={
  async render({container,eventId,scramble,mode}){
    managerCalls++;
    container.childElementCount=1;
    return{engine:'manager',eventId,scramble,mode};
  }
};
globalThis.SSCPreviewSizing={scheduleFit(){fitCalls++;}};
globalThis.SSCPreviewV1={
  normalizeEventId(eventId){
    const raw=String(eventId).toLowerCase();
    if(raw==='2x2'||raw==='2×2')return'222';
    if(raw==='3x3'||raw==='3×3')return'333';
    if(raw==='4x4'||raw==='4×4')return'444';
    if(raw==='5x5'||raw==='5×5')return'555';
    return raw;
  },
  render(container,scramble,eventId){
    v1Calls++;
    if(v1Mode==='throw')throw new Error('forced V1 failure');
    container.childElementCount=1;
    container.dataset.previewEngine='ssc-native-v1';
    return{svg:{engine:'v1',scramble,eventId}};
  },
  getColors(){return{...colors};},
  setColors(next){colors={...colors,...next};return{...colors};},
  resetColors(){colors={U:'#ffffff',D:'#ffd500',F:'#16a34a',B:'#2563eb',R:'#ef4444',L:'#f97316'};return{...colors};}
};

await import(pathToFileURL(resolve('code/js/preview/ssc-preview-v1-integration.js')).href);

assert.equal(globalThis.SSCPreviewV1Integration.featureEnabled(),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('222'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('3x3'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('4×4'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('5x5'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('666'),false);

const twoContainer=new FakeElement();
const twoResult=await globalThis.SSCCubePreview.render(twoContainer,"R U R'",'222');
assert.equal(twoResult.engine,'v1');

const threeContainer=new FakeElement();
const threeResult=await globalThis.SSCCubePreview.render(threeContainer,"R U R' U'",'333');
assert.equal(threeResult.engine,'v1');

const fourContainer=new FakeElement();
const fourResult=await globalThis.SSCCubePreview.render(fourContainer,"Rw U2 Fw'",'444');
assert.equal(fourResult.engine,'v1');

const fiveContainer=new FakeElement();
const fiveResult=await globalThis.SSCCubePreview.render(fiveContainer,"Rw U2 Fw' Lw D2",'555');
assert.equal(fiveResult.engine,'v1');
assert.equal(v1Calls,4);
assert.equal(legacyCalls,0);
assert.equal(fiveContainer.dataset.previewMode,'2d');

const sixContainer=new FakeElement();
const sixResult=await globalThis.SSCCubePreview.render(sixContainer,'3Rw U2 Fw','666');
assert.equal(sixResult.engine,'legacy');
assert.equal(legacyCalls,1);
assert.equal(v1Calls,4);

v1Mode='throw';
legacyMode='ok';
const fallbackContainer=new FakeElement();
const fallbackResult=await globalThis.SSCCubePreview.render(fallbackContainer,'Rw U2 Fw','555');
assert.equal(fallbackResult.engine,'legacy');
assert.equal(fallbackContainer.childElementCount,1);
assert.equal(v1Calls,5);
assert.equal(legacyCalls,2);

legacyMode='throw';
const emergencyContainer=new FakeElement();
const emergencyResult=await globalThis.SSCCubePreview.render(emergencyContainer,'R U F','222');
assert.equal(emergencyResult.engine,'manager');
assert.equal(emergencyResult.mode,'2d');
assert.equal(emergencyContainer.childElementCount,1);
assert.equal(managerCalls,1);
assert.equal(v1Calls,6);
assert.equal(legacyCalls,3);

v1Mode='ok';
legacyMode='ok';
globalThis.SSC_FEATURES.previewV1=false;
const disabledContainer=new FakeElement();
const disabledResult=await globalThis.SSCCubePreview.render(disabledContainer,'Rw U','555');
assert.equal(disabledResult.engine,'legacy');
assert.equal(v1Calls,6);
assert.equal(legacyCalls,4);
globalThis.SSC_FEATURES.previewV1=true;

const changed=globalThis.SSCCubePreview.setColors({U:'#123456'});
assert.equal(changed.U,'#123456');
assert.equal(globalThis.SSCCubePreview.getColors().U,'#123456');
assert.equal(legacySetColors,1);
const reset=globalThis.SSCCubePreview.resetColors();
assert.equal(reset.U,'#ffffff');
assert.equal(legacyResetColors,1);
assert.ok(fitCalls>=4);

const index=fs.readFileSync('index.html','utf8');
assert.equal((index.match(/SSC_FEATURES/g)||[]).length,1,'Feature flag must be defined once.');
assert.match(index,/window\.SSC_FEATURES=\{previewV1:true\}/);
assert.match(index,/code\/js\/cube-preview\.js/);
assert.match(index,/code\/js\/wca-previews\.js/);
assert.match(index,/cdn\.cubing\.net\/v0\/js\/scramble-display/);
assert.match(index,/code\/js\/puzzle-3d\.js/);

const positions={
  legacy:index.indexOf('code/js/preview-integration.js'),
  state:index.indexOf('code/js/preview/ssc-nxn-state.js'),
  renderer:index.indexOf('code/js/preview/ssc-svg-renderer.js'),
  validation:index.indexOf('code/js/preview/ssc-preview-validation.js'),
  v1:index.indexOf('code/js/preview/ssc-preview-v1.js'),
  bridge:index.indexOf('code/js/preview/ssc-preview-v1-integration.js'),
  app:index.indexOf('code/js/app.js')
};
for(const [name,position] of Object.entries(positions))assert.ok(position>=0,`${name} script is missing from index.html.`);
assert.ok(positions.state<positions.v1&&positions.renderer<positions.v1&&positions.validation<positions.v1);
assert.ok(positions.legacy<positions.bridge&&positions.bridge<positions.app);

console.log('[SSC Preview CI] Integration summary');
console.log(JSON.stringify({
  ok:true,
  routedEvents:['222','333','444','555'],
  legacyEventPreserved:'666',
  featureFlagSingle:true,
  fallbackToLegacy:true,
  emergencyLegacy2D:true,
  colorApiWired:true
},null,2));
