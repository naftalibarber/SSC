import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('code/css/minimal-competition.css','utf8');
const enhancementCss=fs.readFileSync('code/css/app-enhancements.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const appSource=fs.readFileSync('code/js/app.js','utf8');
const workflow=fs.readFileSync('.github/workflows/preview-validation.yml','utf8');
const compactCss=css.replace(/\s+/g,'');
const compactEnhancementCss=enhancementCss.replace(/\s+/g,'');

assert.match(compactCss,/\.times-section\{[^}]*flex:11auto!important;[^}]*overflow:hidden!important;/,'The history section must own the remaining sidebar height.');
assert.match(compactCss,/\.history-section-head\{[^}]*flex:00auto!important;/,'The history header must never shrink.');
assert.match(compactCss,/\.history-list\{[^}]*flex:11auto!important;[^}]*min-height:0!important;[^}]*overflow-y:auto!important;/,'Overflowing solves must scroll inside the history list.');
assert.match(compactCss,/\.solve-row\{[^}]*flex:00auto!important;[^}]*box-sizing:border-box!important;/,'Solve rows must keep their intrinsic content height.');
assert.match(appSource,/history\.slice\(0,12\)/,'The existing twelve-solve history limit must remain unchanged.');
assert.match(appSource,/class="solve-meta"[^`]*\$\{renderSolveActions\(solve\)\}<\/div>/,'Penalty actions must stay inside each solve row.');
assert.match(appSource,/notice\.hidden=history\.length<12/,'The full-history notice must appear at twelve solves.');
assert.match(appSource,/history\.forEach\(\(solve,index\)=>fragment\.appendChild\(createSolveRow\(solve,index,resolvedBest,\{fullHistory:true\}\)\)\)/,'The dialog must render the entire active-session history.');
assert.match(appSource,/aria-haspopup="dialog" aria-controls="fullHistoryModal"/,'The full-history button must expose its dialog relationship.');
assert.match(compactEnhancementCss,/\.full-history-list\{[^}]*overflow-y:auto/,'The complete history must scroll inside its dialog.');
assert.match(compactEnhancementCss,/\.full-history-list\.full-history-row\{[^}]*grid-template-columns:44pxminmax\(0,1fr\)!important/,'Full-history rows must reserve a stable index column.');
assert.match(index,/code\/css\/minimal-competition\.css\?v=20260831-history-scroll-1/,'The history layout fix must bypass cached CSS.');
assert.match(index,/code\/css\/app-enhancements\.css\?v=20260901-fullscreen-1/,'The full-history dialog styles must bypass cached CSS.');
assert.match(index,/code\/js\/app\.js\?v=20260901-fullscreen-1/,'The full-history behavior must bypass cached JavaScript.');
assert.match(workflow,/tests\/ui-\*\.mjs/,'CI must execute UI regression tests.');
assert.match(workflow,/code\/css\/minimal-competition\.css/,'CI must run when the history layout stylesheet changes.');
assert.match(workflow,/code\/css\/app-enhancements\.css/,'CI must run when the full-history stylesheet changes.');

console.log('[SSC UI CI] History layout summary');
console.log(JSON.stringify({
  ok:true,
  visibleSolveLimit:12,
  fullHistory:true,
  noticeThreshold:12,
  rowsShrink:false,
  overflow:'scroll',
  actionsStayInsideRows:true
},null,2));
