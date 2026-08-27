import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

globalThis.window=globalThis;
globalThis.__SSC_SCRAMBLE_MODULE_LOADER__=async()=>{throw new Error('forced cubing.js load failure');};

async function load(path){await import(pathToFileURL(resolve(path)).href);}

await load('code/js/wca-previews.js');
await load('code/js/preview/ssc-nxn-state.js');
await load('code/js/cube2x2.js');
await load('code/js/scramble2x2.js');

const capturedErrors=[];
const originalConsoleError=console.error;
console.error=(...args)=>{capturedErrors.push(args);};

try{
  await load('code/js/scramble-generators.js');
  const events={222:2,333:3,444:4,555:5,666:6,777:7};
  for(const [eventId,order] of Object.entries(events)){
    const scramble=await globalThis.SSCScrambleProvider.generate(eventId);
    assert.equal(typeof scramble,'string',`${eventId} fallback must return a string.`);
    assert.ok(scramble.trim(),`${eventId} fallback must not be empty.`);
    const state=globalThis.SSCNxNState.buildState(scramble,order,{strict:true});
    assert.deepEqual(state.ignoredMoves,[],`${eventId} fallback contains an unsupported move.`);
    const logged=capturedErrors.some(args=>args[0]==='[SSC Scramble] cubing.js generation failed'&&args[1]?.eventId===eventId&&args[1]?.error instanceof Error);
    assert.ok(logged,`${eventId} fallback must log the required cubing.js failure diagnostic.`);
  }

  assert.equal(globalThis.SSCScrambleProvider,globalThis.SSCScrambles,'Fallback must still use one shared provider object.');
  console.log('[SSC Scramble CI] Forced fallback summary');
  console.log(JSON.stringify({ok:true,events:6,failures:0,forcedCubingFailure:true},null,2));
}finally{
  console.error=originalConsoleError;
  delete globalThis.__SSC_SCRAMBLE_MODULE_LOADER__;
}
