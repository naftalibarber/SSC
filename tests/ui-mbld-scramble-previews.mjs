import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('code/js/scramble-history.js','utf8');
const dom=new JSDOM(`<!doctype html><html lang="he" dir="rtl"><head></head><body>
<section class="scramble-bar">
  <button id="prevScramble"></button>
  <div class="scramble-center"><div id="scrambleLabel"></div><div id="scramble"></div></div>
  <div class="scramble-side"><button id="newScramble"></button><div id="cubePreview2D" class="cube-preview-card"></div></div>
</section>
<button id="historySettingsButton"></button>
<div id="historySettings"></div>
<div id="historyList"></div>
</body></html>`,{url:'https://ssc.test/',pretendToBeVisual:true,runScripts:'outside-only'});

const {window}=dom;
window.console=console;
let activeEvent='333mbf';
const previewCalls=[];
window.SSCTimerEvents={getCurrent:()=>activeEvent};
window.SSCScrambles={normalizeEventId:value=>String(value||'333')};
window.SSCPreviewSizing={scheduleFit(){}};
window.SSCPreviewV1={
  render(container,scramble,eventId,options){
    previewCalls.push({scramble,eventId,options});
    const marker=window.document.createElement('span');
    marker.className='test-preview-marker';
    marker.textContent=scramble;
    container.replaceChildren(marker);
    return {order:3};
  }
};

window.eval(`${source}\n//# sourceURL=code/js/scramble-history.js`);

const scrambles=[
  "B' U L F' U L' F' D' R' D2 R2 B2",
  "B' U' L2 B' U2 L2 B' D2 U2 B D2",
  "F2 R2 D2 U2 F U2 B U2 B2 L2 D2",
  "F' B' D' B' L2 D R' U2 L' F2 U2",
  "B' U2 F' D2 B L2 U2 B2 U2 F R2"
];
window.dispatchEvent(new window.CustomEvent('ssc-mbld-scramble',{detail:{attempted:5,scrambles}}));

const list=window.document.getElementById('sscMbldScrambleList');
assert.ok(list,'MBLD list must be created.');
assert.equal(list.hidden,false);
assert.equal(list.querySelectorAll('.ssc-mbld-scramble-item').length,5);
assert.deepEqual([...list.querySelectorAll('.ssc-mbld-scramble-index')].map(el=>el.textContent),['1)','2)','3)','4)','5)']);
assert.deepEqual([...list.querySelectorAll('.ssc-mbld-scramble-text')].map(el=>el.textContent),scrambles);
assert.equal(list.querySelectorAll('.ssc-mbld-item-preview').length,5);
assert.equal(previewCalls.length,5,'Every scramble must receive its own preview.');
assert.ok(previewCalls.every(call=>call.eventId==='333'),'Every MBLD preview must use the normal 3x3 renderer.');
assert.deepEqual(previewCalls.map(call=>call.scramble),scrambles);
assert.equal(window.document.getElementById('scramble').classList.contains('ssc-mbld-source-hidden'),true);
assert.equal(window.document.getElementById('cubePreview2D').hidden,true);
assert.equal(window.document.querySelector('.scramble-bar').classList.contains('ssc-mbld-list-active'),true);

activeEvent='333';
window.dispatchEvent(new window.CustomEvent('ssc-event-change',{detail:{eventId:'333'}}));
assert.equal(list.hidden,true,'MBLD list must hide when leaving MBLD.');
assert.equal(list.childElementCount,0,'MBLD list must clear when leaving MBLD.');
assert.equal(window.document.getElementById('scramble').classList.contains('ssc-mbld-source-hidden'),false);
assert.equal(window.document.getElementById('cubePreview2D').hidden,false);
assert.equal(window.document.querySelector('.scramble-bar').classList.contains('ssc-mbld-list-active'),false);

dom.window.close();
console.log('[SSC UI] MBLD ordered scramble list renders one 3x3 preview per scramble and restores the standard layout.');
