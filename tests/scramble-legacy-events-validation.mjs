import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as cubingScramble from 'cubing/scramble';

const EVENTS=['minx','pyram','skewb','sq1','clock'];
const index=fs.readFileSync('index.html','utf8');
const dom=new JSDOM(index,{url:'https://ssc.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
window.SSCPreviewSizing={scheduleFit(){}};

function loadClassic(path){window.eval(`${fs.readFileSync(path,'utf8')}\n//# sourceURL=${path}`);}
loadClassic('code/js/wca-previews.js');

let loaderCalls=0;
window.__SSC_LEGACY_MODULE_LOADER__=async()=>{loaderCalls+=1;return cubingScramble;};
let source=fs.readFileSync('code/js/scramble-generators.js','utf8');
const needle='import(CUBING_SCRAMBLE_URL)';
assert.ok(source.includes(needle),'Legacy generator loader shape changed; update the validation harness deliberately.');
source=source.replace(needle,'window.__SSC_LEGACY_MODULE_LOADER__()');
window.eval(`${source}\n//# sourceURL=code/js/scramble-generators.js`);

assert.ok(window.SSCScrambles,'SSCScrambles did not initialize.');
assert.equal(window.SSCScrambleProvider,undefined,'NxN Provider must not be part of the legacy generator validation path.');

const results={};
for(const eventId of EVENTS){
  assert.equal(window.SSCScrambles.supportsEvent(eventId),true,`${eventId}: event missing from production registry`);
  const scramble=await window.SSCScrambles.generate(eventId);
  assert.equal(typeof scramble,'string',`${eventId}: scramble must be a string`);
  assert.ok(scramble.trim(),`${eventId}: blank scramble`);
  assert.notEqual(scramble,'[object Promise]',`${eventId}: Promise leakage`);

  const container=window.document.createElement('div');window.document.body.appendChild(container);
  window.SSCCubePreview.render(container,scramble,eventId);
  const display=container.querySelector('scramble-display');
  assert.ok(display,`${eventId}: WCA preview element was not created`);
  assert.equal(display.getAttribute('scramble'),scramble,`${eventId}: Preview did not receive exact scramble string`);
  assert.equal(container.dataset.wcaEvent,eventId,`${eventId}: Preview event mismatch`);
  results[eventId]={ok:true,length:scramble.length};
}

assert.equal(loaderCalls,1,'Existing SSCScrambles cubing module must remain lazily cached.');
console.log('\n[SSC Scramble Phase 5] Preserved non-NxN generator summary');
for(const eventId of EVENTS)console.log(`${eventId}: PASS`);
console.log(`legacy module loads: ${loaderCalls} (PASS)`);
console.log(JSON.stringify(results,null,2));
dom.window.close();
