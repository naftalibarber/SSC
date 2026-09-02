import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html lang="he" dir="rtl"><body><div id="host"></div><div id="thumbnail" class="cube-preview-card"></div></body></html>',{
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

const primaryCases=[
  {eventId:'222',order:2,scramble:"R U R' F2 U' R2 F U2 R'"},
  {eventId:'333',order:3,scramble:"R U R' U' F2 D L2 B' U2 R2"},
  {eventId:'444',order:4,scramble:"Rw U Rw' F2 Uw2 R2 Fw U2 Lw' D B2"},
  {eventId:'555',order:5,scramble:"Rw U2 Fw' Lw D 3Rw2 B'"},
  {eventId:'666',order:6,scramble:"3Rw U2 Fw' 3Lw D2 Bw Rw'"},
  {eventId:'777',order:7,scramble:"3Rw U2 3Fw' 3Lw D2 Bw 3Uw' Rw2"}
];

for(const {eventId,order} of primaryCases){
  for(const alias of [eventId,`${order}x${order}`,`${order}×${order}`]){
    assert.equal(window.SSCPuzzle3D.supportsEvent(alias),true,`${alias} must be supported by native 3D.`);
    assert.equal(window.SSCPuzzle3D.isNative3D(alias),true,`${alias} must route to the shared native CSS 3D renderer.`);
  }

  const event=window.SSCPuzzle3D.getEvent(eventId);
  assert.equal(event.id,eventId);
  assert.equal(event.order,order);
  assert.equal(event.puzzle,`${order}x${order}x${order}`);
  assert.equal(event.label,`${order}×${order}`);
  assert.equal(event.family,'cube');
}

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
      assert.equal(sticker.dataset.side,side,`${eventId} sticker side metadata must remain ${side}`);
      assert.ok(Number.isInteger(row)&&row>=0&&row<order,`${eventId} ${side} row must be within the ${order}x${order} matrix`);
      assert.ok(Number.isInteger(col)&&col>=0&&col<order,`${eventId} ${side} col must be within the ${order}x${order} matrix`);
      assert.equal(sticker.dataset.identity,expected[side][row][col],`${eventId} ${side}[${row}][${col}] must match shared SSCNxNState`);
    }
  }
}

const host=window.document.getElementById('host');
const defaultTransform='rotateX(-28deg) rotateY(-38deg) scale3d(1,1,1)';

for(const {eventId,order,scramble} of primaryCases){
  const player=await window.SSCPuzzle3D.render(host,scramble,eventId);
  const stickerCount=6*order*order;
  assert.ok(player instanceof window.HTMLElement,`${order}x${order} 3D render must return a DOM player`);
  assert.equal(player.dataset.cubeOrder,String(order));
  assert.equal(player.style.getPropertyValue('--ssc-native-order'),String(order));
  assert.equal(host.dataset.previewEngine,'ssc-native-css3d-solid');
  assert.equal(host.dataset.wcaEvent,eventId);
  assert.equal(host.dataset.wcaPuzzle,`${order}x${order}x${order}`);
  assert.equal(host.dataset.puzzle,`${order}×${order}`);
  assert.equal(host.querySelectorAll('.ssc-native-cube3d-face').length,6,`${order}x${order} must render six continuous cube faces`);
  assert.equal(host.querySelectorAll('.ssc-native-cube3d-sticker').length,stickerCount,`${order}x${order} must render exactly ${stickerCount} stickers`);
  assert.equal(host.querySelectorAll('.ssc-native-cube3d-cubie').length,0,`${order}x${order} must not render separated cubies`);
  verifySharedState(host,scramble,eventId,order);
  assert.equal(host.querySelector('.ssc-native-cube3d-cube').style.transform,defaultTransform,`${order}x${order} must start at the standard U/F/R camera angle.`);
  host.querySelector('.ssc-native-cube3d-cube').style.transform='rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  assert.equal(window.SSCPuzzle3D.resetCamera(host),true,`${order}x${order} reset angle must be available.`);
  assert.equal(host.querySelector('.ssc-native-cube3d-cube').style.transform,defaultTransform,`${order}x${order} reset must return to the standard U/F/R angle.`);
}

assert.equal(host.querySelectorAll('.ssc-native-cube3d-sticker').length,294,'7x7 regression guard must end with exactly 294 stickers.');

