import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

class FakeClassList{
  constructor(){this.values=new Set();}
  add(...names){names.forEach(name=>this.values.add(name));}
  remove(...names){names.forEach(name=>this.values.delete(name));}
  contains(name){return this.values.has(name);}
}

function datasetKey(attribute){
  return attribute.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
}

class FakeElement{
  constructor(tagName='div'){
    this.tagName=String(tagName).toUpperCase();
    this.attributes={};
    this.children=[];
    this.dataset={};
    this.classList=new FakeClassList();
    this.isConnected=true;
    this.id='';
  }
  setAttribute(name,value){
    const text=String(value);
    this.attributes[name]=text;
    if(name==='id')this.id=text;
    if(name==='class')text.split(/\s+/).filter(Boolean).forEach(item=>this.classList.add(item));
    if(name.startsWith('data-'))this.dataset[datasetKey(name)]=text;
  }
  getAttribute(name){return this.attributes[name]??null;}
  appendChild(child){this.children.push(child);child.parentNode=this;return child;}
  replaceChildren(...children){this.children=[...children];children.forEach(child=>{child.parentNode=this;});}
  querySelectorAll(selector){
    const matches=[];
    const visit=node=>{
      for(const child of node.children||[]){
        const sticker=child.classList?.contains('ssc-svg-sticker');
        if(selector.includes('.ssc-svg-sticker')&&sticker&&(!selector.includes('[data-layer]')||child.dataset.layer!==undefined))matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

globalThis.window=globalThis;
globalThis.Element=FakeElement;
globalThis.document={
  documentElement:{lang:'he'},
  createElementNS(_namespace,name){return new FakeElement(name);}
};

const storage=new Map();
globalThis.localStorage={
  getItem(key){return storage.has(key)?storage.get(key):null;},
  setItem(key,value){storage.set(key,String(value));},
  removeItem(key){storage.delete(key);}
};

globalThis.SSCPreviewSizing={scheduleFit(){}};

async function load(path){await import(pathToFileURL(resolve(path)).href);}
await load('code/js/preview/ssc-nxn-state.js');
await load('code/js/preview/ssc-svg-renderer.js');
await load('code/js/preview/ssc-preview-v1.js');

const sizes=[150,200,300,400];
const CSTIMER_COLORS={U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};
const cases={
  2:['',"R U2 F' R2 U' F2 R U'"],
  3:['',"R U2 F' L2 D B2 R2 U' F D2 L' B U2"],
  4:['',"Rw U2 Fw' L2 D B2 Rw2 U' F D2 Lw' B U2"],
  5:['',"Rw U2 Fw' L2 D B2 Rw2 U' F D2 Lw' B Uw2 R2 Fw D' Bw2"],
  6:['',"3Rw U2 Fw' L2 D B2 Rw2 U' F D2 3Lw' B Uw2 R2 Fw D' 3Bw2"],
  7:['',"3Rw U2 Fw' L2 D B2 Rw2 U' 3Fw D2 3Lw' B Uw2 R2 Fw D' 3Bw2 Lw U2"]
};
const EVENT_BY_ORDER={2:'222',3:'333',4:'444',5:'555',6:'666',7:'777'};

assert.deepEqual(globalThis.SSCSvgCubeRenderer.DEFAULT_COLORS,CSTIMER_COLORS);
assert.deepEqual(globalThis.SSCPreviewV1.getColors(),CSTIMER_COLORS);
const savedPalette={U:'#123456',D:'#234567',F:'#345678',B:'#456789',R:'#56789a',L:'#6789ab'};
storage.set('sscCubeColorsV1',JSON.stringify(savedPalette));
assert.deepEqual(globalThis.SSCPreviewV1.getColors(),savedPalette,'Existing custom cube colors must load unchanged.');
storage.delete('sscCubeColorsV1');

function descendants(root,predicate){
  const values=[];
  const walk=node=>{
    for(const child of node.children||[]){
      if(predicate(child))values.push(child);
      walk(child);
    }
  };
  walk(root);
  return values;
}

function validateRender(order,scramble){
  const container=new FakeElement('div');
  container.id=`preview-${order}`;
  const eventId=EVENT_BY_ORDER[order];
  const result=globalThis.SSCPreviewV1.render(container,scramble,eventId,{strict:true});
  const svg=result.svg;
  const geometry=globalThis.SSCSvgCubeRenderer.geometryFor(order);
  assert.equal(svg.getAttribute('viewBox'),`0 0 ${geometry.width} ${geometry.height}`);
  assert.equal(svg.getAttribute('preserveAspectRatio'),'xMidYMid meet');
  const stickers=descendants(svg,node=>node.classList.contains('ssc-svg-sticker'));
  assert.equal(stickers.length,6*order*order);
  assert.equal(new Set(stickers.map(sticker=>sticker.dataset.stickerId)).size,stickers.length);
  for(const sticker of stickers){
    assert.equal(Number(sticker.getAttribute('width')),geometry.stickerSize);
    assert.equal(Number(sticker.getAttribute('height')),geometry.stickerSize);
    const row=Number(sticker.dataset.row);
    const col=Number(sticker.dataset.col);
    assert.equal(Number(sticker.getAttribute('x')),col*(geometry.stickerSize+geometry.stickerGap));
    assert.equal(Number(sticker.getAttribute('y')),row*(geometry.stickerSize+geometry.stickerGap));
  }
  for(const size of sizes){
    const scale=Math.min(size/geometry.width,size/geometry.height);
    const stickerWidth=geometry.stickerSize*scale;
    const stickerHeight=geometry.stickerSize*scale;
    const gap=geometry.stickerGap*scale;
    assert.equal(stickerWidth,stickerHeight);
    if(order===3)assert.equal(gap,0);
    else assert.ok(gap>0);
    assert.ok(geometry.width*scale<=size+1e-9);
    assert.ok(geometry.height*scale<=size+1e-9);
  }

  if(order===3){
    assert.equal(svg.getAttribute('data-layout-style'),'cstimer-3x3');
    assert.equal(geometry.faceGap,geometry.stickerSize/3);
    assert.equal(geometry.outerPadding,geometry.stickerSize/10);
    assert.equal(geometry.stickerRadius,0);
    assert.equal(geometry.faceRadius,0);
    assert.equal(geometry.gridStroke,'#050505');
    assert.equal(geometry.gridStrokeWidth,1);
    assert.ok([
      geometry.stickerSize,
      geometry.faceGap,
      geometry.outerPadding,
      geometry.faceSize,
      geometry.step,
      geometry.width,
      geometry.height
    ].every(Number.isInteger),'3x3 geometry must use whole SVG units.');
    assert.equal(container.classList.contains('ssc-preview-cstimer-3x3'),true);
    for(const sticker of stickers){
      assert.equal(Number(sticker.getAttribute('rx')),0);
      assert.equal(sticker.getAttribute('stroke'),null);
      assert.equal(sticker.getAttribute('stroke-width'),null);
    }

    const faces=descendants(svg,node=>node.classList.contains('ssc-svg-face'));
    const grids=descendants(svg,node=>node.classList.contains('ssc-svg-face-grid'));
    assert.equal(faces.length,6);
    assert.equal(grids.length,6,'3x3 must render exactly one shared grid per face.');
    const expectedGrid=`M0 0H${geometry.faceSize}V${geometry.faceSize}H0Z`+
      `M${geometry.stickerSize} 0V${geometry.faceSize}M0 ${geometry.stickerSize}H${geometry.faceSize}`+
      `M${geometry.stickerSize*2} 0V${geometry.faceSize}M0 ${geometry.stickerSize*2}H${geometry.faceSize}`;
    for(const grid of grids){
      assert.equal(grid.getAttribute('d'),expectedGrid);
      assert.equal(grid.getAttribute('stroke'),'#050505');
      assert.equal(Number(grid.getAttribute('stroke-width')),1);
      assert.equal(grid.getAttribute('vector-effect'),'non-scaling-stroke');
    }

    const origins=Object.fromEntries(faces.map(face=>[face.dataset.face,{
      x:Number(face.dataset.originX),
      y:Number(face.dataset.originY)
    }]));
    assert.equal(origins.U.x,origins.F.x);
    assert.equal(origins.F.x,origins.D.x);
    assert.equal(origins.L.y,origins.F.y);
    assert.equal(origins.F.y,origins.R.y);
    assert.equal(origins.R.y,origins.B.y);
    assert.deepEqual(
      [origins.F.x-origins.L.x,origins.R.x-origins.F.x,origins.B.x-origins.R.x],
      [geometry.step,geometry.step,geometry.step]
    );
  }else{
    assert.equal(svg.getAttribute('data-layout-style'),'ssc-standard');
    assert.equal(geometry.stickerGap,globalThis.SSCSvgCubeRenderer.GEOMETRY.stickerGap);
    assert.equal(geometry.faceGap,globalThis.SSCSvgCubeRenderer.GEOMETRY.faceGap);
    assert.equal(geometry.stickerRadius,globalThis.SSCSvgCubeRenderer.GEOMETRY.stickerRadius);
  }
  return{container,svg,stickers,ids:stickers.map(sticker=>sticker.dataset.stickerId),layers:stickers.map(sticker=>sticker.dataset.layer)};
}

let rendered=0;
for(const [orderText,scrambles] of Object.entries(cases)){
  const order=Number(orderText);
  const solved=validateRender(order,scrambles[0]);
  const scrambled=validateRender(order,scrambles[1]);
  rendered+=2;
  assert.deepEqual(scrambled.ids,solved.ids,`${order}x${order} semantic sticker IDs changed after scramble.`);
  assert.notDeepEqual(scrambled.layers,solved.layers,`${order}x${order} scramble did not change rendered sticker identities.`);
}

const colorContainer=new FakeElement('div');
colorContainer.id='color-preview';
globalThis.SSCPreviewV1.render(colorContainer,"3Rw U 3Rw' U'",'777',{strict:true});
const changed=globalThis.SSCPreviewV1.setColors({U:'#123456',D:'#654321',F:'#112233',B:'#223344',R:'#334455',L:'#445566'});
assert.equal(changed.U,'#123456');
const colorStickers=colorContainer.querySelectorAll('.ssc-native-preview-svg .ssc-svg-sticker[data-layer]');
assert.ok(colorStickers.length>0);
for(const sticker of colorStickers){
  assert.equal(sticker.getAttribute('fill'),changed[sticker.dataset.layer]);
}
const reset=globalThis.SSCPreviewV1.resetColors();
assert.deepEqual(reset,CSTIMER_COLORS);
for(const sticker of colorStickers){
  assert.equal(sticker.getAttribute('fill'),reset[sticker.dataset.layer]);
}

const stableContainer=new FakeElement('div');
stableContainer.id='scramble-update';
globalThis.SSCPreviewV1.render(stableContainer,'','777',{strict:true});
const before=stableContainer.querySelectorAll('.ssc-native-preview-svg .ssc-svg-sticker[data-layer]').map(node=>({id:node.dataset.stickerId,layer:node.dataset.layer}));
globalThis.SSCPreviewV1.render(stableContainer,"3Rw U 3Rw' U'",'777',{strict:true});
const after=stableContainer.querySelectorAll('.ssc-native-preview-svg .ssc-svg-sticker[data-layer]').map(node=>({id:node.dataset.stickerId,layer:node.dataset.layer}));
assert.deepEqual(after.map(item=>item.id),before.map(item=>item.id));
assert.notDeepEqual(after.map(item=>item.layer),before.map(item=>item.layer));

const reusedContainer=new FakeElement('div');
reusedContainer.id='reused-preview';
globalThis.SSCPreviewV1.render(reusedContainer,'','333',{strict:true});
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-3x3'),true);
globalThis.SSCPreviewV1.render(reusedContainer,'','222',{strict:true});
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-3x3'),false,'3x3-only style leaked into 2x2.');
assert.equal(reusedContainer.dataset.previewLayout,'ssc-standard');

const rendererSource=fs.readFileSync('code/js/preview/ssc-svg-renderer.js','utf8');
const cssSource=fs.readFileSync('code/css/ssc-preview-v1.css','utf8');
assert.doesNotMatch(rendererSource,/scaleX\s*\(|rotate\s*\(|matrix\s*\(/i);
assert.doesNotMatch(cssSource,/scaleX\s*\(|rotate\s*\(|matrix\s*\(/i);
assert.match(cssSource,/width:\s*100%/);
assert.match(cssSource,/height:\s*100%/);

console.log('[SSC Preview CI] Rendering summary');
console.log(JSON.stringify({
  ok:true,
  renderedStates:rendered+2,
  orders:[2,3,4,5,6,7],
  sizes,
  semanticIdsStable:true,
  colorUpdates:true,
  cstimerDefaultPalette:true,
  savedPalettePreserved:true,
  scrambleUpdates:true,
  cstimer3x3Profile:true,
  sharedPixelGrid:true,
  symmetric3x3Axes:true,
  otherOrdersUnchanged:true,
  mirroringHacks:false
},null,2));
