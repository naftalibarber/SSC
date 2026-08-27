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
const cases={
  2:['',"R U2 F' R2 U' F2 R U'"],
  3:['',"R U2 F' L2 D B2 R2 U' F D2 L' B U2"],
  4:['',"Rw U2 Fw' L2 D B2 Rw2 U' F D2 Lw' B U2"],
  5:['',"Rw U2 Fw' L2 D B2 Rw2 U' F D2 Lw' B Uw2 R2 Fw D' Bw2"]
};
const EVENT_BY_ORDER={2:'222',3:'333',4:'444',5:'555'};

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
    assert.ok(gap>0);
    assert.ok(geometry.width*scale<=size+1e-9);
    assert.ok(geometry.height*scale<=size+1e-9);
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
globalThis.SSCPreviewV1.render(colorContainer,"Rw U Rw' U'",'555',{strict:true});
const changed=globalThis.SSCPreviewV1.setColors({U:'#123456',D:'#654321',F:'#112233',B:'#223344',R:'#334455',L:'#445566'});
assert.equal(changed.U,'#123456');
const colorStickers=colorContainer.querySelectorAll('.ssc-native-preview-svg .ssc-svg-sticker[data-layer]');
assert.ok(colorStickers.length>0);
for(const sticker of colorStickers){
  assert.equal(sticker.getAttribute('fill'),changed[sticker.dataset.layer]);
}
const reset=globalThis.SSCPreviewV1.resetColors();
assert.equal(reset.U,globalThis.SSCSvgCubeRenderer.DEFAULT_COLORS.U);
for(const sticker of colorStickers){
  assert.equal(sticker.getAttribute('fill'),reset[sticker.dataset.layer]);
}

const stableContainer=new FakeElement('div');
stableContainer.id='scramble-update';
globalThis.SSCPreviewV1.render(stableContainer,'','555',{strict:true});
const before=stableContainer.querySelectorAll('.ssc-native-preview-svg .ssc-svg-sticker[data-layer]').map(node=>({id:node.dataset.stickerId,layer:node.dataset.layer}));
globalThis.SSCPreviewV1.render(stableContainer,"Rw U Rw' U'",'555',{strict:true});
const after=stableContainer.querySelectorAll('.ssc-native-preview-svg .ssc-svg-sticker[data-layer]').map(node=>({id:node.dataset.stickerId,layer:node.dataset.layer}));
assert.deepEqual(after.map(item=>item.id),before.map(item=>item.id));
assert.notDeepEqual(after.map(item=>item.layer),before.map(item=>item.layer));

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
  orders:[2,3,4,5],
  sizes,
  semanticIdsStable:true,
  colorUpdates:true,
  scrambleUpdates:true,
  mirroringHacks:false
},null,2));
