import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('code/js/preview/selected-faces-preview.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.match(source,/const FACE_ORDER=Object\.freeze\(\['U','L','F','R','B','D'\]\)/,'Selected-face order must use cube face notation.');
assert.match(source,/window\.SSCPuzzle3D\.render\(source,scramble,eventId\)/,'Selected faces must be sourced from the existing native 3D renderer.');
assert.match(source,/\.ssc-native-cube3d-face\[data-side=/,'Selected faces must extract the real native 3D face DOM.');
assert.match(source,/aspect-ratio:1\/1!important/,'Flattened native faces must stay square.');
assert.match(source,/data-count="2"[\s\S]*?flex-wrap:nowrap!important/,'Exactly two selected faces must stay side by side without stretching.');
assert.doesNotMatch(source,/preview\.buildState|SSCPreviewV1\.buildState/,'Selected-face mode must not calculate a second cube state.');
assert.doesNotMatch(source,/ssc-selected-face-sticker|className=['"]ssc-selected-face['"]/,'Selected-face mode must not create its own face/sticker grid.');
assert.doesNotMatch(source,/function parseMove|function applyMove/,'Selected faces must not add a scramble parser.');
assert.match(index,/selected-faces-preview\.js\?v=20260901-selected-faces-1/,'Selected-face mode must remain loaded from index.html.');

const dom=new JSDOM(`<!doctype html><html lang="he" dir="rtl"><head></head><body>
  <button id="generalSettingsButton" type="button"></button>
  <div id="previewModeSettingRow" class="general-setting-row"><span id="previewModeSettingLabel"></span><select id="previewModeSelect"><option value="2d">2D</option><option value="3d">3D</option></select></div>
  <div id="cubeColorsControl" class="cube-colors-control">
    <label class="cube-color-item"><span id="cubeWhiteLabel">U</span><input type="color" data-cube-face="U"></label>
    <label class="cube-color-item"><span id="cubeOrangeLabel">L</span><input type="color" data-cube-face="L"></label>
    <label class="cube-color-item"><span id="cubeGreenLabel">F</span><input type="color" data-cube-face="F"></label>
    <label class="cube-color-item"><span id="cubeRedLabel">R</span><input type="color" data-cube-face="R"></label>
    <label class="cube-color-item"><span id="cubeBlueLabel">B</span><input type="color" data-cube-face="B"></label>
    <label class="cube-color-item"><span id="cubeYellowLabel">D</span><input type="color" data-cube-face="D"></label>
    <button id="resetCubeColors" type="button">reset</button>
  </div>
  <div id="cubePreview2D" class="cube-preview-card"></div>
</body></html>`,{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});

const {window}=dom;
window.console=console;
let bridgeCalls=0;
let nativeRenderCalls=0;
let fitCalls=0;
let snapshot=null;
let colors={U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};
const orders={222:2,333:3,444:4};
const aliases={'2x2':'222','2×2':'222','3x3':'333','3×3':'333','4x4':'444','4×4':'444'};

function normalizeEventId(eventId){
  const raw=String(eventId||'333').toLowerCase();
  return aliases[raw]||raw;
}

window.SSCPreviewSizing={scheduleFit(){fitCalls++;}};
window.SSCPreviewSettings={
  syncLastRender(container,scramble,eventId){snapshot={container,scramble,eventId};return true;}
};
window.SSCPuzzle3D={
  isNative3D(eventId){return Boolean(orders[normalizeEventId(eventId)]);},
  getEvent(eventId){
    const id=normalizeEventId(eventId);
    const order=orders[id];
    return order?{id,order,puzzle:`${order}x${order}x${order}`,label:`${order}×${order}`} : null;
  },
  async render(container,scramble,eventId){
    nativeRenderCalls++;
    const id=normalizeEventId(eventId);
    const order=orders[id];
    assert.ok(order,'Native mock only accepts supported native cube events.');
    const root=window.document.createElement('div');
    root.className='ssc-native-cube3d-root ssc-puzzle-3d-player';
    root.dataset.cubeOrder=String(order);
    const cube=window.document.createElement('div');
    cube.className='ssc-native-cube3d-cube';
    for(const side of ['F','B','R','L','U','D']){
      const face=window.document.createElement('div');
      face.className='ssc-native-cube3d-face';
      face.dataset.side=side;
      for(let row=0;row<order;row++){
        for(let col=0;col<order;col++){
          const sticker=window.document.createElement('span');
          sticker.className='ssc-native-cube3d-sticker';
          sticker.dataset.side=side;
          sticker.dataset.row=String(row);
          sticker.dataset.col=String(col);
          sticker.dataset.identity=side;
          sticker.style.setProperty('--sticker',colors[side]);
          face.appendChild(sticker);
        }
      }
      cube.appendChild(face);
    }
    root.appendChild(cube);
    container.replaceChildren(root);
    return root;
  },
  dispose(container){container.replaceChildren();}
};
window.SSCCubePreview={
  async render(container,scramble,eventId){
    bridgeCalls++;
    snapshot={container,scramble,eventId};
    container.classList.remove('ssc-preview-mode-faces');
    container.classList.add('ssc-preview-mode-3d','ssc-preview-thumbnail-3d');
    container.style.setProperty('width','174px','important');
    container.style.setProperty('height','174px','important');
    container.replaceChildren(window.document.createElement('div'));
    return{engine:'base',scramble,eventId};
  },
  getColors(){return{...colors};},
  setColors(next){colors={...colors,...next};return{...colors};},
  resetColors(){colors={U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};return{...colors};}
};

window.eval(`${source}\n//# sourceURL=selected-faces-preview.js`);
assert.ok(window.SSCSelectedFacesPreview,'Selected-face API must be installed.');
assert.equal(window.SSCSelectedFacesPreview.usesNative3DFaces,true);
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),false);
assert.deepEqual([...window.SSCSelectedFacesPreview.getFaces()],['F']);

const modeSelect=window.document.getElementById('previewModeSelect');
const faceRow=window.document.getElementById('previewFacesSettingRow');
const card=window.document.getElementById('cubePreview2D');
assert.ok(modeSelect.querySelector('option[value="faces"]'));
assert.equal(faceRow.hidden,true);
assert.equal(window.document.querySelectorAll('[data-ssc-preview-face]').length,6);

await window.SSCCubePreview.render(card,"R U R'",'333');
assert.equal(bridgeCalls,1,'Normal mode must still use the existing preview pipeline.');

modeSelect.value='faces';
modeSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
await new Promise(resolve=>window.setTimeout(resolve,0));
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),true);
assert.equal(faceRow.hidden,false);
assert.equal(card.dataset.previewMode,'faces');
assert.equal(card.dataset.previewEngine,'ssc-native-3d-selected-faces');
assert.equal(card.dataset.selectedFaces,'F');
assert.equal(card.style.getPropertyValue('width'),'','Selected faces must release stale 3D thumbnail width.');
assert.equal(card.style.getPropertyValue('height'),'','Selected faces must release stale 3D thumbnail height.');
assert.equal(card.querySelector('.ssc-native-selected-faces')?.dataset.source,'native-3d','Flat face view must identify native 3D as its source.');
assert.equal(card.querySelectorAll('.ssc-native-cube3d-face.ssc-native-flat-face').length,1);
assert.equal(card.querySelectorAll('.ssc-native-cube3d-sticker').length,9);
assert.equal(card.querySelectorAll('.ssc-selected-face').length,0,'Legacy selected-face DOM must not be rendered.');
assert.equal(card.querySelectorAll('.ssc-selected-face-sticker').length,0,'Legacy selected sticker DOM must not be rendered.');

