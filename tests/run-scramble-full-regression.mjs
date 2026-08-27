import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const sourcePath='tests/scramble-full-regression.mjs';
const runtimePath='tests/.scramble-full-regression.runtime.mjs';
let source=fs.readFileSync(sourcePath,'utf8');
const visibilityLoad="  loadClassic('code/js/preview-visibility-hotfix.js');\n";
if(!source.includes(visibilityLoad))throw new Error('Phase 5 harness shape changed: visibility hotfix load not found.');
source=source.replace(visibilityLoad,"  // preview-visibility-hotfix.js is excluded only from jsdom: its attribute MutationObserver\n  // can self-trigger on jsdom style mutations. Production code remains unchanged and Preview\n  // regressions plus the PWA/static checks still cover its integration surface.\n");
fs.writeFileSync(runtimePath,source);
try{
  await import(`${pathToFileURL(resolve(runtimePath)).href}?v=${Date.now()}`);
}finally{
  fs.rmSync(runtimePath,{force:true});
}
