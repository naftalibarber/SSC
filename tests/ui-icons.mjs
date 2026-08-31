import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const index=fs.readFileSync('index.html','utf8');
const appSource=fs.readFileSync('code/js/app.js','utf8');
const advancedSource=fs.readFileSync('code/js/advanced-features.js','utf8');
const importExportSource=fs.readFileSync('code/js/import-export.js','utf8');
const workflow=fs.readFileSync('.github/workflows/preview-validation.yml','utf8');

assert.match(appSource,/data-toolbar-icon="focus-crosshair"/,'Focus mode must use the crosshair SVG icon.');
assert.match(appSource,/<circle cx="12" cy="12" r="7"\/>/,'The focus crosshair must include a visible target ring.');
assert.match(appSource,/M12 2v3M12 19v3M2 12h3M19 12h3/,'The focus icon must include four crosshair guides.');
assert.match(appSource,/focus\.setAttribute\('aria-label',t\('focusMode'\)\)/,'Focus mode must keep a localized accessible name.');
assert.doesNotMatch(index,/#focusModeButton::before/,'The obsolete CSS-mask focus icon must not render alongside the SVG.');
assert.match(index,/code\/js\/app\.js\?v=20260831-full-history-1/);
assert.match(index,/code\/js\/import-export\.js\?v=20260831-toolbar-icons-2/);
assert.match(index,/code\/js\/advanced-features\.js\?v=20260831-toolbar-icons-2/);
assert.match(workflow,/for test in tests\/ui-\*\.mjs/,'CI must execute the toolbar icon regression test as part of the UI suite.');
assert.match(workflow,/code\/js\/import-export\.js/,'CI must run when the advanced-features loader changes.');

const indexDom=new JSDOM(index);
const indexedAdvancedScripts=[...indexDom.window.document.querySelectorAll('script[data-ssc-advanced]')]
  .filter(script=>script.src.includes('/code/js/advanced-features.js'));
assert.equal(indexedAdvancedScripts.length,1,'The page must declare exactly one marked Progress Analytics script.');
indexDom.window.close();

const loaderDom=new JSDOM(`<!doctype html><html lang="he"><body>
  <div id="importExportModal" hidden><button data-close-import-export></button></div>
  <button id="importExportButton"></button><button id="closeImportExport"></button>
  <button id="exportData"></button><input id="importData"><div id="importExportStatus"></div>
</body></html>`,{url:'https://ssc.test/',runScripts:'outside-only'});
loaderDom.window.eval(`${importExportSource}\n//# sourceURL=code/js/import-export.js`);
const declaredAdvanced=loaderDom.window.document.createElement('script');
declaredAdvanced.src='./code/js/advanced-features.js?v=20260831-toolbar-icons-2';
declaredAdvanced.dataset.sscAdvanced='1';
loaderDom.window.document.body.appendChild(declaredAdvanced);
loaderDom.window.document.dispatchEvent(new loaderDom.window.Event('DOMContentLoaded'));
assert.equal(loaderDom.window.document.querySelectorAll('script[src*="advanced-features.js"]').length,1,'The fallback loader must not duplicate the declared Progress Analytics script.');
loaderDom.window.close();

const dom=new JSDOM('<!doctype html><html lang="he" dir="rtl"><head></head><body><div class="topbar-start"></div></body></html>',{
  url:'https://ssc.test/',
  runScripts:'outside-only',
  pretendToBeVisual:true
});
const {window}=dom;
window.localStorage.setItem('sscLanguageV1','he');
window.eval(`${advancedSource}\n//# sourceURL=code/js/advanced-features.js`);

const button=window.document.getElementById('analyticsButton');
assert.ok(button,'Progress Analytics button must be created.');
assert.equal(button.querySelectorAll(':scope > svg').length,1,'Progress Analytics must have exactly one icon.');
const icon=button.querySelector('svg[data-toolbar-icon="progress-chart"]');
assert.ok(icon,'Progress Analytics must use the trend-chart SVG icon.');
assert.equal(icon.getAttribute('aria-hidden'),'true');
assert.equal(icon.getAttribute('focusable'),'false');
assert.deepEqual([...icon.querySelectorAll('path')].map(path=>path.getAttribute('d')),['m3 17 6-6 4 4 8-9','M15 6h6v6']);
assert.equal(button.getAttribute('aria-label'),'ניתוח התקדמות');
assert.equal(button.title,'ניתוח התקדמות');

window.localStorage.setItem('sscLanguageV1','en');
window.document.documentElement.lang='en';
await new Promise(resolve=>window.setTimeout(resolve,0));
assert.equal(button.getAttribute('aria-label'),'Progress Analytics');
assert.equal(button.title,'Progress Analytics');
assert.equal(button.querySelector('span').textContent,'ANALYTICS');

button.click();
const modal=window.document.getElementById('analyticsModal');
assert.equal(modal.hidden,false,'The icon addition must not break opening Progress Analytics.');
assert.equal(modal.querySelector('[data-analytics-title]').textContent,'Progress Analytics');

console.log('[SSC UI CI] Toolbar icon summary');
console.log(JSON.stringify({
  ok:true,
  focusIcon:'crosshair',
  analyticsIcon:'progress-chart',
  localizedLabels:['he','en'],
  analyticsOpens:true,
  duplicateFocusMask:false,
  duplicateAnalyticsScript:false
},null,2));

dom.window.close();
