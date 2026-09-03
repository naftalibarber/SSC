import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const fixture=`<!doctype html><html lang="he" dir="rtl"><head></head><body>
  <button id="generalSettingsButton"><span></span></button>
  <button id="languageToggle"></button>
  <div id="generalSettingsModal" class="settings-modal" hidden>
    <button id="closeGeneralSettings"></button>
    <div data-close-settings></div>
    <div class="general-settings-grid">
      <label class="general-setting-row"><span id="languageSettingLabel">שפה</span><select id="languageSelect"><option value="he">עברית</option><option value="en">English</option></select></label>
      <label class="general-setting-row"><span id="primaryColorSettingLabel">צבע ראשי</span><div class="color-control"><input id="primaryColorInput" type="color" value="#2563eb"><output id="primaryColorValue">#2563EB</output><button id="resetPrimaryColor" type="button">איפוס</button></div></label>
      <div class="general-setting-row"><span id="cubeColorsSettingLabel">צבעי הקובייה</span><div id="cubeColorsControl" class="cube-colors-control">
        <label class="cube-color-item"><span id="cubeWhiteLabel">U</span><input type="color" data-cube-face="U"></label>
        <label class="cube-color-item"><span id="cubeOrangeLabel">L</span><input type="color" data-cube-face="L"></label>
        <label class="cube-color-item"><span id="cubeGreenLabel">F</span><input type="color" data-cube-face="F"></label>
        <label class="cube-color-item"><span id="cubeRedLabel">R</span><input type="color" data-cube-face="R"></label>
        <label class="cube-color-item"><span id="cubeBlueLabel">B</span><input type="color" data-cube-face="B"></label>
        <label class="cube-color-item"><span id="cubeYellowLabel">D</span><input type="color" data-cube-face="D"></label>
        <button id="resetCubeColors" type="button">איפוס צבעי קובייה</button>
      </div></div>
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
window.localStorage.setItem('sscGeneralSettingsV1',JSON.stringify({cubeLineWidth:4,primaryColor:'#2563eb'}));
window.SSCPreviewSizing={
  clampSize:value=>Number(value),
  getPreviewSize:()=>200,
  applyPreviewSize(){},
  setPreviewSize:value=>Number(value)
};
let cubeColors={U:'#ffffff',L:'#ff8800',F:'#00aa44',R:'#dd2222',B:'#2255dd',D:'#ffdd00'};
window.SSCCubePreview={
  getColors:()=>({...cubeColors}),
  setColors:next=>{cubeColors={...next};},
  resetColors:()=>{cubeColors={U:'#ffffff',L:'#ff8800',F:'#00aa44',R:'#dd2222',B:'#2255dd',D:'#ffdd00'};}
};

window.eval(`${fs.readFileSync('code/js/settings.js','utf8')}\n//# sourceURL=code/js/settings.js`);
assert.ok(window.document.getElementById('cubeLineWidthRange'),'Legacy settings currently create the old line-width control before retirement.');

window.eval(`${fs.readFileSync('code/js/color-settings-modal.js','utf8')}\n//# sourceURL=code/js/color-settings-modal.js`);

assert.equal(window.document.getElementById('cubeLineWidthRange'),null,'The pixel line-width control must be removed from the UI.');
assert.equal(window.document.documentElement.style.getPropertyValue('--ssc-cube-line-width'),'','Legacy inline line-width overrides must be cleared.');
const forcedStyle=window.document.getElementById('sscColorSettingsModalStyles');
assert.ok(forcedStyle,'The color settings feature must install its style layer.');
assert.match(forcedStyle.textContent,/--ssc-cube-line-width:1!important/,'Cube lines must stay at the fixed 1px default.');
const stored=JSON.parse(window.localStorage.getItem('sscGeneralSettingsV1'));
assert.equal(Object.hasOwn(stored,'cubeLineWidth'),false,'The retired cubeLineWidth preference must be removed from persisted settings.');

const colorModal=window.document.getElementById('colorSettingsModal');
const colorButton=window.document.getElementById('colorSettingsButton');
const generalModal=window.document.getElementById('generalSettingsModal');
assert.ok(colorModal,'A dedicated color settings modal must be created.');
assert.ok(colorButton,'General settings must contain a button that opens color settings.');
assert.ok(colorModal.contains(window.document.getElementById('primaryColorInput')),'Primary color controls must move into the color settings window.');
assert.ok(colorModal.contains(window.document.getElementById('cubeColorsControl')),'Cube color controls must move into the color settings window.');

colorButton.click();
assert.equal(generalModal.hidden,true,'Opening color settings should temporarily hide general settings.');
assert.equal(colorModal.hidden,false,'Color settings must become visible.');
window.document.getElementById('closeColorSettings').click();
assert.equal(colorModal.hidden,true,'Closing color settings must hide the color window.');
assert.equal(generalModal.hidden,false,'Closing color settings must return to general settings.');

const primary=window.document.getElementById('primaryColorInput');
primary.value='#123456';
primary.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(JSON.parse(window.localStorage.getItem('sscGeneralSettingsV1')).primaryColor,'#123456','Primary color must keep using the existing settings persistence.');

const front=window.document.querySelector('[data-cube-face="F"]');
front.value='#112233';
front.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(cubeColors.F,'#112233','Cube face colors must remain live after moving into the dedicated window.');

window.localStorage.setItem('sscLanguageV1','en');
window.document.getElementById('languageSelect').value='en';
window.document.getElementById('languageSelect').dispatchEvent(new window.Event('change',{bubbles:true}));
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(window.document.getElementById('colorSettingsTitle').textContent,'Color settings');
assert.equal(window.document.getElementById('colorSettingsButtonText').textContent,'Open color settings');

console.log('[SSC Preview CI] Color settings and fixed line-width summary');
console.log(JSON.stringify({
  ok:true,
  lineWidthControlRemoved:true,
  fixedLineWidth:1,
  dedicatedColorWindow:true,
  primaryColorLive:true,
  cubeColorsLive:true,
  bilingual:true
},null,2));

dom.window.close();
