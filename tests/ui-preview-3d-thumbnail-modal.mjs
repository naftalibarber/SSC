import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../code/js/preview-visibility-hotfix.js',import.meta.url),'utf8');

assert.match(source,/lockSmall3D/,'visibility guard must explicitly lock the small 3D preview');
assert.match(source,/pointer-events','none','important'/,'small 3D preview must not receive pointer input');
assert.match(source,/SSCPreviewSettings\?\.open\?\.\(card\)/,'card click must explicitly open the interactive 3D modal');
assert.match(source,/addEventListener\('click',openFromCard,true\)/,'3D card must use a capture click handler so child renderers cannot swallow the open action');
assert.match(source,/addEventListener\('keydown',openFromCard,true\)/,'3D card must remain keyboard-openable');

console.log('3D thumbnail/modal interaction regression checks passed.');
