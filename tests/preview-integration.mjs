import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

class FakeElement{
  constructor(){this.dataset={};this.childElementCount=0;}
}

globalThis.window=globalThis;
globalThis.Element=FakeElement;
globalThis.SSC_FEATURES={previewV1:true};

let legacyCalls=0;
let legacySetColors=0;
let legacyResetColors=0;
let legacyMode='ok';
let managerCalls=0;
let v1Calls=0;
let v1Mode='ok';
let fitCalls=0;
let colors={U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};

const legacyPreview={
  render(container,scramble,eventId){
    legacyCalls++;
    if(legacyMode==='throw')throw new Error('forced legacy failure');
    container.childElementCount=1;
    return{engine:'legacy',scramble,eventId};
  },
  setColors(){legacySetColors++;},
  resetColors(){legacyResetColors++;},
  getEvent(eventId){return{id:eventId};}
};

globalThis.SSCCubePreview=legacyPreview;
globalThis.SSCPreviewManager={
  async render({container,eventId,scramble,mode}){
    managerCalls++;
    container.childElementCount=1;
    return{engine:'manager',eventId,scramble,mode};
  }
};
globalThis.SSCPreviewSizing={scheduleFit(){fitCalls++;}};
globalThis.SSCPreviewV1={
  normalizeEventId(eventId){
    const raw=String(eventId).toLowerCase();
    if(raw==='2x2'||raw==='2×2')return'222';
    if(raw==='3x3'||raw==='3×3')return'333';
    if(raw==='4x4'||raw==='4×4')return'444';
    if(raw==='5x5'||raw==='5×5')return'555';
    if(raw==='6x6'||raw==='6×6')return'666';
    if(raw==='7x7'||raw==='7×7')return'777';
    return raw;
  },
  render(container,scramble,eventId){
    v1Calls++;
    if(v1Mode==='throw')throw new Error('forced V1 failure');
    container.childElementCount=1;
    container.dataset.previewEngine='ssc-native-v1';
    return{svg:{engine:'v1',scramble,eventId}};
  },
  getColors(){return{...colors};},
  setColors(next){colors={...colors,...next};return{...colors};},
  resetColors(){colors={U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'};return{...colors};}
};

await import(pathToFileURL(resolve('code/js/preview/ssc-preview-v1-integration.js')).href);

assert.equal(globalThis.SSCPreviewV1Integration.featureEnabled(),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('222'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('3x3'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('4×4'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('5x5'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('6×6'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('7x7'),true);
assert.equal(globalThis.SSCPreviewV1Integration.shouldUseV1('minx'),false);

const twoContainer=new FakeElement();
const twoResult=await globalThis.SSCCubePreview.render(twoContainer,"R U R'",'222');
assert.equal(twoResult.engine,'v1');

const threeContainer=new FakeElement();
const threeResult=await globalThis.SSCCubePreview.render(threeContainer,"R U R' U'",'333');
assert.equal(threeResult.engine,'v1');

const fourContainer=new FakeElement();
const fourResult=await globalThis.SSCCubePreview.render(fourContainer,"Rw U2 Fw'",'444');
assert.equal(fourResult.engine,'v1');

const fiveContainer=new FakeElement();
const fiveResult=await globalThis.SSCCubePreview.render(fiveContainer,"Rw U2 Fw' Lw D2",'555');
assert.equal(fiveResult.engine,'v1');

const sixContainer=new FakeElement();
const sixResult=await globalThis.SSCCubePreview.render(sixContainer,"3Rw U2 Fw' 3Lw D2",'666');
assert.equal(sixResult.engine,'v1');

const sevenContainer=new FakeElement();
const sevenResult=await globalThis.SSCCubePreview.render(sevenContainer,"3Rw U2 Fw' 3Lw D2",'777');
assert.equal(sevenResult.engine,'v1');
assert.equal(v1Calls,6);
assert.equal(legacyCalls,0);
assert.equal(sevenContainer.dataset.previewMode,'2d');

const legacyContainer=new FakeElement();
const legacyResult=await globalThis.SSCCubePreview.render(legacyContainer,'R++ D--','minx');
assert.equal(legacyResult.engine,'legacy');
assert.equal(legacyCalls,1);
assert.equal(v1Calls,6);

v1Mode='throw';
legacyMode='ok';
const fallbackContainer=new FakeElement();
const fallbackResult=await globalThis.SSCCubePreview.render(fallbackContainer,'3Rw U2 Fw','777');
assert.equal(fallbackResult.engine,'legacy');
assert.equal(fallbackContainer.childElementCount,1);
assert.equal(v1Calls,7);
assert.equal(legacyCalls,2);

legacyMode='throw';
const emergencyContainer=new FakeElement();
const emergencyResult=await globalThis.SSCCubePreview.render(emergencyContainer,'R U F','222');
assert.equal(emergencyResult.engine,'manager');
assert.equal(emergencyResult.mode,'2d');
assert.equal(emergencyContainer.childElementCount,1);
assert.equal(managerCalls,1);
assert.equal(v1Calls,8);
assert.equal(legacyCalls,3);

v1Mode='ok';
legacyMode='ok';
globalThis.SSC_FEATURES.previewV1=false;
const disabledContainer=new FakeElement();
const disabledResult=await globalThis.SSCCubePreview.render(disabledContainer,'3Rw U','777');
assert.equal(disabledResult.engine,'legacy');
assert.equal(v1Calls,8);
assert.equal(legacyCalls,4);
globalThis.SSC_FEATURES.previewV1=true;

const changed=globalThis.SSCCubePreview.setColors({U:'#123456'});
assert.equal(changed.U,'#123456');
assert.equal(globalThis.SSCCubePreview.getColors().U,'#123456');
assert.equal(legacySetColors,1);
const reset=globalThis.SSCCubePreview.resetColors();
assert.equal(reset.U,'#ffffff');
assert.equal(legacyResetColors,1);
assert.ok(fitCalls>=6);

const index=fs.readFileSync('index.html','utf8');
const sizingSource=fs.readFileSync('code/js/preview-sizing.js','utf8');
const settingsSource=fs.readFileSync('code/js/settings.js','utf8');
const legacyPreviewSource=fs.readFileSync('code/js/cube-preview.js','utf8');
const rendererSource=fs.readFileSync('code/js/preview/ssc-svg-renderer.js','utf8');
const competitionStyles=fs.readFileSync('code/css/minimal-competition.css','utf8');
const cubePreviewStyles=fs.readFileSync('code/css/cube-preview.css','utf8');
const appSource=fs.readFileSync('code/js/app.js','utf8');
assert.match(sizingSource,/const MIN_SIZE=150;/);
assert.match(sizingSource,/const MAX_SIZE=500;/);
assert.match(sizingSource,/const STEP=5;/);
assert.match(sizingSource,/const DEFAULT_SIZE=200;/);
assert.match(sizingSource,/const STORAGE_KEY='sscCubePreviewSizeV1';/);
assert.match(sizingSource,/raw===null\?DEFAULT_SIZE:raw/,'Existing saved preview sizes must remain the source when present.');
assert.match(sizingSource,/fitPixelPerfectCubeToBox/,'2x2 through 4x4 SVGs must use integer device-pixel geometry.');
assert.match(sizingSource,/data-cube-order="2"/,'2x2 SVG must be routed through the pixel-perfect fitter.');
assert.match(sizingSource,/data-cube-order="3"/,'3x3 SVG must remain routed through the pixel-perfect fitter.');
assert.match(sizingSource,/data-cube-order="4"/,'4x4 SVG must be routed through the shared pixel-perfect fitter.');
assert.match(sizingSource,/previewStickerDevicePixels/,'Pixel-perfect fits must expose their physical sticker size for diagnostics.');
assert.match(settingsSource,/const PREVIEW_DEFAULT=200;/);
assert.match(legacyPreviewSource,/D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'/);
assert.match(legacyPreviewSource,/const cubeHref='\.\/code\/css\/cube-preview\.css\?v=20260831-connected-face-grids-1';/,'The preview fallback stylesheet must match the connected-face-grid release.');
assert.doesNotMatch(legacyPreviewSource,/if\(existing\)existing\.href=cubeHref/,'Runtime setup must not replace the stylesheet version declared by index.html.');
assert.match(rendererSource,/D:'#ffff00',[\s\S]*F:'#00dd00',[\s\S]*B:'#0000ff',[\s\S]*R:'#ff0000',[\s\S]*L:'#ffaa00'/);
assert.match(competitionStyles,/\.workspace\.cstimer-layout\s*\{[\s\S]*?direction:ltr!important;/,'Workspace geometry must stay physical instead of inheriting RTL grid placement.');
assert.match(competitionStyles,/html\[dir="ltr"\] \.workspace\.cstimer-layout\s*\{\s*grid-template-columns:var\(--mc-sidebar\) minmax\(0,1fr\)!important;/,'English must reserve the left column for statistics.');
assert.match(competitionStyles,/html\[dir="rtl"\] \.workspace\.cstimer-layout\s*\{\s*grid-template-columns:minmax\(0,1fr\) var\(--mc-sidebar\)!important;/,'Hebrew must reserve the right column for statistics.');
assert.match(competitionStyles,/html\[dir="ltr"\] \.flat-panel\s*\{\s*width:var\(--mc-sidebar\)!important;\s*grid-column:1!important;\s*grid-row:1!important;/,'English statistics must occupy and fit the left sidebar column in the first row.');
assert.match(competitionStyles,/html\[dir="rtl"\] \.flat-panel\s*\{\s*width:var\(--mc-sidebar\)!important;\s*grid-column:2!important;\s*grid-row:1!important;/,'Hebrew statistics must occupy and fit the right sidebar column in the first row.');
assert.match(competitionStyles,/html\[dir="ltr"\] \.flat-timer\s*\{grid-column:2!important;grid-row:1!important\}/,'English timer must share the first row with statistics.');
assert.match(competitionStyles,/html\[dir="rtl"\] \.flat-timer\s*\{grid-column:1!important;grid-row:1!important\}/,'Hebrew timer must share the first row with statistics.');
assert.match(cubePreviewStyles,/html\[lang="en"\] \.cube-preview-card\s*\{\s*right:calc\(var\(--ssc-preview-safe-margin,18px\) \+ env\(safe-area-inset-right,0px\)\)!important;\s*left:auto!important;\s*\}/,'English must keep the cube preview at the physical bottom-right.');
assert.match(cubePreviewStyles,/html\[lang="he"\] \.cube-preview-card\s*\{\s*right:auto!important;\s*left:calc\(var\(--ssc-preview-safe-margin,18px\) \+ env\(safe-area-inset-left,0px\)\)!important;\s*\}/,'Hebrew must place the cube preview at the physical bottom-left.');
assert.doesNotMatch(cubePreviewStyles,/--ssc-preview-right-offset/,'Language placement must not retain the obsolete Hebrew sidebar offset.');
assert.match(cubePreviewStyles,/width:calc\(var\(--ssc-preview-card-width,174px\) - var\(--ssc-preview-card-width-correction\)\)!important;/,'The card width must remove an odd device-pixel centering remainder.');
assert.match(cubePreviewStyles,/height:calc\(var\(--ssc-preview-card-height,132px\) - var\(--ssc-preview-card-height-correction\)\)!important;/,'The card height must remove an odd device-pixel centering remainder.');
assert.match(sizingSource,/applyPixelPerfectCardCorrection/,'Pixel-perfect previews must correct odd card dimensions before centering.');
assert.match(sizingSource,/\(correctedBox\.width-width\)\/2/,'The fitted preview must be centered from the corrected content box without directional rounding.');
assert.match(rendererSource,/function centerPixelPerfectGeometry\(geometry\)/,'The renderer must expose deterministic device-pixel centering geometry.');
assert.match(rendererSource,/function faceGridPath\(order,geometry\)/,'2x2 through 4x4 must use one connected grid path per face.');
assert.doesNotMatch(rendererSource,/const faceGap=-1;/,'The space between separate cube faces must remain intact.');
assert.match(rendererSource,/class:'ssc-svg-face-grid'/,'Each pixel-perfect face must receive its own grid path.');
assert.match(index,/id="historySettingsButton"[^>]*data-i18n="historySettings"/,'The visible history settings button must translate with the interface language.');
assert.match(appSource,/function sessionDisplayName\(session\)[\s\S]*?return t\('defaultSession'\);/,'Built-in default session names must be displayed in the active language.');
assert.match(appSource,/option\.textContent=sessionDisplayName\(session\)/,'The session selector must use the localized built-in session name.');
assert.equal((index.match(/SSC_FEATURES/g)||[]).length,1,'Feature flag must be defined once.');
assert.match(index,/window\.SSC_FEATURES=\{previewV1:true\}/);
assert.match(index,/code\/js\/cube-preview\.js/);
assert.match(index,/code\/css\/cube-preview\.css\?v=20260831-connected-face-grids-1/);
assert.match(index,/code\/css\/ssc-preview-v1\.css\?v=20260831-connected-face-grids-1/);
assert.match(index,/code\/js\/cube-preview\.js\?v=20260831-connected-face-grids-1/);
assert.match(index,/code\/js\/preview\/ssc-svg-renderer\.js\?v=20260831-connected-face-grids-1/);
assert.match(index,/code\/js\/preview-sizing\.js\?v=20260831-connected-face-grids-1/);
assert.match(index,/code\/js\/wca-previews\.js/);
assert.match(index,/cdn\.cubing\.net\/v0\/js\/scramble-display/);
assert.match(index,/code\/js\/puzzle-3d\.js/);

const positions={
  legacy:index.indexOf('code/js/preview-integration.js'),
  state:index.indexOf('code/js/preview/ssc-nxn-state.js'),
  renderer:index.indexOf('code/js/preview/ssc-svg-renderer.js'),
  validation:index.indexOf('code/js/preview/ssc-preview-validation.js'),
  v1:index.indexOf('code/js/preview/ssc-preview-v1.js'),
  bridge:index.indexOf('code/js/preview/ssc-preview-v1-integration.js'),
  app:index.indexOf('code/js/app.js')
};
for(const [name,position] of Object.entries(positions))assert.ok(position>=0,`${name} script is missing from index.html.`);
assert.ok(positions.state<positions.v1&&positions.renderer<positions.v1&&positions.validation<positions.v1);
assert.ok(positions.legacy<positions.bridge&&positions.bridge<positions.app);

console.log('[SSC Preview CI] Integration summary');
console.log(JSON.stringify({
  ok:true,
  routedEvents:['222','333','444','555','666','777'],
  legacyEventPreserved:'minx',
  featureFlagSingle:true,
  fallbackToLegacy:true,
  emergencyLegacy2D:true,
  colorApiWired:true,
  defaultPreviewSize:200,
  savedPreviewSizePreserved:true,
  cstimerDefaultPalette:true,
  languageAwareStatisticsSide:true,
  languageLayoutParity:true,
  languageAwarePreviewSide:true,
  pixelPerfectCentering:true,
  connectedGridPathPerFace:true
},null,2));
