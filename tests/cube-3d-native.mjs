import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html lang="en"><body><div id="host"></div><div id="thumbnail" class="cube-preview-card"></div></body></html>',{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;
window.console=console;
window.SSCCubePreview={
  render(container,scramble,eventId){
    container.textContent=`2d:${eventId}:${scramble}`;
    return container.firstChild;
  },
  supportsEvent(){return true;},
  getEvent(eventId){return{id:eventId,label:eventId,name:eventId};},
  getColors(){return{U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};}
};
window.SSCPreviewSizing={scheduleFit(){}};

function evaluate(path){
  window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);
}

evaluate('code/js/preview/ssc-nxn-state.js');
evaluate('code/js/puzzle-3d.js');

for(const alias of ['222','2x2','2×2']){
  assert.equal(window.SSCPuzzle3D.supportsEvent(alias),true,`${alias} must be supported by native 3D.`);
}
assert.equal(window.SSCPuzzle3D.supportsEvent('333'),true,'3x3 native 3D support must remain enabled.');

const event222=window.SSCPuzzle3D.getEvent('222');
assert.equal(event222.id,'222');
assert.equal(event222.order,2);
assert.equal(event222.puzzle,'2x2x2');
assert.equal(event222.label,'2×2');
const event333=window.SSCPuzzle3D.getEvent('333');
assert.equal(event333.order,3);
assert.equal(event333.puzzle,'3x3x3');

function verifySharedState(host,scramble,eventId,order){
  const expected=window.SSCNxNState.buildState(scramble,order,{strict:true}).faces;
  for(const side of ['F','B','R','L','U','D']){
    const face=host.querySelector(`.ssc-native-cube3d-face[data-side="${side}"]`);
    assert.ok(face,`missing ${side} face for ${eventId}`);
    const stickers=[...face.querySelectorAll('.ssc-native-cube3d-sticker')];
    assert.equal(stickers.length,order*order,`${side} face must contain ${order*order} stickers for ${eventId}`);
    for(const sticker of stickers){
      const row=Number(sticker.dataset.row);
      const col=Number(sticker.dataset.col);
      assert.equal(sticker.dataset.identity,expected[side][row][col],`${eventId} ${side}[${row}][${col}] must match shared SSCNxNState`);
    }
  }
}

const host=window.document.getElementById('host');
const scramble222="R U R' F2 U' R2 F U2 R'";
const player222=await window.SSCPuzzle3D.render(host,scramble222,'222');
assert.ok(player222 instanceof window.HTMLElement,'2x2 3D render must return a DOM player');
assert.equal(player222.dataset.cubeOrder,'2');
assert.equal(player222.style.getPropertyValue('--ssc-native-order'),'2');
assert.equal(host.dataset.previewEngine,'ssc-native-css3d-solid');
assert.equal(host.dataset.wcaEvent,'222');
assert.equal(host.dataset.wcaPuzzle,'2x2x2');
assert.equal(host.dataset.puzzle,'2×2');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-face').length,6,'2x2 must render six continuous cube faces');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-sticker').length,24,'2x2 must render exactly 24 stickers');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-cubie').length,0,'2x2 must not render separated cubies');
verifySharedState(host,scramble222,'222',2);

const defaultTransform='rotateX(-28deg) rotateY(-38deg) scale3d(1,1,1)';
assert.equal(host.querySelector('.ssc-native-cube3d-cube').style.transform,defaultTransform,'2x2 must start at the standard U/F/R camera angle.');
host.querySelector('.ssc-native-cube3d-cube').style.transform='rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
assert.equal(window.SSCPuzzle3D.resetCamera(host),true,'2x2 reset angle must be available.');
assert.equal(host.querySelector('.ssc-native-cube3d-cube').style.transform,defaultTransform,'2x2 reset must return to the standard U/F/R angle.');

const scramble333="R U R' U' F2 D L2 B' U2 R2";
const player333=await window.SSCPuzzle3D.render(host,scramble333,'333');
assert.ok(player333 instanceof window.HTMLElement,'3x3 3D render must still return a DOM player');
assert.equal(player333.dataset.cubeOrder,'3');
assert.equal(player333.style.getPropertyValue('--ssc-native-order'),'3');
assert.equal(host.dataset.wcaPuzzle,'3x3x3');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-face').length,6,'3x3 must still render six continuous cube faces');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-sticker').length,54,'3x3 must still render exactly 54 stickers');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-cubie').length,0,'3x3 must not render separated cubies');
verifySharedState(host,scramble333,'333',3);
assert.equal(host.querySelector('.ssc-native-cube3d-cube').style.transform,defaultTransform,'3x3 default orientation must remain unchanged.');