const fCheckbox=window.document.querySelector('[data-ssc-preview-face="F"]');
assert.equal(fCheckbox.checked,true);
assert.equal(fCheckbox.disabled,true,'At least one face must remain selected.');
fCheckbox.disabled=false;
fCheckbox.checked=false;
fCheckbox.dispatchEvent(new window.Event('change',{bubbles:true}));
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.deepEqual([...window.SSCSelectedFacesPreview.getFaces()],['F']);

const uCheckbox=window.document.querySelector('[data-ssc-preview-face="U"]');
uCheckbox.checked=true;
uCheckbox.dispatchEvent(new window.Event('change',{bubbles:true}));
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.deepEqual([...window.SSCSelectedFacesPreview.getFaces()],['U','F']);
const twoFaceRoot=card.querySelector('.ssc-native-selected-faces');
assert.equal(twoFaceRoot.dataset.count,'2');
assert.equal(twoFaceRoot.dataset.source,'native-3d');
assert.equal(card.querySelectorAll('.ssc-native-cube3d-face.ssc-native-flat-face').length,2);
assert.equal(card.querySelectorAll('.ssc-native-cube3d-sticker').length,18);
for(const face of card.querySelectorAll('.ssc-native-flat-face')){
  assert.equal(face.classList.contains('ssc-native-cube3d-face'),true,'Every flat face must still be the native 3D face element.');
}

await window.SSCSelectedFacesPreview.setFaces(['R','U']);
const result444=await window.SSCCubePreview.render(card,'Rw U2 Fw','444');
assert.equal(result444.order,4);
assert.equal(result444.source,'native-3d');
assert.deepEqual([...result444.faces],['U','R']);
assert.equal(card.querySelectorAll('.ssc-native-cube3d-face.ssc-native-flat-face').length,2);
assert.equal(card.querySelectorAll('.ssc-native-cube3d-sticker').length,32,'Two 4x4 native faces must contain 32 original 3D stickers.');
assert.ok(bridgeCalls>=2,'Scramble changes in face mode must still synchronize through the existing preview pipeline.');
assert.ok(nativeRenderCalls>=4,'Face changes must rebuild from the native 3D renderer.');

window.SSCCubePreview.setColors({U:'#123456'});
await new Promise(resolve=>window.setTimeout(resolve,0));
const uSticker=card.querySelector('.ssc-native-flat-face[data-side="U"] .ssc-native-cube3d-sticker');
assert.equal(uSticker.style.getPropertyValue('--sticker'),'#123456','Color changes must repaint through native 3D face rendering.');
assert.ok(fitCalls>0);

modeSelect.value='2d';
modeSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),false);
const baseResult=await window.SSCCubePreview.render(card,'R U','333');
assert.equal(baseResult.engine,'base','Leaving selected faces must restore the normal 2D/3D pipeline.');

dom.window.close();
console.log('Native 3D selected-face extraction, square two-face layout and color checks passed.');
