import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('code/js/preview/selected-faces-preview.js','utf8');
const index=fs.readFileSync('index.html','utf8');
assert.match(source,/const FACE_ORDER=Object\.freeze\(\['U','L','F','R','B','D'\]\)/,'Selected-face order must use cube face notation.');
assert.match(source,/preview\.buildState\(normalizedEventId,scramble,\{strict:true\}\)/,'Selected faces must reuse the existing SSC state engine.');
assert.doesNotMatch(source,/function parseMove|function applyMove/,'Selected faces must not add a scramble parser.');
assert.match(index,/selected-faces-preview\.js\?v=20260901-selected-faces-1/,'Selected-face mode must be loaded with cache busting.');
assert.match(index,/id="cubeWhiteLabel">U<\/span><input type="color" data-cube-face="U"/,'U color control must be labeled by face notation.');
assert.match(index,/id="cubeOrangeLabel">L<\/span><input type="color" data-cube-face="L"/,'L color control must be labeled by face notation.');
assert.match(index,/id="cubeGreenLabel">F<\/span><input type="color" data-cube-face="F"/,'F color control must be labeled by face notation.');
assert.match(index,/id="cubeRedLabel">R<\/span><input type="color" data-cube-face="R"/,'R color control must be labeled by face notation.');
assert.match(index,/id="cubeBlueLabel">B<\/span><input type="color" data-cube-face="B"/,'B color control must be labeled by face notation.');
assert.match(index,/id="cubeYellowLabel">D<\/span><input type="color" data-cube-face="D"/,'D color control must be labeled by face notation.');

