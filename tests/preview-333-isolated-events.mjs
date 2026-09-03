import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html lang="en"><body></body></html>',{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;

window.console=console;
window.SSC_FEATURES={previewV1:true};
window.SSCPreviewSizing={scheduleFit(){}};
window.SSCPreviewSettings={syncLastRender(){},getMode(){return'2d';}};
window.SSCPuzzle3D={dispose(){},supportsEvent(){return false;}};

const generatedEventIds=[];
const fixtureScramble="R U R' U' F2 D L2 B' U2 R2";
window.__SSC_SCRAMBLE_MODULE_LOADER__=async()=>({
  async randomScrambleForEvent(eventId){
    generatedEventIds.push(String(eventId));
    return{toString(){return fixtureScramble;}};
  }
});

function evaluate(path){
  window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);
}

function svgSignature(container){
  return[...container.querySelectorAll('.ssc-svg-sticker')]
    .map(sticker=>`${sticker.dataset.stickerId}:${sticker.dataset.layer}`)
    .join('|');
}

evaluate('code/js/wca-previews.js');
evaluate('code/js/preview/ssc-nxn-state.js');
evaluate('code/js/preview/ssc-svg-renderer.js');
evaluate('code/js/preview/ssc-preview-v1.js');
evaluate('code/js/events/333bf.js');
evaluate('code/js/events/333fm.js');
evaluate('code/js/events/333oh.js');
evaluate('code/js/scramble-generators.js');
evaluate('code/js/preview/ssc-preview-v1-integration.js');

const isolatedEvents=['333bf','333fm','333oh'];
for(const eventId of isolatedEvents){
  const module=window.SSCEventModules?.[eventId];
  assert.ok(module,`${eventId} must have a dedicated event module.`);
  assert.equal(module.id,eventId);
  assert.equal(module.order,3);
  assert.equal(module.source,'isolated-333-copy');
  assert.equal(typeof module.generate,'function');
  assert.equal(typeof module.render2D,'function');
}
assert.equal(window.SSCEventModules?.['333'],undefined,'Regular 3x3 must stay on its existing shared path.');

for(const eventId of ['333',...isolatedEvents]){
  const scramble=await window.SSCScrambleProvider.generate(eventId);
  assert.equal(scramble,fixtureScramble,`${eventId} must preserve the generated scramble text.`);
}
assert.deepEqual(
  generatedEventIds.slice(-4),
  ['333','333bf','333fm','333oh'],
  'Each isolated event must ask cubing.js for its own existing event id while 3x3 remains unchanged.'
);

const baseContainer=window.document.createElement('div');
window.document.body.appendChild(baseContainer);
await window.SSCCubePreview.render(baseContainer,fixtureScramble,'333');
assert.equal(baseContainer.dataset.previewEngine,'ssc-native-v1');
assert.equal(baseContainer.dataset.wcaEvent,'333');
assert.equal(baseContainer.dataset.previewModule,undefined);
const baseSignature=svgSignature(baseContainer);
assert.ok(baseSignature,'Base 3x3 preview must render stickers.');

for(const eventId of isolatedEvents){
  const container=window.document.createElement('div');
  window.document.body.appendChild(container);
  await window.SSCCubePreview.render(container,fixtureScramble,eventId);
  assert.equal(container.dataset.previewEngine,'ssc-native-v1');
  assert.equal(container.dataset.previewModule,eventId,`${eventId} must render through its own copied module.`);
  assert.equal(container.dataset.wcaEvent,eventId);
  assert.equal(container.dataset.puzzle,'3×3');
  assert.equal(svgSignature(container),baseSignature,`${eventId} must look exactly like 3x3 for the same scramble today.`);
}

const aliases={
  '3bld':'333bf',
  'fmc':'333fm',
  'oh':'333oh'
};
for(const [alias,eventId] of Object.entries(aliases)){
  const container=window.document.createElement('div');
  window.document.body.appendChild(container);
  await window.SSCCubePreview.render(container,fixtureScramble,alias);
  assert.equal(container.dataset.previewModule,eventId,`${alias} must route to ${eventId}'s dedicated module.`);
  assert.equal(container.dataset.wcaEvent,eventId);
}

console.log('[SSC Preview CI] Isolated 3x3-derived event modules');
console.log(JSON.stringify({
  ok:true,
  baseEvent:'333',
  isolatedEvents,
  sameCurrentAppearance:true,
  independentGeneratorFiles:true,
  independentPreviewFiles:true
},null,2));

dom.window.close();