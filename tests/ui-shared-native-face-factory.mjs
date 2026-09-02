import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body><div id="host"></div></body></html>',{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;
window.console=console;
window.SSCCubePreview={
  getColors(){return{U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};},
  supportsEvent(){return true;},
  getEvent(eventId){return{id:eventId,label:eventId,name:eventId};}
};

function evaluate(path){
  window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);
}

evaluate('code/js/preview/ssc-nxn-state.js');
evaluate('code/js/puzzle-3d.js');

assert.equal(typeof window.SSCPuzzle3D.createFaceSet,'function','puzzle-3d.js must own the shared face factory.');
assert.equal(window.SSCPuzzle3D.nativeFaceSource,'ssc-puzzle-3d-face-factory');

const scramble="R U R' U' F2";
const built=window.SSCPuzzle3D.createFaceSet(scramble,'333',['U','F','R']);
assert.ok(built,'Shared face factory must build native faces.');
assert.equal(built.source,'ssc-puzzle-3d-face-factory');
assert.equal(built.order,3);
assert.deepEqual([...built.sides],['U','F','R']);
assert.equal(built.faces.length,3);
assert.equal(built.faces.reduce((sum,face)=>sum+face.querySelectorAll('.ssc-native-cube3d-sticker').length,0),27);
for(const face of built.faces){
  assert.equal(face.className,'ssc-native-cube3d-face');
  assert.equal(face.dataset.nativeFaceSource,'ssc-puzzle-3d');
  for(const sticker of face.querySelectorAll('.ssc-native-cube3d-sticker')){
    assert.equal(sticker.dataset.nativeFaceSource,'ssc-puzzle-3d');
  }
}

const host=window.document.getElementById('host');
const player=await window.SSCPuzzle3D.render(host,scramble,'333');
assert.ok(player instanceof window.HTMLElement);
assert.equal(player.dataset.nativeFaceSource,'ssc-puzzle-3d-face-factory','Full 3D must identify the exact same face factory.');
assert.equal(host.querySelectorAll('.ssc-native-cube3d-face').length,6);
assert.equal(host.querySelectorAll('.ssc-native-cube3d-sticker').length,54);
for(const face of host.querySelectorAll('.ssc-native-cube3d-face')){
  assert.equal(face.dataset.nativeFaceSource,'ssc-puzzle-3d','Full 3D face DOM must be produced by the same factory used by flat modes.');
}

const source=fs.readFileSync('code/js/puzzle-3d.js','utf8');
assert.match(source,/const built=createNativeFaceSet\(scramble,eventValue,FACE_ORDER\)/,'Full 3D renderer must call the shared face factory instead of a parallel face path.');
assert.match(source,/createFaceSet:createNativeFaceSet/,'Shared face factory must be exported by SSCPuzzle3D.');

console.log('Full 3D, 2D and selected-face paths share the puzzle-3d native face factory.');
dom.window.close();