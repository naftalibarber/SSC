(() => {
  'use strict';

  // Legacy compatibility shim.
  // SSC's real 2x2 scramble source is now SSCScrambles -> cubing.js.
  async function generate(){
    const generator=window.SSCScrambles?.generate;
    if(typeof generator!=='function')throw new Error('SSCScrambles is not ready.');
    const scramble=await generator('222');
    return String(scramble||'').trim().split(/\s+/).filter(Boolean);
  }

  window.Scramble2x2=Object.freeze({
    generate,
    deprecated:true,
    source:'SSCScrambles/cubing.js'
  });
})();
