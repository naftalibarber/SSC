import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const fixture=`<!doctype html><html lang="he" dir="rtl"><body>
  <button id="generalSettingsButton"><span></span></button>
  <button id="languageToggle"></button>
  <div id="generalSettingsModal" hidden>
    <button id="closeGeneralSettings"></button>
    <div data-close-settings></div>
    <div class="general-settings-grid">
      <div class="general-setting-row"><span id="cubeColorsSettingLabel">צבעי הקובייה</span><div></div></div>
    </div>
  </div>
</body></html>`;

const dom=new JSDOM(fixture,{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;

window.console=console;
window.requestAnimationFrame=callback=>{callback();return 1;};
let liveGeometryUpdates=0;
window.SSCPreviewSizing={
  clampSize:value=>Number(value),
  getPreviewSize:()=>200,
  applyPreviewSize(){liveGeometryUpdates++;},
  setPreviewSize:value=>Number(value)
};
window.eval(`${fs.readFileSync('code/js/settings.js','utf8')}\n//# sourceURL=code/js/settings.js`);

const range=window.document.getElementById('cubeLineWidthRange');
const output=window.document.getElementById('cubeLineWidthValue');
assert.ok(range,'The cube line-width slider must be added to general settings.');
assert.equal(range.min,'1');
assert.equal(range.max,'4');
assert.equal(range.step,'1');
assert.equal(range.value,'1');
assert.equal(output.textContent,'1 px');
assert.equal(window.document.documentElement.style.getPropertyValue('--ssc-cube-line-width'),'1');

const stateSentinel={order:3,faces:{U:[['U']]}};
const scrambleSentinel="R U R' U'";
const stateBefore=JSON.stringify(stateSentinel);
const updatesBeforeInput=liveGeometryUpdates;
range.value='3';
range.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(output.textContent,'3 px');
assert.equal(window.document.documentElement.style.getPropertyValue('--ssc-cube-line-width'),'3');
assert.equal(JSON.parse(window.localStorage.getItem('sscGeneralSettingsV1')).cubeLineWidth,3);
assert.ok(liveGeometryUpdates>updatesBeforeInput,'The slider input must synchronously request a fresh preview fit.');
assert.equal(JSON.stringify(stateSentinel),stateBefore,'Line-width input must not mutate cube state.');
assert.equal(scrambleSentinel,"R U R' U'",'Line-width input must not mutate the current scramble.');

range.value='4';
range.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(output.textContent,'4 px');
assert.equal(window.document.documentElement.style.getPropertyValue('--ssc-cube-line-width'),'4');

const persistedSettings=window.localStorage.getItem('sscGeneralSettingsV1');
const reloadDom=new JSDOM(fixture,{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const reloadWindow=reloadDom.window;
reloadWindow.console=console;
reloadWindow.requestAnimationFrame=callback=>{callback();return 1;};
reloadWindow.localStorage.setItem('sscGeneralSettingsV1',persistedSettings);
reloadWindow.SSCPreviewSizing={
  clampSize:value=>Number(value),
  getPreviewSize:()=>200,
  applyPreviewSize(){},
  setPreviewSize:value=>Number(value)
};
reloadWindow.eval(`${fs.readFileSync('code/js/settings.js','utf8')}\n//# sourceURL=code/js/settings-reload.js`);
assert.equal(reloadWindow.document.getElementById('cubeLineWidthRange').value,'4');
assert.equal(reloadWindow.document.getElementById('cubeLineWidthValue').textContent,'4 px');
assert.equal(reloadWindow.document.documentElement.style.getPropertyValue('--ssc-cube-line-width'),'4');

console.log('[SSC Preview CI] Cube line-width settings summary');
console.log(JSON.stringify({
  ok:true,
  range:[1,4],
  defaultWidth:1,
  liveUpdate:true,
  persistedAcrossReload:true,
  stateAndScramblePreserved:true
},null,2));

reloadDom.window.close();
dom.window.close();
