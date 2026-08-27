(() => {
  'use strict';

  const FACES=['R','L','U','D','F','B'];
  const MODIFIERS=['',"'",'2'];
  const AXIS_BY_FACE={R:'RL',L:'RL',U:'UD',D:'UD',F:'FB',B:'FB'};
  const NORMAL_LENGTHS=[8,9,10];
  const SPECIAL_LENGTHS=[7,11];
  const SPECIAL_EVERY=30;

  function randomItem(items){return items[Math.floor(Math.random()*items.length)];}
  function chooseLength(){return Math.floor(Math.random()*SPECIAL_EVERY)===0?randomItem(SPECIAL_LENGTHS):randomItem(NORMAL_LENGTHS);}
  function buildCandidate(length){
    const scramble=[];
    let previousAxis=null;
    for(let index=0;index<length;index+=1){
      const availableFaces=FACES.filter(face=>AXIS_BY_FACE[face]!==previousAxis);
      const face=randomItem(availableFaces);
      scramble.push(face+randomItem(MODIFIERS));
      previousAxis=AXIS_BY_FACE[face];
    }
    return scramble;
  }

  // Exact historical SSC 2x2 generator, retained only as a safety fallback.
  function legacyGenerate(){
    const length=chooseLength();
    if(window.Cube2x2?.isSolvableInFourOrLess){
      for(let attempt=0;attempt<1000;attempt+=1){
        const candidate=buildCandidate(length);
        if(!window.Cube2x2.isSolvableInFourOrLess(candidate))return candidate;
      }
      while(true){
        const candidate=buildCandidate(length);
        if(!window.Cube2x2.isSolvableInFourOrLess(candidate))return candidate;
      }
    }
    return buildCandidate(length);
  }

  // Backwards-compatible API. Primary generation is the shared provider;
  // legacyGenerate() is invoked by that provider only when cubing.js fails.
  async function generate(){
    const generator=window.SSCScrambleProvider?.generate||window.SSCScrambles?.generate;
    if(typeof generator!=='function')return legacyGenerate();
    const scramble=await generator('222');
    return String(scramble||'').trim().split(/\s+/).filter(Boolean);
  }

  window.Scramble2x2=Object.freeze({
    generate,
    legacyGenerate,
    chooseLength,
    NORMAL_LENGTHS,
    SPECIAL_LENGTHS,
    SPECIAL_EVERY,
    deprecated:true,
    source:'SSCScrambleProvider/cubing.js',
    fallback:'SSC legacy 2x2 generator'
  });
})();