const source=fs.readFileSync('code/js/puzzle-3d.js','utf8');
assert.match(source,/grid-template-columns:repeat\(var\(--ssc-native-order\),minmax\(0,1fr\)\)/,'3D face grid must be order-driven.');
assert.match(source,/grid-template-rows:repeat\(var\(--ssc-native-order\),minmax\(0,1fr\)\)/,'3D face rows must be order-driven.');
assert.match(source,/direction:ltr/,'3D face grids must remain LTR even when the application document is RTL.');
assert.match(source,/SSCNxNState\.buildState\(scramble,order,\{strict:true\}\)/,'all native NxN 3D sizes must use the shared NxN state engine.');
for(const [eventId,order] of [['222',2],['333',3],['444',4],['555',5],['666',6],['777',7]]){
  assert.match(source,new RegExp(`\\['${eventId}',${order}\\]`),`${eventId} must be registered as native order ${order}.`);
}
assert.match(source,/pointerdown/,'3D modal must support drag interaction');
assert.match(source,/wheel/,'3D modal must retain zoom interaction');
assert.match(source,/resetCamera/,'3D must expose camera reset');
assert.match(source,/SSCCubePreview\?\.getColors/,'3D must use the shared cube palette');
assert.match(source,/html\[data-theme="dark"\]/,'3D must retain dark-theme styling');
assert.match(source,/html\[data-theme="oled"\]/,'3D must retain OLED styling');
assert.doesNotMatch(source,/grid-template-columns:repeat\([2-7],/,'native NxN 3D must not keep a hard-coded face grid size.');
assert.doesNotMatch(source,/function\s+render(?:5x5|6x6|7x7)/i,'5x5-7x7 must not introduce dedicated render functions.');
assert.doesNotMatch(source,/function parseMove/,'3D renderer must not introduce a scramble parser.');
assert.doesNotMatch(source,/for\(let x=-1;x<=1;x\+\+\)for\(let y=-1;y<=1;y\+\+\)for\(let z=-1;z<=1;z\+\+\)/,'3D must not return to separated cubies');
assert.doesNotMatch(source,/cdn\.cubing\.net|TwistyPlayer/,'native 3D must not depend on TwistyPlayer');

const styleSource=window.document.getElementById('sscNativeCube3DStyles')?.textContent||'';
assert.match(styleSource,/\.ssc-native-cube3d-face\{[\s\S]*?direction:ltr;/,'injected native face styling must explicitly neutralize document RTL.');

// Exercise the real connected thumbnail/modal pipeline. The same renderer and
// exact SSCNxNState-derived scramble state must be used in both surfaces.
evaluate('code/js/preview-manager.js');
evaluate('code/js/preview-integration.js');
const thumbnail=window.document.getElementById('thumbnail');

async function verifyThumbnailAndModal({eventId,order,scramble}){
  const stickerCount=6*order*order;
  const thumbnailPlayer=await window.SSCCubePreview.render(thumbnail,scramble,eventId);
  assert.ok(thumbnailPlayer instanceof window.HTMLElement,`${order}x${order} thumbnail must use the native 3D player.`);
  assert.equal(thumbnail.dataset.previewMode,'3d');
  assert.equal(thumbnail.dataset.wcaEvent,eventId);
  assert.equal(thumbnail.dataset.wcaPuzzle,`${order}x${order}x${order}`);
  assert.equal(thumbnail.classList.contains('ssc-preview-thumbnail-3d'),true,`${order}x${order} thumbnail must be marked static.`);
  assert.equal(thumbnailPlayer.style.pointerEvents,'none',`${order}x${order} thumbnail player must not accept pointer input.`);
  assert.equal(thumbnailPlayer.tabIndex,-1,`${order}x${order} thumbnail must not be keyboard-draggable.`);
  assert.equal(thumbnail.querySelectorAll('.ssc-native-cube3d-sticker').length,stickerCount,`${order}x${order} thumbnail must display ${stickerCount} stickers.`);
  verifySharedState(thumbnail,scramble,`${eventId}-thumbnail`,order);

  thumbnail.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await new Promise(resolve=>window.setTimeout(resolve,0));
  const modal=window.document.getElementById('sscPreview3DModal');
  assert.ok(modal&&!modal.hidden,`clicking the ${order}x${order} thumbnail must open the existing 3D modal.`);
  const viewer=modal.querySelector('#sscPreview3DViewer');
  assert.equal(viewer.dataset.wcaEvent,eventId,`${order}x${order} modal must preserve the active event.`);
  assert.equal(viewer.dataset.wcaPuzzle,`${order}x${order}x${order}`,`${order}x${order} modal must expose matching puzzle metadata.`);
  assert.equal(viewer.querySelectorAll('.ssc-native-cube3d-face').length,6,`${order}x${order} modal must use the same six-face renderer.`);
  assert.equal(viewer.querySelectorAll('.ssc-native-cube3d-sticker').length,stickerCount,`${order}x${order} modal must show ${stickerCount} stickers.`);
  verifySharedState(viewer,scramble,`${eventId}-modal`,order);

  const modalPlayer=viewer.querySelector('.ssc-native-cube3d-root');
  assert.equal(modalPlayer.style.pointerEvents,'auto',`${order}x${order} modal player must remain interactive.`);
  assert.equal(modalPlayer.tabIndex,0,`${order}x${order} modal player must be focusable for interaction.`);

  const cube=viewer.querySelector('.ssc-native-cube3d-cube');
  const beforeZoom=cube.style.transform;
  modalPlayer.dispatchEvent(new window.WheelEvent('wheel',{deltaY:-120,bubbles:true,cancelable:true}));
  assert.notEqual(cube.style.transform,beforeZoom,`${order}x${order} modal wheel input must change camera zoom.`);

  cube.style.transform='rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  assert.equal(window.SSCPreviewSettings.resetCamera(),true,`${order}x${order} modal reset angle must work.`);
  assert.equal(cube.style.transform,defaultTransform,`${order}x${order} modal reset must restore U/F/R orientation.`);
  window.SSCPreviewSettings.close();
}

for(const testCase of primaryCases)await verifyThumbnailAndModal(testCase);

const expectedStickerCounts=Object.fromEntries(primaryCases.map(({eventId,order})=>[eventId,6*order*order]));
assert.deepEqual(expectedStickerCounts,{222:24,333:54,444:96,555:150,666:216,777:294});

console.log('Solid native 2x2-7x7 CSS 3D, wide-move state and thumbnail/modal checks passed.');
dom.window.close();
