import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html lang="en"><body><div id="host"></div></body></html>',{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;
window.console=console;
window.SSCCubePreview={
  getColors(){return{U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};}
};

function evaluate(path){
  window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);
}

evaluate('code/js/preview/ssc-nxn-state.js');
evaluate('code/js/puzzle-3d.js');

const host=window.document.getElementById('host');
const scramble="R U R' U' F2 D L2 B' U2 R2";
const player=await window.SSCPuzzle3D.render(host,scramble,'333');

assert.ok(player instanceof window.HTMLElement,'3D render must return a DOM player');
assert.equal(host.dataset.previewEngine,'ssc-native-css3d-solid');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-face').length,6,'3D must render six continuous cube faces');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-sticker').length,54,'3D must render exactly 54 stickers');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-cubie').length,0,'3D must not render separated cubies');

const expected=window.SSCNxNState.buildState(scramble,3,{strict:true}).faces;
for(const side of ['F','B','R','L','U','D']){
  const face=host.querySelector(`.ssc-native-cube3d-face[data-side="${side}"]`);
  assert.ok(face,`missing ${side} face`);
  const stickers=[...face.querySelectorAll('.ssc-native-cube3d-sticker')];
  assert.equal(stickers.length,9,`${side} face must contain 9 stickers`);
  for(const sticker of stickers){
    const row=Number(sticker.dataset.row);
    const col=Number(sticker.dataset.col);
    assert.equal(sticker.dataset.identity,expected[side][row][col],`${side}[${row}][${col}] must match shared state`);
  }
}

const source=fs.readFileSync('code/js/puzzle-3d.js','utf8');
assert.match(source,/pointerdown/,'3D must support drag interaction');
assert.match(source,/resetCamera/,'3D must expose camera reset');
assert.match(source,/SSCCubePreview\?\.getColors/,'3D must use the shared cube palette');
assert.match(source,/NATIVE_EVENT_IDS=new Set\(\['333','333bf','333fm','333oh','333mbf'\]\)/,'Native 3D must include 3BLD, FMC and OH as 3x3-derived events');
assert.match(source,/'3bld':'333bf'/,'Native 3D must normalize the 3BLD alias to 333bf');
assert.doesNotMatch(source,/for\(let x=-1;x<=1;x\+\+\)for\(let y=-1;y<=1;y\+\+\)for\(let z=-1;z<=1;z\+\+\)/,'3D must not return to 27 separated cubies');
assert.doesNotMatch(source,/cdn\.cubing\.net|TwistyPlayer/,'native 3D must not depend on TwistyPlayer');

console.log('Solid native 3x3/3BLD 3D checks passed.');
