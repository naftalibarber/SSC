import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const stateSource=fs.readFileSync('code/js/preview/ssc-nxn-state.js','utf8');
const rendererSource=fs.readFileSync('code/js/preview/ssc-svg-renderer.js','utf8');
const previewSource=fs.readFileSync('code/js/preview/ssc-preview-v1.js','utf8');
const selectedSource=fs.readFileSync('code/js/preview/selected-faces-preview.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.match(selectedSource,/const FACE_ORDER=Object\.freeze\(\['U','L','F','R','B','D'\]\)/,'Selected-face order must use cube face notation.');
assert.match(selectedSource,/preview\.buildState\(normalizedEventId,scramble,\{strict:true\}\)/,'Selected faces must reuse the existing SSC state engine.');
assert.doesNotMatch(selectedSource,/function parseMove|function applyMove|function buildState|const buildState|let buildState/,'Selected faces must not add a scramble parser/state engine.');
assert.match(rendererSource,/function createFaceGroup\(/,'The 2D renderer must expose one shared face factory.');
assert.match(rendererSource,/svg\.appendChild\(createFaceGroup\(/,'Full 2D must build every face through createFaceGroup().');
assert.match(selectedSource,/renderer\.createFaceGroup\(/,'Selected Faces must call the same createFaceGroup() factory.');
assert.doesNotMatch(selectedSource,/createSelectedSticker|createSelectedFace\s*\(|buildSelectedFaceGrid|ssc-selected-face-sticker/,'Selected Faces must not keep an independent face/sticker renderer.');
assert.doesNotMatch(selectedSource,/SSCPuzzle3D\.createFaceSet|native-3d|ssc-native-cube3d-face/,'Selected Faces must not source faces from the 3D renderer.');
assert.match(selectedSource,/direction:ltr!important/,'Cube geometry must remain LTR even when UI language is RTL.');
assert.match(selectedSource,/aspect-ratio:1\/1/,'Selected face slots must be square.');
assert.match(index,/selected-faces-preview\.js\?v=20260901-selected-faces-1/,'Selected-face mode must remain loaded by index.html.');

const dom=new JSDOM(`<!doctype html><html lang="he" dir="rtl"><head></head><body>
  <button id="generalSettingsButton" type="button"></button>
  <div id="previewModeSettingRow" class="general-setting-row"><span></span><select id="previewModeSelect"><option value="2d">2D</option><option value="3d">3D</option></select></div>
  <div id="cubeColorsControl" class="cube-colors-control">
    <label class="cube-color-item"><span>לבן</span><input type="color" data-cube-face="U"></label>
    <label class="cube-color-item"><span>צהוב</span><input type="color" data-cube-face="D"></label>
    <label class="cube-color-item"><span>ירוק</span><input type="color" data-cube-face="F"></label>
    <label class="cube-color-item"><span>כחול</span><input type="color" data-cube-face="B"></label>
    <label class="cube-color-item"><span>אדום</span><input type="color" data-cube-face="R"></label>
    <label class="cube-color-item"><span>כתום</span><input type="color" data-cube-face="L"></label>
    <button id="resetCubeColors" type="button">reset</button>
  </div>
  <div id="cubePreview2D" class="cube-preview-card"></div>
</body></html>`,{
  url:'https://ssc.test/',pretendToBeVisual:true,runScripts:'outside-only'
});
const {window}=dom;
window.console=console;
window.requestAnimationFrame=callback=>{callback();return 1;};
window.cancelAnimationFrame=()=>{};
let bridgeCalls=0;
let fitCalls=0;
let snapshot=null;
let lastFull2D=null;
let selectedLineWidth=1;

function snapshotFace(root,face){
  const group=root.querySelector(`.ssc-svg-face[data-face="${face}"]`);
  assert.ok(group,`Missing ${face} face group.`);
  return{
    face,
    renderer:group.dataset.faceRenderer,
    originX:group.dataset.originX,
    originY:group.dataset.originY,
    transform:group.getAttribute('transform'),
    stickers:[...group.querySelectorAll('.ssc-svg-sticker')].map(sticker=>({
      stickerId:sticker.dataset.stickerId,
      face:sticker.dataset.face,
      row:sticker.dataset.row,
      col:sticker.dataset.col,
      identity:sticker.dataset.identity,
      layer:sticker.dataset.layer,
      fill:sticker.getAttribute('fill'),
      x:sticker.getAttribute('x'),
      y:sticker.getAttribute('y'),
      width:sticker.getAttribute('width'),
      height:sticker.getAttribute('height')
    }))
  };
}
function captureFull2D(result,eventId,scramble){
  lastFull2D={eventId,scramble,order:result.order,faces:Object.fromEntries(['U','L','F','R','B','D'].map(face=>[face,snapshotFace(result.svg,face)]))};
}
function selectedFaceSnapshot(card,face){
  const svg=card.querySelector(`.ssc-selected-face-slot[data-face="${face}"] .ssc-selected-face-svg`);
  assert.ok(svg,`Missing selected ${face} SVG.`);
  return snapshotFace(svg,face);
}
const tick=()=>new Promise(resolve=>window.setTimeout(resolve,0));

window.SSCPreviewSizing={
  scheduleFit(){fitCalls++;},
  getCubeLineWidth(){return selectedLineWidth;}
};
window.SSCPuzzle3D={dispose(){}};

window.eval(`${stateSource}\n//# sourceURL=ssc-nxn-state.js`);
window.eval(`${rendererSource}\n//# sourceURL=ssc-svg-renderer.js`);
window.eval(`${previewSource}\n//# sourceURL=ssc-preview-v1.js`);

window.SSCPreviewSettings={
  syncLastRender(container,scramble,eventId){snapshot={container,scramble,eventId};return true;},
  async rerender(){
    if(!snapshot)return null;
    return window.SSCCubePreview.render(snapshot.container,snapshot.scramble,snapshot.eventId);
  }
};
window.SSCCubePreview={
  async render(container,scramble,eventId){
    bridgeCalls++;
    snapshot={container,scramble,eventId};
    const result=window.SSCPreviewV1.render(container,scramble,eventId,{strict:true});
    captureFull2D(result,eventId,scramble);
    return{engine:'base',...result};
  },
  getColors(){return window.SSCPreviewV1.getColors();},
  setColors(next){return window.SSCPreviewV1.setColors({...window.SSCPreviewV1.getColors(),...next});},
  resetColors(){return window.SSCPreviewV1.resetColors();}
};

window.eval(`${selectedSource}\n//# sourceURL=selected-faces-preview.js`);
assert.ok(window.SSCSelectedFacesPreview,'Selected-face API must be installed.');
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),false);
assert.deepEqual([...window.SSCSelectedFacesPreview.getFaces()],['F']);

const modeSelect=window.document.getElementById('previewModeSelect');
const faceRow=window.document.getElementById('previewFacesSettingRow');
assert.ok(modeSelect.querySelector('option[value="faces"]'));
assert.ok(faceRow);
assert.equal(faceRow.hidden,true);
assert.equal(window.document.querySelectorAll('[data-ssc-preview-face]').length,6);

const colorOrder=[...window.document.querySelectorAll('#cubeColorsControl > .cube-color-item')].map(item=>item.querySelector('[data-cube-face]').dataset.cubeFace);
assert.deepEqual(colorOrder,['U','L','F','R','B','D']);
for(const item of window.document.querySelectorAll('#cubeColorsControl > .cube-color-item')){
  const face=item.querySelector('[data-cube-face]').dataset.cubeFace;
  assert.equal(item.querySelector('span').textContent,face);
}

const card=window.document.getElementById('cubePreview2D');
await window.SSCCubePreview.render(card,"R U R'",'333');
assert.equal(bridgeCalls,1);
assert.equal(card.dataset.previewRenderer,'ssc-svg-v1');

modeSelect.value='faces';
modeSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
await tick();await tick();
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),true);
assert.equal(card.dataset.previewMode,'faces');
assert.equal(card.dataset.previewRenderer,'ssc-svg-v1');
assert.equal(card.querySelectorAll('.ssc-selected-face-slot').length,1);
assert.equal(card.querySelectorAll('.ssc-svg-sticker').length,9);
assert.equal(card.querySelectorAll('.ssc-selected-face-sticker').length,0,'No legacy selected-face stickers may be created.');
assert.deepEqual(selectedFaceSnapshot(card,'F'),lastFull2D.faces.F,'Selected F must be byte-for-byte equivalent in semantic SVG attributes to Full 2D F.');

const testCases=[
  ['222',2,'R U F'],['333',3,"R U F R'"],['444',4,'R U F Rw'],['555',5,'R U F Rw Uw'],
  ['666',6,'R U F Rw Uw'],['777',7,'R U F Rw Uw']
];
for(const [eventId,order,scramble] of testCases){
  await window.SSCSelectedFacesPreview.setFaces(['F']);
  const result=await window.SSCCubePreview.render(card,scramble,eventId);
  assert.equal(result.order,order,`${eventId} must keep its cube order.`);
  assert.equal(card.querySelectorAll('.ssc-svg-sticker').length,order*order);
  assert.deepEqual(selectedFaceSnapshot(card,'F'),lastFull2D.faces.F,`${eventId} Selected F must use exactly the Full 2D F renderer output.`);
}

await window.SSCSelectedFacesPreview.setFaces(['U','F']);
await window.SSCCubePreview.render(card,"R U F R'",'333');
const slots=[...card.querySelectorAll('.ssc-selected-face-slot')];
assert.equal(slots.length,2);
assert.equal(card.querySelector('.ssc-selected-faces-preview').style.getPropertyValue('--ssc-selected-face-columns'),'2');
assert.equal(card.querySelector('.ssc-selected-faces-preview').style.getPropertyValue('--ssc-selected-face-rows'),'1');
for(const slot of slots){
  assert.equal(slot.style.aspectRatio,'1 / 1','Two-face layout must keep every face square.');
  assert.equal(slot.style.width,'100%','Two-face layout must size by one axis only.');
  assert.equal(slot.style.height,'auto','Two-face layout must leave the other axis automatic so aspect-ratio stays square.');
}
assert.deepEqual(selectedFaceSnapshot(card,'U'),lastFull2D.faces.U);
assert.deepEqual(selectedFaceSnapshot(card,'F'),lastFull2D.faces.F);

for(const count of [1,2,3,4,5,6]){
  await window.SSCSelectedFacesPreview.setFaces(['U','L','F','R','B','D'].slice(0,count));
  await window.SSCCubePreview.render(card,'R U F','333');
  assert.equal(card.querySelectorAll('.ssc-selected-face-slot').length,count,`${count} selected faces must render.`);
  assert.equal(card.querySelectorAll('.ssc-svg-sticker').length,count*9);
}

await window.SSCSelectedFacesPreview.setFaces(['F']);
window.document.documentElement.lang='he';
window.document.documentElement.dir='rtl';
await window.SSCCubePreview.render(card,"R U F R'",'333');
const rtlSnapshot=selectedFaceSnapshot(card,'F');
window.document.documentElement.lang='en';
window.document.documentElement.dir='ltr';
await tick();
await window.SSCCubePreview.render(card,"R U F R'",'333');
const ltrSnapshot=selectedFaceSnapshot(card,'F');
assert.deepEqual(ltrSnapshot,rtlSnapshot,'RTL/LTR must not mirror or reorder cube stickers.');

selectedLineWidth=3;
await window.SSCCubePreview.render(card,"R U F R'",'333');
assert.deepEqual(selectedFaceSnapshot(card,'F'),lastFull2D.faces.F,'Selected and Full 2D must share the same line-width geometry source.');
assert.equal(selectedFaceSnapshot(card,'F').stickers[0].x,'3','Configured line width must feed the shared 2D geometry.');

window.SSCCubePreview.setColors({F:'#123456'});
await tick();
assert.equal(selectedFaceSnapshot(card,'F').stickers[0].fill,'#123456','Selected Faces must repaint from the shared palette.');
await window.SSCCubePreview.render(card,"R U F R'",'333');
assert.equal(lastFull2D.faces.F.stickers[0].fill,'#123456');
assert.deepEqual(selectedFaceSnapshot(card,'F'),lastFull2D.faces.F,'Color changes must stay identical between Full 2D and Selected Faces.');
assert.ok(fitCalls>0,'Selected Faces must keep preview sizing connected.');

modeSelect.value='2d';
modeSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),false);
const baseResult=await window.SSCCubePreview.render(card,'R U','333');
assert.equal(baseResult.engine,'base');
assert.ok(card.querySelector('.ssc-native-preview-svg'),'Full 2D must remain available after leaving Selected Faces.');

dom.window.close();
console.log('[SSC Preview CI] Selected Faces shared 2D renderer regression checks passed.');
