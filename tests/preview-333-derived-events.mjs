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
window.cancelAnimationFrame=()=>{};
window.SSCWCAEvents={
  '444bf':{id:'444bf',label:'4BLD',name:'4x4x4 Blindfolded',family:'cube',puzzle:'4x4x4',baseEvent:'444'},
  '555bf':{id:'555bf',label:'5BLD',name:'5x5x5 Blindfolded',family:'cube',puzzle:'5x5x5',baseEvent:'555'}
};

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

function svgSignature(container){
  return[...container.querySelectorAll('.ssc-svg-sticker')]
    .map(sticker=>`${sticker.dataset.stickerId}:${sticker.dataset.layer}`)
    .join('|');
}

function native3DSignature(container){
  return[...container.querySelectorAll('.ssc-native-cube3d-sticker')]
    .map(sticker=>`${sticker.dataset.side}:${sticker.dataset.row}:${sticker.dataset.col}:${sticker.dataset.identity}`)
    .join('|');
}

evaluate('code/js/preview/ssc-nxn-state.js');
evaluate('code/js/preview/ssc-svg-renderer.js');
evaluate('code/js/preview/ssc-preview-v1.js');
evaluate('code/js/preview/ssc-preview-v1-integration.js');

const groups=[
  {
    base:'333',order:3,scramble:"R U R' U' F2 D L2 B' U2 R2",
    events:[['333','333'],['333bf','333bf'],['3bld','333bf'],['333fm','333fm'],['fmc','333fm'],['333oh','333oh'],['oh','333oh']]
  },
  {
    base:'444',order:4,scramble:"Rw U Rw' F2 Uw2 R2 Fw U2 Lw' D B2",
    events:[['444','444'],['444bf','444bf'],['4bld','444bf']]
  },
  {
    base:'555',order:5,scramble:"Rw U2 Fw' Lw D Rw2 B' Uw F2 Lw'",
    events:[['555','555'],['555bf','555bf'],['5bld','555bf']]
  }
];

for(const group of groups){
  for(const [input] of group.events){
    assert.equal(
      window.SSCPreviewV1Integration.shouldUseV1(input),
      true,
      `${input} must use the native NxN preview V1 pipeline.`
    );
  }
}
assert.equal(window.SSCPreviewV1Integration.shouldUseV1('minx'),false);

for(const group of groups){
  const signatures=new Map();
  for(const [input,normalized] of group.events){
    const container=window.document.createElement('div');
    container.className='cube-preview-card';
    window.document.body.appendChild(container);

    const svg=await window.SSCCubePreview.render(container,group.scramble,input);
    assert.ok(svg instanceof window.SVGElement,`${input} must return the native SVG preview.`);
    assert.equal(svg.getAttribute('data-cube-order'),String(group.order));
    assert.equal(svg.getAttribute('data-layout-style'),`cstimer-${group.order}x${group.order}`);
    assert.equal(svg.getAttribute('data-pixel-perfect-grid'),'true');
    assert.equal(container.dataset.previewEngine,'ssc-native-v1');
    assert.equal(container.dataset.wcaEvent,normalized);
    assert.equal(container.dataset.puzzle,`${group.order}×${group.order}`);
    assert.equal(container.dataset.previewMode,'2d');
    assert.equal(container.querySelectorAll('.ssc-svg-sticker').length,6*group.order*group.order);
    signatures.set(input,svgSignature(container));
  }

  const baseSignature=signatures.get(group.base);
  for(const [input] of group.events.slice(1)){
    assert.equal(
      signatures.get(input),
      baseSignature,
      `${input} must render the exact same ${group.order}x${group.order} sticker state as ${group.base} for an identical scramble.`
    );
  }
}

assert.equal(legacyCalls,0,'3BLD/FMC/OH/4BLD/5BLD must not fall back to the legacy scramble-display renderer in 2D.');
assert.equal(snapshots.length,groups.reduce((total,group)=>total+group.events.length,0));
assert.ok(fitCalls>=snapshots.length);

