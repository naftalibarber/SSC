import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('code/js/mbld-flow.js','utf8');
const dom=new JSDOM(`<!doctype html><html lang="he" dir="rtl"><head></head><body>
  <div class="timer-wrap"><div><div id="timer">0.000</div><div id="status"></div><div class="quick-stats"></div></div></div>
  <button id="touchTimer"></button>
  <select id="eventSelect"><option value="333">3×3</option></select>
  <select id="sessionSelect"><option value="session-1">Session 1</option></select>
  <button id="newScramble"></button>
  <div id="scrambleLabel"></div>
  <div id="scramble"></div>
  <div id="cubePreview2D"></div>
  <div id="statsGrid"></div>
  <div id="historyList"></div>
  <div id="emptyHistory"></div>
  <div id="solveCount"></div>
</body></html>`,{url:'https://ssc.test/',pretendToBeVisual:true,runScripts:'outside-only'});

const {window}=dom;
window.console=console;
window.requestAnimationFrame=callback=>setTimeout(()=>callback(window.performance.now()),0);
window.cancelAnimationFrame=id=>clearTimeout(id);
window.SSCTimerEvents={
  getCurrent:()=> '333',
  getCurrentSession:()=>({id:'session-1'})
};
window.SSCScrambles={generateMultiBlind:async count=>Array.from({length:count},(_,index)=>`SCRAMBLE-${index+1}`)};
window.SSCCubePreview={render(){}};

window.eval(`${source}\n//# sourceURL=code/js/mbld-flow.js`);
await new Promise(resolve=>queueMicrotask(resolve));

assert.ok(window.SSCMBLD,'SSCMBLD API must be installed.');

const example=window.SSCMBLD.calculateResult({
  attempted:10,
  solved:8,
  totalTime:3125000,
  memoTime:1450000
});
assert.equal(example.points,6);
assert.equal(example.isDNF,false);
assert.equal(example.displayResult,'8/10 52:05 [24:10]');

const zeroPoints=window.SSCMBLD.calculateResult({attempted:4,solved:2,totalTime:120000,memoTime:60000});
assert.equal(zeroPoints.points,0);
assert.equal(zeroPoints.isDNF,true,'Fewer than one MBLD point must be DNF.');

const fewerThanTwo=window.SSCMBLD.calculateResult({attempted:2,solved:1,totalTime:120000,memoTime:60000});
assert.equal(fewerThanTwo.isDNF,true,'Fewer than two solved cubes must be DNF.');

const exactlySixty=window.SSCMBLD.calculateResult({attempted:3,solved:3,totalTime:3600000,memoTime:1800000});
assert.equal(exactlySixty.isDNF,false,'Exactly 60:00 remains valid under the requested rule.');

const overSixty=window.SSCMBLD.calculateResult({attempted:3,solved:3,totalTime:3600001,memoTime:1800000});
assert.equal(overSixty.isDNF,true,'A result over 60:00 must be DNF.');

assert.equal(window.SSCMBLD.formatClock(3125000),'52:05');
assert.equal(window.SSCMBLD.formatClock(1450000),'24:10');

dom.window.close();
console.log('[SSC MBLD] Scoring, DNF rules, and display formatting passed.');
