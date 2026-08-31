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

function makeCard(baseWidth=232,baseHeight=176,baseLeft=13.37,baseTop=9.23){
  const card=window.document.createElement('div');
  card.__baseWidth=baseWidth;
  card.__baseHeight=baseHeight;
  card.className='cube-preview-card';
  card.style.boxSizing='border-box';
  card.style.border='1px solid #d7d7d7';
  card.style.padding='6px';
  card.style.setProperty('--ssc-preview-card-width-correction','0px');
  card.style.setProperty('--ssc-preview-card-height-correction','0px');
  card.getBoundingClientRect=()=>{
    const widthCorrection=parseFloat(card.style.getPropertyValue('--ssc-preview-card-width-correction'))||0;
    const heightCorrection=parseFloat(card.style.getPropertyValue('--ssc-preview-card-height-correction'))||0;
    const width=card.__baseWidth-widthCorrection,height=card.__baseHeight-heightCorrection;
    return{x:baseLeft,y:baseTop,left:baseLeft,top:baseTop,width,height,right:baseLeft+width,bottom:baseTop+height};
  };
  window.document.body.appendChild(card);
  return card;
}

function contentBox(card){
  const style=window.getComputedStyle(card),rect=card.getBoundingClientRect();
  const horizontal=(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.borderRightWidth)||0)+(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0);
  const vertical=(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0)+(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
  const left=rect.left+(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.paddingLeft)||0);
  const top=rect.top+(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.paddingTop)||0);
  return{left,top,width:rect.width-horizontal,height:rect.height-vertical};
}

setDpr(1);
window.document.documentElement.style.setProperty('--ssc-cube-line-width','4');
for(const transientOrder of [4,5]){
  const transientCard=makeCard(74,54);
  const transientSvg=window.document.createElementNS('http://www.w3.org/2000/svg','svg');
  transientSvg.classList.add('ssc-native-preview-svg');
  transientSvg.setAttribute('data-cube-order',String(transientOrder));
  transientCard.appendChild(transientSvg);
  assert.doesNotThrow(
    ()=>window.SSCPreviewSizing.fitPreviewToContainer(transientCard),
    'A transient pre-layout card size must defer fitting instead of raising a runtime error.'
  );
  assert.equal(transientCard.dataset.previewFitPending,'true');
  transientCard.__baseWidth=232;
  transientCard.__baseHeight=176;
  window.SSCPreviewSizing.fitPreviewToContainer(transientCard);
  assert.equal(transientCard.dataset.previewFitPending,undefined);
  assert.equal(Number(transientCard.dataset.previewLineDevicePixels),4);
  transientCard.remove();
}

const cases=[];
const previewSizes=[150,200,300,400,500];
for(const dpr of [1,1.25,1.5,2]){
  setDpr(dpr);
  for(const order of [2,3,4,5]){
    for(const selectedLineWidth of [1,2,3,4]){
      const sizesForOrder=order===5?previewSizes:[200];
      for(const previewSize of sizesForOrder){
        window.localStorage.setItem('sscCubePreviewSizeV1',String(previewSize));
        window.document.documentElement.style.setProperty('--ssc-cube-line-width',String(selectedLineWidth));
        const scale=previewSize/100;
        const card=makeCard(116*scale,88*scale);
        const svg=window.document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.classList.add('ssc-native-preview-svg');
        svg.setAttribute('data-cube-order',String(order));
        card.appendChild(svg);

        window.SSCPreviewSizing.fitPreviewToContainer(card);

        const box=contentBox(card);
        const width=parseFloat(svg.style.width),height=parseFloat(svg.style.height);
        const left=parseFloat(svg.style.marginLeft)||0,top=parseFloat(svg.style.marginTop)||0;
        const absoluteLeft=box.left+left,absoluteTop=box.top+top;
        const targetLeft=box.left+((box.width-width)/2),targetTop=box.top+((box.height-height)/2);
        const widthCorrection=Number(card.dataset.previewCardWidthCorrectionDevicePixels);
        const heightCorrection=Number(card.dataset.previewCardHeightCorrectionDevicePixels);
        const expectedLineWidth=Math.max(1,Math.round(selectedLineWidth*dpr));

        assert.ok(widthCorrection>=0&&widthCorrection<2+1e-6);
        assert.ok(heightCorrection>=0&&heightCorrection<2+1e-6);
        approx(width*dpr,Math.round(width*dpr),`${order}x${order} device-pixel width at DPR ${dpr}`);
        approx(height*dpr,Math.round(height*dpr),`${order}x${order} device-pixel height at DPR ${dpr}`);
        approx(absoluteLeft*dpr,Math.round(absoluteLeft*dpr),`${order}x${order} snapped absolute left at DPR ${dpr}`);
        approx(absoluteTop*dpr,Math.round(absoluteTop*dpr),`${order}x${order} snapped absolute top at DPR ${dpr}`);
        assert.ok(Math.abs((absoluteLeft-targetLeft)*dpr)<=.5+1e-6,'Horizontal centering may deviate by at most half a physical pixel.');
        assert.ok(Math.abs((absoluteTop-targetTop)*dpr)<=.5+1e-6,'Vertical centering may deviate by at most half a physical pixel.');
        approx(box.width*dpr,Number(card.dataset.previewCenteredDeviceWidth),`${order}x${order} corrected content width at DPR ${dpr}`);
        approx(box.height*dpr,Number(card.dataset.previewCenteredDeviceHeight),`${order}x${order} corrected content height at DPR ${dpr}`);
        assert.ok(width<=box.width+1e-6,'The fitted SVG must not overflow the card horizontally.');
        assert.ok(height<=box.height+1e-6,'The fitted SVG must not overflow the card vertically.');
        assert.ok(Number(card.dataset.previewStickerDevicePixels)>0);
        assert.equal(Number(card.dataset.previewSeparatorDevicePixels),expectedLineWidth);
        assert.equal(Number(card.dataset.previewLineDevicePixels),expectedLineWidth);
        assert.equal(Number(card.dataset.previewSelectedLineWidth),selectedLineWidth);
        assert.equal(svg.style.transform,'');

        cases.push({order,dpr,previewSize,selectedLineWidth,expectedLineWidth,widthCorrection,heightCorrection});
        card.remove();
      }
    }
  }
}

setDpr(1);
window.localStorage.setItem('sscCubePreviewSizeV1','200');
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
assert.equal(net.style.getPropertyValue('--ssc-preview-step'),'');
assert.ok(parseFloat(net.style.getPropertyValue('--ssc-preview-net-gap'))>0);
assert.equal(new Set([...fallbackCard.querySelectorAll('.ssc-preview-dom-sticker')].map(sticker=>sticker.style.width)).size,1);
assert.equal(new Set([...fallbackCard.querySelectorAll('.ssc-preview-dom-sticker')].map(sticker=>sticker.style.height)).size,1);
fallbackCard.remove();

console.log('[SSC Preview CI] Pixel-perfect centering summary');
console.log(JSON.stringify({
  ok:true,
  cases:cases.length,
  orders:[2,3,4,5],
  previewSizes,
  fiveByFiveCases:cases.filter(item=>item.order===5).length,
  selectedLineWidths:[1,2,3,4],
  devicePixelRatios:[1,1.25,1.5,2],
  absoluteOriginSnapped:true,
  maximumCenterErrorDevicePixels:.5,
  equalStickerGeometry:true,
  domFallbackCentered:true
},null,2));

dom.window.close();
