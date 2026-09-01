import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html lang="he" dir="rtl"><body><div id="cubePreview2D" class="cube-preview-card"></div></body></html>',{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;

window.console=console;
window.ResizeObserver=class{observe(){}disconnect(){}};
window.requestAnimationFrame=callback=>{callback();return 1;};
window.cancelAnimationFrame=()=>{};
window.SSCPreviewSizing={
  getCubeLineWidth:()=>1,
  scheduleFit(){},
  snapPixelPerfectPlacement(box,geometry,dpr){
    const cssWidth=geometry.width/dpr;
    const cssHeight=geometry.height/dpr;
    const targetLeft=box.left+((box.width-cssWidth)/2);
    const targetTop=box.top+((box.height-cssHeight)/2);
    const snappedLeft=Math.round(targetLeft*dpr)/dpr;
    const snappedTop=Math.round(targetTop*dpr)/dpr;
    return{
      cssWidth,cssHeight,snappedLeft,snappedTop,
      offsetX:snappedLeft-box.left,
      offsetY:snappedTop-box.top,
      centerErrorXDevicePixels:(snappedLeft-targetLeft)*dpr,
      centerErrorYDevicePixels:(snappedTop-targetTop)*dpr
    };
  }
};

function evaluate(path){
  window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);
}

evaluate('code/js/preview/ssc-nxn-state.js');
evaluate('code/js/preview/ssc-svg-renderer.js');
evaluate('code/js/preview/ssc-preview-v1.js');
evaluate('code/js/preview/ssc-high-order-preview.js');

assert.deepEqual([...window.SSCSvgCubeRenderer.PIXEL_PERFECT_ORDERS],[2,3,4,5,6,7]);
assert.deepEqual([...window.SSCHighOrderPreview.orders],[6,7]);

const card=window.document.getElementById('cubePreview2D');
card.style.boxSizing='border-box';
card.style.border='1px solid #d7d7d7';
card.style.padding='6px';
card.style.setProperty('--ssc-preview-card-width-correction','0px');
card.style.setProperty('--ssc-preview-card-height-correction','0px');
card.getBoundingClientRect=()=>{
  const widthCorrection=parseFloat(card.style.getPropertyValue('--ssc-preview-card-width-correction'))||0;
  const heightCorrection=parseFloat(card.style.getPropertyValue('--ssc-preview-card-height-correction'))||0;
  const width=232-widthCorrection;
  const height=176-heightCorrection;
  return{x:10,y:10,left:10,top:10,width,height,right:10+width,bottom:10+height};
};

const cases=[
  {order:6,eventId:'666',scramble:"3Rw U2 Fw' L2 D B2 Rw2 U' F D2 3Lw' B Uw2 R2 Fw D' 3Bw2"},
  {order:7,eventId:'777',scramble:"3Rw U2 Fw' L2 D B2 Rw2 U' 3Fw D2 3Lw' B Uw2 R2 Fw D' 3Bw2 Lw U2"}
];

for(const testCase of cases){
  const {order,eventId,scramble}=testCase;
  const result=window.SSCPreviewV1.render(card,scramble,eventId,{strict:true});
  const svg=result.svg;

  assert.equal(result.order,order);
  assert.equal(svg.getAttribute('data-cube-order'),String(order));
  assert.equal(svg.getAttribute('data-layout-style'),`cstimer-${order}x${order}`);
  assert.equal(svg.getAttribute('data-pixel-perfect-grid'),'true');
  assert.equal(svg.getAttribute('data-line-renderer'),'face-background');
  assert.equal(svg.getAttribute('shape-rendering'),'crispEdges');
  assert.equal(card.dataset.previewLayout,`cstimer-${order}x${order}`);
  assert.equal(card.classList.contains(`ssc-preview-cstimer-${order}x${order}`),true);

  const stickers=[...svg.querySelectorAll('.ssc-svg-sticker')];
  const backgrounds=[...svg.querySelectorAll('.ssc-svg-face-background')];
  assert.equal(stickers.length,6*order*order);
  assert.equal(backgrounds.length,6);
  assert.equal(new Set(stickers.map(sticker=>sticker.dataset.stickerId)).size,stickers.length);
  backgrounds.forEach(background=>{
    assert.equal(background.getAttribute('fill'),'#000000');
    assert.equal(background.getAttribute('data-grid-background'),'true');
    assert.equal(background.getAttribute('stroke'),null);
  });
  stickers.forEach(sticker=>{
    assert.equal(sticker.getAttribute('rx'),'0');
    assert.equal(sticker.getAttribute('ry'),'0');
    assert.equal(sticker.getAttribute('stroke'),null);
  });

  assert.equal(window.SSCHighOrderPreview.fit(card),true);
  assert.equal(card.dataset.previewHighOrderConnected,String(order));
  assert.ok(Number(card.dataset.previewStickerDevicePixels)>0);
  assert.equal(Number(card.dataset.previewSeparatorDevicePixels),1);
  assert.equal(Number(card.dataset.previewLineDevicePixels),1);
  assert.ok(parseFloat(svg.style.width)>0);
  assert.ok(parseFloat(svg.style.height)>0);
}

assert.equal(card.classList.contains('ssc-preview-cstimer-6x6'),false,'Switching to 7x7 must remove the stale 6x6 layout class.');
assert.equal(card.classList.contains('ssc-preview-cstimer-7x7'),true);

console.log('[SSC Preview CI] 6x6/7x7 high-order preview summary');
console.log(JSON.stringify({
  ok:true,
  orders:[6,7],
  sharedPixelPerfectPipeline:true,
  continuousBlackFaceGrid:true,
  dprFitConnected:true,
  wideMoveState:true
},null,2));

dom.window.close();
