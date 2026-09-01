import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../code/js/preview-visibility-hotfix.js',import.meta.url),'utf8');

assert.match(source,/lockSmall3D/,'visibility guard must explicitly lock the small 3D preview');
assert.match(source,/pointer-events','none','important'/,'small 3D preview must not receive pointer input');
assert.match(source,/if\(!root\.classList\.contains\('ssc-native-cube3d-static'\)\)/,'static class writes must be idempotent to avoid MutationObserver loops');
assert.match(source,/SSCPreviewSettings\?\.open\?\.\(card\)/,'card click must explicitly open the interactive 3D modal');
assert.match(source,/addEventListener\('click',openFromCard,true\)/,'3D card must use a capture click handler so child renderers cannot swallow the open action');
assert.match(source,/addEventListener\('keydown',openFromCard,true\)/,'3D card must remain keyboard-openable');
assert.match(source,/contentObserver\.observe\(card,\{childList:true,subtree:true\}\)/,'content observation may watch descendants');
assert.match(source,/classObserver\.observe\(card,\{attributes:true,attributeFilter:\['class'\]\}\)/,'class observation must be limited to the preview card itself');
assert.doesNotMatch(source,/attributes:true,attributeFilter:\['class'\],childList:true,subtree:true/,'must not observe descendant class mutations while mutating renderer classes');

console.log('3D thumbnail/modal interaction regression checks passed.');
