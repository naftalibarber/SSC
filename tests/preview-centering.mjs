import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;

window.console=console;
window.ResizeObserver=class{observe(){}disconnect(){}};

function evaluate(path){window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);}
evaluate('code/js/preview/ssc-svg-renderer.js');
evaluate('code/js/preview-sizing.js');

function approx(actual,expected,message){
  assert.ok(Math.abs(actual-expected)<1e-6,`${message}: expected ${expected}, received ${actual}`);
}

function setDpr(value){
  Object.defineProperty(window,'devicePixelRatio',{value,configurable:true});
}

function makeCard(baseWidth=232,baseHeight=176){
  const card=window.document.createElement('div');
  card.className='cube-preview-card';
  card.style.boxSizing='border-box';
  card.style.border='1px solid #d7d7d7';
  card.style.padding='6px';
  card.style.setProperty('--ssc-preview-card-width-correction','0px');
  card.style.setProperty('--ssc-preview-card-height-correction','0px');
  card.getBoundingClientRect=()=>{
    const widthCorrection=parseFloat(card.style.getPropertyValue('--ssc-preview-card-width-correction'))||0;
    const heightCorrection=parseFloat(card.style.getPropertyValue('--ssc-preview-card-height-correction'))||0;
    const width=baseWidth-widthCorrection,height=baseHeight-heightCorrection;
    return{x:0,y:0,left:0,top:0,width,height,right:width,bottom:height};
  };
  window.document.body.appendChild(card);
  return card;
}

function contentBox(card){
  const style=window.getComputedStyle(card),rect=card.getBoundingClientRect();
  const horizontal=(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.borderRightWidth)||0)+(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0);
  const vertical=(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0)+(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
  return{width:rect.width-horizontal,height:rect.height-vertical};
}

const cases=[];
for(const dpr of [1,1.25,1.5,2]){
  setDpr(dpr);
  for(const order of [2,3,4]){
    const card=makeCard();
    const svg=window.document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('ssc-native-preview-svg');
    svg.setAttribute('data-cube-order',String(order));
    card.appendChild(svg);

    window.SSCPreviewSizing.fitPreviewToContainer(card);

    const box=contentBox(card);
    const width=parseFloat(svg.style.width),height=parseFloat(svg.style.height);
    const left=parseFloat(svg.style.marginLeft)||0,top=parseFloat(svg.style.marginTop)||0;
    const widthCorrection=Number(card.dataset.previewCardWidthCorrectionDevicePixels);
    const heightCorrection=Number(card.dataset.previewCardHeightCorrectionDevicePixels);

    assert.ok([0,1].includes(widthCorrection));
    assert.ok([0,1].includes(heightCorrection));
    approx(width*dpr,Math.round(width*dpr),`${order}x${order} device-pixel width at DPR ${dpr}`);
    approx(height*dpr,Math.round(height*dpr),`${order}x${order} device-pixel height at DPR ${dpr}`);
    approx((left*2)+width,box.width,`${order}x${order} horizontal center at DPR ${dpr}`);
    approx((top*2)+height,box.height,`${order}x${order} vertical center at DPR ${dpr}`);
    assert.ok(Number(card.dataset.previewStickerDevicePixels)>0);
    assert.equal(Number(card.dataset.previewSeparatorDevicePixels),1);

    cases.push({order,dpr,widthCorrection,heightCorrection});
    card.remove();
  }
}

setDpr(1);
const fallbackCard=makeCard();
const net=window.document.createElement('div');
net.className='cube-preview-net ssc-preview-dom-net';
net.dataset.cubeOrder='3';
for(const faceName of ['U','L','F','R','B','D']){
  const face=window.document.createElement('div');
  face.className='ssc-preview-dom-face';
  for(let index=0;index<9;index++){
    const sticker=window.document.createElement('span');
    sticker.className='ssc-preview-dom-sticker';
    face.appendChild(sticker);
  }
  net.appendChild(face);
}
fallbackCard.appendChild(net);
window.SSCPreviewSizing.fitPreviewToContainer(fallbackCard);

const fallbackBox=contentBox(fallbackCard);
const fallbackWidth=parseFloat(net.style.width),fallbackHeight=parseFloat(net.style.height);
approx(((parseFloat(net.style.marginLeft)||0)*2)+fallbackWidth,fallbackBox.width,'DOM fallback horizontal center');
approx(((parseFloat(net.style.marginTop)||0)*2)+fallbackHeight,fallbackBox.height,'DOM fallback vertical center');
assert.equal(Number(net.dataset.previewStickerDevicePixels),13);
assert.equal(Number(net.dataset.previewSeparatorDevicePixels),1);
assert.equal(new Set([...fallbackCard.querySelectorAll('.ssc-preview-dom-sticker')].map(sticker=>sticker.style.width)).size,1);
assert.equal(new Set([...fallbackCard.querySelectorAll('.ssc-preview-dom-sticker')].map(sticker=>sticker.style.height)).size,1);
fallbackCard.remove();

console.log('[SSC Preview CI] Pixel-perfect centering summary');
console.log(JSON.stringify({
  ok:true,
  cases:cases.length,
  orders:[2,3,4],
  devicePixelRatios:[1,1.25,1.5,2],
  exactCardCenter:true,
  equalStickerGeometry:true,
  domFallbackCentered:true
},null,2));

dom.window.close();