const dom=new JSDOM(`<!doctype html><html lang="he" dir="rtl"><head></head><body>
  <button id="generalSettingsButton" type="button"></button>
  <div id="previewModeSettingRow" class="general-setting-row"><span id="previewModeSettingLabel"></span><select id="previewModeSelect"><option value="2d">2D</option><option value="3d">3D</option></select></div>
  <div id="cubeColorsControl" class="cube-colors-control">
    <label class="cube-color-item"><span id="cubeWhiteLabel">לבן</span><input type="color" data-cube-face="U"></label>
    <label class="cube-color-item"><span id="cubeYellowLabel">צהוב</span><input type="color" data-cube-face="D"></label>
    <label class="cube-color-item"><span id="cubeGreenLabel">ירוק</span><input type="color" data-cube-face="F"></label>
    <label class="cube-color-item"><span id="cubeBlueLabel">כחול</span><input type="color" data-cube-face="B"></label>
    <label class="cube-color-item"><span id="cubeRedLabel">אדום</span><input type="color" data-cube-face="R"></label>
    <label class="cube-color-item"><span id="cubeOrangeLabel">כתום</span><input type="color" data-cube-face="L"></label>
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
let fitCalls=0;
let snapshot=null;
let colors={U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};
const orders={222:2,333:3,444:4,555:5,666:6,777:7};
const aliases={'2x2':'222','3x3':'333','4x4':'444','5x5':'555','6x6':'666','7x7':'777'};

function normalizeEventId(eventId){
  const raw=String(eventId||'333').toLowerCase();
  return aliases[raw]||raw;
}
function makeFaces(order){
  return Object.fromEntries(['U','L','F','R','B','D'].map(face=>[
    face,Array.from({length:order},()=>Array(order).fill(face))
  ]));
}

window.SSCPreviewSizing={scheduleFit(){fitCalls++;}};
window.SSCPuzzle3D={dispose(container){container.replaceChildren();}};
window.SSCPreviewV1={
  normalizeEventId,
  supportsEvent(eventId){return Boolean(orders[normalizeEventId(eventId)]);},
  orderForEvent(eventId){return orders[normalizeEventId(eventId)];},
  buildState(eventId,scramble,{strict}={}){
    assert.equal(strict,true,'Selected-face state must be strict.');
    const order=orders[normalizeEventId(eventId)];
    return{order,scramble,faces:makeFaces(order)};
  },
  readColors(){return{...colors};}
};
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
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),false);
assert.deepEqual([...window.SSCSelectedFacesPreview.getFaces()],['F'],'Default selected face must be F.');
const modeSelect=window.document.getElementById('previewModeSelect');
assert.ok(modeSelect.querySelector('option[value="faces"]'),'Preview mode selector must contain selected faces.');
assert.equal(modeSelect.querySelector('option[value="faces"]').textContent,'פאות נבחרות');
const faceRow=window.document.getElementById('previewFacesSettingRow');
assert.ok(faceRow,'Face selection controls must be added to settings.');
assert.equal(faceRow.hidden,true,'Face selection controls stay hidden outside selected-face mode.');
assert.equal(window.document.querySelectorAll('[data-ssc-preview-face]').length,6,'All six cube faces must be selectable.');

const colorOrder=[...window.document.querySelectorAll('#cubeColorsControl > .cube-color-item')].map(item=>item.querySelector('[data-cube-face]').dataset.cubeFace);
assert.deepEqual(colorOrder,['U','L','F','R','B','D'],'Cube color controls must be ordered by face notation.');
for(const item of window.document.querySelectorAll('#cubeColorsControl > .cube-color-item')){
  const face=item.querySelector('[data-cube-face]').dataset.cubeFace;
  assert.equal(item.querySelector('span').textContent,face,`Color label for ${face} must use the face letter.`);
}

const card=window.document.getElementById('cubePreview2D');
await window.SSCCubePreview.render(card,"R U R'",'333');
assert.equal(bridgeCalls,1,'Normal mode must still use the existing preview pipeline.');

modeSelect.value='faces';
modeSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
await new Promise(resolve=>window.setTimeout(resolve,0));
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),true);
assert.equal(window.localStorage.getItem(window.SSCSelectedFacesPreview.ENABLED_KEY),'true');
assert.equal(modeSelect.value,'faces');
assert.equal(faceRow.hidden,false);
assert.equal(bridgeCalls,2,'Entering face mode must refresh the existing preview snapshot first.');
assert.equal(card.dataset.previewMode,'faces');
assert.equal(card.dataset.previewEngine,'ssc-selected-faces');
assert.equal(card.dataset.selectedFaces,'F');
assert.equal(card.style.getPropertyValue('width'),'','Selected faces must release stale square 3D card width.');
assert.equal(card.style.getPropertyValue('height'),'','Selected faces must release stale square 3D card height.');
assert.equal(card.querySelectorAll('.ssc-selected-face').length,1);
assert.equal(card.querySelectorAll('.ssc-selected-face-sticker').length,9,'One selected 3x3 face must contain 9 stickers.');
const fCheckbox=window.document.querySelector('[data-ssc-preview-face="F"]');
assert.equal(fCheckbox.checked,true);
assert.equal(fCheckbox.disabled,true,'The last selected face must not be removable.');

fCheckbox.disabled=false;
fCheckbox.checked=false;
fCheckbox.dispatchEvent(new window.Event('change',{bubbles:true}));
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.deepEqual([...window.SSCSelectedFacesPreview.getFaces()],['F'],'At least one selected face must always remain.');
assert.equal(fCheckbox.checked,true);

const uCheckbox=window.document.querySelector('[data-ssc-preview-face="U"]');
uCheckbox.checked=true;
uCheckbox.dispatchEvent(new window.Event('change',{bubbles:true}));
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.deepEqual([...window.SSCSelectedFacesPreview.getFaces()],['U','F']);
assert.equal(card.querySelectorAll('.ssc-selected-face').length,2);
assert.equal(card.querySelectorAll('.ssc-selected-face-sticker').length,18,'Two selected 3x3 faces must contain 18 stickers.');
assert.equal(fCheckbox.disabled,false,'Once two faces are selected either one can be removed.');

await window.SSCSelectedFacesPreview.setFaces(['R','U']);
assert.deepEqual([...window.SSCSelectedFacesPreview.getFaces()],['U','R'],'Selected faces must normalize to canonical U/L/F/R/B/D order.');
const result444=await window.SSCCubePreview.render(card,'Rw U2 Fw', '444');
assert.equal(result444.order,4);
assert.deepEqual([...result444.faces],['U','R']);
assert.equal(card.querySelectorAll('.ssc-selected-face').length,2);
assert.equal(card.querySelectorAll('.ssc-selected-face-sticker').length,32,'Two selected 4x4 faces must contain 32 stickers.');
assert.equal(bridgeCalls,3,'4x4 selected-face rendering must still synchronize through the base pipeline.');

window.SSCCubePreview.setColors({U:'#123456'});
await new Promise(resolve=>window.setTimeout(resolve,0));
const uSticker=card.querySelector('.ssc-selected-face[data-face="U"] .ssc-selected-face-sticker');
assert.equal(uSticker.style.getPropertyValue('--ssc-selected-sticker'),'#123456','Selected faces must repaint with cube color settings.');
assert.ok(fitCalls>0,'Selected-face rendering must keep preview sizing integration connected.');

window.document.getElementById('cubeWhiteLabel').textContent='White';
window.document.documentElement.lang='en';
window.document.documentElement.dir='ltr';
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.equal(window.document.getElementById('cubeWhiteLabel').textContent,'U','Language changes must not restore color-name labels.');
assert.equal(modeSelect.querySelector('option[value="faces"]').textContent,'Selected faces');

modeSelect.value='2d';
modeSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
assert.equal(window.SSCSelectedFacesPreview.isEnabled(),false,'Choosing another preview type must leave selected-face mode.');
const baseResult=await window.SSCCubePreview.render(card,'R U','333');
assert.equal(baseResult.engine,'base','2D/3D rendering path must remain available after leaving selected-face mode.');

dom.window.close();
console.log('Selected-face preview and U/L/F/R/B/D color-label checks passed.');
