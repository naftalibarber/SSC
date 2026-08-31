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
  removeAttribute(name){
    delete this.attributes[name];
    if(name.startsWith('data-'))delete this.dataset[datasetKey(name)];
  }
  getAttribute(name){return this.attributes[name]??null;}
  appendChild(child){this.children.push(child);child.parentNode=this;return child;}
  replaceChildren(...children){this.children=[...children];children.forEach(child=>{child.parentNode=this;});}
  querySelectorAll(selector){
    const matches=[];
    const classes=[...selector.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map(match=>match[1]);
    const targetClass=classes.at(-1)||null;
    const dataMatch=selector.match(/\[data-([a-zA-Z0-9_-]+)\]/);
    const dataKey=dataMatch?datasetKey(`data-${dataMatch[1]}`):null;
    const visit=node=>{
      for(const child of node.children||[]){
        const classMatches=!targetClass||child.classList?.contains(targetClass);
        const dataMatches=!dataKey||child.dataset?.[dataKey]!==undefined;
        if(classMatches&&dataMatches)matches.push(child);
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

const sizes=[150,200,300,400,500];
const PIXEL_PERFECT_ORDERS=[2,3,4,5];
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
let geometryCombinationCount=0;

assert.deepEqual(globalThis.SSCSvgCubeRenderer.DEFAULT_COLORS,CSTIMER_COLORS);
assert.deepEqual(globalThis.SSCSvgCubeRenderer.PIXEL_PERFECT_ORDERS,PIXEL_PERFECT_ORDERS);
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

function validateBackgroundFace(face,geometry,order){
  const backgrounds=face.children.filter(node=>node.classList.contains('ssc-svg-face-background'));
  const stickers=face.children.filter(node=>node.classList.contains('ssc-svg-sticker'));
  assert.equal(backgrounds.length,1,`${order}x${order} must have one background rectangle per face.`);
  assert.equal(stickers.length,order*order,`${order}x${order} must have exactly N x N stickers per face.`);
  assert.equal(face.children[0],backgrounds[0],'The continuous black background must be below every sticker.');

  const background=backgrounds[0];
  assert.equal(background.getAttribute('fill'),'#000000');
  assert.equal(background.getAttribute('data-grid-background'),'true');
  assert.equal(Number(background.getAttribute('x')),0);
  assert.equal(Number(background.getAttribute('y')),0);
  assert.equal(Number(background.getAttribute('width')),geometry.faceSize);
  assert.equal(Number(background.getAttribute('height')),geometry.faceSize);
  assert.equal(background.getAttribute('stroke'),null);
  assert.equal(background.getAttribute('stroke-width'),null);
  assert.equal(background.getAttribute('vector-effect'),null);

  const widths=new Set(stickers.map(sticker=>Number(sticker.getAttribute('width'))));
  const heights=new Set(stickers.map(sticker=>Number(sticker.getAttribute('height'))));
  assert.deepEqual([...widths],[geometry.stickerSize]);
  assert.deepEqual([...heights],[geometry.stickerSize]);
  assert.equal(geometry.faceSize,(order*geometry.stickerSize)+((order+1)*geometry.lineWidth));

  for(let row=0;row<order;row++){
    for(let col=0;col<order;col++){
      const sticker=stickers.find(node=>Number(node.dataset.row)===row&&Number(node.dataset.col)===col);
      assert.ok(sticker);
      const x=Number(sticker.getAttribute('x')),y=Number(sticker.getAttribute('y'));
      assert.equal(x,geometry.lineWidth+col*(geometry.stickerSize+geometry.lineWidth));
      assert.equal(y,geometry.lineWidth+row*(geometry.stickerSize+geometry.lineWidth));
      assert.equal(Number.isInteger(x),true);
      assert.equal(Number.isInteger(y),true);
      assert.equal(sticker.getAttribute('stroke'),null);
      assert.equal(sticker.getAttribute('stroke-width'),null);
      assert.equal(sticker.getAttribute('vector-effect'),null);
      assert.equal(sticker.getAttribute('border'),null);
      assert.equal(sticker.getAttribute('outline'),null);
      if(col<order-1){
        const next=stickers.find(node=>Number(node.dataset.row)===row&&Number(node.dataset.col)===col+1);
        assert.equal(Number(next.getAttribute('x'))-(x+geometry.stickerSize),geometry.lineWidth);
      }
      if(row<order-1){
        const next=stickers.find(node=>Number(node.dataset.row)===row+1&&Number(node.dataset.col)===col);
        assert.equal(Number(next.getAttribute('y'))-(y+geometry.stickerSize),geometry.lineWidth);
      }
    }
  }

  const last=stickers.find(node=>Number(node.dataset.row)===order-1&&Number(node.dataset.col)===order-1);
  assert.equal(Number(stickers[0].getAttribute('x')),geometry.lineWidth,'Left frame must equal every inner line.');
  assert.equal(Number(stickers[0].getAttribute('y')),geometry.lineWidth,'Top frame must equal every inner line.');
  assert.equal(geometry.faceSize-(Number(last.getAttribute('x'))+geometry.stickerSize),geometry.lineWidth,'Right frame must equal every inner line.');
  assert.equal(geometry.faceSize-(Number(last.getAttribute('y'))+geometry.stickerSize),geometry.lineWidth,'Bottom frame must equal every inner line.');
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
  const faceGrids=descendants(svg,node=>node.classList.contains('ssc-svg-face-grid'));
  const faceBackgrounds=descendants(svg,node=>node.classList.contains('ssc-svg-face-background'));
  assert.equal(stickers.length,6*order*order);
  assert.equal(new Set(stickers.map(sticker=>sticker.dataset.stickerId)).size,stickers.length);
  for(const sticker of stickers){
    assert.equal(Number(sticker.getAttribute('width')),geometry.stickerSize);
    assert.equal(Number(sticker.getAttribute('height')),geometry.stickerSize);
    const row=Number(sticker.dataset.row);
    const col=Number(sticker.dataset.col);
    assert.equal(Number(sticker.getAttribute('x')),geometry.facePadding+col*(geometry.stickerSize+geometry.stickerGap));
    assert.equal(Number(sticker.getAttribute('y')),geometry.facePadding+row*(geometry.stickerSize+geometry.stickerGap));
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

  if(PIXEL_PERFECT_ORDERS.includes(order)){
    assert.equal(svg.getAttribute('data-layout-style'),`cstimer-${order}x${order}`);
    assert.equal(geometry.faceGap,Math.round(geometry.stickerSize/3));
    assert.equal(geometry.outerPadding,Math.round(geometry.stickerSize/10));
    assert.equal(geometry.stickerRadius,0);
    assert.equal(geometry.faceRadius,0);
    assert.equal(geometry.lineWidth,1);
    assert.equal(geometry.facePadding,1);
    assert.equal(geometry.stickerGap,1);
    assert.equal(geometry.faceSize,(order*geometry.stickerSize)+((order+1)*geometry.lineWidth));
    assert.ok([
      geometry.stickerSize,
      geometry.faceGap,
      geometry.outerPadding,
      geometry.faceSize,
      geometry.step,
      geometry.width,
      geometry.height
    ].every(Number.isInteger),`${order}x${order} geometry must use whole SVG units.`);
    for(const profileOrder of PIXEL_PERFECT_ORDERS){
      assert.equal(
        container.classList.contains(`ssc-preview-cstimer-${profileOrder}x${profileOrder}`),
        profileOrder===order,
        `Only the ${order}x${order} csTimer layout class may be active.`
      );
    }
    for(const sticker of stickers){
      assert.equal(Number(sticker.getAttribute('rx')),0);
      assert.equal(sticker.getAttribute('stroke'),null);
      assert.equal(sticker.getAttribute('stroke-width'),null);
    }

    const faces=descendants(svg,node=>node.classList.contains('ssc-svg-face'));
    assert.equal(faces.length,6);
    assert.equal(faceGrids.length,0,`${order}x${order} must not retain an SVG grid path.`);
    assert.equal(faceBackgrounds.length,6,`${order}x${order} must have one continuous background per face.`);
    faces.forEach(face=>validateBackgroundFace(face,geometry,order));

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
    assert.equal((origins.R.x-origins.F.x)-geometry.faceSize,geometry.faceGap,'Faces must keep their intended horizontal spacing.');
    assert.equal((origins.F.y-origins.U.y)-geometry.faceSize,geometry.faceGap,'Faces must keep their intended vertical spacing.');

    if(scramble===''){
      const stateSnapshot=stickers.map(sticker=>({
        id:sticker.dataset.stickerId,
        layer:sticker.dataset.layer,
        fill:sticker.getAttribute('fill')
      }));
      for(const selectedLineWidth of [1,2,3,4]){
        for(const dpr of [1,1.25,1.5,2]){
          const fitted=globalThis.SSCSvgCubeRenderer.fitPixelPerfectCubeToBox(
            svg,334,250,dpr,selectedLineWidth
          );
          geometryCombinationCount++;
          const expectedLineWidth=Math.max(1,Math.round(selectedLineWidth*dpr));
          assert.equal(fitted.n,order);
          assert.equal(fitted.selectedLineWidth,selectedLineWidth);
          assert.equal(fitted.lineWidth,expectedLineWidth);
          assert.equal(fitted.stickerGap,expectedLineWidth);
          assert.equal(fitted.facePadding,expectedLineWidth);
          assert.equal(fitted.faceSize,(order*fitted.stickerSize)+((order+1)*expectedLineWidth));
          assert.equal(fitted.faceGap,Math.max(1,Math.round(fitted.stickerSize/3)));
          assert.ok(fitted.width<=Math.floor(334*dpr));
          assert.ok(fitted.height<=Math.floor(250*dpr));
          assert.ok([
            fitted.stickerSize,fitted.lineWidth,fitted.faceGap,fitted.outerPadding,
            fitted.faceSize,fitted.step,fitted.width,fitted.height
          ].every(Number.isInteger),`Fitted ${order}x${order} geometry must use integer device pixels.`);
          assert.equal(svg.getAttribute('data-line-renderer'),'face-background');
          assert.equal(Number(svg.getAttribute('data-line-device-pixels')),expectedLineWidth);
          assert.equal(descendants(svg,node=>node.classList.contains('ssc-svg-face-grid')).length,0);
          faces.forEach(face=>validateBackgroundFace(face,fitted,order));

          const fittedOrigins=Object.fromEntries(faces.map(face=>[face.dataset.face,{
            x:Number(face.dataset.originX),y:Number(face.dataset.originY)
          }]));
          assert.ok(Object.values(fittedOrigins).every(origin=>Number.isInteger(origin.x)&&Number.isInteger(origin.y)));
          assert.equal(fittedOrigins.U.x,fittedOrigins.F.x);
          assert.equal(fittedOrigins.F.x,fittedOrigins.D.x);
          assert.equal(fittedOrigins.L.y,fittedOrigins.F.y);
          assert.equal(fittedOrigins.F.y,fittedOrigins.R.y);
          assert.equal(fittedOrigins.R.y,fittedOrigins.B.y);
          assert.equal((fittedOrigins.R.x-fittedOrigins.F.x)-fitted.faceSize,fitted.faceGap);
          assert.equal((fittedOrigins.F.y-fittedOrigins.U.y)-fitted.faceSize,fitted.faceGap);
          assert.ok(fitted.faceGap>0,'Separate face backgrounds must never touch.');
          assert.deepEqual(stickers.map(sticker=>({
            id:sticker.dataset.stickerId,
            layer:sticker.dataset.layer,
            fill:sticker.getAttribute('fill')
          })),stateSnapshot,'Geometry fitting must not rebuild or mutate cube state, colors, or scramble output.');

          const centering=globalThis.SSCSvgCubeRenderer.centerPixelPerfectGeometry(fitted);
          assert.ok([centering.widthCorrection,centering.heightCorrection].every(value=>value===0||value===1));
          assert.ok(Number.isInteger(centering.offsetX));
          assert.ok(Number.isInteger(centering.offsetY));
        }
      }
      if(order===3){
        const defaultGeometry=globalThis.SSCSvgCubeRenderer.pixelPerfectCubeGeometry(3,218,162,1,1);
        assert.deepEqual(
          globalThis.SSCSvgCubeRenderer.pixelPerfect3x3Geometry(218,162,1,1),
          defaultGeometry,
          'The existing 3x3 geometry API must remain compatible.'
        );
      }
    }
  }else{
    assert.equal(svg.getAttribute('data-layout-style'),'ssc-standard');
    assert.equal(geometry.stickerGap,globalThis.SSCSvgCubeRenderer.GEOMETRY.stickerGap);
    assert.equal(geometry.faceGap,globalThis.SSCSvgCubeRenderer.GEOMETRY.faceGap);
    assert.equal(geometry.stickerRadius,globalThis.SSCSvgCubeRenderer.GEOMETRY.stickerRadius);
    assert.equal(faceGrids.length,0,'6x6 and larger must retain their existing renderer geometry.');
    assert.equal(faceBackgrounds.length,6,'6x6 and larger must retain one background per face.');
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

const fiveMoveCases=['R',"U'",'F2','Rw',"Uw'",'Fw2'];
const fiveMoveContainer=new FakeElement('div');
fiveMoveContainer.id='five-move-preview';
const solvedFive=globalThis.SSCPreviewV1.render(fiveMoveContainer,'','555',{strict:true});
const solvedFiveLayers=descendants(solvedFive.svg,node=>node.classList.contains('ssc-svg-sticker')).map(node=>node.dataset.layer);
for(const scramble of fiveMoveCases){
  const movedFive=globalThis.SSCPreviewV1.render(fiveMoveContainer,scramble,'555',{strict:true});
  const movedStickers=descendants(movedFive.svg,node=>node.classList.contains('ssc-svg-sticker'));
  assert.equal(movedStickers.length,150);
  assert.notDeepEqual(
    movedStickers.map(node=>node.dataset.layer),
    solvedFiveLayers,
    `5x5 move ${scramble} must produce a non-solved sticker state.`
  );
}

const languageContainer=new FakeElement('div');
languageContainer.id='five-language-preview';
document.documentElement.lang='he';
const hebrewFive=globalThis.SSCPreviewV1.render(languageContainer,"Rw U2 Fw' L D2",'555',{strict:true});
const hebrewFiveState=descendants(hebrewFive.svg,node=>node.classList.contains('ssc-svg-sticker')).map(node=>({id:node.dataset.stickerId,layer:node.dataset.layer}));
document.documentElement.lang='en';
const englishFive=globalThis.SSCPreviewV1.render(languageContainer,"Rw U2 Fw' L D2",'555',{strict:true});
const englishFiveState=descendants(englishFive.svg,node=>node.classList.contains('ssc-svg-sticker')).map(node=>({id:node.dataset.stickerId,layer:node.dataset.layer}));
assert.deepEqual(englishFiveState,hebrewFiveState,'Changing language must not change the 5x5 cube state.');
document.documentElement.lang='he';

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
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-2x2'),true);
assert.equal(reusedContainer.dataset.previewLayout,'cstimer-2x2');
globalThis.SSCPreviewV1.render(reusedContainer,'','444',{strict:true});
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-2x2'),false,'2x2-only style leaked into 4x4.');
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-3x3'),false,'3x3-only style leaked into 4x4.');
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-4x4'),true);
assert.equal(reusedContainer.dataset.previewLayout,'cstimer-4x4');
globalThis.SSCPreviewV1.render(reusedContainer,'','555',{strict:true});
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-2x2'),false,'2x2-only style leaked into 5x5.');
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-3x3'),false,'3x3-only style leaked into 5x5.');
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-4x4'),false,'4x4-only style leaked into 5x5.');
assert.equal(reusedContainer.classList.contains('ssc-preview-cstimer-5x5'),true);
assert.equal(reusedContainer.dataset.previewLayout,'cstimer-5x5');
globalThis.SSCPreviewV1.render(reusedContainer,'','666',{strict:true});
for(const profileOrder of PIXEL_PERFECT_ORDERS){
  assert.equal(reusedContainer.classList.contains(`ssc-preview-cstimer-${profileOrder}x${profileOrder}`),false,`${profileOrder}x${profileOrder} style leaked into 6x6.`);
}
assert.equal(reusedContainer.dataset.previewLayout,'ssc-standard');

const rendererSource=fs.readFileSync('code/js/preview/ssc-svg-renderer.js','utf8');
const cssSource=fs.readFileSync('code/css/ssc-preview-v1.css','utf8');
assert.doesNotMatch(rendererSource,/scaleX\s*\(|rotate\s*\(|matrix\s*\(/i);
assert.doesNotMatch(cssSource,/scaleX\s*\(|rotate\s*\(|matrix\s*\(/i);
assert.doesNotMatch(rendererSource,/vector-effect/i);
assert.doesNotMatch(cssSource,/vector-effect|non-scaling-stroke/i);
assert.doesNotMatch(rendererSource,/faceGridPath|ssc-svg-face-grid/,'The legacy stroked grid path must be removed.');
assert.doesNotMatch(cssSource,/ssc-svg-face-grid/,'The legacy grid selector must not remain visually active.');
assert.doesNotMatch(cssSource,/stroke-width:\s*var\(--ssc-cube-line-width/,'Line width must come from geometry, not CSS stroke width.');
assert.match(cssSource,/width:\s*100%/);
assert.match(cssSource,/height:\s*100%/);
assert.match(rendererSource,/const faceSize=\(stickerSize\*n\)\+\(\(n\+1\)\*lineWidth\);/);
assert.match(rendererSource,/fill:pixelPerfect\?'#000000':null/);
assert.match(cssSource,/data-pixel-perfect-grid="true"[\s\S]*?fill:#000;/);

console.log('[SSC Preview CI] Rendering summary');
console.log(JSON.stringify({
  ok:true,
  renderedStates:rendered+fiveMoveCases.length+4,
  orders:[2,3,4,5,6,7],
  sizes,
  semanticIdsStable:true,
  colorUpdates:true,
  cstimerDefaultPalette:true,
  savedPalettePreserved:true,
  scrambleUpdates:true,
  cstimer2x2Through5x5Profiles:true,
  fiveByFiveMoveCases:fiveMoveCases,
  integerDevicePixelOrders:PIXEL_PERFECT_ORDERS,
  geometryCombinationCount,
  continuousBackgroundPerFace:true,
  svgStrokeGridRemoved:true,
  faceSpacingPreserved:true,
  symmetric2x2Through5x5Axes:true,
  devicePixelCentering:true,
  otherOrdersUnchanged:true,
  mirroringHacks:false
},null,2));
