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
window.requestAnimationFrame=callback=>{callback();return 1;};

let legacyCalls=0;
let fitCalls=0;
const snapshots=[];
window.SSCCubePreview={
  render(container,scramble,eventId){
    legacyCalls++;
    container.textContent=`legacy:${eventId}:${scramble}`;
    return{engine:'legacy'};
  },
  getColors(){return null;},
  setColors(){return null;},
  resetColors(){return null;}
};
window.SSCPreviewSizing={scheduleFit(){fitCalls++;}};
window.SSCPreviewSettings={
  syncLastRender(container,scramble,eventId){snapshots.push({container,scramble,eventId});}
};
window.SSCPuzzle3D={dispose(){}};

function evaluate(path){
  window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);
}

evaluate('code/js/preview/ssc-nxn-state.js');
evaluate('code/js/preview/ssc-svg-renderer.js');
evaluate('code/js/preview/ssc-preview-v1.js');
evaluate('code/js/preview/ssc-preview-v1-integration.js');

const routingCases=[
  ['333','333'],
  ['333bf','333bf'],
  ['3bld','333bf'],
  ['333fm','333fm'],
  ['fmc','333fm'],
  ['333oh','333oh'],
  ['oh','333oh']
];

for(const [input] of routingCases){
  assert.equal(
    window.SSCPreviewV1Integration.shouldUseV1(input),
    true,
    `${input} must use the native 3x3 preview pipeline.`
  );
}
assert.equal(window.SSCPreviewV1Integration.shouldUseV1('444bf'),false);
assert.equal(window.SSCPreviewV1Integration.shouldUseV1('minx'),false);

const scramble="R U R' U' F2 D L2 B' U2 R2";
const signatures=new Map();

for(const [input,normalized] of routingCases){
  const container=window.document.createElement('div');
  container.className='cube-preview-card';
  window.document.body.appendChild(container);

  const svg=await window.SSCCubePreview.render(container,scramble,input);
  assert.ok(svg instanceof window.SVGElement,`${input} must return the native SVG preview.`);
  assert.equal(svg.getAttribute('data-cube-order'),'3');
  assert.equal(svg.getAttribute('data-layout-style'),'cstimer-3x3');
  assert.equal(svg.getAttribute('data-pixel-perfect-grid'),'true');
  assert.equal(container.dataset.previewEngine,'ssc-native-v1');
  assert.equal(container.dataset.wcaEvent,normalized);
  assert.equal(container.dataset.puzzle,'3×3');
  assert.equal(container.dataset.previewMode,'2d');
  assert.equal(container.querySelectorAll('.ssc-svg-sticker').length,54);

  const signature=[...container.querySelectorAll('.ssc-svg-sticker')]
    .map(sticker=>`${sticker.dataset.stickerId}:${sticker.dataset.layer}`)
    .join('|');
  signatures.set(input,signature);
}

const baseSignature=signatures.get('333');
for(const [input] of routingCases.slice(1)){
  assert.equal(
    signatures.get(input),
    baseSignature,
    `${input} must render the exact same 3x3 sticker state as 333 for an identical scramble.`
  );
}

assert.equal(legacyCalls,0,'FMC, 3BLD and OH must not fall back to the legacy scramble-display renderer.');
assert.equal(snapshots.length,routingCases.length);
assert.ok(fitCalls>=routingCases.length);

console.log('[SSC Preview CI] 3x3 derived events summary');
console.log(JSON.stringify({
  ok:true,
  events:['333bf','333fm','333oh'],
  aliases:['3bld','fmc','oh'],
  baseEvent:'333',
  sameRenderer:true,
  sameStickerState:true,
  legacyCalls
},null,2));

dom.window.close();
