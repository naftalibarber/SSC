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

const faceRule=css.match(/html body \.ssc-native-cube3d-face\s*\{([^}]*)\}/);
assert.ok(faceRule,'Native 3D faces must have an explicit production style rule.');
assert.match(faceRule[1],/gap\s*:\s*2\.4%!important/,'3D faces must keep black plastic dividers between stickers.');
assert.match(faceRule[1],/padding\s*:\s*0!important/,'3D faces must not keep a black outer shell around the sticker grid.');
assert.match(faceRule[1],/background\s*:\s*#07080a!important/,'3D face background must provide the inner black plastic gutters.');
assert.match(faceRule[1],/border\s*:\s*0!important/,'3D faces must not paint a black perimeter border.');
assert.match(faceRule[1],/box-shadow\s*:\s*none!important/,'3D faces must not recreate an outer shell with a shadow.');

const stickerRule=css.match(/html body \.ssc-native-cube3d-sticker\s*\{([^}]*)\}/);
assert.ok(stickerRule,'Native 3D stickers must have an explicit production style rule.');
assert.match(stickerRule[1],/border\s*:\s*0!important/,'3D stickers must not have individual black outlines.');
assert.match(stickerRule[1],/box-shadow\s*:\s*none!important/,'3D stickers must not have inset black edging.');

console.log('[SSC UI] Native 3D keeps inner black plastic dividers without an outer face shell.');