const source=fs.readFileSync('code/js/puzzle-3d.js','utf8');
assert.match(source,/grid-template-columns:repeat\(var\(--ssc-native-order\),minmax\(0,1fr\)\)/,'3D face grid must be order-driven.');
assert.match(source,/grid-template-rows:repeat\(var\(--ssc-native-order\),minmax\(0,1fr\)\)/,'3D face rows must be order-driven.');
assert.match(source,/SSCNxNState\.buildState\(scramble,order,\{strict:true\}\)/,'2x2 and 3x3 3D must use the shared NxN state engine.');
assert.match(source,/pointerdown/,'3D modal must support drag interaction');
assert.match(source,/wheel/,'3D modal must retain zoom interaction');
assert.match(source,/resetCamera/,'3D must expose camera reset');
assert.match(source,/SSCCubePreview\?\.getColors/,'3D must use the shared cube palette');
assert.match(source,/html\[data-theme="dark"\]/,'3D must retain dark-theme styling');
assert.match(source,/html\[data-theme="oled"\]/,'3D must retain OLED styling');
assert.doesNotMatch(source,/grid-template-columns:repeat\(3,/,'3D renderer must not keep a hard-coded 3-column face grid.');
assert.doesNotMatch(source,/function parseMove/,'3D renderer must not introduce a scramble parser.');
assert.doesNotMatch(source,/for\(let x=-1;x<=1;x\+\+\)for\(let y=-1;y<=1;y\+\+\)for\(let z=-1;z<=1;z\+\+\)/,'3D must not return to separated cubies');
assert.doesNotMatch(source,/cdn\.cubing\.net|TwistyPlayer/,'native 3D must not depend on TwistyPlayer');

// Exercise the real connected thumbnail/modal pipeline for 222.
evaluate('code/js/preview-manager.js');
evaluate('code/js/preview-integration.js');
const thumbnail=window.document.getElementById('thumbnail');
const thumbnailPlayer=await window.SSCCubePreview.render(thumbnail,scramble222,'222');
assert.ok(thumbnailPlayer instanceof window.HTMLElement,'2x2 thumbnail must use the native 3D player.');
assert.equal(thumbnail.dataset.previewMode,'3d');
assert.equal(thumbnail.dataset.wcaEvent,'222');
assert.equal(thumbnail.classList.contains('ssc-preview-thumbnail-3d'),true,'2x2 thumbnail must be marked static.');
assert.equal(thumbnailPlayer.style.pointerEvents,'none','2x2 thumbnail player must not accept pointer input.');
assert.equal(thumbnailPlayer.tabIndex,-1,'2x2 thumbnail must not be keyboard-draggable.');
assert.equal(thumbnail.querySelectorAll('.ssc-native-cube3d-sticker').length,24,'2x2 thumbnail must display the active scramble state.');

thumbnail.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
await new Promise(resolve=>window.setTimeout(resolve,0));
const modal=window.document.getElementById('sscPreview3DModal');
assert.ok(modal&&!modal.hidden,'clicking the 2x2 thumbnail must open the existing 3D modal.');
const viewer=modal.querySelector('#sscPreview3DViewer');
assert.equal(viewer.dataset.wcaEvent,'222','2x2 modal must preserve the active event.');
assert.equal(viewer.querySelectorAll('.ssc-native-cube3d-face').length,6,'2x2 modal must use the same six-face renderer.');
assert.equal(viewer.querySelectorAll('.ssc-native-cube3d-sticker').length,24,'2x2 modal must show 24 stickers.');
const modalPlayer=viewer.querySelector('.ssc-native-cube3d-root');
assert.equal(modalPlayer.style.pointerEvents,'auto','2x2 modal player must remain interactive.');
assert.equal(modalPlayer.tabIndex,0,'2x2 modal player must be focusable for interaction.');
viewer.querySelector('.ssc-native-cube3d-cube').style.transform='rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
assert.equal(window.SSCPreviewSettings.resetCamera(),true,'modal reset angle must work for 2x2.');
assert.equal(viewer.querySelector('.ssc-native-cube3d-cube').style.transform,defaultTransform,'2x2 modal reset must restore U/F/R orientation.');
window.SSCPreviewSettings.close();

console.log('Solid native 2x2/3x3 3D and thumbnail/modal checks passed.');
dom.window.close();
