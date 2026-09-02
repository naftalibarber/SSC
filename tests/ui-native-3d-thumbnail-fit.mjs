import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('code/css/puzzle-3d.css','utf8');
const index=fs.readFileSync('index.html','utf8');

const fitRule=css.match(/html body \.cube-preview-card\.ssc-preview-mode-3d \.ssc-native-cube3d-stage\s*\{([^}]*)\}/);
assert.ok(fitRule,'Native 3D thumbnails must have one shared stage-fit rule.');
assert.match(fitRule[1],/transform\s*:\s*scale3d\(\.82,\.82,\.82\)/,'Thumbnail stage must scale the entire XYZ cube so rotated faces stay inside the card.');
assert.match(fitRule[1],/transform-origin\s*:\s*50% 50%/,'Thumbnail fit must stay centered.');
assert.doesNotMatch(fitRule[0],/data-cube-order|222|333|444|555|666|777/,'Thumbnail fitting must remain order-agnostic for every NxN renderer size.');

assert.doesNotMatch(css,/\.ssc-preview-3d-viewer[^\{]*\.ssc-native-cube3d-stage\s*\{[^}]*scale3d/,'The interactive modal must not inherit the thumbnail-only fit scale.');
assert.match(index,/code\/css\/puzzle-3d\.css\?v=20260902-thumbnail-fit-1/,'The thumbnail-fit CSS must be cache-busted in production.');

console.log('[SSC UI] Native 3D thumbnail fit is shared by 2x2-7x7 and scoped away from the modal.');