// Native 3D must treat 4BLD and 5BLD as derived cube events that reuse the
// exact 4x4 / 5x5 CSS 3D renderer and SSCNxNState logic.
evaluate('code/js/puzzle-3d.js');
evaluate('code/js/preview-manager.js');

const blind3DCases=[
  {base:'444',eventId:'444bf',alias:'4bld',order:4,label:'4BLD',scramble:groups[1].scramble},
  {base:'555',eventId:'555bf',alias:'5bld',order:5,label:'5BLD',scramble:groups[2].scramble}
];

for(const testCase of blind3DCases){
  for(const eventId of [testCase.eventId,testCase.alias]){
    assert.equal(window.SSCPuzzle3D.supportsEvent(eventId),true,`${eventId} must be supported by native 3D.`);
    assert.equal(window.SSCPuzzle3D.isNative3D(eventId),true,`${eventId} must route to the shared native CSS 3D renderer.`);
    assert.equal(window.SSCPreviewManager.supportsMode('3d',eventId),true,`${eventId} must be available through PreviewManager 3D routing.`);
  }

  const metadata=window.SSCPuzzle3D.getEvent(testCase.eventId);
  assert.equal(metadata.id,testCase.eventId);
  assert.equal(metadata.order,testCase.order);
  assert.equal(metadata.puzzle,`${testCase.order}x${testCase.order}x${testCase.order}`);
  assert.equal(metadata.label,testCase.label);
  assert.equal(metadata.baseEvent,testCase.base);

  const baseHost=window.document.createElement('div');
  const blindHost=window.document.createElement('div');
  window.document.body.append(baseHost,blindHost);
  await window.SSCPuzzle3D.render(baseHost,testCase.scramble,testCase.base);
  await window.SSCPuzzle3D.render(blindHost,testCase.scramble,testCase.eventId);

  assert.equal(baseHost.querySelectorAll('.ssc-native-cube3d-sticker').length,6*testCase.order*testCase.order);
  assert.equal(blindHost.querySelectorAll('.ssc-native-cube3d-sticker').length,6*testCase.order*testCase.order);
  assert.equal(
    native3DSignature(blindHost),
    native3DSignature(baseHost),
    `${testCase.eventId} must produce the exact same native 3D sticker state as ${testCase.base} for the same scramble.`
  );
  assert.equal(blindHost.dataset.previewEngine,'ssc-native-css3d-solid');
  assert.equal(blindHost.dataset.previewMode,'3d');
  assert.equal(blindHost.dataset.wcaEvent,testCase.eventId);
  assert.equal(blindHost.dataset.wcaPuzzle,`${testCase.order}x${testCase.order}x${testCase.order}`);
  assert.equal(blindHost.dataset.puzzle,testCase.label);

  const managerHost=window.document.createElement('div');
  window.document.body.appendChild(managerHost);
  await window.SSCPreviewManager.render({
    container:managerHost,
    eventId:testCase.eventId,
    scramble:testCase.scramble,
    mode:'3d',
    fallbackTo2D:true
  });
  assert.equal(managerHost.dataset.previewMode,'3d');
  assert.equal(managerHost.dataset.wcaEvent,testCase.eventId);
  assert.equal(managerHost.querySelectorAll('.ssc-native-cube3d-sticker').length,6*testCase.order*testCase.order);
}

const source=fs.readFileSync('code/js/puzzle-3d.js','utf8');
assert.match(source,/\['444bf',4\]/,'4BLD must share native order 4 with 4x4.');
assert.match(source,/\['555bf',5\]/,'5BLD must share native order 5 with 5x5.');
assert.doesNotMatch(source,/function\s+render(?:4bld|5bld|444bf|555bf)/i,'BLD events must not introduce dedicated renderers.');

console.log('[SSC Preview CI] Derived cube events summary');
console.log(JSON.stringify({
  ok:true,
  threeByThreeDerived:['333bf','333fm','333oh'],
  blindDerived:{'444bf':'444','555bf':'555'},
  same2DRenderer:true,
  same3DRenderer:true,
  sameStickerState:true,
  legacyCalls
},null,2));

dom.window.close();