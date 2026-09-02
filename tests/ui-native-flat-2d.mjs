import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('code/js/preview/native-flat-2d.js','utf8');

assert.match(source,/window\.SSCPuzzle3D\.render\(source,scramble,eventId\)/,'2D must source its faces from the native 3D renderer.');
assert.match(source,/\.ssc-native-cube3d-face\[data-side=/,'2D must extract the real native 3D face DOM.');
assert.doesNotMatch(source,/SSCNxNState|buildState\(/,'2D native-flat layer must not calculate a second cube state.');
assert.doesNotMatch(source,/createElement\('span'\)/,'2D native-flat layer must not create sticker elements.');
assert.match(source,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'2D native-flat layer must use a 4-column cube net.');
assert.match(source,/grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/,'2D native-flat layer must use a 3-row cube net.');

const dom=new JSDOM('<!doctype html><html lang="he" dir="rtl"><head></head><body><div id="card" class="cube-preview-card"></div></body></html>',{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;
window.console=console;
let mode='2d';
let baseCalls=0;
let nativeCalls=0;
let fitCalls=0;
let syncSnapshot=null;
let colors={U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};
const orders={222:2,333:3,444:4,'333bf':3,'333fm':3,'333oh':3};
const aliases={'2x2':'222','2×2':'222','3x3':'333','3×3':'333','4x4':'444','4×4':'444'};
const normalize=value=>aliases[String(value||'333').toLowerCase()]||String(value||'333').toLowerCase();

window.SSCPreviewSettings={
  getMode(){return mode;},
  syncLastRender(container,scramble,eventId){syncSnapshot={container,scramble,eventId};return true;}
};
window.SSCPreviewSizing={scheduleFit(){fitCalls++;}};
window.SSCPuzzle3D={
  isNative3D(eventId){return Boolean(orders[normalize(eventId)]);},
  getEvent(eventId){
    const id=normalize(eventId);
    const order=orders[id];
    return order?{id,order,puzzle:`${order}x${order}x${order}`,label:`${order}×${order}`} : null;
  },
  async render(container,scramble,eventId){
    nativeCalls++;
    const id=normalize(eventId);
    const order=orders[id];
    assert.ok(order,'Native 3D mock only accepts native cube events.');
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
    baseCalls++;
    const fallback=window.document.createElement('svg');
    fallback.dataset.base='true';
    container.replaceChildren(fallback);
    container.dataset.previewMode='2d';
    return{engine:'base',scramble,eventId};
  },
  setColors(next){colors={...colors,...next};return{...colors};},
  resetColors(){colors={U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};return{...colors};}
};

window.eval(`${source}\n//# sourceURL=native-flat-2d.js`);
assert.ok(window.SSCNativeFlat2D,'Native-flat 2D API must be installed.');
assert.equal(window.SSCCubePreview.__sscNativeFlat2DLayer,true);
assert.equal(window.SSCNativeFlat2D.supportsEvent('222'),true);
assert.equal(window.SSCNativeFlat2D.supportsEvent('333'),true);
assert.equal(window.SSCNativeFlat2D.supportsEvent('444'),true);
assert.equal(window.SSCNativeFlat2D.supportsEvent('555'),false);

const card=window.document.getElementById('card');

async function checkNativeNet(eventId,order,scramble,expectedStickers){
  const result=await window.SSCCubePreview.render(card,scramble,eventId);
  assert.equal(result.source,'native-3d');
  assert.equal(result.order,order);
  assert.equal(card.dataset.previewMode,'2d');
  assert.equal(card.dataset.previewEngine,'ssc-native-3d-flat-net');
  assert.equal(card.querySelector('.ssc-native-flat-net')?.dataset.source,'native-3d');
  assert.equal(card.querySelectorAll('.ssc-native-cube3d-face.ssc-native-flat-net-face').length,6,'Flat net must contain the six actual native 3D face elements.');
  assert.equal(card.querySelectorAll('.ssc-native-cube3d-sticker').length,expectedStickers,'Flat net sticker count must equal the native 3D cube sticker count.');
  assert.equal(card.querySelectorAll('svg').length,0,'Native 2D must not use the old SVG renderer for native 3D events.');
  const expectedPositions={U:['2','1'],L:['1','2'],F:['2','2'],R:['3','2'],B:['4','2'],D:['2','3']};
  for(const [side,[column,row]] of Object.entries(expectedPositions)){
    const face=card.querySelector(`.ssc-native-flat-net-face[data-side="${side}"]`);
    assert.ok(face,`Missing ${side} face.`);
    assert.equal(face.style.gridColumn,column);
    assert.equal(face.style.gridRow,row);
    assert.equal(face.classList.contains('ssc-native-cube3d-face'),true);
  }
}

await checkNativeNet('222',2,"R U' F2",24);
await checkNativeNet('333',3,"R U R' U'",54);
await checkNativeNet('444',4,'Rw U2 Fw',96);
assert.equal(baseCalls,0,'2x2/3x3/4x4 2D must not invoke the old 2D renderer.');
assert.equal(nativeCalls,3,'Each native 2D render must be built from native 3D once.');
assert.equal(syncSnapshot.eventId,'444');
assert.ok(fitCalls>=3);

mode='3d';
const threeDResult=await window.SSCCubePreview.render(card,'R U','333');
assert.equal(threeDResult.engine,'base','3D mode must stay on the existing 3D-connected pipeline instead of flattening.');
assert.equal(baseCalls,1);

mode='2d';
const highOrderResult=await window.SSCCubePreview.render(card,'Rw U2','555');
assert.equal(highOrderResult.engine,'base','5x5+ must keep the existing 2D fallback until native 3D support exists.');
assert.equal(baseCalls,2);

await window.SSCCubePreview.render(card,'R U','333');
window.SSCCubePreview.setColors({U:'#123456'});
await new Promise(resolve=>window.setTimeout(resolve,0));
const uSticker=card.querySelector('.ssc-native-flat-net-face[data-side="U"] .ssc-native-cube3d-sticker');
assert.equal(uSticker.style.getPropertyValue('--sticker'),'#123456','2D native net must repaint from the same 3D face renderer after color changes.');

window.SSCSelectedFacesPreview={isEnabled:()=>true};
const selectedBypass=await window.SSCCubePreview.render(card,'R U','333');
assert.equal(selectedBypass.engine,'base','Selected-faces mode must remain free to own the final rendering.');

dom.window.close();
console.log('Native 3D face reuse in normal 2D net checks passed.');
