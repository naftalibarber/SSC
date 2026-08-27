import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

async function loadClassicScript(path){
  await import(pathToFileURL(resolve(path)).href);
}

globalThis.window=globalThis;

await loadClassicScript('code/js/preview/ssc-nxn-state.js');
await loadClassicScript('code/js/preview/ssc-preview-validation.js');

const selfTest=globalThis.SSCNxNState.selfTest();
if(!selfTest.ok){
  console.error('[SSC Preview CI] SSCNxNState self-test failed.');
  process.exit(1);
}

const report=await globalThis.SSCPreviewValidation.validateAll({count:100});
const summary={
  ok:report.ok,
  randomTested:report.tested,
  deterministicTested:report.deterministicTested,
  totalTested:report.totalTested,
  failed:report.failed,
  events:Object.fromEntries(Object.entries(report.results).map(([eventId,result])=>[eventId,{
    ok:result.ok,
    randomTested:result.tested,
    deterministicTested:result.deterministicTested,
    totalTested:result.totalTested,
    failed:result.failed
  }]))
};

console.log('[SSC Preview CI] Validation summary');
console.log(JSON.stringify(summary,null,2));

if(!report.ok){
  for(const [eventId,result] of Object.entries(report.results)){
    const failure=result.results.find(item=>!item.ok);
    if(!failure)continue;
    console.error(`[SSC Preview CI] First ${eventId} failure`,JSON.stringify(failure,null,2));
  }
  process.exit(1);
}
