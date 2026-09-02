import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {randomScrambleForEvent} from 'cubing/scramble';

const read=path=>fs.readFileSync(path,'utf8');
const dom=new JSDOM(`<!doctype html><html lang="he" dir="rtl"><head></head><body>
<button id="generalSettingsButton"></button>
<div id="previewModeSettingRow"><select id="previewModeSelect"><option value="2d">2D</option><option value="3d">3D</option></select></div>
<div id="cubeColorsControl">
${['U','L','F','R','B','D'].map(face=>`<label class="cube-color-item"><span>${face}</span><input data-cube-face="${face}" type="color"></label>`).join('')}
<button id="resetCubeColors"></button></div>
<div id="cubePreview2D" class="cube-preview-card"></div>
</body></html>`,{url:'https://ssc.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const {window}=dom;
window.console=console;
window.requestAnimationFrame=cb=>{cb();return 1;};
window.cancelAnimationFrame=()=>{};
window.ResizeObserver=class{observe(){} disconnect(){}};
window.SSCPreviewSizing={scheduleFit(){},getCubeLineWidth(){return 1;},applyPreviewSize(){}};
window.SSC_FEATURES={previewV1:true};

for(const path of [
  'code/js/wca-previews.js',
  'code/js/preview/ssc-nxn-state.js',
  'code/js/preview/ssc-svg-renderer.js',
  'code/js/preview/ssc-preview-validation.js',
  'code/js/preview/ssc-preview-v1.js',
  'code/js/puzzle-3d.js',
  'code/js/preview-manager.js',
  'code/js/preview-integration.js',
  'code/js/preview/ssc-preview-v1-integration.js',
  'code/js/preview/selected-faces-preview.js'
]) window.eval(`${read(path)}\n//# sourceURL=${path}`);

const card=window.document.getElementById('cubePreview2D');
const scrambles=[];
for(let i=0;i<3;i++) scrambles.push((await randomScrambleForEvent('444bf')).toString());

// Reproduce the production notation that was missing before this fix even if
// a particular random sample happens to choose the identity orientation.
for(const rotation of ['x','x2',"x'",'y','y2',"y'",'z','z2',"z'"]){
  const parsed=window.SSCNxNState.parseMove(rotation,4);
  assert.ok(parsed,`${rotation} must be accepted by the shared NxN state engine.`);
  assert.equal(parsed.layerDepth,4,`${rotation} must rotate all four layers.`);
  assert.equal(parsed.wholeCube,true);
}

for(const scramble of scrambles){
  const tokens=scramble.trim().split(/\s+/);
  const unsupported=tokens.filter(token=>!window.SSCNxNState.parseMove(token,4));
  assert.deepEqual(unsupported,[],`Real 444bf scramble contains unsupported moves: ${unsupported.join(' ')}`);

  const full=window.SSCPreviewV1.render(card,scramble,'444bf',{strict:true});
  assert.equal(full.order,4);
  assert.equal(card.dataset.wcaEvent,'444bf');
  assert.equal(card.querySelectorAll('.ssc-svg-sticker').length,96);

  // Verify the actual sticker state, including x/y/z orientation moves, against
  // cubing.js's canonical 4x4 KPuzzle state rather than merely checking that a
  // renderer returned DOM.
  const reference=await window.SSCPreviewValidation.buildReferenceState('444',scramble);
  const mismatches=window.SSCPreviewValidation.compareStates(full.state,reference,{
    eventId:'444',scramble,order:4
  });
  assert.deepEqual(mismatches,[],`Real 4BLD state must match cubing.js exactly. First mismatch: ${JSON.stringify(mismatches[0]||null)}`);

  const threeD=await window.SSCPuzzle3D.render(card,scramble,'444bf');
  assert.ok(threeD,'4BLD must render with native 4x4 CSS 3D.');
  assert.equal(card.dataset.wcaEvent,'444bf');
  assert.equal(card.querySelectorAll('.ssc-native-cube3d-sticker').length,96);

  await window.SSCSelectedFacesPreview.setFaces(['F'],{rerender:false});
  await window.SSCSelectedFacesPreview.setEnabled(true,{rerender:false});
  const selected=await window.SSCCubePreview.render(card,scramble,'444bf');
  assert.equal(selected.order,4);
  assert.equal(card.dataset.previewMode,'faces');
  assert.equal(card.dataset.wcaEvent,'444bf');
  assert.equal(card.querySelectorAll('.ssc-selected-face-slot').length,1);
  assert.equal(card.querySelectorAll('.ssc-svg-sticker').length,16);
}

dom.window.close();
console.log('[SSC Preview CI] Real 4BLD production routing passed through cubing.js state validation, 2D, 3D and Selected Faces.');
