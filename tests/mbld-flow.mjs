import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('code/js/mbld-flow.js','utf8');
const dom=new JSDOM(`<!doctype html><html lang="he" dir="rtl"><head></head><body>
  <section class="scramble-bar">
    <button id="prevScramble"></button>
    <div class="scramble-center"><div id="scrambleLabel" class="scramble-title"></div><div id="scramble"></div></div>
    <div class="scramble-side"><button id="newScramble"></button><div id="cubePreview2D" class="cube-preview-card"></div></div>
  </section>
  <div class="timer-wrap"><div><div id="timer">0.000</div><div id="status"></div><div class="quick-stats"></div></div></div>
  <button id="touchTimer"></button>
  <select id="eventSelect"><option value="333mbf" selected>MBLD</option></select>
  <select id="sessionSelect"><option value="session-1">Session 1</option></select>
  <div id="statsGrid"></div><div id="historyList"></div><div id="emptyHistory"></div><div id="solveCount"></div>
</body></html>`,{url:'https://ssc.test/',pretendToBeVisual:true,runScripts:'outside-only'});

const {window}=dom;
window.console=console;
window.requestAnimationFrame=callback=>setTimeout(()=>callback(window.performance.now()),0);
window.cancelAnimationFrame=id=>clearTimeout(id);
window.IntersectionObserver=class{constructor(callback){this.callback=callback;}observe(target){this.callback([{target,isIntersecting:true}]);}unobserve(){}disconnect(){}};
let currentEvent='333mbf';
let generatedCount=0;
let previewCalls=0;
window.SSCTimerEvents={
  getCurrent:()=>currentEvent,
  getCurrentSession:()=>({id:'session-1'}),
  newScramble:async()=>null
};
const provider=Object.freeze({
  normalizeEventId:value=>value,
  generateMultiBlind:async count=>{generatedCount=count;return Array.from({length:count},(_,index)=>`SCRAMBLE-${index+1}`);}
});
window.SSCScrambles=provider;
window.SSCScrambleProvider=provider;
window.SSCCubePreview={render(container,scramble,eventId){previewCalls+=1;container.dataset.renderedEvent=eventId;container.textContent=scramble;}};
window.SSCPuzzle3D={dispose(){}};
window.SSCPreviewSizing={scheduleFit(){}};

window.eval(`${source}\n//# sourceURL=code/js/mbld-flow.js`);
await new Promise(resolve=>queueMicrotask(resolve));

assert.ok(window.SSCMBLD,'SSCMBLD API must be installed.');
assert.equal(window.SSCMBLD.version,'2.0.0');
assert.equal(window.SSCMBLD.getPhase(),'idle','MBLD should use the regular idle timer state.');
assert.ok(window.document.getElementById('sscMbldCountControl'),'MBLD cube-count control should be created beside the scramble heading.');

const example=window.SSCMBLD.calculateResult({attempted:10,solved:8,totalTime:3125000});
assert.equal(example.points,6);
assert.equal(example.isDNF,false);
assert.equal(example.memoTime,null);
assert.equal(example.displayResult,'8/10 52:05');

const zeroPoints=window.SSCMBLD.calculateResult({attempted:4,solved:2,totalTime:120000});
assert.equal(zeroPoints.points,0);
assert.equal(zeroPoints.isDNF,true,'Fewer than one MBLD point must be DNF.');
const fewerThanTwo=window.SSCMBLD.calculateResult({attempted:2,solved:1,totalTime:120000});
assert.equal(fewerThanTwo.isDNF,true,'Fewer than two solved cubes must be DNF.');
const exactlySixty=window.SSCMBLD.calculateResult({attempted:3,solved:3,totalTime:3600000});
assert.equal(exactlySixty.isDNF,false,'Exactly 60:00 is valid.');
const overSixty=window.SSCMBLD.calculateResult({attempted:3,solved:3,totalTime:3600001});
assert.equal(overSixty.isDNF,true,'A result over 60:00 must be DNF.');
assert.equal(window.SSCMBLD.formatClock(3125000),'52:05');

// The bridge must replace app.js's legacy fixed MBLD count with the selected count.
window.SSCMBLD.setAttempted(5);
await window.SSCScrambles.generateMultiBlind(3);
assert.equal(generatedCount,5,'MBLD generation should use the selected cube count rather than the legacy fixed count.');

// Simulate app.js writing the generated multi-scramble string.
const scrambleEl=window.document.getElementById('scramble');
scrambleEl.dataset.scrambleTransient='false';
scrambleEl.textContent='1) R U R\' | 2) F2 U2 | 3) L D | 4) B R2 | 5) U F';
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(window.SSCMBLD.getScrambles().length,5);
assert.match(scrambleEl.textContent,/ערבובי MBLD/,'Main scramble bar should become a compact clickable summary.');

window.SSCMBLD.openScrambles();
await new Promise(resolve=>setTimeout(resolve,0));
const modal=window.document.getElementById('sscMbldScramblesModal');
assert.equal(modal.hidden,false,'Clicking/opening the scramble summary should show the MBLD viewer.');
assert.equal(modal.querySelectorAll('.ssc-mbld-view-row').length,5,'Viewer should show one row per scramble.');
assert.equal(modal.querySelectorAll('.ssc-mbld-view-preview').length,5,'Viewer should create one preview per scramble.');
assert.ok(previewCalls>=5,'Each MBLD preview should use the connected 3x3 preview renderer.');
assert.ok([...modal.querySelectorAll('.ssc-mbld-view-preview')].every(card=>card.dataset.renderedEvent==='333'),'All MBLD preview cards must render as the regular 3x3 event.');

dom.window.close();
console.log('[SSC MBLD] Regular timer flow, scoring, count selector, and 3x3 scramble viewer passed.');
