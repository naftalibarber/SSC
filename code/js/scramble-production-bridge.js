(() => {
  'use strict';

  const NXN_EVENTS=new Set(['222','333','444','555','666','777']);
  const legacy=window.SSCScrambles;
  if(!legacy||typeof legacy.generate!=='function')throw new Error('SSC scramble production bridge requires SSCScrambles.');

  const legacyGenerate=legacy.generate.bind(legacy);
  window.SSCLegacyScrambleFallback=Object.freeze({
    async generate(eventId){
      const normalized=legacy.normalizeEventId?.(eventId)||String(eventId||'');
      if(!NXN_EVENTS.has(normalized))throw new Error(`Legacy NxN fallback does not support ${String(eventId)}.`);
      return legacyGenerate(normalized);
    },
    supportedEvents:Object.freeze([...NXN_EVENTS]),
    source:'existing SSCScrambles production path',
    productionIntegrated:true
  });

  const training=window.SSCTraining;
  if(training&&typeof training.nextScramble==='function'&&typeof training.getState==='function'){
    const originalNextScramble=training.nextScramble.bind(training);
    training.nextScramble=async function(){
      const state=training.getState();
      if(state?.mode==='cross'&&window.SSC_FEATURES?.scrambleProviderV1!==false){
        const provider=window.SSCScrambleProvider;
        if(provider?.supportsEvent?.('333'))return provider.generate('333');
      }
      return originalNextScramble();
    };
  }

  window.SSCScrambleProductionBridge=Object.freeze({
    nxnEvents:Object.freeze([...NXN_EVENTS]),
    legacyFallback:'SSCScrambles.generate',
    trainingCrossProvider:true
  });
})();
