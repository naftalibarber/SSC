import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const sourcePath='tests/scramble-full-regression.mjs';
const runtimePath='tests/.scramble-full-regression.runtime.mjs';
let source=fs.readFileSync(sourcePath,'utf8');

// The source harness originally used a direct strict V1 renderer to make NxN assertions.
// For Full Regression we must instead reproduce the production Preview chain so existing
// OLL/PLL setup rotations (for example `y`) fall back exactly as they do in the browser.
const previewStart="  const previewCalls=[];\n  const directPreview={";
const previewEnd="  loadClassic('code/js/preview-integration.js');\n";
const start=source.indexOf(previewStart);
const end=source.indexOf(previewEnd,start);
if(start<0||end<0)throw new Error('Phase 5 harness shape changed: preview harness block not found.');
source=source.slice(0,start)+[
  "  const previewCalls=[];",
  "  loadClassic('code/js/preview-manager.js');",
  "  loadClassic('code/js/preview-integration.js');",
  "  loadClassic('code/js/preview/ssc-preview-v1-integration.js');",
  ''
].join('\n')+source.slice(end+previewEnd.length);

// preview-visibility-hotfix.js is excluded only from jsdom. Its attribute MutationObserver
// can self-trigger on jsdom style mutations; production code remains unchanged and the
// dedicated Preview regressions plus the PWA/static checks cover its integration surface.
const visibilityLoad="  loadClassic('code/js/preview-visibility-hotfix.js');\n";
if(!source.includes(visibilityLoad))throw new Error('Phase 5 harness shape changed: visibility hotfix load not found.');
source=source.replace(visibilityLoad,'');

fs.writeFileSync(runtimePath,source);
try{
  await import(`${pathToFileURL(resolve(runtimePath)).href}?v=${Date.now()}`);
}finally{
  fs.rmSync(runtimePath,{force:true});
}
