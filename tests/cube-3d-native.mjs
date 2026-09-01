import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../code/js/puzzle-3d.js',import.meta.url),'utf8');

assert.match(source,/SSCNxNState\.buildState\(scramble,3,/,'3D must use the shared validated 3x3 state engine');
assert.match(source,/for\(let x=-1;x<=1;x\+\+\)for\(let y=-1;y<=1;y\+\+\)for\(let z=-1;z<=1;z\+\+\)/,'3D must build all 27 cubies');
assert.match(source,/pointerdown/,'3D must support drag interaction');
assert.match(source,/resetCamera/,'3D must expose camera reset');
assert.match(source,/SSCCubePreview\?\.getColors/,'3D must use the shared cube palette');
assert.match(source,/NATIVE_EVENT_IDS=new Set\(\['333','333bf','333fm','333oh','333mbf'\]\)/,'Native 3D must include 3BLD, FMC and OH as 3x3-derived events');
assert.match(source,/'3bld':'333bf'/,'Native 3D must normalize the 3BLD alias to 333bf');
assert.doesNotMatch(source,/cdn\.cubing\.net|TwistyPlayer/,'3x3 native 3D must not depend on the old TwistyPlayer placeholder');

console.log('Native 3x3 and 3BLD 3D source checks passed.');
