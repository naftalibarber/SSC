import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM(`<!doctype html><html lang="he" dir="rtl"><body>
  <button id="generalSettingsButton"><span></span></button>
  <button id="languageToggle"></button>
  <div id="generalSettingsModal" hidden>
    <button id="closeGeneralSettings"></button>
    <div data-close-settings></div>
    <div class="general-settings-grid">
      <div class="general-setting-row"><span id="cubeColorsSettingLabel">צבעי הקובייה</span><div></div></div>
    </div>
  </div>
</body></html>`,{
  url:'https://ssc.test/',
  pretendToBeVisual:true,
  runScripts:'outside-only'
});
const {window}=dom;

window.console=console;
window.requestAnimationFrame=callback=>{callback();return 1;};
window.SSCPreviewSizing={
  clampSize:value=>Number(value),
  getPreviewSize:()=>200,
  applyPreviewSize(){},
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

range.value='3';
range.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(output.textContent,'3 px');
assert.equal(window.document.documentElement.style.getPropertyValue('--ssc-cube-line-width'),'3');
assert.equal(JSON.parse(window.localStorage.getItem('sscGeneralSettingsV1')).cubeLineWidth,3);

range.value='4';
range.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(output.textContent,'4 px');
assert.equal(window.document.documentElement.style.getPropertyValue('--ssc-cube-line-width'),'4');

console.log('[SSC Preview CI] Cube line-width settings summary');
console.log(JSON.stringify({
  ok:true,
  range:[1,4],
  defaultWidth:1,
  liveUpdate:true,
  persisted:true
},null,2));

dom.window.close();
